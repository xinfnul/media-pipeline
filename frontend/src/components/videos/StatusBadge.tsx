import type { VideoStatus } from "@/types/video";

const LABELS: Record<VideoStatus, string> = {
	PENDING: "Waiting for upload",
	UPLOADED: "Uploaded",
	PROCESSING: "Processing",
	READY: "Ready",
	FAILED: "Failed",
};

const DOT_CLASSES: Record<VideoStatus, string> = {
	PENDING: "bg-text-muted",
	UPLOADED: "bg-amber-500",
	PROCESSING: "bg-amber-500",
	READY: "bg-emerald-500",
	FAILED: "bg-rust",
};

const BUSY_STATUSES = new Set<VideoStatus>([
	"PENDING",
	"UPLOADED",
	"PROCESSING",
]);

export function StatusBadge({ status }: { status: VideoStatus }) {
	const isBusy = BUSY_STATUSES.has(status);

	return (
		<span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
			<span
				className={`h-1.5 w-1.5 rounded-full ${DOT_CLASSES[status]} ${isBusy ? "animate-pulse" : ""}`}
			/>
			{LABELS[status]}
		</span>
	);
}
