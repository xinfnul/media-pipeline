use axum::{Json, extract::State};
use serde_json::{Value, json};

use crate::state::AppState;

pub async fn liveness() -> Json<Value> {
    Json(json!({"status": "ok"}))
}

pub async fn readiness(State(state): State<AppState>) -> (axum::http::StatusCode, Json<Value>) {
    match sqlx::query("SELECT 1").execute(&state.db).await {
        Ok(_) => (axum::http::StatusCode::OK, Json(json!({"status": "ok"}))),
        Err(e) => {
            tracing::error!(error = %e, "readiness check failed");
            (
                axum::http::StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({"status": "unavailable"})),
            )
        }
    }
}
