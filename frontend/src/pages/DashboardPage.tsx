import { useAuth } from "../context/AuthContext";
import { AppLayout } from "../components/layout/AppLayout";

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <AppLayout>
      <div className="rounded border border-border bg-bg-surface p-6">
        <h1 className="mb-1 text-lg font-semibold text-text-primary">
          Signed in
        </h1>
        <p className="mb-6 text-sm text-text-muted">
          Authentication is wired up. Upload flows come next.
        </p>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-text-muted">Email</dt>
          <dd className="text-text-primary">{user?.email}</dd>

          <dt className="text-text-muted">User ID</dt>
          <dd className="break-all text-text-primary">{user?.id}</dd>

          <dt className="text-text-muted">Verified</dt>
          <dd className="text-text-primary">
            {user?.is_verified ? "Yes" : "No"}
          </dd>

          <dt className="text-text-muted">Joined</dt>
          <dd className="text-text-primary">
            {user?.created_at
              ? new Date(user.created_at).toLocaleString()
              : "—"}
          </dd>
        </dl>
      </div>
    </AppLayout>
  );
}
