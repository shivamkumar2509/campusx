# CampusX — API Endpoints

**Base URL:** `/api`
**Auth:** Bearer JWT in `Authorization` header (except public routes)
**Total Endpoints:** 106

---

## 🏠 1. Landing Page (Public)

| #   | Method | Endpoint                   | Purpose                   |
| --- | ------ | -------------------------- | ------------------------- |
| 1   | GET    | `/landing/featured-events` | Top 3 upcoming events     |
| 2   | GET    | `/landing/featured-clubs`  | All active clubs          |
| 3   | GET    | `/landing/stats`           | Total users, teams, clubs |

---

## 🔐 2. Authentication

| #   | Method | Endpoint                | Purpose                     |
| --- | ------ | ----------------------- | --------------------------- |
| 4   | POST   | `/auth/signup`          | Register with college email |
| 5   | POST   | `/auth/login`           | Login with email/password   |
| 6   | POST   | `/auth/oauth/google`    | Google OAuth login          |
| 7   | POST   | `/auth/logout`          | Logout user                 |
| 8   | POST   | `/auth/refresh-token`   | Refresh JWT token           |
| 9   | POST   | `/auth/verify-email`    | Verify email                |
| 10  | POST   | `/auth/forgot-password` | Request password reset      |
| 11  | POST   | `/auth/reset-password`  | Reset password              |
| 12  | GET    | `/auth/me`              | Current user info           |

---

## 🎓 3. Student Dashboard

| #   | Method | Endpoint           | Purpose        |
| --- | ------ | ------------------ | -------------- |
| 13  | GET    | `/dashboard`       | Dashboard data |
| 14  | GET    | `/dashboard/stats` | Quick stats    |

---

## 👤 4. Profile & Skills

| #   | Method | Endpoint                    | Purpose           |
| --- | ------ | --------------------------- | ----------------- |
| 15  | GET    | `/users/me`                 | Get my profile    |
| 16  | PATCH  | `/users/me`                 | Update my profile |
| 17  | GET    | `/users/:userId`            | Get user by ID    |
| 18  | POST   | `/users/me/github`          | Add GitHub link   |
| 19  | GET    | `/users/me/skills`          | Get my skills     |
| 20  | POST   | `/users/me/skills`          | Add a skill       |
| 21  | PATCH  | `/users/me/skills/:skillId` | Update skill      |
| 22  | DELETE | `/users/me/skills/:skillId` | Delete skill      |
| 23  | POST   | `/users/me/skills/verify`   | Verify skills     |

---

## 📅 5. Events

| #   | Method | Endpoint                   | Purpose               |
| --- | ------ | -------------------------- | --------------------- |
| 24  | GET    | `/events`                  | List all events       |
| 25  | POST   | `/events`                  | Create event (admin)  |
| 26  | GET    | `/events/:eventId`         | Get event details     |
| 27  | PATCH  | `/events/:eventId`         | Update event (admin)  |
| 28  | DELETE | `/events/:eventId`         | Delete event (admin)  |
| 29  | POST   | `/events/:eventId/publish` | Publish event (admin) |
| 30  | POST   | `/events/:eventId/close`   | Close event (admin)   |

---

## 📝 6. Enrollment

| #   | Method | Endpoint                       | Purpose                  |
| --- | ------ | ------------------------------ | ------------------------ |
| 31  | POST   | `/events/:eventId/enroll`      | Raise hand               |
| 32  | GET    | `/events/:eventId/enrollments` | List enrollments (admin) |
| 33  | GET    | `/users/me/enrollments`        | My enrollments           |

---

## 🤖 7. AI Matching

| #   | Method | Endpoint                            | Purpose              |
| --- | ------ | ----------------------------------- | -------------------- |
| 34  | POST   | `/events/:eventId/matching/run`     | Run matching (admin) |
| 35  | GET    | `/events/:eventId/suggestions`      | Get suggestions      |
| 36  | POST   | `/suggestions/:suggestionId/accept` | Accept suggestion    |

