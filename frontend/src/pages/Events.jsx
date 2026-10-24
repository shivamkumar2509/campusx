import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchEvents, fetchMyEnrollments } from "../api/events";
import PageShell from "../components/common/PageShell";
import {
  EmptyState,
  ErrorState,
  LoadingCards,
} from "../components/common/StateViews";
import { clearSession, getErrorInfo } from "../utils/clubHelpers";

export default function Events() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [enrollments, setEnrollments] = useState({});
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchEvents({ type: type || undefined, limit: 100 })
      .then((evRes) => {
        if (!cancelled) setEvents(evRes.data || []);
      })
      .catch((err) => {
        if (cancelled) return;
        const info = getErrorInfo(err);
        if (info.status === 401) {
          clearSession();
          navigate("/login", { replace: true });
          return;
        }
        setError(info.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [type, retry, navigate]);

  // Enrollment badges load separately, so a failure here never hides the events.
  useEffect(() => {
    let cancelled = false;
    fetchMyEnrollments()
      .then((myEnrolls) => {
        if (cancelled) return;
        const map = {};
        (myEnrolls || []).forEach((e) => {
          if (e.event_id) map[String(e.event_id._id || e.event_id)] = e.status;
        });
        setEnrollments(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [retry]);

  const visible = events.filter(
    (e) => !q.trim() || e.title.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <PageShell>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Events</h1>
        <p className="mt-1 text-gray-600">
          Discover hackathons, workshops, and club events.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="search"
          placeholder="Search events..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 min-w-[220px] border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="border rounded-lg px-4 py-2"
        >
          <option value="">All types</option>
          <option value="hackathon">Hackathon</option>
          <option value="club">Club</option>
          <option value="workshop">Workshop</option>
        </select>
      </div>

      {loading && <LoadingCards count={6} />}
      {!loading && error && (
        <ErrorState message={error} onRetry={() => setRetry((n) => n + 1)} />
      )}
      {!loading && !error && visible.length === 0 && (
        <EmptyState
          icon="📅"
          title="No events"
          message="No events match your filters."
        />
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((e) => {
            const status = enrollments[String(e._id)];
            const isPast = new Date(e.deadline) < new Date();
            return (
              <Link
                key={e._id}
                to={`/events/${e._id}`}
                className="bg-white border rounded-xl p-5 hover:shadow-md transition"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-block text-xs font-semibold px-2 py-1 rounded bg-indigo-100 text-indigo-700 capitalize">
                    {e.type}
                  </span>
                  {isPast && (
                    <span className="inline-block text-xs font-semibold px-2 py-1 rounded bg-gray-200 text-gray-700">
                      Deadline passed
                    </span>
                  )}
                </div>
                <h3 className="mt-3 text-lg font-bold text-gray-900">
                  {e.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                  {e.description || "No description"}
                </p>
                <div className="mt-3 text-sm text-gray-600 space-y-1">
                  <p>📅 Deadline: {new Date(e.deadline).toLocaleDateString()}</p>
                  <p>
                    👥 Team size: {e.team_size_min}–{e.team_size_max}
                  </p>
                  <p>🙋 {e.enrolled_count} enrolled</p>
                </div>
                {status && (
                  <span className="mt-3 inline-block text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-semibold">
                    {status === "pending" ? "Enrolled" : status}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}