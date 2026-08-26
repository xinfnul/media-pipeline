mod app;
mod auth;
mod config;
mod error;
mod handlers;
mod middleware;
mod state;
mod storage;
mod users;
mod videos;

use std::{net::SocketAddr, time::Duration};

use sqlx::postgres::PgPoolOptions;

use crate::{app::build_router, config::Config, state::AppState};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    rustls::crypto::aws_lc_rs::default_provider()
        .install_default()
        .expect("failed to install default CryptoProvider");

    let _ = dotenvy::dotenv();

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,tower_http=debug,sqlx=warn".into()),
        )
        .init();

    let config = Config::from_env();

    tracing::info!(env = %config.env, "starting media-pipeline backend");

    let db = PgPoolOptions::new()
        .max_connections(20)
        .acquire_timeout(Duration::from_secs(5))
        .connect(&config.database_url)
        .await?;

    tracing::info!("running database migrations");
    sqlx::migrate!("./migrations").run(&db).await?;

    let state = AppState::new(db, config.clone());

    let app = build_router(state, &config);

    let addr: SocketAddr = config.server_addr.parse()?;
    tracing::info!(%addr, "listening");

    let listener = tokio::net::TcpListener::bind(addr).await?;

    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown_signal())
    .await?;

    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install SIGTERM handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
    _ = ctrl_c => {},
     _ = terminate => {},
    }

    tracing::info!("shutdown signal received, starting graceful shutdown!");
}
