import { Link, useLocation, useNavigate, type Location } from "react-router-dom";
import { useState, type SubmitEvent } from "react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { extractErrorMessage, useAuth } from "@/context/AuthContext";
import { Alert } from "@/components/ui/Alert";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function LoginPage() {
	const { login } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		setError(null);

		setIsLoading(true);
		try {
			await login({ email, password });

			const state = location.state as { from?: Location } | null;
			const redirectTo = state?.from?.pathname ?? "/";
			navigate(redirectTo, { replace: true });
		} catch (err) {
			setError(
				extractErrorMessage(error, "Unable to log in. Please try again."),
			);
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<AuthLayout title="Log in">
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
					autoComplete="current-password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					required
				/>

				<Button type="submit" isLoading={isLoading}>
					Log in
				</Button>
			</form>

			<p className="mt-6 text-center text-sm text-text-muted">
				Don't have an account?{" "}
				<Link to="/register" className="text-rust hover:underline">
					Register
				</Link>
			</p>
		</AuthLayout>
	);
}
