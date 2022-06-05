use std::io::prelude::*;
use std::fs::File;
use memmap::Mmap;

const MAGIC:[u8;4] = [0x11, 0x22, 0x33, 0x44];
const HEADER_SIZE : u64 = 20;

struct EmbeddingSpace {
}

struct Embedding {
    word : String,
    pos : Vec<f32>,
}

struct TextEmbeddingSpace {
    embeddings : Vec<Embedding>,
}

impl TextEmbeddingSpace {
    pub fn parse_from_text(input_path : &str) -> Self {

        let mut embeddings = Vec::new();

        let f = File::open(input_path).unwrap();
        let mut reader = std::io::BufReader::new(f);

        let mut line = String::new();
        let mut i = 0;
        while let Ok(size) = reader.read_line(&mut line)
        {
            i+= 1;
            let mut splits = line.split_ascii_whitespace();

            if let Some(word) = splits.next()
            {
                if (i % 10000 == 0)
                {
                    println!("{} {}", i, word);
                }
                //println!("Word ={}=", word);

                let mut vec = Vec::new();

                while let Some(x_s) = splits.next()
                {
                    //println!("parse {}", x_s);
                    //if x_s != "."
                    {
                        let x = x_s.parse::<f32>().unwrap();
                        vec.push(x);
                    }
                }

                let embedding = Embedding {
                    word : word.to_owned(),
                    pos : vec,
                };

                embeddings.push(embedding);

                line.clear();
            }
            else
            {
                break;
            }
        }

        TextEmbeddingSpace {
            embeddings,
        }
    }

    pub fn write_binary_to(&self, path : &str) {
        let out_file = File::create(path).unwrap();
        let mut buf_writer = std::io::BufWriter::new(out_file);

        println!("Writing headers..");
        buf_writer.write(&MAGIC).unwrap();
        buf_writer.write(&self.embeddings.len().to_le_bytes()).unwrap();
        buf_writer.write(&self.embeddings[0].pos.len().to_le_bytes()).unwrap();
        println!("Done");

        for (i, embedding) in self.embeddings.iter().enumerate()
        {
            if (i % 10000 == 0)
            {
                println!("{} {}", i, embedding.word);
            }
            buf_writer.write(&(embedding.word.len() as u32).to_le_bytes()).unwrap();
            buf_writer.write(&embedding.word.as_bytes()).unwrap();

            unsafe {
                let vec_as_bytes = std::slice::from_raw_parts(embedding.pos.as_ptr() as *const u8, embedding.pos.len() * 4);
                buf_writer.write(vec_as_bytes).unwrap();
            }
        }
    }
}

fn transform_and_write(input_path : &str, output_path : &str) {
    let embeddings = TextEmbeddingSpace::parse_from_text(input_path);
    println!("Done reading!");

    println!("Writing..");
    embeddings.write_binary_to(output_path);
}

struct MemmappedSpace
{
    file : File,
    mmap : Mmap,
    size : usize,
    dimensions : usize,
}

impl MemmappedSpace
{
    pub fn load(path : &str) -> Self
    {
        let file = File::open(path).unwrap();
        let mmap = unsafe { memmap::MmapOptions::new().map(&file).unwrap() };

        assert_eq!(MAGIC, mmap[0..4]);
        let size = u64::from_le_bytes(mmap[4..12].try_into().unwrap()) as usize;
        let dimensions = u64::from_le_bytes(mmap[12..20].try_into().unwrap()) as usize;
        Self {
            file, mmap, size, dimensions
        }
    }

    pub fn find_offset_linear(&self, s : &str) -> Option<usize>
    {
        let mut offset = HEADER_SIZE as usize;
        for i in 0..self.size
        {
            let string_start = offset+4;
            let size_bytes = self.mmap[offset..string_start].try_into().unwrap();
            let string_size = u32::from_le_bytes(size_bytes) as usize;

            if (s.len() == string_size)
            {
                let string_bytes = &self.mmap[string_start..string_start+string_size];
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

impl<'a> MemmappedSpace
{
    pub fn get(&'a self, offset : usize) -> &'a [f32]
    {
        let bytes = &self.mmap[offset..offset + 4 * self.dimensions];
        let vector = unsafe { std::slice::from_raw_parts(bytes.as_ptr() as *const f32, self.dimensions) };
        vector
    }
    pub fn find_linear(&'a self, s : &str) -> Option<&'a [f32]>
    {
        self.find_offset_linear(s).map(|x| self.get(x))
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

fn load_wordlist(input_path : &str) -> Vec<String>
{
    let f = File::open(input_path).unwrap();
    let mut reader = std::io::BufReader::new(f);

    let mut line = String::new();
    let mut words = Vec::new();
    while let Ok(size) = reader.read_line(&mut line)
    {
        if (size == 0)
        {
            break;
        }
        words.push(line.trim().to_lowercase());
        line.clear();
    }

    words
}

fn get_best(space : &MemmappedSpace, target : &str, words : &[(String, usize)]) -> Vec<(String, usize, f32)>
{
    let t_offset = space.find_offset_linear(target).unwrap();
    let t_vect = space.get(t_offset);

    let mut all = Vec::new();

    for (word, woffset) in words {
        if (t_offset == *woffset) {
            continue;
        }

        let sim = similarity(space.get(*woffset), t_vect);
        all.push((word.clone(), *woffset, sim));
    }

    all.sort_by(|(_, _, x), (_, _, y)| {
        y.partial_cmp(x).unwrap()
    });

    all
}

fn main() {
    let glove_25_path = r"C:\Users\Dan\glove\glove.twitter.27B.25d.txt";
    let glove_200_path = r"C:\Users\Dan\glove\glove.twitter.27B.200d.txt";
    let glove_25_bin_path = r"C:\Users\Dan\vecrypto\glove_25.embspace";
    let glove_200_bin_path = r"C:\Users\Dan\vecrypto\glove_200.embspace";
    let wordlist_path = r"C:\Users\Dan\vecrypto\wordlist.txt";
    //let glove_25_path = r"C:\Users\Dan\glove\glove.twitter.27B.25d.txt";
    //transform_and_write(glove_200_path, glove_200_bin_path);

    let space = MemmappedSpace::load(glove_200_bin_path);
    let words = load_wordlist(wordlist_path);

    let mut offsets = Vec::new();
    for word in &words {
        //println!("Finding {}", word);
        if let Some(offset) = space.find_offset_linear(word)
        {
            //println!("Adding {} {}", word, offset);
            offsets.push((word.to_owned(), offset));
        }
    }

    let i = 131;
    let (word, offset) = &offsets[i];
    let vec = space.get(*offset);
    let vec_norm = norm(vec);

    println!("Target word '{}' offset {}", word, offset);

    let closest : Vec<_> = get_best(&space, word, &offsets).into_iter().take(5).collect();

    for (a, b, c) in &closest {
        println!("{} {} {}", a, b, c);
    }

    loop {
        let mut buffer = String::new();
        std::io::stdin().read_line(&mut buffer).unwrap();
        let input_word = buffer.trim().to_lowercase();
        let input_vec = space.find_linear(&input_word).unwrap();
        let input_vec_norm = norm(input_vec);
        let sim = dot(&vec_norm, &input_vec_norm);

        println!("{} similarity {}", input_word, sim);
    }

    //let hot = space.find_linear("hot").unwrap();
    //let hot_unit = norm(hot);
    //let cold = space.find_linear("train").unwrap();
    //let cold_unit = norm(cold);

    //let sim = dot(&hot_unit, &cold_unit);

    //println!("hot cold similarity - {}", sim);

}