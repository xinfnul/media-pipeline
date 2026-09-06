const MAX_BYTES = 4 * 1024 * 1024 * 1024; // 4 GB

const ACCEPTED_EXTENSIONS = [
	".mp4",
	".mov",
	".webm",
	".mkv",
	".avi",
	".m4v",
	".mpeg",
	".mpg",
];

export function validateVideoFile(file: File): string | null {
	const isVideo =
		file.type.startsWith("video/") ||
		ACCEPTED_EXTENSIONS.some((ext) =>
			file.name.toLocaleLowerCase().endsWith(ext),
		);

	if (!isVideo) {
		return `${file.name} isn't a recognized video format`;
	}
	if (file.size === 0) {
		return `${file.name} is empty`;
	}
	if (file.size > MAX_BYTES) {
		return `${file.name} is over the 4GB limit for a single upload`;
	}

	return null;
}

export function titleFromName(filename: string): string {
	const withoutExtension = filename.replace(/\.[^/.]+$/, "");
	const cleaned = withoutExtension.replace(/[_-]+/g, " ").trim();

	return cleaned.slice(0, 200) || "Untitled video - X";
}
