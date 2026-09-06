import type { VideoResponse } from "@/types/video";
import { VideoCard } from "./VideoCard";

export function VideoGrid({ videos }: { videos: VideoResponse[] }) {
	if (videos.length === 0) {
		return (
			<div className="rounded border border-dashed border-border p-10 text-center text-sm text-text-muted">
				No videos yet. Drop a file above to upload your first one.
			</div>
		);
	}

	return (
		<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
			{videos.map((video) => (
				<VideoCard key={video.id} video={video} />
			))}
		</div>
	);
}
