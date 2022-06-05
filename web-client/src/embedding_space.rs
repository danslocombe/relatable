const MAGIC:[u8;4] = [0x11, 0x22, 0x33, 0x44];
const HEADER_SIZE : u64 = 20;

pub struct EmbeddingSpace
{
    bytes : Vec<u8>,
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
        Self {
            bytes, size, dimensions
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
    
    pub fn get_best(&self, target : &str, candidates : &[(String, usize)]) -> Vec<(String, usize, f32)>
    {
        let t_offset = self.find_offset_linear(target).unwrap();
        let t_vect = self.get(t_offset);

        let mut all = Vec::new();

        for (word, woffset) in candidates {
            if (t_offset == *woffset) {
                continue;
            }

            let sim = similarity(self.get(*woffset), t_vect);
            all.push((word.clone(), *woffset, sim));
        }

        all.sort_by(|(_, _, x), (_, _, y)| {
            y.partial_cmp(x).unwrap()
        });

        all
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