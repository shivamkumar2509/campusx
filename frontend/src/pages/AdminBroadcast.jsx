import { useState } from "react";
import { Link } from "react-router-dom";
import { broadcastNotification } from "../api/admin";
import PageShell from "../components/common/PageShell";

export default function AdminBroadcast() {
  const [form, setForm] = useState({
    title: "",
    message: "",
    link: "",
    priority: "medium",
    target: "students",
  });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setSending(true);
    try {
      const res = await broadcastNotification(form);
      setResult(res.data);
      setForm({ ...form, title: "", message: "", link: "" });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <PageShell>
      <Link
        to="/admin/dashboard"
        className="text-sm text-indigo-600 hover:underline"
      >
        ← Back to dashboard
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-gray-900">
        Broadcast Notification
      </h1>
      <p className="mt-1 text-gray-600">
        Send an announcement to all users. They will see it in their
        notifications feed.
      </p>

      {error && (
        <p className="mt-4 text-sm bg-red-50 text-red-700 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}
      {result && (
        <p className="mt-4 text-sm bg-green-50 text-green-800 border border-green-200 rounded px-3 py-2">
          ✅ Sent to {result.sent} users.
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-6 bg-white border rounded-xl p-6 max-w-2xl space-y-3"
      >
        <div>
          <label className="block text-sm font-semibold mb-1">Title</label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Message</label>
          <textarea
            rows={4}
            required
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">
            Link (optional)
          </label>
          <input
            type="text"
            placeholder="/events or /clubs/xyz"
            value={form.link}
            onChange={(e) => setForm({ ...form, link: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold mb-1">Priority</label>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Target</label>
            <select
              value={form.target}
              onChange={(e) => setForm({ ...form, target: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="students">All students</option>
              <option value="admins">All admins</option>
              <option value="all">Everyone</option>
            </select>
          </div>
        </div>
        <button
          type="submit"
          disabled={sending}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 text-sm font-semibold disabled:opacity-60"
        >
          {sending ? "Sending…" : "Send Broadcast"}
        </button>
      </form>
    </PageShell>
  );
}
