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
      <MakeTest />
    </div>
  );
}

function dan_lerp(x0, x, k) {
  return (x0 * (k-1) + x) / k;
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

      let current_x = 0;
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
        e.target.scrollLeft = dan_lerp(e.target.scrollLeft, min_x - 338/2, 6);
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

function MakeMouseMoveTest() {
    const { dragStart, dragStop, dragMove, dragging } = useDrag();
    const handleDrag = ({ scrollContainer }) => (
      ev
    ) =>
    {

      console.log("hello");
      return dragMove(ev, (posDiff) => {
        if (scrollContainer.current) {
          scrollContainer.current.scrollLeft += posDiff;
        }
      });
    }

    return (
    <div>
      <ScrollMenu 
        onMouseDown={() => dragStart}
        onMouseUp={() => dragStop}
        onMouseMove={handleDrag}
      >
        <div style = {{width:"200px"}}>
        </div>
        {
          testClues.map((clue, id) => (
              make_clue_container_static(id, clue)
          ))
        }
        <div style = {{width:"200px"}}>
        </div>
      </ScrollMenu>
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
  'Blahblahblah',
  'Qwerty',
  'Typewriter',
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
