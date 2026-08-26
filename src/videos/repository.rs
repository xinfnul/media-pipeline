use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppResult,
    videos::models::{Video, VideoStatus},
};

/// `id` is generaed by the caller ( not the DB default ) vecause it's also
/// used as the Cloudinary `public_id` / `storage_key` before the row
/// exists.
pub async fn create_video(
    pool: &PgPool,
    id: Uuid,
    user_id: Uuid,
    title: &str,
    storage_key: &str,
) -> AppResult<Video> {
    let video = sqlx::query_as::<_, Video>(
        r#"
		INSERT INTO videos (id, user_id, title, storage_key)
		VALUES ($1, $2, $3, $4)
		RETURNING id, user_id, title, status, storage_key, duration_seconds,
				  thumbnail_key, hls_manifest_key, error_message, created_at, updated_at
		"#,
    )
    .bind(id)
    .bind(user_id)
    .bind(title)
    .bind(storage_key)
    .fetch_one(pool)
    .await?;

    Ok(video)
}

pub async fn find_by_id(pool: &PgPool, id: Uuid) -> AppResult<Option<Video>> {
    let video = sqlx::query_as::<_, Video>(
        r#"
		SELECT id, user_id, title, status, storage_key, duration_seconds,
			   thumbnail_key, hls_manifest_key, error_message, created_at, updated_at
		FROM videos
		WHERE id = $1
		"#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;

    Ok(video)
}

pub async fn find_by_id_for_user(
    pool: &PgPool,
    id: Uuid,
    user_id: Uuid,
) -> AppResult<Option<Video>> {
    let video = sqlx::query_as::<_, Video>(
        r#"
		SELECT id, user_id, title, status, storage_key, duration_seconds,
			   thumbnail_key, hls_manifest_key, error_message, created_at, updated_at
		FROM videos
		WHERE id = $1 AND user_id = $2
		"#,
    )
    .bind(id)
    .bind(user_id)
    .fetch_optional(pool)
    .await?;

    Ok(video)
}

pub async fn list_by_user(pool: &PgPool, user_id: Uuid) -> AppResult<Vec<Video>> {
    let videos = sqlx::query_as::<_, Video>(
        r#"
		SELECT id, user_id, title, status, storage_key, duration_seconds,
			   thumbnail_key, hls_manifest_key, error_message, created_at, updated_at
		FROM videos
		WHERE user_id = $1
		ORDER BY created_at DESC
		"#,
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    Ok(videos)
}

pub async fn mark_uploaded(
    pool: &PgPool,
    id: Uuid,
    duration_seconds: Option<i32>,
) -> AppResult<()> {
    sqlx::query(
        r#"
		UPDATE videos
		SET status = 'UPLOADED', duration_seconds = $2, updated_at = now()
		WHERE id = $1 AND status = 'PENDING'
		"#,
    )
    .bind(id)
    .bind(duration_seconds)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn update_status(
    pool: &PgPool,
    id: Uuid,
    status: VideoStatus,
    error_message: Option<&str>,
) -> AppResult<()> {
    sqlx::query(
        r#"
		UPDATE videos
		SET status = $2, error_message = $3, updated_at = now()
		WHERE id = $1
		"#,
    )
    .bind(id)
    .bind(status)
    .bind(error_message)
    .execute(pool)
    .await?;

    Ok(())
}

/// Called by the worker once ffmpeg finishes
pub async fn mark_ready(
    pool: &PgPool,
    id: Uuid,
    thumbnail_key: &str,
    hls_manifest_key: &str,
) -> AppResult<()> {
    sqlx::query(
        r#"
		UPDATE videos
		SET status = 'READY', thumbnail_key = $2, hls_manifest_key = $3, updated_at = now()
		WHERE id = $1
		"#,
    )
    .bind(id)
    .bind(thumbnail_key)
    .bind(hls_manifest_key)
    .execute(pool)
    .await?;

    Ok(())
}
