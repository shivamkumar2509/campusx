import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

export default function Landing() {
  const [stats, setStats] = useState(null); // null = loading
  const [events, setEvents] = useState([]);
  const [clubs, setClubs] = useState([]);

  useEffect(() => {
    let cancelled = false;

    // Stats — silent failure returns zeros so sections still render
    api
      .get("/landing/stats")
      .then(({ data }) => {
        if (!cancelled) setStats(data.data || { users: 0, teams: 0, clubs: 0 });
      })
      .catch(() => {
        if (!cancelled) setStats({ users: 0, teams: 0, clubs: 0 });
      });

    // Featured events — empty array if none
    api
      .get("/landing/featured-events")
      .then(({ data }) => {
        if (!cancelled) setEvents(Array.isArray(data.data) ? data.data : []);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      });

    // Featured clubs — empty array if none
    api
      .get("/landing/featured-clubs")
      .then(({ data }) => {
        if (!cancelled) setClubs(Array.isArray(data.data) ? data.data : []);
      })
      .catch(() => {
        if (!cancelled) setClubs([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const displayStats = stats || { users: 0, teams: 0, clubs: 0 };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* ============ NAVBAR ============ */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-indigo-600">
            CampusX
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-700">
            <a href="#features" className="hover:text-indigo-600">
              Features
            </a>
            <a href="#events" className="hover:text-indigo-600">
              Events
            </a>
            <a href="#clubs" className="hover:text-indigo-600">
              Clubs
            </a>
            <a href="#highlights" className="hover:text-indigo-600">
              About
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-gray-700 hover:text-indigo-600 px-4 py-2"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="text-sm font-medium bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <section className="relative pt-16 min-h-screen flex items-center">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/campus-bg.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/90 via-indigo-900/75 to-indigo-800/50" />

        <div className="relative max-w-7xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-12 items-center">
          <div className="text-white">
            <span className="inline-block bg-white/10 backdrop-blur border border-white/20 text-sm px-4 py-1.5 rounded-full mb-6">
              🚀 AI-Powered Team Formation
            </span>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
              Find your{" "}
              <span className="bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent">
                perfect team
              </span>{" "}
              at IIITV
            </h1>

            <p className="mt-6 text-lg md:text-xl text-indigo-100 max-w-xl">
              Smart matching for hackathons, clubs, and events. Built on
              verified skills, real availability, and equal voting.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/signup"
                className="bg-white text-indigo-700 font-semibold px-8 py-4 rounded-xl hover:bg-indigo-50 transition shadow-2xl"
              >
                Get Started Free →
              </Link>
              <a
                href="#features"
                className="border border-white/30 text-white font-medium px-8 py-4 rounded-xl hover:bg-white/10 transition"
              >
                Learn More
              </a>
            </div>

            <div className="mt-10 flex items-center gap-6 text-sm text-indigo-100">
              <div className="flex -space-x-2">
                {["SK", "AT", "AK", "RS", "NT"].map((i) => (
                  <div
                    key={i}
                    className="w-9 h-9 rounded-full bg-indigo-500 border-2 border-white flex items-center justify-center text-xs font-bold"
                  >
                    {i}
                  </div>
                ))}
              </div>
              <p>
                <span className="font-bold text-white">
                  {displayStats.users > 0 ? `${displayStats.users}+` : "Join"}
                </span>{" "}
                students already using CampusX
              </p>
            </div>
          </div>

          <div className="hidden md:block relative">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="ml-2 text-xs text-white/70">
                  Team Suggestion
                </span>
              </div>

              <div className="bg-white rounded-xl p-4 text-gray-900">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold">SIH 2025 Team</span>
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">
                    92% match
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Suggested Leader:{" "}
                  <span className="font-medium text-gray-800">
                    Shivam Kumar
                  </span>
                </p>
                <div className="flex -space-x-2 mb-3">
                  {["SK", "AT", "AK", "RS"].map((i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border-2 border-white flex items-center justify-center text-xs font-bold text-white"
                    >
                      {i}
                    </div>
                  ))}
                </div>
                <button className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium">
                  Accept Suggestion
                </button>
              </div>
            </div>

            <div className="absolute -top-4 -left-6 bg-white rounded-xl p-3 shadow-xl flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              <div>
                <p className="text-xs text-gray-500">Verified Skills</p>
                <p className="text-sm font-bold">GitHub-backed</p>
              </div>
            </div>

            <div className="absolute -bottom-4 -right-6 bg-white rounded-xl p-3 shadow-xl flex items-center gap-2">
              <span className="text-2xl">🗳️</span>
              <div>
                <p className="text-xs text-gray-500">Equal Voting</p>
                <p className="text-sm font-bold">Fair & Transparent</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ STATS BAR ============ */}
      <section className="bg-indigo-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-4xl md:text-5xl font-bold">
              {displayStats.users}
              {displayStats.users > 0 && "+"}
            </p>
            <p className="text-sm text-indigo-200 mt-2">Active Students</p>
          </div>
          <div>
            <p className="text-4xl md:text-5xl font-bold">
              {displayStats.teams}
              {displayStats.teams > 0 && "+"}
            </p>
            <p className="text-sm text-indigo-200 mt-2">Teams Formed</p>
          </div>
          <div>
            <p className="text-4xl md:text-5xl font-bold">
              {displayStats.clubs}
            </p>
            <p className="text-sm text-indigo-200 mt-2">Active Clubs</p>
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section id="features" className="py-24 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-indigo-600 font-semibold text-sm uppercase tracking-wider">
              Features
            </span>
            <h2 className="mt-3 text-4xl md:text-5xl font-bold">
              Everything you need to form great teams
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              From AI matching to real-time collaboration — CampusX has it all.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: "🎯",
                title: "AI Team Matching",
                desc: "Smart algorithm finds your perfect teammates based on skills & availability.",
              },
              {
                icon: "🔐",
                title: "Verified Skills",
                desc: "GitHub-backed proof. No more fake 'expert' claims.",
              },
              {
                icon: "👥",
                title: "Equal Voting",
                desc: "Democratic leader election. Every member's voice matters.",
              },
              {
                icon: "💬",
                title: "Team Chat",
                desc: "Real-time messaging with file sharing, right inside your team.",
              },
              {
                icon: "✅",
                title: "Kanban Tasks",
                desc: "Drag-and-drop task board to keep your team organized.",
              },
              {
                icon: "🎭",
                title: "5 Active Clubs",
                desc: "Music, Coding, Robotics, Dance, Drama — join what you love.",
              },
              {
                icon: "📊",
                title: "Admin Analytics",
                desc: "Insights into participation, skill gaps, and team performance.",
              },
              {
                icon: "🔔",
                title: "Smart Notifications",
                desc: "Email + in-app alerts. Never miss a deadline or vote.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-white p-6 rounded-2xl border border-gray-100 hover:border-indigo-200 hover:shadow-xl transition group"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center text-2xl mb-4 transition">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ UPCOMING EVENTS ============ */}
      <section id="events" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-12 flex-wrap gap-4">
            <div>
              <span className="text-indigo-600 font-semibold text-sm uppercase tracking-wider">
                Events
              </span>
              <h2 className="mt-3 text-4xl md:text-5xl font-bold">
                Upcoming Events
              </h2>
            </div>
            <Link
              to="/events"
              className="text-indigo-600 font-medium hover:underline"
            >
              Browse all →
            </Link>
          </div>

          {events.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center">
              <p className="text-4xl mb-3">📅</p>
              <p className="font-semibold text-gray-800">
                No upcoming events right now
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Check back soon — new events are added regularly.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {events.slice(0, 3).map((e) => (
                <div
                  key={e._id}
                  className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-xl hover:-translate-y-1 transition"
                >
                  <span
                    className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${
                      e.type === "hackathon"
                        ? "bg-purple-100 text-purple-700"
                        : e.type === "club"
                          ? "bg-pink-100 text-pink-700"
                          : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {e.type}
                  </span>
                  <h3 className="mt-4 text-xl font-bold">{e.title}</h3>
                  <div className="mt-4 space-y-2 text-sm text-gray-600">
                    <p>
                      📅 Deadline:{" "}
                      {e.deadline
                        ? new Date(e.deadline).toLocaleDateString()
                        : "TBA"}
                    </p>
                    <p>
                      👥 Team size: {e.team_size_min ?? 2}–
                      {e.team_size_max ?? 6}
                    </p>
                  </div>
                  <Link
                    to={`/events/${e._id}`}
                    className="mt-6 inline-block w-full text-center border border-indigo-600 text-indigo-600 py-2 rounded-lg hover:bg-indigo-50 transition"
                  >
                    View Details
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ============ ACTIVE CLUBS ============ */}
      <section id="clubs" className="py-24 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-indigo-600 font-semibold text-sm uppercase tracking-wider">
              Community
            </span>
            <h2 className="mt-3 text-4xl md:text-5xl font-bold">
              {displayStats.clubs > 0
                ? `${displayStats.clubs} Active Clubs`
                : "Active Clubs"}
            </h2>
          </div>

          {clubs.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center">
              <p className="text-4xl mb-3">🎭</p>
              <p className="font-semibold text-gray-800">No clubs listed yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Clubs will appear here once they're created.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {clubs.slice(0, 5).map((c) => {
                const emoji =
                  c.type === "music"
                    ? "🎵"
                    : c.type === "coding"
                      ? "💻"
                      : c.type === "robotics"
                        ? "🤖"
                        : c.type === "dance"
                          ? "💃"
                          : "🎭";
                return (
                  <Link
                    to={`/clubs/${c._id}`}
                    key={c._id}
                    className="bg-white p-6 rounded-2xl border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition text-center"
                  >
                    <div className="text-5xl mb-3">{emoji}</div>
                    <h3 className="font-semibold">
                      {c.display_name || c.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {c.member_count ?? 0} members
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ============ PLATFORM HIGHLIGHTS ============ */}
      <section id="highlights" className="py-24 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-indigo-600 font-semibold text-sm uppercase tracking-wider">
              Why CampusX
            </span>
            <h2 className="mt-3 text-4xl md:text-5xl font-bold leading-tight">
              Built for students, by students
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              We've been in your shoes. Forming teams shouldn't be a WhatsApp
              group nightmare.
            </p>

            <div className="mt-8 space-y-4">
              {[
                {
                  icon: "🎓",
                  title: "IIITV-only access",
                  desc: "Verified college emails only — no spam, no strangers.",
                },
                {
                  icon: "🚀",
                  title: "Zero setup",
                  desc: "Sign up with your college email in 30 seconds. Start matching instantly.",
                },
                {
                  icon: "🔒",
                  title: "Privacy first",
                  desc: "Your data stays secure. Control who sees what.",
                },
                {
                  icon: "💯",
                  title: "Always free",
                  desc: "Free for students. Forever. Because education shouldn't cost extra.",
                },
              ].map((h) => (
                <div key={h.title} className="flex gap-4">
                  <div className="w-12 h-12 flex-shrink-0 rounded-xl bg-indigo-50 flex items-center justify-center text-2xl">
                    {h.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold">{h.title}</h3>
                    <p className="text-sm text-gray-600">{h.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div
              className="aspect-square rounded-3xl bg-cover bg-center shadow-2xl"
              style={{ backgroundImage: "url('/event.png')" }}
            />
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto bg-gradient-to-r from-indigo-600 to-purple-700 rounded-3xl p-12 md:p-16 text-center text-white shadow-2xl">
          <h2 className="text-4xl md:text-5xl font-bold">
            Ready to find your team?
          </h2>
          <p className="mt-4 text-lg text-indigo-100 max-w-2xl mx-auto">
            Join IIITV students already using CampusX to build amazing things
            together.
          </p>
          <Link
            to="/signup"
            className="mt-8 inline-block bg-white text-indigo-700 font-semibold px-8 py-4 rounded-xl hover:bg-indigo-50 transition"
          >
            Get Started — It's Free
          </Link>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-2xl font-bold text-white mb-3">CampusX</h3>
            <p className="text-sm">
              AI-powered team formation for IIIT Vadodara students.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Product</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#features" className="hover:text-white">
                  Features
                </a>
              </li>
              <li>
                <a href="#events" className="hover:text-white">
                  Events
                </a>
              </li>
              <li>
                <a href="#clubs" className="hover:text-white">
                  Clubs
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Company</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#highlights" className="hover:text-white">
                  About
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Account</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/login" className="hover:text-white">
                  Login
                </Link>
              </li>
              <li>
                <Link to="/signup" className="hover:text-white">
                  Sign Up
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-gray-800 text-center text-sm">
          © 2026 CampusX · IIIT Vadodara · Built with ❤️ by students
        </div>
      </footer>
    </div>
  );
}
