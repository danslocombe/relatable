"use strict";
import { Client } from "../pkg/index.js"

var client = undefined;

function add_turn()
{

}

function rebuild_turns(turns)
{
    const turn_table_body = document.getElementById("turn_table");
    const clues_row = turn_table_body.insertRow(0);

    for (let clue of turns[0].clues)
    {
        const new_cell = clues_row.insertCell(0);
        new_cell.innerHTML = "<b>" + clue + "</b>";
        //const child_text = document.createTextNode();
        //new_cell.appendChild(child_text);
    }

    clues_row.insertCell(0);

    const order_row = turn_table_body.insertRow(1);
    order_row.insertCell(0);

    for (let id_s of turns[0].message)
    {
        const new_cell = order_row.insertCell(order_row.length - 1);
        new_cell.innerHTML = id_s.toString();
        //const child_text = document.createTextNode();
        //new_cell.appendChild(child_text);
    }

    const new_cell = order_row.insertCell(0);
    new_cell.innerHTML = "Secret";
}

fetch('/glove_filtered.embspace')
    .then(response => response.blob())
    .then(emb_space_blob => emb_space_blob.arrayBuffer())
    .then(emb_space_arraybuffer => {
        const emb_space_binary = new Uint8Array(emb_space_arraybuffer);
        client = new Client(emb_space_binary);

        client.new_game(1);
        client.next_turn();
        client.next_turn();
        let turns = JSON.parse(client.get_past_turns_json());
        rebuild_turns(turns);
        //client.next_turn();
        //console.log(JSON.parse(client.get_past_turns_json()));
    });
