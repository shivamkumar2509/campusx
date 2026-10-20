import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { fetchTeam, fetchTeamMembers, confirmTeam } from "../api/teams";
import useApiData from "../hooks/useApiData";
import PageShell from "../components/common/PageShell";
import { ErrorState, LoadingBlock } from "../components/common/StateViews";
import { clearSession, getErrorInfo } from "../utils/clubHelpers";
import LeaderElection from "../components/team/LeaderElection";
import LeaveRequestTab from "../components/team/LeaveRequestTab";
import ReplacementTab from "../components/team/ReplacementTab";
import TasksTab from "../components/team/TasksTab";

const TABS = [
  { key: "chat", label: "💬 Chat", requiresConfirmed: true },
  { key: "tasks", label: "📋 Tasks" },
  { key: "voting", label: "🗳️ Voting" },
  { key: "leave", label: "🚪 Leave" },
  { key: "replacement", label: "🔄 Replacement", leaderOnly: true },
];

export default function TeamDashboard() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("chat");

  const team = useApiData(() => fetchTeam(teamId), [teamId]);
  const members = useApiData(() => fetchTeamMembers(teamId), [teamId]);

  const handleFailure = (err) => {
    const info = getErrorInfo(err);
    if (info.status === 401) {
      clearSession();
      navigate("/login", { replace: true });
      return null;
    }
    return info;
  };

  const notFound =
    team.error && (team.error.status === 404 || team.error.status === 403);

  const isLeader = team.data?.is_leader || false;
  const isConfirmed = team.data?.status === "confirmed";
  const isDraft = team.data?.status === "draft";

  // Filter tabs:
  //  - leader-only tabs hidden for non-leaders
  //  - chat tab hidden until team is confirmed
  const visibleTabs = TABS.filter((t) => {
    if (t.leaderOnly && !isLeader) return false;
    if (t.requiresConfirmed && !isConfirmed) return false;
    return true;
  });

  // If chat was active but is now hidden (team moved out of confirmed → won't
  // happen, but defensive), fall back to tasks
  const effectiveTab = visibleTabs.some((t) => t.key === activeTab)
    ? activeTab
    : "tasks";

  if (team.loading || members.loading) {
    return (
      <PageShell>
        <div className="bg-white rounded-xl shadow-sm border p-8">
          <LoadingBlock lines={5} />
        </div>
      </PageShell>
    );
  }

  if (team.error) {
    return (
      <PageShell>
        <ErrorState
          message={
            notFound
              ? "Team not found or you don't have access."
              : team.error.message
          }
          onRetry={notFound ? undefined : team.reload}
          backTo="/dashboard"
          backLabel="Back to dashboard"
        />
      </PageShell>
    );
  }

  const teamData = team.data;
  const membersData = members.data?.data || [];

  const handleConfirm = async () => {
    try {
      await confirmTeam(teamId);
      // Reload both — team status changes AND conversation is created
      team.reload();
      members.reload();
    } catch (err) {
      const info = getErrorInfo(err);
      alert(info.message || "Failed to confirm team");
    }
  };

  return (
    <PageShell>
      {/* Back link */}
      <Link to="/dashboard" className="text-sm text-indigo-600 hover:underline">
        ← Back to dashboard
      </Link>

      {/* ===== TEAM HEADER ===== */}
      <section className="mt-4 bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-8 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{teamData.name}</h1>
              <p className="mt-2 text-indigo-100">
                {teamData.event_id?.title || "Event"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`px-4 py-1.5 rounded-full text-sm font-semibold ${
                  teamData.status === "confirmed"
                    ? "bg-green-400 text-green-900"
                    : teamData.status === "completed"
                      ? "bg-gray-300 text-gray-800"
                      : "bg-yellow-300 text-yellow-900"
                }`}
              >
                {teamData.status === "draft"
                  ? "Draft"
                  : teamData.status === "confirmed"
                    ? "Confirmed"
                    : "Completed"}
              </span>
              <span className="bg-white/20 px-3 py-1.5 rounded-full text-sm">
                👥 {teamData.member_count} members
              </span>
            </div>
          </div>

          {teamData.description && (
            <p className="mt-4 text-indigo-100 max-w-2xl">
              {teamData.description}
            </p>
          )}
        </div>

        {/* Members row */}
        <div className="px-8 py-5 border-b">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold text-gray-500">
              Members:
            </span>
            {membersData
              .filter((m) => m.status === "accepted")
              .map((m) => (
                <div
                  key={m._id}
                  className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full"
                  title={m.name}
                >
                  <img
                    src={
                      m.avatar_url ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=6366f1&color=fff&size=24`
                    }
                    alt={m.name}
                    className="w-6 h-6 rounded-full"
                  />
                  <span className="text-sm font-medium text-gray-800">
                    {m.name}
                  </span>
                  {m.role === "leader" && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-bold">
                      👑
                    </span>
                  )}
                </div>
              ))}
          </div>
        </div>

        {/* Draft banner — confirm + lock notice */}
        {isDraft && (
          <div className="px-8 py-4 bg-yellow-50 border-b border-yellow-200">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm text-yellow-800 font-medium">
                  ⚠️ Team is in draft.{" "}
                  {isLeader
                    ? "Confirm to lock members and open chat."
                    : "Chat opens once the leader confirms the team."}
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  🔒 Chat is locked until the team is confirmed.
                </p>
              </div>
              {isLeader && (
                <button
                  onClick={handleConfirm}
                  className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 text-sm font-semibold"
                >
                  Confirm Team
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ===== TABS ===== */}
      <div
        className="mt-6 flex gap-2 overflow-x-auto pb-2"
        role="tablist"
        aria-label="Team sections"
      >
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={effectiveTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition ${
              effectiveTab === tab.key
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== TAB CONTENT ===== */}
      <div className="mt-6">
        {effectiveTab === "chat" && <ChatTab teamId={teamId} />}
        {effectiveTab === "tasks" && (
          <TasksTab teamId={teamId} members={membersData} />
        )}
        {effectiveTab === "voting" && (
          <LeaderElection
            teamId={teamId}
            members={membersData}
            isLeader={isLeader}
          />
        )}
        {effectiveTab === "leave" && (
          <LeaveRequestTab
            teamId={teamId}
            members={membersData}
            isLeader={isLeader}
          />
        )}
        {effectiveTab === "replacement" && isLeader && (
          <ReplacementTab teamId={teamId} members={membersData} />
        )}
      </div>
    </PageShell>
  );
}

/* ===== CHAT TAB — redirect to full Chat page ===== */
function ChatTab({ teamId }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-10 text-center">
      <p className="text-5xl mb-4">💬</p>
      <h2 className="text-xl font-bold text-gray-900">Team Chat is open</h2>
      <p className="mt-2 text-gray-600">
        Chat unlocked because your team is confirmed. Open the full chat to
        start messaging.
      </p>
      <Link
        to={`/teams/${teamId}/chat`}
        className="inline-block mt-6 bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 font-medium"
      >
        Open Chat →
      </Link>
    </div>
  );
}
