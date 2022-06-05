#![allow(unused_parens)]

mod embedding_space;
mod message;
mod game;

use wasm_bindgen::prelude::*;
use serde::Deserialize;

macro_rules! log {
    ( $( $t:tt )* ) => {
        web_sys::console::log_1(&format!( $( $t )* ).into())
    }
}

#[wasm_bindgen]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}

#[wasm_bindgen]
pub struct Client {
    embedding_space : embedding_space::EmbeddingSpace,
    game : Option<game::Game>,
}

#[wasm_bindgen]
impl Client {
    #[wasm_bindgen(constructor)]
    pub fn new(emb_space_binary : Vec<u8>) -> Self {
        log!("Creating with embedding space {} bytes", emb_space_binary.len());
        Self {
            embedding_space : embedding_space::EmbeddingSpace::load(emb_space_binary),
            game : Default::default(),
        }
    }

    pub fn new_game(&mut self, seed : u32)
    {
        let game = game::Game::new(seed as u64, &self.embedding_space);
        log!("{:?}", game);
        self.game = Some(game);
    }
}