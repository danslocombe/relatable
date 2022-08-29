import logo from './logo.svg';
import './App.css';
import { Component } from 'react';
import { Carousel } from 'react-responsive-carousel';
import styles from 'react-responsive-carousel/lib/styles/carousel.min.css';


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
      <Relatable />
    </div>
  );
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
];

class Relatable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentClue: 0,
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
    console.log("Swiping down " + swiping_down);
    console.log(this.state);

    const rendered_clues = this.state.clues.map((clue, index) => make_clue_container(index, clue, this.state.currentClue, this.state.currentGroup, swiping_down));
    return (
    <div>
    <Carousel 
        selectedItem={this.state.currentClue}
        onChange={this.setCurrentClue}
        onSwipeMove={this.handleClueSwipeMove}
        onSwipeStart={this.handleClueSwipeStart}
        onSwipeEnd={this.handleClueSwipeEnd}
        autoPlay={false}
        showThumbs={false}
        showIndicators={true}
        statusFormatter={(current, total) => `Word ${current} out of ${total}`}
        >
        {rendered_clues}
    </Carousel>
    <h1>↓</h1> 
    <WordGroupCarousel currentSlide={this.state.currentGroup} setCurrentSlide={this.setCurrentGroup}>
      {make_group_container(0, this.state.wordSets[0])}
      {make_group_container(1, this.state.wordSets[1])}
      {make_group_container(2, this.state.wordSets[2])}
      {make_group_container(3, this.state.wordSets[3])}
    </WordGroupCarousel>
    </div>
    );
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
      centerSlidePercentage={80}

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
