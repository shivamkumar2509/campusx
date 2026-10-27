import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchEvents, fetchMyEnrollments } from "../api/events";
import PageShell from "../components/common/PageShell";
import {
  EmptyState,
  ErrorState,
  LoadingCards,
} from "../components/common/StateViews";

export default function Events() {
  const [events, setEvents] = useState([]);
  const [enrollments, setEnrollments] = useState({});
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([
      fetchEvents({ type: type || undefined, limit: 100 }),
      fetchMyEnrollments(),
    ])
      .then(([evRes, myEnrolls]) => {
        if (cancelled) return;
        setEvents(evRes.data || []);
        const map = {};
        (myEnrolls || []).forEach((e) => {
          if (e.event_id) map[String(e.event_id._id || e.event_id)] = e.status;
        });
        setEnrollments(map);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err.response?.data?.message || "Failed to load events");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [type]);

  const visible = events.filter(
    (e) => !q.trim() || e.title.toLowerCase().includes(q.toLowerCase()),
  );

  // Helper for type-specific styling
  const getTypeConfig = (type) => {
    switch (type) {
      case "hackathon":
        return {
          color: "bg-purple-100 text-purple-700 border-purple-200",
          icon: "🔥",
        };
      case "club":
        return {
          color: "bg-pink-100 text-pink-700 border-pink-200",
          icon: "🎭",
        };
      case "workshop":
        return {
          color: "bg-blue-100 text-blue-700 border-blue-200",
          icon: "🛠️",
        };
      default:
        return {
          color: "bg-gray-100 text-gray-700 border-gray-200",
          icon: "📅",
        };
    }
  };

  return (
    <PageShell>
      {/* Header Section */}
      <div className="mb-10 text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
          Discover <span className="text-indigo-600">Events</span>
        </h1>
        <p className="text-lg text-gray-500">
          Find hackathons, workshops, and club events. Register and find your
          dream team.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap md:flex-nowrap gap-2 mb-10 max-w-4xl mx-auto sticky top-4 z-10 backdrop-blur-md bg-white/90">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            🔍
          </span>
          <input
            type="search"
            placeholder="Search events by title..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-gray-700"
          />
        </div>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="px-5 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-700 font-medium cursor-pointer"
        >
          <option value="">All Categories</option>
          <option value="hackathon">🔥 Hackathons</option>
          <option value="club">🎭 Club Events</option>
          <option value="workshop">🛠️ Workshops</option>
        </select>
      </div>

      {/* Content States */}
      {loading && (
        <div className="py-10">
          <LoadingCards count={6} />
        </div>
      )}

      {!loading && error && (
        <ErrorState message={error} onRetry={() => setType(type)} />
      )}

      {!loading && !error && visible.length === 0 && (
        <div className="py-20 bg-white rounded-3xl border border-dashed border-gray-200">
          <EmptyState
            icon="🔎"
            title="No events found"
            message="Try adjusting your search or category filter."
          />
        </div>
      )}

      {/* Event Cards Grid */}
      {!loading && !error && visible.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visible.map((e) => {
            const status = enrollments[String(e._id)];
            const config = getTypeConfig(e.type);
            const isPastDeadline = new Date(e.deadline) < new Date();

            return (
              <Link
                key={e._id}
                to={`/events/${e._id}`}
                className="group relative bg-white rounded-3xl border border-gray-100 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full overflow-hidden"
              >
                {/* Decorative background circle on hover */}
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-50 rounded-full blur-2xl group-hover:bg-indigo-100 transition-colors pointer-events-none" />

                {/* Top Row: Type & Status */}
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border ${config.color}`}
                  >
                    {config.icon} {e.type}
                  </span>
                  {status && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1">
                      <svg
                        className="w-3 h-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {status === "pending" ? "Enrolled" : status}
                    </span>
                  )}
                </div>

                {/* Title & Description */}
                <div className="relative z-10 flex-1">
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                    {e.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500 line-clamp-3 leading-relaxed">
                    {e.description || "No description provided for this event."}
                  </p>
                </div>

                {/* Bottom Stats */}
                <div className="mt-6 pt-4 border-t border-gray-100 relative z-10">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-gray-600">
                        <span
                          className={`${isPastDeadline ? "text-red-500" : "text-amber-500"}`}
                        >
                          📅
                        </span>
                        <span className={isPastDeadline ? "text-red-500" : ""}>
                          {new Date(e.deadline).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="text-indigo-500">👥</span>
                        <span>
                          {e.team_size_min}–{e.team_size_max} members
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 bg-gray-50 px-3 py-2 rounded-xl">
                      <span className="text-xs text-gray-500">Enrolled</span>
                      <span className="text-lg font-bold text-gray-800">
                        {e.enrolled_count || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}