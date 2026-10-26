import { Navigate } from "react-router-dom";
import LoadingSpinner from "./ui/LoadingSpinner";

/**
 * Usage:
 *   <ProtectedRoute>              → only logged in
 *   <ProtectedRoute requiredRole="admin"> → only admins
 *   <ProtectedRoute requiredRole="student"> → only students
 */
export default function ProtectedRoute({ children, requiredRole = null }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If a role is required, check it
  if (requiredRole) {
    let user = null;
    try {
      const userStr = localStorage.getItem("user");
      user = userStr ? JSON.parse(userStr) : null;
    } catch {
      user = null;
    }

    if (!user) {
      return <Navigate to="/login" replace />;
    }

    if (user.role !== requiredRole) {
      // Not authorized → redirect to their own dashboard
      const fallback =
        user.role === "admin" ? "/admin/dashboard" : "/dashboard";
      return <Navigate to={fallback} replace />;
    }
  }

  return children;
}
