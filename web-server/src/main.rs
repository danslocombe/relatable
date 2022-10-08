use serde::{Deserialize};
use serde_derive::{Deserialize};
use warp::{
    reply::{Response},
    Filter,
};

use clap::Parser;

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
        .and_then(telemetry_handler);

    let routes = site.or(post_telemetry);

    let serve_from = ([0, 0, 0, 0], 8080);
    println!("Serving from {:?}", serve_from);

    warp::serve(routes).run(serve_from).await;
}

#[derive(Deserialize)]
struct TelemetryData {
}

async fn telemetry_handler(post_data : TelemetryData) -> Result<Response, std::convert::Infallible> {
    Ok(Default::default())
}
