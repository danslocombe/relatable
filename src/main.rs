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

}

impl<'a> MemmappedSpace
{
    pub fn find_linear(&'a self, s : &str) -> Option<&'a [f32]>
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
                    // Found!
                    let bytes_start = string_start + string_size;
                    let bytes = &self.mmap[bytes_start..bytes_start + 4 * self.dimensions];
                    let vector = unsafe { std::slice::from_raw_parts(bytes.as_ptr() as *const f32, self.dimensions) };
                    return Some(vector);
                }
            }

            offset += (4 + string_size + 4 * self.dimensions);

        }

        return None;
    }
}

fn norm(v: &[f32]) -> Vec<f32>
{
    let mut mag2 = 0.;
    for &x in v
    {
        mag2 += x as f64 * x as f64;
    }

    let mag = mag2.sqrt();

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

fn main() {
    //let glove_25_path = r"C:\Users\Dan\glove\glove.twitter.27B.25d.txt";
    //transform_and_write(glove_25_path, r"C:\Users\Dan\vecrypto\glove_25.embspace");


    let glove_25_bin_path = r"C:\Users\Dan\vecrypto\glove_25.embspace";
    let space = MemmappedSpace::load(glove_25_bin_path);

    let hot = space.find_linear("hot").unwrap();
    let hot_unit = norm(hot);
    let cold = space.find_linear("cold").unwrap();
    let cold_unit = norm(cold);

    let sim = dot(&hot_unit, &cold_unit);

    println!("hot cold similarity - {}", sim);
}