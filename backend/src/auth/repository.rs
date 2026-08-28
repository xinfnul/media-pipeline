use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{auth::models::RefreshToken, error::AppResult};

pub async fn register_failed_login(
    pool: &PgPool,
    user_id: Uuid,
    max_attempts: i32,
    lock_minutes: i64,
) -> AppResult<()> {
    sqlx::query(
        r#"
		UPDATE users
		SET failed_login_attempts = failed_login_attempts + 1,
			locked_until = CASE
				WHEN failed_login_attempts + 1 >= $2
				THEN now() + ($3 || ' minutes')::interval
				ELSE locked_until
			END,
			updated_at = now()
		WHERE id = $1
		"#,
    )
    .bind(user_id)
    .bind(max_attempts)
    .bind(lock_minutes.to_string())
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn reset_failed_logins(pool: &PgPool, user_id: Uuid) -> AppResult<()> {
    sqlx::query(
        r#"
		UPDATE users
		SET failed_login_attempts = 0, locked_until = NULL, updated_at = now()
		WHERE id = $1
		"#,
    )
    .bind(user_id)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn store_refresh_token(
    pool: &PgPool,
    user_id: Uuid,
    token_hash: &str,
    expires_at: DateTime<Utc>,
    user_agent: Option<&str>,
    ip_address: Option<&str>,
) -> AppResult<RefreshToken> {
    let token = sqlx::query_as::<_, RefreshToken>(
        r#"
		INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, user_id, token_hash, expires_at, revoked_at, replaced_by,
				  created_at, user_agent, ip_address
		"#,
    )
    .bind(user_id)
    .bind(token_hash)
    .bind(expires_at)
    .bind(user_agent)
    .bind(ip_address)
    .fetch_one(pool)
    .await?;

    Ok(token)
}

pub async fn find_refresh_token_by_hash(
    pool: &PgPool,
    token_hash: &str,
) -> AppResult<Option<RefreshToken>> {
    let token = sqlx::query_as::<_, RefreshToken>(
        r#"
		SELECT id, user_id, token_hash, expires_at, revoked_at, replaced_by,
				  created_at, user_agent, ip_address
		FROM refresh_tokens
		WHERE token_hash = $1
		"#,
    )
    .bind(token_hash)
    .fetch_optional(pool)
    .await?;

    Ok(token)
}

/// Mark a refresh token as revoked, pointing to whatever token replaced it.
/// `replaced_by = NULL` means it was revoked ottright
/// ( logout, or reuse-detected ).
pub async fn revoke_refresh_token(
    pool: &PgPool,
    token_id: Uuid,
    replaced_by: Option<Uuid>,
) -> AppResult<()> {
    sqlx::query(
        r#"
        UPDATE refresh_tokens
        SET revoked_at = now(), replaced_by = $2
        WHERE id = $1
        "#,
    )
    .bind(token_id)
    .bind(replaced_by)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn revoke_all_user_tokens(pool: &PgPool, user_id: Uuid) -> AppResult<()> {
    sqlx::query(
        r#"
		UPDATE refresh_tokens
		SET revoked_at = now()
		WHERE user.id = $1 AND revoked_at IS null
		"#,
    )
    .bind(user_id)
    .execute(pool)
    .await?;

    Ok(())
}
