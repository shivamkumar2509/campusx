import { useState } from "react";
import { fetchClubs } from "../api/clubs";
import useApiData from "../hooks/useApiData";
import PageShell from "../components/common/PageShell";
import ClubCard from "../components/clubs/ClubCard";
import {
  EmptyState,
  ErrorState,
  LoadingCards,
} from "../components/common/StateViews";

export default function Clubs() {
  const { data, loading, error, reload } = useApiData(
    () => fetchClubs({ limit: 100 }),
    [],
  );
  const clubs = (data && data.data) || [];

  // Future-proof search state
  const [search, setSearch] = useState("");

  const filteredClubs = clubs.filter((c) =>
    search.trim() ? c.name.toLowerCase().includes(search.toLowerCase()) : true,
  );

  return (
    <PageShell>
      {/* ===== HERO HEADER ===== */}
      <div className="mb-10 text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
          Explore <span className="text-indigo-600">Clubs</span>
        </h1>
        <p className="text-lg text-gray-500">
          Discover campus clubs, meet their members, and find your community.
        </p>
      </div>

      {/* ===== SEARCH BAR ===== */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap md:flex-nowrap gap-2 mb-10 max-w-2xl mx-auto sticky top-4 z-10 backdrop-blur-md bg-white/90">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            🔍
          </span>
          <input
            type="search"
            placeholder="Search clubs by name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-gray-700"
          />
        </div>
      </div>

      {/* ===== CONTENT STATES ===== */}
      {loading && (
        <div className="py-10">
          <LoadingCards count={5} />
        </div>
      )}

      {!loading && error && (
        <ErrorState message={error.message} onRetry={reload} />
      )}

      {/* Premium Empty State */}
      {!loading && !error && filteredClubs.length === 0 && (
        <div className="py-24 bg-white rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center px-4">
          <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
            <span className="text-5xl">🎭</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {search ? "No clubs match your search" : "No clubs found"}
          </h3>
          <p className="text-gray-500 max-w-md mx-auto mb-8">
            {search
              ? `We couldn't find any clubs matching "${search}". Try a different keyword.`
              : "Clubs will show up here once they are created by the administration."}
          </p>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
            >
              Clear Search
            </button>
          )}
        </div>
      )}

      {/* ===== CLUBS GRID ===== */}
      {!loading && !error && filteredClubs.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClubs.map((club) => (
            <ClubCard key={club._id} club={club} />
          ))}
        </div>
      )}
    </PageShell>
  );
}