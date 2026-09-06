import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
	title: string;
	onClose: () => void;
	children: ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	return createPortal(
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
			onClick={onClose}
		>
			<div
				className="w-full max-w-3xl overflow-hidden rounded border border-border bg-bg-surface"
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-modal="true"
				aria-label={title}
			>
				<div className="flex items-center justify-between border-b border-border px-4 py-3">
					<h2 className="truncate text-sm font-medium text-text-primary">{title}</h2>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close"
						className="rounded p-1 text-text-muted hover:bg-bg-raised hover:text-text-primary"
					>
						<svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
							<path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
						</svg>
					</button>
				</div>
				{children}
			</div>
		</div>,
		document.body,
	);
}
