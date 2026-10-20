import { useState } from "react";
import {
  createLeaveRequest,
  fetchLeaveRequests,
  voteOnLeaveRequest,
  cancelLeaveRequest,
} from "../../api/leaveRequests";
import useApiData from "../../hooks/useApiData";
import { ErrorState, LoadingBlock, EmptyState } from "../common/StateViews";

export default function LeaveRequestTab({ teamId, members, isLeader }) {
  const requests = useApiData(() => fetchLeaveRequests(teamId), [teamId]);
  const [reason, setReason] = useState("");
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState("");

  const handleCreate = async (e) => {
    e.preventDefault();
    setActionError("");
    setCreating(true);
    try {
      await createLeaveRequest(teamId, reason);
      setReason("");
      requests.reload();
    } catch (err) {
      setActionError(
        err.response?.data?.message || "Failed to create leave request",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleVote = async (requestId, vote) => {
    setActionError("");
    try {
      await voteOnLeaveRequest(teamId, requestId, vote);
      requests.reload();
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to vote");
    }
  };

  const handleCancel = async (requestId) => {
    if (!confirm("Cancel your leave request?")) return;
    setActionError("");
    try {
      await cancelLeaveRequest(requestId);
      requests.reload();
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to cancel");
    }
  };

  if (requests.loading) {
    return (
      <div className="bg-white rounded-xl border p-6">
        <LoadingBlock lines={3} />
      </div>
    );
  }

  if (requests.error) {
    return (
      <ErrorState message={requests.error.message} onRetry={requests.reload} />
    );
  }

  const items = requests.data || [];

  return (
    <div className="bg-white rounded-xl border p-6 space-y-5">
      <h2 className="text-xl font-bold">🚪 Leave Requests</h2>

      {actionError && (
        <p className="text-sm bg-red-50 text-red-700 border border-red-200 rounded px-3 py-2">
          {actionError}
        </p>
      )}

      {!isLeader && (
        <form
          onSubmit={handleCreate}
          className="bg-gray-50 rounded-lg p-4 space-y-3"
        >
          <p className="text-sm font-medium">Request to leave this team</p>
          <textarea
            rows={2}
            placeholder="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={creating}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-60 text-sm font-semibold"
          >
            {creating ? "Sending..." : "Request Leave"}
          </button>
        </form>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon="✌️"
          title="No leave requests"
          message="Everyone is staying."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((r) => (
            <li key={r._id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-semibold">
                    {r.user_id?.name || "Member"} wants to leave
                  </p>
                  {r.reason && (
                    <p className="text-sm text-gray-600 mt-1">“{r.reason}”</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Requested {new Date(r.createdAt).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded capitalize ${
                    r.status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : r.status === "approved"
                        ? "bg-green-100 text-green-700"
                        : r.status === "rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {r.status}
                </span>
              </div>

              {r.status === "pending" && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleVote(r._id, "approve")}
                    className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700 font-medium"
                  >
                    Approve ({r.approvals?.length || 0})
                  </button>
                  <button
                    onClick={() => handleVote(r._id, "reject")}
                    className="bg-gray-700 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-gray-800 font-medium"
                  >
                    Reject ({r.rejections?.length || 0})
                  </button>
                  {String(r.user_id?._id) ===
                    String(
                      JSON.parse(localStorage.getItem("user") || "{}")?.id,
                    ) && (
                    <button
                      onClick={() => handleCancel(r._id)}
                      className="border px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
