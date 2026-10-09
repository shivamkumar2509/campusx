import { Navigate } from "react-router-dom";
import LoadingSpinner from "./ui/LoadingSpinner";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  // Agar token nahi hai toh turant redirect
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Token hai toh children render karo
  return children;
}
