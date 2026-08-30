use std::{env, panic};

#[derive(Clone, Debug)]
pub struct Config {
    pub database_url: String,
    pub jwt_access_secret: String,

    #[allow(dead_code)]
    pub jwt_refresh_secret: String,
    pub access_token_ttl_seconds: i64,
    pub refresh_token_ttl_seconds: i64,
    pub server_addr: String,
    pub cors_origin: String,
    pub env: String,

    pub cloudinary_cloud_name: String,
    pub cloudinary_api_key: String,
    pub cloudinary_api_secret: String,
    pub cloudinary_notification_url: Option<String>,

    pub cookie_secure: bool,
    pub cookie_same_site: String,
}

impl Config {
    pub fn from_env() -> Self {
        let database_url = must_get("DATABASE_URL");
        let jwt_access_secret = must_get("JWT_ACCESS_SECRET");
        let jwt_refresh_secret = must_get("JWT_REFRESH_SECRET");

        if jwt_access_secret.len() < 32 || jwt_refresh_secret.len() < 32 {
            panic!("JWT secrets must be at least 32 characters long");
        }
        if jwt_access_secret == jwt_refresh_secret {
            panic!("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different");
        }

        let access_token_ttl_seconds = env::var("ACCESS_TOKEN_TTL_SECONDS")
            .unwrap_or_else(|_| "900".to_string()) // 15 minutes
            .parse()
            .expect("ACCESS_TOKEN_TTL_SECONDS must be an integer");

        let refresh_token_ttl_seconds = env::var("REFRESH_TOKEN_TTL_SECONDS")
            .unwrap_or_else(|_| "1209600".to_string()) // 14 days
            .parse()
            .expect("REFRESH_TOKEN_TTL_SECONDS must be an integer");

        let server_addr = env::var("SERVER_ADDR").unwrap_or_else(|_| "0.0.0.0:3000".to_string());

        let cors_origin =
            env::var("CORS_ORIGIN").unwrap_or_else(|_| "http://localhost:5173".to_string());

        let env = env::var("APP_ENV").unwrap_or_else(|_| "development".to_string());

        let cloudinary_cloud_name = must_get("CLOUDINARY_CLOUD_NAME");
        let cloudinary_api_key = must_get("CLOUDINARY_API_KEY");
        let cloudinary_api_secret = must_get("CLOUDINARY_API_SECRET");
        let cloudinary_notification_url = env::var("CLOUDINARY_NOTIFICATION_URL").ok();

        let is_production_env = env.to_lowercase() == "production";

        let cookie_secure = env::var("COOKIE_SECURE")
            .map(|cs| cs == "true" || cs == "1")
            .unwrap_or(is_production_env);

        let cookie_same_site = env::var("COOKIE_SAME_SITE").unwrap_or_else(|_| ";lax".to_string());

        Self {
            database_url,
            jwt_access_secret,
            jwt_refresh_secret,
            access_token_ttl_seconds,
            refresh_token_ttl_seconds,
            server_addr,
            cors_origin,
            env,
            cloudinary_cloud_name,
            cloudinary_api_key,
            cloudinary_api_secret,
            cloudinary_notification_url,
            cookie_secure,
            cookie_same_site,
        }
    }

    pub fn is_production(&self) -> bool {
        self.env.to_lowercase() == "production"
    }
}

fn must_get(key: &str) -> String {
    env::var(key).unwrap_or_else(|_| panic!("Missing required environment variables: {key}"))
}
