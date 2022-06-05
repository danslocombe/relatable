// Based on github / danslocombe / decrypto

use froggy_rand::FroggyRand;
use serde::{Serialize, Serializer};

// Messages are an ordering of 3 of the of a team's 4 words
//
// If we have the words {w0, w1, w2, w3} then a valid message
// is a list of 3 of the words without repititions
// We will work with [u32; 3] to represent this.
// 
// There are 24 valid messages and we form a bijection from [0..23] -> Valid Message Space
// This way we can easily keep them as a single number and generate them randomly
#[derive(Debug, Copy, Clone, PartialEq, Eq, Hash)]
pub struct Message {
    id : u8,
}

const MAX_ID : u8 = 23;

impl Message {
    pub fn rand_new(rand : &FroggyRand) -> Self {
        Message {
            id: rand.gen_usize_range("new message", 0, MAX_ID as usize) as u8,
        }
    }

    pub fn to_ordering(&self) -> [u8; 3] {
        let x = self.id / 6;
        let y0 = (self.id % 6) / 2;
        let z0 = self.id % 2;

        let mut y = y0;
        let mut z = z0;

        if y >= x {
            y += 1;
        }

        if z >= y0 {
            z += 1;
        }
        if z >= x {
            z += 1;
        }

        [x, y, z]
    }
}

// Custom serializer implementation
// Convert to ordering first
impl Serialize for Message {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        self.to_ordering().serialize(serializer)
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Deck {
    messages : [Message; MAX_ID as usize + 1],
    i : usize,
}

impl Deck {
    pub fn new(froggy_rand : &FroggyRand) -> Self {
        let mut messages = (0..=MAX_ID).into_iter().map(|x| Message {
            id: x,
        }).collect::<Vec<_>>();

        froggy_rand.shuffle("shuffle", &mut messages);

        Deck {
            messages: messages.try_into().unwrap(),
            i : 0,
        }
    }

    pub fn cur(&self) -> &Message {
        &self.messages[self.i]
    }

    pub fn next(&mut self) -> Option<Message> {
        if self.i < self.messages.len() - 1 {
            self.i += 1;
            Some(*self.cur())
        }
        else {
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    #[test]
    fn all_ordering_unique()
    {
        let mut all = HashSet::new();
        for i in 0..=MAX_ID {
            let message = Message {
                id: i,
            };

            let ordering = message.to_ordering();
            all.insert(ordering);
        }

        assert_eq!(all.len() as u8, MAX_ID+1);
    }

    #[test]
    fn all_orderings_valid()
    {
        for i in 0..=MAX_ID {
            let message = Message {
                id: i,
            };

            let ordering = message.to_ordering();
            let mut set = HashSet::new();

            for x in &ordering {
                set.insert(x);
                assert!(*x < 4);
            }

            println!("id = {} | {:?}", i, ordering);

            assert_eq!(3, set.len());
        }
    }

    #[test]
    fn all_from_deck()
    {
        let rand = froggy_rand::FroggyRand::new(1);
        let mut deck = Deck::new(&rand);
        let mut all = HashSet::new();

        while {
            all.insert(deck.cur().to_ordering());
            deck.next().is_some()
        } {}

        assert_eq!(all.len() as u8, MAX_ID+1);
    }
}