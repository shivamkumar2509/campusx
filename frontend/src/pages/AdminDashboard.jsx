import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  exportAnalyticsCsv,
  fetchAnalytics,
  fetchAuditLogs,
} from "../api/admin";
import PageShell from "../components/common/PageShell";
import { ErrorState, LoadingBlock } from "../components/common/StateViews";
import { clearSession, getErrorInfo } from "../utils/clubHelpers";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const handleExport = async () => {
    setExportError("");
    setExporting(true);
    try {
      await exportAnalyticsCsv();
    } catch (err) {
      setExportError(getErrorInfo(err).message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

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
        const info = getErrorInfo(err);
        if (info.status === 401) {
          clearSession();
          navigate("/login", { replace: true });
          return;
        }
        setError(info.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [retry, navigate]);

  return (
    <PageShell>
      {/* ===== HEADER ===== */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-gray-600">
            Platform overview and audit trail.
          </p>
        </div>

        {/* ===== ADMIN ACTIONS ===== */}
        <div className="flex flex-wrap items-center gap-2">
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
            onClick={handleExport}
            disabled={exporting}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700