---

## 👥 8. Teams

| #   | Method | Endpoint                 | Purpose      |
| --- | ------ | ------------------------ | ------------ |
| 37  | POST   | `/teams`                 | Create team  |
| 38  | GET    | `/teams/:teamId`         | Team details |
| 39  | PATCH  | `/teams/:teamId`         | Update team  |
| 40  | GET    | `/teams/:teamId/members` | Team members |
| 41  | POST   | `/teams/:teamId/confirm` | Confirm team |
| 42  | GET    | `/users/me/teams`        | My teams     |

---

## 🗳️ 9. Leader Voting

| #   | Method | Endpoint                      | Purpose          |
| --- | ------ | ----------------------------- | ---------------- |
| 43  | POST   | `/teams/:teamId/leader/vote`  | Vote for leader  |
| 44  | GET    | `/teams/:teamId/leader/votes` | Get leader votes |
| 45  | PATCH  | `/teams/:teamId/leader`       | Update leader    |

---

## 🔄 10. Leave Request & Voting

| #   | Method | Endpoint                                          | Purpose              |
| --- | ------ | ------------------------------------------------- | -------------------- |
| 46  | POST   | `/teams/:teamId/leave-requests`                   | Submit leave request |
| 47  | GET    | `/teams/:teamId/leave-requests`                   | List leave requests  |
| 48  | POST   | `/teams/:teamId/leave-requests/:requestId/votes`  | Vote on leave        |
| 49  | GET    | `/teams/:teamId/leave-requests/:requestId/result` | Voting result        |
| 50  | DELETE | `/leave-requests/:requestId`                      | Cancel request       |
| 51  | GET    | `/teams/:teamId/votes`                            | All team votes       |

---

## 🎯 11. Replacement

| #   | Method | Endpoint                                           | Purpose        |
| --- | ------ | -------------------------------------------------- | -------------- |
| 52  | GET    | `/teams/:teamId/replacements`                      | AI suggestions |
| 53  | POST   | `/teams/:teamId/replacements/:suggestionId/invite` | Send invite    |
| 54  | POST   | `/teams/:teamId/find-replacement`                  | Trigger search |

---

## 📨 12. Invitations

| #   | Method | Endpoint                                           | Purpose                |
| --- | ------ | -------------------------------------------------- | ---------------------- |
| 55  | POST   | `/teams/:teamId/invitations`                       | Invite registered user |
| 56  | POST   | `/teams/:teamId/invitations/:invitationId/respond` | Accept/reject          |
| 57  | POST   | `/teams/:teamId/external-invitations`              | Invite external user   |
| 58  | POST   | `/external-invitations/:token/signup`              | External signup        |

---

## 💬 13. Chat

| #   | Method | Endpoint                          | Purpose             |
| --- | ------ | --------------------------------- | ------------------- |
| 59  | GET    | `/teams/:teamId/conversation`     | Get conversation    |
| 60  | GET    | `/conversations/:convId/messages` | Get messages        |
| 61  | POST   | `/conversations/:convId/messages` | Send message        |
| 62  | PATCH  | `/messages/:messageId`            | Edit/delete message |

---

## ✅ 14. Tasks

| #   | Method | Endpoint                     | Purpose     |
| --- | ------ | ---------------------------- | ----------- |
| 63  | POST   | `/teams/:teamId/tasks`       | Create task |
| 64  | GET    | `/teams/:teamId/tasks`       | List tasks  |
| 65  | PATCH  | `/tasks/:taskId`             | Update task |
| 66  | DELETE | `/tasks/:taskId`             | Delete task |
| 67  | POST   | `/tasks/:taskId/assignments` | Assign task |

---

## 📎 15. Attachments

| #   | Method | Endpoint                           | Purpose           |
| --- | ------ | ---------------------------------- | ----------------- |
| 68  | POST   | `/uploads/presign`                 | Get S3 upload URL |
| 69  | POST   | `/messages/:messageId/attachments` | Attach file       |

