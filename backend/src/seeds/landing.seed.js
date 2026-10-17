/**
 * Landing seed — real college domains, seed.* prefix.
 * Run: node src/seeds/landing.seed.js
 */
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
const mongoose = require("mongoose");

const User = require("../models/user.model");
const Club = require("../models/club.model");
const ClubMember = require("../models/clubMember.model");
const Event = require("../models/event.model");
const Team = require("../models/team.model");
const TeamMember = require("../models/teamMember.model");

const ADMIN_EMAIL = "seed.admin@iiitv.ac.in";
const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const inDays = (d) => new Date(now + d * DAY);

const STUDENT_LOCALS = [
  "aarav",
  "diya",
  "rohan",
  "ananya",
  "kabir",
  "isha",
  "vihaan",
  "meera",
  "arjun",
  "saanvi",
  "aditya",
  "kavya",
  "yash",
  "pooja",
  "dev",
  "riya",
  "harsh",
  "neha",
  "karan",
  "tanvi",
];

const STUDENT_NAMES = [
  "Aarav Shah",
  "Diya Patel",
  "Rohan Mehta",
  "Ananya Iyer",
  "Kabir Singh",
  "Isha Gupta",
  "Vihaan Joshi",
  "Meera Nair",
  "Arjun Reddy",
  "Saanvi Desai",
  "Aditya Verma",
  "Kavya Rao",
  "Yash Agarwal",
  "Pooja Kulkarni",
  "Dev Malhotra",
  "Riya Bansal",
  "Harsh Trivedi",
  "Neha Chauhan",
  "Karan Thakur",
  "Tanvi Pandey",
];

const CLUBS = [
  {
    name: "[seed] Music Club",
    display: "Music Club",
    type: "music",
    description: "Jam sessions, live performances and campus concerts.",
  },
  {
    name: "[seed] Coding Club",
    display: "Coding Club",
    type: "coding",
    description: "Weekly contests, hackathons and open-source projects.",
  },
  {
    name: "[seed] Robotics Club",
    display: "Robotics Club",
    type: "robotics",
    description: "Build robots, drones and IoT projects.",
  },
  {
    name: "[seed] Dance Club",
    display: "Dance Club",
    type: "dance",
    description: "Classical, western and fusion dance crews.",
  },
  {
    name: "[seed] Drama Club",
    display: "Drama Club",
    type: "drama",
    description: "Street plays, stage productions and theatre workshops.",
  },
];

const EVENTS = [
  {
    title: "[seed] Smart India Hackathon 2026",
    type: "hackathon",
    description: "National-level 36-hour hackathon.",
    deadline: inDays(15),
    min: 3,
    max: 6,
  },
  {
    title: "[seed] ML Bootcamp",
    type: "workshop",
    description: "Two-day hands-on machine learning workshop.",
    deadline: inDays(7),
    min: 1,
    max: 4,
  },
  {
    title: "[seed] KrievaXAlfaz Auditions",
    type: "club",
    description: "Music club auditions.",
    deadline: inDays(3),
    min: 1,
    max: 2,
  },
];

const acadYear = (() => {
  const d = new Date();
  return d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
})();

const cleanup = async () => {
  const seedAdmin = await User.findOne({ email: ADMIN_EMAIL })
    .select("_id")
    .lean();
  if (seedAdmin) {
    const events = await Event.find({ created_by: seedAdmin._id })
      .select("_id")
      .lean();
    const eventIds = events.map((e) => e._id);
    const teams = await Team.find({ event_id: { $in: eventIds } })
      .select("_id")
      .lean();
    const teamIds = teams.map((t) => t._id);
    await TeamMember.deleteMany({ team_id: { $in: teamIds } });
    await Team.deleteMany({ _id: { $in: teamIds } });
    await Event.deleteMany({ _id: { $in: eventIds } });

    const clubs = await Club.find({ created_by: seedAdmin._id })
      .select("_id")
      .lean();
    const clubIds = clubs.map((c) => c._id);
    await ClubMember.deleteMany({ club_id: { $in: clubIds } });
    await Club.deleteMany({ _id: { $in: clubIds } });
  }
  const seedUsers = await User.find({ email: /^seed\./ })
    .select("_id")
    .lean();
  const seedIds = seedUsers.map((u) => u._id);
  await User.deleteMany({ _id: { $in: seedIds } });
};

