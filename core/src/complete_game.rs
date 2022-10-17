use crate::embedding_space::Space;
use crate::game::*;

use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct CompleteGame {
    pub hidden_words: [String; 4],
    pub turns: Vec<Turn>,
}

impl CompleteGame {
    pub fn new<T: Space>(
        seed: &str,
        embedding_space: &T,
        turn_count: usize,
        config: GameConfig,
    ) -> Self {
        // Game must have at least one turn!
        assert!(turn_count > 0);

        println!("Generating a new game!");

        let mut game = Game::new(seed, embedding_space, config);

        for _ in 0..=turn_count {
            game.next_turn(None, embedding_space);
        }

        let hidden_words = game
            .hidden_words
            .iter()
            .map(|x| embedding_space.get_string(*x).to_owned())
            .collect::<Vec<_>>()
            .try_into()
            .unwrap();

        Self {
            hidden_words: hidden_words,
            turns: game.past_turns,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_data::test::TestSpace;

    const TEST_CONFIG: GameConfig = GameConfig {
        reject_candidate_clues_closer_to_other_hidden_words_than_target_hidden_word: false,
    };

    #[test]
    fn test_game_empty() {
        let space = TestSpace::new();
        let complate_game = CompleteGame::new("seed", &space, 2, TEST_CONFIG.clone());

        println!("{:#?}", complate_game);
        assert_eq!(2, complate_game.turns.len());
    }
}
