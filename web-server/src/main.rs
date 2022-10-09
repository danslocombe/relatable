use serde::{Serialize, Deserialize};
use warp::{
    reply::{Response},
    Filter,
};

use clap::Parser;
use std::io::Write;

use core::telemetry::{self};
use std::fs::OpenOptions;

#[derive(Parser, Debug)]
#[clap(author, version, about, long_about = None)]

/// Web server
struct WebArgs {
    #[clap(short, long, value_parser)]
    db : String,

    #[clap(short, long, value_parser)]
    serve_dir : String,
}

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let args = WebArgs::parse();
    let site = warp::fs::dir(args.serve_dir).boxed();

    let post_telemetry = warp::path!("telemetry")
        .and(warp::post())
        .and(warp::body::json())
        .and("feedback.telemetry")
        .and_then(telemetry_handler);

    let routes = site.or(post_telemetry);

    let serve_from = ([0, 0, 0, 0], 8080);
    println!("Serving from {:?}", serve_from);

    warp::serve(routes).run(serve_from).await;
}


#[derive(Debug, Serialize, Deserialize)]
struct TelemetryDataWithFeedback {
    game_telemetry : telemetry::TelemetryData,
    rating : f32,
    player_name : String,
    player_feedback : String,
}

async fn telemetry_handler(path : &str, post_data : TelemetryDataWithFeedback) -> Result<Response, std::convert::Infallible> {
    let mut file = OpenOptions::new().read(true).append(true).create(true).open(path).unwrap();
    let json = serde_json::to_string(&post_data).unwrap();
    write!(&mut file, "\n{}\n", json).unwrap();
    Ok(Default::default())
}
