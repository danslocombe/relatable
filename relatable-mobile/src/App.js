import logo from './logo.svg';
import './App.css';
import { Component, useEffect, useState } from 'react';
import React from "react";
import {WoshAutoMover, WoshCarousel, WoshTouchController, WoshTouchControllerDefault} from './components/WoshCarousel';
import init, { Client} from 'vecrypto-web-client'
import { init_panic_hook } from 'vecrypto-web-client';

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

const make_group_container = (id, words, lastStyling, actual_word) => {
  let renderedWords = [];
  for (let i in words) {
    let word = words[i];
    if (lastStyling && (i == words.length - 1)) {
      if (lastStyling === "correct")
      {
        renderedWords.push(<p key={i}><b>{word} ✅</b></p>);
      }
      else if (lastStyling === "wrong")
      {
        renderedWords.push(<p key={i}><b>{word} ❌</b></p>);
      }
      else
      {
        renderedWords.push(<p key={i}><b>{word}</b></p>);
      }
    }
    else {
      renderedWords.push(<p key={i}>{word}</p>);
    }
  }
  let header = <>{`Group ${id + 1}`}</>;
  if (actual_word) {
    header = <h3>{actual_word}</h3>;
  }

  return (<div key={`slide_${id}`} style={{ padding: 65, height: group_carousel_height, backgroundColor: group_colors[id] }}>
      {header}
      <br/>
      <br/>

      {renderedWords}
  </div>);
};

