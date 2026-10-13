import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  fetchTeam,
  fetchTeamMembers,
  fetchTeamConversation,
  fetchTeamTasks,
  confirmTeam,
} from "../api/teams";
import {
  fetchReplacements,
  findReplacement,
  inviteReplacement,
} from "../api/replacements";
import { createLeaveRequest, fetchLeaveRequests } from "../api/leaveRequests";
import useApiData from "../hooks/useApiData";
import PageShell from "../components/common/PageShell";
import {
  EmptyState,
  ErrorState,
  LoadingBlock,
} from "../components/common/StateViews";
import { clearSession, getErrorInfo } from "../utils/clubHelpers";
import LeaderElection from "../components/team/LeaderElection";
import LeaveRequestTab from "../components/team/LeaveRequestTab";
import ReplacementTab from "../components/team/ReplacementTab";

const TABS = [
  { key: "chat", label: "💬 Chat" },
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

  const visibleTabs = TABS.filter((t) => !t.leaderOnly || isLeader);

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

  return (
    <PageShell>
      {/* Back link */}
      <Link
        to="/dashboard"
        className="text-sm text-indigo-600 hover:underline"
      >
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

        {/* Confirm button for leader */}
        {isLeader && teamData.status === "draft" && (
          <div className="px-8 py-4 bg-yellow-50 border-b border-yellow-200">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-sm text-yellow-800">
                ⚠️ Team is in draft. Confirm to lock members and start working.
              </p>
              <button
                onClick={async () => {
                  try {
                    await confirmTeam(teamId);
                    team.reload();
                  } catch (err) {
                    alert(err.response?.data?.message || "Failed to confirm");
                  }
                }}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 text-sm font-semibold"
              >
                Confirm Team
              </button>
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
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition ${
              activeTab === tab.key
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
        {activeTab === "chat" && <ChatTab teamId={teamId} />}
        {activeTab === "tasks" && <TasksTab teamId={teamId} />}
        {activeTab === "voting" && (
          <LeaderElection teamId={teamId} members={membersData} isLeader={isLeader} />
        )}
        {activeTab === "leave" && (
          <LeaveRequestTab
            teamId={teamId}
            members={membersData}
            isLeader={isLeader}
          />
        )}
        {activeTab === "replacement" && isLeader && (
          <ReplacementTab teamId={teamId} members={membersData} />
        )}
      </div>
    </PageShell>
  );
}

/* ===== CHAT TAB (placeholder - Shivam will implement full) ===== */
function ChatTab({ teamId }) {
  const conversation = useApiData(
    () => fetchTeamConversation(teamId),
    [teamId]
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h2 className="text-xl font-bold mb-4">💬 Team Chat</h2>
      {conversation.loading && <LoadingBlock lines={3} />}
      {conversation.error && (
        <ErrorState message={conversation.error.message} onRetry={conversation.reload} />
      )}
      {conversation.data && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-3">💬</p>
          <p className="font-medium">Chat is ready</p>
          <p className="text-sm mt-1">
            Conversation ID: {conversation.data._id}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Full chat UI coming soon...
          </p>
        </div>
      )}
    </div>
  );
}

/* ===== TASKS TAB (placeholder - Raghav will implement full) ===== */
function TasksTab({ teamId }) {
  const tasks = useApiData(() => fetchTeamTasks(teamId), [teamId]);

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h2 className="text-xl font-bold mb-4">📋 Tasks</h2>
      {tasks.loading && <LoadingBlock lines={3} />}
      {tasks.error && <ErrorState message={tasks.error.message} onRetry={tasks.reload} />}
      {tasks.data && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium">Kanban board coming soon</p>
          <p className="text-sm mt-1">Raghav will implement this</p>
        </div>
      )}
    </div>
  );
}