const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./src/models/user.model");

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await User.find({})
      .select("name email role status year batch")
      .lean();

    console.log(`\nTotal users: ${users.length}\n`);

    if (users.length === 0) {
      console.log("(empty — no users in DB)");
    } else {
      users.forEach((u) => {
        console.log(
          `[${(u.role || "").padEnd(7)}]`,
          `[${(u.status || "active").padEnd(16)}]`,
          u.email.padEnd(38),
          "—",
          u.name,
        );
      });
    }

    console.log("");
  } catch (e) {
    console.error("Failed:", e.message);
  } finally {
    await mongoose.disconnect();
  }
})();
