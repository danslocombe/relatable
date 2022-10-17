#![allow(unused_parens)]

macro_rules! log {
    ( $( $t:tt )* ) => {
        web_sys::console::log_1(&format!( $( $t )* ).into())
    }
}

use wasm_bindgen::prelude::*;

use core::embedding_space::Space;
use core::*;

#[wasm_bindgen]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}

#[wasm_bindgen]
pub struct Client {
    embedding_space: embedding_space::EmbeddingSpace,
    game: Option<game::Game>,
}

#[wasm_bindgen]
impl Client {
    #[wasm_bindgen(constructor)]
    pub fn new(emb_space_binary: Vec<u8>) -> Self {
        log!(
            "Creating with embedding space {} bytes",
            emb_space_binary.len()
        );
        Self {
            embedding_space: embedding_space::EmbeddingSpace::load(emb_space_binary),
            game: Default::default(),
        }
    }

    pub fn new_game(&mut self, seed: &str) {
        let game = game::Game::new(seed, &self.embedding_space, Default::default());
        log!(
            "Difficulty {}",
            game.score_difficulty(&self.embedding_space)
        );
        //log!("{:?}", game);
        self.game = Some(game);
    }

    pub fn next_turn(&mut self, guess_0: i32, guess_1: i32, guess_2: i32) {
        let guess = message::Message::from_ordering([guess_0 as u8, guess_1 as u8, guess_2 as u8]);
        //log!("Generated guess message {:?} from {} {} {}", guess, guess_0, guess_1, guess_2);
        self.game
            .as_mut()
            .unwrap()
            .next_turn(Some(guess), &self.embedding_space);
    }

    pub fn next_turn_noguess(&mut self) {
        //let g = message::Message::
        self.game
            .as_mut()
            .unwrap()
            .next_turn(None, &self.embedding_space);
    }

    pub fn get_seed(&self) -> String {
        self.game
            .as_ref()
            .map(|x| x.seed.clone())
            .unwrap_or_default()
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

    pub fn get_secret_words(&self) -> String {
        let hidden_words = &self.game.as_ref().unwrap().hidden_words;
        let hidden = hidden_words
            .iter()
            .map(|x| self.embedding_space.get_string(*x))
            .collect::<Vec<_>>();
        serde_json::to_string(&hidden).unwrap()
    }

    pub fn get_telemetry_data_json(&self) -> String {
        let telemetry = self
            .game
            .as_ref()
            .unwrap()
            .get_telemetry_data(&self.embedding_space);
        serde_json::to_string(&telemetry).unwrap()
    }
}
