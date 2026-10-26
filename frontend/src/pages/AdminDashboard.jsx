import { useEffect, useState } from "react";
import {
  exportAnalyticsCsv,
  fetchAnalytics,
  fetchAuditLogs,
} from "../api/admin";
import PageShell from "../components/common/PageShell";
import { ErrorState, LoadingBlock } from "../components/common/StateViews";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const [a, l] = await Promise.all([
          fetchAnalytics(),
          fetchAuditLogs({ limit: 20 }),
        ]);
        setAnalytics(a);
        setLogs(l.data || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load admin data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <PageShell>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-gray-600">
            Platform overview and audit trail.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/admin/events"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            📅 Manage Events
          </Link>
          <Link
            to="/admin/users"
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm font-medium"
          >
            👥 Manage Users
          </Link>
          <Link
            to="/admin/clubs"
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm font-medium"
          >
            🎭 Manage Clubs
          </Link>
          <Link
            to="/admin/broadcast"
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 text-sm font-medium"
          >
            📢 Broadcast
          </Link>
          <button
            onClick={exportAnalyticsCsv}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium"
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {loading && (
        <div className="bg-white border rounded-xl p-8">
          <LoadingBlock lines={4} />
        </div>
      )}
      {!loading && error && <ErrorState message={error} />}

      {!loading && !error && analytics && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Stat
              label="Total Users"
              value={analytics.users.total}
              sub={`${analytics.users.students} students · ${analytics.users.admins} admins`}
            />
            <Stat
              label="Teams"
              value={analytics.teams.total}
              sub={`${analytics.teams.confirmed} confirmed`}
            />
            <Stat
              label="Events"
              value={analytics.events.total}
              sub={`${analytics.events.published} published`}
            />
            <Stat
              label="Avg Rating"
              value={analytics.feedback.average_rating}
              sub={`${analytics.feedback.total} reviews`}
            />
          </div>

          <section className="bg-white border rounded-xl">
            <div className="p-5 border-b">
              <h2 className="text-lg font-bold">Recent Audit Logs</h2>
              <p className="text-sm text-gray-500 mt-1">
                Latest platform activities and administrative actions.
              </p>
            </div>
            {logs.length === 0 ? (
              <p className="p-6 text-gray-500">No audit log entries yet.</p>
            ) : (
              <ul className="divide-y">
                {logs.map((log) => (
                  <li
                    key={log._id}
                    className="p-4 flex justify-between items-start gap-3"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{log.action}</p>
                      <p className="text-sm text-gray-600">
                        {log.user_id?.name || "Unknown"} ·{" "}
                        {log.entity_type || "—"}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {log.createdAt
                        ? new Date(log.createdAt).toLocaleString()
                        : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </PageShell>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="bg-white border rounded-xl p-4">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}
