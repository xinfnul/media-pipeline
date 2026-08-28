use sqlx::PgPool;
use uuid::Uuid;

use crate::{error::AppResult, users::models::User};

pub async fn create_user(pool: &PgPool, email: &str, password_hash: &str) -> AppResult<User> {
    let user = sqlx::query_as::<_, User>(
        r#"
		INSERT INTO users (email, password_hash)
		VALUES ($1, $2)
		RETURNING id, email, password_hash, is_verified, failed_login_attempts,
		          locked_until, created_at, updated_at
		"#,
    )
    .bind(email.to_lowercase())
    .bind(password_hash)
    .fetch_one(pool)
    .await?;

    Ok(user)
}

pub async fn find_user_by_email(pool: &PgPool, email: &str) -> AppResult<Option<User>> {
    let user = sqlx::query_as::<_, User>(
        r#"
		SELECT id, email, password_hash, is_verified, failed_login_attempts,
		           locked_until, created_at, updated_at
		FROM users
		WHERE email = $1
		"#,
    )
    .bind(email.to_lowercase())
    .fetch_optional(pool)
    .await?;

    Ok(user)
}

pub async fn find_user_by_id(pool: &PgPool, id: Uuid) -> AppResult<Option<User>> {
    let user = sqlx::query_as::<_, User>(
        r#"
		SELECT id, email, password_hash, is_verified, failed_login_attempts,
		       locked_until, created_at, updated_at
		FROM users
		WHERE id = $1
		"#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;

    Ok(user)
}