---

## 🎭 16. Clubs

| #   | Method | Endpoint                                           | Purpose                       |
| --- | ------ | -------------------------------------------------- | ----------------------------- |
| 70  | GET    | `/clubs`                                           | List clubs                    |
| 71  | POST   | `/clubs`                                           | Create club (admin)           |
| 72  | GET    | `/clubs/:clubId`                                   | Club details                  |
| 73  | PATCH  | `/clubs/:clubId`                                   | Update club (admin/secretary) |
| 74  | DELETE | `/clubs/:clubId`                                   | Soft delete (admin)           |
| 75  | POST   | `/clubs/:clubId/rename-request`                    | Request rename (secretary)    |
| 76  | POST   | `/clubs/:clubId/rename-request/:requestId/approve` | Approve rename (admin)        |

---

## 🎭 17. Club Members

| #   | Method | Endpoint                           | Purpose                   |
| --- | ------ | ---------------------------------- | ------------------------- |
| 77  | GET    | `/clubs/:clubId/members`           | List members              |
| 78  | POST   | `/clubs/:clubId/members`           | Add member (secretary)    |
| 79  | DELETE | `/clubs/:clubId/members/:memberId` | Remove member (secretary) |

---

## 🎭 18. Club Recruitment

| #   | Method | Endpoint                             | Purpose             |
| --- | ------ | ------------------------------------ | ------------------- |
| 80  | GET    | `/clubs/:clubId/recruitments`        | List recruitments   |
| 81  | POST   | `/clubs/:clubId/recruitments`        | Create (secretary)  |
| 82  | GET    | `/recruitments/:recruitmentId`       | Recruitment details |
| 83  | PATCH  | `/recruitments/:recruitmentId`       | Update recruitment  |
| 84  | POST   | `/recruitments/:recruitmentId/close` | Close recruitment   |

---

## 🎭 19. Club Applications

| #   | Method | Endpoint                                    | Purpose              |
| --- | ------ | ------------------------------------------- | -------------------- |
| 85  | POST   | `/recruitments/:recruitmentId/applications` | Apply                |
| 86  | GET    | `/recruitments/:recruitmentId/applications` | List applications    |
| 87  | POST   | `/applications/:applicationId/verify`       | Verify (core member) |
| 88  | POST   | `/applications/:applicationId/approve`      | Approve (secretary)  |
| 89  | POST   | `/applications/:applicationId/reject`       | Reject (secretary)   |

---

## 🔔 20. Notifications

| #   | Method | Endpoint                              | Purpose            |
| --- | ------ | ------------------------------------- | ------------------ |
| 90  | GET    | `/notifications`                      | List notifications |
| 91  | PATCH  | `/notifications/:notificationId/read` | Mark as read       |
| 92  | GET    | `/users/me/notification-preferences`  | Get preferences    |
| 93  | PATCH  | `/users/me/notification-preferences`  | Update preferences |

---

## 📊 21. Feedback

| #   | Method | Endpoint                    | Purpose                |
| --- | ------ | --------------------------- | ---------------------- |
| 94  | POST   | `/teams/:teamId/feedback`   | Submit feedback        |
| 95  | GET    | `/events/:eventId/feedback` | Event feedback (admin) |

---

## 🔍 22. Search

| #   | Method | Endpoint         | Purpose       |
| --- | ------ | ---------------- | ------------- |
| 96  | GET    | `/search`        | Global search |
| 97  | GET    | `/search/events` | Search events |
| 98  | GET    | `/search/teams`  | Search teams  |
| 99  | GET    | `/search/clubs`  | Search clubs  |

---

## 📊 23. Admin & Analytics

