import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

/** Sends signed-out visitors to the login page and brings them back afterwards. */
export default function RequireAuth({ children, adminOnly = false }) {
  const { isAuthenticated, isAdmin, isPending } = useAuth();
  const location = useLocation();

  if (isPending) {
    return (
      <main className="page container">
        <p className="loading-text" aria-busy="true">Checking your session…</p>
      </main>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/log-in" replace state={{ from: location.pathname + location.search }} />;
  }
  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }
  return children;
}
