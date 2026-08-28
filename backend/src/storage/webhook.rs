use axum::{
    body::Bytes,
    extract::State,
    http::{HeaderMap, StatusCode},
};
use serde::Deserialize;
use sha1::{Digest, Sha1};
use uuid::Uuid;

use crate::{
    error::{AppError, AppResult},
    state::AppState,
    videos,
};

#[derive(Debug, Deserialize)]
struct CloudinaryNotification {
    public_id: String,
    notification_type: String,
    duration: Option<f64>,
}

pub async fn cloudinary_webhook(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> AppResult<StatusCode> {
    let timestamp = headers
        .get("X-Cld-Timestamp")
        .and_then(|t| t.to_str().ok())
        .ok_or(AppError::Unauthorized)?;

    let received_signature = headers
        .get("X-Cld-Signature")
        .and_then(|s| s.to_str().ok())
        .ok_or(AppError::Unauthorized)?;

    let expected_signature =
        compute_signature(&body, timestamp, &state.config.cloudinary_api_secret);

    if expected_signature != received_signature {
        tracing::warn!("cloudinary webhook: signature mismatch, rejecting");
        return Err(AppError::Unauthorized);
    }

    let payload: CloudinaryNotification = serde_json::from_slice(&body)
        .map_err(|_| AppError::Validation("invalid webhook payload".to_string()))?;

    match payload.notification_type.as_str() {
        "upload" => {
            let video_id = Uuid::parse_str(&payload.public_id).map_err(|_| {
                AppError::Validation("public_id is not a valid video id".to_string())
            })?;

            videos::repository::mark_uploaded(
                &state.db,
                video_id,
                payload.duration.map(|d| d as i32),
            )
            .await?;

            tracing::info!(video_id = %video_id, "video marked UPLOADED via webhook");
        }
        "eager" => {
            let video_id = Uuid::parse_str(&payload.public_id).map_err(|_| {
                AppError::Validation("public_id is not a valid video id".to_string())
            })?;

            videos::repository::mark_ready(
                &state.db,
                video_id,
                &payload.public_id,
                &payload.public_id,
            )
            .await?;

            tracing::info!(video_id = %video_id, "video marked READY via eager webhook");
        }
        other => {
            tracing::info!(
                notification_type = other,
                "cloudinary webhook: ignoring notification type"
            );
        }
    }

    Ok(StatusCode::OK)
}

fn compute_signature(body: &[u8], timestamp: &str, api_secret: &str) -> String {
    let mut hasher = Sha1::new();
    hasher.update(body);
    hasher.update(timestamp.as_bytes());
    hasher.update(api_secret.as_bytes());

    hex::encode(hasher.finalize())
}
