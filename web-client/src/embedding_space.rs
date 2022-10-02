use serde::Serialize;

const MAGIC:[u8;4] = [0x11, 0x22, 0x33, 0x44];
const HEADER_SIZE : u64 = 20;

pub trait Space
{
    fn all_words(&self) -> &[Word];
    fn get_vector(&self, word: Word) -> &[f32];
    fn get_string(&self, word: Word) -> &str;
}

pub struct EmbeddingSpace
{
    bytes : Vec<u8>,
    words : Vec<Word>,
    pub size : usize,
    pub dimensions : usize,
}

fn get_word_string_size_bytes(word : Word, bytes : &[u8]) -> usize {
    let size_bytes = (&bytes[word.0..word.0 + 4]).try_into().unwrap();
    u32::from_le_bytes(size_bytes) as usize
}

impl EmbeddingSpace
{
    pub fn load(bytes : Vec<u8>) -> Self
    {
        assert_eq!(MAGIC, bytes[0..4]);
        let size = u64::from_le_bytes((&bytes[4..12]).try_into().unwrap()) as usize;
        let dimensions = u64::from_le_bytes((&bytes[12..20]).try_into().unwrap()) as usize;

        let mut words = Vec::with_capacity(size);

        let mut offset = HEADER_SIZE as usize;
        for _ in 0..size
        {
            let word = Word(offset);
            offset += (4 + get_word_string_size_bytes(word, &bytes) + 4 * dimensions);
            words.push(word);
        }

        Self {
            bytes, words, size, dimensions
        }
    }

    fn get_vector_offset(&self, word : Word) -> usize
    {
        word.0 + 4 + get_word_string_size_bytes(word, &self.bytes)
    }

}

impl Space for EmbeddingSpace
{
    fn all_words(&self) -> &[Word]
    {
        &self.words
    }

    fn get_string(&self, word : Word) -> &str
    {
        let string_start = word.0+4;
        let string_size = get_word_string_size_bytes(word, &self.bytes);
        let string_bytes = &self.bytes[string_start..string_start+string_size];
        // We know the binary is generated with valid utf8 strings
        unsafe { std::str::from_utf8_unchecked(string_bytes) }
    }

    fn get_vector(&self, word : Word) -> &[f32]
    {
        let offset = self.get_vector_offset(word);
        let bytes = &self.bytes[offset..offset + 4 * self.dimensions];
        let vector = unsafe { std::slice::from_raw_parts(bytes.as_ptr() as *const f32, self.dimensions) };
        vector
    }
}

#[derive(Debug, Clone, Copy, PartialEq, PartialOrd, Eq, Ord, Serialize)]
pub struct Word(pub usize);

impl Word
{
    pub fn similarity<T : Space>(self, other : Self, embedding_space : &T) -> f32 {
        similarity(embedding_space.get_vector(self), embedding_space.get_vector(other))
    }
}

fn norm(v: &[f32]) -> Vec<f32>
{
    let mag = get_mag(v);

    let mut normed = Vec::with_capacity(v.len());
    for &x in v
    {
        normed.push((x as f64 / mag) as f32);
    }

    normed
}

fn dot(u : &[f32], v : &[f32]) -> f32
{
    let mut dot = 0.;

    for i in 0..u.len()
    {
        dot += (u[i] * v[i]) as f32;
    }

    dot
}

fn get_mag(v : &[f32]) -> f64
{
    let mut mag2 = 0.;
    for &x in v
    {
        mag2 += x as f64 * x as f64;
    }

    let mag = mag2.sqrt();
    mag
}

fn similarity(u : &[f32], v : &[f32]) -> f32
{
    assert_eq!(u.len(), v.len());
    let mag_u = get_mag(u);
    let mag_v = get_mag(v);
    let k = 1.0 / (mag_u * mag_v);

    let mut dot = 0.;

    for i in 0..u.len()
    {
        dot += (k * u[i] as f64 * v[i] as f64) as f32;
    }

    dot
}