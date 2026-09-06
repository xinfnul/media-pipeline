import type { UploadPhase, UploadState } from "@/hooks/useVideoUpload";
import { estimateRemaining, formatBytes, formatSpeed } from "@/lib/format";
import { ProgressBar } from "../ui/ProgressBar";

interface UploadProgressCardProps {
	upload: UploadState;
	onCancel: () => void;
	onRetry: () => void;
}

const PHASE_LABEL: Record<UploadPhase, string> = {
	creating: "Preparing upload…",
	uploading: "Uploading",
	processing: "Upload complete — generating preview & playback…",
	error: "Failed",
};

export function UploadProgressCard({
	upload,
	onCancel,
	onRetry,
}: UploadProgressCardProps) {
	const canCancel = upload.phase === "creating" || upload.phase === "uploading";

	return (
		<div className="rounded border border-border bg-bg-surface p-3">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-medium text-text-primary">
						{upload.title}
					</p>
					<p className="mt-0.5 truncate text-xs text-text-muted">
						{upload.file.name}
					</p>
				</div>

				<div className="flex shrink-0 gap-3">
					{upload.phase === "error" && (
						<button
							type="button"
							onClick={onRetry}
							className="text-xs text-rust hover:underline"
						>
							Retry
						</button>
					)}
					{canCancel && (
						<button
							type="button"
							onClick={onCancel}
							className="text-xs text-text-muted hover:text-text-primary"
						>
							Cancel
						</button>
					)}
				</div>
			</div>

			<div className="mt-2">
				<ProgressBar
					percent={upload.percent}
					indeterminate={
						upload.phase === "creating" || upload.phase === "processing"
					}
				/>
				<div className="mt-1 flex items-center justify-between gap-2 text-xs text-text-muted">
					<span className={upload.phase === "error" ? "text-rust" : ""}>
						{upload.error ?? PHASE_LABEL[upload.phase]}
					</span>
					{upload.phase === "uploading" && (
						<span className="shrink-0">
							{formatBytes(upload.loaded)} / {formatBytes(upload.total)}
							{upload.bytesPerSecond > 0 && (
								<>
									{" "}
									· {formatSpeed(upload.bytesPerSecond)} ·{" "}
									{estimateRemaining(
										upload.loaded,
										upload.total,
										upload.bytesPerSecond,
									)}
								</>
							)}
						</span>
					)}
				</div>
			</div>
		</div>
	);
}
