import { Link } from "react-router-dom";

export function LoadingCards({ count = 6 }) {
  return (
    <div
      className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
      role="status"
      aria-label="Loading"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-xl shadow-sm border overflow-hidden animate-pulse"
        >
          <div className="h-24 bg-gray-200" />
          <div className="p-5 space-y-3">
            <div className="h-5 bg-gray-200 rounded w-2/3" />
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-9 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LoadingBlock({ lines = 3 }) {
  return (
    <div className="space-y-3 animate-pulse" role="status" aria-label="Loading">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-5 bg-gray-200 rounded"
          style={{ width: `${100 - i * 15}%` }}
        />
      ))}
    </div>
  );
}

export function EmptyState({ icon = "📭", title, message }) {
  return (
    <div className="bg-white border border-dashed rounded-xl py-12 px-6 text-center">
      <div className="text-5xl mb-3">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {message && <p className="mt-1 text-sm text-gray-600">{message}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry, backTo, backLabel = "Go back" }) {
  return (
    <div
      className="bg-red-50 border border-red-200 rounded-xl py-8 px-6 text-center"
      role="alert"
    >
      <div className="text-4xl mb-2">⚠️</div>
      <p className="font-semibold text-red-800">
        {message || "Something went wrong."}
      </p>
      <div className="mt-4 flex justify-center gap-3 flex-wrap">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm"
          >
            Try again
          </button>
        )}
        {backTo && (
          <Link
            to={backTo}
            className="border border-red-300 text-red-700 px-4 py-2 rounded-lg hover:bg-red-100 text-sm"
          >
            {backLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
