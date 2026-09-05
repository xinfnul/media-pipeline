import type { CreateVideoResponse } from "@/types/video";
import axios from "axios";

export interface UploadProgress {
	loaded: number;
	total: number;
	percent: number;
	bytesPerSecond: number;
}

interface UploadToCloudinaryOptions {
	file: File;
	signed: CreateVideoResponse;
	signal: AbortSignal;
	onProgress: (progress: UploadProgress) => void;
}

interface CloudinaryUploadResult {
	durationSeconds: number | null;
}

// A bare axios instance - no baseURL, no auth header, no refresh interceptor.
// This request goes straight to Cloudinary.
const cloudinaryClient = axios.create();

/**
 * Uploads a file directly to Cloudinary using the signed params the backend
 * issues.
 */
export async function uploadToCloudinary({
	file,
	signed,
	signal,
	onProgress,
}: UploadToCloudinaryOptions): Promise<CloudinaryUploadResult> {
	const form = new FormData();
	form.append("file", file);
	form.append("api_key", signed.api_key);
	form.append("timestamp", String(signed.timestamp));
	form.append("signature", signed.signature);
	form.append("public_id", signed.public_id);
	form.append("eager", signed.eager);
	form.append("eager_async", String(signed.eager_async));
	if (signed.notification_url) {
		form.append("notification_url", signed.notification_url);
		form.append("eager_notification_url", signed.notification_url);
	}

	let lastLoaded = 0;
	let lastTimestamp = performance.now();

	const { data } = await cloudinaryClient.post(signed.upload_url, form, {
		signal,
		onUploadProgress: (event) => {
			const now = performance.now();
			const elapsedSeconds = (now - lastTimestamp) / 1000;
			const deltaBytes = event.loaded - lastLoaded;
			const bytesPerSecond =
				elapsedSeconds > 0.05 ? deltaBytes / elapsedSeconds : 0;

			if (elapsedSeconds > 0.05) {
				lastLoaded = event.loaded;
				lastTimestamp = now;
			}

			const total = event.total ?? file.size;
			onProgress({
				loaded: event.loaded,
				total,
				percent: total > 0 ? Math.round((event.loaded / total) * 100) : 0,
				bytesPerSecond,
			});
		},
	});

	const duration = data?.duration;

	return {
		durationSeconds: typeof duration === "number" ? Math.round(duration) : null,
	};
}
