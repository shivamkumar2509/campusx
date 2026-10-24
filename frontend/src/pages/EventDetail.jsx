import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { enrollInEvent, fetchEvent } from "../api/events";
import useApiData from "../hooks/useApiData";
import PageShell from "../components/common/PageShell";
import { ErrorState, LoadingBlock } from "../components/common/StateViews";

export default function EventDetail() {
  const { eventId } = useParams();
  const { data, loading, error, reload } = useApiData(
    () => fetchEvent(eventId),
    [eventId],
  );
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState("");
  const [enrollStatus, setEnrollStatus] = useState(null);

  const handleEnroll = async () => {
    setEnrolling(true);
    setEnrollError("");
    try {
      await enrollInEvent(eventId);
      setEnrollStatus("pending");
      reload();
    } catch (err) {
      setEnrollError(err.response?.data?.message || "Enrollment failed");
    } finally {
      setEnrolling(false);
    }
  };

  const notFound = error && (error.status === 404 || error.status === 400);

  return (
    <PageShell>
      <Link to="/events" className="text-sm text-indigo-600 hover:underline">
        ← Back to events
      </Link>

      {loading && (
        <div className="mt-4 bg-white border rounded-xl p-8">
          <LoadingBlock lines={5} />
        </div>
      )}
      {!loading && error && (
        <ErrorState
          message={notFound ? "Event not found." : error.message}
          onRetry={notFound ? undefined : reload}
        />
      )}

      {!loading && data && (
        <>
          <section className="mt-4 bg-white rounded-xl border p-6 md:p-8">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold px-2 py-1 rounded bg-indigo-100 text-indigo-700 capitalize">
                {data.type}
              </span>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded ${data.status === "published" ? "bg-green-100 text-green-700" : data.status === "closed" ? "bg-gray-200 text-gray-700" : "bg-yellow-100 text-yellow-800"}`}
              >
                {data.status}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">{data.title}</h1>
            <p className="mt-3 text-gray-700">
              {data.description || "No description."}
            </p>
            <div className="mt-6 grid sm:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs uppercase text-gray-500">Deadline</p>
                <p className="mt-1 font-semibold">
                  {new Date(data.deadline).toLocaleDateString()}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs uppercase text-gray-500">Team size</p>
                <p className="mt-1 font-semibold">
                  {data.team_size_min}–{data.team_size_max}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs uppercase text-gray-500">Enrolled</p>
                <p className="mt-1 font-semibold">{data.enrolled_count}</p>
              </div>
            </div>
          </section>

          <section className="mt-6 bg-white rounded-xl border p-6">
            {enrollError && (
              <p className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                {enrollError}
              </p>
            )}

           {(data.user_enrollment && data.user_enrollment.status !== "cancelled") || enrollStatus ? (
              <p className="text-green-700 font-semibold">
                ✅ You are enrolled.
              </p>
            ) : data.status !== "published" ? (
              <p className="text-gray-600">Registration is not open.</p>
            ) : new Date(data.deadline) < new Date() ? (
              <p className="text-gray-600">Registration deadline has passed.</p>
            ) : (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-60 font-medium"
              >
                {enrolling ? "Raising hand..." : "🙋 Raise Hand"}
              </button>
            )}
          </section>
        </>
      )}
    </PageShell>
  );
}
