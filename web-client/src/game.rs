use froggy_rand::FroggyRand;

use crate::embedding_space::EmbeddingSpace;
use crate::message::{Message, Deck};

#[derive(Debug)]
pub struct Game {
    hidden_words : [String;4],
    deck : Deck,
    past_turns : Vec<Turn>,
}

#[derive(Debug)]
pub struct Turn {
    message : Message,
    clues : [String;3],
}

fn pick_n_different(rand : &FroggyRand, min : usize, max : usize, n : usize) -> Vec<usize> {
    let mut picked = Vec::with_capacity(n);

    let mut i = 0;
    while picked.len() < n {
        i += 1;

        let chosen = rand.gen_usize_range(i, min, max);

        if (!picked.contains(&chosen))
        {
            picked.push(chosen);
        }
    }

    picked
}

impl Game {
    pub fn new(seed : u64, embedding_space : &EmbeddingSpace) -> Self {
        let rand = froggy_rand::FroggyRand::new(seed);
        let deck = Deck::new(&rand);

        let hidden_word_ids_vec = pick_n_different(&FroggyRand::from_hash(("n_different", seed)), 0, embedding_space.size, 4);
        let hidden_words_vec : Vec<String> = hidden_word_ids_vec.iter().map(|x| embedding_space.get_word_from_id(*x).to_owned()).collect();
        let hidden_words = hidden_words_vec.try_into().unwrap();

        Self {
            hidden_words,
            deck,
            past_turns : Default::default(),
        }
    }

    pub fn next_turn(&mut self)
    {
    }
}