use froggy_rand::FroggyRand;
use serde::Serialize;

use crate::embedding_space::{EmbeddingSpace, Space, Word};
use crate::message::{Deck, Message};
use crate::telemetry::{ClueTelemetry, CorrectState, DistanceInfo};

#[derive(Debug)]
pub struct Game {
    pub seed: String,

    pub hidden_words: [Word; 4],
    pub deck: Deck,
    pub past_turns: Vec<Turn>,
    pub current_turn: Option<Turn>,
    rng: froggy_rand::FroggyRand,

    reject_candidate_clues_closer_to_other_hidden_words_than_target_hidden_word: bool,
    //turn_gen_offset_max : usize,
    //turn_gen_offset_min : usize,
    //turn_gen_offset_iters : usize,
}

#[derive(Debug, Serialize)]
pub struct Turn {
    message: Message,
    player_guess: Option<Message>,
    clues_words: [Word; 3],
    clues: [String; 3],
}

fn pick_hidden_words<T: Space>(rand: &FroggyRand, embedding_space: &T) -> Vec<Word> {
    let mut picked = Vec::with_capacity(4);

    let mut seed = 0;
    while picked.len() < 4 {
        seed += 1;

        let chosen_i = rand.gen_usize_range(seed, 0, embedding_space.all_words().len() - 1);
        let candidate_word = embedding_space.all_words()[chosen_i];

        if (picked.contains(&candidate_word)) {
            continue;
        }

        // Heuristic - skip words with starting with uppercase letters as hidden words
        // They have weird similarity properties
        let first_char = embedding_space
            .get_string(candidate_word)
            .chars()
            .next()
            .unwrap();
        if (first_char.is_uppercase()) {
            continue;
        }

        picked.push(candidate_word);
    }

    picked
}

impl Game {
    pub fn new<T: Space>(seed: &str, embedding_space: &T) -> Self {
        let rng = froggy_rand::FroggyRand::new(0).subrand(seed);
        let deck = Deck::new(&rng);

        let hidden_words_vec = pick_hidden_words(&rng.subrand("n_different"), embedding_space);
        let hidden_words = hidden_words_vec.try_into().unwrap();

        Self {
            seed: seed.to_owned(),
            hidden_words,
            deck,
            past_turns: Default::default(),
            current_turn: Default::default(),
            rng,
            reject_candidate_clues_closer_to_other_hidden_words_than_target_hidden_word: true,
        }
    }

    pub fn new_with_words<T: Space>(
        seed: &str,
        hidden_words: [Word; 4],
        embedding_space: &T,
    ) -> Self {
        let rng = froggy_rand::FroggyRand::new(0).subrand(seed);
        let deck = Deck::new(&rng);

        Self {
            seed: seed.to_owned(),
            hidden_words,
            deck,
            past_turns: Default::default(),
            current_turn: Default::default(),
            rng,
            reject_candidate_clues_closer_to_other_hidden_words_than_target_hidden_word: false,
        }
    }

    pub fn score_difficulty(&self, embedding_space: &EmbeddingSpace) -> f32 {
        let mut total_dist = 0.;

        for i in 0..4 {
            for j in i + 1..4 {
                let word_x = self.hidden_words[i];
                let word_y = self.hidden_words[j];
                let similarity = word_x.similarity(word_y, embedding_space);
                total_dist += similarity * similarity;
            }
        }

        total_dist
    }

