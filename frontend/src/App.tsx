import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { PublicOnlyRoute } from "./routes/PublicOnlyRoute";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { DashboardPage } from "./pages/DashboardPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";

export default function App() {
	return (
		<BrowserRouter>
			<AuthProvider>
				<Routes>
					<Route element={<PublicOnlyRoute />}>
						<Route path="/login" element={<LoginPage />} />
						<Route path="/register" element={<RegisterPage />} />
					</Route>

					<Route element={<ProtectedRoute />}>
						<Route path="/" element={<DashboardPage />} />
					</Route>

					<Route path="/404" element={<NotFoundPage />} />
					<Route path="*" element={<Navigate to="/404" replace />} />
				</Routes>
			</AuthProvider>
		</BrowserRouter>
	);
}
