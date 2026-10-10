import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { applyToRecruitment, fetchRecruitment } from "../api/recruitments";
import useApiData from "../hooks/useApiData";
import PageShell from "../components/common/PageShell";
import ApplicationForm from "../components/recruitment/ApplicationForm";
import { ErrorState, LoadingBlock } from "../components/common/StateViews";
import {
  VERIFICATION_LABELS,
  clearSession,
  clubTitle,
  daysLeftText,
  formatDate,
  getClubStyle,
  getErrorInfo,
} from "../utils/clubHelpers";

const STATUS_LABELS = {
  applied: "Applied",
  verified: "Verified",
  approved: "Approved",
  rejected: "Rejected",
};

const EXPERIENCE_LABELS = {
  any: "Any experience level",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export default function Recruitment() {
  const { recruitmentId } = useParams();
  return <RecruitmentContent key={recruitmentId} recruitmentId={recruitmentId} />;
}

function RecruitmentContent({ recruitmentId }) {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApiData(
    () => fetchRecruitment(recruitmentId),
    [recruitmentId]
  );

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [appliedStatus, setAppliedStatus] = useState(null);
  const [justApplied, setJustApplied] = useState(false);

  const handleApply = async (body) => {
    setSubmitting(true);
    setSubmitError("");
    try {
      const result = await applyToRecruitment(recruitmentId, body);
      setAppliedStatus((result.application && result.application.status) || "applied");
      setJustApplied(true);
      setShowForm(false);
    } catch (err) {
      const info = getErrorInfo(err);
      if (info.status === 401) {
        clearSession();
        navigate("/login", { replace: true });
        return;
      }
      if (info.code === "ALREADY_APPLIED") {
        setAppliedStatus("applied");
        setShowForm(false);
      } else if (info.code === "RECRUITMENT_CLOSED") {
        setSubmitError("Applications are closed for this recruitment.");
      } else if (info.code === "ALREADY_CLUB_MEMBER") {
        setSubmitError("You are already a member of this club.");
      } else {
        setSubmitError(info.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const notFound = error && (error.status === 404 || error.status === 400);

  return (
    <PageShell>
      {loading && (
        <div className="bg-white rounded-xl shadow-sm border p-8">
          <LoadingBlock lines={5} />
        </div>
      )}

      {!loading && error && (
        <ErrorState
          message={notFound ? "This recruitment could not be found." : error.message}
          onRetry={notFound ? undefined : reload}
          backTo="/clubs"
          backLabel="Back to clubs"
        />
      )}

      {!loading && data && (
        <RecruitmentBody
          r={data}
          showForm={showForm}
          setShowForm={setShowForm}
          submitting={submitting}
          submitError={submitError}
          appliedStatus={appliedStatus || (data.has_applied && data.application ? data.application.status : null)}
          justApplied={justApplied}
          onSubmit={handleApply}
        />
      )}
    </PageShell>
  );
}

function RecruitmentBody({
  r,
  showForm,
  setShowForm,
  submitting,
  submitError,
  appliedStatus,
  justApplied,
  onSubmit,
}) {
  const style = getClubStyle(r.club && r.club.type);
  const details = r.verification_details || {};
  const skills = (r.requirements && r.requirements.skills) || [];
  const experience = r.requirements && r.requirements.experience;
  const hasDetails = details.date || details.time || details.venue || details.mode;
  const hasApplied = Boolean(appliedStatus) || r.has_applied;

  return (
    <>
      {r.club && (
        <Link to={`/clubs/${r.club._id}`} className="text-sm text-indigo-600 hover:underline">
          ← Back to {clubTitle(r.club)}
        </Link>
      )}

      {/* ===== HEADER ===== */}
      <section className="mt-4 bg-white rounded-xl shadow-sm border p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          {r.club && (
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${style.badge}`}>
              {style.emoji} {clubTitle(r.club)}
            </span>
          )}
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full ${
              r.is_open ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
            }`}
          >
            {r.is_open ? "Open" : "Closed"}
          </span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">{r.title}</h1>
        {r.description && <p className="mt-3 text-gray-700">{r.description}</p>}

        <div className="mt-6 grid sm:grid-cols-3 gap-4">
          <InfoBox label="Deadline" value={formatDate(r.application_deadline)} hint={daysLeftText(r.application_deadline)} />
          <InfoBox label="Positions available" value={String(r.positions_open)} />
          <InfoBox label="Verification" value={VERIFICATION_LABELS[r.verification_type] || r.verification_type} />
        </div>
      </section>

      {/* ===== REQUIREMENTS ===== */}
      <section className="mt-6 bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-3">Requirements</h2>
        <p className="text-sm text-gray-500 mb-2">Skills</p>
        {skills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <span key={s} className="bg-indigo-50 text-indigo-700 text-sm px-3 py-1 rounded-full">
                {s}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-gray-700 text-sm">No specific skills required.</p>
        )}
        {experience && (
          <p className="mt-4 text-sm text-gray-700">
            <span className="text-gray-500">Experience: </span>
            {EXPERIENCE_LABELS[experience] || experience}
          </p>
        )}
      </section>

      {/* ===== VERIFICATION DETAILS ===== */}
      {hasDetails && (
        <section className="mt-6 bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Verification Details</h2>
          <dl className="grid sm:grid-cols-2 gap-3 text-sm">
            {details.date && <Detail label="Date" value={formatDate(details.date)} />}
            {details.time && <Detail label="Time" value={details.time} />}
            {details.venue && <Detail label="Venue" value={details.venue} />}
            {details.mode && <Detail label="Mode" value={details.mode} />}
          </dl>
        </section>
      )}

      {/* ===== APPLY ===== */}
      <section className="mt-6 bg-white rounded-xl shadow-sm border p-6">
        {justApplied && (
          <p className="mb-4 text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-4 py-3" role="status">
            Application submitted successfully! The club secretary has been notified.
          </p>
        )}

        {hasApplied ? (
          <div className="flex items-center gap-3">
            <span className="text-green-700 font-semibold">✅ You have applied to this recruitment.</span>
            {appliedStatus && (
              <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full">
                {STATUS_LABELS[appliedStatus] || appliedStatus}
              </span>
            )}
          </div>
        ) : !r.is_open ? (
          <div>
            <p className="text-gray-700 mb-3">Applications are closed for this recruitment.</p>
            <button type="button" disabled className="bg-gray-200 text-gray-500 px-5 py-2 rounded-lg text-sm cursor-not-allowed">
              Applications closed
            </button>
          </div>
        ) : showForm ? (
          <ApplicationForm
            verificationType={r.verification_type}
            submitting={submitting}
            serverError={submitError}
            onSubmit={onSubmit}
            onCancel={() => setShowForm(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 font-medium"
          >
            Apply Now
          </button>
        )}
      </section>
    </>
  );
}

function InfoBox({ label, value, hint }) {
  return (
    <div className="bg-gray-50 border rounded-lg p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-900 font-medium">{value}</dd>
    </div>
  );
}
