import { Link } from "react-router-dom";
import { clubTitle, getClubStyle } from "../../utils/clubHelpers";

export default function ClubCard({ club }) {
  const style = getClubStyle(club.type);
  const count = club.member_count ?? 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border hover:shadow-md transition flex flex-col overflow-hidden">
      <div
        className={`h-24 bg-gradient-to-r ${style.gradient} flex items-center justify-center`}
      >
        <span className="text-5xl" role="img" aria-label={style.label}>
          {style.emoji}
        </span>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 text-lg">{clubTitle(club)}</h3>
          <span
            className={`text-xs font-semibold px-2 py-1 rounded whitespace-nowrap ${style.badge}`}
          >
            {style.label}
          </span>
        </div>
        {club.description && (
          <p className="mt-2 text-sm text-gray-600 line-clamp-2">{club.description}</p>
        )}
        <p className="mt-3 text-sm text-gray-700">
          👥 {count} {count === 1 ? "member" : "members"}
        </p>
        <Link
          to={`/clubs/${club._id}`}
          className="mt-4 block text-center bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 text-sm"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}
