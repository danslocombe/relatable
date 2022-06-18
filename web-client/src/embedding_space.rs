use serde::Serialize;

const MAGIC:[u8;4] = [0x11, 0x22, 0x33, 0x44];
const HEADER_SIZE : u64 = 20;

pub struct EmbeddingSpace
{
    bytes : Vec<u8>,
    words : Vec<Word>,
    pub size : usize,
    pub dimensions : usize,
}

//pub struct EmbeddingSpaceWord(u32);

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
            offset += (4 + word.get_string_size_bytes(&bytes) + 4 * dimensions);
            words.push(word);
        }

        Self {
            bytes, words, size, dimensions
        }
    }

    pub fn find_offset_linear(&self, s : &str) -> Option<usize>
    {
        let mut offset = HEADER_SIZE as usize;
        for i in 0..self.size
        {
            let string_start = offset+4;
            let size_bytes = (&self.bytes[offset..string_start]).try_into().unwrap();
            let string_size = u32::from_le_bytes(size_bytes) as usize;

            if (s.len() == string_size)
            {
                let string_bytes = &self.bytes[string_start..string_start+string_size];
                let string = unsafe { std::str::from_utf8_unchecked(string_bytes) };

                if (s.eq_ignore_ascii_case(string))
                {
                    let bytes_start = string_start + string_size;
                    return Some(bytes_start);
                }
            }

            offset += (4 + string_size + 4 * self.dimensions);

        }

        None
    }
}

#[derive(Debug, Clone, Copy, PartialEq, PartialOrd, Eq, Ord, Serialize)]
pub struct Word(usize);

impl Word
{
    pub fn get_string_size(&self, embedding_space : &EmbeddingSpace) -> usize
    {
        self.get_string_size_bytes(&embedding_space.bytes)
    }

    fn get_string_size_bytes(&self, bytes: &[u8]) -> usize
    {
        let size_bytes = (&bytes[self.0..self.0 + 4]).try_into().unwrap();
        u32::from_le_bytes(size_bytes) as usize
    }

    fn get_vector_offset(&self, embedding_space : &EmbeddingSpace) -> usize
    {
        self.0 + 4 + self.get_string_size(embedding_space)
    }
}

impl<'a> Word
{
    pub fn get_string(&self, embedding_space : &'a EmbeddingSpace) -> &'a str
    {
        let string_start = self.0+4;
        let string_size = self.get_string_size(embedding_space);
        let string_bytes = &embedding_space.bytes[string_start..string_start+string_size];
        // We know the binary is generated with valid utf8 strings
        unsafe { std::str::from_utf8_unchecked(string_bytes) }
    }

    pub fn get_vector(&self, embedding_space : &'a EmbeddingSpace) -> &'a [f32]
    {
        let offset = self.get_vector_offset(embedding_space);
        let bytes = &embedding_space.bytes[offset..offset + 4 * embedding_space.dimensions];
        let vector = unsafe { std::slice::from_raw_parts(bytes.as_ptr() as *const f32, embedding_space.dimensions) };
        vector
    }
}

impl EmbeddingSpace
{
    pub fn find_word_linear(&self, s : &str) -> Option<Word>
    {
        let mut offset = HEADER_SIZE as usize;
        for i in 0..self.size
        {
            let word = Word(offset);
            let word_size = word.get_string_size(self);
            if (word_size == s.len())
            {
                if (s.eq_ignore_ascii_case(word.get_string(self)))
                {
                    return Some(word);
                }
            }

            offset += (4 + word_size + 4 * self.dimensions);
        }

        None
    }

    pub fn all_words(&self) -> &[Word]
    {
        &self.words
    }
}

impl<'a> EmbeddingSpace
{
    pub fn get(&'a self, offset : usize) -> &'a [f32]
    {
        let bytes = &self.bytes[offset..offset + 4 * self.dimensions];
        let vector = unsafe { std::slice::from_raw_parts(bytes.as_ptr() as *const f32, self.dimensions) };
        vector
    }
    pub fn find_linear(&'a self, s : &str) -> Option<&'a [f32]>
    {
        self.find_offset_linear(s).map(|x| self.get(x))
    }

    pub fn get_word_from_id(&'a self, id : usize) -> &'a str {
        let mut offset = HEADER_SIZE as usize;

        let mut i = 0;
        loop
        {
            let string_start = offset+4;
            let size_bytes = (&self.bytes[offset..string_start]).try_into().unwrap();
            let string_size = u32::from_le_bytes(size_bytes) as usize;

            if (i == id)
            {
                let string_bytes = &self.bytes[string_start..string_start+string_size];
                let string = unsafe { std::str::from_utf8_unchecked(string_bytes) };
                return string;
            }

            offset += (4 + string_size + 4 * self.dimensions);
            i += 1;
        }
    }

    pub fn get_best_avoiding_others(&'a self, target_word_id : usize, words : &[String]) -> Vec<(&'a str, f32)>
    {
        let target = &words[target_word_id];
        let target_vector = self.find_linear(target).unwrap();

        let mut avoid_vectors = Vec::new();
        for (i, word) in words.iter().enumerate() {
            if (i != target_word_id) {
                let v = self.find_linear(word).unwrap();
                avoid_vectors.push(v);
            }
        }

        let mut all = Vec::with_capacity(self.size);

        let mut offset = HEADER_SIZE as usize;
        for i in 0..self.size
        {
            let string_start = offset+4;
            let size_bytes = (&self.bytes[offset..string_start]).try_into().unwrap();
            let string_size = u32::from_le_bytes(size_bytes) as usize;

            let string_bytes = &self.bytes[string_start..string_start+string_size];
            let string = unsafe { std::str::from_utf8_unchecked(string_bytes) };

            if (string.eq_ignore_ascii_case(&target))
            {
                continue;
            }

            let byte_offset = string_start + string_size;
            let bytes = &self.bytes[byte_offset..byte_offset + 4 * self.dimensions];
            let vector = unsafe { std::slice::from_raw_parts(bytes.as_ptr() as *const f32, self.dimensions) };

            let mut score = 0.;

            score += (avoid_vectors.len() + 3) as f32 * similarity(target_vector, vector);

            for avoid in &avoid_vectors {
                score -= similarity(avoid, vector);
            }

            all.push((string, score));

            offset += (4 + string_size + 4 * self.dimensions);
        }

        all.sort_by(|(_, x), (_, y)| {
            y.partial_cmp(x).unwrap()
        });

        all
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

pub fn similarity(u : &[f32], v : &[f32]) -> f32
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