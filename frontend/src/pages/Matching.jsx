import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import PageShell from "../components/common/PageShell";
import {
  EmptyState,
  ErrorState,
  LoadingBlock,
} from "../components/common/StateViews";

export default function Matching() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [eventId, setEventId] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Load first pending suggestion across all events the user is enrolled in
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const enrollRes = await api.get("/users/me/enrollments");
        const enrollments = enrollRes.data.data || [];
        const eventIds = enrollments
          .filter((e) => e.status === "pending")
          .map((e) => e.event_id?._id || e.event_id)
          .filter(Boolean);

        if (!eventIds.length) {
          setSuggestions([]);
          return;
        }

        const results = [];
        for (const id of eventIds) {
          try {
            const res = await api.get(`/events/${id}/suggestions`);
            (res.data.data || []).forEach((s) =>
              results.push({ ...s, event_id: id }),
            );
          } catch (e) {
            // No suggestions for this event — ignore
          }
        }

        if (!cancelled) {
          setSuggestions(results);
          setEventId(eventIds[0]);
        }
      } catch (err) {
        if (!cancelled)
          setError(err.response?.data?.message || "Failed to load suggestions");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAccept = async (suggestionId) => {
    try {
      const res = await api.post(`/suggestions/${suggestionId}/accept`);
      const teamId = res.data?.data?.team?._id;
      if (teamId) navigate(`/teams/${teamId}`);
      else navigate("/dashboard");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to accept");
    }
  };

  const handleDecline = (suggestionId) => {
    setSuggestions((prev) => prev.filter((s) => s._id !== suggestionId));
  };

  return (
    <PageShell>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Team Suggestions</h1>
        <p className="mt-1 text-gray-600">
          AI-matched teams based on skills, availability, and experience.
        </p>
      </div>

      {loading && (
        <div className="bg-white border rounded-xl p-8">
          <LoadingBlock lines={4} />
        </div>
      )}
      {!loading && error && <ErrorState message={error} />}
      {!loading && !error && suggestions.length === 0 && (
        <EmptyState
          icon="🎯"
          title="No suggestions yet"
          message="Enroll in an event to get AI team suggestions."
        />
      )}

      {!loading && !error && suggestions.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {suggestions.map((s) => (
            <div key={s._id} className="bg-white border rounded-xl p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-xs text-gray-500">Match score</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {Math.round((s.score || 0) * 100)}%
                  </p>
                </div>
                <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded">
                  Leader: {s.leader_candidate?.name || "N/A"}
                </span>
              </div>
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-1">Members</p>
                <div className="flex flex-wrap gap-1.5">
                  {(s.team_members || []).map((m) => (
                    <span
                      key={m._id || m}
                      className="text-xs bg-gray-100 px-2 py-1 rounded-full"
                    >
                      {m.name || "Member"}
                    </span>
                  ))}
                </div>
              </div>
              {s.reasoning && (
                <p className="text-sm text-gray-600 mb-3">{s.reasoning}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => handleAccept(s._id)}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleDecline(s._id)}
                  className="flex-1 border py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
