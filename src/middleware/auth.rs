use axum::{extract::FromRequestParts, http::request::Parts};

use axum_extra::{
    TypedHeader,
    headers::{Authorization, authorization::Bearer},
};
use uuid::Uuid;

use crate::{auth::jwt::verify_access_token, error::AppError, state::AppState};

pub struct CurrentUser {
    pub user_id: Uuid,
}

/// Extractor for `Authorization: Bearer <token>`.
impl FromRequestParts<AppState> for CurrentUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let TypedHeader(Authorization(bearer)) =
            TypedHeader::<Authorization<Bearer>>::from_request_parts(parts, state)
                .await
                .map_err(|_| AppError::Unauthorized)?;

        let claims = verify_access_token(bearer.token(), &state.config.jwt_access_secret)?;

        if claims.token_type != "access" {
            return Err(AppError::Unauthorized);
        }

        let user_id = Uuid::parse_str(&claims.sub).map_err(|_| AppError::Unauthorized)?;

        Ok(CurrentUser { user_id })
    }
}
