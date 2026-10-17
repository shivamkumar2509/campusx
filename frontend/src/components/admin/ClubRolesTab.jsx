import { useEffect, useState } from "react";
import api from "../../api/axios";
import {
  fetchClubRoles,
  assignSecretary,
  removeSecretary,
  addCoreMember,
  removeCoreMember,
} from "../../api/admin";

const ROLE_LABELS = {
  secretary: { label: "Secretary", color: "bg-purple-100 text-purple-700" },
  core_member: {
    label: "Joint Secretary / Core",
    color: "bg-blue-100 text-blue-700",
  },
  member: { label: "Member", color: "bg-gray-100 text-gray-700" },
};

export default function ClubRolesTab() {
  const [clubs, setClubs] = useState([]);
  const [clubId, setClubId] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingClubs, setLoadingClubs] = useState(true);
  const [actionError, setActionError] = useState("");
  const [actionOk, setActionOk] = useState("");
  const [searchUser, setSearchUser] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Load clubs (limit 100)
  useEffect(() => {
    api
      .get("/clubs?limit=100")
      .then(({ data }) => {
        const list = data.data || [];
        setClubs(list);
        if (list.length > 0) setClubId(list[0]._id);
      })
      .catch(() => {})
      .finally(() => setLoadingClubs(false));
  }, []);

  // Load roles for selected club
  useEffect(() => {
    if (!clubId) return;
    setLoading(true);
    setActionError("");
    fetchClubRoles(clubId)
      .then((res) => setData(res.data))
      .catch((err) =>
        setActionError(
          err.response?.data?.message || "Failed to load club roles",
        ),
      )
      .finally(() => setLoading(false));
  }, [clubId]);

  // Search users (debounced)
  useEffect(() => {
    const q = searchUser.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(() => {
      api
        .get("/admin/students", {
          params: { q, status: "active", limit: 5 },
        })
        .then(({ data }) => {
          if (!cancelled) setSearchResults(data.data || []);
        })
        .catch(() => {
          if (!cancelled) setSearchResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [searchUser]);

  const reload = () => {
    if (!clubId) return;
    fetchClubRoles(clubId)
      .then((res) => setData(res.data))
      .catch(() => {});
  };

  const handleAssignSecretary = async (userId) => {
    setActionError("");
    setActionOk("");
    try {
      await assignSecretary(clubId, userId);
      setActionOk("Secretary assigned");
      setSearchUser("");
      setSearchResults([]);
      reload();
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to assign");
    }
  };

  const handleRemoveSecretary = async (userId) => {
    if (!window.confirm("Remove this secretary?")) return;
    setActionError("");
    setActionOk("");
    try {
      await removeSecretary(clubId, userId);
      setActionOk("Secretary removed");
      reload();
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to remove");
    }
  };

  const handleAddCore = async (userId) => {
    setActionError("");
    setActionOk("");
    try {
      await addCoreMember(clubId, userId);
      setActionOk("Core member added");
      setSearchUser("");
      setSearchResults([]);
      reload();
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to add");
    }
  };

  const handleRemoveCore = async (userId) => {
    if (!window.confirm("Remove this core member?")) return;
    setActionError("");
    setActionOk("");
    try {
      await removeCoreMember(clubId, userId);
      setActionOk("Core member removed");
      reload();
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to remove");
    }
  };

  if (loadingClubs) {
    return (
      <div className="flex justify-center py-12">
        <div className="inline-block w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (clubs.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-gray-500">
        <p className="text-4xl mb-3">🎭</p>
        <p className="font-medium">No clubs yet</p>
        <p className="text-sm mt-1">
          Clubs must be created before roles can be assigned.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Club picker */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <label className="block text-sm font-semibold mb-2">Select club</label>
        <select
          value={clubId}
          onChange={(e) => setClubId(e.target.value)}
          className="w-full md:w-96 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {clubs.map((c) => (
            <option key={c._id} value={c._id}>
              {c.display_name || c.name} — {c.type}
            </option>
          ))}
        </select>
      </div>

      {actionError && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {actionError}
        </div>
      )}
      {actionOk && (
        <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2">
          ✅ {actionOk}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <div className="inline-block w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      )}

      {!loading && data && (
        <>
          {/* Add user search */}
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              Add user to club
            </h3>
            <input
              type="text"
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              placeholder="Search active users by name or email…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searching && (
              <p className="text-xs text-gray-500 mt-2">Searching…</p>
            )}
            {searchResults.length > 0 && (
              <div className="mt-3 border border-gray-200 rounded-lg divide-y max-h-64 overflow-y-auto">
                {searchResults.map((u) => {
                  const existing = (data.members || []).find(
                    (m) => String(m.user_id) === String(u._id),
                  );
                  const isSecretary = existing && existing.role === "secretary";
                  const isCore = existing && existing.role === "core_member";
                  const isMember = existing && existing.role === "member";
                  return (
                    <div
                      key={u._id}
                      className="px-3 py-2 flex justify-between items-center gap-3 hover:bg-gray-50"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {u.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate font-mono">
                          {u.email}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {!isSecretary && (
                          <button
                            onClick={() => handleAssignSecretary(u._id)}
                            className="text-xs bg-purple-600 text-white px-2.5 py-1 rounded hover:bg-purple-700"
                          >
                            Make Secretary
                          </button>
                        )}
                        {!isCore && !isSecretary && (
                          <button
                            onClick={() => handleAddCore(u._id)}
                            className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded hover:bg-blue-700"
                          >
                            + Core Member
                          </button>
                        )}
                        {(isSecretary || isCore || isMember) && (
                          <span className="text-xs text-gray-500 px-2 py-1">
                            already in club
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {searchUser.trim().length >= 2 &&
              !searching &&
              searchResults.length === 0 && (
                <p className="text-xs text-gray-500 mt-2">No matches.</p>
              )}
          </div>

          {/* Roles table */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">Current roles</h3>
            </div>
            {data.members.length === 0 ? (
              <div className="p-10 text-center text-gray-500 text-sm">
                No members yet in this club.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">
                        Name
                      </th>
                      <th className="px-4 py-2 text-left font-semibold">
                        Email
                      </th>
                      <th className="px-4 py-2 text-left font-semibold">
                        Role
                      </th>
                      <th className="px-4 py-2 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.members.map((m) => {
                      const roleMeta =
                        ROLE_LABELS[m.role] || ROLE_LABELS.member;
                      return (
                        <tr key={m._id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium text-gray-900">
                            {m.name || "—"}
                          </td>
                          <td className="px-4 py-2 text-xs font-mono text-gray-600">
                            {m.email}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`text-xs font-semibold px-2 py-0.5 rounded ${roleMeta.color}`}
                            >
                              {roleMeta.label}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right">
                            {m.role === "secretary" && (
                              <button
                                onClick={() => handleRemoveSecretary(m.user_id)}
                                className="text-xs bg-yellow-600 text-white px-2.5 py-1 rounded hover:bg-yellow-700"
                              >
                                Demote
                              </button>
                            )}
                            {m.role === "core_member" && (
                              <button
                                onClick={() => handleRemoveCore(m.user_id)}
                                className="text-xs bg-red-600 text-white px-2.5 py-1 rounded hover:bg-red-700"
                              >
                                Remove core
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
