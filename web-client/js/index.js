"use strict";
import { Client } from "../pkg/index.js"

const query_string = window.location.search;
let url_params = new URLSearchParams(query_string);

var game_seed = 101;
if (url_params.has("seed"))
{
    game_seed = parseInt(url_params.get("seed"));
}

var client = undefined;

var cols = ["#FCDDFF", "#FFFFCF", "#D9FFDF", "#D9FFFF"];

function add_turn(table_body, turn, current_turn)
{
    console.log(turn);
    const clues_row = table_body.insertRow(-1);
    clues_row.insertCell(-1);
    for (let clue of turn.clues)
    {
        const new_cell = clues_row.insertCell(-1);
        new_cell.innerHTML = "<b>" + clue + "</b>";
    }

    const order_row = turn_table_body.insertRow(-1);
    const new_cell = order_row.insertCell(-1);
    new_cell.innerHTML = "Secret";

    for (let id_s of turn.message)
    {
        const new_cell = order_row.insertCell(-1);
        if (current_turn)
        {
            new_cell.innerHTML = '???';
        }
        else
        {
            new_cell.innerHTML = id_s.toString();
            new_cell.style.backgroundColor = cols[id_s];
        }
    }

    if (turn.player_guess != null)
    {
        const player_guess_row = turn_table_body.insertRow(-1);
        const new_cell = player_guess_row.insertCell(-1);
        new_cell.innerHTML = "Guess";

        for (let id_s of turn.player_guess)
        {
            const new_cell = player_guess_row.insertCell(-1);
            new_cell.innerHTML = id_s.toString();
        }
    }

    if (current_turn)
    {
        const input_row = turn_table_body.insertRow(-1);
        const new_cell = input_row.insertCell(-1);
        new_cell.innerHTML = "Guess";

        let input_objs = []

        for (let i = 0; i < 3; i++)
        {
            const new_cell = input_row.insertCell(-1);
            new_cell.innerHTML = '<input type="text" id="input_' + i.toString() + '" inputmode="numeric" pattern="[1-4]"></input>';
            let input = document.getElementById("input_" + i.toString());
            input_objs.push(input);
        }

        for (let i = 0 ; i < 3; i++)
        {
            input_objs[i].addEventListener("input", make_input_keypress(i,input_objs));
            input_objs[i].addEventListener("keypress", on_keypress);
        }
    }
}

function rebuild_turns(turns, current_turn)
{
    const turn_table_body = document.getElementById("turn_table_body");
    turn_table_body.innerHTML = "";

    for (let turn of turns)
    {
        add_turn(turn_table_body, turn, false);
    }

    if (current_turn != null)
    {
        add_turn(turn_table_body, current_turn, true);
    }
}

function next_turn(use_guess_input)
{
    // Get guess
    if (use_guess_input)
    {
        let input_0 = parseInt(document.getElementById("input_0").value);
        let input_1 = parseInt(document.getElementById("input_1").value);
        let input_2 = parseInt(document.getElementById("input_2").value);
        client.next_turn(input_0, input_1, input_2);
    }
    else
    {
        client.next_turn_noguess();
    }

    const correct_guess_count = client.correct_guess_count();
    let turns = JSON.parse(client.get_past_turns_json());
    let current_turn = null;
    if (correct_guess_count < 2)
    {
        current_turn = JSON.parse(client.get_current_turn_json());
    }

    rebuild_turns(turns, current_turn);

    if (correct_guess_count == 2)
    {
        document.getElementById("correct_guess_count").innerHTML = "You won in " + turns.length + " turns!";
        const secret_table = document.getElementById("secret_words");
        const row = secret_table.insertRow(-1);
        const secret_words = JSON.parse(client.get_secret_words());
        const cell_descr = row.insertCell(-1);
        cell_descr.innerHTML = "Secret words: ";
        for (let word of secret_words)
        {
            const cell = row.insertCell(-1);
            cell.innerHTML = word;
        }
    }
    else
    {
        document.getElementById("correct_guess_count").innerHTML = "Correct Guesses " + correct_guess_count.toString() + "/2";
    }
}

function input_valid(current_id, inputs)
{
    let current = inputs[current_id];
    if (current.length > 1) {
        return false;
    }

    if (current.length == 1) {
        if (current[0] < '0' && current[0] > '3') {
            return false;
        }

        for (let i = 0; i < inputs.length; i++) 
        {
            // Overlap
            if (i != current_id && current === inputs[i]) {
                return false;
            }
        }
    }

    return true;
}

function trim_input(s) {
    if (s.length > 1) {
        s = s.substr(0, 1);
    }

    if (s.length == 1) {
        if (s[0] < '0' || s[0] > '3') {
            return "";
        }
    }

    return s;
}

function make_input_keypress(current, dom_objs)
{
    return () => {
        let dom_obj = dom_objs[current];
        // todo ensure inputs are different
        let cur_input = dom_obj.value;
        dom_obj.value = trim_input(cur_input);

        let inputs = dom_objs.map((x) => x.value);
        if (!input_valid(current, inputs)) {
            dom_obj.style.backgroundColor = "#FCBAB1";
        }
        else {
            dom_obj.style.backgroundColor = "";
        }
    }
}

function on_keypress(event) {
    if (event.keyCode == 13)
    {
        try_next_turn_with_input();
    }
}

function try_next_turn_with_input()
{
    let input_dom_objs = [0, 1, 2].map(x => document.getElementById("input_" + x.toString()));
    let inputs = input_dom_objs.map((x) => x.value);

    for (let i = 0; i < inputs.length; i++) {
        if (inputs[i].length == 0 || !input_valid(i, inputs)) {
            return false;
        }
    }

    next_turn(true);
    return true;
}

fetch('glove_filtered.embspace')
    .then(response => response.blob())
    .then(emb_space_blob => emb_space_blob.arrayBuffer())
    .then(emb_space_arraybuffer => {
        const emb_space_binary = new Uint8Array(emb_space_arraybuffer);
        client = new Client(emb_space_binary);

        client.new_game(game_seed);
        client.next_turn_noguess();
        client.next_turn_noguess();
        next_turn(false);

        document.getElementById("submit").addEventListener("click", () => {
            try_next_turn_with_input();
        })
    });
