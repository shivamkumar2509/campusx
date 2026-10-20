import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function Signup() {
  const [signupType, setSignupType] = useState("student"); // "student" or "admin"

  const [form, setForm] = useState({
    name: "",
    email: "",
    year: 1,
    branch: "",
    password: "",
    confirm: "",
    // admin_code: "", // ✅ Naya field
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    if (token && userStr) {
      const user = JSON.parse(userStr);
      if (user.role === "admin")
        navigate("/admin/dashboard", { replace: true });
      else navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm) {
      return setError("Passwords do not match");
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        year: form.year,
        branch: form.branch,
        password: form.password,
        role: signupType, // "student" or "admin"
      };

      // if (signupType === "admin") {
      //   payload.admin_code = form.admin_code;
      // }

      const { data } = await api.post("/auth/signup", payload);

      if (data.data.token) {
        // Admin direct login
        localStorage.setItem("token", data.data.token);
        localStorage.setItem("user", JSON.stringify(data.data.user));
        navigate("/admin/dashboard");
      } else {
        // Student awaiting approval
        alert(data.message);
        navigate("/login");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-2">Create Account</h2>
        <p className="text-center text-sm text-gray-500 mb-6">
          Join CampusX today
        </p>

        {/* ✅ Role Toggle Switch */}
        <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
          <button
            type="button"
            onClick={() => {
              setSignupType("student");
              setError("");
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
              signupType === "student"
                ? "bg-white shadow text-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            🎓 Student
          </button>
          <button
            type="button"
            onClick={() => {
              setSignupType("admin");
              setError("");
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
              signupType === "admin"
                ? "bg-white shadow text-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            🛡️ Admin / Faculty
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Full Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="email"
            placeholder={
              signupType === "admin"
                ? "Faculty Email (@iiitv.ac.in)"
                : "College Email (@iiitvadodara.ac.in)"
            }
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {signupType === "student" && (
            <div className="grid grid-cols-2 gap-3">
              <select
                value={form.year}
                onChange={(e) =>
                  setForm({ ...form, year: Number(e.target.value) })
                }
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {[1, 2, 3, 4].map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Branch (e.g. CSE)"
                value={form.branch}
                onChange={(e) => setForm({ ...form, branch: e.target.value })}
                required
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
              />
            </div>
          )}

          {/* ✅ Admin Secret Code Field */}
          {/* {signupType === "admin" && (
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
              <label className="block text-xs font-semibold text-yellow-800 mb-1">
                Admin Access Code (Required)
              </label>
              <input
                type="password"
                placeholder="Enter secret access code"
                value={form.admin_code}
                onChange={(e) =>
                  setForm({ ...form, admin_code: e.target.value })
                }
                required
                className="w-full border border-yellow-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
          )} */}

          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            required
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
          >
            {loading && (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            )}
            {loading
              ? "Creating account..."
              : `Sign Up as ${signupType === "admin" ? "Admin" : "Student"}`}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-indigo-600 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
