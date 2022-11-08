import logo from './logo.svg';
import './App.css';
import { Component, useEffect, useState } from 'react';
import Modal from 'react-modal';
import React from "react";
import {WoshAutoMover, WoshCarousel, WoshTouchController, WoshTouchControllerDefault} from './components/WoshCarousel';
import init, { Client} from 'vecrypto-web-client'
import { init_panic_hook } from 'vecrypto-web-client';
import { FeedbackForm } from './components/Feedback.js'

const carousel_padding = 40;
const group_carousel_height = 450;
const clue_word_carousel_height = 180;

const group_colors = [
  'rgb(217, 255, 223)',
  'rgb(217, 255, 255)',
  'rgb(252, 221, 255)',
  'rgb(255, 255, 207)',
];

const modalStyles = {
  content: {
    top: "40%",
    left: "42%",
    right: "auto",
    bottom: "auto",
    marginRight: "-50%",
    transform: "translate(-50%, -50%)",
    width: "65%",
    height: "60%",
    borderRadius: 0,
    border: `2px solid black`,
  },
  overlay: { zIndex: 10, backgroundColor: "rgba(0,0,0,0.8)" },
   
}

const make_clue_container = (id, clue, currentClue, currentGroup, swipingDown) => {
  const style = {
    //padding: "10%",
    //padding: "15px",
    padding: carousel_padding,
    //paddingBottom: "50%",
    //height: clue_word_carousel_height,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  };
  
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

function random_seed() {
  return `game_id${Math.random()}`;
}

/*
function setup_new_game(client_inst) {
  client_inst.new_game(`game_id${Math.random()}`);
  client_inst.next_turn_noguess();
  client_inst.next_turn_noguess();
  client_inst.next_turn_noguess();
}
*/

function App() {
  const [client, setClient] = useState();
  const [currentTurnRemapping, setCurrentTurnRemapping] = useState({});
  const [currentTurnMarking, setCurrentTurnMarking] = useState({});
  const [showModal, setShowModal] = useState(true);

  const [replayController, setReplayController] = useState(null);

  useEffect(() => {
    init().then(() => {

      console.log("Running fetch");
      //const embedding_name = "fasttext_filtered.embspace";
      //fetch(embedding_name)
      //  .then(response => response.blob())
      //  .then(emb_space_blob => emb_space_blob.arrayBuffer())
      //  .then(emb_space_arraybuffer => {
      //      const emb_space_binary = new Uint8Array(emb_space_arraybuffer);
      //      console.log(`Got embedding space size=${emb_space_binary.length}, initialising client`);
      //      init_panic_hook();
      //      let client_inst = new Client(emb_space_binary)
      //      setup_new_game(client_inst);
      //      setClient(client_inst);
      //  });

      var shim_client = ShimClient();
      console.log("Creating new shim client");
      shim_client.new_game(random_seed()).then(() => {
        shim_client.next_turn_noguess();
        shim_client.next_turn_noguess();
        shim_client.next_turn_noguess();
        console.log(shim_client);
        setClient(shim_client);
      })
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
    const {clues, wordSets, currentTurn, groupAddedToState} = buildup_turn_state(client, currentTurnRemapping, currentTurnMarking);

    //if (true) {
    if (client.correct_guess_count() == 2) {
      let secret_words = JSON.parse(client.get_secret_words_json());
      const turn_count = JSON.parse(client.get_past_turns_json()).length;
      
      const reset = () => {
        client.new_game(random_seed()).then(() => {
          client.next_turn_noguess();
          client.next_turn_noguess();
          client.next_turn_noguess();
          
          setCurrentTurnRemapping({});
          setCurrentTurnMarking({});
          setReplayController(null);
        })
      };

      return (<div className="App" style={{}}>
        <h1>Congrats! Won in {turn_count} turns</h1>
        {make_group_container(0, wordSets[0], null, secret_words[0])}
        {make_group_container(1, wordSets[1], null, secret_words[1])}
        {make_group_container(2, wordSets[2], null, secret_words[2])}
        {make_group_container(3, wordSets[3], null, secret_words[3])}
        <button onClick={(e) => reset()}>
          <h3>Play again</h3>
        </button>
        <FeedbackForm client={client} />
        <hr/>
      </div>);
    }

    const onAddWord = (clue, remapping) => {
      setCurrentTurnRemapping((ctr) => {
        let copy = {...ctr};
        copy[clue] = remapping;
        return copy;
      });
    }
    
    const onRemoveWord = (mapping) => {
      setCurrentTurnRemapping((ctr) => {
        let copy = {};
        for (const [key, value] of Object.entries(ctr)) {
          if (value === mapping) {
            continue;
          }
          
          copy[key] = value;
        }
        
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
    
    let modal = <></>
    const closeModal = () => setShowModal(false);
    if (showModal) {
        modal = <Modal
          isOpen={true}
          onRequestClose={closeModal}
          style={modalStyles}
          contentLabel="Example Modal"
          ariaHideApp={false}
        >
          <h1> Relatable </h1>
          <p>Relatable is a game about grouping words.</p>
          <p>The game starts with the computer picking four hidden words. Then every round you are give three clue words. You must guess which of the hidden words they are refering to, using only the previous clues as hints!</p>
          <button onClick={closeModal}>Play!</button>
        </Modal>
    }

    return (
      <div className="App" style={{}}>
        {modal}
        <h1>Correct Guesses ({client.correct_guess_count()}/2)</h1>
        <Relatable
          clues={clues}
          wordSets={wordSets}
          onAddWord={onAddWord}
          onRemoveWord={onRemoveWord}
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

function Relatable({clues, groupAddedToState, submitGuess, wordSets, replayController, onAddWord, onRemoveWord}) {
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
  
  let swiping_up = 0;
  if ((swipeStart != null && swipeCurrent != null && groupAddedToState[currentGroup]))
  {
    swiping_up = Math.min(1, Math.max(0, swipeStart.y - swipeCurrent.y - 80) / 50);
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
    
    else if (swiping_up >= 0.9) {
      onRemoveWord(currentGroup);
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
      <div style={{height:'90px', display: 'flex', justifyContent: 'center'}}>
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


function ShimClient()
{
  return {
    complete_game: null,
    current_turn: 0,
    player_guesses: {},
    seed: "dummy_seed",
    
    new_game: async function (seed)
    {
      return fetch("/game?seed=" + seed)
        .then((x) => x.json())
        .then((x) => {
          this.complete_game = x;
          this.current_turn = 0;
          this.player_guesses = {};
          this.seed = seed;
        });
    },    
    
    next_turn: function(input_0, input_1, input_2)
    {
      this.player_guesses[this.current_turn] = [input_0, input_1, input_2];
      this.current_turn += 1;
    },
    
    next_turn_noguess: function()
    {
      this.current_turn += 1;
    },
    
    correct_guess_count: function()
    {
      let count = 0;
      for (const [turn_number, guesses] of Object.entries(this.player_guesses))
      {        
        const actual_message = this.complete_game.turns[turn_number].message
        
        let all_match = true;
        
        // Assume same length
        for (const i in guesses) {
          if (guesses[i] === actual_message[i]) {
            // Ok
          }
          else {
            all_match = false;
            break;
          }
        }
        
        if (all_match) {
          count += 1;
        }
      }
      
      return count;
    },
    
    get_secret_words_json : function() {return JSON.stringify(this.complete_game.hidden_words)},
    get_past_turns_json: function() {
      return JSON.stringify(this.complete_game.turns.slice(0,this.current_turn));
    },    
    get_current_turn_json: function() {
      return JSON.stringify(this.complete_game.turns[this.current_turn])
    },
    get_seed: function() {
      return this.seed;
    }
  }
}


export default App;
