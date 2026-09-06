import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";

interface VideoPlayerModalProps {
	title: string;
	playbackUrl: string;
	onClose: () => void;
}

export function VideoPlayerModal({ title, playbackUrl, onClose }: VideoPlayerModalProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [isElementReady, setIsElementReady] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// hls-video-element registers the <hls-video> custom element as a side
	// effect of importing it. Loading it lazily (rather than at module
	// scope) keeps hls.js out of the main bundle, same as before.
	useEffect(() => {
		let cancelled = false;
		import("hls-video-element").then(() => {
			if (!cancelled) setIsElementReady(true);
		});
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		const video = videoRef.current;
		if (!video || !isElementReady) return;

		setError(null);
		let cancelled = false;

		// <hls-video> extends the standard video element and handles the
		// hls.js attach/detach lifecycle (plus its own error-recovery loop)
		// internally, so we only need to listen for genuinely fatal native
		// errors here — no manual attach/loadSource/recover wiring.
		function handleError() {
			if (cancelled || !video?.currentSrc) return;

			const mediaError = video?.error;
			console.error("hls-video-element error", mediaError);
			setError(
				mediaError?.message
					? `Playback failed: ${mediaError.message}`
					: "Playback failed — the stream may still be processing.",
			);
		}
		video.addEventListener("error", handleError);

		// Browsers won't reliably honor the plain `autoplay` attribute for an
		// MSE-backed stream, regardless of which library is driving it — a
		// rejected play() here almost always just means the browser's
		// autoplay policy blocked it, and native controls stay available.
		function attemptPlay() {
			video?.play().catch((err) => {
				console.debug("Autoplay blocked, waiting for a manual play:", err);
			});
		}
		video.addEventListener("loadedmetadata", attemptPlay, { once: true });

		return () => {
			cancelled = true;
			video.removeEventListener("error", handleError);
			video.removeEventListener("loadedmetadata", attemptPlay);
		};
	}, [isElementReady, playbackUrl]);

	return (
		<Modal title={title} onClose={onClose}>
			<div className="bg-black">
				{error ? (
					<div className="flex aspect-video flex-col items-center justify-center gap-2 p-6 text-center text-sm text-text-muted">
						<p>{error}</p>
						<a
							href={playbackUrl}
							target="_blank"
							rel="noreferrer"
							className="text-xs text-rust hover:underline"
						>
							Open manifest URL directly
						</a>
					</div>
				) : isElementReady ? (
					<hls-video
						ref={videoRef}
						className="aspect-video w-full"
						controls
						playsInline
						src={playbackUrl}
					/>
				) : (
					<div className="flex aspect-video items-center justify-center text-sm text-text-muted">
						Loading player…
					</div>
				)}
			</div>
		</Modal>
	);
}