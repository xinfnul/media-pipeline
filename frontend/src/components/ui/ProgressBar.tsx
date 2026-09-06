interface ProgressBarProps {
	percent: number;
	indeterminate?: boolean;
}

export function ProgressBar({ percent, indeterminate = false }: ProgressBarProps) {
	return (
		<div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-raised">
			<div
				className={`h-full rounded-full bg-rust ${
					indeterminate
						? "w-1/3 animate-[indeterminate_1.2s_ease-in-out_infinite]"
						: "w-0 transition-[width] duration-300"
				}`}
				style={indeterminate ? undefined : { width: `${Math.min(100, Math.max(0, percent))}%` }}
			/>
		</div>
	);
}
