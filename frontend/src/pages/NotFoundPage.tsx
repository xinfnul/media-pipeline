import { Link } from "react-router-dom";

export function NotFoundPage() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg text-text-primary">
			<p className="text-sm text-text-muted">404 — page not found</p>
			<Link to="/" className="text-sm text-rust hover:underline">
				Back home
			</Link>
		</div>
	);
}
