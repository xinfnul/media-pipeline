import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "../components/ui/Spinner";

export function PublicOnlyRoute() {
	const { status } = useAuth();

	if (status === "checking") {
		return <Spinner />;
	}

	if (status === "authenticated") {
		return <Navigate to="/" replace />;
	}

	return <Outlet />;
}