| #   | Method | Endpoint                  | Purpose             |
| --- | ------ | ------------------------- | ------------------- |
| 100 | GET    | `/admin/analytics`        | Analytics dashboard |
| 101 | GET    | `/admin/audit-logs`       | Audit logs          |
| 102 | GET    | `/admin/analytics/export` | Export analytics    |
| 103 | GET    | `/audit-logs/export`      | Export audit logs   |
| 104 | GET    | `/analytics/feedback`     | Feedback analytics  |

---

## 🏥 24. Health & System

| #   | Method | Endpoint  | Purpose         |
| --- | ------ | --------- | --------------- |
| 105 | GET    | `/health` | Service health  |
| 106 | GET    | `/ready`  | Readiness check |

---

## 📋 Quick Stats

| Category          | Count   |
| ----------------- | ------- |
| Landing           | 3       |
| Auth              | 9       |
| Dashboard         | 2       |
| Profile & Skills  | 9       |
| Events            | 7       |
| Enrollment        | 3       |
| AI Matching       | 3       |
| Teams             | 6       |
| Leader Voting     | 3       |
| Leave Request     | 6       |
| Replacement       | 3       |
| Invitations       | 4       |
| Chat              | 4       |
| Tasks             | 5       |
| Attachments       | 2       |
| Clubs             | 7       |
| Club Members      | 3       |
| Club Recruitment  | 5       |
| Club Applications | 5       |
| Notifications     | 4       |
| Feedback          | 2       |
| Search            | 4       |
| Admin & Analytics | 5       |
| Health & System   | 2       |
| **TOTAL**         | **106** |

---

## 🔐 Authentication Rules

- **Public routes:** Landing page only
- **Protected routes:** All others (need `Authorization: Bearer <JWT>`)
- **Admin routes:** Marked with `(admin)`
- **Secretary routes:** Marked with `(secretary)`
- **Core member routes:** Marked with `(core member)`

---

## 📌 API Conventions

- **Base URL:** `/api`
- **Pagination:** `?page=1&limit=20` (default 20, max 100)
- **Filtering:** `?status=active&type=hackathon`
- **Sorting:** `?sort=createdAt&order=desc`

---

## ⚠️ Error Format

```json
{
  "success": false,
  "error_code": "USER_NOT_FOUND",
  "message": "User does not exist",
  "request_id": "req_abc123",
  "timestamp": "2025-10-05T10:00:00Z"
}
```

## 📝 Status Codes

| Code | Meaning               | When It Happens                         |
| ---- | --------------------- | --------------------------------------- |
| 200  | OK                    | Request successful                      |
| 201  | Created               | Resource created (signup, event create) |
| 400  | Bad Request           | Validation failed, missing fields       |
| 401  | Unauthorized          | Missing or invalid JWT token            |
| 403  | Forbidden             | User doesn't have permission            |
| 404  | Not Found             | Resource doesn't exist                  |
| 409  | Conflict              | Duplicate resource (email exists)       |
| 422  | Unprocessable Entity  | Business rule violated                  |
| 429  | Too Many Requests     | Rate limit exceeded                     |
| 500  | Internal Server Error | Unexpected server error                 |
| 503  | Service Unavailable   | Dependency down (DB, third-party)       |

---

## 🖥️ Pages & Components Mapping

Ye section batata hai — kaunsa page kaunsa endpoint use karta hai.

---

### 📄 Page 1: Landing Page (`/`)

**Access:** Public (no login)

**Components:**

- Hero Section
- Features Grid (8 cards)
- Stats Bar
- Upcoming Events (3 cards)
- Active Clubs (5 cards)
- Platform Highlights
- Footer

**Endpoints used:**

- `GET /landing/featured-events`
- `GET /landing/featured-clubs`
- `GET /landing/stats`

---

### 📄 Page 2: Login (`/login`)

**Access:** Public

**Components:**

- Login Form (email + password)
- Google OAuth button
- Forgot Password link
- Signup link

**Endpoints used:**

- `POST /auth/login`
- `POST /auth/oauth/google`

---

### 📄 Page 3: Signup (`/signup`)

**Access:** Public

**Components:**

