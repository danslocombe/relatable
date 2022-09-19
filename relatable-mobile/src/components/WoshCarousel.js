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

function WoshPhysics(min, max, snaps) {
  const FRIC = 0.98;
  const FRIC_SNAP = 0.9;
  return {
    pos : 0,
    vel : 0,
    min : min,
    max : max,
    snaps: snaps,
    resetBounds : function(min, max) {
      console.log("Resetting bounds")
      console.log("Min: " + min);
      console.log("Max: " + max);
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
        for (let i = 0; i < this.snaps.length; i++) {
          const dist_to_snap = Math.abs(center - this.snaps[i]); 
          if (closest_pos == null || dist_to_snap < closest_dist) {
            closest_dist = dist_to_snap;
            closest_pos = this.snaps[i];
          }
        }

        if (closest_dist < 50)
        {
          this.pos = dan_lerp(this.pos, closest_pos - 320/2, 20);
          this.vel = this.pos - pos_0;
          this.vel *= FRIC_SNAP;
        }
      }

      if (this.pos < this.min) {
        console.log("hit min");
        this.pos = this.min;
        this.vel = 0.15 * Math.abs(this.vel);
      }

      if (this.pos > this.max) {
        console.log("hit max");
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
      return WoshTouchController(true, e.touches[0].clientX, physics.pos, physics);
    },
    touchEnd: function() {
      return WoshTouchController(false, 0, 0, physics);
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

export function WoshCarousel2({onSelectedChange, inertia_k, children}) {
  const [getPhysics, setPhysics] = useState(WoshTouchController(false, 0, 0, WoshPhysics(0, 1)));
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

      console.log(snaps);

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
      console.log(scroller.current.scrollLeft);
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

export class WoshCarousel extends Component{

  constructor(props) {
    super(props);
    this.state = { scrollPos: 0, scrollVel: 0, touching:false, touchStart: 0, scrollPosStart : 0, currentSelected: 0 };
    this.scroller = createRef();
  }

  componentDidMount() {
    this.props.onSelectedChange(0);
    this.timerID = setInterval(() => this.tick(), 15);
  }

  componentWillUnmount() {
    clearInterval(this.timerID);
  }

  set_current_state = (currentSelected) => {
      if (this.state.currentSelected != currentSelected) {
        this.props.onSelectedChange(currentSelected)
        this.setState({currentSelected: currentSelected});
      }
  }

  tick_beta = () => {
    const items = this.scroller.current.children;
    if (!items || items.length == 0)
    {
      return;
    }

    if (this.state.touching)
    {
      return;
    }

    let centre = 320/2 + this.state.scrollPos;
    let min_dist = 1000;
    let min_x = 0;
    let min_i = 0;
    const lerp_k = 7;
    const lerp_k_edge = 10;
    const half_width = 320/2;

    let current_x = 0;
    let clamp_x_min = items[0].clientWidth + items[1].clientWidth / 2;
    if (centre < clamp_x_min) {
      this.setState((state) => ({scrollPos: dan_lerp(state.scrollPos, clamp_x_min - half_width, lerp_k_edge)}));
      this.set_current_state(0);
      return;
    }

    let clamp_x_max = -items[items.length - 2].clientWidth / 2;
    for (let i = 0; i < items.length - 1; i++)
    {
        clamp_x_max += items[i].clientWidth
    }
    if (centre > clamp_x_max) {
      this.setState((state) => ({scrollPos: dan_lerp(state.scrollPos, clamp_x_max - half_width, lerp_k_edge)}));
      this.set_current_state(items.length - 3);
      return;
    }

    for (let i = 0; i < items.length; i++)
    {
      let child = items[i];

      let target_x = (current_x + child.clientWidth / 2);
      let dist = Math.abs(centre - target_x);
      if (dist < min_dist) {
        min_dist = dist;
        min_x = target_x;
        min_i = i;
      }
      current_x += child.clientWidth;
    }

    //if (min_dist < 50) {
    {
      this.setState((state) => ({scrollPos: dan_lerp(state.scrollPos, min_x - 338/2, lerp_k)}));

      this.set_current_state(min_i - 1);
    }

  }

  tick = () => {
    if (!this.scroller) {
      return;
    }

    this.tick_beta();

    this.scroller.current.scrollLeft = dan_lerp(this.scroller.current.scrollLeft, this.state.scrollPos, this.props.inertia_k);
    //this.scroller.current.scrollLeft = this.state.scrollPos;
  };

  render = () => {
    return (<div style={scrollerStyle} ref={this.scroller}
      onTouchStart={(e) => {
        this.setState((state) => ({
          touching: true, 
          touchStart: e.touches[0].clientX,
          scrollPosStart: state.scrollPos}));
      }} 
      onTouchEnd={() => this.setState({touching: false})}
      onTouchMove={
        (e) => {
          let delta = e.touches[0].clientX - this.state.touchStart;
          this.setState((state) => ({
            scrollPos: state.scrollPosStart - delta,
          }));
        }
      }
      >
        <div style = {{minWidth:"200px"}}>
        </div>
        {this.props.children}
        <div style = {{minWidth:"200px"}}>
        </div>
    </div>);
  }
}