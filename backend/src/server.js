const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const { startEventDeadlineJob } = require("./jobs/eventDeadlineJob");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});
app.set("io", io);

// Middleware
app.use(cors());
app.use(express.json());

// DB
connectDB();

// 🔥 Start cron AFTER DB connect + after require
startEventDeadlineJob();

// Routes
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/users", require("./routes/user.routes"));
app.use("/api", require("./routes/clubBrowse.routes"));
app.use("/api", require("./routes/recruitmentView.routes"));
app.use("/api", require("./routes/notificationFeed.routes"));
app.use("/api", require("./routes/search.routes"));
app.use("/api", require("./routes/event.routes"));
app.use("/api", require("./routes/admin.routes"));
app.use("/api", require("./routes/landing.routes"));
app.use("/api", require("./routes/teamInvitation.routes"));
app.use("/api", require("./routes/externalInvitation.routes"));
app.use("/api", require("./routes/chat.routes"));
app.use("/api", require("./routes/upload.routes"));
app.use("/api", require("./routes/team.routes"));
app.use("/api", require("./routes/matching.routes"));
app.use("/api", require("./routes/clubJoin.routes"));

// Health
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error_code: "NOT_FOUND",
    message: "Route not found",
  });
});

// Error handler
app.use(require("./middleware/routeError.middleware"));

// WebSocket
require("./sockets/chat.socket")(io);

// Start
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server + Socket.IO on port ${PORT}`));
