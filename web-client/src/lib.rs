#![allow(unused_parens)]

macro_rules! log {
    ( $( $t:tt )* ) => {
        web_sys::console::log_1(&format!( $( $t )* ).into())
    }
}

mod embedding_space;
mod message;
mod game;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}

#[wasm_bindgen]
pub struct Client {
    embedding_space : embedding_space::EmbeddingSpace,
    game : Option<game::Game>,
    seed : u64,
}

#[wasm_bindgen]
impl Client {
    #[wasm_bindgen(constructor)]
    pub fn new(emb_space_binary : Vec<u8>) -> Self {
        log!("Creating with embedding space {} bytes", emb_space_binary.len());
        Self {
            embedding_space : embedding_space::EmbeddingSpace::load(emb_space_binary),
            game : Default::default(),
            seed : 0,
        }
    }

    pub fn new_game(&mut self, seed : u32)
    {
        self.seed = seed as u64;
        let game = game::Game::new(seed as u64, &self.embedding_space);
        log!("{:?}", game);
        self.game = Some(game);
    }

    pub fn next_turn(&mut self, guess_0 : i32, guess_1 : i32, guess_2 : i32)
    {
        let guess = message::Message::from_ordering([guess_0 as u8, guess_1 as u8, guess_2 as u8]);
        log!("Generated guess message {:?} from {} {} {}", guess, guess_0, guess_1, guess_2);
        self.game.as_mut().unwrap().next_turn(
            froggy_rand::FroggyRand::new(self.seed), Some(guess), &self.embedding_space);

        log!("{:?}", self.game.as_ref().unwrap());
    }

    pub fn next_turn_noguess(&mut self)
    {
        //let g = message::Message::
        self.game.as_mut().unwrap().next_turn(
            froggy_rand::FroggyRand::new(self.seed), None, &self.embedding_space);

        log!("{:?}", self.game.as_ref().unwrap());
    }

    pub fn get_current_turn_json(&self) -> String {
        let current_turn = self.game.as_ref().unwrap().current_turn.as_ref().unwrap();
        serde_json::to_string(current_turn).unwrap()
    }

    pub fn get_past_turns_json(&self) -> String {
        let past_turns = &self.game.as_ref().unwrap().past_turns;
        serde_json::to_string(past_turns).unwrap()
    }

    pub fn correct_guess_count(&self) -> u32 {
        self.game.as_ref().unwrap().correct_guess_count()
    }
}