// Club type -> emoji + colors (Club model mein logo field nahi hai, isliye emoji use hota hai)
export const CLUB_TYPE_STYLES = {
  music: {
    label: "Music",
    emoji: "🎵",
    badge: "bg-pink-100 text-pink-700",
    gradient: "from-pink-500 to-rose-500",
  },
  coding: {
    label: "Coding",
    emoji: "💻",
    badge: "bg-indigo-100 text-indigo-700",
    gradient: "from-indigo-500 to-violet-500",
  },
  robotics: {
    label: "Robotics",
    emoji: "🤖",
    badge: "bg-cyan-100 text-cyan-700",
    gradient: "from-cyan-500 to-blue-500",
  },
  dance: {
    label: "Dance",
    emoji: "💃",
    badge: "bg-amber-100 text-amber-700",
    gradient: "from-amber-500 to-orange-500",
  },
  drama: {
    label: "Drama",
    emoji: "🎭",
    badge: "bg-purple-100 text-purple-700",
    gradient: "from-purple-500 to-fuchsia-500",
  },
};

const DEFAULT_STYLE = {
  label: "Club",
  emoji: "🎓",
  badge: "bg-gray-100 text-gray-700",
  gradient: "from-gray-500 to-gray-700",
};

export const getClubStyle = (type) => CLUB_TYPE_STYLES[type] || DEFAULT_STYLE;

export const clubTitle = (club) => (club && (club.display_name || club.name)) || "";

export const VERIFICATION_LABELS = {
  physical: "Physical",
  online: "Online",
  both: "Physical or Online",
  video: "Video submission",
};

export const avatarUrl = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name || "?"
  )}&background=6366f1&color=fff&size=64`;

export const formatDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const daysLeftText = (deadline) => {
  const ms = new Date(deadline).getTime() - Date.now();
  if (Number.isNaN(ms)) return "";
  if (ms <= 0) return "Closed";
  const days = Math.ceil(ms / 86400000);
  return days === 1 ? "1 day left" : `${days} days left`;
};

export const timeAgo = (value) => {
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "";
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (sec < 60) return "Just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return formatDate(value);
};

export const notificationIcon = (type = "") => {
  if (type === "application_received") return "📝";
  if (type === "club_application_status") return "📋";
  if (type === "club_member_approved") return "✅";
  if (type.startsWith("club_")) return "🎭";
  if (type.includes("deadline")) return "⏰";
  if (type === "new_message") return "💬";
  if (type.includes("match") || type.includes("team")) return "👥";
  if (type.includes("vote") || type.includes("leave")) return "🗳️";
  return "🔔";
};

// Backend ka error format: { success:false, error_code, message }
export const getErrorInfo = (err) => {
  const res = err && err.response;
  if (!res) {
    return {
      status: 0,
      code: "NETWORK_ERROR",
      message: "Cannot reach the server. Check your connection and try again.",
    };
  }
  const body = res.data || {};
  return {
    status: res.status,
    code: body.error_code || "ERROR",
    message: body.message || "Something went wrong. Please try again.",
  };
};

export const clearSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};
