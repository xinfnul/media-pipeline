import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { useVideoLibrary } from "@/hooks/useVideoLibrary";
import { useEffect, useState } from "react";
import { useVideoUpload } from "@/hooks/useVideoUpload";
import { validateVideoFile } from "@/lib/fileValidation";
import { UploadDropZone } from "@/components/videos/UploadDropZone";
import { Alert } from "@/components/ui/Alert";
import { UploadProgressCard } from "@/components/videos/UploadProgressCard";
import { VideoGrid } from "@/components/videos/VideoGrid";

const POLL_INTERVAL_MS = 3000;

export function DashboardPage() {
	const { user } = useAuth();
	const { videos, isLoading, error, refresh, upsertVideo } = useVideoLibrary();
	const [rejection, setRejection] = useState<string | null>(null);

	const {
		upload,
		isUploading,
		startUpload,
		cancelUpload,
		retryUpload,
		clearIfSettled,
	} = useVideoUpload({ onCreated: upsertVideo, onSettled: refresh });

	// Poll the list while anything is still moving
	useEffect(() => {
		const hasActiveVideo = videos.some(
			(v) => v.status !== "READY" && v.status !== "FAILED",
		);

		if (!hasActiveVideo && !isUploading) {
			return;
		}

		const interval = setInterval(refresh, POLL_INTERVAL_MS);
		return () => {
			clearInterval(interval);
		};
	}, [videos, isUploading, refresh]);

	// Once the video reaches READY/ FAILED, drop the progress card.
	useEffect(() => {
		const settledIds = new Set(
			videos
				.filter((v) => v.status === "READY" || v.status === "FAILED")
				.map((v) => v.id),
		);

		if (settledIds) {
			clearIfSettled(settledIds);
		}
	}, [videos, clearIfSettled]);

	function handleFiles(files: File[]) {
		const file = files[0];
		if (!file) {
			return;
		}

		const validationError = validateVideoFile(file);
		if (validationError) {
			setRejection(validationError);
			return;
		}

		setRejection(null);
		startUpload(file);
	}

	return (
		<AppLayout>
			<div className="flex flex-col gap-6">
				<div>
					<h1 className="text-lg font-semibold text-text-primary">
						Your videos
					</h1>
					<p className="text-sm text-text-muted">Signed in as {user?.email}</p>
				</div>

				<UploadDropZone onFiles={handleFiles} disabled={isUploading} />

				{rejection && <Alert message={rejection} />}
				{error && <Alert message={error} />}

				{upload && (
					<UploadProgressCard
						upload={upload}
						onCancel={cancelUpload}
						onRetry={retryUpload}
					/>
				)}

				{isLoading ? (
					<p className="text-sm text-text-muted">Loading your videos…</p>
				) : (
					<VideoGrid videos={videos} />
				)}
			</div>
		</AppLayout>
	);
}