- Signup Form (name, email, password, year)
- Google OAuth button
- Login link

**Endpoints used:**

- `POST /auth/signup`
- `POST /auth/oauth/google`

---

### 📄 Page 4: Forgot Password (`/forgot-password`)

**Access:** Public

**Components:**

- Email input
- Send Reset Link button
- Back to Login link

**Endpoints used:**

- `POST /auth/forgot-password`

---

### 📄 Page 5: Reset Password (`/reset-password/:token`)

**Access:** Public (via email link)

**Components:**

- New Password input
- Confirm Password input
- Reset button

**Endpoints used:**

- `POST /auth/reset-password`

---

### 📄 Page 6: Student Dashboard (`/dashboard`)

**Access:** Protected (student)

**Components:**

- Welcome Header
- Stats Cards (events, teams, votes, skills)
- Suggestions Widget
- Upcoming Events Widget
- Notifications Widget
- Quick Actions

**Endpoints used:**

- `GET /dashboard`
- `GET /dashboard/stats`
- `GET /notifications`
- `GET /events/:eventId/suggestions`

---

### 📄 Page 7: Profile (`/profile`)

**Access:** Protected

**Components:**

- Profile Info Card
- Edit Profile Form
- GitHub Link Section
- Skills List
- Add Skill Form
- Verification Badges

**Endpoints used:**

- `GET /users/me`
- `PATCH /users/me`
- `POST /users/me/github`
- `GET /users/me/skills`
- `POST /users/me/skills`
- `PATCH /users/me/skills/:skillId`
- `DELETE /users/me/skills/:skillId`
- `POST /users/me/skills/verify`

---

### 📄 Page 8: Events List (`/events`)

**Access:** Protected

**Components:**

- Search Bar
- Filter (type, status)
- Event Cards Grid
- Enrollment Status Badge

**Endpoints used:**

- `GET /events`
- `GET /users/me/enrollments`

---

### 📄 Page 9: Event Details (`/events/:eventId`)

**Access:** Protected

**Components:**

- Event Header (title, deadline)
- Event Description
- Team Size Info
- Enrolled Count
- Raise Hand button
- Enrolled Users List (admin only)

**Endpoints used:**

- `GET /events/:eventId`
- `POST /events/:eventId/enroll`
- `GET /events/:eventId/enrollments`

---

### 📄 Page 10: AI Suggestions (`/matching`)

**Access:** Protected

**Components:**

- Suggestions List
- Suggestion Card (members, score, reasoning)
- Leader Candidate Badge
- Accept/Decline buttons

**Endpoints used:**

- `GET /events/:eventId/suggestions`
- `POST /suggestions/:suggestionId/accept`

---

### 📄 Page 11: Team Dashboard (`/teams/:teamId`)

**Access:** Protected (team members)

**Components:**

- Team Header (name, status, event)
- Members List
- Tabs: Chat | Tasks | Voting | Leave
- Recent Activity

**Endpoints used:**

- `GET /teams/:teamId`
- `GET /teams/:teamId/members`
- `GET /teams/:teamId/conversation`
- `GET /teams/:teamId/tasks`

---

### 📄 Page 12: Leader Voting (`/teams/:teamId/leader-vote`)

**Access:** Protected (team members)

**Components:**

- Candidate Cards
- Vote buttons
- Vote Progress Bar
- Countdown Timer

**Endpoints used:**

- `POST /teams/:teamId/leader/vote`
- `GET /teams/:teamId/leader/votes`

---

### 📄 Page 13: Leave Request Voting (`/teams/:teamId/leave-requests/:requestId`)

**Access:** Protected (team members)

**Components:**

- Request Details
- Voter List (approve/reject)
- Vote buttons
- Countdown Timer (48h)
- Result Display

**Endpoints used:**

- `GET /teams/:teamId/leave-requests`
- `POST /teams/:teamId/leave-requests/:requestId/votes`
- `GET /teams/:teamId/leave-requests/:requestId/result`

---

