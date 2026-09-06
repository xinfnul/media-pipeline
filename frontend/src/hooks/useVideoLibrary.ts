import { useCallback, useEffect, useState } from "react";
import { extractErrorMessage } from "@/api/client";
import { listVideoRequest } from "@/api/videos";
import type { VideoResponse } from "@/types/video";

export function useVideoLibrary() {
	const [videos, setVideos] = useState<VideoResponse[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		try {
			const data = await listVideoRequest();
			setVideos(data);
			setError(null);
		} catch (err) {
			setError(extractErrorMessage(err, "Couldn't load your videos."));
		}
	}, []);

	useEffect(() => {
		refresh().finally(() => setIsLoading(false));
	}, [refresh]);

	// Lets the upload queue drop a freshly-created video straight into the
	// grid ( as PENDING ) before the next pool pick it up.
	const upsertVideo = useCallback((video: VideoResponse) => {
		setVideos((prev) => {
			const index = prev.findIndex((v) => v.id === video.id);
			if (index === -1) return [video, ...prev];

			const next = [...prev];
			next[index] = { ...next[index], ...video };
			return next;
		});
	}, []);

	return { videos, isLoading, error, refresh, upsertVideo };
}
