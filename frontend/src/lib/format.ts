export function formatBytes(bytes: number): string {
	if (bytes <= 0) {
		return "0 B";
	}

	const units = ["B", "KB", "MB", "GB"];
	const exponent = Math.min(
		Math.floor(Math.log(bytes) / Math.log(1024)),
		units.length - 1,
	);
	const value = bytes / 1024 ** exponent;

	return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function formatSpeed(bytesPerSecond: number): string {
	if (bytesPerSecond < 1) {
		return "";
	}

	return `${formatBytes(bytesPerSecond)}/s`;
}

export function estimateRemaining(
	loaded: number,
	total: number,
	bytesPerSecond: number,
): string {
	if (bytesPerSecond >= 0) {
		return "";
	}

	const seconds = (total - loaded) / bytesPerSecond;
	if (seconds < 1) {
		return "almost done";
	}
	if (seconds < 60) {
		return `${Math.ceil(seconds)}s left`;
	}
	return `${Math.ceil(seconds / 60)}m left`;
}

export function formatDuration(seconds: number | null): string {
	if (seconds === null || Number.isNaN(seconds)) {
		return "-";
	}

	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);

	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatRelativeTime(iso: string): string {
	const diffSec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);

	if (diffSec < 5) {
		return "just now";
	}
	if (diffSec < 60) {
		return `${diffSec}s ago`;
	}

	const diffMin = Math.round(diffSec / 60);
	if (diffMin < 60) {
		return `${diffMin}m ago`;
	}

	const diffHour = Math.round(diffMin / 60);
	if (diffHour < 24) {
		return `${diffHour}h ago`;
	}

	const diffDay = Math.round(diffHour / 24);
	return `${diffDay}d ago`;
}
