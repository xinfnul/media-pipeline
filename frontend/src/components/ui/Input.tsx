import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, id, className = "", ...rest }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm text-text-muted">
        {label}
      </label>
      <input
        id={id}
        className={`rounded border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-rust ${className}`}
        {...rest}
      />
      {error && <p className="text-xs text-rust">{error}</p>}
    </div>
  );
}
