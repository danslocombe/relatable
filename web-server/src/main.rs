use std::fs::OpenOptions;
use std::io::Write;

use core::embedding_space::EmbeddingSpace;
use core::telemetry::{self};

use clap::Parser;
use once_cell::sync::OnceCell;
use serde::{Deserialize, Serialize};
use warp::reply::Reply;
use warp::{reply::Response, Filter};

#[derive(Parser, Debug)]
#[clap(author, version, about, long_about = None)]

/// Web server
struct WebArgs {
    //#[clap(short, long, value_parser)]
    //db: String,
    #[clap(short, long, value_parser)]
    serve_dir: String,
}

static SPACE: once_cell::sync::OnceCell<EmbeddingSpace> = OnceCell::new();

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let args = WebArgs::parse();
    let site = warp::fs::dir(args.serve_dir).boxed();

    let space_path = "fasttext_filtered.embspace";
    println!("Loading embedding space from {}", space_path);
    let space_bytes = std::fs::read(space_path).unwrap();
    SPACE
        .set(core::embedding_space::EmbeddingSpace::load(space_bytes))
        .unwrap();

    let generate_game = warp::path!("game")
        .and(warp::get())
        .and(warp::any().map(|| SPACE.get().unwrap()))
        .and(warp::query::<_>())
        .and_then(game_handler);

    let post_telemetry = warp::path!("telemetry")
        .and(warp::post())
        .and(warp::any().map(move || "feedback.db"))
        .and(warp::body::json())
        .and_then(telemetry_handler);

    let routes = site.or(post_telemetry).or(generate_game);

    let serve_from = ([0, 0, 0, 0], 8080);
    println!("Serving from {:?}", serve_from);

    warp::serve(routes).run(serve_from).await;
}

#[derive(Debug, Deserialize)]
struct GenerateGameArgs {
    seed: String,
}

async fn game_handler(
    space: &core::embedding_space::EmbeddingSpace,
    args: GenerateGameArgs,
) -> Result<Response, std::convert::Infallible> {
    let game = core::complete_game::CompleteGame::new(&args.seed, space, 8, Default::default());
    Ok(warp::reply::json(&game).into_response())
}

#[derive(Debug, Serialize, Deserialize)]
struct TelemetryDataWithFeedback {
    game_telemetry: telemetry::TelemetryData,
    fun: f32,
    difficulty: f32,
    player_name: String,
    player_feedback: String,
}

async fn telemetry_handler(
    path: &str,
    post_data: TelemetryDataWithFeedback,
) -> Result<Response, std::convert::Infallible> {
    println!("Got telemetry!");
    let mut file = OpenOptions::new()
        .read(true)
        .append(true)
        .create(true)
        .open(path)
        .unwrap();
    let json = serde_json::to_string(&post_data).unwrap();
    println!("Writing {}", json);
    write!(&mut file, "\n{}\n", json).unwrap();
    Ok(Default::default())
}
