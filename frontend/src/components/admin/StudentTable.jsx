import { useState } from "react";

const STATUS_BADGES = {
  active: "bg-emerald-100 text-emerald-700",
  pending_approval: "bg-yellow-100 text-yellow-800",
  suspended: "bg-red-100 text-red-700",
};

const ROLE_BADGES = {
  admin: "bg-purple-100 text-purple-700",
  student: "bg-indigo-100 text-indigo-700",
};

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function StudentTable({
  students,
  loading,
  error,
  onApprove,
  onSuspend,
  onRestore,
  onDelete,
  onView,
}) {
  const [busyId, setBusyId] = useState(null);

  const handleAction = async (actionFn, id) => {
    setBusyId(id);
    try {
      await actionFn(id);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="inline-block w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-center text-red-600 text-sm">{error}</div>;
  }

  if (!students || students.length === 0) {
    return (
      <div className="p-12 text-center text-gray-500">
        <p className="text-4xl mb-3">👥</p>
        <p className="font-medium">No users found</p>
        <p className="text-sm mt-1">Adjust filters or create a new account.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
          <tr>
            <th className="px-4 py-2 text-left font-semibold">Name</th>
            <th className="px-4 py-2 text-left font-semibold">Email</th>
            <th className="px-4 py-2 text-left font-semibold">Role</th>
            <th className="px-4 py-2 text-left font-semibold">Year</th>
            <th className="px-4 py-2 text-left font-semibold">Batch</th>
            <th className="px-4 py-2 text-left font-semibold">Status</th>
            <th className="px-4 py-2 text-left font-semibold">Joined</th>
            <th className="px-4 py-2 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {students.map((u) => (
            <tr key={u._id} className="hover:bg-gray-50">
              <td className="px-4 py-2">
                <button
                  onClick={() => onView && onView(u._id)}
                  className="font-medium text-gray-900 hover:text-indigo-600 text-left"
                >
                  {u.name}
                </button>
              </td>
              <td className="px-4 py-2 text-gray-600 text-xs font-mono">
                {u.email}
              </td>
              <td className="px-4 py-2">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded ${ROLE_BADGES[u.role] || "bg-gray-100 text-gray-700"}`}
                >
                  {u.role}
                </span>
              </td>
              <td className="px-4 py-2 text-gray-700">
                {u.role === "student" ? u.year || "—" : "—"}
              </td>
              <td className="px-4 py-2 text-gray-700">
                {u.role === "student" ? u.batch || "—" : "—"}
              </td>
              <td className="px-4 py-2">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded ${STATUS_BADGES[u.status] || "bg-gray-100 text-gray-700"}`}
                >
                  {u.status === "pending_approval" ? "pending" : u.status}
                </span>
              </td>
              <td className="px-4 py-2 text-gray-500 text-xs">
                {fmtDate(u.createdAt)}
              </td>
              <td className="px-4 py-2 text-right">
                <div className="flex justify-end gap-1 flex-wrap">
                  {u.status === "pending_approval" && (
                    <button
                      onClick={() => handleAction(onApprove, u._id)}
                      disabled={busyId === u._id}
                      className="text-xs bg-emerald-600 text-white px-2.5 py-1 rounded hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {busyId === u._id ? "…" : "Approve"}
                    </button>
                  )}
                  {u.status === "active" && (
                    <button
                      onClick={() => handleAction(onSuspend, u._id)}
                      disabled={busyId === u._id}
                      className="text-xs bg-yellow-600 text-white px-2.5 py-1 rounded hover:bg-yellow-700 disabled:opacity-50"
                    >
                      {busyId === u._id ? "…" : "Suspend"}
                    </button>
                  )}
                  {u.status === "suspended" && (
                    <button
                      onClick={() => handleAction(onRestore, u._id)}
                      disabled={busyId === u._id}
                      className="text-xs bg-emerald-600 text-white px-2.5 py-1 rounded hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {busyId === u._id ? "…" : "Restore"}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          `Permanently delete ${u.name}? This cannot be undone.`,
                        )
                      ) {
                        handleAction(onDelete, u._id);
                      }
                    }}
                    disabled={busyId === u._id}
                    className="text-xs bg-red-600 text-white px-2.5 py-1 rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    {busyId === u._id ? "…" : "Delete"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
