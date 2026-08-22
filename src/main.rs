mod config;
mod error;
mod models;
mod state;

use std::{net::SocketAddr, time::Instant};

use axum::{Json, Router, extract::State, routing::get};
use serde::Serialize;

use crate::config::Config;

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
    let _ = dotenvy::dotenv();

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,sqlx=warn".into()),
        )
        .init();

    let config = Config::from_env();

    tracing::info!(env = %config.env, "starting media-pipeline backend");

    let state = AppState {
        started_at: Instant::now(),
    };

    let app = Router::new().route("/", get(root)).with_state(state);

    let addr: SocketAddr = config.server_addr.parse()?;
    tracing::info!(%addr, "listening");

    let listener = tokio::net::TcpListener::bind(addr).await?;

    axum::serve(listener, app).await?;

    Ok(())
}

async fn root(State(state): State<AppState>) -> Json<RootResponse> {
    Json(RootResponse {
        status: "OK".to_string(),
        uptime_seconds: state.started_at.elapsed().as_secs(),
    })
}
