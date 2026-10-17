import { useState } from "react";
import { createStudent } from "../../api/admin";

const DOMAINS = {
  student: "@iiitvadodara.ac.in",
  admin: "@iiitv.ac.in",
};

export default function CreateUserModal({ onClose, onCreated }) {
  const [role, setRole] = useState("student");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [year, setYear] = useState(1);
  const [batch, setBatch] = useState(() => {
    const now = new Date();
    const acad =
      now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    return acad;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);

  const email = username ? `${username}${DOMAINS[role]}` : `${DOMAINS[role]}`;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await createStudent({
        role,
        name: name.trim(),
        username: username.trim().toLowerCase(),
        ...(role === "student" ? { year, batch } : {}),
      });
      setCreated(res.data);
      if (onCreated) onCreated();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = () => {
    if (!created) return;
    navigator.clipboard.writeText(
      `Email: ${created.user.email}\nTemp password: ${created.temp_password}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">
            {created ? "✅ User created" : "Add new user"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {created ? (
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-700">
              The account is created but <strong>pending approval</strong>. The
              user cannot log in until you approve them.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Name</span>
                <span className="font-semibold">{created.user.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <span className="font-mono text-xs">{created.user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Role</span>
                <span className="font-semibold">{created.user.role}</span>
              </div>
              {created.user.role === "student" && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Year / Batch</span>
                    <span>
                      {created.user.year} / {created.user.batch}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center border-t pt-2 mt-2">
                <span className="text-gray-500">Temp password</span>
                <span className="font-mono text-base font-bold text-indigo-700">
                  {created.temp_password}
                </span>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
              ⚠️ Copy this now — it won't be shown again. The user must change
              it on first login.
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={copyToClipboard}
                className="border border-indigo-600 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-50 font-medium text-sm"
              >
                {copied ? "✓ Copied" : "📋 Copy credentials"}
              </button>
              <button
                onClick={onClose}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium text-sm"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold mb-2">
                Account type
              </label>
              <div className="flex gap-2">
                {["student", "admin"].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition ${
                      role === r
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {r === "student" ? "👤 Student" : "🛡️ Faculty / Admin"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Full name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g., Aarav Shah"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) =>
                  setUsername(
                    e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""),
                  )
                }
                required
                placeholder="aarav.shah"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Email preview:{" "}
                <span className="font-mono text-gray-700">{email}</span>
              </p>
            </div>

            {role === "student" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Year
                  </label>
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {[1, 2, 3, 4].map((y) => (
                      <option key={y} value={y}>
                        Year {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Batch
                  </label>
                  <input
                    type="number"
                    value={batch}
                    onChange={(e) => setBatch(Number(e.target.value))}
                    min={2000}
                    max={2100}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            <p className="text-xs text-gray-500">
              A random temporary password will be generated. Share it with the
              user after you approve their account.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !name.trim() || !username.trim()}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-semibold"
              >
                {saving ? "Creating…" : "Create user"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
