import { Link, useParams } from "react-router-dom";
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

export default function ClubDetail() {
  const { clubId } = useParams();

  // 3 alag calls: ek fail ho to baaki page chalta rahe
  const club = useApiData(() => fetchClub(clubId), [clubId]);
  const members = useApiData(() => fetchClubMembers(clubId), [clubId]);
  const recruitments = useApiData(() => fetchClubRecruitments(clubId), [clubId]);

  const clubData = club.data;
  const style = getClubStyle(clubData && clubData.type);
  const notFound = club.error && (club.error.status === 404 || club.error.status === 400);

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
            message={notFound ? "This club could not be found." : club.error.message}
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
                <h1 className="text-3xl md:text-4xl font-bold">{clubTitle(clubData)}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                  <span className="bg-white/20 px-3 py-1 rounded-full">{style.label}</span>
                  <span>
                    👥 {clubData.member_count}{" "}
                    {clubData.member_count === 1 ? "member" : "members"}
                  </span>
                  {clubData.founded_year && <span>Founded {clubData.founded_year}</span>}
                </div>
              </div>
            </div>
          </section>

          {/* ===== ABOUT ===== */}
          <section className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">About</h2>
            <div className="bg-white rounded-xl shadow-sm border p-6 text-gray-700">
              {clubData.description || "No description added yet."}
            </div>
          </section>

          {/* ===== ACTIVE RECRUITMENTS ===== */}
          <section className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Active Recruitments</h2>
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
              <ErrorState message={members.error.message} onRetry={members.reload} />
            )}
            {!members.loading && !members.error && (members.data || []).length === 0 && (
              <EmptyState icon="👥" title="No members yet" />
            )}
            {!members.loading && !members.error && (members.data || []).length > 0 && (
              <MemberList members={members.data} />
            )}
          </section>
        </>
      )}
    </PageShell>
  );
}