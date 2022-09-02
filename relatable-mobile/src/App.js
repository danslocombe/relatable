import logo from './logo.svg';
import './App.css';
import { Component } from 'react';
import React from "react";
import { Carousel } from 'react-responsive-carousel';
import styles from 'react-responsive-carousel/lib/styles/carousel.min.css';
import { ScrollMenu, VisibilityContext } from "react-horizontal-scrolling-menu";


const carousel_padding = 20;
const group_carousel_height = 450;
const clue_word_carousel_height = 180;

const group_colors = [
  'rgb(217, 255, 223)',
  'rgb(217, 255, 255)',
  'rgb(252, 221, 255)',
  'rgb(255, 255, 207)',
];

const make_clue_container = (id, clue, currentClue, currentGroup, swipingDown) => {
  const style = { padding: carousel_padding, height: clue_word_carousel_height, display: 'flex', justifyContent: 'center', alignItems: 'center'};
  let rectStyle = {};

  if (swipingDown && id === currentClue)
  {
    rectStyle = {
      borderRadius: "8px",
      border: "8px solid " + group_colors[currentGroup],
      padding: "10px",
    };
  }

  return (<div key={`slide_${id}`} style={style}>
      <div  style={rectStyle}>
      <b>{clue}</b>
      </div>
  </div>
);
}

const make_clue_container_static = (id, clue) => {
  const style = { padding: carousel_padding, height: clue_word_carousel_height, display: 'flex', justifyContent: 'center', alignItems: 'center'};
  let rectStyle = {};

  return (<div key={`slide_${id}`} style={style}>
      <div  style={rectStyle}>
      <b>{clue}</b>
      </div>
  </div>
);
}

const make_group_container = (id, words) => {
  const rendered_words = words.map((word, index) => <p key={index}>{word}</p>);

  return (<div key={`slide_${id}`} style={{ padding: carousel_padding, height: group_carousel_height, backgroundColor: group_colors[id] }}>
      Group {id + 1}
      <br/>
      <br/>

      {rendered_words}
  </div>);
};

function App() {
  return (
    <div className="App" style={{}}>
      <h1>Relatable</h1>
      <Wosh />
    </div>
  );
}

function dan_lerp(x0, x, k) {
  return (x0 * (k-1) + x) / k;
}

class Wosh extends Component{

  constructor(props) {
    super(props);
    this.state = { scrollPos: 0, scroller : null, items : [], touching:false };
  }

  componentDidMount() {
    this.timerID = setInterval(() => this.tick(), 20);
  }

  componentWillUnmount() {
    clearInterval(this.timerID);
  }

  tick = () => {
    //this.setState((state, _props) => ({
      //scrollPos : 0,
    //}));
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
        this.state.scroller.scrollLeft = dan_lerp(this.state.scrollPos, clamp_x_min - 338/2, 10);
        return;
      }

      let clamp_x_max = -this.state.items[this.state.items.length - 2].clientWidth / 2;
      for (let i = 0; i < this.state.items.length - 1; i++)
      {
        console.log("pushing right");
          clamp_x_max += this.state.items[i].clientWidth
      }
      if (centre > clamp_x_max) {
        console.log("pushing left");
        this.state.scroller.scrollLeft = dan_lerp(this.state.scrollPos, clamp_x_max - 338/2, 10);
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
        this.state.scroller.scrollLeft = dan_lerp(this.state.scrollPos, min_x - 338/2, lerp_k);
      }

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
    };

    const onScroll = (e) => {
      this.setState({
        scrollPos: e.target.scrollLeft,
        items : e.target.childNodes,
        scroller : e.target,
      });
    }

    return (<div style={style}  onScroll={onScroll} onTouchStart={() => this.setState({touching: true})} onTouchEnd={() => this.setState({touching: false})}>
        <div style = {{minWidth:"200px"}}>
        </div>
        {
          testClues.map((clue, id) => (
              make_clue_container_static(id, clue)
          ))
        }
        <div style = {{minWidth:"200px"}}>
        </div>
    </div>);
  }
}

function MakeTest() {
    return (
    <div style={{
      display: "flex",
      border: "1px solid",
      width: "320px",
      height: "568px",
      scrollSnapType: "x mandatory",
      overflowX: "auto",
      whiteSpace: "nowrap",
      position: "relative",
      //-webkit-overflow-scrolling: "touch",
      
      //&::-webkit-scrollbar {
        //display: none;
      //}
    }}
    onScroll = {(e) => {
      // TODO get actual width
      let centre = 338/2 + e.target.scrollLeft;
      console.log(centre);
      let min_dist = 1000;
      let min_x = 0;
      let min_width = 0;
      let min_index = 0;

      const lerp_k = 7;

      let current_x = 0;
      let clamp_x_min = e.target.childNodes[0].clientWidth + e.target.childNodes[1].clientWidth / 2;
      if (centre < clamp_x_min) {
        e.target.scrollLeft = dan_lerp(e.target.scrollLeft, clamp_x_min - 338/2, 10);
        return;
      }

      for (let i = 0; i < e.target.childNodes.length; i++)
      {
        let child = e.target.childNodes[i];

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
        e.target.scrollLeft = dan_lerp(e.target.scrollLeft, min_x - 338/2, lerp_k);
      }

      console.log(min_index);
    }}
    >
        <div style = {{minWidth:"200px"}}>
        </div>
        {
          testClues.map((clue, id) => (
              make_clue_container_static(id, clue)
          ))
        }
        <div style = {{minWidth:"200px"}}>
        </div>
    </div>);
}

