import type { ReactNode } from "react";

export function AuthLayout({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	return (
		<div className="flex min-h-screen items-center justify-center bg-bg px-4">
			<div className="w-full max-w-sm rounded border border-border bg-bg-surface p-6">
				<div className="mb-6 flex items-center gap-2">
					<span className="inline-block h-2.5 w-2.5 rounded-full bg-rust" />
					<span className="text-sm font-medium text-text-muted">
						media-pipeline
					</span>
				</div>
				<h1 className="mb-6 text-lg font-semibold text-text-primary">
					{title}
				</h1>
				{children}
			</div>
		</div>
	);
}
