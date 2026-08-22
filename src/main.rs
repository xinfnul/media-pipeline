use std::time::Instant;

use axum::{Json, Router, extract::State, routing::get};
use serde::Serialize;

#[derive(Clone)]
struct AppState {
    started_at: Instant,
}

#[derive(Debug, Serialize)]
struct RootResponse {
    status: String,
    uptime_seconds: u64,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    let bind_addr = std::env::var("BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:3000".to_string());

    let state = AppState {
        started_at: Instant::now(),
    };

    let app = Router::new().route("/", get(root)).with_state(state);

    let listener = tokio::net::TcpListener::bind(&bind_addr).await?;

    println!(
        "Server running on :{}",
        bind_addr.rsplit(':').next().unwrap_or(&bind_addr)
    );

    axum::serve(listener, app).await?;

    Ok(())
}

async fn root(State(state): State<AppState>) -> Json<RootResponse> {
    Json(RootResponse {
        status: "OK".to_string(),
        uptime_seconds: state.started_at.elapsed().as_secs(),
    })
}
