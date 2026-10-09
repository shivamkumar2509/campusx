import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import SkeletonLoader from "../components/ui/SkeletonLoader";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    api
      .get("/auth/me")
      .then(({ data }) => setUser(data.data))
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login", { replace: true });
      })
      .finally(() => setLoading(false));
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
        {/* Navbar Skeleton */}
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

        {/* Hero Skeleton */}
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

        {/* Stats Skeleton */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonLoader key={i} type="stat-card" />
            ))}
          </div>

          {/* Loading Spinner */}
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
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                3
              </span>
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

      {/* ===== HERO / WELCOME ===== */}
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

        {/* Suggestions */}
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
          <div className="grid md:grid-cols-3 gap-4">
            <SuggestionCard
              event="SIH 2025"
              score={92}
              members={["Shivam", "Aman", "Raghav", "Nikhil"]}
              leader="Shivam Kumar"
            />
            <SuggestionCard
              event="CodeSprint Hackathon"
              score={87}
              members={["Aniket", "Priya", "Kabir"]}
              leader="Aniket Kumar"
            />
            <SuggestionCard
              event="Robotics Workshop"
              score={81}
              members={["Raghav", "Nikhil", "Vikram", "Aman"]}
              leader="Raghav Soni"
            />
          </div>
        </section>

        {/* Events */}
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
          <div className="grid md:grid-cols-3 gap-4">
            <EventCard
              title="SIH 2025"
              type="Hackathon"
              deadline="Oct 30"
              enrolled={45}
            />
            <EventCard
              title="KrievaXAlfaz Auditions"
              type="Club"
              deadline="Oct 5"
              enrolled={23}
            />
            <EventCard
              title="ML Workshop"
              type="Workshop"
              deadline="Nov 12"
              enrolled={67}
            />
          </div>
        </section>

        {/* Notifications */}
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
          <div className="bg-white rounded-xl shadow-sm divide-y">
            <NotificationItem
              icon="👥"
              title="Team suggestion ready"
              desc="AI found a perfect team for SIH 2025"
              time="2m ago"
            />
            <NotificationItem
              icon="🗳️"
              title="Vote needed"
              desc="Nikhil wants to leave Team Alpha"
              time="1h ago"
            />
            <NotificationItem
              icon="💬"
              title="New message"
              desc="Aman: 'Let's meet at 5 PM'"
              time="3h ago"
            />
          </div>
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
        {members.map((m) => (
          <img
            key={m}
            src={`https://ui-avatars.com/api/?name=${m}&background=6366f1&color=fff&size=32`}
            alt={m}
            className="w-8 h-8 rounded-full border-2 border-white"
            title={m}
          />
        ))}
      </div>
      <button className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 text-sm">
        View Suggestion
      </button>
    </div>
  );
}

function EventCard({ title, type, deadline, enrolled }) {
  const typeColor =
    type === "Hackathon"
      ? "bg-purple-100 text-purple-700"
      : type === "Club"
        ? "bg-pink-100 text-pink-700"
        : "bg-blue-100 text-blue-700";

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border hover:shadow-md transition">
      <span className={`text-xs font-semibold px-2 py-1 rounded ${typeColor}`}>
        {type}
      </span>
      <h3 className="font-semibold text-gray-900 mt-3">{title}</h3>
      <div className="mt-3 text-sm text-gray-600 space-y-1">
        <p>📅 Deadline: {deadline}</p>
        <p>👥 {enrolled} enrolled</p>
      </div>
      <button className="mt-4 w-full border border-indigo-600 text-indigo-600 py-2 rounded-lg hover:bg-indigo-50 text-sm">
        View Details
      </button>
    </div>
  );
}

function NotificationItem({ icon, title, desc, time }) {
  return (
    <div className="p-4 flex items-start gap-3 hover:bg-gray-50 cursor-pointer">
      <span className="text-2xl">{icon}</span>
      <div className="flex-1">
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-600">{desc}</p>
      </div>
      <span className="text-xs text-gray-400 whitespace-nowrap">{time}</span>
    </div>
  );
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
