# CampusX

### AI-Powered Team Formation Platform for IIIT Vadodara Students

CampusX is an AI-powered college ecosystem platform designed to help students discover opportunities, form compatible teams, explore clubs, and collaborate on college events, hackathons, and projects.

---

## 🎯 What is CampusX?

CampusX helps college students find suitable teammates based on skills, availability, interests, and role requirements.

The platform brings together event participation, AI-powered team matching, club discovery, team collaboration, and administrative analytics in one place.

## ✨ Features

- 🎯 **AI Team Matching** — Recommends suitable teammates based on skills and role requirements.
- 🔐 **GitHub-Verified Skills** — Supports skill verification through GitHub integration, where configured.
- 👥 **Equal Voting System** — Supports team leader election through voting.
- 🎭 **Club Management** — Supports five clubs: Music, Coding, Robotics, Dance, and Drama.
- 💬 **Team Chat** — Enables communication between team members.
- ✅ **Kanban Task Board** — Helps teams organize and track tasks.
- 📊 **Admin Analytics** — Provides administrative insights and platform statistics.
- 👤 **Student Profiles** — Supports student profiles and skill information.
- 📅 **Event Management** — Supports event discovery and enrolment workflows.
- 🔔 **Notifications** — Keeps users informed about relevant platform activities.

## 🛠️ Tech Stack

### Frontend

- React
- Vite
- JavaScript
- React Router
- Tailwind CSS
- Axios

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- bcryptjs for password hashing
- Socket.IO for real-time communication, where configured

### Tools & Deployment

- Git and GitHub
- Render 

## 🏗️ Project Architecture

CampusX follows a client-server architecture.

1. The React frontend provides the user interface.
2. Axios sends HTTP requests to the backend API.
3. Express.js handles API routes and middleware.
4. Authentication middleware protects restricted resources.
5. Controllers process application logic.
6. Mongoose communicates with MongoDB.
7. The backend returns responses to the frontend.
8. Socket.IO can support real-time communication when configured.

## 📁 Project Structure

```text
campusx/
├── frontend/          # React + Vite application
├── backend/           # Node.js + Express API
├── docs/              # Project documentation
├── .gitignore
└── README.md
```

_Note: The structure above is illustrative. Update it if your repository contains additional directories or files._

## 🚀 Getting Started

### Prerequisites

Install the following tools before running CampusX:

- Node.js (version compatible with the project dependencies)
- npm
- Git
- MongoDB local instance or MongoDB Atlas account

### 1. Clone the Repository

```bash
git clone https://github.com/shivamkumar2509/campusx.git
cd campusx
```

### 2. Configure the Backend

Open a terminal in the project root:

```bash
cd backend
npm install
```

Create a `.env` file in the backend directory and configure the environment variables required by the application.

Example:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret
```

**Important:** These variable names are examples. Check the backend configuration files to confirm the exact names required by your project. Add any other required integration credentials according to the implemented features.

Start the backend using the script defined in `backend/package.json`. If `dev` is configured:

```bash
npm run dev
```

### 3. Configure the Frontend

Open another terminal from the project root:

```bash
cd frontend
npm install
```

Configure the frontend API URL if required by your application.

For example, if the frontend uses `VITE_API_URL`:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

Open the local URL displayed by Vite in your terminal.

> **Note:** The exact commands, environment variable names, and ports depend on your project's configuration files and package scripts.

## 🤖 AI Team Matching

CampusX aims to recommend suitable teammates by comparing student profiles with team requirements.

The matching workflow can include:

1. **Profile Collection:** Retrieve relevant student skills, interests, and availability.
2. **Requirement Analysis:** Identify the skills and roles needed for a team.
3. **Compatibility Evaluation:** Compare student profiles with the required skills and roles.
4. **Team Recommendations:** Generate and display suitable teammate suggestions.
5. **Team Formation:** Allow students to proceed through the supported team creation or joining workflow.

The actual scoring formula and matching algorithm should be documented according to the implementation in the backend. Do not describe a particular machine learning model unless it is actually used.

## 🔐 Authentication & Security

- JWT-based authentication, where implemented.
- Password hashing using bcryptjs.
- Protected routes and API authorization.
- Environment variables for secrets and credentials.
- Database access through MongoDB and Mongoose.

Never commit `.env` files, passwords, database credentials, or API secrets to GitHub.

## 📚 Documentation

Project documentation can be organized in the `docs/` directory.

- Functional Requirements Specification
- System Architecture
- Database Design and ER Diagram
- Data Flow Diagrams (DFD)
- UML Class Diagram
- Sequence Diagrams
- API Endpoint Documentation
- Installation and Deployment Guide

Add direct links to the corresponding files once their exact paths are confirmed.

## 🖼️ Screenshots

Add screenshots of the actual running application to help contributors and reviewers understand the interface.

Suggested screenshots:

- Landing Page
- Student Dashboard
- AI Team Matching
- Team Dashboard and Voting
- Clubs and Recruitment
- Team Chat and Task Board
- Admin Analytics

Place the screenshots in a folder such as `docs/screenshots/` and link them here.

## 🌐 Deployment

**Deployment URL:** [\[Add live frontend URL\]](https://campusx-frontend-x9kb.onrender.com/)

**Repository:** [CampusX on GitHub](https://github.com/shivamkumar2509/campusx)

Deployment links should be added after confirming that the services are live and accessible.

## 👥 Team

| Team Member        | Enrollment Number | Role        | GitHub                                                                 |
| ------------------ | ----------------- | ----------- | ---------------------------------------------------------------------- |
| **Shivam Kumar**   | 20251651083       | Team Leader | [@shivamkumar2509](https://github.com/shivamkumar2509)                 |
| Aman Tripathi      | 20251651018       | Team Member | [@amantripathIIITV](https://github.com/amantripathIIITV)               |
| Aniket Kumar       | 20251651019       | Team Member | [@aniket-1370](https://github.com/aniket-1370)                         |
| Raghav Soni        | 20251651076       | Team Member | [@raghavsoni341-web](https://github.com/raghavsoni341-web)             |
| Nikhil Singh Tomar | 20251651065       | Team Member | [@nikhilsinghtomar539-rgb](https://github.com/nikhilsinghtomar539-rgb) |

## 🤝 Contributing

Contributions from team members are welcome.

1. Create a feature branch.
2. Make your changes and test them locally.
3. Commit your changes with a meaningful commit message.
4. Push your branch to GitHub.
5. Open a pull request for review.

Follow the project's existing coding conventions and avoid committing secrets or unrelated changes.

## 📄 License

Add the appropriate license information here if the project is distributed under an open-source license. Do not claim an open-source license unless one has been selected and added to the repository.

---

**CampusX — Connecting Students, Skills, and Opportunities.**
