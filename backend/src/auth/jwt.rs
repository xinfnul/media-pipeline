use chrono::Utc;
use jsonwebtoken::{DecodingKey, EncodingKey, Header, Validation, decode, encode};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::AppResult;

#[derive(Debug, Serialize, Deserialize)]
pub struct AccessClaims {
    /// Subject - the user id.
    pub sub: String,
    pub iat: i64,
    pub exp: i64,
    pub token_type: String,
}

pub fn create_access_token(user_id: Uuid, secret: &str, ttl_seconds: i64) -> AppResult<String> {
    let now = Utc::now();

    let claims = AccessClaims {
        sub: user_id.to_string(),
        iat: now.timestamp(),
        exp: (now + chrono::Duration::seconds(ttl_seconds)).timestamp(),
        token_type: "access".to_string(),
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )?;

    Ok(token)
}

pub fn verify_access_token(token: &str, secret: &str) -> AppResult<AccessClaims> {
    let mut validation = Validation::default();
    validation.validate_exp = true;

    validation.set_required_spec_claims(&["exp", "sub"]);

    let data = decode::<AccessClaims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    )?;

    Ok(data.claims)
}
