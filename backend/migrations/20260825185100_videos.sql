CREATE TYPE video_status AS ENUM ('PENDING', 'UPLOADED', 'PROCESSING' , 'READY', 'FAILED');

CREATE TABLE videos (
	id 					UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id 			UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	title				TEXT NOT NULL,
	status				video_status NOT NULL DEFAULT 'PENDING',
	storage_key			TEXT NOT NULL,
	duration_seconds	INT,
	thumbnail_key		TEXT,
	hls_manifest_key	TEXT,
	error_message		TEXT,
	created_at			TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at			TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_videos_user_id ON videos (user_id);
CREATE INDEX idx_videos_status ON videos (status);
