import { notificationIcon, timeAgo } from "../../utils/clubHelpers";

export default function NotificationItem({ notification: n, onOpen, onMarkRead }) {
  return (
    <li className={`flex items-start gap-1 ${n.read ? "bg-white" : "bg-indigo-50/60"}`}>
      <button
        type="button"
        onClick={() => onOpen(n)}
        className="flex-1 min-w-0 flex items-start gap-3 p-4 text-left hover:bg-gray-50"
      >
        <span className="text-2xl" aria-hidden="true">
          {notificationIcon(n.type)}
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2">
            <span className={`block text-gray-900 ${n.read ? "font-medium" : "font-semibold"}`}>
              {n.title}
            </span>
            {!n.read && (
              <span className="w-2 h-2 rounded-full bg-indigo-600" aria-label="Unread" />
            )}
          </span>
          {n.message && <span className="block text-sm text-gray-600">{n.message}</span>}
          <span className="block text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</span>
        </span>
      </button>
      {!n.read && (
        <button
          type="button"
          onClick={() => onMarkRead(n)}
          className="m-3 text-xs text-indigo-600 hover:underline whitespace-nowrap"
        >
          Mark as read
        </button>
      )}
    </li>
  );
}
