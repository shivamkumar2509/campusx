import { useEffect, useState } from "react";
import { fetchPreferences, updatePreferences } from "../../api/notifications";
import { getErrorInfo } from "../../utils/clubHelpers";
import { ErrorState, LoadingBlock } from "../common/StateViews";

const OPTIONS = [
  { key: "email_enabled", label: "Email", desc: "Receive notifications by email" },
  { key: "push_enabled", label: "Push", desc: "Receive push alerts on your device" },
  { key: "chat_enabled", label: "Chat", desc: "New messages in your team chats" },
  { key: "match_enabled", label: "Team matches", desc: "AI team suggestions and matches" },
  { key: "deadline_enabled", label: "Deadlines", desc: "Reminders before deadlines" },
  { key: "club_enabled", label: "Clubs", desc: "Recruitments and application updates" },
];

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
        checked ? "bg-indigo-600" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function PreferencesModal({ onClose }) {
  const [saved, setSaved] = useState(null); // server pe jo hai
  const [draft, setDraft] = useState(null); // user ne jo badla
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        setLoading(true);
        setLoadError("");
        return fetchPreferences();
      })
      .then((prefs) => {
        if (cancelled) return;
        setSaved(prefs);
        setDraft(prefs);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(getErrorInfo(err).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const changedKeys =
    saved && draft ? OPTIONS.map((o) => o.key).filter((k) => saved[k] !== draft[k]) : [];

  const handleSave = async () => {
    if (changedKeys.length === 0) {
      setMessage({ type: "info", text: "No changes to save." });
      return;
    }
    const body = {};
    changedKeys.forEach((k) => {
      body[k] = draft[k];
    });
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const updated = await updatePreferences(body);
      setSaved(updated);
      setDraft(updated);
      setMessage({ type: "success", text: "Preferences saved." });
    } catch (err) {
      setMessage({ type: "error", text: getErrorInfo(err).message });
    } finally {
      setSaving(false);
    }
  };

  const messageClass = {
    success: "text-green-800 bg-green-50 border-green-200",
    error: "text-red-700 bg-red-50 border-red-200",
    info: "text-gray-700 bg-gray-50 border-gray-200",
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Notification preferences"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">Notification Preferences</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-2xl text-gray-500 hover:text-gray-800"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-4">
          {loading && <LoadingBlock lines={4} />}
          {!loading && loadError && (
            <ErrorState message={loadError} onRetry={() => setAttempt((a) => a + 1)} />
          )}
          {!loading && !loadError && draft && (
            <ul className="divide-y">
              {OPTIONS.map((o) => (
                <li key={o.key} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900">{o.label}</p>
                    <p className="text-sm text-gray-500">{o.desc}</p>
                  </div>
                  <Toggle
                    checked={Boolean(draft[o.key])}
                    label={o.label}
                    onChange={(value) => {
                      setMessage({ type: "", text: "" });
                      setDraft((d) => ({ ...d, [o.key]: value }));
                    }}
                  />
                </li>
              ))}
            </ul>
          )}

          {message.text && (
            <p className={`mt-4 text-sm border rounded-lg px-3 py-2 ${messageClass[message.type]}`} role="status">
              {message.text}
            </p>
          )}
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="border px-5 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading || Boolean(loadError)}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
