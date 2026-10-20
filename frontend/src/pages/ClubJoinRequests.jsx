import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchClubJoinRequests,
  scheduleVerification,
  approveJoinRequest,
  rejectJoinRequest,
} from "../api/clubJoin";
import { fetchClub } from "../api/clubs";
import PageShell from "../components/common/PageShell";
import {
  EmptyState,
  ErrorState,
  LoadingBlock,
} from "../components/common/StateViews";

const STATUS_LABELS = {
  pending: "Pending",
  verification_scheduled: "Verification Scheduled",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export default function ClubJoinRequests() {
  const { clubId } = useParams();
  const [requests, setRequests] = useState([]);
  const [club, setClub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("pending");
  const [actionId, setActionId] = useState(null);
  const [scheduling, setScheduling] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const [clubData, reqs] = await Promise.all([
        fetchClub(clubId).catch(() => null),
        fetchClubJoinRequests(clubId, filter ? { status: filter } : {}),
      ]);
      setClub(clubData);
      setRequests(reqs || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, filter]);

  const handleApprove = async (id) => {
    if (!confirm("Approve this member?")) return;
    setActionId(id);
    try {
      await approveJoinRequest(id);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Failed");
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id) => {
    const reason = prompt("Rejection reason (optional)");
    if (reason === null) return;
    setActionId(id);
    try {
      await rejectJoinRequest(id, { rejection_reason: reason });
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Failed");
    } finally {
      setActionId(null);
    }
  };

  const handleSchedule = async (id, data) => {
    setScheduling(id);
    try {
      await scheduleVerification(id, data);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Failed");
    } finally {
      setScheduling(null);
    }
  };

  return (
    <PageShell>
      <Link
        to={`/clubs/${clubId}`}
        className="text-sm text-indigo-600 hover:underline"
      >
        ← Back to club
      </Link>

      <h1 className="mt-4 text-3xl font-bold text-gray-900">
        Join Requests {club && `· ${club.display_name || club.name}`}
      </h1>
      <p className="mt-1 text-gray-600">
        Review students who want to join. Schedule verification or decide
        directly.
      </p>

      <div className="mt-5 flex gap-2 flex-wrap">
        {["pending", "verification_scheduled", "approved", "rejected", ""].map(
          (s) => (
            <button
              key={s || "all"}
              onClick={() => setFilter(s)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border ${
                filter === s
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {s ? STATUS_LABELS[s] : "All"}
            </button>
          ),
        )}
      </div>

      <div className="mt-5">
        {loading && (
          <div className="bg-white border rounded-xl p-6">
            <LoadingBlock lines={4} />
          </div>
        )}
        {!loading && error && <ErrorState message={error} onRetry={load} />}
        {!loading && !error && requests.length === 0 && (
          <EmptyState
            icon="🙋"
            title="No requests"
            message="New join requests will show up here."
          />
        )}
        {!loading && !error && requests.length > 0 && (
          <div className="space-y-3">
            {requests.map((r) => (
              <JoinRequestCard
                key={r._id}
                request={r}
                busy={actionId === r._id || scheduling === r._id}
                onApprove={() => handleApprove(r._id)}
                onReject={() => handleReject(r._id)}
                onSchedule={(data) => handleSchedule(r._id, data)}
              />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}

function JoinRequestCard({
  request: r,
  busy,
  onApprove,
  onReject,
  onSchedule,
}) {
  const [showSchedule, setShowSchedule] = useState(false);
  const [date, setDate] = useState(
    r.verification_date
      ? new Date(r.verification_date).toISOString().slice(0, 16)
      : "",
  );
  const [venue, setVenue] = useState(r.verification_venue || "");
  const [notes, setNotes] = useState(r.verification_notes || "");

  const u = r.user_id || {};
  const avatar =
    u.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      u.name || "U",
    )}&background=6366f1&color=fff&size=80`;

  return (
    <div className="bg-white border rounded-xl p-5">
      <div className="flex gap-4 flex-wrap">
        <Link to={`/users/${u._id}`} target="_blank" className="flex-shrink-0">
          <img
            src={avatar}
            alt={u.name}
            className="w-16 h-16 rounded-full object-cover hover:ring-2 hover:ring-indigo-400 transition"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-3 flex-wrap">
            <div>
              <Link
                to={`/users/${u._id}`}
                target="_blank"
                className="font-semibold text-gray-900 hover:text-indigo-600"
              >
                {u.name || "Unknown"}
              </Link>
              <p className="text-xs text-gray-500">
                Year {u.year || "?"} · {u.experience_level || "beginner"} ·
                Availability: {u.availability || 0} hrs/wk
              </p>
            </div>
            <span
              className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${
                r.status === "pending"
                  ? "bg-yellow-100 text-yellow-800"
                  : r.status === "verification_scheduled"
                    ? "bg-blue-100 text-blue-700"
                    : r.status === "approved"
                      ? "bg-green-100 text-green-700"
                      : r.status === "rejected"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-700"
              }`}
            >
              {STATUS_LABELS[r.status]}
            </span>
          </div>

          {r.message && (
            <p className="mt-2 text-sm text-gray-700 italic">“{r.message}”</p>
          )}

          {r.status === "verification_scheduled" && (
            <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <p>
                <span className="text-gray-500">Date: </span>
                {new Date(r.verification_date).toLocaleString()}
              </p>
              {r.verification_venue && (
                <p>
                  <span className="text-gray-500">Venue: </span>
                  {r.verification_venue}
                </p>
              )}
              {r.verification_notes && (
                <p className="text-xs text-gray-600 mt-1">
                  {r.verification_notes}
                </p>
              )}
            </div>
          )}

          {(r.status === "pending" ||
            r.status === "verification_scheduled") && (
            <div className="mt-3 flex gap-2 flex-wrap">
              <button
                onClick={() => setShowSchedule((s) => !s)}
                className="border border-blue-600 text-blue-600 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-50"
              >
                📅 {showSchedule ? "Cancel" : "Schedule Verification"}
              </button>
              <button
                onClick={onApprove}
                disabled={busy}
                className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-60"
              >
                ✓ Approve
              </button>
              <button
                onClick={onReject}
                disabled={busy}
                className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
              >
                ✕ Reject
              </button>
            </div>
          )}

          {showSchedule && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!date) return;
                onSchedule({
                  verification_date: new Date(date).toISOString(),
                  verification_venue: venue,
                  verification_notes: notes,
                });
                setShowSchedule(false);
              }}
              className="mt-3 bg-gray-50 border rounded-lg p-3 space-y-2"
            >
              <input
                type="datetime-local"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Venue (e.g., C-Block Music Room)"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <textarea
                rows={2}
                placeholder="Notes for student (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={busy}
                className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                {busy ? "Saving…" : "Save schedule"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
