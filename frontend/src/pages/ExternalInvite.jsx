import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios";
import PageShell from "../components/common/PageShell";

export default function ExternalInvite() {
  const { teamId } = useParams();
  const [form, setForm] = useState({
    invited_email: "",
    invited_name: "",
    role_offered: "",
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      const res = await api.post(`/teams/${teamId}/external-invitations`, form);
      setResult(res.data.data);
      setForm({
        invited_email: "",
        invited_name: "",
        role_offered: "",
        message: "",
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send invitation");
    } finally {
      setSending(false);
    }
  };

  return (
    <PageShell>
      <Link
        to={`/teams/${teamId}`}
        className="text-sm text-indigo-600 hover:underline"
      >
        ← Back to team
      </Link>

      <div className="mt-4 max-w-2xl">
        <h1 className="text-3xl font-bold text-gray-900">
          Invite External Member
        </h1>
        <p className="mt-1 text-gray-600">
          Send a signup link via email to someone outside IIITV.
        </p>

        {error && (
          <p className="mt-4 text-sm bg-red-50 text-red-700 border border-red-200 rounded px-3 py-2">
            {error}
          </p>
        )}
        {result && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded p-4 text-sm text-green-800">
            ✅ Invitation sent to <strong>{result.invited_email}</strong>.
            <p className="mt-1 text-xs">
              Link: {result.invite_link} (expires{" "}
              {new Date(result.expires_at).toLocaleDateString()})
            </p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-6 bg-white border rounded-xl p-6 space-y-4"
        >
          <Field label="Email">
            <input
              type="email"
              required
              value={form.invited_email}
              onChange={(e) =>
                setForm({ ...form, invited_email: e.target.value })
              }
              className="input"
              placeholder="friend@example.com"
            />
          </Field>
          <Field label="Name (optional)">
            <input
              value={form.invited_name}
              onChange={(e) =>
                setForm({ ...form, invited_name: e.target.value })
              }
              className="input"
            />
          </Field>
          <Field label="Role offered (optional)">
            <input
              value={form.role_offered}
              onChange={(e) =>
                setForm({ ...form, role_offered: e.target.value })
              }
              className="input"
              placeholder="e.g., designer"
            />
          </Field>
          <Field label="Message (optional)">
            <textarea
              rows={3}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="input"
            />
          </Field>
          <button
            type="submit"
            disabled={sending}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-60 font-medium"
          >
            {sending ? "Sending..." : "Send Invitation"}
          </button>
        </form>
      </div>

      <style>{`.input{width:100%;border:1px solid #d1d5db;border-radius:.5rem;padding:.55rem .85rem;outline:none}
      .input:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.18)}`}</style>
    </PageShell>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
