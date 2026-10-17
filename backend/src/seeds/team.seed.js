/**
 * Team seed — creates a draft team + 2 seed users + 1 event + conversation
 * for testing chat gating.
 *
 * Run: node src/seeds/team.seed.js
 */
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
const mongoose = require("mongoose");

const User = require("../models/user.model");
const Event = require("../models/event.model");
const Team = require("../models/team.model");
const TeamMember = require("../models/teamMember.model");
const Conversation = require("../models/conversation.model");
const ConversationMember = require("../models/conversationMember.model");

const acadYear = (() => {
  const d = new Date();
  return d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
})();

const main = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected");

  // Find or create 2 seed students
  const ensureStudent = async (local, name) => {
    let user = await User.findOne({
      email: `seed.${local}@iiitvadodara.ac.in`,
    });
    if (!user) {
      user = await User.create({
        name,
        email: `seed.${local}@iiitvadodara.ac.in`,
        password_hash: "SEED_ACCOUNT_NO_LOGIN",
        role: "student",
        year: 2,
        batch: acadYear - 1,
        status: "active",
      });
    }
    return user;
  };

  const leader = await ensureStudent("teamleader", "Team Leader Seed");
  const member = await ensureStudent("teammember", "Team Member Seed");

  // Event
  let event = await Event.findOne({ title: "[seed] Chat Test Event" });
  if (!event) {
    event = await Event.create({
      created_by: leader._id,
      title: "[seed] Chat Test Event",
      description: "For chat gate testing",
      type: "hackathon",
      team_size_min: 2,
      team_size_max: 4,
      deadline: new Date(Date.now() + 7 * 86400000),
      status: "published",
    });
    console.log("Created event", event._id.toString());
  }

  // Clean up old test team
  const old = await Team.findOne({ name: /^\[seed\] Chat Test Team/ });
  if (old) {
    await Conversation.deleteMany({ team_id: old._id });
    await ConversationMember.deleteMany({ conv_id: { $in: [] } });
    await TeamMember.deleteMany({ team_id: old._id });
    await Team.deleteOne({ _id: old._id });
  }

  const team = await Team.create({
    event_id: event._id,
    leader_id: leader._id,
    name: `[seed] Chat Test Team ${Date.now()}`,
    description: "Draft team for gate testing",
    status: "draft",
  });

  await TeamMember.insertMany([
    {
      team_id: team._id,
      user_id: leader._id,
      role: "leader",
      status: "accepted",
      joined_at: new Date(),
    },
    {
      team_id: team._id,
      user_id: member._id,
      role: "member",
      status: "accepted",
      joined_at: new Date(),
    },
  ]);

  console.log("\n=== Test team ready ===");
  console.log(`Team ID  : ${team._id}`);
  console.log(`Leader   : ${leader.email}`);
  console.log(`Member   : ${member.email}`);
  console.log(`Status   : DRAFT — chat locked until confirm`);
  console.log("\n(These accounts have no login. To test chat, log in as");
  console.log(
    " a real user, or run promote-admin.js and create them via admin UI.)",
  );
};

main()
  .then(() => mongoose.disconnect())
  .catch(async (e) => {
    console.error(e);
    await mongoose.disconnect();
    process.exit(1);
  });
