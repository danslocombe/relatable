import { Component, createRef } from 'react';

function dan_lerp(x0, x, k) {
  return (x0 * (k-1) + x) / k;
}

export default class WoshCarousel extends Component{

  constructor(props) {
    super(props);
    this.state = { scrollPos: 0, touching:false, touchStart: 0, scrollPosStart : 0, currentSelected: 0 };
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
    const style = {
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