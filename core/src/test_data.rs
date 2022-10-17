#[cfg(test)]
pub mod test {
    use crate::embedding_space::*;

    pub struct TestSpace {
        pub words: Vec<Word>,
        pub vectors: Vec<Vec<f32>>,
        pub strings: Vec<&'static str>,
    }

    impl TestSpace {
        pub fn new() -> Self {
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
}
