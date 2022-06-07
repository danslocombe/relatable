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

        for (let i = 0; i < 3; i++)
        {
            const new_cell = input_row.insertCell(-1);
            new_cell.innerHTML = '<input type="text" id="input_' + i.toString() + '" inputmode="numeric" pattern="[1-4]"></input>';
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
        //client.next_turn();
        //console.log(JSON.parse(client.get_past_turns_json()));

        document.getElementById("submit").addEventListener("click", () => {
            console.log("click");
            next_turn(true);
        })
    });