const main = async () => {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI not found");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected");

  await Promise.all([
    User.init(),
    Club.init(),
    ClubMember.init(),
    Event.init(),
    Team.init(),
    TeamMember.init(),
  ]);

  await cleanup();

  const admin = await User.create({
    name: "Landing Seed Admin",
    email: ADMIN_EMAIL,
    password_hash: "SEED_ACCOUNT_NO_LOGIN",
    role: "admin",
    year: 1,
    status: "active",
  });

  const students = await User.insertMany(
    STUDENT_LOCALS.map((local, i) => {
      const year = (i % 4) + 1;
      return {
        name: STUDENT_NAMES[i],
        email: `seed.${local}@iiitvadodara.ac.in`,
        password_hash: "SEED_ACCOUNT_NO_LOGIN",
        role: "student",
        year,
        batch: acadYear - year + 1,
        status: "active",
        experience_level: ["beginner", "intermediate", "advanced"][i % 3],
        availability: 5 + ((i * 3) % 25),
      };
    }),
  );

  console.log(`Created 1 admin + ${students.length} students`);

  const clubIds = [];
  for (let i = 0; i < CLUBS.length; i += 1) {
    const club = await Club.create({
      name: CLUBS[i].name,
      display_name: CLUBS[i].display,
      type: CLUBS[i].type,
      description: CLUBS[i].description,
      secretary_id: students[i]._id,
      created_by: admin._id,
      founded_year: 2015 + i,
      status: "active",
      member_count: 4,
    });

    await ClubMember.insertMany([
      {
        club_id: club._id,
        user_id: students[i]._id,
        role: "secretary",
        joined_at: inDays(-300),
      },
      {
        club_id: club._id,
        user_id: students[5 + i]._id,
        role: "core_member",
        joined_at: inDays(-200),
      },
      {
        club_id: club._id,
        user_id: students[10 + i]._id,
        role: "member",
        joined_at: inDays(-100),
      },
      {
        club_id: club._id,
        user_id: students[15 + i]._id,
        role: "member",
        joined_at: inDays(-50),
      },
    ]);

    clubIds.push(club._id);
    console.log(`Club created: ${club.display_name} (${club._id})`);
  }

  const eventIds = [];
  for (const e of EVENTS) {
    const event = await Event.create({
      created_by: admin._id,
      club_id:
        e.type === "club"
          ? clubIds[0]
          : e.type === "workshop"
            ? clubIds[1]
            : null,
      title: e.title,
      description: e.description,
      type: e.type,
      team_size_min: e.min,
      team_size_max: e.max,
      deadline: e.deadline,
      status: "published",
    });
    eventIds.push(event._id);
    console.log(`Event created: ${event.title} (${event._id})`);
  }

  const team = await Team.create({
    event_id: eventIds[0],
    leader_id: students[0]._id,
    name: "[seed] Team Alpha",
    description: "Demo team for landing page",
    status: "confirmed",
    confirmed_at: new Date(),
  });

  await TeamMember.insertMany([
    {
      team_id: team._id,
      user_id: students[0]._id,
      role: "leader",
      status: "accepted",
      joined_at: new Date(),
    },
    {
      team_id: team._id,
      user_id: students[1]._id,
      role: "member",
      status: "accepted",
      joined_at: new Date(),
    },
    {
      team_id: team._id,
      user_id: students[2]._id,
      role: "member",
      status: "accepted",
      joined_at: new Date(),
    },
    {
      team_id: team._id,
      user_id: students[3]._id,
      role: "member",
      status: "accepted",
      joined_at: new Date(),
    },
  ]);

  console.log(`Team created: ${team.name} (${team._id})`);

  const finalCounts = {
    users: await User.countDocuments({ role: "student" }),
    teams: await Team.countDocuments(),
    clubs: await Club.countDocuments({ status: "active" }),
    events: await Event.countDocuments({ status: "published" }),
  };

  console.log("\n=== Landing page will show ===");
  console.log(`  Active Students : ${finalCounts.users}`);
  console.log(`  Teams Formed    : ${finalCounts.teams}`);
  console.log(`  Active Clubs    : ${finalCounts.clubs}`);
  console.log(`  Published Events: ${finalCounts.events}`);
  console.log("\nSeed complete.");
};

main()
  .then(() => mongoose.disconnect())
  .catch(async (err) => {
    if (err && err.code === 11000)
      console.error("Seed failed: duplicate key", err.message);
    else console.error("Seed failed:", err.message);
    await mongoose.disconnect();
    process.exit(1);
  });
