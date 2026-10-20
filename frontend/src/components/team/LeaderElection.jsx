import { useState } from "react";
import {
  castLeaderVote,
  fetchTeamVotes,
  declareLeader,
} from "../../api/voting";
import useApiData from "../../hooks/useApiData";
import { ErrorState, LoadingBlock, EmptyState } from "../common/StateViews";

export default function LeaderElection({ teamId, members, isLeader }) {
  const votes = useApiData(() => fetchTeamVotes(teamId), [teamId]);
  const [casting, setCasting] = useState(false);
  const [declaring, setDeclaring] = useState(false);
  const [actionError, setActionError] = useState("");

  const acceptedMembers = (members || []).filter(
    (m) => m.status === "accepted",
  );

  const handleVote = async (candidateId) => {
    setActionError("");
    setCasting(true);
    try {
      await castLeaderVote(teamId, candidateId);
      votes.reload();
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to cast vote");
    } finally {
      setCasting(false);
    }
  };

  const handleDeclare = async () => {
    setActionError("");
    setDeclaring(true);
    try {
      await declareLeader(teamId);
      votes.reload();
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to declare");
    } finally {
      setDeclaring(false);
    }
  };

  if (votes.loading) {
    return (
      <div className="bg-white rounded-xl border p-6">
        <LoadingBlock lines={3} />
      </div>
    );
  }

  if (votes.error) {
    return <ErrorState message={votes.error.message} onRetry={votes.reload} />;
  }

  const data = votes.data || {};
  const hasVoted = data.has_voted;
  const totalVotes = data.total_votes || 0;
  const totalMembers = data.total_members || acceptedMembers.length;

  return (
    <div className="bg-white rounded-xl border p-6">
      <h2 className="text-xl font-bold mb-2">🗳️ Leader Election</h2>
      <p className="text-sm text-gray-600 mb-4">
        {totalVotes} of {totalMembers} members voted.
      </p>

      {actionError && (
        <p className="mb-4 text-sm bg-red-50 text-red-700 border border-red-200 rounded px-3 py-2">
          {actionError}
        </p>
      )}

      {hasVoted && data.your_vote && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded px-3 py-2 text-sm text-green-800">
          ✅ You voted for{" "}
          <strong>{data.your_vote.candidate_id?.name || "candidate"}</strong>
        </div>
      )}

      {!hasVoted && acceptedMembers.length > 0 && (
        <>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Vote for your leader:
          </p>
          <div className="grid sm:grid-cols-2 gap-2 mb-4">
            {acceptedMembers.map((m) => (
              <button
                key={m._id}
                onClick={() => handleVote(m.user_id)}
                disabled={casting}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-indigo-50 hover:border-indigo-300 disabled:opacity-60 text-left"
              >
                <img
                  src={
                    m.avatar_url ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name || "U")}&size=32&background=6366f1&color=fff`
                  }
                  alt=""
                  className="w-8 h-8 rounded-full"
                />
                <span className="font-medium">{m.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Results */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Results</h3>
        {(data.results || []).length === 0 ? (
          <EmptyState
            icon="🗳️"
            title="No votes yet"
            message="Be the first to vote!"
          />
        ) : (
          <ul className="space-y-2">
            {data.results.map((r) => (
              <li
                key={r.candidate._id}
                className="flex items-center justify-between bg-gray-50 rounded px-3 py-2"
              >
                <span className="font-medium">{r.candidate.name}</span>
                <span className="text-sm text-gray-600">{r.count} votes</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isLeader && totalVotes > 0 && (
        <button
          onClick={handleDeclare}
          disabled={declaring}
          className="mt-5 bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-60 text-sm font-semibold"
        >
          {declaring ? "Declaring..." : "Declare Leader"}
        </button>
      )}
    </div>
  );
}
