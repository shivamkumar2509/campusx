import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import SkeletonLoader from "../components/ui/SkeletonLoader";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // New: real data for 3 sections
  const [events, setEvents] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    let cancelled = false;

    // 1. Load user
    api
      .get("/auth/me")
      .then(({ data }) => {
        if (!cancelled) setUser(data.data);
      })
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login", { replace: true });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // 2. Load upcoming events (graceful failure)
    api
      .get("/events", { params: { status: "published", limit: 3 } })
      .then(({ data }) => {
        if (!cancelled) setEvents(Array.isArray(data.data) ? data.data : []);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      });

    // 3. Load recent notifications + unread count
    api
      .get("/notifications", { params: { limit: 3 } })
      .then(({ data }) => {
        if (!cancelled) {
          setNotifications(Array.isArray(data.data) ? data.data : []);
          setUnreadCount(data.meta?.unread_count || 0);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNotifications([]);
          setUnreadCount(0);
        }
      });

    // 4. Load suggestions — will 404 until AI matching built; empty state
    api
      .get("/events/000000000000000000000000/suggestions")
      .then(({ data }) => {
        if (!cancelled)
          setSuggestions(Array.isArray(data.data) ? data.data : []);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setSuggestionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  // ===== LOADING STATE =====
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div
              className="skeleton skeleton-text"
              style={{ width: "120px", height: "28px" }}
            />
            <div className="flex items-center gap-6">
              <div
                className="skeleton skeleton-text"
                style={{ width: "60px", height: "20px" }}
              />
              <div
                className="skeleton skeleton-text"
                style={{ width: "60px", height: "20px" }}
              />
              <div
                className="skeleton skeleton-circle"
                style={{ width: "36px", height: "36px" }}
              />
            </div>
          </div>
        </nav>

        <div className="h-64 bg-gradient-to-r from-indigo-900/20 to-indigo-600/20 flex items-center">
          <div className="max-w-7xl mx-auto px-6 w-full">
            <div
              className="skeleton skeleton-text"
              style={{ width: "300px", height: "40px", marginBottom: "12px" }}
            />
            <div
              className="skeleton skeleton-text"
              style={{ width: "400px", height: "20px" }}
            />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonLoader key={i} type="stat-card" />
            ))}
          </div>

          <div className="flex justify-center py-12">
            <LoadingSpinner
              size="large"
              message="Loading your dashboard..."
              color="primary"
            />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ===== NAVBAR ===== */}
      <nav className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/dashboard" className="text-2xl font-bold text-indigo-600">
            CampusX
          </Link>

          <div className="flex items-center gap-6">
            <Link
              to="/events"
              className="text-gray-700 hover:text-indigo-600 font-medium"
            >
              Events
            </Link>
            <Link
              to="/clubs"
              className="text-gray-700 hover:text-indigo-600 font-medium"
            >
              Clubs
            </Link>
            <Link
              to="/search"
              className="text-gray-700 hover:text-indigo-600 font-medium"
            >
              Search
            </Link>

            <Link to="/notifications" className="relative">
              <span className="text-2xl">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>

            <Link to="/profile" className="flex items-center gap-2">
              <img
                src={
                  user.avatar_url ||
                  "https://ui-avatars.com/api/?name=" +
                    encodeURIComponent(user.name) +
                    "&background=6366f1&color=fff"
                }
                alt="avatar"
                className="w-9 h-9 rounded-full object-cover"
              />
              <span className="text-gray-800 font-medium hidden md:block">
                {user.name.split(" ")[0]}
              </span>
            </Link>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section
        className="relative h-64 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1920&q=80')",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/80 to-indigo-600/60" />
        <div className="relative max-w-7xl mx-auto px-6 h-full flex flex-col justify-center text-white">
          <h1 className="text-4xl md:text-5xl font-bold">
            Welcome back, {user.name.split(" ")[0]}! 👋
          </h1>
          <p className="mt-2 text-lg text-indigo-100">
            Let's build something amazing together.
          </p>
        </div>
      </section>

      {/* ===== MAIN CONTENT ===== */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {!user.availability && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg flex justify-between items-center flex-wrap gap-3">
            <div>
              <p className="font-semibold text-yellow-800">
                Your profile is incomplete
              </p>
              <p className="text-sm text-yellow-700">
                Add availability, skills & GitHub to get better team matches.
              </p>
            </div>
            <Link
              to="/profile"
              className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700"
            >
              Complete Profile
            </Link>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon="📅"
            label="Events"
            value={user.events_count ?? 0}
            color="indigo"
          />
          <StatCard
            icon="👥"
            label="Teams"
            value={user.teams_count ?? 0}
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

        {/* ===== SUGGESTIONS ===== */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Your Team Suggestions
            </h2>
            <Link
              to="/matching"
              className="text-indigo-600 hover:underline text-sm"
            >
              View all →
            </Link>
          </div>
          {suggestionsLoading ? (
            <div className="grid md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white p-5 rounded-xl shadow-sm border h-40 animate-pulse"
                />
              ))}
            </div>
          ) : suggestions.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-10 text-center">
              <p className="text-4xl mb-3">🎯</p>
              <p className="font-semibold text-gray-800">
                No team suggestions yet
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Raise your hand for an event to get AI-matched with teammates.
              </p>
              <Link
                to="/events"
                className="inline-block mt-4 text-indigo-600 hover:underline text-sm font-medium"
              >
                Browse events →
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {suggestions.slice(0, 3).map((s) => (
                <SuggestionCard
                  key={s._id}
                  event={s.event_id?.title || "Event"}
                  score={Math.round((s.score || 0) * 100)}
                  members={s.team_members || []}
                  leader={s.leader_candidate?.name || "TBA"}
                />
              ))}
            </div>
          )}
        </section>

        {/* ===== EVENTS ===== */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Upcoming Events
            </h2>
            <Link
              to="/events"
              className="text-indigo-600 hover:underline text-sm"
            >
              View all →
            </Link>
          </div>
          {events.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-10 text-center">
              <p className="text-4xl mb-3">📅</p>
              <p className="font-semibold text-gray-800">
                No upcoming events right now
              </p>
              <p className="text-sm text-gray-500 mt-1">
                New events are added regularly — check back soon.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {events.map((e) => (
                <EventCard
                  key={e._id}
                  id={e._id}
                  title={e.title}
                  type={e.type}
                  deadline={
                    e.deadline
                      ? new Date(e.deadline).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })
                      : "TBA"
                  }
                  enrolled={e.enrolled_count ?? 0}
                />
              ))}
            </div>
          )}
        </section>

        {/* ===== NOTIFICATIONS ===== */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Recent Notifications
            </h2>
            <Link
              to="/notifications"
              className="text-indigo-600 hover:underline text-sm"
            >
              View all →
            </Link>
          </div>
          {notifications.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-10 text-center">
              <p className="text-4xl mb-3">🔔</p>
              <p className="font-semibold text-gray-800">
                No notifications yet
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Updates about teams, votes and clubs will show up here.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm divide-y">
              {notifications.map((n) => (
                <NotificationItem
                  key={n._id}
                  icon={iconForNotification(n.type)}
                  title={n.title}
                  desc={n.message}
                  time={relativeTime(n.createdAt)}
                  unread={!n.read}
                  link={n.link}
                />
              ))}
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <QuickAction icon="📅" label="Browse Events" to="/events" />
            <QuickAction icon="🎭" label="Explore Clubs" to="/clubs" />
            <QuickAction icon="🔍" label="Search" to="/search" />
            <QuickAction icon="👤" label="My Profile" to="/profile" />
          </div>
        </section>

        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition"
        >
          Logout
        </button>
      </main>

      <footer className="mt-16 bg-white border-t py-6 text-center text-gray-500 text-sm">
        © 2026 CampusX · IIIT Vadodara
      </footer>
    </div>
  );
}

