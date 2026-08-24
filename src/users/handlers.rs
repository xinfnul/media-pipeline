use axum::{Json, extract::State};

use crate::{
    error::{AppError, AppResult},
    middleware::auth::CurrentUser,
    state::AppState,
    users::{models::UserResponse, repository},
};

pub async fn me(
    State(state): State<AppState>,
    current_user: CurrentUser,
) -> AppResult<Json<UserResponse>> {
    let user = repository::find_user_by_id(&state.db, current_user.user_id)
        .await?
        .ok_or(AppError::NotFound)?;

    Ok(Json(UserResponse::from(user)))
}
