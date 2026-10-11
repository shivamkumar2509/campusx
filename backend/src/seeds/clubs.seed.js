/**
 * Run (backend folder se):
 *   node src/seeds/clubs.seed.js                       -> clubs, members, recruitments
 *   node src/seeds/clubs.seed.js your_email@iiitv.ac.in -> + tumhare account ke liye demo notifications
 *
 * Safe: sirf apna seed data delete/create karta hai (@campusx-seed.test users
 * aur unke clubs). Baaki teammates ka data nahi chhuta.
 */
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const mongoose = require('mongoose');

const User = require('../models/user.model');
const Club = require('../models/club.model');
const ClubMember = require('../models/clubMember.model');
const ClubRecruitment = require('../models/clubRecruitment.model');
const ClubApplication = require('../models/clubApplication.model');
const Notification = require('../models/notification.model');

const SEED_DOMAIN = '@campusx-seed.test';
const ADMIN_EMAIL = `seed.admin${SEED_DOMAIN}`;
const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const inDays = (d) => new Date(now + d * DAY);

const STUDENT_NAMES = [
  'Aarav Shah', 'Diya Patel', 'Rohan Mehta', 'Ananya Iyer', 'Kabir Singh',
  'Isha Gupta', 'Vihaan Joshi', 'Meera Nair', 'Arjun Reddy', 'Saanvi Desai',
  'Aditya Verma', 'Kavya Rao', 'Yash Agarwal', 'Pooja Kulkarni', 'Dev Malhotra',
  'Riya Bansal', 'Harsh Trivedi', 'Neha Chauhan', 'Karan Thakur', 'Tanvi Pandey',
];

const CLUBS = [
  {
    name: 'Music Club',
    display_name: 'Music Club',
    type: 'music',
    description: 'Jam sessions, live performances and campus concerts for every kind of musician.',
    founded_year: 2015,
  },
  {
    name: 'Coding Club',
    display_name: 'Coding Club',
    type: 'coding',
    description: 'Weekly contests, hackathons and open-source projects for developers of all levels.',
    founded_year: 2016,
  },
  {
    name: 'Robotics Club',
    display_name: 'Robotics Club',
    type: 'robotics',
    description: 'Build robots, drones and IoT projects and compete in national robotics events.',
    founded_year: 2017,
  },
  {
    name: 'Dance Club',
    display_name: 'Dance Club',
    type: 'dance',
    description: 'Classical, western and fusion dance crews performing at every college fest.',
    founded_year: 2016,
  },
  {
    name: 'Drama Club',
    display_name: 'Drama Club',
    type: 'drama',
    description: 'Street plays, stage productions and theatre workshops run by the campus drama crew.',
    founded_year: 2018,
  },
];

// Har club ke recruitments (index = CLUBS ka index)
const RECRUITMENTS = [
  [
    { title: 'Music Club Recruitment 2026', desc: 'We are looking for vocalists and instrumentalists.', skills: ['Vocals', 'Guitar', 'Keyboard'], experience: 'any', vtype: 'physical', positions: 6, days: 14, status: 'open' },
    { title: 'Music Club Winter Auditions', desc: 'Winter batch auditions (closed).', skills: ['Vocals'], experience: 'any', vtype: 'physical', positions: 3, days: -5, status: 'closed' },
  ],
  [
    { title: 'Coding Club Core Team Hiring', desc: 'Join the core team that runs contests and workshops.', skills: ['DSA', 'JavaScript', 'Python'], experience: 'beginner', vtype: 'both', positions: 5, days: 10, status: 'open' },
    { title: 'Coding Club Summer Interns', desc: 'Summer batch recruitment (closed).', skills: ['Python'], experience: 'any', vtype: 'online', positions: 4, days: -8, status: 'closed' },
  ],
  [
    { title: 'Robotics Club Video Round', desc: 'Send a short video of a project you built.', skills: ['Arduino', 'C++', 'CAD'], experience: 'intermediate', vtype: 'video', positions: 4, days: 7, status: 'open' },
    { title: 'Robotics Club Next Batch (Draft)', desc: 'Not published yet.', skills: ['ROS'], experience: 'any', vtype: 'physical', positions: 2, days: 20, status: 'draft' },
  ],
  [
    { title: 'Dance Club Online Auditions', desc: 'Online audition for all dance forms.', skills: ['Classical', 'Hip-hop', 'Freestyle'], experience: 'any', vtype: 'online', positions: 8, days: 21, status: 'open' },
  ],
  [
    { title: 'Drama Club Fresh Faces', desc: 'Actors, writers and backstage crew welcome.', skills: ['Acting', 'Script Writing', 'Stage Design'], experience: 'any', vtype: 'physical', positions: 10, days: 3, status: 'open' },
  ],
];

const cleanup = async () => {
  const admin = await User.findOne({ email: ADMIN_EMAIL }).select('_id').lean();
  if (admin) {
    const clubs = await Club.find({ created_by: admin._id }).select('_id').lean();
    const clubIds = clubs.map((c) => c._id);
    const recs = await ClubRecruitment.find({ club_id: { $in: clubIds } }).select('_id').lean();
    await ClubApplication.deleteMany({ recruitment_id: { $in: recs.map((r) => r._id) } });
    await ClubRecruitment.deleteMany({ club_id: { $in: clubIds } });
    await ClubMember.deleteMany({ club_id: { $in: clubIds } });
    await Club.deleteMany({ _id: { $in: clubIds } });
  }
  const seedUsers = await User.find({ email: new RegExp(`${SEED_DOMAIN.replace('.', '\\.')}$`) })
    .select('_id')
    .lean();
  const seedUserIds = seedUsers.map((u) => u._id);
  await Notification.deleteMany({ $or: [{ user_id: { $in: seedUserIds } }, { channels: 'seed' }] });
  await User.deleteMany({ _id: { $in: seedUserIds } });
};

