import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import PageShell from "../components/common/PageShell";
import { ErrorState, LoadingBlock } from "../components/common/StateViews";

const TYPES = ["hackathon", "club", "workshop"];

const emptyForm = {
  title: "",
  description: "",
  type: "hackathon",
  deadline: "",
  team_size_min: 2,
  team_size_max: 6,
  restrict_max_teams: false,
  max_teams: "",
};

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  const loadEvents = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/events", {
        params: { status: "", limit: 100 },
      });
      setEvents(data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
    setShowForm(false);
    setActionError("");
  };

  const handleEdit = (ev) => {
    setEditing(ev);
    setForm({
      title: ev.title || "",
      description: ev.description || "",
      type: ev.type || "hackathon",
      deadline: ev.deadline
        ? new Date(ev.deadline).toISOString().slice(0, 16)
        : "",
      team_size_min: ev.team_size_min ?? 2,
      team_size_max: ev.team_size_max ?? 6,
      restrict_max_teams: ev.max_teams != null,
      max_teams: ev.max_teams != null ? String(ev.max_teams) : "",
    });
    setShowForm(true);
    setActionError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionError("");

    // Frontend validation
    if (Number(form.team_size_max) < Number(form.team_size_min)) {
      setActionError("team_size_max must be >= team_size_min");
      return;
    }
    if (form.restrict_max_teams) {
      if (!form.max_teams || Number(form.max_teams) < 1) {
        setActionError("max_teams must be >= 1 when restricted");
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        type: form.type,
        deadline: form.deadline,
        team_size_min: Number(form.team_size_min),
        team_size_max: Number(form.team_size_max),
        max_teams: form.restrict_max_teams ? Number(form.max_teams) : null,
      };

      if (editing) {
        await api.patch(`/events/${editing._id}`, payload);
      } else {
        await api.post("/events", payload);
      }
      resetForm();
      loadEvents();
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to save event");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (id) => {
    try {
      await api.post(`/events/${id}/publish`);
      loadEvents();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to publish");
    }
  };

  const handleClose = async (id) => {
    if (!confirm("Close this event? AI matching will start.")) return;
    try {
      await api.post(`/events/${id}/close`);
      loadEvents();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to close");
    }
  };

  const handleDelete = async (id, title) => {
    if (!confirm(`Delete event "${title}"? Cannot be undone.`)) return;
    try {
      await api.delete(`/events/${id}`);
      loadEvents();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete");
    }
  };

  const handleRunMatching = async (id) => {
    try {
      const { data } = await api.post(`/events/${id}/matching/run`);
      const r = data.data || {};
      alert(
        `Matching done.\nCreated: ${r.created}\nLeftover: ${r.leftover}\nCap hit: ${r.cap_hit}`,
      );
      loadEvents();
    } catch (err) {
      alert(err.response?.data?.message || "Matching failed");
    }
  };

  return (
    <PageShell>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Events</h1>
          <p className="mt-1 text-gray-600">
            Create events, set team rules, and trigger AI matching.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/admin/dashboard"
            className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm"
          >
            ← Dashboard
          </Link>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium"
          >
            + New Event
          </button>
        </div>
      </div>

      {actionError && (
        <p className="mb-4 text-sm bg-red-50 text-red-700 border border-red-200 rounded px-3 py-2">
          {actionError}
        </p>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border p-6 mb-6 space-y-4"
        >
          <h2 className="text-lg font-bold">
            {editing ? `Edit: ${editing.title}` : "New Event"}
          </h2>

          <input
            type="text"
            placeholder="Event title"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />

          <textarea
            rows={2}
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />

          <div className="grid grid-cols-2 gap-3">
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              required
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* ===== TEAM SIZE (ALWAYS ENFORCED) ===== */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-3">
            <h3 className="font-bold text-indigo-900 text-sm">
              Team Size (Always Enforced)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Min members per team
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={form.team_size_min}
                  onChange={(e) =>
                    setForm({ ...form, team_size_min: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Max members per team
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={form.team_size_max}
                  onChange={(e) =>
                    setForm({ ...form, team_size_max: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {/* ===== MAX TEAMS (OPTIONAL) ===== */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.restrict_max_teams}
                onChange={(e) =>
                  setForm({
                    ...form,
                    restrict_max_teams: e.target.checked,
                    max_teams: e.target.checked ? form.max_teams : "",
                  })
                }
                className="w-4 h-4"
              />
              <span className="font-bold text-amber-900 text-sm">
                Restrict max teams (optional)
              </span>
            </label>
            <p className="text-xs text-amber-800">
              If unchecked, AI matching can create unlimited teams. If checked,
              AI will cap the total number of teams at the value below.
            </p>
            {form.restrict_max_teams && (
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Max teams
                </label>
                <input
                  type="number"
                  min="1"
                  required={form.restrict_max_teams}
                  value={form.max_teams}
                  onChange={(e) =>
                    setForm({ ...form, max_teams: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : editing ? "Update Event" : "Create Event"}
            </button>
          </div>
        </form>
      )}

      {loading && (
        <div className="bg-white border rounded-xl p-6">
          <LoadingBlock lines={4} />
        </div>
      )}
      {!loading && error && <ErrorState message={error} onRetry={loadEvents} />}

      {!loading && !error && (
        <div className="bg-white border rounded-xl overflow-hidden">
          {events.length === 0 ? (
            <p className="p-8 text-center text-gray-500">No events yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-2 text-left">Title</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Size</th>
                  <th className="px-4 py-2 text-left">Max Teams</th>
                  <th className="px-4 py-2 text-left">Teams Formed</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {events.map((ev) => (
                  <tr key={ev._id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{ev.title}</td>
                    <td className="px-4 py-2 capitalize">{ev.type}</td>
                    <td className="px-4 py-2">
                      {ev.team_size_min}–{ev.team_size_max}
                    </td>
                    <td className="px-4 py-2">
                      {ev.max_teams != null ? (
                        ev.max_teams
                      ) : (
                        <span className="text-gray-400">Unlimited</span>
                      )}
                    </td>
                    <td className="px-4 py-2">{ev.teams_formed || 0}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded ${
                          ev.status === "published"
                            ? "bg-green-100 text-green-700"
                            : ev.status === "closed"
                              ? "bg-gray-200 text-gray-700"
                              : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {ev.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-1 flex-wrap">
                        <button
                          onClick={() => handleEdit(ev)}
                          className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded hover:bg-blue-700"
                        >
                          Edit
                        </button>
                        {ev.status === "draft" && (
                          <button
                            onClick={() => handlePublish(ev._id)}
                            className="text-xs bg-emerald-600 text-white px-2.5 py-1 rounded hover:bg-emerald-700"
                          >
                            Publish
                          </button>
                        )}
                        {ev.status === "published" && (
                          <>
                            <button
                              onClick={() => handleClose(ev._id)}
                              className="text-xs bg-orange-600 text-white px-2.5 py-1 rounded hover:bg-orange-700"
                            >
                              Close & Match
                            </button>
                            <button
                              onClick={() => handleRunMatching(ev._id)}
                              className="text-xs bg-purple-600 text-white px-2.5 py-1 rounded hover:bg-purple-700"
                            >
                              Run AI
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(ev._id, ev.title)}
                          className="text-xs bg-red-600 text-white px-2.5 py-1 rounded hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </PageShell>
  );
}
