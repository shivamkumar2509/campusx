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
