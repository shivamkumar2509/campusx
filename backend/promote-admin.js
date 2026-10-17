const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./src/models/user.model");

const EMAIL = process.argv[2];

if (!EMAIL) {
  console.error("Usage: node promote-admin.js your@iiitv.ac.in");
  process.exit(1);
}

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    const user = await User.findOne({ email: EMAIL.toLowerCase().trim() });

    if (!user) {
      console.error(`❌ No user found with email: ${EMAIL}`);
      console.error("   Sign up first, then re-run this script.");
      process.exit(1);
    }

    if (user.role === "admin") {
      console.log(`✅ ${EMAIL} is already an admin`);
      process.exit(0);
    }

    user.role = "admin";
    await user.save();
    console.log(`✅ Promoted to admin: ${user.name} <${user.email}>`);
  } catch (err) {
    console.error("❌ Failed:", err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
})();
