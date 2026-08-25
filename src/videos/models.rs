use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, sqlx::Type, Serialize, Deserialize)]
#[sqlx(type_name = "video_status", rename_all = "UPPERCASE")]
#[serde(rename_all = "UPPERCASE")]
pub enum VideoStatus {
    Pending,
    Uploaded,
    Processing,
    Ready,
    Failed,
}

// ----------------------------------------------------------------------

#[derive(Debug, Clone, sqlx::FromRow)]
#[allow(dead_code)]
pub struct Video {
    pub id: Uuid,
    pub user_id: Uuid,
    pub title: String,
    pub status: VideoStatus,
    pub storage_key: String,
    pub duration_seconds: Option<i32>,
    pub thumbnail_key: Option<String>,
    pub hls_manifest_key: Option<String>,
    pub error_message: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ----------------------------------------------------------------------

#[derive(Debug, Clone, Deserialize)]
pub struct CreateVideoRequest {
    pub title: String,
}

// ----------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
pub struct CreateVideoResponse {
    pub video_id: Uuid,
    pub upload_url: String,
    pub cloud_name: String,
    pub api_key: String,
    pub timestamp: i64,
    pub signature: String,
    pub public_id: String,
    pub status: VideoStatus,
}

#[derive(Debug, Clone, Serialize)]
pub struct VideoResponse {
	pub id: Uuid,
	pub title: String,
	pub status: VideoStatus,
	pub duration_seconds: Option<i32>,
	pub thumbnail_url: Option<String>,
	pub playback_url: Option<String>,
	pub error_message: Option<String>,
	pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<Video> for VideoResponse {
	fn from(v: Video) -> Self {
		Self {
            id: v.id,
            title: v.title,
            status: v.status,
            duration_seconds: v.duration_seconds,
            thumbnail_url: None,
            playback_url: None,
            error_message: v.error_message,
            created_at: v.created_at,
            updated_at: v.updated_at,
        }
	}
}
