export type VideoStatus =
	| "PENDING"
	| "UPLOADED"
	| "PROCESSING"
	| "READY"
	| "FAILED";

export interface VideoResponse {
	id: string;
	title: string;
	status: VideoStatus;
	duration_seconds: number | null;
	thumbnail_url: string | null;
	playback_url: string | null;
	error_message: string | null;
	created_at: string;
	uploaded_at: string;
}

export interface CreateVideoPayload {
	title: String;
}

/* Signed Cloudinary upload params returned by POST /videos. */
export interface CreateVideoResponse {
	video_id: string;
	upload_url: string;
	cloud_name: string;
	api_key: string;
	timestamp: number;
	signature: string;
	public_id: string;
	status: VideoStatus;
	eager: string;
	eager_async: boolean;
	notification_url: string | null;
}
