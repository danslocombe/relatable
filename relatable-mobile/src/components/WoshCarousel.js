import { Component, createRef } from 'react';

function dan_lerp(x0, x, k) {
  return (x0 * (k-1) + x) / k;
}

export default class WoshCarousel extends Component{

  constructor(props) {
    super(props);
    this.state = { scrollPos: 0, scroller : null, items : [], touching:false, touch_start: 0, scrollPosStart : 0 };
    this.scroller = createRef();
  }

  componentDidMount() {
    this.timerID = setInterval(() => this.tick(), 15);
  }

  componentWillUnmount() {
    clearInterval(this.timerID);
  }

  tick_beta = () => {
    if (!this.state.items || this.state.items.length == 0)
    {
      return;
    }

    if (this.state.touching)
    {
      return;
    }

      let centre = 338/2 + this.state.scrollPos;
      let min_dist = 1000;
      let min_x = 0;
      let min_width = 0;
      let min_index = 0;

      const lerp_k = 7;

      let current_x = 0;
      let clamp_x_min = this.state.items[0].clientWidth + this.state.items[1].clientWidth / 2;
      if (centre < clamp_x_min) {
        console.log("pushing right");
        this.state.scrollPos = dan_lerp(this.state.scrollPos, clamp_x_min - 320/2, 10);
        return;
      }

      let clamp_x_max = -this.state.items[this.state.items.length - 2].clientWidth / 2;
      for (let i = 0; i < this.state.items.length - 1; i++)
      {
          clamp_x_max += this.state.items[i].clientWidth
      }
      if (centre > clamp_x_max) {
        console.log("pushing left");
        this.state.scrollPos = dan_lerp(this.state.scrollPos, clamp_x_max - 320/2, 10);
        //this.scroller.current.scrollLeft = clamp_x_max - 320/2;
        return;
      }

      for (let i = 0; i < this.state.items.length; i++)
      {
        let child = this.state.items[i];

        let target_x = (current_x + child.clientWidth / 2);
        let dist = Math.abs(centre - target_x);
        if (dist < min_dist) {
          min_index = i;
          min_dist = dist;
          min_width = child.clientWidth;
          min_x = target_x;
        }
        current_x += child.clientWidth;
      }

      if (min_dist < 50) {
        //e.target.scrollLeft = min_x - 338/2;
        console.log("snapping");
        //this.setState((state) => {
          //scrollPos: dan_lerp(state.scrollPos, min_x - 338/2, lerp_k)
        //});
        this.state.scrollPos = dan_lerp(this.state.scrollPos, min_x - 338/2, lerp_k);
      }

  }

  tick = () => {
    if (!this.scroller) {
      return;
    }

    this.tick_beta();

    this.scroller.current.scrollLeft = this.state.scrollPos;
  };

  render = () => {
    const style = {
      display: "flex",
      border: "1px solid",
      width: "320px",
      height: "568px",
      scrollSnapType: "x mandatory",
      overflowX: "auto",
      whiteSpace: "nowrap",
      position: "relative",
      touchAction: 'none',

      overflowScrolling: "auto",
      WebkitOverflowScrolling: "auto",
      scrollBehavior: "auto",
    };

    const onScroll = (e) => {
      this.setState({
        scrollPos: e.target.scrollLeft,
        items : e.target.childNodes,
        //scroller : e.target,
      });
    }

    return (<div style={style} onScroll={onScroll} scrollLeft={this.state.scrollPos} ref={this.scroller}
      onTouchStart={(e) => {
        this.setState((state) => ({
          touching: true, 
          touch_start: e.touches[0].clientX,
          scrollPosStart: state.scrollPos}));
      }} 
      onTouchEnd={() => this.setState({touching: false})}
      onTouchMove={
        (e) => {
          let delta = e.touches[0].clientX - this.state.touch_start;
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