const main = async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI backend/.env mein nahi mila');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');

  await Promise.all([
    User.init(), Club.init(), ClubMember.init(),
    ClubRecruitment.init(), ClubApplication.init(), Notification.init(),
  ]);

  await cleanup();

  // Users: 1 admin + 20 students (login nahi ho sakta, password_hash fake hai)
  const admin = await User.create({
  name: 'Seed Admin',
  email: ADMIN_EMAIL,
  password_hash: 'SEED_ACCOUNT_NO_LOGIN',
  role: 'admin',
  year: 1,
});
  const students = await User.insertMany(
    STUDENT_NAMES.map((name, i) => ({
      name,
      email: `seed.student${i + 1}${SEED_DOMAIN}`,
      password_hash: 'SEED_ACCOUNT_NO_LOGIN',
      role: 'student',
      year: (i % 4) + 1,
    }))
  );

  const recruitmentIds = [];
  for (let i = 0; i < CLUBS.length; i += 1) {
    const club = await Club.create({
      ...CLUBS[i],
      secretary_id: students[i]._id,
      created_by: admin._id,
      member_count: 4,
    });

    // 4 members: secretary, core_member, 2 members
    await ClubMember.insertMany([
      { club_id: club._id, user_id: students[i]._id, role: 'secretary', joined_at: inDays(-300) },
      { club_id: club._id, user_id: students[5 + i]._id, role: 'core_member', joined_at: inDays(-200) },
      { club_id: club._id, user_id: students[10 + i]._id, role: 'member', joined_at: inDays(-100) },
      { club_id: club._id, user_id: students[15 + i]._id, role: 'member', joined_at: inDays(-50) },
    ]);

    const recs = await ClubRecruitment.insertMany(
      RECRUITMENTS[i].map((r) => ({
        club_id: club._id,
        title: r.title,
        description: r.desc,
        requirements: { skills: r.skills, experience: r.experience },
        application_deadline: inDays(r.days),
        verification_type: r.vtype,
        verification_details:
          r.vtype === 'physical' || r.vtype === 'both'
            ? { date: inDays(Math.max(r.days, 0) + 2), time: '5:00 PM', venue: 'Student Activity Center', mode: 'In person' }
            : {},
        positions_open: r.positions,
        status: r.status,
        created_by: students[i]._id,
        closed_at: r.status === 'closed' ? inDays(r.days) : null,
      }))
    );
    recs.forEach((r) => recruitmentIds.push(`${CLUBS[i].name} -> ${r.status.padEnd(6)} -> ${r._id}`));
    console.log(`Club created: ${club.name} (${club._id})`);
  }

  // Demo notifications tumhare account ke liye (optional argument)
  const targetEmail = (process.argv[2] || '').toLowerCase().trim();
  if (targetEmail) {
    const target = await User.findOne({ email: targetEmail }).select('_id').lean();
    if (!target) {
      console.warn(`\nWARNING: ${targetEmail} database mein nahi mila. Pehle signup karo, phir seed dobara chalao.`);
    } else {
      await Notification.deleteMany({ user_id: target._id, channels: 'seed' });
      const samples = [
        { type: 'club_recruitment_open', title: 'Coding Club recruitment is open', message: 'Coding Club Core Team Hiring is now accepting applications.', link: '/clubs', read: false, priority: 'medium', ago: 1 },
        { type: 'club_application_status', title: 'Application verified', message: 'Your application to Music Club has been verified.', link: '/clubs', read: false, priority: 'high', ago: 3 },
        { type: 'club_member_approved', title: 'Welcome to Drama Club', message: 'You have been approved as a member of Drama Club.', link: '/clubs', read: true, priority: 'high', ago: 24 },
        { type: 'deadline_reminder', title: 'Recruitment closing soon', message: 'Drama Club Fresh Faces closes in 3 days.', link: '/clubs', read: false, priority: 'low', ago: 30 },
        { type: 'new_message', title: 'New team message', message: 'You have a new message in your team chat.', link: '/notifications', read: true, priority: 'low', ago: 48 },
        { type: 'match_found', title: 'New team suggestion', message: 'We found a team that matches your skills.', link: '/matching', read: false, priority: 'medium', ago: 72 },
      ];
      for (const s of samples) {
        await Notification.create({
          user_id: target._id,
          type: s.type,
          title: s.title,
          message: s.message,
          link: s.link,
          read: s.read,
          priority: s.priority,
          channels: ['in-app', 'seed'],
          createdAt: new Date(now - s.ago * 60 * 60 * 1000),
        });
      }
      console.log(`Demo notifications created for ${targetEmail}`);
    }
  }

  console.log('\n--- Postman ke liye recruitment ids ---');
  recruitmentIds.forEach((l) => console.log(l));
  console.log('\nSeed complete.');
};

main()
  .then(() => mongoose.disconnect())
  .catch(async (err) => {
    if (err && err.code === 11000) {
      console.error('Seed failed: duplicate key (shayad "Music Club" jaisa naam kisi real club ka hai).', err.message);
    } else {
      console.error('Seed failed:', err.message);
    }
    await mongoose.disconnect();
    process.exit(1);
  });
