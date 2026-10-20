import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setErrorCode("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", form);
      const { token, user } = data.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      // Force password change on first login (admin-created accounts)
      if (user.must_change_password) {
        navigate("/change-password", { replace: true });
        return;
      }

      navigate(user.role === "admin" ? "/admin/dashboard" : "/dashboard");
    } catch (err) {
      const code = err.response?.data?.error_code || "";
      const message = err.response?.data?.message || "Login failed";
      setErrorCode(code);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    // Fake Google Login for demo (in prod use @react-oauth/google)
    const dummyEmail = prompt("Enter your college email for Google Login:");
    if (!dummyEmail) return;
    try {
      const { data } = await api.post("/auth/oauth/google", {
        email: dummyEmail,
        name: "Google User",
        googleId: "12345",
      });
      localStorage.setItem("token", data.data.token);
      localStorage.setItem("user", JSON.stringify(data.data.user));
      navigate("/dashboard");
    } catch (err) {
      alert("Google login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Welcome Back</h2>

        {error && (
          <div
            className={`p-3 rounded mb-4 text-sm ${
              errorCode === "ACCOUNT_PENDING_APPROVAL"
                ? "bg-yellow-50 text-yellow-800 border border-yellow-200"
                : errorCode === "ACCOUNT_SUSPENDED"
                  ? "bg-red-50 text-red-800 border border-red-200"
                  : "bg-red-50 text-red-600"
            }`}
          >
            {errorCode === "ACCOUNT_PENDING_APPROVAL" && "⏳ "}
            {errorCode === "ACCOUNT_SUSPENDED" && "🚫 "}
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="College Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            )}
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        <div className="mt-4">
          <button
            type="button"
            onClick={handleGoogle}
            className="w-full border border-gray-300 text-gray-700 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50"
          >
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              className="w-5 h-5"
              alt="Google"
            />
            Continue with Google
          </button>
        </div>
        <p className="text-center text-sm text-gray-600 mt-4">
          Don't have an account?{" "}
          <Link to="/signup" className="text-indigo-600 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
