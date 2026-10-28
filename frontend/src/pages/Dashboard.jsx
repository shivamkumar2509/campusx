import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import SkeletonLoader from "../components/ui/SkeletonLoader";
import { fetchMyTeams } from "../api/teams";

const FALLBACK_AVATAR =
  "https://ui-avatars.com/api/?name=Student&background=6366f1&color=fff";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [myTeams, setMyTeams] = useState([]);
  const [myTeamsLoading, setMyTeamsLoading] = useState(true);
  const [myTeamsError, setMyTeamsError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login", { replace: true });
      return undefined;
    }

    let cancelled = false;

    const loadUser = async () => {
      try {
        const { data } = await api.get("/auth/me");

        if (!cancelled) {
          setUser(data.data);
        }
      } catch {
        if (!cancelled) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login", { replace: true });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    const loadEvents = async () => {
      try {
        const { data } = await api.get("/events", {
          params: { status: "published", limit: 3 },
        });

        if (!cancelled) {
          setEvents(Array.isArray(data.data) ? data.data : []);
        }
      } catch {
        if (!cancelled) setEvents([]);
      }
    };

    const loadNotifications = async () => {
      try {
        const { data } = await api.get("/notifications", {
          params: { limit: 3 },
        });

        if (!cancelled) {
          setNotifications(Array.isArray(data.data) ? data.data : []);
          setUnreadCount(data.meta?.unread_count || 0);
        }
      } catch {
        if (!cancelled) {
          setNotifications([]);
          setUnreadCount(0);
        }
      }
    };

    const loadSuggestions = async () => {
      try {
        const enrollmentResponse = await api.get("/users/me/enrollments");

        const enrollments = Array.isArray(enrollmentResponse.data?.data)
          ? enrollmentResponse.data.data
          : [];

        const enrolledEvents = enrollments
          .filter((enrollment) => enrollment.status === "pending")
          .map((enrollment) => {
            const eventValue = enrollment.event_id;
            const eventId =
              typeof eventValue === "object" ? eventValue?._id : eventValue;

            return {
              id: eventId ? String(eventId) : "",
              title:
                typeof eventValue === "object"
                  ? eventValue?.title || eventValue?.name || "Event"
                  : "Event",
            };
          })
          .filter((event) => event.id);

        const uniqueEvents = [
          ...new Map(enrolledEvents.map((event) => [event.id, event])).values(),
        ];

        const eventResults = await Promise.all(
          uniqueEvents.map(async (event) => {
            try {
              const response = await api.get(`/events/${event.id}/suggestions`);

              const rows = Array.isArray(response.data?.data)
                ? response.data.data
                : [];

              return rows.map((suggestion) => ({
                ...suggestion,
                event_id:
                  typeof suggestion.event_id === "object" &&
                  suggestion.event_id !== null
                    ? suggestion.event_id
                    : {
                        _id: event.id,
                        title: event.title,
                      },
              }));
            } catch (requestError) {
              console.error(
                `Could not load suggestions for event ${event.id}:`,
                requestError.response?.data || requestError.message,
              );

              return [];
            }
          }),
        );

        if (!cancelled) {
          const allSuggestions = eventResults.flat();

          const uniqueSuggestions = [
            ...new Map(
              allSuggestions.map((suggestion) => [suggestion._id, suggestion]),
            ).values(),
          ];

          setSuggestions(uniqueSuggestions);
        }
      } catch (requestError) {
        console.error(
          "Could not load dashboard team suggestions:",
          requestError.response?.data || requestError.message,
        );

        if (!cancelled) {
          setSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setSuggestionsLoading(false);
        }
      }
    };

    const loadMyTeams = async () => {
      try {
        const teams = await fetchMyTeams();

        if (!cancelled) {
          setMyTeams(Array.isArray(teams) ? teams : []);
          setMyTeamsError("");
        }
      } catch (error) {
        if (!cancelled) {
          setMyTeams([]);
          setMyTeamsError(
            error.response?.data?.message ||
              "Unable to load your teams. Please try again.",
          );
        }
      } finally {
        if (!cancelled) {
          setMyTeamsLoading(false);
        }
      }
    };

    loadUser();
    loadEvents();
    loadNotifications();
    loadSuggestions();
    loadMyTeams();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="sticky top-0 z-40 bg-white shadow-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div
              className="skeleton skeleton-text"
              style={{ width: 120, height: 28 }}
            />

            <div className="flex items-center gap-4">
              <div
                className="skeleton skeleton-text"
                style={{ width: 60, height: 20 }}
              />

              <div
                className="skeleton skeleton-circle"
                style={{ width: 36, height: 36 }}
              />
            </div>
          </div>
        </nav>

        <div className="h-64 animate-pulse bg-indigo-100" />

        <main className="mx-auto max-w-7xl px-6 py-8">
          <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <SkeletonLoader key={item} type="stat-card" />
            ))}
          </div>

          <div className="flex justify-center py-12">
            <LoadingSpinner
              size="large"
              message="Loading your dashboard..."
              color="primary"
            />
          </div>
        </main>
      </div>
    );
  }

  if (!user) return null;

  const firstName = user.name?.split(" ")[0] || "Student";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/dashboard" className="text-2xl font-bold text-indigo-600">
            CampusX
          </Link>

          <div className="flex items-center gap-3 sm:gap-6">
            <Link
              to="/events"
              className="hidden font-medium text-gray-700 hover:text-indigo-600 sm:block"
            >
              Events
            </Link>

            <Link
              to="/clubs"
              className="hidden font-medium text-gray-700 hover:text-indigo-600 sm:block"
            >
              Clubs
            </Link>

            <Link
              to="/search"
              className="hidden font-medium text-gray-700 hover:text-indigo-600 sm:block"
            >
              Search
            </Link>

            <Link to="/notifications" className="relative">
              <span className="text-2xl">🔔</span>

              {unreadCount > 0 && (
                <span className="absolute -right-2 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>

            <Link to="/profile" className="flex items-center gap-2">
              <img
                src={user.avatar_url || FALLBACK_AVATAR}
                alt="Profile"
                className="h-9 w-9 rounded-full object-cover"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = FALLBACK_AVATAR;
                }}
              />

              <span className="hidden font-medium text-gray-800 md:block">
                {firstName}
              </span>
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section
        className="relative h-64 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1920&q=80')",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/85 to-indigo-600/60" />

        <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-center px-6 text-white">
          <h1 className="text-3xl font-bold sm:text-5xl">
            Welcome back, {firstName}! 👋
          </h1>

          <p className="mt-3 text-indigo-100 sm:text-lg">
            Let's build something amazing together.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* PROFILE REMINDER */}
        {!user.availability && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border-l-4 border-amber-500 bg-amber-50 p-4">
            <div>
              <p className="font-semibold text-amber-800">
                Your profile is incomplete
              </p>

              <p className="text-sm text-amber-700">
                Add availability, skills and GitHub information to improve your
                team matches.
              </p>
            </div>

            <Link
              to="/profile"
              className="rounded-lg bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
            >
              Complete Profile
            </Link>
          </div>
        )}

        {/* STATS */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            icon="📅"
            label="Events"
            value={user.events_count ?? 0}
            color="indigo"
          />

          <StatCard
            icon="👥"
            label="Confirmed Teams"
            value={myTeamsLoading ? "..." : myTeamsError ? "—" : myTeams.length}
            color="emerald"
          />

          <StatCard
            icon="🗳️"
            label="Pending Votes"
            value={user.pending_votes ?? 0}
            color="amber"
          />

          <StatCard
            icon="⚡"
            label="Skills"
            value={user.skills_count ?? 0}
            color="rose"
          />
        </div>

        {/* MY CONFIRMED TEAMS */}
        <section className="mb-10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                My Confirmed Teams
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Your teams and their accepted members.
              </p>
            </div>

            <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
              {myTeamsLoading
                ? "Loading..."
                : `${myTeams.length} ${
                    myTeams.length === 1 ? "Team" : "Teams"
                  }`}
            </span>
          </div>

          {myTeamsLoading ? (
            <div className="grid gap-5 md:grid-cols-2">
              {[1, 2].map((item) => (
                <div
                  key={item}
                  className="h-48 animate-pulse rounded-2xl border bg-white p-6"
                />
              ))}
            </div>
          ) : myTeamsError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5">
              <h3 className="font-semibold text-red-800">
                Unable to load your teams
              </h3>

              <p className="mt-1 text-sm text-red-700">{myTeamsError}</p>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-3 text-sm font-semibold text-red-800 underline"
              >
                Try again
              </button>
            </div>
          ) : myTeams.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center sm:p-10">
              <p className="mb-3 text-4xl">👥</p>

              <h3 className="font-semibold text-gray-800">
                No confirmed teams yet
              </h3>

              <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">
                When you become an accepted member of a confirmed team, its
                details and members will appear here.
              </p>

              <Link
                to="/events"
                className="mt-4 inline-block font-medium text-indigo-600 hover:underline"
              >
                Explore events →
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {myTeams.map((team) => (
                <TeamCard key={team._id} team={team} user={user} />
              ))}
            </div>
          )}
        </section>

        {/* TEAM SUGGESTIONS */}
        <section className="mb-10">
          <SectionHeading
            title="Your Team Suggestions"
            to="/matching"
            linkText="View all →"
          />

          {suggestionsLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-40 animate-pulse rounded-xl border bg-white p-5"
                />
              ))}
            </div>
          ) : suggestions.length === 0 ? (
            <EmptyState
              icon="🎯"
              title="No team suggestions yet"
              description="Enroll in an event and complete your profile to improve your team matches."
              to="/events"
              linkText="Browse events →"
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {suggestions.slice(0, 3).map((suggestion, index) => (
                <SuggestionCard
                  key={suggestion._id || index}
                  event={
                    suggestion.event_id?.title ||
                    suggestion.event_id?.name ||
                    "Event"
                  }
                  score={Math.round((suggestion.score || 0) * 100)}
                  members={suggestion.team_members || []}
                  leader={suggestion.leader_candidate?.name || "TBA"}
                />
              ))}
            </div>
          )}
        </section>

        {/* UPCOMING EVENTS */}
        <section className="mb-10">
          <SectionHeading
            title="Upcoming Events"
            to="/events"
            linkText="View all →"
          />

          {events.length === 0 ? (
            <EmptyState
              icon="📅"
              title="No upcoming events right now"
              description="New events are added regularly. Check back soon."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {events.map((event) => (
                <EventCard
                  key={event._id}
                  id={event._id}
                  title={event.title}
                  type={event.type}
                  deadline={event.deadline}
                  enrolled={event.enrolled_count ?? 0}
                />
              ))}
            </div>
          )}
        </section>

        {/* NOTIFICATIONS */}
        <section className="mb-10">
          <SectionHeading
            title="Recent Notifications"
            to="/notifications"
            linkText="View all →"
          />

          {notifications.length === 0 ? (
            <EmptyState
              icon="🔔"
              title="No notifications yet"
              description="Updates about teams, votes and clubs will appear here."
            />
          ) : (
            <div className="divide-y rounded-xl border bg-white">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification._id}
                  icon={iconForNotification(notification.type)}
                  title={notification.title}
                  desc={notification.message}
                  time={relativeTime(
                    notification.createdAt || notification.created_at,
                  )}
                  unread={!notification.read}
                  link={notification.link}
                />
              ))}
            </div>
          )}
        </section>

        {/* QUICK ACTIONS */}
        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">
            Quick Actions
          </h2>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <QuickAction icon="📅" label="Browse Events" to="/events" />
            <QuickAction icon="🎭" label="Explore Clubs" to="/clubs" />
            <QuickAction icon="🔍" label="Search" to="/search" />
            <QuickAction icon="👤" label="My Profile" to="/profile" />
          </div>
        </section>

        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg bg-red-600 px-6 py-2 text-white transition hover:bg-red-700"
        >
          Logout
        </button>
      </main>

      <footer className="mt-16 border-t bg-white py-6 text-center text-sm text-gray-500">
        © 2026 CampusX · IIIT Vadodara
      </footer>
    </div>
  );
}

