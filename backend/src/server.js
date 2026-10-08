const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// DB
connectDB();

// Routes
app.use("/api/auth", require("./routes/auth.routes"));

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

// Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
