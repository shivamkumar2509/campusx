import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";

export default function TeamVoting() {
  const { teamId } = useParams();
  const navigate = useNavigate();

  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [voteData, setVoteData] = useState({
    votes: [],
    results: [],
    total_votes: 0,
    total_members: 0,
    has_voted: false,
    your_vote: null,
  });

  const [userId, setUserId] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [declaring, setDeclaring] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadVotingData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [teamResponse, membersResponse, votesResponse, userResponse] =
        await Promise.all([
          api.get(`/teams/${teamId}`),
          api.get(`/teams/${teamId}/members`),
          api.get(`/teams/${teamId}/votes`),
          api.get("/auth/me"),
        ]);

      const teamData = teamResponse.data?.data;
      const memberData = Array.isArray(membersResponse.data?.data)
        ? membersResponse.data.data
        : [];
      const votingData = votesResponse.data?.data || {};
      const currentUser = userResponse.data?.data;

      if (!teamData) {
        throw new Error("Team details could not be loaded.");
      }

      setTeam(teamData);
      setMembers(memberData.filter((member) => member.status === "accepted"));
      setVoteData({
        votes: votingData.votes || [],
        results: votingData.results || [],
        total_votes: votingData.total_votes || 0,
        total_members: votingData.total_members || 0,
        has_voted: Boolean(votingData.has_voted),
        your_vote: votingData.your_vote || null,
      });
      setUserId(String(currentUser?._id || currentUser?.id || ""));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load voting details.",
      );
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    loadVotingData();
  }, [loadVotingData]);

  const handleVote = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!selectedCandidate) {
      setError("Please select a team member before voting.");
      return;
    }

    if (voteData.has_voted) {
      setError("You have already voted.");
      return;
    }

    try {
      setSubmitting(true);

      await api.post(`/teams/${teamId}/leader/vote`, {
        candidate_id: selectedCandidate,
      });

      setMessage("Your vote has been submitted successfully.");
      setSelectedCandidate("");
      await loadVotingData();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to submit your vote.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeclareWinner = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to declare the leader election result?",
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      setDeclaring(true);

      const response = await api.post(`/teams/${teamId}/leader/declare`);

      const result = response.data?.data;

      setMessage(
        `Election result declared. ${result?.leader_name || "The winner"} is the elected team leader.`,
      );

      await loadVotingData();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to declare the election result.",
      );
    } finally {
      setDeclaring(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="mt-4 text-gray-600">Loading voting details...</p>
        </div>
      </div>
    );
  }

  if (error && !team) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-lg rounded-2xl border bg-white p-8 text-center shadow-sm">
          <div className="text-4xl">⚠️</div>
          <h1 className="mt-4 text-xl font-bold text-gray-900">
            Unable to open voting
          </h1>
          <p className="mt-2 text-sm text-red-600">{error}</p>

          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={loadVotingData}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
            >
              Retry
            </button>

            <Link
              to={`/teams/${teamId}`}
              className="rounded-lg border px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              Back to Team
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const leaderId =
    typeof team?.leader_id === "object" ? team.leader_id?._id : team?.leader_id;

  const isLeader = String(leaderId || "") === userId;
  const isAdmin =
    JSON.parse(localStorage.getItem("user") || "null")?.role === "admin";

  const isAuthorizedToDeclare = isLeader || isAdmin;

  const winner = voteData.results[0];
  const allMembersVoted =
    voteData.total_members > 0 &&
    voteData.total_votes >= voteData.total_members;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link to="/dashboard" className="text-xl font-bold text-indigo-600">
            CampusX
          </Link>

          <Link
            to={`/teams/${teamId}`}
            className="text-sm font-medium text-indigo-600 hover:underline"
          >
            ← Back to Team
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-8 rounded-2xl bg-gradient-to-r from-indigo-700 to-violet-600 p-6 text-white sm:p-8">
          <p className="text-sm font-medium text-indigo-100">TEAM ELECTION</p>

          <h1 className="mt-2 text-3xl font-bold">Leader Voting</h1>

          <p className="mt-2 text-indigo-100">{team?.name || "Your Team"}</p>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-indigo-100">
            Select an accepted team member to vote for as team leader. You can
            cast only one vote.
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
          >
            {message}
          </div>
        )}

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Stat label="Team Members" value={voteData.total_members} icon="👥" />
          <Stat label="Votes Cast" value={voteData.total_votes} icon="🗳️" />
          <Stat
            label="Participation"
            value={
              voteData.total_members
                ? `${Math.min(
                    100,
                    Math.round(
                      (voteData.total_votes / voteData.total_members) * 100,
                    ),
                  )}%`
                : "0%"
            }
            icon="📊"
          />
        </div>

        <section className="mb-6 rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold text-gray-900">Cast Your Vote</h2>

          <p className="mt-1 text-sm text-gray-500">
            Choose one of the accepted members below.
          </p>

          {voteData.has_voted ? (
            <div className="mt-5 rounded-xl bg-green-50 p-4">
              <p className="font-semibold text-green-800">
                ✓ Your vote has been recorded
              </p>

              {voteData.your_vote?.candidate_id?.name && (
                <p className="mt-1 text-sm text-green-700">
                  Your selected candidate:{" "}
                  {voteData.your_vote.candidate_id.name}
                </p>
              )}

              <p className="mt-1 text-sm text-green-700">
                You cannot vote again in this election.
              </p>
            </div>
          ) : members.length === 0 ? (
            <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
              No accepted team members are available for voting.
            </p>
          ) : (
            <form onSubmit={handleVote} className="mt-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {members.map((member) => {
                  const candidateId = String(
                    member.user_id?._id || member.user_id || member._id,
                  );

                  const selected = selectedCandidate === candidateId;

                  return (
                    <label
                      key={member._id || candidateId}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                        selected
                          ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100"
                          : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="candidate"
                        value={candidateId}
                        checked={selected}
                        onChange={() => setSelectedCandidate(candidateId)}
                        className="h-4 w-4 accent-indigo-600"
                      />

                      <img
                        src={
                          member.avatar_url ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            member.name || "Student",
                          )}&background=6366f1&color=fff`
                        }
                        alt=""
                        className="h-11 w-11 rounded-full object-cover"
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src =
                            "https://ui-avatars.com/api/?name=Student&background=6366f1&color=fff";
                        }}
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-gray-900">
                          {member.name || "Team Member"}
                        </p>

                        <p className="text-xs text-gray-500">
                          {member.role === "leader"
                            ? "Current Team Leader"
                            : "Team Member"}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>

              <button
                type="submit"
                disabled={!selectedCandidate || submitting}
                className="mt-5 w-full rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {submitting ? "Submitting Vote..." : "Submit Vote"}
              </button>
            </form>
          )}
        </section>

        <section className="mb-6 rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Election Results
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Current vote counts for each candidate.
              </p>
            </div>

            <button
              onClick={loadVotingData}
              className="rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Refresh Results
            </button>
          </div>

          {voteData.results.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed p-8 text-center">
              <div className="text-3xl">🗳️</div>

              <p className="mt-3 font-semibold text-gray-800">
                No votes have been cast yet
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Results will appear here after the first vote.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {voteData.results.map((result, index) => {
                const count = result.count || 0;
                const percentage = voteData.total_votes
                  ? Math.round((count / voteData.total_votes) * 100)
                  : 0;

                return (
                  <div
                    key={result.candidate?._id || index}
                    className="rounded-xl border border-gray-100 p-4"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                          {index + 1}
                        </span>

                        <span className="truncate font-semibold text-gray-900">
                          {result.candidate?.name || "Candidate"}
                        </span>
                      </div>

                      <span className="shrink-0 text-sm font-semibold text-indigo-700">
                        {count} {count === 1 ? "vote" : "votes"}
                      </span>
                    </div>

                    <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-indigo-600 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <p className="mt-1 text-right text-xs text-gray-500">
                      {percentage}%
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {isAuthorizedToDeclare && (
            <div className="mt-6 border-t pt-5">
              <h3 className="font-semibold text-gray-900">
                Declare Election Result
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                This updates the team leader according to the current vote
                counts. Declare only when the election is ready to conclude.
              </p>

              <button
                onClick={handleDeclareWinner}
                disabled={declaring || voteData.total_votes === 0}
                className="mt-4 rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {declaring ? "Declaring Result..." : "Declare Winner"}
              </button>
            </div>
          )}

          {winner && allMembersVoted && (
            <p className="mt-5 rounded-xl bg-indigo-50 p-4 text-sm text-indigo-800">
              All team members appear to have voted. The current leading
              candidate is{" "}
              <strong>
                {winner.candidate?.name || "the leading candidate"}
              </strong>
              . The election result is not final until it is declared.
            </p>
          )}
        </section>

        <div className="flex flex-wrap gap-3">
          <Link
            to={`/teams/${teamId}`}
            className="rounded-lg border bg-white px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to Team
          </Link>

          <Link
            to="/dashboard"
            className="rounded-lg border bg-white px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
          >
            Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value, icon }) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{label}</span>
        <span className="text-2xl">{icon}</span>
      </div>

      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
