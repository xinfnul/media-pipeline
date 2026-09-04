import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { SubmitEvent } from "react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { extractErrorMessage, useAuth } from "@/context/AuthContext";
import { Alert } from "@/components/ui/Alert";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const MIN_PASSWORD_LENGTH: number = 12;

export function RegisterPage() {
	const { register } = useAuth();
	const navigate = useNavigate();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	function validate(): string | null {
		if (password.length < MIN_PASSWORD_LENGTH) {
			return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
		}
		if (password !== confirmPassword) {
			return "Passwords do not match.";
		}
		return null;
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		setError(null);

		const validationError = validate();
		if (validationError) {
			setError(validationError);
			return;
		}

		setIsLoading(true);
		try {
			await register({ email, password });
			navigate("/", { replace: true });
		} catch (error) {
			setError(
				extractErrorMessage(
					error,
					"Unable to create an account. Please try again.",
				),
			);
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<AuthLayout title="Create an account">
			<form onSubmit={handleSubmit} className="flex flex-col gap-4">
				{error && <Alert message={error} />}

				<Input
					id="email"
					label="Email"
					type="email"
					autoComplete="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
				/>
				<Input
					id="password"
					label="Password"
					type="password"
					autoComplete="new-password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					minLength={MIN_PASSWORD_LENGTH}
					required
				/>
				<Input
					id="confirmPassword"
					label="Confirm password"
					type="password"
					autoComplete="new-password"
					value={confirmPassword}
					onChange={(e) => setConfirmPassword(e.target.value)}
					minLength={MIN_PASSWORD_LENGTH}
					required
				/>

				<Button type="submit" isLoading={isLoading}>
					Register
				</Button>
			</form>

			<p className="mt-6 text-center text-sm text-text-muted">
				Already have an account?{" "}
				<Link to="/login" className="text-rust hover:underline">
					Log in
				</Link>
			</p>
		</AuthLayout>
	);
}