### 📄 Page 14: Replacement (`/teams/:teamId/replacement`)

**Access:** Protected (leader)

**Components:**

- Top 3 AI Candidates
- Candidate Card (score, role)
- Invite button

**Endpoints used:**

- `GET /teams/:teamId/replacements`
- `POST /teams/:teamId/replacements/:suggestionId/invite`
- `POST /teams/:teamId/find-replacement`

---

### 📄 Page 15: External Invite (`/teams/:teamId/external-invite`)

**Access:** Protected (leader only)

**Components:**

- Email Input
- Name Input
- Role Selector
- Message Textarea
- Send Invite button

**Endpoints used:**

- `POST /teams/:teamId/external-invitations`

---

### 📄 Page 16: External Signup (`/external-invitations/:token`)

**Access:** Public (via invite link)

**Components:**

- Pre-filled Email
- Name Input
- Password Input
- Signup button

**Endpoints used:**

- `POST /external-invitations/:token/signup`

---

### 📄 Page 17: Chat (`/teams/:teamId/chat`)

**Access:** Protected (team members)

**Components:**

- Conversation Window
- Message Bubbles
- Message Input
- Attach File button
- Unread Count

**Endpoints used:**

- `GET /conversations/:convId/messages`
- `POST /conversations/:convId/messages`
- `PATCH /messages/:messageId`
- `POST /uploads/presign`
- `POST /messages/:messageId/attachments`

---

### 📄 Page 18: Task Board (`/teams/:teamId/tasks`)

**Access:** Protected (team members)

**Components:**

- Kanban Board (Todo | Doing | Done)
- Task Cards
- Add Task button
- Task Modal (create/edit)
- Assignee Picker

**Endpoints used:**

- `GET /teams/:teamId/tasks`
- `POST /teams/:teamId/tasks`
- `PATCH /tasks/:taskId`
- `DELETE /tasks/:taskId`
- `POST /tasks/:taskId/assignments`

---

### 📄 Page 19: Clubs Directory (`/clubs`)

**Access:** Protected

**Components:**

- Search Bar
- Clubs Grid (5 cards)
- Club Card (logo, name, member count, type)

**Endpoints used:**

- `GET /clubs`

---

### 📄 Page 20: Club Details (`/clubs/:clubId`)

**Access:** Protected

**Components:**

- Club Header (logo, name, description)
- Members List
- Secretary + Core Members
- Active Recruitments
- Club Events

**Endpoints used:**

- `GET /clubs/:clubId`
- `GET /clubs/:clubId/members`
- `GET /clubs/:clubId/recruitments`

---

### 📄 Page 21: Recruitment Details (`/recruitments/:recruitmentId`)

**Access:** Protected

**Components:**

- Recruitment Header
- Requirements
- Deadline
- Positions Open
- Apply button
- Application Form

**Endpoints used:**

- `GET /recruitments/:recruitmentId`
- `POST /recruitments/:recruitmentId/applications`

---

### 📄 Page 22: Club Application Status (`/applications/:applicationId`)

**Access:** Protected (applicant)

**Components:**

- Application Status
- Verification Stage
- Feedback / Notes
- Withdraw button

**Endpoints used:**

- `GET /clubs/:clubId/applications` (ya similar)

---

### 📄 Page 23: Recruitment Verification (Secretary)

**Access:** Protected (secretary/core)

**Components:**

- Applications List
- Applicant Cards
- Verify button
- Approve / Reject buttons
- Verification Notes

**Endpoints used:**

- `GET /recruitments/:recruitmentId/applications`
- `POST /applications/:applicationId/verify`
- `POST /applications/:applicationId/approve`
- `POST /applications/:applicationId/reject`

---

### 📄 Page 24: Notifications (`/notifications`)

**Access:** Protected

**Components:**

- Notifications List
- Filter (read/unread)
- Mark as Read button
- Preferences link

**Endpoints used:**