/* ===== Helpers ===== */

function iconForNotification(type) {
  const map = {
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
  return map[type] || "🔔";
}

function relativeTime(iso) {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/* ===== Sub Components ===== */

function StatCard({ icon, label, value, color }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
  };
  return (
    <div className={`p-4 rounded-xl border ${colors[color]}`}>
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span className="text-3xl font-bold">{value}</span>
      </div>
      <p className="mt-2 text-sm font-medium">{label}</p>
    </div>
  );
}

function SuggestionCard({ event, score, members, leader }) {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border hover:shadow-md transition">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-gray-900">{event}</h3>
        <span className="bg-indigo-100 text-indigo-700 text-sm font-bold px-2 py-1 rounded">
          {score}%
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-3">
        Leader: <span className="font-medium">{leader}</span>
      </p>
      <div className="flex -space-x-2 mb-4">
        {(members || []).slice(0, 5).map((m, idx) => (
          <div
            key={m._id || idx}
            className="w-8 h-8 rounded-full bg-indigo-500 border-2 border-white flex items-center justify-center text-xs font-bold text-white"
            title={m.name || ""}
          >
            {(m.name || "?").charAt(0)}
          </div>
        ))}
      </div>
      <Link
        to="/matching"
        className="block w-full text-center bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 text-sm"
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

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border hover:shadow-md transition">
      <span className={`text-xs font-semibold px-2 py-1 rounded ${typeColor}`}>
        {type}
      </span>
      <h3 className="font-semibold text-gray-900 mt-3 line-clamp-2">{title}</h3>
      <div className="mt-3 text-sm text-gray-600 space-y-1">
        <p>📅 Deadline: {deadline}</p>
        <p>👥 {enrolled} enrolled</p>
      </div>
      <Link
        to={`/events/${id}`}
        className="block mt-4 text-center border border-indigo-600 text-indigo-600 py-2 rounded-lg hover:bg-indigo-50 text-sm"
      >
        View Details
      </Link>
    </div>
  );
}

function NotificationItem({ icon, title, desc, time, unread, link }) {
  const body = (
    <div className="p-4 flex items-start gap-3 hover:bg-gray-50">
      <span className="text-2xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <p
          className={`${unread ? "font-semibold" : "font-medium"} text-gray-900 truncate`}
        >
          {title}
        </p>
        <p className="text-sm text-gray-600 line-clamp-2">{desc}</p>
      </div>
      <span className="text-xs text-gray-400 whitespace-nowrap">{time}</span>
      {unread && (
        <span className="w-2 h-2 rounded-full bg-indigo-600 mt-2 flex-shrink-0" />
      )}
    </div>
  );

  if (link) {
    return (
      <Link to={link} className="block">
        {body}
      </Link>
    );
  }
  return body;
}

function QuickAction({ icon, label, to }) {
  return (
    <Link
      to={to}
      className="bg-white p-4 rounded-xl shadow-sm border hover:shadow-md hover:border-indigo-300 transition flex flex-col items-center"
    >
      <span className="text-3xl mb-2">{icon}</span>
      <span className="text-sm font-medium text-gray-800">{label}</span>
    </Link>
  );
}
