import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import PageShell from "../components/common/PageShell";
import {
  EmptyState,
  ErrorState,
  LoadingCards,
} from "../components/common/StateViews";

const FILTERS = [
  { label: "All", icon: "✨" },
  { label: "Events", icon: "📅" },
  { label: "Teams", icon: "👥" },
  { label: "Clubs", icon: "🎭" },
];

function getArray(payload, key) {
  const root = payload?.data ?? payload;
  if (Array.isArray(root)) return root;
  if (Array.isArray(root?.[key])) return root[key];
  if (Array.isArray(payload?.[key])) return payload[key];
  return [];
}

function resultTitle(item, type) {
  if (type === "Clubs")
    return item.display_name || item.name || "Untitled club";
  return item.title || item.name || "Untitled result";
}

function resultDescription(item) {
  return item.description || "No description available.";
}

function resultUrl(item, type) {
  const id = item._id || item.id;
  if (!id) return null;
  if (type === "Events") return `/events/${id}`;
  if (type === "Teams") return `/teams/${id}`;
  return `/clubs/${id}`;
}

function SearchResultCard({ item, type }) {
  const url = resultUrl(item, type);
  const title = resultTitle(item, type);
  const description = resultDescription(item);

  const typeConfig = {
    Events: { color: "bg-purple-100 text-purple-700", icon: "📅" },
    Teams: { color: "bg-blue-100 text-blue-700", icon: "👥" },
    Clubs: { color: "bg-pink-100 text-pink-700", icon: "🎭" },
  }[type] || { color: "bg-gray-100 text-gray-700", icon: "📄" };

  const content = (
    <>
      <div className="flex items-center justify-between gap-3 mb-4">
        <span
          className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${typeConfig.color}`}
        >
          {typeConfig.icon} {type.slice(0, -1)}
        </span>
        <span className="text-sm font-semibold text-indigo-600 group-hover:translate-x-1 transition-transform">
          View →
        </span>
      </div>
      <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-500 line-clamp-2">
        {description}
      </p>

      <div className="mt-4 pt-4 border-t border-gray-100">
        {type === "Events" && item.deadline && (
          <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
            <span className="text-amber-500">⏰</span> Deadline:{" "}
            {new Date(item.deadline).toLocaleDateString()}
          </p>
        )}
        {type === "Clubs" && item.type && (
          <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5 capitalize">
            <span className="text-pink-500">🏷️</span> Category: {item.type}
          </p>
        )}
        {type === "Teams" && item.status && (
          <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5 capitalize">
            <span className="text-blue-500">📍</span> Status: {item.status}
          </p>
        )}
        {!item.deadline && !item.type && !item.status && (
          <p className="text-xs font-medium text-gray-400">
            Click to view details
          </p>
        )}
      </div>
    </>
  );

  const baseClass =
    "group flex flex-col h-full rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300";

  return url ? (
    <Link
      to={url}
      className={`${baseClass} hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg`}
    >
      {content}
    </Link>
  ) : (
    <article className={baseClass}>{content}</article>
  );
}

export default function Search() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [results, setResults] = useState({ events: [], teams: [], clubs: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const trimmedQuery = query.trim();

  useEffect(() => {
    if (!trimmedQuery) {
      setResults({ events: [], teams: [], clubs: [] });
      setError("");
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.get("/search", {
          params: { q: trimmedQuery },
        });
        if (cancelled) return;
        const body = response.data;
        const grouped = body?.data ?? body;
        setResults({
          events: getArray(grouped, "events"),
          teams: getArray(grouped, "teams"),
          clubs: getArray(grouped, "clubs"),
        });
      } catch (err) {
        if (!cancelled) {
          setResults({ events: [], teams: [], clubs: [] });
          setError(
            err.response?.data?.message ||
              "Search could not be completed. Please check the backend connection.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmedQuery]);

  const visibleGroups = useMemo(() => {
    const groups = [
      { type: "Events", items: results.events },
      { type: "Teams", items: results.teams },
      { type: "Clubs", items: results.clubs },
    ];
    return groups.filter((group) => filter === "All" || group.type === filter);
  }, [results, filter]);

  const total = visibleGroups.reduce(
    (sum, group) => sum + group.items.length,
    0,
  );

  return (
    <PageShell>
      {/* ===== HERO HEADER ===== */}
      <div className="mb-10 text-center max-w-2xl mx-auto mt-4">
        <div className="inline-block mb-3 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold tracking-widest uppercase">
          Discover CampusX
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
          Find Anything <span className="text-indigo-600">Instantly</span>
        </h1>
        <p className="text-lg text-gray-500">
          Search across events, teams, and clubs in one place.
        </p>
      </div>

      {/* ===== SEARCH BOX ===== */}
      <section className="max-w-3xl mx-auto mb-10">
        <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-400">
              ⌕
            </span>
            <input
              id="campus-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search events, teams, or clubs..."
              autoComplete="off"
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-gray-800 text-lg"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div
          className="mt-6 flex flex-wrap justify-center gap-2"
          aria-label="Filter search results"
        >
          {FILTERS.map((f) => (
            <button
              key={f.label}
              type="button"
              onClick={() => setFilter(f.label)}
              aria-pressed={filter === f.label}
              className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                filter === f.label
                  ? "bg-gray-900 text-white shadow-md transform scale-105"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
              }`}
            >
              <span>{f.icon}</span>
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {/* ===== STATES & RESULTS ===== */}
      {error && (
        <div className="mt-6">
          <ErrorState
            message={error}
            onRetry={() => setQuery((value) => `${value}`)}
          />
        </div>
      )}

      {/* Initial Empty State */}
      {!error && !trimmedQuery && (
        <div className="mt-10 py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
            <span className="text-4xl" aria-hidden="true">
              🔎
            </span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Start exploring
          </h2>
          <p className="text-gray-500 max-w-sm">
            Type a name, skill, or keyword above to search real CampusX data.
          </p>
        </div>
      )}

      {/* Loading State */}
      {!error && trimmedQuery && loading && (
        <div className="mt-10 max-w-5xl mx-auto">
          <LoadingCards count={3} />
        </div>
      )}

      {/* No Results State */}
      {!error && trimmedQuery && !loading && total === 0 && (
        <div className="mt-10">
          <EmptyState
            icon="🤷‍♂️"
            title="No results found"
            message={`We couldn't find anything for "${trimmedQuery}". Try another keyword or switch the filter.`}
          />
        </div>
      )}

      {/* Results Grid */}
      {!error && trimmedQuery && !loading && total > 0 && (
        <div className="mt-8 max-w-5xl mx-auto space-y-12">
          <p className="text-gray-500 font-medium border-b pb-4">
            Found <span className="font-bold text-gray-900">{total}</span>{" "}
            result{total === 1 ? "" : "s"} for{" "}
            <span className="font-bold text-indigo-600">“{trimmedQuery}”</span>
          </p>

          {visibleGroups
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <section
                key={group.type}
                aria-labelledby={`search-${group.type.toLowerCase()}`}
              >
                <div className="mb-5 flex items-center justify-between">
                  <h2
                    id={`search-${group.type.toLowerCase()}`}
                    className="text-xl font-bold text-gray-900 flex items-center gap-2"
                  >
                    {group.type}
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
                      {group.items.length}
                    </span>
                  </h2>
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((item) => (
                    <SearchResultCard
                      key={
                        item._id ||
                        item.id ||
                        `${group.type}-${resultTitle(item, group.type)}`
                      }
                      item={item}
                      type={group.type}
                    />
                  ))}
                </div>
              </section>
            ))}
        </div>
      )}
    </PageShell>
  );
}