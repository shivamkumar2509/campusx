import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/axios";

export default function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const initialToken = searchParams.get("token") || "";

  const [email, setEmail] = useState("");
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const requestReset = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setMessage("If that email exists, a reset link has been sent.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not send reset link");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setMessage("Password reset! You can now log in.");
    } catch (err) {
      setError(err.response?.data?.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Forgot Password</h2>
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-green-50 text-green-700 p-3 rounded mb-4 text-sm">
            {message}
          </div>
        )}

        {/* If no token in URL, show request form */}
        {!initialToken && !message && (
          <form onSubmit={requestReset} className="space-y-4">
            <input
              type="email"
              required
              placeholder="College Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg px-4 py-2"
            />
            <button
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}

        {/* If token in URL, show reset form */}
        {(initialToken || message) && (
          <form onSubmit={resetPassword} className="space-y-4">
            <input
              type="password"
              required
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg px-4 py-2"
            />
            <button
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-600 mt-4">
          <Link to="/login" className="text-indigo-600 hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
