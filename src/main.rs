use std::io::prelude::*;
use std::fs::File;

const HEADER:[u8;4] = [0x11, 0x22, 0x33, 0x44];

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
        buf_writer.write(&HEADER).unwrap();
        buf_writer.write(&self.embeddings.len().to_le_bytes()).unwrap();
        buf_writer.write(&self.embeddings[0].pos.len().to_le_bytes()).unwrap();
        println!("Done");
        buf_writer.write(&HEADER).unwrap();
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

fn main() {
    let glove_25_path = r"C:\Users\Dan\glove\glove.twitter.27B.25d.txt";
    transform_and_write(glove_25_path, r"C:\Users\Dan\vecrypto\glove_25.embspace");

    //let f = File::open(glove_25_path).unwrap();
    //let reader = std::io::BufReader::new(f);

    //let mut out_file = File::create(glove_25_path_out).unwrap();
    //let mut buf_writer = std::io::BufWriter::new(out_file);

    //std::io::copy(&mut decompressor, &mut buf_writer).unwrap();
}