mod auth;
mod config;
mod error;
mod handlers;
mod middleware;
mod models;
mod repository;
mod state;

use std::{net::SocketAddr, time::Duration};

use axum::{
    Router,
    http::{HeaderValue, Method},
    routing::{get, post},
};
use sqlx::postgres::PgPoolOptions;
use tower_http::{cors::CorsLayer, timeout::TimeoutLayer, trace::TraceLayer};

use crate::{config::Config, state::AppState};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
	rustls::crypto::aws_lc_rs::default_provider()
        .install_default()
        .expect("failed to install default CryptoProvider");
	
    let _ = dotenvy::dotenv();

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,sqlx=warn".into()),
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
    .await?;

    Ok(())
}

fn build_router(state: AppState, config: &Config) -> Router {
    let cors = if config.is_production() {
        CorsLayer::new()
            .allow_origin(
                config
                    .cors_origin
                    .parse::<HeaderValue>()
                    .expect("CORS_ORIGIN must be a valid header value"),
            )
            .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
            .allow_headers(tower_http::cors::Any)
            .allow_credentials(false)
    } else {
        CorsLayer::permissive()
    };

    let auth_routes = Router::new()
        .route("/register", post(handlers::auth::register))
        .route("/login", post(handlers::auth::login))
        .route("/refresh", post(handlers::auth::refresh))
        .route("/logout", post(handlers::auth::logout));

    let user_routes = Router::new().route("/me", get(handlers::users::me));

    let health_routes = Router::new()
        .route("/live", get(handlers::health::liveness))
        .route("/ready", get(handlers::health::readiness));

    Router::new()
        .nest("/api/auth", auth_routes)
        .nest("/api/users", user_routes)
        .nest("/health", health_routes)
        .layer(TraceLayer::new_for_http())
        .layer(TimeoutLayer::with_status_code(
            axum::http::StatusCode::REQUEST_TIMEOUT,
            Duration::from_secs(10),
        ))
        .layer(cors)
        .with_state(state)
}
