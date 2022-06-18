use froggy_rand::FroggyRand;
use serde::Serialize;

use crate::embedding_space::{EmbeddingSpace, Word, self};
use crate::message::{Message, Deck};

#[derive(Debug)]
pub struct Game {
    pub hidden_words : [Word;4],
    pub deck : Deck,
    pub past_turns : Vec<Turn>,
    pub current_turn : Option<Turn>,
    rng : froggy_rand::FroggyRand,
}

#[derive(Debug, Serialize)]
pub struct Turn {
    message : Message,
    player_guess : Option<Message>,
    clues_words : [Word;3],
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
    pub fn new(seed : &str, embedding_space : &EmbeddingSpace) -> Self {
        let rng = froggy_rand::FroggyRand::new(0).subrand(seed);
        let deck = Deck::new(&rng);

        let hidden_word_ids_vec = pick_n_different(&rng.subrand("n_different"), 0, embedding_space.size, 4);
        let hidden_words_vec : Vec<Word> = hidden_word_ids_vec.iter().map(|&i| embedding_space.all_words()[i]).collect();
        let hidden_words = hidden_words_vec.try_into().unwrap();

        Self {
            hidden_words,
            deck,
            past_turns : Default::default(),
            current_turn : Default::default(),
            rng,
        }
    }

    fn word_used(&self, word : Word) -> bool {
        for &hidden in &self.hidden_words {
            if (word == hidden) {
                return true;
            }
        }

        for past in &self.past_turns {
            for &clue in &past.clues_words {
                if (word == clue) {
                    return true;
                }
            } 
        }

        if let Some(turn) = self.current_turn.as_ref() {
            for &clue in &turn.clues_words {
                if (word == clue) {
                    return true;
                }
            } 
        }

        return false;
    }

    fn get_clue(&self, rng : FroggyRand, id : u8, embedding_space : &EmbeddingSpace) -> Word 
    {
        let hidden_word = &self.hidden_words[id as usize];
        //log!("get_clue for hidden word '{}'", hidden_word);
        let best = score_words(id as usize, &self.hidden_words, embedding_space);

        let mut i = 0;
        loop {
            let chosen_id = rng.gen_froggy(("choose", i), 0., 7. + (i as f64), 2).floor() as usize;
            i += 1;
            if chosen_id > best.len()
            {
                continue;
            }

            let (chosen, _sim) = best[chosen_id];

            if (reject_common_prefix_len(chosen.get_string(embedding_space), hidden_word.get_string(embedding_space))) {
                continue;
            }

            if (!self.word_used(chosen))
            {
                return chosen;
            }
        }
    }

    fn generate_turn(&mut self, rng : FroggyRand, embedding_space : &EmbeddingSpace) -> Option<Turn> {
        let message = self.deck.next()?;
        let ordering = message.to_ordering();

        let clues_words : [Word; 3] = ordering.iter().map(|id| {
            self.get_clue(rng.subrand(*id), *id, embedding_space)
        }).collect::<Vec<_>>().try_into().unwrap();

        let clues : [String; 3] = clues_words.iter().map(|word| word.get_string(embedding_space).to_owned()).collect::<Vec<_>>().try_into().unwrap();

        Some(Turn {
            message,
            player_guess : Default::default(),
            clues_words,
            clues,
        })
    }

    pub fn next_turn(&mut self, guess : Option<Message>, embedding_space : &EmbeddingSpace)
    {
        let current_turn = self.past_turns.len();
        let new_turn = self.generate_turn(self.rng.subrand(current_turn), embedding_space).unwrap();

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

fn score_words(target_word_id : usize, hidden_words : &[Word], embedding_space : &EmbeddingSpace) -> Vec<(Word, f32)>
{
    let words = embedding_space.all_words();

    let target_word = hidden_words[target_word_id];
    let target_vector = target_word.get_vector(embedding_space);

    let avoid_vectors = hidden_words.iter().filter(|&&x| x != target_word).map(|x| x.get_vector(embedding_space)).collect::<Vec<_>>();

    let mut scored_words = Vec::with_capacity(words.len());
    for &word in words {
        if (word == target_word)
        {
            continue;
        }

        let mut most_similar = None;
        for hidden_word in hidden_words {
            let similarity = embedding_space::similarity(word.get_vector(embedding_space), hidden_word.get_vector(embedding_space));
            if let Some((_most_similar_word, most_similar_score)) = most_similar {
                if (similarity > most_similar_score) {
                    most_similar = Some((hidden_word, similarity));
                }
            }
            else {
                most_similar = Some((hidden_word, similarity));
            }
        }

        if (*most_similar.unwrap().0 != target_word)
        {
            // Closest to a word not the target word
            continue;
        }

        let mut score = 0.;

        score += (avoid_vectors.len() + 3) as f32 * embedding_space::similarity(target_vector, word.get_vector(embedding_space));

        for avoid in &avoid_vectors {
            score -= embedding_space::similarity(*avoid, word.get_vector(embedding_space));
        }

        scored_words.push((word.clone(), score));
    }

    scored_words.sort_by(|(_, x), (_, y)| {
        y.partial_cmp(x).unwrap()
    });

    scored_words
}


fn reject_common_prefix_len(xs : &str, ys: &str) -> bool {
    let min_len = xs.len().min(ys.len());

    let common_prefix = get_common_prefix_len(xs, ys);

    common_prefix > min_len / 2
}

fn get_common_prefix_len(xs : &str, ys : &str) -> usize {

    let mut i = 0;

    for (x, y) in xs.chars().zip(ys.chars())
    {
        if (x.to_ascii_lowercase() != y.to_ascii_lowercase()) {
            break;
        }

        i+=1;
    }

    return i;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reject_common_prefix_len_test_postive()
    {
        assert!(reject_common_prefix_len("bed", "bedroom"));
        assert!(reject_common_prefix_len("camping", "camper"));
    }

    #[test]
    fn reject_common_prefix_len_test_negative()
    {
        assert!(!reject_common_prefix_len("bed", "hotel"));
        assert!(!reject_common_prefix_len("camping", "tent"));
    }
}