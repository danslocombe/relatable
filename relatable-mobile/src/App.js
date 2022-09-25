import logo from './logo.svg';
import './App.css';
import { Component, useEffect, useState } from 'react';
import React from "react";
import {WoshCarousel, WoshTouchControllerDefault} from './components/WoshCarousel';
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
  return (<div key={`slide_${id}`} style={{ padding: 65, height: group_carousel_height, backgroundColor: group_colors[id] }}>
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
  }, []);

  if (client) {

    const {clues, wordSets, currentTurn, groupAddedTo} = buildup_turn_state(client, currentTurnRemapping);

    const onAddWord = (clue, remapping) => {
      console.log("OnAddWord");
      setCurrentTurnRemapping((ctr) => {
        let copy = {...ctr};
        copy[clue] = remapping;
        console.log(copy);
        return copy;
      });
    }

    const submitGuess = () => {
      let input_0 = currentTurnRemapping[currentTurn.clues[0]]
      let input_1 = currentTurnRemapping[currentTurn.clues[1]]
      let input_2 = currentTurnRemapping[currentTurn.clues[2]]

      console.log(input_0, input_1, input_2);
      client.next_turn(input_0, input_1, input_2);
      // HACK we only redraw from this, not great
      setCurrentTurnRemapping({});
    }

    return (
      <div className="App" style={{}}>
        <h1>Relatable</h1>
        <Relatable
          clues={clues}
          wordSets={wordSets}
          onAddWord={onAddWord}
          groupAddedTo={groupAddedTo}
          submitGuess={submitGuess}
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

function buildup_turn_state(client, currentTurnRemapping) {
    let pastTurns = JSON.parse(client.get_past_turns_json());

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
        wordSets[currentTurnRemapping[clue]].push(clue);
      }
      else {
        clues.push(clue);
      }
    }

    let groupAddedTo = [false, false, false, false];
    for (let [_clue, mapping] of Object.entries(currentTurnRemapping))
    {
      groupAddedTo[mapping] = true;
    }

    return {
      clues: clues,
      wordSets: wordSets,
      groupAddedTo: groupAddedTo,
      currentTurn,
    };
}

function Relatable({onAddWord, clues, groupAddedTo, submitGuess, wordSets}) {
  const [currentClue, setCurrentClue] = useState(1);
  const [currentGroup, setCurrentGroup] = useState(1);

  const [swipeStart, setSwipeStart] = useState(null);
  const [swipeCurrent, setSwipeCurrent] = useState(null);

  const [replayState, setReplayState] = useState(null);

  const handleClueSwipeMove = (event) => {
    if (event.touches.length > 0)
    {
      setSwipeCurrent({y : event.touches[0].screenY});
    }
  }

  let swiping_down = 0;
  if ((swipeStart != null && swipeCurrent != null && !(groupAddedTo[currentGroup])))
  {
    swiping_down = Math.min(1, Math.max(0, swipeCurrent.y - swipeStart.y - 80) / 50);
  }

  const handleClueSwipeStart = (event) => {
    if (event.touches.length > 0)
    {
      setSwipeStart({y : event.touches[0].screenY});
    }
  }

  const handleClueSwipeEnd = (_event) => {
    if (swiping_down >= 0.9) {
      onAddWord(clues[currentClue], currentGroup);
    }

    setSwipeStart(null);
    setSwipeCurrent(null);
  }

  const [getTopController, setTopController] = useState(WoshTouchControllerDefault({
    onSelectedChange: (i) => {
      setCurrentClue(i);
      navigator.vibrate(5);
    },
    disallow_drag_down: true,
  }));

  const [getBotController, setBotController] = useState(WoshTouchControllerDefault({
    onSelectedChange: (i) => {
      setCurrentGroup(i);
      navigator.vibrate(5);
    },
    disallow_drag_down: false,
  }));

  let top;

  if (clues.length > 0)
  {
    const rendered_clues = clues.map((clue, index) => make_clue_container(index, clue, currentClue, currentGroup, swiping_down));

    top = (
      <WoshCarousel 
      controller={getTopController}
      setController={setTopController}
      inertia_k={3}
      >
        {rendered_clues}
    </WoshCarousel>
    );
  }
  else {
    top = (
      <button onClick={submitGuess}>Submit guess!</button>
    );
  }

  return (
    <div onTouchStart={handleClueSwipeStart} onTouchMove={handleClueSwipeMove} onTouchEnd={handleClueSwipeEnd}>
      <div style={{height:'150px', display: 'flex', justifyContent: 'center'}}>
        {top}
      </div>
    <h1>↓</h1> 
      <div style={{height:'400px', display: 'flex', justifyContent: 'center'}}>
        <WoshCarousel 
          controller={getBotController}
          setController={setBotController}
          inertia_k={1.5}
          >
          {make_group_container(0, wordSets[0], groupAddedTo[0])}
          {make_group_container(1, wordSets[1], groupAddedTo[1])}
          {make_group_container(2, wordSets[2], groupAddedTo[2])}
          {make_group_container(3, wordSets[3], groupAddedTo[3])}
        </WoshCarousel>
      </div>
    </div>
  );
}


export default App;
