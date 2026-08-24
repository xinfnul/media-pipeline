use std::time::Duration;

use axum::{
    Json, Router,
    http::{HeaderValue, Method, StatusCode},
    routing::{get, post},
};
use serde_json::json;
use tower_http::{
    cors::CorsLayer,
    timeout::TimeoutLayer,
    trace::{DefaultMakeSpan, DefaultOnResponse, TraceLayer},
};
use tracing::Level;

use crate::{auth, config::Config, handlers, state::AppState, users};

pub fn build_router(state: AppState, config: &Config) -> Router {
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
        .route("/register", post(auth::handlers::register))
        .route("/login", post(auth::handlers::login))
        .route("/refresh", post(auth::handlers::refresh))
        .route("/logout", post(auth::handlers::logout));

    let user_routes = Router::new().route("/me", get(users::handlers::me));

    let health_routes = Router::new()
        .route("/live", get(handlers::health::liveness))
        .route("/ready", get(handlers::health::readiness));

    Router::new()
        .nest("/api/auth", auth_routes)
        .nest("/api/users", user_routes)
        .nest("/health", health_routes)
        .fallback(handler_404)
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(DefaultMakeSpan::new().level(Level::INFO))
                .on_request(())
                .on_response(
                    DefaultOnResponse::new()
                        .level(Level::INFO)
                        .latency_unit(tower_http::LatencyUnit::Millis),
                )
                .on_eos(()),
        )
        .layer(TimeoutLayer::with_status_code(
            StatusCode::REQUEST_TIMEOUT,
            Duration::from_secs(10),
        ))
        .layer(cors)
        .with_state(state)
}

async fn handler_404() -> (StatusCode, Json<serde_json::Value>) {
    (
        StatusCode::NOT_FOUND,
        Json(json!({
            "error": {
                "message": "resource not found",
                "status": 404,
            }
        })),
    )
}
