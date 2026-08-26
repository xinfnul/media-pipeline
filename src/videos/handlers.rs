use axum::{
    Json,
    extract::{Path, State},
};
use uuid::Uuid;
use validator::Validate;

use crate::{
    error::{AppError, AppResult},
    middleware::auth::CurrentUser,
    state::AppState,
    storage::client::CloudinaryClient,
    videos::{
        models::{CreateVideoRequest, CreateVideoResponse, Video, VideoResponse},
        repository,
    },
};

pub async fn create_video(
    State(state): State<AppState>,
    current_user: CurrentUser,
    Json(payload): Json<CreateVideoRequest>,
) -> AppResult<Json<CreateVideoResponse>> {
    payload
        .validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let video_id = Uuid::new_v4();
    let public_id = video_id.to_string();

    let video = repository::create_video(
        &state.db,
        video_id,
        current_user.user_id,
        &payload.title,
        &public_id,
    )
    .await?;

    let cloudinary = CloudinaryClient::from_config(&state.config);
    let signed = cloudinary.build_signed_upload(&public_id);

    Ok(Json(CreateVideoResponse {
        video_id: video.id,
        upload_url: signed.upload_url,
        cloud_name: signed.cloud_name,
        api_key: signed.api_key,
        timestamp: signed.timestamp,
        signature: signed.signature,
        public_id: signed.public_id,
        status: video.status,
        eager: signed.eager,
        eager_async: signed.eager_async,
        notification_url: signed.notification_url,
    }))
}

pub async fn get_video(
    State(state): State<AppState>,
    current_user: CurrentUser,
    Path(id): Path<Uuid>,
) -> AppResult<Json<VideoResponse>> {
    let video = repository::find_by_id_for_user(&state.db, id, current_user.user_id)
        .await?
        .ok_or(AppError::NotFound)?;

    Ok(Json(resolve_response(&state, video)))
}

pub async fn list_videos(
    State(state): State<AppState>,
    current_user: CurrentUser,
) -> AppResult<Json<Vec<VideoResponse>>> {
    let videos = repository::list_by_user(&state.db, current_user.user_id).await?;

    let response = videos
        .into_iter()
        .map(|v| resolve_response(&state, v))
        .collect();

    Ok(Json(response))
}

// -------------------------------------------------------------

fn resolve_response(state: &AppState, video: Video) -> VideoResponse {
    let cloudinary = CloudinaryClient::from_config(&state.config);

    let thumbnail_url = video
        .thumbnail_key
        .as_deref()
        .map(|key| cloudinary.thumbnail_url(key));

    let playback_url = video
        .hls_manifest_key
        .as_deref()
        .map(|key| cloudinary.hls_playback_url(key));

    VideoResponse {
        id: video.id,
        title: video.title,
        status: video.status,
        duration_seconds: video.duration_seconds,
        thumbnail_url,
        playback_url,
        error_message: video.error_message,
        created_at: video.created_at,
        updated_at: video.updated_at,
    }
}
