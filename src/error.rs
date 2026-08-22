use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde_json::json;

#[derive(thiserror::Error, Debug)]
pub enum AppError {
    #[error("validation error: {0}")]
    Validation(String),

    #[error("invalid credentials")]
    InvalidCredentials,

    #[error("account locked")]
    AccountLocked,

    #[error("email already registered")]
    EmailTaken,

    #[error("unauthorized")]
    Unauthorized,

    #[error("forbidden")]
    #[allow(dead_code)]
    Forbidden,

    #[error("not found")]
    NotFound,

    #[error("database error")]
    Database(#[from] sqlx::Error),

    #[error("token error")]
    Token(#[from] jsonwebtoken::errors::Error),

    #[error("internal error")]
    Internal(#[from] anyhow::Error),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, public_message) = match &self {
            AppError::Validation(msg) => (StatusCode::UNPROCESSABLE_ENTITY, msg.clone()),
            AppError::InvalidCredentials => (
                StatusCode::UNAUTHORIZED,
                "invalid email or password".to_string(),
            ),
            AppError::AccountLocked => (
                StatusCode::LOCKED,
                "account temporarily locked due to too many failed login attempts".to_string(),
            ),
            AppError::EmailTaken => (
                StatusCode::CONFLICT,
                "an account with this email already exists".to_string(),
            ),
            AppError::Unauthorized => (
                StatusCode::UNAUTHORIZED,
                "authentication required".to_string(),
            ),
            AppError::Forbidden => (
                StatusCode::FORBIDDEN,
                "you do not have access to this resource".to_string(),
            ),
            AppError::NotFound => (StatusCode::NOT_FOUND, "resource not found".to_string()),
            AppError::Database(e) => {
                tracing::error!(error = %e, "database error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "internal server error".to_string(),
                )
            }
            AppError::Token(e) => {
                tracing::warn!(error = %e, "token error");
                (
                    StatusCode::UNAUTHORIZED,
                    "invalid or expired token".to_string(),
                )
            }
            AppError::Internal(e) => {
                tracing::error!(error = %e, "internal error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "internal server error".to_string(),
                )
            }
        };

        let body = Json(json!({
            "error": {
                "message": public_message,
                "status": status.as_u16(),
            }
        }));

        (status, body).into_response()
    }
}

pub type AppResult<T> = Result<T, AppError>;
