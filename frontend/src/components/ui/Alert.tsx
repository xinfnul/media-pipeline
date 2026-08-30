interface AlertProps {
	message: string;
}

export function Alert({ message }: AlertProps) {
	return (
		<div className="rounded border border-rust-muted bg-rust/10 px-3 py-2 text-sm text-rust">
			{message}
		</div>
	);
}
