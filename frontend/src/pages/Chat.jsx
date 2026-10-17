import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import PageShell from "../components/common/PageShell";
import { LoadingBlock, ErrorState } from "../components/common/StateViews";
import { fetchTeamConversation } from "../api/teams";
import { fetchMessages, sendMessage, markConversationRead } from "../api/chat";
import { getSocket } from "../api/socket";
import useApiData from "../hooks/useApiData";

const PAGE_SIZE = 30;

function fmtTime(d) {
  const t = new Date(d);
  const hh = String(t.getHours()).padStart(2, "0");
  const mm = String(t.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// Extract { status, code, message } from an axios error thrown by useApiData
function getErrInfo(err) {
  if (!err) return { status: 0, code: "", message: "" };
  return {
    status: err.status || err.response?.status || 0,
    code: err.code || err.response?.data?.error_code || "",
    message: err.message || err.response?.data?.message || "",
  };
}

export default function Chat() {
  const { teamId } = useParams();
  const conversation = useApiData(
    () => fetchTeamConversation(teamId),
    [teamId],
  );

  const convId = conversation.data?._id;

  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [error, setError] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [typingUser, setTypingUser] = useState(null);

  const myUserId = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}").id;
    } catch {
      return null;
    }
  })();

  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const socketRef = useRef(null);

  // Load first page of messages
  useEffect(() => {
    if (!convId) return;
    let cancelled = false;
    setLoadingMsgs(true);
    setError(null);
    fetchMessages(convId, { page: 1, limit: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setMessages(res.data || []);
        markConversationRead(convId).catch(() => {});
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.response?.data?.message || "Failed to load messages");
      })
      .finally(() => {
        if (!cancelled) setLoadingMsgs(false);
      });
    return () => {
      cancelled = true;
    };
  }, [convId]);

  // WebSocket wiring
  useEffect(() => {
    if (!convId) return;
    const s = getSocket();
    socketRef.current = s;

    s.emit("conv:join", { convId });

    const onNew = (msg) => {
      if (String(msg.conv_id) !== String(convId)) return;
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      if (String(msg.sender?._id) !== String(myUserId)) {
        markConversationRead(convId).catch(() => {});
      }
    };
    const onEdited = (payload) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === payload._id ? { ...m, ...payload } : m)),
      );
    };
    const onTypingStart = ({ userId }) => {
      if (String(userId) !== String(myUserId)) setTypingUser(userId);
    };
    const onTypingStop = () => setTypingUser(null);

    s.on("message:new", onNew);
    s.on("message:edited", onEdited);
    s.on("typing:start", onTypingStart);
    s.on("typing:stop", onTypingStop);

    return () => {
      s.emit("conv:leave", { convId });
      s.off("message:new", onNew);
      s.off("message:edited", onEdited);
      s.off("typing:start", onTypingStart);
      s.off("typing:stop", onTypingStop);
    };
  }, [convId, myUserId]);

  // Auto-scroll
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  const handleTyping = useCallback(
    (value) => {
      setText(value);
      const s = socketRef.current;
      if (!s || !convId) return;
      s.emit("typing:start", { convId });
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        s.emit("typing:stop", { convId });
      }, 1200);
    },
    [convId],
  );

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await sendMessage(convId, { content: text.trim() });
      // socket event will append; but add optimistically if socket missed it
      setMessages((prev) => {
        if (prev.some((m) => m._id === res.data._id)) return prev;
        return [...prev, res.data];
      });
      setText("");
      socketRef.current?.emit("typing:stop", { convId });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  // ===== Loading =====
  if (conversation.loading) {
    return (
      <PageShell>
        <div className="bg-white rounded-xl shadow-sm border p-8">
          <LoadingBlock lines={5} />
        </div>
      </PageShell>
    );
  }

  // ===== Error / gate =====
  if (conversation.error) {
    const info = getErrInfo(conversation.error);

    // Team not confirmed yet
    const notConfirmed =
      info.code === "TEAM_NOT_CONFIRMED" ||
      (info.status === 403 && /confirm/i.test(info.message || ""));

    if (notConfirmed) {
      return (
        <PageShell>
          <div className="mt-6 bg-white rounded-xl shadow-sm border p-10 text-center max-w-xl mx-auto">
            <p className="text-5xl mb-4">🔒</p>
            <h2 className="text-2xl font-bold text-gray-900">
              Chat opens after team is confirmed
            </h2>
            <p className="mt-2 text-gray-600">
              Your team is still in draft. Once the team leader confirms the
              team and all members are approved, the chat will unlock for
              everyone.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                to={`/teams/${teamId}`}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 font-medium"
              >
                Back to team
              </Link>
              <Link
                to="/dashboard"
                className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg hover:bg-gray-50 font-medium"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </PageShell>
      );
    }

    // Not a member
    const forbidden = info.code === "FORBIDDEN" || info.status === 403;

    if (forbidden) {
      return (
        <PageShell>
          <div className="mt-6 bg-white rounded-xl shadow-sm border p-10 text-center max-w-xl mx-auto">
            <p className="text-5xl mb-4">🚫</p>
            <h2 className="text-2xl font-bold text-gray-900">
              You don't have access
            </h2>
            <p className="mt-2 text-gray-600">
              You are not a member of this team. Ask the team leader to invite
              you before opening the chat.
            </p>
            <Link
              to="/dashboard"
              className="inline-block mt-6 bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 font-medium"
            >
              Back to dashboard
            </Link>
          </div>
        </PageShell>
      );
    }

    // Generic error
    return (
      <PageShell>
        <ErrorState
          message={info.message || "Failed to load chat"}
          onRetry={conversation.reload}
          backTo="/dashboard"
          backLabel="Back to dashboard"
        />
      </PageShell>
    );
  }

  // ===== Chat UI =====
  return (
    <PageShell>
      <Link
        to={`/dashboard`}
        className="text-sm text-indigo-600 hover:underline"
      >
        ← Back
      </Link>

      <div className="mt-4 bg-white rounded-xl shadow-sm border flex flex-col h-[calc(100vh-11rem)]">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {conversation.data?.name || "Team Chat"}
            </h1>
            <p className="text-xs text-gray-500">
              {typingUser ? "Someone is typing…" : "Real-time messages"}
            </p>
          </div>
          <Link
            to={`/teams/${teamId}`}
            className="text-sm text-indigo-600 hover:underline"
          >
            Team home →
          </Link>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loadingMsgs && <LoadingBlock lines={4} />}
          {!loadingMsgs && messages.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <p className="text-4xl mb-3">💬</p>
              <p className="font-medium">No messages yet</p>
              <p className="text-sm mt-1">Say hello to your team!</p>
            </div>
          )}
          {messages.map((m) => {
            const mine = String(m.sender?._id) === String(myUserId);
            return (
              <div
                key={m._id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${mine ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-900"}`}
                >
                  {!mine && (
                    <p className="text-xs font-semibold mb-1 opacity-80">
                      {m.sender?.name || "User"}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {m.content}
                  </p>
                  <p
                    className={`text-[10px] mt-1 ${mine ? "text-indigo-200" : "text-gray-500"} text-right`}
                  >
                    {fmtTime(m.createdAt)}
                    {m.edited && " · edited"}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={submit} className="border-t p-4 flex gap-2">
          <input
            value={text}
            onChange={(e) => handleTyping(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-semibold disabled:opacity-50"
          >
            {sending ? "..." : "Send"}
          </button>
        </form>

        {error && (
          <p className="text-red-600 text-xs px-4 pb-3" role="alert">
            {error}
          </p>
        )}
      </div>
    </PageShell>
  );
}
