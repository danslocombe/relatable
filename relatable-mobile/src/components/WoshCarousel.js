import { Component, createRef, useEffect, useRef, useState } from 'react';

const scrollerStyle = {
  display: "flex",
  border: "1px solid",
  width: "320px",
  overflowX: "auto",
  overflowY: "hidden",
  whiteSpace: "nowrap",
  position: "relative",
  touchAction: 'none',
  scrollBehavior: "auto",
};


function dan_lerp(x0, x, k) {
  return (x0 * (k-1) + x) / k;
}

function WoshPhysics(min, max, snaps, should_snap, onSelectedChange) {
  const FRIC = 0.98;
  const FRIC_SNAP = 0.75;
  return {
    pos : 0,
    vel : 0,
    min : min,
    max : max,
    should_snap : should_snap,
    snaps: snaps,
    current_select: 0,
    onSelectedChange: onSelectedChange,
    resetBounds : function(min, max) {
      this.min = min;
      this.max = max;
      return this;
    },
    resetSnaps: function(snaps) {
      this.snaps = snaps;
      return this;
    },
    tick: function(target_pos) {
      const pos_0 = this.pos;
      if (target_pos !== null) {
        const new_vel = target_pos - this.pos;
        this.vel = dan_lerp(this.vel, new_vel, 10);
        this.pos = target_pos;
      }
      else
      {
        this.pos += this.vel;
        this.vel *= FRIC;

        if (this.should_snap)
        {
          const center = this.pos + 320/2;
          let closest_pos = null;
          let closest_dist = null;
          let closest_i = null;
          for (let i = 0; i < this.snaps.length; i++) {
            const dist_to_snap = Math.abs(center - this.snaps[i]); 
            if (closest_pos == null || dist_to_snap < closest_dist) {
              closest_dist = dist_to_snap;
              closest_pos = this.snaps[i];
              closest_i = i;
            }
          }

          //if (closest_dist < 50)
          if (closest_dist != null)
          {
            this.pos = dan_lerp(this.pos, closest_pos - 320/2, 15);
            this.vel = this.pos - pos_0;
            this.vel *= FRIC_SNAP;

            if (closest_i != this.current_select) {
              this.current_select = closest_i;
              this.onSelectedChange(closest_i);
            }
          }
        }
      }

      if (this.pos < this.min) {
        this.pos = this.min;
        this.vel = 0.15 * Math.abs(this.vel);
      }

      if (this.pos > this.max) {
        this.pos = this.max;
        this.vel = 0.15 * -Math.abs(this.vel);
      }

      return this;
    }
  }
}

function WoshTouchController({touching, touch_start_x, touch_start_y, touch_x, scrollPosStart, physics, disallow_drag_down}) {
  return {
    touching : touching,
    touch_start_x: touch_start_x,
    touch_start_y: touch_start_y,
    scrollPosStart: scrollPosStart,
    physics : physics,
    touch_x : touch_x,
    disallow_drag_down : disallow_drag_down,
    touchStart: function(e) {
      this.physics.should_snap = false;
      this.touch_x = e.touches[0].clientX;
      //return WoshTouchController(true, this.touch_x, physics.pos, this.physics);
      return WoshTouchController({
        ...this,
        touching: true,
        touch_start_x: e.touches[0].clientX,
        touch_start_y: e.touches[0].clientY,
        scrollPosStart: this.physics.pos,
        touch_x : e.touches[0].clientX,
      });
    },
    touchEnd: function() {
      this.physics.should_snap = true;
      return WoshTouchController({
        ...this,
        touching: false,
        touch_start_x: 0,
        touch_start_y: 0,
        touch_x : 0,
      });
    },
    touchMove: function(e) {
      let diff = e.touches[0].clientY - this.touch_start_y;
      if (!this.disallow_drag_down || diff < 12) {
        this.touch_x = e.touches[0].clientX;
      }
      else {
        this.touch_x = dan_lerp(this.touch_x, this.touch_start_x, 10);
      }
      const delta = this.touch_x - this.touch_start_x;
      const physics = this.physics.tick(this.scrollPosStart - delta);
      return WoshTouchController({
        ...this,
        touching: true,
        touch_x: this.touch_x,
        physics: physics,
      });
    },
    resetBounds: function(min, max, snaps) {
      return WoshTouchController({
        ...this,
        physics: this.physics.resetBounds(min, max).resetSnaps(snaps),
      });
    },
    tick: function() {
      return WoshTouchController({
        ...this,
        physics: this.physics.tick(null),
      });
    }
  }
}

export function WoshCarousel({onSelectedChange, inertia_k, children, disallow_drag_down}) {
  const [getPhysics, setPhysics] = useState(WoshTouchController({
      toucing: false,
      touch_start_x: 0, 
      touch_start_y: 0,
      scrollPosStart: 0,
      touch_x : 0,
      disallow_drag_down: disallow_drag_down,
      physics: WoshPhysics(0, 1, [], true, (x) => {
    onSelectedChange(x);
  })}));
  const scroller = useRef(null);

  const tick = () => {
    getPhysics.tick();
    if (scroller.current)
    {
      scroller.current.scrollLeft = dan_lerp(scroller.current.scrollLeft, getPhysics.physics.pos, inertia_k);
    }
  };

  // Recompute min, max bounds when children change.
  useEffect(() => {
    if (scroller && scroller.current && scroller.current.children && scroller.current.children.length > 0) {
      let items = scroller.current.children;
      let WW = 320 / 2;
      let clamp_x_min = items[0].clientWidth - WW;
      let clamp_x_max = -WW;

      for (let i = 0; i < items.length - 1; i++) {
        clamp_x_max += items[i].clientWidth;
      }

      let snaps = [];
      //let pos = 0;
      let pos = items[0].clientWidth;
      for (let i = 1; i < items.length - 1; i ++)
      {
        snaps.push(pos + items[i].clientWidth / 2);
        pos += items[i].clientWidth;
        //snaps.push(pos - WW);
      }


      setPhysics(getPhysics.resetBounds(clamp_x_min, clamp_x_max, snaps));
    }
  }, [children.length]);

  // Setup tick callback.
  useEffect(() => {
    onSelectedChange(0);
    const timerID = setInterval(() => tick(), 15);
    return () => clearInterval(timerID);
  }, []);

  return (<div style={scrollerStyle} ref={scroller}
    onTouchStart={(e) => {
      setPhysics(getPhysics.touchStart(e))
    }} 
    onTouchEnd={() => {
      setPhysics(getPhysics.touchEnd());
    }}
    onTouchMove={
      (e) => {
        setPhysics(getPhysics.touchMove(e));
      }
    }
    >
      <div style = {{minWidth:"200px"}}>
      </div>
      {children}
      <div style = {{minWidth:"200px"}}>
      </div>
  </div>);
}