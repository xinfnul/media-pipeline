import { extractErrorMessage } from "@/api/client";
import { createVideoRequest } from "@/api/videos";
import { uploadToCloudinary } from "@/lib/cloudinaryUpload";
import { titleFromName } from "@/lib/fileValidation";
import type { CreateVideoResponse, VideoResponse } from "@/types/video";
import { useCallback, useRef, useState } from "react";

export type UploadPhase = "creating" | "uploading" | "processing" | "error";

export interface UploadState {
	file: File;
	title: string;
	videoId: string | null;
	phase: UploadPhase;
	percent: number;
	loaded: number;
	total: number;
	bytesPerSecond: number;
	error: string | null;
}

interface UseVideoUploadOptions {
	// Called as soon as the backend record exists to list on grid.
	onCreated: (video: VideoResponse) => void;

	// Called once the file has uploaded, to remove from polling for the processed result.
	onSettled: () => void;
}

export function useVideoUpload({
	onCreated,
	onSettled,
}: UseVideoUploadOptions) {
	const [upload, setUpload] = useState<UploadState | null>(null);
	const controllerRef = useRef<AbortController | null>(null);

	const patch = useCallback((changes: Partial<UploadState>) => {
		setUpload((prev) => (prev ? { ...prev, ...changes } : prev));
	}, []);

	const run = useCallback(
		async (file: File, title: string) => {
			setUpload({
				file,
				title,
				videoId: null,
				phase: "creating",
				percent: 0,
				loaded: 0,
				total: file.size,
				bytesPerSecond: 0,
				error: null,
			});

			let signed: CreateVideoResponse;
			try {
				signed = await createVideoRequest({ title });
			} catch (err) {
				patch({
					phase: "error",
					error: extractErrorMessage(err, "Couldn't start the upload"),
				});
				return;
			}

			onCreated({
				id: signed.video_id,
				title,
				status: signed.status,
				duration_seconds: null,
				thumbnail_url: null,
				playback_url: null,
				error_message: null,
				created_at: new Date().toISOString(),
				uploaded_at: new Date().toISOString(),
			});

			const controller = new AbortController();
			controllerRef.current = controller;
			patch({ videoId: signed.video_id, phase: "uploading" });

			try {
				await uploadToCloudinary({
					file,
					signed,
					signal: controller.signal,
					onProgress: ({ loaded, total, percent, bytesPerSecond }) => {
						patch({ loaded, total, percent, bytesPerSecond });
					},
				});

				controllerRef.current = null;
				patch({ phase: "processing", percent: 100 });
				onSettled();
			} catch (err) {
				controllerRef.current = null;

				if (controller.signal.aborted) {
					setUpload(null);
					return;
				}

				patch({
					phase: "error",
					error: extractErrorMessage(err, "Upload failed. Retry again."),
				});
			}
		},
		[onCreated, onSettled, patch],
	);

	const startUpload = useCallback(
		(file: File) => {
			void run(file, titleFromName(file.name));
		},
		[run],
	);

	const cancelUpload = useCallback(() => {
		if (controllerRef.current) {
			controllerRef.current.abort();
		} else {
			setUpload(null);
		}
	}, []);

	const retryUpload = useCallback(() => {
		setUpload((prev) => {
			if (!prev) return prev;
			void run(prev.file, prev.title);
			return prev;
		});
	}, [run]);

	// Once the video reaches READY/ FAILED, its progress card is redundant - the grid takes over.
	const clearIfSettled = useCallback((settledVideoIds: Set<String>) => {
		setUpload((prev) =>
			prev && prev.videoId && settledVideoIds.has(prev.videoId) ? null : prev,
		);
	}, []);

	const isUploading = upload !== null && upload.phase !== "error";

	return {
		upload,
		isUploading,
		startUpload,
		cancelUpload,
		retryUpload,
		clearIfSettled,
	};
}