/* ===== TEAM CARD ===== */

function TeamCard({ team, user }) {
  const members = Array.isArray(team.members) ? team.members : [];

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="break-words text-lg font-bold text-gray-900">
              {team.name || "Untitled Team"}
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              {typeof team.event_id === "object"
                ? team.event_id?.title || "CampusX Event"
                : "CampusX Event"}
            </p>
          </div>

          <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
            Confirmed
          </span>
        </div>

        {team.description && (
          <p className="mt-3 text-sm text-gray-600">{team.description}</p>
        )}

        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-800">
              Accepted Members
            </h4>

            <span className="text-xs text-gray-500">
              {team.member_count ?? members.length} members
            </span>
          </div>

          {members.length === 0 ? (
            <p className="text-sm text-gray-500">
              No accepted members were returned for this team.
            </p>
          ) : (
            <div className="space-y-3">
              {members.map((member) => {
                const memberName = member.name || "CampusX Student";

                const isCurrentUser =
                  String(member.user_id?._id || member.user_id) ===
                  String(user._id || user.id);

                return (
                  <div
                    key={member._id || member.user_id}
                    className="flex items-center gap-3"
                  >
                    <img
                      src={
                        member.avatar_url ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          memberName,
                        )}&background=6366f1&color=fff`
                      }
                      alt={memberName}
                      className="h-10 w-10 rounded-full bg-gray-100 object-cover"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = FALLBACK_AVATAR;
                      }}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {memberName}
                        {isCurrentUser ? " (You)" : ""}
                      </p>

                      <p className="text-xs text-gray-500">
                        {member.role === "leader"
                          ? "Team Leader"
                          : "Team Member"}
                      </p>
                    </div>

                    {member.role === "leader" && (
                      <span className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">
                        Leader
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Link
          to={`/teams/${team._id}`}
          className="mt-5 flex w-full items-center justify-center rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          View Team Details →
        </Link>
      </div>
    </article>
  );
}

/* ===== SHARED COMPONENTS ===== */

function SectionHeading({ title, to, linkText }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-2xl font-bold text-gray-900">{title}</h2>

      {to && (
        <Link
          to={to}
          className="shrink-0 text-sm text-indigo-600 hover:underline"
        >
          {linkText}
        </Link>
      )}
    </div>
  );
}

function EmptyState({ icon, title, description, to, linkText }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center sm:p-10">
      <p className="mb-3 text-4xl">{icon}</p>
      <h3 className="font-semibold text-gray-800">{title}</h3>

      <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">
        {description}
      </p>

      {to && (
        <Link
          to={to}
          className="mt-4 inline-block text-sm font-semibold text-indigo-600 hover:underline"
        >
          {linkText}
        </Link>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  const colors = {
    indigo: "border-indigo-100 bg-indigo-50 text-indigo-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    rose: "border-rose-100 bg-rose-50 text-rose-700",
  };

  return (
    <div className={`rounded-xl border p-4 ${colors[color] || colors.indigo}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-2xl font-bold sm:text-3xl">{value}</span>
      </div>

      <p className="mt-2 text-sm font-medium">{label}</p>
    </div>
  );
}

function SuggestionCard({ event, score, members, leader }) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900">{event}</h3>

        <span className="shrink-0 rounded bg-indigo-100 px-2 py-1 text-sm font-bold text-indigo-700">
          {score}%
        </span>
      </div>

      <p className="mb-3 text-sm text-gray-600">
        Leader: <span className="font-medium">{leader}</span>
      </p>

      <div className="mb-4 flex -space-x-2">
        {(members || []).slice(0, 5).map((member, index) => (
          <div
            key={member._id || index}
            title={member.name || ""}
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-indigo-500 text-xs font-bold text-white"
          >
            {(member.name || "?").charAt(0)}
          </div>
        ))}
      </div>

      <Link
        to="/matching"
        className="block w-full rounded bg-indigo-600 py-2 text-center text-sm text-white hover:bg-indigo-700"
      >
        View Suggestion
      </Link>
    </div>
  );
}

function EventCard({ id, title, type, deadline, enrolled }) {
  const typeColor =
    type === "hackathon"
      ? "bg-purple-100 text-purple-700"
      : type === "club"
        ? "bg-pink-100 text-pink-700"
        : "bg-blue-100 text-blue-700";

  const formattedDeadline = deadline
    ? new Date(deadline).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "TBA";

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md">
      <span className={`rounded px-2 py-1 text-xs font-semibold ${typeColor}`}>
        {type || "Event"}
      </span>

      <h3 className="mt-3 line-clamp-2 font-semibold text-gray-900">{title}</h3>

      <div className="mt-3 space-y-1 text-sm text-gray-600">
        <p>📅 Deadline: {formattedDeadline}</p>
        <p>👥 {enrolled} enrolled</p>
      </div>

      <Link
        to={`/events/${id}`}
        className="mt-4 block rounded border border-indigo-600 py-2 text-center text-sm text-indigo-600 hover:bg-indigo-50"
      >
        View Details
      </Link>
    </div>
  );
}

function NotificationItem({ icon, title, desc, time, unread, link }) {
  const content = (
    <div className="flex items-start gap-3 p-4 hover:bg-gray-50">
      <span className="text-2xl">{icon}</span>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-gray-900 ${
            unread ? "font-semibold" : "font-medium"
          }`}
        >
          {title || "Notification"}
        </p>

        <p className="line-clamp-2 text-sm text-gray-600">{desc || ""}</p>
      </div>

      <span className="whitespace-nowrap text-xs text-gray-400">{time}</span>

      {unread && (
        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-indigo-600" />
      )}
    </div>
  );

  return link ? (
    <Link to={link} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}

function QuickAction({ icon, label, to }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center rounded-xl border bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
    >
      <span className="mb-2 text-3xl">{icon}</span>

      <span className="text-center text-sm font-medium text-gray-800">
        {label}
      </span>
    </Link>
  );
}

/* ===== HELPERS ===== */

function iconForNotification(type) {
  const icons = {
    team_confirmed: "👥",
    team_invite: "✉️",
    match_found: "🎯",
    vote_cast: "🗳️",
    vote_reminder: "🗳️",
    leave_request: "🚪",
    leave_approved: "✅",
    member_joined: "🎉",
    member_left: "👋",
    new_message: "💬",
    task_assigned: "📋",
    deadline_reminder: "⏰",
    feedback_request: "⭐",
    club_recruitment_open: "📢",
    club_application_status: "📝",
    club_member_approved: "🎊",
    application_received: "📥",
    password_changed: "🔐",
    account_suspended: "⚠️",
  };

  return icons[type] || "🔔";
}

function relativeTime(value) {
  if (!value) return "";

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "";

  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
