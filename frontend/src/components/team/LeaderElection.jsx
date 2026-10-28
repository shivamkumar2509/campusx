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
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [declaring, setDeclaring] = useState(false);
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const acceptedMembers = (members || []).filter(
    (member) => member.status === "accepted",
  );

  const data = votes.data || {};
  const results = data.results || [];
  const hasVoted = Boolean(data.has_voted);
  const totalVotes = Number(data.total_votes || 0);
  const totalMembers = Number(data.total_members ?? acceptedMembers.length);
  const remainingVotes = Math.max(0, totalMembers - totalVotes);

  const allMembersVoted = totalMembers > 0 && totalVotes >= totalMembers;

  const hasTie =
    results.length > 1 && Number(results[0].count) === Number(results[1].count);

  const handleVote = async (candidateId) => {
    if (casting || hasVoted) return;

    setActionError("");
    setSuccessMessage("");
    setSelectedCandidate(candidateId);
    setCasting(true);

    try {
      await castLeaderVote(teamId, candidateId);
      setSuccessMessage("Your vote has been submitted successfully.");
      await votes.reload();
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to cast vote.");
    } finally {
      setCasting(false);
      setSelectedCandidate("");
    }
  };

  const handleDeclare = async () => {
    if (declaring) return;

    if (!isLeader) {
      setActionError(
        "Only the current team leader can declare the election result.",
      );
      return;
    }

    if (totalVotes === 0) {
      setActionError("No votes have been cast yet.");
      return;
    }

    if (!allMembersVoted) {
      setActionError(
        "Every accepted team member must vote before the result can be declared.",
      );
      return;
    }

    if (hasTie) {
      setActionError(
        "The election is tied. A tie-break election is required before declaring a leader.",
      );
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to declare the election winner?",
    );

    if (!confirmed) return;

    setActionError("");
    setSuccessMessage("");
    setDeclaring(true);

    try {
      await declareLeader(teamId);
      setSuccessMessage("The team leader has been declared successfully.");
      await votes.reload();
    } catch (err) {
      setActionError(
        err.response?.data?.message || "Failed to declare the leader.",
      );
      await votes.reload();
    } finally {
      setDeclaring(false);
    }
  };

  if (votes.loading) {
    return (
      <div className="rounded-xl border bg-white p-6">
        <LoadingBlock lines={3} />
      </div>
    );
  }

  if (votes.error) {
    return <ErrorState message={votes.error.message} onRetry={votes.reload} />;
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            🗳️ Leader Election
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            {totalVotes} of {totalMembers} members voted.
          </p>
        </div>

        <button
          type="button"
          onClick={() => votes.reload()}
          className="rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ↻ Refresh
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-indigo-50 p-4">
          <p className="text-sm text-indigo-700">Votes Cast</p>
          <p className="mt-1 text-2xl font-bold text-indigo-900">
            {totalVotes}
          </p>
        </div>

        <div className="rounded-lg bg-amber-50 p-4">
          <p className="text-sm text-amber-700">Votes Remaining</p>
          <p className="mt-1 text-2xl font-bold text-amber-900">
            {remainingVotes}
          </p>
        </div>

        <div
          className={`rounded-lg p-4 ${
            allMembersVoted ? "bg-green-50" : "bg-gray-50"
          }`}
        >
          <p className="text-sm text-gray-600">Election Status</p>
          <p
            className={`mt-1 font-bold ${
              allMembersVoted ? "text-green-700" : "text-gray-800"
            }`}
          >
            {allMembersVoted ? "All Votes Cast" : "In Progress"}
          </p>
        </div>
      </div>

      {actionError && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {actionError}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          ✓ {successMessage}
        </div>
      )}

      <div className="mt-6">
        {hasVoted ? (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            ✓ You voted for{" "}
            <strong>
              {data.your_vote?.candidate_id?.name || "your selected candidate"}
            </strong>
            . You cannot vote again.
          </div>
        ) : (
          <>
            <h3 className="font-semibold text-gray-900">
              Vote for your leader
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Select one accepted team member. Your vote cannot be changed after
              submission.
            </p>

            {acceptedMembers.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  icon="👥"
                  title="No eligible members"
                  message="Accepted team members are required for voting."
                />
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {acceptedMembers.map((member) => {
                  const candidateId = String(
                    member.user_id?._id || member.user_id || member._id,
                  );

                  const isSelected =
                    selectedCandidate === candidateId && casting;

                  return (
                    <button
                      type="button"
                      key={member._id || candidateId}
                      onClick={() => handleVote(candidateId)}
                      disabled={casting || declaring}
                      className={`flex items-center gap-3 rounded-lg border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50"
                      }`}
                    >
                      <img
                        src={
                          member.avatar_url ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            member.name || "Student",
                          )}&size=40&background=6366f1&color=fff`
                        }
                        alt=""
                        className="h-10 w-10 rounded-full object-cover"
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src =
                            "https://ui-avatars.com/api/?name=Student&size=40&background=6366f1&color=fff";
                        }}
                      />

                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-gray-900">
                          {member.name || member.user_id?.name || "Team Member"}
                        </span>

                        <span className="mt-0.5 block text-xs text-gray-500">
                          {member.role === "leader"
                            ? "Current Team Leader"
                            : "Team Member"}
                        </span>
                      </span>

                      <span className="text-sm font-semibold text-indigo-600">
                        {isSelected ? "Submitting..." : "Vote"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-7 border-t pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold text-gray-900">Election Results</h3>

          {hasTie && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              Tie Detected
            </span>
          )}
        </div>

        {results.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon="🗳️"
              title="No votes yet"
              message="Results will appear after team members cast their votes."
            />
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {results.map((result, index) => {
              const count = Number(result.count || 0);
              const percentage = totalVotes
                ? Math.round((count / totalVotes) * 100)
                : 0;

              return (
                <li
                  key={result.candidate?._id || index}
                  className="rounded-lg bg-gray-50 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-gray-900">
                      {result.candidate?.name || "Candidate"}
                    </span>

                    <span className="shrink-0 text-sm text-gray-600">
                      {count} {count === 1 ? "vote" : "votes"}
                    </span>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-indigo-600 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <p className="mt-1 text-right text-xs text-gray-500">
                    {percentage}%
                  </p>
                </li>
              );
            })}
          </ul>
        )}

        {hasTie && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="font-semibold text-amber-900">
              The election is tied.
            </p>
            <p className="mt-1 text-sm text-amber-800">
              A tie-break election is required. No candidate will be selected
              automatically.
            </p>
          </div>
        )}

        {!allMembersVoted && totalMembers > 0 && (
          <p className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
            Waiting for {remainingVotes}{" "}
            {remainingVotes === 1 ? "member" : "members"} to vote before the
            result can be declared.
          </p>
        )}

        {isLeader && (
          <div className="mt-5">
            <button
              type="button"
              onClick={handleDeclare}
              disabled={
                declaring || totalVotes === 0 || !allMembersVoted || hasTie
              }
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {declaring ? "Declaring..." : "Declare Leader"}
            </button>

            {hasTie && (
              <p className="mt-2 text-xs text-amber-700">
                A tie-break election is needed before declaring the leader.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
