import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: "primary" | "secondary";
}

export function Button({
  isLoading = false,
  variant = "primary",
  disabled,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const base =
    "w-full rounded border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60";

  const variants = {
    primary:
      "border-rust bg-rust text-white hover:bg-rust-hover disabled:hover:bg-rust",
    secondary:
      "border-border bg-transparent text-text-primary hover:bg-bg-raised",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading ? "Please wait…" : children}
    </button>
  );
}
