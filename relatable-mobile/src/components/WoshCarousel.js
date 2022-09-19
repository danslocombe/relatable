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

function WoshPhysics(min, max, snaps, onSelectedChange) {
  const FRIC = 0.98;
  const FRIC_SNAP = 0.75;
  return {
    pos : 0,
    vel : 0,
    min : min,
    max : max,
    snaps: snaps,
    current_select: 0,
    onSelectedChange: onSelectedChange,
    resetBounds : function(min, max) {
      //console.log("Resetting bounds")
      //console.log("Min: " + min);
      //console.log("Max: " + max);
      this.min = min;
      this.max = max;
      return this;
    },
    resetSnaps: function(snaps) {
      this.snaps = snaps;
      return this;
    },
    tick: function(target_pos) {
      //console.log(this.vel);
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

      if (this.pos < this.min) {
        //console.log("hit min");
        this.pos = this.min;
        this.vel = 0.15 * Math.abs(this.vel);
      }

      if (this.pos > this.max) {
        //console.log("hit max");
        this.pos = this.max;
        this.vel = 0.15 * -Math.abs(this.vel);
      }
    }
  }
}

function WoshTouchController(touching, touchStartPos, scrollPosStart, physics) {
  return {
    touching : touching,
    touchStartPos: touchStartPos,
    scrollPosStart: scrollPosStart,
    physics : physics,
    touchStart: function(e) {
      return WoshTouchController(true, e.touches[0].clientX, physics.pos, this.physics);
    },
    touchEnd: function() {
      return WoshTouchController(false, 0, 0, this.physics);
    },
    touchMove: function(e) {
      const delta = e.touches[0].clientX - this.touchStartPos;
      this.physics.tick(this.scrollPosStart - delta);
      return WoshTouchController(true, this.touchStartPos, this.scrollPosStart, this.physics);
    },
    resetBounds: function(min, max, snaps) {
      return WoshTouchController(this.touching, this.touchStartPos, this.scrollPosStart, this.physics.resetBounds(min, max).resetSnaps(snaps));
    },
    tick: function() {
      this.physics.tick(null);
      return WoshTouchController(this.touching, this.touchStartPos, this.scrollPosStart, this.physics);
    }
  }
}

export function WoshCarousel({onSelectedChange, inertia_k, children}) {
  const [getPhysics, setPhysics] = useState(WoshTouchController(false, 0, 0, WoshPhysics(0, 1, [], (x) => {
    onSelectedChange(x);
  })));
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
      //console.log("Computing bounds");
      //console.log(items);
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

      //console.log(snaps);

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
      //console.log(scroller.current.scrollLeft);
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