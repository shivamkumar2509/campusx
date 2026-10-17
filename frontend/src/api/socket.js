import { io } from "socket.io-client";

let socket = null;

export function getSocket() {
  if (socket) return socket;
  const token = localStorage.getItem("token");
  const baseUrl =
    (import.meta.env && import.meta.env.VITE_API_URL) ||
    "http://localhost:5000";
  socket = io(baseUrl, {
    auth: { token },
    transports: ["websocket"],
    autoConnect: true,
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
