import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "../components/ui/Spinner";

export function ProtectedRoute() {
	const { status } = useAuth();
	const location = useLocation();

	if (status === "checking") {
		return <Spinner />;
	}

	if (status === "unauthenticated") {
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	return <Outlet />;
}
