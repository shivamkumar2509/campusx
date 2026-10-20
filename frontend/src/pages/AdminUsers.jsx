import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import PageShell from "../components/common/PageShell";
import StudentTable from "../components/admin/StudentTable";
import CreateUserModal from "../components/admin/CreateUserModal";

export default function AdminUsers() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const params = { limit: 100 };
      if (statusFilter) params.status = statusFilter;
      if (roleFilter) params.role = roleFilter;
      if (query.trim()) params.q = query.trim();
      const { data } = await api.get("/admin/students", { params });
      setStudents(data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, roleFilter]);

  const handleApprove = async (id) => {
    await api.patch(`/admin/users/${id}/approve`);
    fetchUsers();
  };
  const handleSuspend = async (id) => {
    await api.patch(`/admin/users/${id}/suspend`);
    fetchUsers();
  };
  const handleRestore = async (id) => {
    await api.patch(`/admin/users/${id}/restore`);
    fetchUsers();
  };
  const handleDelete = async (id) => {
    await api.delete(`/admin/users/${id}`);
    fetchUsers();
  };
  const handleView = (id) => {
    window.open(`/users/${id}`, "_blank");
  };

  return (
    <PageShell>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Users</h1>
          <p className="mt-1 text-gray-600">
            Approve, suspend, or remove student and admin accounts.
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
            onClick={() => setShowCreate(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium"
          >
            + Add User
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search by name or email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchUsers()}
          className="flex-1 min-w-[240px] border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-4 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="pending_approval">Pending</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border rounded-lg px-4 py-2 text-sm"
        >
          <option value="">All roles</option>
          <option value="student">Students</option>
          <option value="admin">Admins</option>
        </select>
        <button
          onClick={fetchUsers}
          className="border rounded-lg px-4 py-2 text-sm hover:bg-gray-50"
        >
          🔄 Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <StudentTable
          students={students}
          loading={loading}
          error={error}
          onApprove={handleApprove}
          onSuspend={handleSuspend}
          onRestore={handleRestore}
          onDelete={handleDelete}
          onView={handleView}
        />
      </div>

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            fetchUsers();
          }}
        />
      )}
    </PageShell>
  );
}
