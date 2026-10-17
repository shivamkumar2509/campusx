import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  fetchAnalytics,
  fetchAuditLogs,
  exportAnalyticsCSV,
  fetchStudents,
  approveStudent,
  suspendStudent,
  restoreStudent,
  deleteStudent,
} from "../api/admin";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import StudentTable from "../components/admin/StudentTable";
import CreateUserModal from "../components/admin/CreateUserModal";
import ClubRolesTab from "../components/admin/ClubRolesTab";

const TABS = [
  { key: "overview", label: "📊 Overview" },
  { key: "students", label: "👥 Students" },
  { key: "clubroles", label: "🎭 Club Roles" },
];

const LOGS_PAGE_SIZE = 20;
const STUDENTS_PAGE_SIZE = 20;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [error, setError] = useState("");

  // Overview state
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const [logs, setLogs] = useState([]);
  const [logsMeta, setLogsMeta] = useState(null);
  const [logsPage, setLogsPage] = useState(1);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState("");

  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState("");

  // Students tab state
  const [students, setStudents] = useState([]);
  const [studentsMeta, setStudentsMeta] = useState(null);
  const [studentsPage, setStudentsPage] = useState(1);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterBatch, setFilterBatch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterRole, setFilterRole] = useState("student");
  const [searchQ, setSearchQ] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // ===== Load analytics =====
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    let cancelled = false;

    fetchAnalytics()
      .then((res) => {
        if (!cancelled) setAnalytics(res.data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login", { replace: true });
          return;
        }
        if (err.response?.status === 403) {
          setError("Admin access required. Log in as an admin account.");
          return;
        }
        setError(err.response?.data?.message || "Failed to load analytics");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  // ===== Load audit logs =====
  useEffect(() => {
    if (activeTab !== "overview") return;
    let cancelled = false;
    setLogsLoading(true);
    setLogsError("");

    fetchAuditLogs({ page: logsPage, limit: LOGS_PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setLogs(res.data || []);
        setLogsMeta(res.meta);
      })
      .catch((err) => {
        if (cancelled) return;
        setLogsError(
          err.response?.data?.message || "Failed to load audit logs",
        );
      })
      .finally(() => {
        if (!cancelled) setLogsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [logsPage, activeTab]);

  // ===== Load students =====
  const loadStudents = useCallback(() => {
    setStudentsLoading(true);
    setStudentsError("");
    fetchStudents({
      page: studentsPage,
      limit: STUDENTS_PAGE_SIZE,
      role: filterRole,
      ...(filterYear ? { year: filterYear } : {}),
      ...(filterBatch ? { batch: filterBatch } : {}),
      ...(filterStatus ? { status: filterStatus } : {}),
      ...(searchQ.trim() ? { q: searchQ.trim() } : {}),
    })
      .then((res) => {
        setStudents(res.data || []);
        setStudentsMeta(res.meta);
      })
      .catch((err) => {
        setStudentsError(
          err.response?.data?.message || "Failed to load students",
        );
      })
      .finally(() => setStudentsLoading(false));
  }, [
    studentsPage,
    filterRole,
    filterYear,
    filterBatch,
    filterStatus,
    searchQ,
  ]);

  useEffect(() => {
    if (activeTab !== "students") return;
    loadStudents();
  }, [activeTab, loadStudents]);

  const handleExport = async () => {
    setExporting(true);
    setExportMsg("");
    try {
      const filename = await exportAnalyticsCSV();
      setExportMsg(`Exported: ${filename}`);
      setTimeout(() => setExportMsg(""), 4000);
    } catch (err) {
      setExportMsg(
        "Export failed: " + (err.response?.data?.message || err.message),
      );
    } finally {
      setExporting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  // ===== Action handlers =====
  const handleApprove = async (id) => {
    try {
      await approveStudent(id);
      loadStudents();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to approve");
    }
  };
  const handleSuspend = async (id) => {
    if (!window.confirm("Suspend this user?")) return;
    try {
      await suspendStudent(id);
      loadStudents();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to suspend");
    }
  };
  const handleRestore = async (id) => {
    try {
      await restoreStudent(id);
      loadStudents();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to restore");
    }
  };
  const handleDelete = async (id) => {
    try {
      await deleteStudent(id);
      loadStudents();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete");
    }
  };

  // ===== Loading / error =====
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner
          size="large"
          message="Loading admin analytics..."
          color="primary"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="max-w-md bg-white rounded-xl shadow-md p-8 text-center">
          <p className="text-5xl mb-4">🔒</p>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-sm text-gray-600 mb-6">{error}</p>
          <div className="flex justify-center gap-3">
            <Link
              to="/login"
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 font-medium text-sm"
            >
              Login
            </Link>
            <Link
              to="/"
              className="border border-gray-300 text-gray-700 px-5 py-2 rounded-lg hover:bg-gray-50 font-medium text-sm"
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const c = analytics?.counts || {};
  const activity = analytics?.activity_7d || [];
  const maxUsers = Math.max(1, ...activity.map((d) => d.users));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ===== NAVBAR ===== */}
      <nav className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="text-2xl font-bold text-indigo-600"
            >
              CampusX
            </Link>
            <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded">
              ADMIN
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* ===== HEADER ===== */}
        <div className="flex justify-between items-end flex-wrap gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Admin Dashboard
            </h1>
            <p className="mt-1 text-gray-600">
              System-wide analytics, user management and club roles.
            </p>
          </div>
          {activeTab === "overview" && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium text-sm flex items-center gap-2"
            >
              {exporting ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Exporting…
                </>
              ) : (
                <>📥 Export CSV</>
              )}
            </button>
          )}
          {activeTab === "students" && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 font-medium text-sm"
            >
              + Add user
            </button>
          )}
        </div>

        {/* ===== TABS ===== */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition ${
                activeTab === t.key
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {exportMsg && activeTab === "overview" && (
          <div className="mb-4 text-sm bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-lg">
            {exportMsg}
          </div>
        )}

        {/* ===== OVERVIEW TAB ===== */}
        {activeTab === "overview" && (
          <>
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard
                label="Total Users"
                value={c.users ?? 0}
                icon="👥"
                color="indigo"
                sub={`${c.students ?? 0} students · ${c.admins ?? 0} admins`}
              />
              <StatCard
                label="Teams"
                value={c.teams ?? 0}
                icon="🏆"
                color="emerald"
                sub={`${c.confirmed_teams ?? 0} confirmed`}
              />
              <StatCard
                label="Events"
                value={c.events ?? 0}
                icon="📅"
                color="amber"
                sub={`${c.published_events ?? 0} published`}
              />
              <StatCard
                label="Clubs"
                value={c.clubs ?? 0}
                icon="🎭"
                color="rose"
                sub={`${c.active_clubs ?? 0} active`}
              />
            </section>

            <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard
                label="Pending Approval"
                value={c.pending_approval ?? 0}
                icon="⏳"
                color="yellow"
              />
              <StatCard
                label="Suspended"
                value={c.suspended ?? 0}
                icon="🚫"
                color="gray"
              />
              <StatCard
                label="Club Applications"
                value={c.club_applications ?? 0}
                icon="📝"
                color="blue"
              />
              <StatCard
                label="Event Enrollments"
                value={c.enrollments ?? 0}
                icon="✋"
                color="pink"
              />
            </section>

            {/* Activity chart */}
            <section className="bg-white rounded-xl shadow-sm border p-6 mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Signups — Last 7 Days
                </h2>
                <span className="text-xs text-gray-500">
                  peak {maxUsers}/day
                </span>
              </div>
              <div className="flex items-end gap-2 h-40">
                {activity.map((d) => {
                  const h = (d.users / maxUsers) * 100;
                  return (
                    <div
                      key={d.date}
                      className="flex-1 flex flex-col items-center"
                    >
                      <div
                        className="w-full bg-indigo-500 rounded-t-md hover:bg-indigo-600 transition relative group"
                        style={{ height: `${Math.max(h, 3)}%` }}
                      >
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-gray-700 opacity-0 group-hover:opacity-100 transition">
                          {d.users}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-500 mt-1">
                        {d.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Audit logs */}
            <section className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Recent Audit Logs
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    All actions logged across the platform
                  </p>
                </div>
                {logsMeta && (
                  <span className="text-sm text-gray-500">
                    {logsMeta.total} total
                  </span>
                )}
              </div>

              {logsLoading && (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="medium" message="Loading logs..." />
                </div>
              )}

              {!logsLoading && logsError && (
                <div className="p-6 text-center text-red-600 text-sm">
                  {logsError}
                </div>
              )}

              {!logsLoading && !logsError && logs.length === 0 && (
                <div className="p-12 text-center text-gray-500">
                  <p className="text-4xl mb-3">📊</p>
                  <p className="font-medium">No audit logs yet</p>
                  <p className="text-sm mt-1">
                    Actions will appear here as users interact with the
                    platform.
                  </p>
                </div>
              )}

              {!logsLoading && !logsError && logs.length > 0 && (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold">
                            Time
                          </th>
                          <th className="px-4 py-2 text-left font-semibold">
                            User
                          </th>
                          <th className="px-4 py-2 text-left font-semibold">
                            Action
                          </th>
                          <th className="px-4 py-2 text-left font-semibold">
                            Entity
                          </th>
                          <th className="px-4 py-2 text-left font-semibold">
                            IP
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {logs.map((l) => (
                          <tr key={l._id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-gray-600 whitespace-nowrap">
                              {new Date(l.createdAt).toLocaleString()}
                            </td>
                            <td className="px-4 py-2">
                              <p className="font-medium text-gray-900">
                                {l.user_id?.name || "—"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {l.user_id?.email || ""}
                              </p>
                            </td>
                            <td className="px-4 py-2">
                              <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded">
                                {l.action}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-gray-600">
                              {l.entity_type || "—"}
                              {l.entity_id && (
                                <span className="text-xs text-gray-400 ml-1">
                                  · {String(l.entity_id).slice(-6)}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-gray-500 text-xs font-mono">
                              {l.ip_address || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {logsMeta && logsMeta.totalPages > 1 && (
                    <div className="px-6 py-4 border-t flex justify-center items-center gap-2">
                      <button
                        onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
                        disabled={logsPage === 1}
                        className="px-4 py-1.5 rounded-lg border border-gray-300 text-sm font-medium disabled:opacity-40 hover:bg-gray-50"
                      >
                        ← Prev
                      </button>
                      <span className="text-sm text-gray-600">
                        Page {logsPage} of {logsMeta.totalPages}
                      </span>
                      <button
                        onClick={() =>
                          setLogsPage((p) =>
                            Math.min(logsMeta.totalPages, p + 1),
                          )
                        }
                        disabled={logsPage >= logsMeta.totalPages}
                        className="px-4 py-1.5 rounded-lg border border-gray-300 text-sm font-medium disabled:opacity-40 hover:bg-gray-50"
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        )}

        {/* ===== STUDENTS TAB ===== */}
        {activeTab === "students" && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border p-4 mb-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Role
                  </label>
                  <select
                    value={filterRole}
                    onChange={(e) => {
                      setFilterRole(e.target.value);
                      setStudentsPage(1);
                    }}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="student">Students</option>
                    <option value="admin">Faculty / Admins</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Year
                  </label>
                  <select
                    value={filterYear}
                    onChange={(e) => {
                      setFilterYear(e.target.value);
                      setStudentsPage(1);
                    }}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All</option>
                    {[1, 2, 3, 4].map((y) => (
                      <option key={y} value={y}>
                        Year {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Batch
                  </label>
                  <input
                    type="number"
                    value={filterBatch}
                    onChange={(e) => {
                      setFilterBatch(e.target.value);
                      setStudentsPage(1);
                    }}
                    placeholder="e.g., 2024"
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => {
                      setFilterStatus(e.target.value);
                      setStudentsPage(1);
                    }}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All</option>
                    <option value="pending_approval">Pending approval</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Search
                  </label>
                  <input
                    type="text"
                    value={searchQ}
                    onChange={(e) => {
                      setSearchQ(e.target.value);
                      setStudentsPage(1);
                    }}
                    placeholder="name or email"
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <StudentTable
                students={students}
                loading={studentsLoading}
                error={studentsError}
                onApprove={handleApprove}
                onSuspend={handleSuspend}
                onRestore={handleRestore}
                onDelete={handleDelete}
              />
              {studentsMeta && studentsMeta.totalPages > 1 && (
                <div className="px-6 py-4 border-t flex justify-center items-center gap-2">
                  <button
                    onClick={() => setStudentsPage((p) => Math.max(1, p - 1))}
                    disabled={studentsPage === 1}
                    className="px-4 py-1.5 rounded-lg border border-gray-300 text-sm font-medium disabled:opacity-40 hover:bg-gray-50"
                  >
                    ← Prev
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {studentsPage} of {studentsMeta.totalPages} ·{" "}
                    {studentsMeta.total} total
                  </span>
                  <button
                    onClick={() =>
                      setStudentsPage((p) =>
                        Math.min(studentsMeta.totalPages, p + 1),
                      )
                    }
                    disabled={studentsPage >= studentsMeta.totalPages}
                    className="px-4 py-1.5 rounded-lg border border-gray-300 text-sm font-medium disabled:opacity-40 hover:bg-gray-50"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ===== CLUB ROLES TAB ===== */}
        {activeTab === "clubroles" && <ClubRolesTab />}
      </main>

      <footer className="mt-16 bg-white border-t py-6 text-center text-gray-500 text-sm">
        © 2026 CampusX · Admin Panel
      </footer>

      {showCreateModal && (
        <CreateUserModal
          onClose={() => {
            setShowCreateModal(false);
            loadStudents();
          }}
          onCreated={loadStudents}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color, sub }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
    pink: "bg-pink-50 text-pink-700 border-pink-100",
    gray: "bg-gray-50 text-gray-700 border-gray-200",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-100",
  };

  return (
    <div className={`p-4 rounded-xl border ${colors[color]}`}>
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span className="text-3xl font-bold">{value}</span>
      </div>
      <p className="mt-2 text-sm font-semibold">{label}</p>
      {sub && <p className="text-xs opacity-75 mt-0.5">{sub}</p>}
    </div>
  );
}