    fn word_used(&self, word: Word, other_clues: &[Word]) -> bool {
        for &other in other_clues {
            if (word == other) {
                return true;
            }
        }

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

    fn get_clue<T: Space>(
        &self,
        rng: FroggyRand,
        id: u8,
        embedding_space: &T,
        other_clues: &[Word],
    ) -> Word {
        let hidden_word = self.hidden_words[id as usize];
        //log!("get_clue for hidden word '{}'", hidden_word);
        let best = score_words(
            id as usize,
            &self.hidden_words,
            embedding_space,
            self.reject_candidate_clues_closer_to_other_hidden_words_than_target_hidden_word,
        );

        let mut i = 0;
        loop {
            let chosen_id = rng
                .gen_froggy(("choose", i), 0., 7. + (i as f64), 2)
                .floor() as usize;
            i += 1;
            if chosen_id >= best.len() {
                continue;
            }

            let (chosen, _sim) = best[chosen_id];

            if (reject_common_prefix_len(
                embedding_space.get_string(chosen),
                embedding_space.get_string(hidden_word),
            )) {
                continue;
            }

            if (!self.word_used(chosen, other_clues)) {
                return chosen;
            }
        }
    }

    fn generate_turn<T: Space>(&mut self, rng: FroggyRand, embedding_space: &T) -> Option<Turn> {
        let message = self.deck.next()?;
        let ordering = message.to_ordering();

        let mut clues_words_vec = Vec::with_capacity(3);

        for id in ordering.iter() {
            let clue = self.get_clue(
                rng.subrand(("get_clue", *id)),
                *id,
                embedding_space,
                &clues_words_vec,
            );
            clues_words_vec.push(clue);
        }

        let clues_words: [Word; 3] = clues_words_vec.try_into().unwrap();

        let clues: [String; 3] = clues_words
            .iter()
            .map(|word| embedding_space.get_string(*word).to_owned())
            .collect::<Vec<_>>()
            .try_into()
            .unwrap();

        Some(Turn {
            message,
            player_guess: Default::default(),
            clues_words,
            clues,
        })
    }

    pub fn next_turn<T: Space>(&mut self, guess: Option<Message>, embedding_space: &T) {
        let current_turn = self.past_turns.len();
        let new_turn = self
            .generate_turn(self.rng.subrand(current_turn), embedding_space)
            .unwrap();

        if let Some(mut turn) = self.current_turn.take() {
            turn.player_guess = guess;
            self.past_turns.push(turn);
        }

        self.current_turn = Some(new_turn);
    }

    pub fn correct_guess_count(&self) -> u32 {
        let mut count = 0;
        for turn in &self.past_turns {
            if turn.player_guess == Some(turn.message) {
                count += 1;
            }
        }

        count
    }

    fn all_clues_in_group(&self, group_id: usize, max_turn: usize) -> Vec<Word> {
        let mut words = Vec::new();
        for turn in self.past_turns.iter().take(max_turn) {
            for i in 0..3 {
                let group = turn.message.to_ordering()[i];
                if (group as usize == group_id) {
                    words.push(turn.clues_words[i]);
                }
            }
        }

        words
    }

    fn get_distance_info_to_group<T: Space>(
        &self,
        word: Word,
        group_id: usize,
        turn_id: usize,
        embedding_space: &T,
    ) -> Option<crate::telemetry::DistanceInfo> {
        let words = self.all_clues_in_group(group_id, turn_id);
        if (words.len() == 0) {
            return None;
        }

        let mut distances: Vec<_> = words
            .into_iter()
            .map(|x| word.similarity(x, embedding_space))
            .collect();
        Some(DistanceInfo::from_distances(distances))
    }

    pub fn get_telemetry_data<T: Space>(
        &self,
        embedding_space: &T,
    ) -> crate::telemetry::TelemetryData {
        let mut data = crate::telemetry::TelemetryData::empty(&self.seed);
        for (turn_id, turn) in self.past_turns.iter().enumerate() {
            let mut turn_telemetry = crate::telemetry::TurnTelemetry::default();

            let m_guess_ordering = turn.player_guess.map(|x| x.to_ordering());
            let actual_ordering = turn.message.to_ordering();
            for i in 0..3 {
                let clue_word = turn.clues_words[i];

                let correctness = if let Some(guess_ordering) = m_guess_ordering {
                    if guess_ordering[i] == actual_ordering[i] {
                        CorrectState::Correct
                    } else {
                        CorrectState::Incorrect
                    }
                } else {
                    CorrectState::NotGuessed
                };

                let correct_distance_info = self.get_distance_info_to_group(
                    clue_word,
                    actual_ordering[i] as usize,
                    turn_id,
                    embedding_space,
                );

                let mut incorrect_distance_info = Vec::with_capacity(3);
                for j in 0..3 {
                    if (j == actual_ordering[i]) {
                        continue;
                    }

                    incorrect_distance_info.push(self.get_distance_info_to_group(
                        clue_word,
                        j as usize,
                        turn_id,
                        embedding_space,
                    ))
                }

                let group = turn.message.to_ordering()[i] as usize;
                let hidden_word = self.hidden_words[group];
                let distance_to_hidden_word = clue_word.similarity(hidden_word, embedding_space);

                let distances = self
                    .hidden_words
                    .iter()
                    .enumerate()
                    .filter(|(i, _)| *i != group)
                    .map(|(_, x)| clue_word.similarity(*x, embedding_space))
                    .collect::<Vec<_>>();
                let distance_to_other_hidden_words = DistanceInfo::from_distances(distances);

                turn_telemetry.clues.push(ClueTelemetry {
                    word: turn.clues[i].clone(),

                    distance_to_hidden_word,
                    distance_to_other_hidden_words,

                    correctness,
                    correct_distance_info,
                    incorrect_distance_info,
                });
            }

            data.turns.push(turn_telemetry);
        }

        data.hidden_words = self
            .hidden_words
            .iter()
            .map(|x| embedding_space.get_string(*x).to_owned())
            .collect();
        data
    }
}

fn score_words<T: Space>(
    target_word_id: usize,
    hidden_words: &[Word],
    embedding_space: &T,
    reject_candidate_clues_closer_to_other_hidden_words_than_target_hidden_word: bool,
) -> Vec<(Word, f32)> {
    let words = embedding_space.all_words();

    let target_word = hidden_words[target_word_id];

    let mut scored_words = Vec::with_capacity(words.len());
    for &word in words {
        if (word == target_word) {
            continue;
        }

        if (reject_candidate_clues_closer_to_other_hidden_words_than_target_hidden_word) {
            let mut most_similar = None;
            for hidden_word in hidden_words {
                let similarity = word.similarity(*hidden_word, embedding_space);
                if let Some((_most_similar_word, most_similar_score)) = most_similar {
                    if (similarity > most_similar_score) {
                        most_similar = Some((hidden_word, similarity));
                    }
                } else {
                    most_similar = Some((hidden_word, similarity));
                }
            }

            if (*most_similar.unwrap().0 != target_word) {
                // Closest to a word not the target word
                continue;
            }
        }

        let mut score = 0.;

        for (i, hidden_word) in hidden_words.iter().enumerate() {
            if i == target_word_id {
                score += 6.0 * word.similarity(*hidden_word, embedding_space);
            } else {
                score -= word.similarity(*hidden_word, embedding_space);
            }
        }

        scored_words.push((word.clone(), score));
    }

    scored_words.sort_by(|(_, x), (_, y)| y.total_cmp(&x));

    scored_words
}

fn reject_common_prefix_len(xs: &str, ys: &str) -> bool {
    let min_len = xs.len().min(ys.len());

    let common_prefix = get_common_prefix_len(xs, ys);

    common_prefix > min_len / 2
}

fn get_common_prefix_len(xs: &str, ys: &str) -> usize {
    let mut i = 0;

    for (x, y) in xs.chars().zip(ys.chars()) {
        if (x.to_ascii_lowercase() != y.to_ascii_lowercase()) {
            break;
        }

        i += 1;
    }

    return i;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reject_common_prefix_len_test_postive() {
        assert!(reject_common_prefix_len("bed", "bedroom"));
        assert!(reject_common_prefix_len("camping", "camper"));
    }

    #[test]
    fn reject_common_prefix_len_test_negative() {
        assert!(!reject_common_prefix_len("bed", "hotel"));
        assert!(!reject_common_prefix_len("camping", "tent"));
    }

    struct TestSpace {
        words: Vec<Word>,
        vectors: Vec<Vec<f32>>,
        strings: Vec<&'static str>,
    }

    impl TestSpace {
        fn new() -> Self {
            Self {
                words: vec![
                    Word(0),
                    Word(1),
                    Word(2),
                    Word(3),
                    Word(4),
                    Word(5),
                    Word(6),
                    Word(7),
                    Word(8),
                    Word(9),
                    Word(10),
                    Word(11),
                    Word(12),
                    Word(13),
                    Word(14),
                    Word(15),
                    Word(16),
                    Word(17),
                    Word(18),
                    Word(19),
                ],
                vectors: vec![
                    vec![0.1, 0.1],
                    vec![0.1, 0.5],
                    vec![0.1, 0.4],
                    vec![0.1, 1.0],
                    vec![1.0, 0.1],
                    vec![1.0, 0.5],
                    vec![1.0, 0.4],
                    vec![1.0, 0.9],
                    vec![0.5, 0.2],
                    vec![0.5, 0.4],
                    vec![0.5, 0.5],
                    vec![0.5, 0.8],
                    vec![0.2, 0.1],
                    vec![0.2, 0.2],
                    vec![0.2, 0.6],
                    vec![0.2, 0.8],
                    vec![0.7, 0.1],
                    vec![0.7, 0.2],
                    vec![0.7, 0.6],
                    vec![0.7, 0.8],
                ],
                strings: vec![
                    "black", "yellow", "brown", "white", "cow", "cat", "dog", "spider", "dan",
                    "winsome", "froggy", "yianni", "chair", "desk", "sofa", "stool", "happy",
                    "sad", "angry", "neutral",
                ],
            }
        }
    }

    impl Space for TestSpace {
        fn all_words(&self) -> &[Word] {
            &self.words
        }

        fn get_vector(&self, word: Word) -> &[f32] {
            &self.vectors[word.0]
        }

        fn get_string(&self, word: Word) -> &str {
            &self.strings[word.0]
        }
    }

    #[test]
    fn test_telemetry_basic() {
        let space = TestSpace::new();
        let game = Game::new("seed", &space);

        let telemetry_data = game.get_telemetry_data(&space);
        assert_eq!(telemetry_data.turns.len(), 0);
    }

    #[test]
    fn test_telemetry_one_turn() {
        let space = TestSpace::new();
        let mut game = Game::new_with_words("seed", [Word(0), Word(1), Word(2), Word(3)], &space);
        println!("{:#?}", game);
        game.next_turn(None, &space);
        println!("{:#?}", game);
        game.next_turn(None, &space);
        println!("{:#?}", game);
        game.next_turn(None, &space);
        println!("{:#?}", game);

        let telemetry_data = game.get_telemetry_data(&space);
        println!("{:#?}", telemetry_data);
        assert_eq!(telemetry_data.turns.len(), 0);
    }
}
