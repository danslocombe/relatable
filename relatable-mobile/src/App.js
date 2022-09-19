import logo from './logo.svg';
import './App.css';
import { Component, useEffect, useState } from 'react';
import React from "react";
import {WoshCarousel, WoshCarousel2} from './components/WoshCarousel';
import init, { Client} from 'vecrypto-web-client'


const carousel_padding = 40;
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

  if (swipingDown > 0.1 && id === currentClue)
  {
    rectStyle = {
      borderRadius: `8px`,
      border: `${Math.ceil(swipingDown * 8)}px solid ${group_colors[currentGroup]}`,
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

const make_group_container = (id, words, lastHighlighted) => {
  let renderedWords = [];
  for (let i in words) {
    let word = words[i];
    if (lastHighlighted && (i == words.length - 1)) {
      renderedWords.push(<p key={i}><b>{word}</b></p>);
    }
    else {
      renderedWords.push(<p key={i}>{word}</p>);
    }
  }
  return (<div key={`slide_${id}`} style={{ padding: carousel_padding, height: group_carousel_height, backgroundColor: group_colors[id] }}>
      Group {id + 1}
      <br/>
      <br/>

      {renderedWords}
  </div>);
};

function App() {
  let [client, setClient] = useState();
  let [currentTurnRemapping, setCurrentTurnRemapping] = useState({});
  useEffect(() => {
    init().then(() => {

      console.log("Running fetch");
      const embedding_name = "fasttext_filtered.embspace";
      fetch(embedding_name)
        .then(response => response.blob())
        .then(emb_space_blob => emb_space_blob.arrayBuffer())
        .then(emb_space_arraybuffer => {
            const emb_space_binary = new Uint8Array(emb_space_arraybuffer);
            console.log(`Got embedding space size=${emb_space_binary.length}, initialising client`);
            let client_inst = new Client(emb_space_binary)
            client_inst.new_game("hello mr wosh");
            client_inst.next_turn_noguess();
            client_inst.next_turn_noguess();
            client_inst.next_turn_noguess();
            setClient(client_inst);
        });
    })
  }, [])

  if (client) {
    let pastTurns = JSON.parse(client.get_past_turns_json());
    console.log("Rendering..");
    console.log(pastTurns);

    let clues = [];
    let wordSets = [[], [], [], []];

    for (let turn of pastTurns) {
      for (let i in turn.clues) {
        let groupId = turn.message[i];
        wordSets[groupId].push(turn.clues[i]);
      }
    }

    let currentTurn = JSON.parse(client.get_current_turn_json());
    for (let clue of currentTurn.clues)
    {
      if (currentTurnRemapping[clue] !== undefined) {
        console.log("Filtering");
        wordSets[currentTurnRemapping[clue]].push(clue);
      }
      else {
        clues.push(clue);
      }
    }

    console.log("clues");
    console.log(clues);

    let groupAddedTo = [false, false, false, false];
    for (let [_clue, mapping] of Object.entries(currentTurnRemapping))
    {
      groupAddedTo[mapping] = true;
    }

    return (
      <div className="App" style={{}}>
        <h1>Relatable</h1>
        <Relatable
          clues={clues}
          wordSets={wordSets}
          onAddWord={(clue, remapping) => {
            console.log("OnAddWord");
            setCurrentTurnRemapping((ctr) => {
              let copy = {...ctr};
              copy[clue] = remapping;
              console.log(copy);
              return copy;
            })
          }}
          groupAddedTo={groupAddedTo}
          submitGuess={() => {
            let input_0 = currentTurnRemapping[currentTurn.clues[0]]
            let input_1 = currentTurnRemapping[currentTurn.clues[1]]
            let input_2 = currentTurnRemapping[currentTurn.clues[2]]

            console.log(input_0, input_1, input_2);
            client.next_turn(input_0, input_1, input_2);
            // HACK we only redraw from this, not great
            setCurrentTurnRemapping({});
          }}
          />
      </div>
    );
  }
  else {
    return (
      <div className="App" style={{}}>
        <h1>Loading...</h1>
      </div>

    )
  }
}

class Relatable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentClue: 1,
      currentGroup: 1,

      swipeStart: null,
      swipeCurrent: null,
    };
  }

  handleClueSwipeMove = (event) => {
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
    if (this.swipingDown() >= 0.9) {
      this.props.onAddWord(this.props.clues[this.state.currentClue], this.state.currentGroup);
    }

    this.setState({
      swipeStart: null,
      swipeCurrent: null,
    })
  }

  swipingDown = () => {
    if ((this.state.swipeStart == null || this.state.swipeCurrent == null))
    {
      return 0;
    }

    if (this.props.groupAddedTo[this.state.currentGroup])
    {
      return 0;
    }

    let sd = Math.min(1, Math.max(0, this.state.swipeCurrent.y - this.state.swipeStart.y - 80) / 50);
    return sd
  }

  render = () => {
    const swiping_down = this.swipingDown();

    let top = (<></>);

    if (this.props.clues.length > 0)
    {
      const rendered_clues = this.props.clues.map((clue, index) => make_clue_container(index, clue, this.state.currentClue, this.state.currentGroup, swiping_down));

      top = (
        <WoshCarousel2 onSelectedChange={(e) => {
          this.setState({currentClue: e});
          navigator.vibrate(5);
        }} inertia_k={3} >
          {rendered_clues}
      </WoshCarousel2>
      );
    }
    else {
      top = (
        <button onClick={this.props.submitGuess}>Submit guess!</button>
      );
    }

    let bot = (
    <WoshCarousel onSelectedChange={(e) => { 
      this.setState({currentGroup: e});
      navigator.vibrate(5);
      }} inertia_k={1.5}>
      {make_group_container(0, this.props.wordSets[0], this.props.groupAddedTo[0])}
      {make_group_container(1, this.props.wordSets[1], this.props.groupAddedTo[1])}
      {make_group_container(2, this.props.wordSets[2], this.props.groupAddedTo[2])}
      {make_group_container(3, this.props.wordSets[3], this.props.groupAddedTo[3])}
    </WoshCarousel>
    );

    return (
      <div onTouchStart={this.handleClueSwipeStart} onTouchMove={this.handleClueSwipeMove} onTouchEnd={this.handleClueSwipeEnd}>
        <div style={{height:'150px', display: 'flex', justifyContent: 'center'}}>
          {top}
        </div>
      <h1>↓</h1> 
        <div style={{height:'400px', display: 'flex', justifyContent: 'center'}}>
        {bot}
        </div>
      </div>
    );
  }
}


export default App;
