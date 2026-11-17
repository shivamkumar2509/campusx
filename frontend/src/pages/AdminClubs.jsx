import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  createClub,
  updateClub,
  deleteClub,
  fetchClubRoles,
  assignSecretary,
  removeSecretary,
  addCoreMember,
  removeCoreMember,
  fetchStudents,
} from "../api/admin";
import api from "../api/axios";
import PageShell from "../components/common/PageShell";
import { ErrorState, LoadingBlock } from "../components/common/StateViews";

const extractList = (response, key) => {
  const payload = response?.data;
  const candidates = [
    payload?.[key],
    payload?.data?.[key],
    payload?.data,
    payload,
  ];
  return candidates.find(Array.isArray) || [];
};

const getUserId = (user) => String(user?._id || user?.id || "");
const getMemberUserId = (member) =>
  String(member?.user_id?._id || member?.user_id || "");

const TYPES = ["coding", "music", "dance", "drama", "robotics", "arts"];

export default function AdminClubs() {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    name: "",
    display_name: "",
    type: "coding",
    description: "",
    founded_year: "",
  });

  // ✅ Role Management States
  const [allStudents, setAllStudents] = useState([]);
  const [clubMembers, setClubMembers] = useState([]);
  const [roleSearchQuery, setRoleSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleAction, setRoleAction] = useState("secretary");
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  const roleDropdownRef = useRef(null);
  const [assigning, setAssigning] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!roleDropdownRef.current?.contains(event.target)) {
        setShowRoleDropdown(false);
      }
    };
    document.addEventListener("pointerdown", handleOutsideClick);
    return () =>
      document.removeEventListener("pointerdown", handleOutsideClick);
  }, []);

  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const loadClubs = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/clubs?limit=100");
      setClubs(data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load clubs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClubs();
  }, []);

  const resetForm = () => {
    setForm({
      name: "",
      display_name: "",
      type: "coding",
      description: "",
      founded_year: "",
    });
    setEditing(null);
    setShowForm(false);
    setActionError("");
    setActionSuccess("");
    setClubMembers([]);
    setSelectedUser(null);
    setRoleSearchQuery("");
    setShowRoleDropdown(false);
  };

  const handleEdit = async (club) => {
    setEditing(club);
    setForm({
      name: club.name,
      display_name: club.display_name || "",
      type: club.type,
      description: club.description || "",
      founded_year: club.founded_year || "",
    });
    setShowForm(true);
    setActionError("");
    setActionSuccess("");
    setRoleSearchQuery("");
    setSelectedUser(null);
    setShowRoleDropdown(false);
    setAllStudents([]);
    setClubMembers([]);
    setStudentsLoading(true);

    const [rolesResult, studentsResult] = await Promise.allSettled([
      fetchClubRoles(club._id),
      fetchStudents({ limit: 100, role: "student", status: "active" }),
    ]);

    if (rolesResult.status === "fulfilled") {
      setClubMembers(extractList(rolesResult.value, "members"));
    } else {
      setActionError("Could not load club roles. Please retry.");
      console.error("Club roles loading failed:", rolesResult.reason);
    }
    if (studentsResult.status === "fulfilled") {
      setAllStudents(extractList(studentsResult.value, "students"));
    } else {
      setActionError("Could not load students. Please retry.");
      console.error("Students loading failed:", studentsResult.reason);
    }
    setStudentsLoading(false);
  };

  const handleAssignRole = async () => {
    const userId = getUserId(selectedUser);
    if (!userId || !editing?._id || assigning) {
      if (!userId) setActionError("Please select a student from the list.");
      return;
    }
    setActionError("");
    setActionSuccess("");
    setAssigning(true);

    try {
      if (roleAction === "secretary") {
        await assignSecretary(editing._id, userId);
      } else {
        await addCoreMember(editing._id, userId);
      }
      setActionSuccess(
        `${selectedUser.name} is now ${roleAction === "secretary" ? "Secretary" : "Joint Secretary"}!`,
      );
      setSelectedUser(null);
      setRoleSearchQuery("");
      setShowRoleDropdown(false);
      try {
        const res = await fetchClubRoles(editing._id);
        setClubMembers(extractList(res, "members"));
      } catch (refreshError) {
        console.error("Role assigned, but refresh failed:", refreshError);
        setActionSuccess(
          "Role assigned successfully. Refresh the page to see updated leaders.",
        );
      }
    } catch (err) {
      console.error("Role assignment failed:", err);
      setActionError(
        err.response?.data?.message || err.message || "Failed to assign role",
      );
    } finally {
      setAssigning(false);
    }
  };

  // ✅ DIRECT REMOVE FUNCTION (Bina window.confirm ke, turant delete karega)
  const handleRemoveRole = async (userId, currentRole) => {
    setActionError("");
    setActionSuccess("");

    try {
      if (currentRole === "secretary") {
        await removeSecretary(editing._id, userId);
      } else {
        await removeCoreMember(editing._id, userId);
      }
      setActionSuccess(`User removed from ${currentRole} role.`);

      // Turant list refresh karo
      const res = await fetchClubRoles(editing._id);
      setClubMembers(extractList(res, "members"));
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to remove role");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setActionError("");
    try {
      if (editing) {
        await updateClub(editing._id, {
          display_name: form.display_name,
          type: form.type,
          description: form.description,
          founded_year: form.founded_year || null,
        });
      } else {
        await createClub({
          name: form.name,
          display_name: form.display_name || form.name,
          type: form.type,
          description: form.description,
          founded_year: form.founded_year || null,
        });
      }
      resetForm();
      loadClubs();
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete club "${name}"? This cannot be undone.`)) return;
    setActionError("");
    try {
      await deleteClub(id);
      loadClubs();
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to delete");
    }
  };

  const filteredStudents = allStudents.filter((student) => {
    const query = roleSearchQuery.trim().toLowerCase();
    return (
      String(student.name || "")
        .toLowerCase()
        .includes(query) ||
      String(student.email || "")
        .toLowerCase()
        .includes(query)
    );
  });

  return (
    <PageShell>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Clubs</h1>
          <p className="mt-1 text-gray-600">
            Create, edit, or remove campus clubs.
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
            + New Club
          </button>
        </div>
      </div>

      {actionError && (
        <p className="mb-4 text-sm bg-red-50 text-red-700 border border-red-200 rounded px-3 py-2">
          {actionError}
        </p>
      )}
      {actionSuccess && (
        <p className="mb-4 text-sm bg-green-50 text-green-700 border border-green-200 rounded px-3 py-2">
          {actionSuccess}
        </p>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border p-6 mb-6 space-y-3"
        >
          <h2 className="text-lg font-bold">
            {editing
              ? `Edit: ${editing.display_name || editing.name}`
              : "New Club"}
          </h2>

          {!editing && (
            <input
              type="text"
              placeholder="Internal name e.g. coding_club"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          )}

          <input
            type="text"
            placeholder="Display name e.g. Coding Club"
            value={form.display_name}
            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />

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
            <option value="custom">+ Custom Type...</option>
          </select>

          {form.type === "custom" && (
            <input
              type="text"
              placeholder="Enter custom type"
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              required
            />
          )}

          <textarea
            rows={2}
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="Founded year (optional)"
            value={form.founded_year}
            onChange={(e) => setForm({ ...form, founded_year: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />

          {/* ✅ MANAGE ROLES SECTION */}
          {editing && (
            <div className="pt-6 border-t mt-6 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3">
                  Add / Update Role
                </h3>
                <div className="flex gap-2 items-start">
                  {/* ✅ FIXED SEARCHABLE DROPDOWN */}
                  <div ref={roleDropdownRef} className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Search active student by name or email..."
                      value={roleSearchQuery}
                      onChange={(e) => {
                        setRoleSearchQuery(e.target.value);
                        setShowRoleDropdown(true);
                        setSelectedUser(null);
                      }}
                      onFocus={() => setShowRoleDropdown(true)}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                    {showRoleDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {studentsLoading ? (
                          <div className="p-3 text-sm text-gray-500">
                            Loading students...
                          </div>
                        ) : filteredStudents.length === 0 ? (
                          <div className="p-3 text-sm text-gray-500">
                            No students found.
                          </div>
                        ) : (
                          filteredStudents.map((s) => {
                            const existingMember = clubMembers.find(
                              (m) => getMemberUserId(m) === getUserId(s),
                            );
                            return (
                              <div
                                key={s._id}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                  if (!getUserId(s)) {
                                    setActionError(
                                      "Student ID missing in API response.",
                                    );
                                    return;
                                  }
                                  if (existingMember?.role === roleAction) {
                                    setActionError(
                                      "This student already has the selected role.",
                                    );
                                    return;
                                  }
                                  setActionError("");
                                  setSelectedUser(s);
                                  setRoleSearchQuery(s.name || s.email || "");
                                  setShowRoleDropdown(false);
                                }}
                                className={`p-3 border-b last:border-0 cursor-pointer flex justify-between items-center ${existingMember ? "bg-indigo-50/50 hover:bg-indigo-50" : "hover:bg-gray-50"}`}
                              >
                                <div>
                                  <p className="text-sm font-semibold text-gray-800">
                                    {s.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {s.year ? `Year: ${s.year} • ` : ""}
                                    {s.email}
                                  </p>
                                </div>
                                {existingMember && (
                                  <span className="text-xs bg-indigo-200 text-indigo-800 px-2 py-1 rounded font-bold uppercase">
                                    {existingMember.role.replace("_", " ")}
                                  </span>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  <select
                    value={roleAction}
                    onChange={(e) => setRoleAction(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm w-48"
                  >
                    <option value="secretary">Make Secretary</option>
                    <option value="core_member">Make Joint Secretary</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleAssignRole}
                    disabled={
                      !getUserId(selectedUser) || assigning || studentsLoading
                    }
                    className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                  >
                    {assigning ? "Assigning..." : "Assign"}
                  </button>
                </div>
              </div>

              {/* ✅ CURRENT LEADERS LIST */}
              {clubMembers.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3">
                    Current Club Leaders
                  </h3>
                  <div className="grid gap-2">
                    {clubMembers
                      .filter((m) =>
                        ["secretary", "core_member"].includes(m.role),
                      )
                      .map((m) => (
                        <div
                          key={m._id}
                          className="flex justify-between items-center bg-gray-50 border p-3 rounded-lg"
                        >
                          <div>
                            <p className="font-semibold text-sm">{m.name}</p>
                            <p className="text-xs text-gray-500">{m.email}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`text-xs px-2 py-1 rounded font-bold uppercase ${m.role === "secretary" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}
                            >
                              {m.role === "secretary"
                                ? "Secretary"
                                : "Joint Secretary"}
                            </span>
                            <button
                              onClick={() =>
                                handleRemoveRole(getMemberUserId(m), m.role)
                              }
                              className="text-xs border border-red-200 text-red-600 px-3 py-1.5 rounded hover:bg-red-50 font-semibold"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    {clubMembers.filter((m) =>
                      ["secretary", "core_member"].includes(m.role),
                    ).length === 0 && (
                      <p className="text-sm text-gray-500">
                        No Secretary or Joint Secretary assigned yet.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={resetForm}
              className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Club Details"}
            </button>
          </div>
        </form>
      )}

      {loading && (
        <div className="bg-white border rounded-xl p-6">
          <LoadingBlock lines={4} />
        </div>
      )}
      {!error && !loading && (
        <div className="bg-white border rounded-xl overflow-hidden">
          {clubs.length === 0 ? (
            <p className="p-8 text-center text-gray-500">No clubs yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Members</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {clubs.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <Link
                        to={`/clubs/${c._id}`}
                        className="font-medium text-gray-900 hover:text-indigo-600"
                      >
                        {c.display_name || c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 capitalize">{c.type}</td>
                    <td className="px-4 py-2">{c.member_count || 0}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded ${c.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"}`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleEdit(c)}
                          className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded hover:bg-blue-700"
                        >
                          Manage Roles & Edit
                        </button>
                        <button
                          onClick={() =>
                            handleDelete(c._id, c.display_name || c.name)
                          }
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
