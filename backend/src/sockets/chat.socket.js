const jwt = require("jsonwebtoken");
const ConversationMember = require("../models/conversationMember.model");

module.exports = (io) => {
  // Auth middleware — token via `auth.token` or query
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error("Missing token"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: decoded.id, role: decoded.role };
      return next();
    } catch (err) {
      return next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`🔌 WS connected: ${socket.user.id}`);

    socket.on("join:conversation", async ({ convId }, ack) => {
      try {
        const ok = await ConversationMember.exists({
          conv_id: convId,
          user_id: socket.user.id,
          status: "active",
        });
        if (!ok) return ack && ack({ ok: false, error: "Not a member" });

        socket.join(`conv:${convId}`);
        ack && ack({ ok: true });
      } catch (err) {
        ack && ack({ ok: false, error: err.message });
      }
    });

    socket.on("leave:conversation", ({ convId }) => {
      socket.leave(`conv:${convId}`);
    });

    socket.on("typing:start", ({ convId }) => {
      socket.to(`conv:${convId}`).emit("typing:start", {
        convId,
        userId: socket.user.id,
      });
    });

    socket.on("typing:stop", ({ convId }) => {
      socket.to(`conv:${convId}`).emit("typing:stop", {
        convId,
        userId: socket.user.id,
      });
    });

    socket.on("disconnect", () => {
      console.log(`🔌 WS disconnected: ${socket.user.id}`);
    });
  });
};
