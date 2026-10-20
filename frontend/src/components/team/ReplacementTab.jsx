import { useState } from "react";
import {
  fetchReplacements,
  findReplacement,
  inviteReplacement,
} from "../../api/replacements";
import useApiData from "../../hooks/useApiData";
import { ErrorState, LoadingBlock, EmptyState } from "../common/StateViews";

export default function ReplacementTab({ teamId, members }) {
  const replacements = useApiData(() => fetchReplacements(teamId), [teamId]);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState(null);
  const [actionError, setActionError] = useState("");
  const [selectedMember, setSelectedMember] = useState("");

  const acceptedMembers = (members || []).filter(
    (m) => m.status === "accepted",
  );

  const handleFind = async () => {
    setActionError("");
    setSearching(true);
    try {
      await findReplacement(teamId, {
        replacing_user_id: selectedMember || undefined,
      });
      replacements.reload();
    } catch (err) {
      setActionError(
        err.response?.data?.message || "Failed to find replacements",
      );
    } finally {
      setSearching(false);
    }
  };

  const handleInvite = async (suggestionId) => {
    setActionError("");
    setInviting(suggestionId);
    try {
      await inviteReplacement(teamId, suggestionId);
      replacements.reload();
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to invite");
    } finally {
      setInviting(null);
    }
  };

  if (replacements.loading) {
    return (
      <div className="bg-white rounded-xl border p-6">
        <LoadingBlock lines={3} />
      </div>
    );
  }

  if (replacements.error) {
    return (
      <ErrorState
        message={replacements.error.message}
        onRetry={replacements.reload}
      />
    );
  }

  const items = replacements.data || [];

  return (
    <div className="bg-white rounded-xl border p-6 space-y-5">
      <div>
        <h2 className="text-xl font-bold">🔄 Find Replacement</h2>
        <p className="text-sm text-gray-600 mt-1">
          AI will suggest the best available candidates for your team.
        </p>
      </div>

      {actionError && (
        <p className="text-sm bg-red-50 text-red-700 border border-red-200 rounded px-3 py-2">
          {actionError}
        </p>
      )}

      <div className="bg-gray-50 rounded-lg p-4 flex flex-wrap items-center gap-3">
        <select
          value={selectedMember}
          onChange={(e) => setSelectedMember(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">(No one leaving — just find best fits)</option>
          {acceptedMembers.map((m) => (
            <option key={m._id} value={m.user_id}>
              {m.name} is leaving
            </option>
          ))}
        </select>
        <button
          onClick={handleFind}
          disabled={searching}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-60 text-sm font-semibold"
        >
          {searching ? "Searching..." : "🔍 Find Replacements"}
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No suggestions"
          message="Click 'Find Replacements' to search for candidates."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((s) => (
            <li key={s._id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <img
                    src={
                      s.candidate_id?.avatar_url ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        s.candidate_id?.name || "U",
                      )}&size=40&background=6366f1&color=fff`
                    }
                    alt=""
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <p className="font-semibold">{s.candidate_id?.name}</p>
                    <p className="text-xs text-gray-500">
                      Year {s.candidate_id?.year || "?"} ·{" "}
                      {s.candidate_id?.experience_level || "beginner"}
                    </p>
                    {s.reasoning && (
                      <p className="text-sm text-gray-600 mt-1">
                        {s.reasoning}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-indigo-600">
                    {Math.round((s.score || 0) * 100)}%
                  </p>
                  <p className="text-xs text-gray-500">match</p>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => handleInvite(s._id)}
                  disabled={inviting === s._id || s.status !== "pending"}
                  className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-60 font-medium"
                >
                  {s.status !== "pending"
                    ? s.status
                    : inviting === s._id
                      ? "Inviting..."
                      : "Send Invitation"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
