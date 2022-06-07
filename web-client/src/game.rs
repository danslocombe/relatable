use froggy_rand::FroggyRand;
use serde::Serialize;

use crate::embedding_space::EmbeddingSpace;
use crate::message::{Message, Deck};

//#[derive(Debug)]
//pub enum GameState {
    //WaitingForGuess,
    //Won,
//}

#[derive(Debug)]
pub struct Game {
    pub hidden_words : [String;4],
    pub deck : Deck,
    pub past_turns : Vec<Turn>,
    pub current_turn : Option<Turn>,
}

#[derive(Debug, Serialize)]
pub struct Turn {
    message : Message,
    player_guess : Option<Message>,
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

        let hidden_word_ids_vec = pick_n_different(&rand.subrand("n_different"), 0, embedding_space.size, 4);
        let hidden_words_vec : Vec<String> = hidden_word_ids_vec.iter().map(|x| embedding_space.get_word_from_id(*x).to_owned()).collect();
        let hidden_words = hidden_words_vec.try_into().unwrap();

        Self {
            hidden_words,
            deck,
            past_turns : Default::default(),
            current_turn : Default::default(),
        }
    }

    fn word_used(&self, s : &str) -> bool {
        for hidden in &self.hidden_words {
            if (s.eq_ignore_ascii_case(hidden)) {
                return true;
            }
        }

        for past in &self.past_turns {
            for clue in &past.clues {
                if (s.eq_ignore_ascii_case(clue)) {
                    return true;
                }
            } 
        }

        if let Some(turn) = self.current_turn.as_ref() {
            for clue in &turn.clues {
                if (s.eq_ignore_ascii_case(clue)) {
                    return true;
                }
            } 
        }

        return false;
    }

    fn get_clue(&self, rng : FroggyRand, id : u8, embedding_space : &EmbeddingSpace) -> String 
    {
        let hidden_word = &self.hidden_words[id as usize];
        log!("get_clue for hidden word '{}'", hidden_word);
        //let best = embedding_space.get_best(hidden_word);
        let best = embedding_space.get_best_avoiding_others(id as usize, &self.hidden_words[0..]);

        let mut i = 0;
        loop {
            let chosen_id = rng.gen_froggy(("choose", i), 0., 6. + (i as f64), 2).floor() as usize;
            i += 1;
            if chosen_id > best.len()
            {
                continue;
            }

            let (chosen, sim) = best[chosen_id];

            log!("trying {}, id={} sim={}", chosen, chosen_id, sim);

            // TODO check against other hidden words.

            if (!self.word_used(chosen))
            {
                log!("Chose {}", chosen);
                return chosen.to_owned();
            }
        }
    }

    fn generate_turn(&mut self, rng : FroggyRand, embedding_space : &EmbeddingSpace) -> Option<Turn> {
        log!("generate_turn()");
        let message = self.deck.next()?;
        let ordering = message.to_ordering();

        let clues = ordering.iter().map(|id| {
            self.get_clue(rng.subrand(*id), *id, embedding_space)
        }).collect::<Vec<_>>().try_into().unwrap();

        Some(Turn {
            message,
            player_guess : Default::default(),
            clues,
        })
    }

    pub fn next_turn(&mut self, rng : FroggyRand, guess : Option<Message>, embedding_space : &EmbeddingSpace)
    {
        log!("next_turn()");
        let current_turn = self.past_turns.len();
        let new_turn = self.generate_turn(rng.subrand(current_turn), embedding_space).unwrap();

        if let Some(mut turn) = self.current_turn.take() {
            turn.player_guess = guess;
            self.past_turns.push(turn);
        }

        self.current_turn = Some(new_turn);
    }

    pub fn correct_guess_count(&self) -> u32
    {
        let mut count = 0;
        for turn in &self.past_turns  {
            if turn.player_guess == Some(turn.message) {
                count += 1;
            }
        }

        count
    }
}