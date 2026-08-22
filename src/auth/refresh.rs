use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use rand::Rng;
use sha2::{Digest, Sha256};

pub fn generate_refresh_token() -> String 
{
	let mut bytes = [0u8; 32];
	rand::rng().fill_bytes(&mut bytes);
	URL_SAFE_NO_PAD.encode(bytes)
}

pub fn hash_refresh_token(token: &str) -> String {
	let mut hasher = Sha256::new();

	hasher.update(token.as_bytes());

	hex::encode(hasher.finalize())
}