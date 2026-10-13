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
  const [finding, setFinding] = useState(false);
  const [invitingId, setInvitingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedReplacing, setSelectedReplacing] = useState("");

  const handleFindReplacement = async () => {
    setFinding(true);
    setError("");
    setSuccess("");
    try {
      const results = await findReplacement(teamId, {
        replacing_user_id: selectedReplacing || undefined,
      });
      if (results.length === 0) {
        setSuccess("No suitable candidates found right now.");
      } else {
        setSuccess(`Found ${results.length} replacement candidates!`);
      }
      replacements.reload();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to find replacements");
    } finally {
      setFinding(false);
    }
  };

  const handleInvite = async (suggestionId) => {
    setInvitingId(suggestionId);
    setError("");
    setSuccess("");
    try {
      await inviteReplacement(teamId, suggestionId);
      setSuccess("Invitation sent successfully!");
      replacements.reload();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send invite");
    } finally {
      setInvitingId(null);
    }
  };

  if (replacements.loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <LoadingBlock lines={4} />
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

  const suggestions = replacements.data || [];
  const activeMembers = members.filter((m) => m.status === "accepted");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">🔄 Find Replacement</h2>
            <p className="text-sm text-gray-500 mt-1">
              AI-powered candidate matching for your team
            </p>
          </div>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}
        {success && (
          <p className="mt-3 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
            {success}
          </p>
        )}

        {/* Find replacement form */}
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-sm font-semibold mb-1">
              Replacing member (optional)
            </label>
            <select
              value={selectedReplacing}
              onChange={(e) => setSelectedReplacing(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Any open position</option>
              {activeMembers.map((m) => (
                <option key={m._id} value={m.user_id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleFindReplacement}
            disabled={finding}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 text-sm font-semibold disabled:opacity-50"
          >
            {finding ? "Searching..." : "🤖 Find Candidates"}
          </button>
        </div>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-bold mb-4 text-lg">
            Suggested Candidates ({suggestions.length})
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {suggestions.map((s) => (
              <div
                key={s._id}
                className="border rounded-xl p-4 hover:shadow-md transition"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={
                      s.candidate_id?.avatar_url ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(s.candidate_id?.name || "?")}&background=6366f1&color=fff&size=48`
                    }
                    alt={s.candidate_id?.name}
                    className="w-12 h-12 rounded-full"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{s.candidate_id?.name}</p>
                      <span className="text-sm font-bold text-indigo-600">
                        {Math.round(s.score * 100)}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Year {s.candidate_id?.year} ·{" "}
                      {s.candidate_id?.experience_level || "beginner"}
                    </p>
                  </div>
                </div>

                {s.reasoning && (
                  <p className="mt-3 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    {s.reasoning}
                  </p>
                )}

                {s.role_needed && (
                  <p className="mt-2 text-xs text-gray-500">
                    Role: {s.role_needed}
                  </p>
                )}

                <button
                  onClick={() => handleInvite(s._id)}
                  disabled={invitingId === s._id || s.status === "accepted"}
                  className="mt-3 w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 text-sm font-semibold disabled:opacity-50"
                >
                  {s.status === "accepted"
                    ? "✅ Invited"
                    : invitingId === s._id
                      ? "Sending..."
                      : "📩 Send Invite"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {suggestions.length === 0 && (
        <EmptyState
          icon="🔄"
          title="No replacements yet"
          message='Click "Find Candidates" to search for suitable team members.'
        />
      )}
    </div>
  );
}