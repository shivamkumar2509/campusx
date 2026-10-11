import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchNotifications, markNotificationRead } from "../api/notifications";
import PageShell from "../components/common/PageShell";
import NotificationItem from "../components/notifications/NotificationItem";
import PreferencesModal from "../components/notifications/PreferencesModal";
import { EmptyState, ErrorState, LoadingBlock } from "../components/common/StateViews";
import { clearSession, getErrorInfo } from "../utils/clubHelpers";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "read", label: "Read" },
];
const PAGE_SIZE = 20;

export default function Notifications() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState("");
  const [showPrefs, setShowPrefs] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const handleFailure = useCallback(
    (err) => {
      const info = getErrorInfo(err);
      if (info.status === 401) {
        clearSession();
        navigate("/login", { replace: true });
        return null;
      }
      return info;
    },
    [navigate]
  );

  const queryFor = (pageNumber) => ({
    page: pageNumber,
    limit: PAGE_SIZE,
    ...(filter !== "all" ? { status: filter } : {}),
  });

  // Pehla page: filter badalne ya retry pe
  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        setLoading(true);
        setError(null);
        setActionError("");
        return fetchNotifications({
          page: 1,
          limit: PAGE_SIZE,
          ...(filter !== "all" ? { status: filter } : {}),
        });
      })
      .then((res) => {
        if (cancelled) return;
        setItems(res.data);
        setMeta(res.meta);
        setPage(1);
        setUnread(res.meta.unread_count || 0);
      })
      .catch((err) => {
        if (cancelled) return;
        const info = handleFailure(err);
        if (info) setError(info);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filter, reloadKey, handleFailure]);

  const loadMore = async () => {
    setLoadingMore(true);
    setActionError("");
    try {
      const res = await fetchNotifications(queryFor(page + 1));
      setItems((prev) => {
        const seen = new Set(prev.map((x) => x._id));
        return [...prev, ...res.data.filter((x) => !seen.has(x._id))];
      });
      setMeta(res.meta);
      setPage((p) => p + 1);
      setUnread(res.meta.unread_count || 0);
    } catch (err) {
      const info = handleFailure(err);
      if (info) setActionError(info.message);
    } finally {
      setLoadingMore(false);
    }
  };

  // Optimistic: pehle UI badlo, fail ho to wapas
  const markRead = async (n) => {
    if (n.read) return true;
    setActionError("");
    setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
    setUnread((u) => Math.max(0, u - 1));
    try {
      await markNotificationRead(n._id);
      return true;
    } catch (err) {
      setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: false } : x)));
      setUnread((u) => u + 1);
      const info = handleFailure(err);
      if (info) setActionError("Could not mark as read. Please try again.");
      return false;
    }
  };

  const openNotification = async (n) => {
    const ok = await markRead(n);
    if (ok && n.link && n.link.startsWith("/")) navigate(n.link);
  };

  const hasMore = meta ? page < meta.totalPages : false;

  return (
    <PageShell unreadCount={unread}>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="mt-1 text-gray-600">
            {unread > 0 ? `${unread} unread` : "You're all caught up"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowPrefs(true)}
          className="border border-indigo-600 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-50 text-sm font-medium"
        >
          ⚙️ Preferences
        </button>
      </div>

      <div className="flex gap-2 mb-4" role="tablist" aria-label="Filter notifications">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border ${
              filter === f.key
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {actionError && (
        <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
          {actionError}
        </p>
      )}

      {loading && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <LoadingBlock lines={5} />
        </div>
      )}

      {!loading && error && (
        <ErrorState message={error.message} onRetry={() => setReloadKey((k) => k + 1)} />
      )}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          icon="🔔"
          title={filter === "unread" ? "No unread notifications" : "No notifications yet"}
          message="You're all caught up. New updates will appear here."
        />
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <ul className="bg-white rounded-xl shadow-sm border divide-y overflow-hidden">
            {items.map((n) => (
              <NotificationItem
                key={n._id}
                notification={n}
                onOpen={openNotification}
                onMarkRead={markRead}
              />
            ))}
          </ul>
          {hasMore && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="border px-5 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </>
      )}

      {showPrefs && <PreferencesModal onClose={() => setShowPrefs(false)} />}
    </PageShell>
  );
}