const testWordSets = [
  ['Easter', 'Carrot', 'Fluff'],
  ['Hills', 'Milk', 'Fringe'],
  ['Pink', 'Croissant', 'Ringu'],
  ['Water', 'Orange', 'Squeeze'],
];

const testClues = [
  'Hutch',
  'Concentrate',
  //'Blahblahblah',
  //'Qwerty',
  //'Typewriter',
];

class Relatable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentClue: 1,
      currentGroup: 1,
      wordSets: testWordSets,
      clues: testClues,

      swipeStart: null,
      swipeCurrent: null,
    };
  }

  setCurrentClue = (index) => {
    if (this.state.currentClue !== index) {
      this.setState({
        currentClue: index,
      });
    }
  };

  setCurrentGroup = (index) => {
    let clamped = Math.max(1, Math.min(4, index));
    if (this.state.currentGroup !== clamped) {
      this.setState({
        currentGroup: clamped,
      });
    }
  };

  handleClueSwipeMove = (event) => {
    console.log(event);
    if (event.touches.length > 0)
    {
      this.setState({
        swipeCurrent: {y : event.touches[0].screenY},
      });
    }
  }

  handleClueSwipeStart = (event) => {
    if (event.touches.length > 0)
    {
      this.setState({
        swipeStart: {y : event.touches[0].screenY},
      });
    }
  }

  handleClueSwipeEnd = (_event) => {
    this.setState({
      swipeStart: null,
      swipeCurrent: null,
    })
  }

  swipingDown = () => {
    if (this.state.swipeStart == null || this.state.swipeCurrent == null)
    {
      return false;
    }

    return (this.state.swipeCurrent.y - this.state.swipeStart.y) > 50;
  }

  render = () => {
    const swiping_down = this.swipingDown();

    const rendered_clues = this.state.clues.map((clue, index) => make_clue_container(index, clue, this.state.currentClue - 1, this.state.currentGroup - 1, swiping_down));


    let x = (<div><Carousel 
      centerMode
      centerSlidePercentage={35}
        selectedItem={this.state.currentClue}
        onChange={this.setCurrentClue}
        onSwipeMove={this.handleClueSwipeMove}
        onSwipeStart={this.handleClueSwipeStart}
        onSwipeEnd={this.handleClueSwipeEnd}
        autoPlay={false}
        showThumbs={false}
        showIndicators={true}
        statusFormatter={(current, total) => `Word ${current} out of ${total}`}
        preventMovementUntilSwipeScrollTolerance={10}
        >
      <div></div>
        {rendered_clues}
      <div></div>
    </Carousel>
    <h1>↓</h1> 
    <WordGroupCarousel currentSlide={this.state.currentGroup} setCurrentSlide={this.setCurrentGroup}>
      <div></div>
      {make_group_container(0, this.state.wordSets[0])}
      {make_group_container(1, this.state.wordSets[1])}
      {make_group_container(2, this.state.wordSets[2])}
      {make_group_container(3, this.state.wordSets[3])}
      <div></div>
    </WordGroupCarousel>
    </div>);

    return x;
  }
}

class WordGroupCarousel extends Component {
  constructor(props) {
    super(props);
  }

  render = () => {
    return <Carousel
      //transitionTime={0}
      selectedItem={this.props.currentSlide}
      onChange={this.props.setCurrentSlide}

      centerMode
      centerSlidePercentage={50}

      showStatus={false}
      autoPlay={false}
      showThumbs={false}
      showIndicators={false}
      {...this.props}
    >
      {this.props.children}
    </Carousel>
  }
}

export default App;


function useDrag() {
  const [clicked, setClicked] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const position = React.useRef(0);

  const dragStart = React.useCallback((ev) => {
    position.current = ev.clientX;
    setClicked(true);
  }, []);

  const dragStop = React.useCallback(
    () =>
      // NOTE: need some delay so item under cursor won't be clicked
      window.requestAnimationFrame(() => {
        setDragging(false);
        setClicked(false);
      }),
    []
  );

  const dragMove = (ev, cb) => {
    const newDiff = position.current - ev.clientX;

    const movedEnough = Math.abs(newDiff) > 5;

    if (clicked && movedEnough) {
      setDragging(true);
    }

    if (dragging && movedEnough) {
      position.current = ev.clientX;
      cb(newDiff);
    }
  };

  return {
    dragStart,
    dragStop,
    dragMove,
    dragging,
    position,
    setDragging
  };
}
