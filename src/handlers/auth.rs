use axum::{Json, extract::State, http::StatusCode};
use axum_extra::{TypedHeader, headers::UserAgent};
use chrono::Utc;
use validator::Validate;

use crate::{
    auth::{
        jwt::create_access_token,
        password::{hash_password, verify_password},
        refresh::{generate_refresh_token, hash_refresh_token},
    },
    error::{AppError, AppResult},
    models::{
        AuthResponse, LoginRequest, MessageResponse, RefreshRequest, RegisterRequest, UserResponse,
    },
    repository,
    state::AppState,
};

const MAX_FAILED_ATTEMPTS: i32 = 5;
const LOCK_MINUTES: i64 = 15;

fn validation_error<E: std::fmt::Display>(e: E) -> AppError {
    AppError::Validation(e.to_string())
}

async fn issue_token_pair(
    state: &AppState,
    user_id: uuid::Uuid,
    user_agent: Option<&str>,
    ip_address: Option<&str>,
) -> AppResult<(String, String)> {
    let access_token = create_access_token(
        user_id,
        &state.config.jwt_access_secret,
        state.config.access_token_ttl_seconds,
    )?;

    let refresh_token = generate_refresh_token();
    let refresh_hash = hash_refresh_token(&refresh_token);
    let expires_at = Utc::now() + chrono::Duration::seconds(state.config.refresh_token_ttl_seconds);

    repository::store_refresh_token(
        &state.db,
        user_id,
        &refresh_hash,
        expires_at,
        user_agent,
        ip_address,
    )
    .await?;

    Ok((access_token, refresh_token))
}

// -------------------------------------------------------------------------

pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<RegisterRequest>,
) -> AppResult<(StatusCode, Json<AuthResponse>)> {
    payload.validate().map_err(validation_error)?;

    if repository::find_user_by_email(&state.db, &payload.email)
        .await?
        .is_some()
    {
        return Err(AppError::EmailTaken);
    }

    let password_hash = hash_password(&payload.password)?;
    let user = repository::create_user(&state.db, &payload.email, &password_hash).await?;

    let (access_token, refresh_token) = issue_token_pair(&state, user.id, None, None).await?;

    let response = AuthResponse {
        access_token,
        refresh_token,
        token_type: "Bearer",
        expires_in: state.config.access_token_ttl_seconds,
        user: UserResponse::from(user),
    };

    Ok((StatusCode::CREATED, Json(response)))
}

pub async fn login(
    State(state): State<AppState>,
    user_agent: Option<TypedHeader<UserAgent>>,
    Json(payload): Json<LoginRequest>,
) -> AppResult<Json<AuthResponse>> {
    payload.validate().map_err(validation_error)?;

    let user = repository::find_user_by_email(&state.db, &payload.email)
        .await?
        .ok_or(AppError::InvalidCredentials)?;

    if let Some(locked_until) = user.locked_until {
        if locked_until > Utc::now() {
            return Err(AppError::AccountLocked);
        }
    }

    let password_ok = verify_password(&payload.password, &user.password_hash)?;
    if !password_ok {
        repository::register_failed_login(&state.db, user.id, MAX_FAILED_ATTEMPTS, LOCK_MINUTES)
            .await?;
        return Err(AppError::InvalidCredentials);
    }

    repository::reset_failed_logins(&state.db, user.id).await?;

    let ua_str = user_agent.as_ref().map(|TypedHeader(ua)| ua.as_str());
    let (access_token, refresh_token) = issue_token_pair(&state, user.id, ua_str, None).await?;

    let response = AuthResponse {
        access_token,
        refresh_token,
        token_type: "Bearer",
        expires_in: state.config.access_token_ttl_seconds,
        user: UserResponse::from(user),
    };

    Ok(Json(response))
}

pub async fn refresh(
    State(state): State<AppState>,
    Json(payload): Json<RefreshRequest>,
) -> AppResult<Json<AuthResponse>> {
    let token_hash = hash_refresh_token(&payload.refresh_token);

    let stored = repository::find_refresh_token_by_hash(&state.db, &token_hash)
        .await?
        .ok_or(AppError::Unauthorized)?;

    if stored.revoked_at.is_some() {
        tracing::warn!(user_id = %stored.user_id, "refresh token reuse detected; revoking all sessions");
        repository::revoke_all_user_tokens(&state.db, stored.user_id).await?;
        return Err(AppError::Unauthorized);
    }

    if stored.expires_at < Utc::now() {
        return Err(AppError::Unauthorized);
    }

    let user = repository::find_user_by_id(&state.db, stored.user_id)
        .await?
        .ok_or(AppError::Unauthorized)?;

    let access_token = create_access_token(
        user.id,
        &state.config.jwt_access_secret,
        state.config.access_token_ttl_seconds,
    )?;

    let new_refresh_token = generate_refresh_token();
    let new_hash = hash_refresh_token(&new_refresh_token);
    let expires_at = Utc::now() + chrono::Duration::seconds(state.config.refresh_token_ttl_seconds);

    let new_record = repository::store_refresh_token(
        &state.db,
        user.id,
        &new_hash,
        expires_at,
        stored.user_agent.as_deref(),
        stored.ip_address.as_deref(),
    )
    .await?;

    repository::revoke_refresh_token(&state.db, stored.id, Some(new_record.id)).await?;

    let response = AuthResponse {
        access_token,
        refresh_token: new_refresh_token,
        token_type: "Bearer",
        expires_in: state.config.access_token_ttl_seconds,
        user: UserResponse::from(user),
    };

    Ok(Json(response))
}

pub async fn logout(
    State(state): State<AppState>,
    Json(payload): Json<RefreshRequest>,
) -> AppResult<Json<MessageResponse>> {
    let token_hash = hash_refresh_token(&payload.refresh_token);

    if let Some(stored) = repository::find_refresh_token_by_hash(&state.db, &token_hash).await? {
        if stored.revoked_at.is_none() {
            repository::revoke_refresh_token(&state.db, stored.id, None).await?;
        }
    }

    Ok(Json(MessageResponse {
        message: "logged out".to_string(),
    }))
}
