import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { fetchMessages, fetchTeamConversation, sendMessage } from "../api/chat";
import PageShell from "../components/common/PageShell";
import { ErrorState, LoadingBlock } from "../components/common/StateViews";

const SOCKET_URL =
  import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";

export default function Chat() {
  const { teamId } = useParams();
  const [conv, setConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const conversation = await fetchTeamConversation(teamId);
        if (cancelled) return;
        setConv(conversation);

        const res = await fetchMessages(conversation._id, { limit: 50 });
        if (cancelled) return;
        setMessages(res.data || []);

        // Connect socket
        const token = localStorage.getItem("token");
        const socket = io(SOCKET_URL, { auth: { token } });
        socketRef.current = socket;

        socket.emit(
          "join:conversation",
          { convId: conversation._id },
          (ack) => {
            if (!ack?.ok) console.warn("Socket join failed:", ack?.error);
          },
        );

        socket.on("message:new", (msg) => {
          if (msg.conv_id === conversation._id) {
            setMessages((prev) => [...prev, msg]);
          }
        });

        socket.on("message:updated", (msg) => {
          setMessages((prev) => prev.map((m) => (m._id === msg._id ? msg : m)));
        });

        socket.on("message:deleted", ({ _id }) => {
          setMessages((prev) => prev.filter((m) => m._id !== _id));
        });
      } catch (err) {
        if (!cancelled)
          setError(err.response?.data?.message || "Failed to load chat");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (socketRef.current) {
        socketRef.current.emit("leave:conversation", { convId: conv?._id });
        socketRef.current.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !conv) return;
    setSending(true);
    const content = text.trim();
    setText("");
    try {
      const msg = await sendMessage(conv._id, { content });
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to send");
      setText(content);
    } finally {
      setSending(false);
    }
  };

  return (
    <PageShell>
      <h1 className="text-2xl font-bold mb-4">💬 Team Chat</h1>

      {loading && (
        <div className="bg-white border rounded-xl p-8">
          <LoadingBlock lines={4} />
        </div>
      )}
      {!loading && error && <ErrorState message={error} />}

      {!loading && !error && conv && (
        <div className="bg-white border rounded-xl shadow-sm flex flex-col h-[70vh]">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-center text-gray-400 py-10">
                No messages yet. Say hi! 👋
              </p>
            )}
            {messages.map((m) => (
              <div key={m._id} className="flex gap-2">
                <img
                  src={
                    m.sender_id?.avatar_url ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(m.sender_id?.name || "U")}&size=32&background=6366f1&color=fff`
                  }
                  alt=""
                  className="w-8 h-8 rounded-full"
                />
                <div>
                  <p className="text-xs text-gray-500">
                    <span className="font-semibold">
                      {m.sender_id?.name || "Unknown"}
                    </span>
                    {" · "}
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                    {m.content}
                  </p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={handleSend} className="border-t p-3 flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-60 font-medium"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </PageShell>
  );
}
