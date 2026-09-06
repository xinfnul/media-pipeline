import { formatDuration, formatRelativeTime } from "@/lib/format";
import type { VideoResponse } from "@/types/video";
import { useState } from "react";
import { FaPlay } from "react-icons/fa";
import { MdError } from "react-icons/md";
import { StatusBadge } from "./StatusBadge";
import { VideoPlayerModal } from "./VideoPlayerModal";

export function VideoCard({ video }: { video: VideoResponse }) {
	const [isPlaying, setIsPlaying] = useState(false);
	const canPlay = video.status === "READY" && Boolean(video.playback_url);

	return (
		<>
			<div className="overflow-hidden rounded border border-border bg-bg-surface">
				<button
					type="button"
					onClick={() => canPlay && setIsPlaying(true)}
					disabled={!canPlay}
					className="group relative block aspect-video w-full bg-bg-raised disabled:cursor-default"
				>
					{video.thumbnail_url ? (
						<img
							src={video.thumbnail_url}
							alt=""
							className="h-full w-full object-cover"
						/>
					) : (
						<div className="flex h-full w-full items-center justify-center px-4 text-center">
							{video.status === "FAILED" ? (
								<MdError />
							) : (
								<span className="text-xs text-text-muted">
									{video.status === "PENDING"
										? "Waiting for upload…"
										: "Processing…"}
								</span>
							)}
						</div>
					)}

					{canPlay && (
						<span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
							<FaPlay className="h-10 w-10 text-white opacity-0 transition-opacity group-hover:opacity-100" />
						</span>
					)}

					{video.duration_seconds !== null && (
						<span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[11px] text-white">
							{formatDuration(video.duration_seconds)}
						</span>
					)}
				</button>

				<div className="p-3">
					<p
						className="truncate text-sm font-medium text-text-primary"
						title={video.title}
					>
						{video.title}
					</p>
					<div className="mt-1.5 flex items-center justify-between">
						<StatusBadge status={video.status} />
						<span className="text-xs text-text-muted">
							{formatRelativeTime(video.created_at)}
						</span>
					</div>
					{video.status === "FAILED" && video.error_message && (
						<p className="mt-1.5 text-xs text-rust">{video.error_message}</p>
					)}
				</div>
			</div>

			{isPlaying && video.playback_url && (
				<VideoPlayerModal
					title={video.title}
					playbackUrl={video.playback_url}
					onClose={() => setIsPlaying(false)}
				/>
			)}
		</>
	);
}
