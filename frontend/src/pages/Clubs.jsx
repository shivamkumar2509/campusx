import { useMemo, useState } from "react";
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

  const [search, setSearch] = useState("");

  const clubs = (data && data.data) || [];

  const filteredClubs = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return clubs;

    return clubs.filter((club) => {
      const name = club.name || club.title || club.clubName || "";

      const description = club.description || club.about || "";

      const category = club.category || club.type || "";

      return [name, description, category].some((value) =>
        String(value).toLowerCase().includes(query),
      );
    });
  }, [clubs, search]);

  return (
    <PageShell>
      <div className="min-h-screen pb-12">
        {/* Hero */}
        <section className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-800 to-violet-700 px-6 py-10 text-white shadow-xl sm:px-10 sm:py-14">
          {/* Decorative circles */}
          <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border border-white/10 bg-white/5" />
          <div className="pointer-events-none absolute -bottom-24 right-28 h-64 w-64 rounded-full border border-white/10" />

          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-indigo-100">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              YOUR CAMPUS, YOUR COMMUNITY
            </span>

            <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Find your people.
              <span className="mt-1 block text-violet-300">
                Discover your club.
              </span>
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-7 text-indigo-100 sm:text-base">
              Explore campus communities, discover your interests, meet
              like-minded people, and find your next opportunity.
            </p>

            <a
              href="#club-directory"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-indigo-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-50"
            >
              Explore clubs
              <span aria-hidden="true">↓</span>
            </a>
          </div>

          <div className="relative z-10 mt-9 flex flex-wrap gap-3 sm:absolute sm:bottom-8 sm:right-8 sm:mt-0 sm:max-w-xs sm:justify-end">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-2xl font-bold">{clubs.length}</p>
              <p className="mt-1 text-xs text-indigo-100">Campus clubs</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-2xl font-bold">∞</p>
              <p className="mt-1 text-xs text-indigo-100">Ways to explore</p>
            </div>
          </div>
        </section>

        {/* Directory heading */}
        <section id="club-directory" className="scroll-mt-6">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">
                The community
              </p>

              <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Explore clubs
              </h2>

              <p className="mt-2 text-sm text-gray-500 sm:text-base">
                There is a place for every passion.
              </p>
            </div>

            {!loading && !error && (
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>
                  {filteredClubs.length}{" "}
                  {filteredClubs.length === 1 ? "club" : "clubs"} found
                </span>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
            <label
              htmlFor="club-search"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Find your community
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <svg
                  aria-hidden="true"
                  className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m16 16 4 4" />
                </svg>

                <input
                  id="club-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by club name, interest, or category..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-12 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                >
                  Clear search
                </button>
              )}
            </div>
          </div>

          {/* Loading */}
          {loading && <LoadingCards count={6} />}

          {/* Error */}
          {!loading && error && (
            <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
              <ErrorState message={error.message} onRetry={reload} />
            </div>
          )}

          {/* No clubs */}
          {!loading && !error && clubs.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
              <EmptyState
                icon="🎭"
                title="Your campus story starts here"
                message="Clubs will show up here once they are created."
              />
            </div>
          )}

          {/* No search results */}
          {!loading &&
            !error &&
            clubs.length > 0 &&
            filteredClubs.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-3xl">
                  🔎
                </div>

                <h3 className="mt-5 text-lg font-bold text-gray-900">
                  No matching clubs
                </h3>

                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500">
                  We couldn't find a club matching "{search}". Try another name
                  or interest.
                </p>

                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  Show all clubs
                </button>
              </div>
            )}

          {/* Club grid */}
          {!loading && !error && filteredClubs.length > 0 && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredClubs.map((club) => (
                <div
                  key={club._id}
                  className="group min-w-0 rounded-2xl border border-gray-200/80 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-950/5"
                >
                  <ClubCard club={club} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Bottom banner */}
        {!loading && !error && clubs.length > 0 && (
          <section className="mt-12 overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50/70 px-6 py-7 sm:flex sm:items-center sm:justify-between sm:px-8">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Your next chapter starts with a connection.
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Discover something new, share your skills, and make your campus
                experience count.
              </p>
            </div>

            <a
              href="#club-directory"
              className="mt-5 inline-flex shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 sm:ml-6 sm:mt-0"
            >
              Browse communities →
            </a>
          </section>
        )}
      </div>
    </PageShell>
  );
}