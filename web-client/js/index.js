"use strict";
import { Client } from "../pkg/index.js"

const query_string = window.location.search;
let url_params = new URLSearchParams(query_string);

var game_seed = "daily-" + (new Date().toISOString().slice(0, 10));
if (url_params.has("seed"))
{
    game_seed = url_params.get("seed");
    console.log("Taking seed from url param '" + game_seed + "'");
}
else
{
    console.log("Using daily seed '" + game_seed + "'");
}

window.history.replaceState({}, '', '/?seed=' + game_seed);

document.getElementById("apply_seed").addEventListener("click", () => {
    window.location.replace('/?seed=' + document.getElementById('game_seed_input').value);
});

var client = undefined;

var hidden_word_colours = ["#FCDDFF", "#FFFFCF", "#D9FFDF", "#D9FFFF"];

function add_turn(table_body, turn, current_turn)
{
    if (table_body.children.length > 0) {
        const blank_row = table_body.insertRow(-1);
        for (let i = 0; i < 4; i++)
        {
            const blank_cell = blank_row.insertCell(-1);
        }
    }

    const clues_row = table_body.insertRow(-1);
    const new_cell_clues = clues_row.insertCell(-1);
    new_cell_clues.innerHTML = "Message";
    for (let clue of turn.clues)
    {
        const new_cell = clues_row.insertCell(-1);
        new_cell.innerHTML = "<b>" + clue + "</b>";
    }

    const order_row = turn_table_body.insertRow(-1);
    const new_cell_message = order_row.insertCell(-1);
    new_cell_message.innerHTML = "Decoded";

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
            new_cell.style.backgroundColor = hidden_word_colours[id_s];
            new_cell.style.color = "black";
        }
    }

    if (turn.player_guess != null)
    {
        const player_guess_row = turn_table_body.insertRow(-1);
        const new_cell = player_guess_row.insertCell(-1);
        new_cell.innerHTML = "Guess";

        for (let i = 0; i < turn.player_guess.length; i++)
        {
            let guess_id = turn.player_guess[i];
            var correct_id = turn.message[i];
            const new_cell = player_guess_row.insertCell(-1);
            var str = guess_id.toString();

            if (guess_id === correct_id) {
                new_cell.style.backgroundColor = hidden_word_colours[correct_id];
                new_cell.style.color = "black";
                str += " (Correct)";
            }

            new_cell.innerHTML = str;
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
            //new_cell.innerHTML = '<input type="text" id="input_' + i.toString() + '" inputmode="numeric" pattern="[1-4]" placeholder="Guess 0-3">';
            new_cell.innerHTML = '<select id="input_' + i.toString() + '"><option value="">Guess</option><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option></select>';
            let input = document.getElementById("input_" + i.toString());
            input_objs.push(input);
        }

        for (let i = 0 ; i < 3; i++)
        {
            input_objs[i].addEventListener("input", make_input_keypress(input_objs));
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

    redraw(false);
}

function redraw(gave_up)
{
    const correct_guess_count = client.correct_guess_count();
    const won = correct_guess_count == 2;
    let turns = JSON.parse(client.get_past_turns_json());
    let current_turn = null;
    if (!won && !gave_up)
    {
        current_turn = JSON.parse(client.get_current_turn_json());
    }

    rebuild_turns(turns, current_turn);

    if (won || gave_up)
    {
        document.getElementById("button_controls").innerHTML = "";
        if (won)
        {
            document.getElementById("correct_guess_count").innerHTML = "You won in " + turns.length + " turns!";
        }
        else
        {
            document.getElementById("correct_guess_count").innerHTML = "You gave up :(";
        }

        const secret_table = document.getElementById("secret_words");
        const row = secret_table.insertRow(-1);
        const secret_words = JSON.parse(client.get_secret_words());
        const cell_descr = row.insertCell(-1);
        cell_descr.innerHTML = "Secret words: ";
        for (let i = 0; i < secret_words.length; i++)
        {
            let word = secret_words[i];
            const cell = row.insertCell(-1);
            cell.innerHTML = word;
            cell.style.backgroundColor = hidden_word_colours[i];
            cell.style.color = "black";
        }

        document.getElementById("play_again").innerHTML = "<button id='play_again_button'>Play again</button>";
        document.getElementById("play_again_button").addEventListener("click", () => {
            document.getElementById("secret_words").innerHTML = "";
            document.getElementById("play_again").innerHTML = "";
            const new_seed = Math.floor(Math.random() * 1000 * 1000).toString();
            reset_game(new_seed);
        });
    }
    else
    {
        document.getElementById("correct_guess_count").innerHTML = "Correctly decoded sequences: " + correct_guess_count.toString() + "/2";
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

function make_input_keypress(dom_objs)
{
    return () => {
        for (let i = 0; i < dom_objs.length; i++)
        {
            let dom_obj = dom_objs[i];
            let cur_input = dom_obj.value;
            dom_obj.value = trim_input(cur_input);

            let inputs = dom_objs.map((x) => x.value);
            if (!input_valid(i, inputs)) {
                dom_obj.style.backgroundColor = "#FCBAB1";
                dom_obj.style.color = "black";
            }
            else {
                dom_obj.style.backgroundColor = "";
            }
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

//

//const embedding_name = "glove_filtered.embspace";
const embedding_name = "fasttext_filtered.embspace";

console.log("Fetching embedding " + embedding_name);

fetch(embedding_name)
    .then(response => response.blob())
    .then(emb_space_blob => emb_space_blob.arrayBuffer())
    .then(emb_space_arraybuffer => {
        const emb_space_binary = new Uint8Array(emb_space_arraybuffer);
        client = new Client(emb_space_binary);

        reset_game(game_seed);
    });

function reset_game(seed)
{
    document.getElementById("button_controls").innerHTML = "<button id='submit'>Submit</button>" + "&nbsp;"+  "<button id='give_up'>Give up</button>";
    document.getElementById("submit").addEventListener("click", () => {
        try_next_turn_with_input();
    });

    document.getElementById("give_up").addEventListener("click", () => {
        redraw(true);
    });

    document.getElementById("game_seed_input").value = seed;

    client.new_game(seed);
    client.next_turn_noguess();
    client.next_turn_noguess();
    next_turn(false);
}