import type { ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../ui/Button";

export function AppLayout({ children }: { children: ReactNode }) {
	const { user, logout } = useAuth();

	return (
		<div className="min-h-screen bg-bg">
			<header className="border-b border-border bg-bg-surface">
				<div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
					<div className="flex items-center gap-2">
						<span className="inline-block h-2.5 w-2.5 rounded-full bg-rust" />
						<span className="text-sm font-medium text-text-primary">
							media-pipeline
						</span>
					</div>
					<div className="flex items-center gap-3">
						<span className="hidden text-sm text-text-muted sm:inline">
							{user?.email}
						</span>
						<Button
							variant="secondary"
							className="w-auto px-3 py-1.5"
							onClick={() => logout()}
						>
							Log out
						</Button>
					</div>
				</div>
			</header>
			<main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
		</div>
	);
}
