import logo from './logo.svg';
import './App.css';
import { Carousel } from 'react-responsive-carousel';
import styles from 'react-responsive-carousel/lib/styles/carousel.min.css';


const carousel_padding = 20;
const group_carousel_height = 450;
const clue_word_carousel_height = 180;

const make_clue_container = (slide_id, clue) => (
  <div key={slide_id} style={{ padding: carousel_padding, height: clue_word_carousel_height, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
      {clue}
  </div>
);

const group_colors = [
  'rgb(217, 255, 223)',
  'rgb(217, 255, 255)',
  'rgb(252, 221, 255)',
  'rgb(255, 255, 207)',
];

const make_group_container = (id, words) => {
  const rendered_words = words.map((word) => <p>{word}</p>);

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
      <Carousel 
          autoPlay={false}
          showThumbs={false}
          showIndicators={true}
          statusFormatter={(current, total) => `Word ${current} out of ${total}`}
          >
          {make_clue_container('slide1', 'Hutch')}
          {make_clue_container('slide2', 'Concentrate')}
      </Carousel>
      <b>↓</b> 
      <Carousel 
          centerMode
          centerSlidePercentage={80}
          //showStatus={false}
          autoPlay={false}
          showThumbs={false}
          //showIndicators={false}
          >
        {make_group_container(0, ['Easter', 'Carrot', 'Fluff'])}
        {make_group_container(1, ['Hills', 'Milk', 'Fringe'])}
        {make_group_container(2, ['Pink', 'Croissant', 'Ringu'])}
        {make_group_container(3, ['Water', 'Orange', 'Squeeze'])}
      </Carousel>
    </div>
  );
}

export default App;
