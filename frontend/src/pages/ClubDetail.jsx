import { Link, useParams, useNavigate } from "react-router-dom";
import {
  fetchClub,
  fetchClubMembers,
  fetchClubRecruitments,
} from "../api/clubs";
import useApiData from "../hooks/useApiData";
import PageShell from "../components/common/PageShell";
import MemberList from "../components/clubs/MemberList";
import RecruitmentCard from "../components/clubs/RecruitmentCard";
import {
  EmptyState,
  ErrorState,
  LoadingBlock,
} from "../components/common/StateViews";
import { clubTitle, getClubStyle } from "../utils/clubHelpers";

import { raiseJoinRequest, fetchMyJoinRequests } from "../api/clubJoin";
import { useEffect, useState } from "react";

export default function ClubDetail() {
  const { clubId } = useParams();

  // 3 separate API calls: one failure should not stop the other sections
  const club = useApiData(() => fetchClub(clubId), [clubId]);
  const [isManager, setIsManager] = useState(false);
  const members = useApiData(() => fetchClubMembers(clubId), [clubId]);
  const recruitments = useApiData(
    () => fetchClubRecruitments(clubId),
    [clubId],
  );

  const [myRequest, setMyRequest] = useState(null);
  const [requestLoading, setRequestLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joinMessage, setJoinMessage] = useState("");
  const [showJoinModal, setShowJoinModal] = useState(false);

  const clubData = club.data;
  const style = getClubStyle(clubData && clubData.type);

  const notFound =
    club.error && (club.error.status === 404 || club.error.status === 400);

  // Check whether the current user has an active join request
  useEffect(() => {
    if (!clubId) return;

    let cancelled = false;

    (async () => {
      try {
        const requests = await fetchMyJoinRequests();

        if (cancelled) return;

        const active = requests.find(
          (r) =>
            String(r.club_id?._id || r.club_id) === String(clubId) &&
            ["pending", "verification_scheduled"].includes(r.status),
        );

        setMyRequest(active || null);
      } catch {
        // Ignore errors while checking the current user's request
      } finally {
        if (!cancelled) setRequestLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clubId]);

  return (
    <PageShell>
      <Link to="/clubs" className="text-sm text-indigo-600 hover:underline">
        ← Back to clubs
      </Link>

      {club.loading && (
        <div className="mt-4 bg-white rounded-xl shadow-sm border p-8">
          <LoadingBlock lines={4} />
        </div>
      )}

      {!club.loading && club.error && (
        <div className="mt-4">
          <ErrorState
            message={
              notFound ? "This club could not be found." : club.error.message
            }
            onRetry={notFound ? undefined : club.reload}
            backTo="/clubs"
            backLabel="Back to clubs"
          />
        </div>
      )}

      {!club.loading && clubData && (
        <>
          {/* ===== HEADER ===== */}
          <section className="mt-4 rounded-xl overflow-hidden shadow-sm border bg-white">
            <div
              className={`bg-gradient-to-r ${style.gradient} px-8 py-10 flex items-center gap-5 text-white`}
            >
              <span className="text-6xl" role="img" aria-label={style.label}>
                {style.emoji}
              </span>

              <div>
                <h1 className="text-3xl md:text-4xl font-bold">
                  {clubTitle(clubData)}
                </h1>

                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                  <span className="bg-white/20 px-3 py-1 rounded-full">
                    {style.label}
                  </span>

                  <span>
                    👥 {clubData.member_count}{" "}
                    {clubData.member_count === 1 ? "member" : "members"}
                  </span>

                  {clubData.founded_year && (
                    <span>Founded {clubData.founded_year}</span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ===== MANAGE JOIN REQUESTS ===== */}
          {(() => {
            const me = JSON.parse(localStorage.getItem("user") || "{}");

            const myMembership = (members.data || []).find(
              (m) =>
                String(m.user_id?._id || m.user_id) ===
                  String(me.id || me._id) &&
                ["secretary", "core_member"].includes(m.role),
            );

            if (!myMembership) return null;

            return (
              <Link
                to={`/clubs/${clubId}/join-requests`}
                className="inline-block mt-4 bg-emerald-600 text-white px-5 py-2 rounded-lg hover:bg-emerald-700 font-medium text-sm"
              >
                🙋 Manage Join Requests
              </Link>
            );
          })()}

          {/* ===== ABOUT ===== */}
          <section className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">About</h2>

            <div className="bg-white rounded-xl shadow-sm border p-6 text-gray-700">
              {clubData.description || "No description added yet."}
            </div>
          </section>

          {/* ===== ACTIVE RECRUITMENTS ===== */}
          <section className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Active Recruitments
            </h2>

            {recruitments.loading && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <LoadingBlock lines={3} />
              </div>
            )}

            {!recruitments.loading && recruitments.error && (
              <ErrorState
                message={recruitments.error.message}
                onRetry={recruitments.reload}
              />
            )}

            {!recruitments.loading &&
              !recruitments.error &&
              (recruitments.data || []).length === 0 && (
                <EmptyState
                  icon="📋"
                  title="No open recruitments"
                  message="This club is not recruiting right now. Check back soon."
                />
              )}

            {!recruitments.loading &&
              !recruitments.error &&
              (recruitments.data || []).length > 0 && (
                <div className="grid md:grid-cols-2 gap-4">
                  {recruitments.data.map((r) => (
                    <RecruitmentCard key={r._id} recruitment={r} />
                  ))}
                </div>
              )}
          </section>

          {/* ===== MEMBERS ===== */}
          <section className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Members</h2>

            {members.loading && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <LoadingBlock lines={3} />
              </div>
            )}

            {!members.loading && members.error && (
              <ErrorState
                message={members.error.message}
                onRetry={members.reload}
              />
            )}

            {!members.loading &&
              !members.error &&
              (members.data || []).length === 0 && (
                <EmptyState icon="👥" title="No members yet" />
              )}

            {!members.loading &&
              !members.error &&
              (members.data || []).length > 0 && (
                <MemberList members={members.data} />
              )}
          </section>

          {/* ===== JOIN CLUB SECTION ===== */}
          <section className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Interested in joining?
            </h2>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              {requestLoading ? (
                <p className="text-gray-500 text-sm">Checking your status…</p>
              ) : myRequest ? (
                <div>
                  <p className="text-sm font-semibold mb-2">
                    {myRequest.status === "pending" &&
                      "⏳ Your join request is pending with the secretary."}

                    {myRequest.status === "verification_scheduled" &&
                      "📅 Verification scheduled!"}
                  </p>

                  {myRequest.status === "verification_scheduled" && (
                    <div className="text-sm text-gray-700 space-y-1 mt-3">
                      <p>
                        <span className="text-gray-500">Date: </span>
                        {new Date(
                          myRequest.verification_date,
                        ).toLocaleDateString()}
                      </p>

                      {myRequest.verification_venue && (
                        <p>
                          <span className="text-gray-500">Venue: </span>
                          {myRequest.verification_venue}
                        </p>
                      )}

                      {myRequest.verification_notes && (
                        <p className="text-gray-600 text-xs mt-2">
                          {myRequest.verification_notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-gray-700 mb-4 text-sm">
                    Send a join request to the club secretary. You'll hear back
                    once they review your profile.
                  </p>

                  <button
                    onClick={() => setShowJoinModal(true)}
                    className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 font-medium"
                  >
                    🙋 Raise Join Request
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* ===== JOIN REQUEST MODAL ===== */}
          {showJoinModal && (
            <div
              className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4"
              onClick={() => !joining && setShowJoinModal(false)}
            >
              <div
                className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold mb-3">
                  Join {clubTitle(clubData)}
                </h3>

                <p className="text-sm text-gray-600 mb-4">
                  Optionally add a message for the secretary.
                </p>

                <textarea
                  rows={3}
                  value={joinMessage}
                  onChange={(e) => setJoinMessage(e.target.value)}
                  placeholder="Why do you want to join? (optional)"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => setShowJoinModal(false)}
                    disabled={joining}
                    className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={async () => {
                      setJoining(true);

                      try {
                        const req = await raiseJoinRequest(clubId, {
                          message: joinMessage,
                        });

                        setMyRequest(req);
                        setShowJoinModal(false);
                        setJoinMessage("");
                      } catch (err) {
                        alert(
                          err.response?.data?.message ||
                            "Failed to send request",
                        );
                      } finally {
                        setJoining(false);
                      }
                    }}
                    disabled={joining}
                    className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {joining ? "Sending…" : "Send Request"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
