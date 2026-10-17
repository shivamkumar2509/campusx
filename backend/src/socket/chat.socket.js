const { Server } = require("socket.io");
const { verifyToken } = require("../utils/jwt");
const ConversationMember = require("../models/conversationMember.model");

let io = null;

const initSocket = (httpServer, app) => {
  io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  // Attach so controllers can emit
  app.set("io", io);

  // Auth middleware — token via handshake.auth.token
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      if (!token) return next(new Error("NO_TOKEN"));
      const payload = verifyToken(token);
      socket.user = payload; // { id, role }
      next();
    } catch (err) {
      next(new Error("INVALID_TOKEN"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.user.id}`);

    // Client joins a conversation room (server verifies membership)
    socket.on("conv:join", async ({ convId } = {}, ack) => {
      try {
        const member = await ConversationMember.findOne({
          conv_id: convId,
          user_id: socket.user.id,
          status: "active",
        }).lean();
        if (!member) {
          if (ack) ack({ ok: false, error: "FORBIDDEN" });
          return;
        }
        socket.join(`conv:${convId}`);
        if (ack) ack({ ok: true });
      } catch (err) {
        if (ack) ack({ ok: false, error: "SERVER_ERROR" });
      }
    });

    socket.on("conv:leave", ({ convId } = {}) => {
      if (convId) socket.leave(`conv:${convId}`);
    });

    // Typing indicators
    socket.on("typing:start", ({ convId } = {}) => {
      if (convId)
        socket
          .to(`conv:${convId}`)
          .emit("typing:start", { convId, userId: socket.user.id });
    });
    socket.on("typing:stop", ({ convId } = {}) => {
      if (convId)
        socket
          .to(`conv:${convId}`)
          .emit("typing:stop", { convId, userId: socket.user.id });
    });

    socket.on("disconnect", () => {});
  });

  return io;
};

module.exports = { initSocket };
