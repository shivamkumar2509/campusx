const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config();
const http = require("http");
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { initSocket } = require("./socket/chat.socket");

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

// Routes
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/users", require("./routes/user.routes"));
app.use("/api", require("./routes/clubBrowse.routes"));
app.use("/api", require("./routes/recruitmentView.routes"));
app.use("/api", require("./routes/notificationFeed.routes"));
app.use("/api", require("./routes/search.routes"));
app.use("/api", require("./routes/landing.routes"));
app.use("/api", require("./routes/chat.routes"));
app.use("/api", require("./routes/admin.routes"));
// app.use("/api", require("./routes/team.routes"));
app.use("/api", require("./routes/eventsList.routes"));
app.use("/api", require("./routes/admin.routes"));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error_code: "NOT_FOUND",
    message: "Route not found",
  });
});

const server = http.createServer(app);
initSocket(server, app);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
