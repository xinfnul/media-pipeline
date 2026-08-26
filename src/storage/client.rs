use sha1::{Digest, Sha1};

use crate::config::Config;

pub struct SignedUpload {
    pub upload_url: String,
    pub cloud_name: String,
    pub api_key: String,
    pub timestamp: i64,
    pub signature: String,
    pub public_id: String,
}

pub struct CloudinaryClient {
    cloud_name: String,
    api_key: String,
    api_secret: String,
    notification_url: Option<String>,
}

impl CloudinaryClient {
    pub fn from_config(config: &Config) -> Self {
        Self {
            cloud_name: config.cloudinary_cloud_name.clone(),
            api_key: config.cloudinary_api_key.clone(),
            api_secret: config.cloudinary_api_secret.clone(),
            notification_url: config.cloudinary_notification_url.clone(),
        }
    }

    pub fn build_signed_upload(&self, public_id: &str) -> SignedUpload {
        let timestamp = chrono::Utc::now().timestamp();

        let mut params: Vec<(&str, String)> = vec![
            ("public_id", public_id.to_string()),
            ("timestamp", timestamp.to_string()),
        ];
        if let Some(url) = &self.notification_url {
            params.push(("notification_url", url.clone()));
        }
        params.sort_by(|a, b| a.0.cmp(b.0));

        let to_sign: String = params
            .iter()
            .map(|(k, v)| format!("{k}={v}"))
            .collect::<Vec<_>>()
            .join("&");

        let mut hasher = Sha1::new();
        hasher.update(to_sign.as_bytes());
        hasher.update(self.api_secret.as_bytes());

        let signature = hex::encode(hasher.finalize());

        SignedUpload {
            upload_url: format!(
                "https://api.cloudinary.com/v1_1/{}/video/upload",
                self.cloud_name
            ),
            cloud_name: self.cloud_name.clone(),
            api_key: self.api_key.clone(),
            timestamp,
            signature,
            public_id: public_id.to_string(),
        }
    }

    pub fn hls_playback_url(&self, hls_manifest_key: &str) -> String {
        format!(
            "https://res.cloudinary.com/{}/video/upload/sp_hd/{}.m3u8",
            self.cloud_name, hls_manifest_key
        )
    }

    pub fn thumbnail_url(&self, thumbnail_key: &str) -> String {
        format!(
            "https://res.cloudinary.com/{}/video/upload/{}.jpg",
            self.cloud_name, thumbnail_key
        )
    }
}
