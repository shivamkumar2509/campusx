import { Link } from "react-router-dom";
import {
  VERIFICATION_LABELS,
  daysLeftText,
  formatDate,
} from "../../utils/clubHelpers";

export default function RecruitmentCard({ recruitment: r }) {
  const open = r.is_open;
  return (
    <div className="bg-white rounded-xl shadow-sm border p-5 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900">{r.title}</h3>
        <span
          className={`text-xs font-semibold px-2 py-1 rounded whitespace-nowrap ${
            open ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
          }`}
        >
          {open ? "Open" : "Closed"}
        </span>
      </div>
      {r.description && (
        <p className="mt-2 text-sm text-gray-600 line-clamp-2">{r.description}</p>
      )}
      <div className="mt-3 text-sm text-gray-700 space-y-1">
        <p>
          📅 Deadline: {formatDate(r.application_deadline)}{" "}
          <span className="text-gray-500">({daysLeftText(r.application_deadline)})</span>
        </p>
        <p>🎯 Positions open: {r.positions_open}</p>
        <p>✅ Verification: {VERIFICATION_LABELS[r.verification_type] || r.verification_type}</p>
      </div>
      {open ? (
        <Link
          to={`/recruitments/${r._id}`}
          className="mt-4 block text-center bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 text-sm"
        >
          Apply
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className="mt-4 bg-gray-200 text-gray-500 py-2 rounded-lg text-sm cursor-not-allowed"
        >
          Applications closed
        </button>
      )}
    </div>
  );
}
