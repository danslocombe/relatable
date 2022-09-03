import { Component, createRef } from 'react';

function dan_lerp(x0, x, k) {
  return (x0 * (k-1) + x) / k;
}

export default class WoshCarousel extends Component{

  constructor(props) {
    super(props);
    this.state = { scrollPos: 0, touching:false, touchStart: 0, scrollPosStart : 0 };
    this.scroller = createRef();
  }

  componentDidMount() {
    this.timerID = setInterval(() => this.tick(), 15);
  }

  componentWillUnmount() {
    clearInterval(this.timerID);
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

    let centre = 338/2 + this.state.scrollPos;
    let min_dist = 1000;
    let min_x = 0;
    const lerp_k = 7;
    const lerp_k_edge = 10;
    const half_width = 320/2;

    let current_x = 0;
    let clamp_x_min = items[0].clientWidth + items[1].clientWidth / 2;
    if (centre < clamp_x_min) {
      this.state.scrollPos = dan_lerp(this.state.scrollPos, clamp_x_min - half_width, lerp_k_edge);
      return;
    }

    let clamp_x_max = -items[items.length - 2].clientWidth / 2;
    for (let i = 0; i < items.length - 1; i++)
    {
        clamp_x_max += items[i].clientWidth
    }
    if (centre > clamp_x_max) {
      this.state.scrollPos = dan_lerp(this.state.scrollPos, clamp_x_max - half_width, lerp_k_edge);
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
      }
      current_x += child.clientWidth;
    }

    if (min_dist < 50) {
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
      overflowX: "auto",
      whiteSpace: "nowrap",
      position: "relative",
      touchAction: 'none',
      scrollBehavior: "auto",
    };

    return (<div style={style} ref={this.scroller}
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