- `GET /notifications`
- `PATCH /notifications/:notificationId/read`
- `GET /users/me/notification-preferences`

---

### 📄 Page 25: Notification Preferences (`/settings/notifications`)

**Access:** Protected

**Components:**

- Toggles (email, push, chat, match, deadline, club)
- Save button

**Endpoints used:**

- `GET /users/me/notification-preferences`
- `PATCH /users/me/notification-preferences`

---

### 📄 Page 26: Feedback (`/teams/:teamId/feedback`)

**Access:** Protected (team members)

**Components:**

- Rating Stars (1-5)
- Comments Textarea
- Submit button

**Endpoints used:**

- `POST /teams/:teamId/feedback`

---

### 📄 Page 27: Search Results (`/search`)

**Access:** Protected

**Components:**

- Search Bar
- Filter Tabs (All | Events | Teams | Clubs)
- Results List

**Endpoints used:**

- `GET /search`
- `GET /search/events`
- `GET /search/teams`
- `GET /search/clubs`

---

### 📄 Page 28: Admin Dashboard (`/admin/dashboard`)

**Access:** Protected (admin)

**Components:**

- Analytics Stats
- Charts (participation, skill gaps)
- Recent Events
- Recent Users
- Export button

**Endpoints used:**

- `GET /admin/analytics`
- `GET /admin/audit-logs`
- `GET /admin/analytics/export`

---

### 📄 Page 29: Admin — Event Management (`/admin/events`)

**Access:** Protected (admin)

**Components:**

- Events Table
- Create Event button
- Edit/Delete actions
- Publish/Close actions

**Endpoints used:**

- `GET /events`
- `POST /events`
- `PATCH /events/:eventId`
- `DELETE /events/:eventId`
- `POST /events/:eventId/publish`
- `POST /events/:eventId/close`
- `POST /events/:eventId/matching/run`

---

### 📄 Page 30: Admin — Club Management (`/admin/clubs`)

**Access:** Protected (admin)

**Components:**

- Clubs Table
- Create Club button
- Edit/Delete actions
- Rename Requests
- Approve/Reject actions

**Endpoints used:**

- `GET /clubs`
- `POST /clubs`
- `PATCH /clubs/:clubId`
- `DELETE /clubs/:clubId`
- `POST /clubs/:clubId/rename-request/:requestId/approve`

---

### 📄 Page 31: Admin — Audit Logs (`/admin/audit-logs`)

**Access:** Protected (admin)

**Components:**

- Logs Table
- Filters (action, user, date)
- Export button

**Endpoints used:**

- `GET /admin/audit-logs`
- `GET /audit-logs/export`

---

## 📊 Summary Table

| #   | Page                     | Access    | Endpoints Used |
| --- | ------------------------ | --------- | -------------- |
| 1   | Landing                  | Public    | 3              |
| 2   | Login                    | Public    | 2              |
| 3   | Signup                   | Public    | 2              |
| 4   | Forgot Password          | Public    | 1              |
| 5   | Reset Password           | Public    | 1              |
| 6   | Dashboard                | Student   | 4              |
| 7   | Profile                  | Student   | 8              |
| 8   | Events List              | Student   | 2              |
| 9   | Event Details            | Student   | 3              |
| 10  | AI Suggestions           | Student   | 2              |
| 11  | Team Dashboard           | Team      | 4              |
| 12  | Leader Voting            | Team      | 2              |
| 13  | Leave Voting             | Team      | 3              |
| 14  | Replacement              | Leader    | 3              |
| 15  | External Invite          | Leader    | 1              |
| 16  | External Signup          | Public    | 1              |
| 17  | Chat                     | Team      | 5              |
| 18  | Task Board               | Team      | 5              |
| 19  | Clubs Directory          | Student   | 1              |
| 20  | Club Details             | Student   | 3              |
| 21  | Recruitment Details      | Student   | 2              |
| 22  | Application Status       | Applicant | 1              |
| 23  | Recruitment Verification | Secretary | 4              |
| 24  | Notifications            | Student   | 3              |
| 25  | Notification Prefs       | Student   | 2              |
| 26  | Feedback                 | Team      | 1              |
| 27  | Search                   | Student   | 4              |
| 28  | Admin Dashboard          | Admin     | 3              |
| 29  | Admin Events             | Admin     | 7              |
| 30  | Admin Clubs              | Admin     | 5              |
| 31  | Admin Audit Logs         | Admin     | 2              |

