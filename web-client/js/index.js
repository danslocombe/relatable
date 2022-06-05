"use strict";
import { Client } from "../pkg/index.js"

var client = undefined;

fetch('/glove_filtered.embspace')
    .then(response => response.blob())
    .then(emb_space_blob => emb_space_blob.arrayBuffer())
    .then(emb_space_arraybuffer => {
        const emb_space_binary = new Uint8Array(emb_space_arraybuffer);
        client = new Client(emb_space_binary);

        client.new_game(1);
    });
