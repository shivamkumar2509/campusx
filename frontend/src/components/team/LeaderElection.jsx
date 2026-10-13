import { useState } from "react";
import { castLeaderVote, fetchTeamVotes, declareLeader } from "../../api/voting";
import useApiData from "../../hooks/useApiData";
import { ErrorState, LoadingBlock } from "../common/StateViews";

export default function LeaderElection({ teamId, members, isLeader }) {
  const votes = useApiData(() => fetchTeamVotes(teamId), [teamId]);
  const [voting, setVoting] = useState(false);
  const [declaring, setDeclaring] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleVote = async (candidateId) => {
    setVoting(true);
    setError("");
    setSuccess("");
    try {
      await castLeaderVote(teamId, candidateId);
      setSuccess("Vote cast successfully!");
      votes.reload();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to cast vote");
    } finally {
      setVoting(false);
    }
  };

  const handleDeclare = async () => {
    if (!confirm("Declare the leader based on current votes?")) return;
    setDeclaring(true);
    setError("");
    try {
      const result = await declareLeader(teamId);
      setSuccess(`${result.leader_name} has been declared leader!`);
      votes.reload();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to declare leader");
    } finally {
      setDeclaring(false);
    }
  };

  const acceptedMembers = members.filter((m) => m.status === "accepted");

  if (votes.loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <LoadingBlock lines={4} />
      </div>
    );
  }

  if (votes.error) {
    return (
      <ErrorState message={votes.error.message} onRetry={votes.reload} />
    );
  }

  const voteData = votes.data;
  const hasVoted = voteData.has_voted;
  const yourVote = voteData.your_vote;
  const results = voteData.results || [];
  const totalVotes = voteData.total_votes || 0;
  const totalMembers = voteData.total_members || 0;

  return (
    <div className="space-y-6">
      {/* Status card */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">🗳️ Leader Election</h2>
            <p className="text-sm text-gray-500 mt-1">
              {totalVotes} of {totalMembers} members have voted
            </p>
          </div>
          {isLeader && totalVotes > 0 && (
            <button
              onClick={handleDeclare}
              disabled={declaring}
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 text-sm font-semibold disabled:opacity-50"
            >
              {declaring ? "Declaring..." : "Declare Leader"}
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all"
              style={{
                width: `${totalMembers > 0 ? (totalVotes / totalMembers) * 100 : 0}%`,
              }}
            />
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
      </div>

      {/* Vote results */}
      {results.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-bold mb-4">Current Standings</h3>
          <div className="space-y-3">
            {results.map((r, idx) => (
              <div
                key={r.candidate._id}
                className="flex items-center gap-3"
              >
                <span className="text-lg font-bold text-gray-400 w-6">
                  #{idx + 1}
                </span>
                <img
                  src={
                    r.candidate.avatar_url ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(r.candidate.name)}&background=6366f1&color=fff&size=40`
                  }
                  alt={r.candidate.name}
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex-1">
                  <p className="font-semibold">{r.candidate.name}</p>
                </div>
                <span className="text-lg font-bold text-indigo-600">
                  {r.count} votes
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vote buttons */}
      {!hasVoted && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-bold mb-4">Cast Your Vote</h3>
          <p className="text-sm text-gray-500 mb-4">
            Select a candidate for team leader:
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {acceptedMembers.map((m) => (
              <button
                key={m._id}
                onClick={() => handleVote(m.user_id)}
                disabled={voting}
                className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition text-left disabled:opacity-50"
              >
                <img
                  src={
                    m.avatar_url ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=6366f1&color=fff&size=40`
                  }
                  alt={m.name}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className="font-semibold">{m.name}</p>
                  <p className="text-xs text-gray-500">
                    Year {m.year} · {m.experience_level || "beginner"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {hasVoted && yourVote && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm text-green-800">
            ✅ You voted for{" "}
            <strong>{yourVote.candidate_id?.name}</strong>
          </p>
        </div>
      )}
    </div>
  );
}