import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import PageShell from "../components/common/PageShell";
import { EmptyState, ErrorState, LoadingCards } from "../components/common/StateViews";

const FILTERS = ["All", "Events", "Teams", "Clubs"];

function getArray(payload, key) {
  // Supports the standard { data: [...] } response used elsewhere in CampusX,
  // as well as grouped search responses such as { data: { events, teams, clubs } }.
  const root = payload?.data ?? payload;
  if (Array.isArray(root)) return root;
  if (Array.isArray(root?.[key])) return root[key];
  if (Array.isArray(payload?.[key])) return payload[key];
  return [];
}

function resultTitle(item, type) {
  if (type === "Clubs") return item.display_name || item.name || "Untitled club";
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
  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{type.slice(0, -1)}</span>
        <span className="text-sm font-medium text-indigo-600">View details →</span>
      </div>
      <h3 className="mt-4 text-lg font-bold text-gray-900">{title}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-600">{description}</p>
      {type === "Events" && item.deadline && (
        <p className="mt-3 text-xs text-gray-500">Deadline: {new Date(item.deadline).toLocaleDateString()}</p>
      )}
      {type === "Clubs" && item.type && (
        <p className="mt-3 text-xs capitalize text-gray-500">Category: {item.type}</p>
      )}
      {type === "Teams" && item.status && (
        <p className="mt-3 text-xs capitalize text-gray-500">Status: {item.status}</p>
      )}
    </>
  );

  return url ? (
    <Link to={url} aria-label={`View ${title}`} className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
      {content}
    </Link>
  ) : (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">{content}</article>
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
        // The backend exposes the combined endpoint and category-specific endpoints.
        // Use the combined endpoint so all result groups come from the database.
        const response = await api.get("/search", { params: { q: trimmedQuery } });
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
          setError(err.response?.data?.message || "Search could not be completed. Please check the backend connection.");
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

  const total = visibleGroups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <PageShell>
      <div className="mb-8">
        <p className="text-sm font-bold tracking-widest text-indigo-600">DISCOVER CAMPUSX</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900 md:text-4xl">Search</h1>
        <p className="mt-2 text-gray-600">Find events, teams and clubs across your campus community.</p>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-7">
        <label htmlFor="campus-search" className="mb-3 block text-sm font-semibold text-gray-800">What are you looking for?</label>
        <div className="relative">
          <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl">⌕</span>
          <input
            id="campus-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search events, teams or clubs..."
            autoComplete="off"
            className="w-full rounded-xl border border-gray-300 py-4 pl-12 pr-4 text-base outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Filter search results">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              aria-pressed={filter === item}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${filter === item ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {error && <div className="mt-6"><ErrorState message={error} onRetry={() => setQuery((value) => `${value}`)} /></div>}

      {!error && !trimmedQuery && (
        <div className="mt-7 rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-12 text-center">
          <div className="text-4xl" aria-hidden="true">🔎</div>
          <h2 className="mt-3 text-lg font-semibold text-gray-900">Start exploring</h2>
          <p className="mt-1 text-sm text-gray-500">Type a name or keyword to search real CampusX data.</p>
        </div>
      )}

      {!error && trimmedQuery && loading && <div className="mt-7"><LoadingCards count={3} /></div>}

      {!error && trimmedQuery && !loading && total === 0 && (
        <div className="mt-7">
          <EmptyState icon="🔎" title="No results found" message="Try another keyword or switch the category filter." />
        </div>
      )}

      {!error && trimmedQuery && !loading && total > 0 && (
        <div className="mt-8 space-y-8">
          <p className="text-sm text-gray-500">{total} result{total === 1 ? "" : "s"} for <span className="font-semibold text-gray-800">“{trimmedQuery}”</span></p>
          {visibleGroups.filter((group) => group.items.length > 0).map((group) => (
            <section key={group.type} aria-labelledby={`search-${group.type.toLowerCase()}`}>
              <div className="mb-4 flex items-center justify-between">
                <h2 id={`search-${group.type.toLowerCase()}`} className="text-xl font-bold text-gray-900">{group.type}</h2>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">{group.items.length}</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((item) => (
                  <SearchResultCard key={item._id || item.id || `${group.type}-${resultTitle(item, group.type)}`} item={item} type={group.type} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </PageShell>
  );
}
