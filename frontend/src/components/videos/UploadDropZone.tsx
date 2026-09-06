import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { FaUpload } from "react-icons/fa";

interface UploadDroponeProps {
	onFiles: (files: File[]) => void;
	disabled?: boolean;
}

export function UploadDropZone({ onFiles, disabled }: UploadDroponeProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [isDragging, setIsDragging] = useState(false);

	function openPicker() {
		if (!disabled) {
			inputRef.current?.click();
		}
	}

	function handleDrop(e: DragEvent<HTMLDivElement>) {
		e.preventDefault();
		setIsDragging(false);

		if (disabled) {
			return;
		}

		const file = e.dataTransfer.files[0];
		if (file) {
			onFiles([file]);
		}
	}

	function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			openPicker();
		}
	}

	return (
		<div
			role="button"
			tabIndex={disabled ? -1 : 0}
			aria-disabled={disabled}
			onClick={openPicker}
			onKeyDown={handleKeyDown}
			onDragOver={(e) => {
				e.preventDefault();
				if (!disabled) setIsDragging(true);
			}}
			onDragLeave={() => setIsDragging(false)}
			onDrop={handleDrop}
			className={`flex flex-col items-center justify-center gap-2 rounded border-2 border-dashed px-6 py-10 text-center transition-colors ${
				disabled
					? "cursor-not-allowed border-border bg-bg-surface opacity-50"
					: isDragging
						? "cursor-pointer border-rust bg-rust/5"
						: "cursor-pointer border-border bg-bg-surface hover:border-text-muted"
			}`}
		>
			<FaUpload className="h-6 w-6 text-text-muted" />
			<p className="text-sm text-text-primary">
				{disabled ? (
					"An upload is already in progress"
				) : (
					<>
						<span className="text-rust">Choose a file</span> or drag video here
					</>
				)}
			</p>
			{!disabled && (
				<p className="text-xs text-text-muted">
					MP4, MOV, WebM, MKV
				</p>
			)}
			<input
				ref={inputRef}
				type="file"
				accept="video/*"
				className="hidden"
				disabled={disabled}
				onChange={(e) => {
					const file = e.target.files?.[0];
					if (file) onFiles([file]);
					e.target.value = "";
				}}
			/>
		</div>
	);
}