function App() {
  let [client, setClient] = useState();
  let [currentTurnRemapping, setCurrentTurnRemapping] = useState({});
  let [currentTurnMarking, setCurrentTurnMarking] = useState({});

  const [replayController, setReplayController] = useState(null);

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
            init_panic_hook();
            let client_inst = new Client(emb_space_binary)
            client_inst.new_game(`game_id${Math.random()}`);
            client_inst.next_turn_noguess();
            client_inst.next_turn_noguess();
            client_inst.next_turn_noguess();
            const telemetry_data = client_inst.get_telemetry_data_json();
            console.log(telemetry_data);
            setClient(client_inst);
        });
    })
  }, []);

  const mark_wrong = (clue_id) => {
    const {currentTurn} = buildup_turn_state(client, currentTurnRemapping, currentTurnMarking);
    let markingCopy = {...currentTurnMarking};
    console.log(currentTurn);
    let clue = currentTurn.clues[clue_id];
    console.log(`clue_id: ${clue_id} clue: ${clue}`);
    let guessed_group = currentTurnRemapping[clue];
    let actual_group = currentTurn.message[clue_id]
    console.log(`guess: ${guessed_group} actual: ${actual_group}`);
    const is_correct = guessed_group === actual_group;
    markingCopy[clue] = is_correct ? "correct" : "wrong";
    console.log("Marking copy");
    console.log(markingCopy);
    setCurrentTurnMarking(markingCopy);
  };

  useEffect(() => {
    if (replayController)
    {
      // Hack
      let timeout = 850;

      const timeout_id = setTimeout(() => {

        if (replayController.states.length > 1) {
          console.log("Slicing");

          let sliced = replayController.states.slice(1);
          let i = sliced[0];
          mark_wrong(3 - sliced.length);
          console.log(sliced);
          setReplayController({states: sliced});
        }
        else {
          const {currentTurn} = buildup_turn_state(client, currentTurnRemapping, currentTurnMarking);
          console.log("Proceeding to next turn.");
          let input_0 = currentTurnRemapping[currentTurn.clues[0]]
          let input_1 = currentTurnRemapping[currentTurn.clues[1]]
          let input_2 = currentTurnRemapping[currentTurn.clues[2]]

          console.log(input_0, input_1, input_2);
          client.next_turn(input_0, input_1, input_2);
          setCurrentTurnRemapping({});
          setReplayController(null);
        }
      }, timeout);
      return () => clearTimeout(timeout_id);
    }
  }, [replayController]);

  if (client) {
    //if (client.correct_guess_count() == 2) {
    const {clues, wordSets, currentTurn, groupAddedToState} = buildup_turn_state(client, currentTurnRemapping, currentTurnMarking);

    if (client.correct_guess_count() == 2) {
      let secret_words = JSON.parse(client.get_secret_words());
      const turn_count = JSON.parse(client.get_past_turns_json()).length;

      return (<div className="App" style={{}}>
        <h1>Congrats! Won in {turn_count} turns</h1>
        {make_group_container(0, wordSets[0], null, secret_words[0])}
        {make_group_container(1, wordSets[1], null, secret_words[1])}
        {make_group_container(2, wordSets[2], null, secret_words[2])}
        {make_group_container(3, wordSets[3], null, secret_words[3])}
        {<button><h3>Play again</h3></button>}
      </div>);
    }

    const onAddWord = (clue, remapping) => {
      setCurrentTurnRemapping((ctr) => {
        let copy = {...ctr};
        copy[clue] = remapping;
        return copy;
      });
    }

    const submitGuess = () => {
      console.log("Submit guess");

      let input_0 = currentTurnRemapping[currentTurn.clues[0]]
      let input_1 = currentTurnRemapping[currentTurn.clues[1]]
      let input_2 = currentTurnRemapping[currentTurn.clues[2]]
      mark_wrong(0);
      setReplayController({states: [input_0, input_1, input_2]});
    }

    return (
      <div className="App" style={{}}>
        <h1>Correct Guesses ({client.correct_guess_count()}/2)</h1>
        <Relatable
          clues={clues}
          wordSets={wordSets}
          onAddWord={onAddWord}
          groupAddedToState={groupAddedToState}
          submitGuess={submitGuess}
          replayController={replayController}
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

function buildup_turn_state(client, currentTurnRemapping, marking) {
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

    let groupAddedToState = [null, null, null, null];
    for (let [clue, mapping] of Object.entries(currentTurnRemapping))
    {
      if (marking[clue] === "correct") {
        groupAddedToState[mapping] = "correct";
      }
      else if (marking[clue] === "wrong") {
        groupAddedToState[mapping] = "wrong";
      }
      else {
        groupAddedToState[mapping] = "unmarked";
      }
    }

    return {
      clues: clues,
      wordSets: wordSets,
      groupAddedToState: groupAddedToState,
      currentTurn,
    };
}

function Relatable({onAddWord, clues, groupAddedToState, submitGuess, wordSets, replayController}) {
  //console.log("GATS");
  //console.log(groupAddedToState);
  const [currentClue, setCurrentClue] = useState(0);
  const [currentGroup, setCurrentGroup] = useState(0);

  const [swipeStart, setSwipeStart] = useState(null);
  const [swipeCurrent, setSwipeCurrent] = useState(null);

  const handleClueSwipeMove = (event) => {
    if (event.touches.length > 0)
    {
      setSwipeCurrent({y : event.touches[0].screenY});
    }
  }

  let swiping_down = 0;
  if ((swipeStart != null && swipeCurrent != null && !(groupAddedToState[currentGroup])))
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
      <button onClick={(e) => { console.log("Submit click"); submitGuess(e)}}>Submit guess!</button>
    );
  }

  useEffect(() => {
    if (replayController && replayController.states.length > 0) {
      let i = replayController.states[0];// - 1;
      setCurrentGroup(i);
      let target_base = getBotController.physics.snaps[i];
      let target = target_base - 320/2;
      //let delta = getBotController.physics.snaps[i] - getBotController.physics.snaps[i-1];
      //let target = getBotController.physics.snaps[i-1] + delta / 2;

      setBotController(WoshAutoMover({
        target: target,
        physics: getBotController.physics,
      }));
    }
    else {
      // TODO reset to touch controls
      setBotController(WoshTouchControllerDefault({
        onSelectedChange: (i) => {
          setCurrentGroup(i);
          navigator.vibrate(5);
        },
        disallow_drag_down: false,
        physics: getBotController.physics,
      }))
    }
  }, [replayController]);

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
          {make_group_container(0, wordSets[0], groupAddedToState[0])}
          {make_group_container(1, wordSets[1], groupAddedToState[1])}
          {make_group_container(2, wordSets[2], groupAddedToState[2])}
          {make_group_container(3, wordSets[3], groupAddedToState[3])}
        </WoshCarousel>
      </div>
    </div>
  );
}


export default App;
