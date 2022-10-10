import ReactStars from "react-rating-stars-component"
import { useState, useRef } from 'react';

export function FeedbackForm({client}) {
  const name = useRef(null);
  const notes = useRef(null);
  const [fun, setFun] = useState(0);
  const [difficulty, setDifficulty] = useState(0);

  const submit = () => {
    console.log("Hello");
  
    let game_telemetry = JSON.parse(client.get_telemetry_data_json());
    let payload = {
      game_telemetry: game_telemetry,
      fun: fun,
      difficulty: difficulty,
      player_name : name.current.value,
      player_feedback: notes.current.value,
    }
    console.log(payload);
    fetch("/telemetry", {
      method: 'POST',
      cache : 'no-cache',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload),
    });
 }
    
  return <>
   <h4>Your Name</h4>
   <input ref={name}></input>
   <h4>Fun</h4>
   <ReactStars count={5} onChange={setFun} size={24} activeColors="#ffd700" />
   <ReactStars count={5} onChange={setDifficulty} size={24} char="♣" activeColors="#ff3333" />
   <h4>Notes</h4>
   <input ref={notes}></input>
   <br />
   <button onClick={(e) => submit()}><h4>Submit feedback</h4> </button>
  </>
}