**Total Pages:** 31

**Total Unique Endpoints:** 106

---

## 🎯 Page Categories

### Public Pages (5):

- Landing
- Login
- Signup
- Forgot Password
- Reset Password
- External Signup

### Student Pages (10):

- Dashboard
- Profile
- Events List
- Event Details
- AI Suggestions
- Clubs Directory
- Club Details
- Recruitment Details
- Notifications
- Search

### Team Pages (5):

- Team Dashboard
- Leader Voting
- Leave Voting
- Chat
- Task Board
- Feedback

### Leader Pages (2):

- Replacement
- External Invite

### Secretary Pages (1):

- Recruitment Verification

### Admin Pages (4):

- Admin Dashboard
- Admin Events
- Admin Clubs
- Admin Audit Logs

---

## 📝 Notes

1. **Landing page** public hai — login nahi chahiye
2. **External Signup** public hai — invite token se aata hai
3. **Har page multiple endpoints use karta hai** — ek page ≠ ek endpoint
4. **Kuch endpoints multiple pages mein use hote hain** — jaise `GET /events`
5. **Role-based access** — admin, secretary, core member, team member

---

## 🔧 Backend-Only / Implicit Endpoints

Ye endpoints UI pe directly nahi dikhte, lekin zaroori hain:

| #   | Method | Endpoint                                 | Purpose                             |
| --- | ------ | ---------------------------------------- | ----------------------------------- |
| 1   | POST   | `/auth/logout`                           | Logout user                         |
| 2   | POST   | `/auth/verify-email`                     | Verify email                        |
| 3   | GET    | `/auth/me`                               | Current user (used globally)        |
| 4   | GET    | `/users/:userId`                         | View other profiles                 |
| 5   | POST   | `/teams`                                 | Create team (via suggestion accept) |
| 6   | PATCH  | `/teams/:teamId`                         | Update team                         |
| 7   | POST   | `/teams/:teamId/confirm`                 | Confirm team                        |
| 8   | GET    | `/users/me/teams`                        | My teams list                       |
| 9   | PATCH  | `/teams/:teamId/leader`                  | Update leader (after voting)        |
| 10  | DELETE | `/leave-requests/:requestId`             | Cancel leave request                |
| 11  | GET    | `/teams/:teamId/votes`                   | All team votes                      |
| 12  | POST   | `/teams/:teamId/invitations`             | Invite registered user              |
| 13  | POST   | `/teams/:teamId/invitations/:id/respond` | Respond to invite                   |
| 14  | POST   | `/clubs/:clubId/rename-request`          | Request rename                      |
| 15  | POST   | `/clubs/:clubId/members`                 | Add member                          |
| 16  | DELETE | `/clubs/:clubId/members/:memberId`       | Remove member                       |
| 17  | POST   | `/clubs/:clubId/recruitments`            | Create recruitment                  |
| 18  | PATCH  | `/recruitments/:recruitmentId`           | Update recruitment                  |
| 19  | POST   | `/recruitments/:recruitmentId/close`     | Close recruitment                   |
| 20  | GET    | `/events/:eventId/feedback`              | View event feedback                 |
| 21  | GET    | `/analytics/feedback`                    | Feedback analytics                  |
| 22  | GET    | `/health`                                | Service health                      |
| 23  | GET    | `/ready`                                 | Readiness check                     |

**Note:** Ye endpoints backend mein implemented honge, lekin dedicated page nahi hoga. Ye API clients, admin tools, ya implicit flows mein use honge.
