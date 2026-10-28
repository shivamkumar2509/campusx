import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import ProtectedRoute from "./components/ProtectedRoute";
import Clubs from "./pages/Clubs";
import ClubDetail from "./pages/ClubDetail";
import Recruitment from "./pages/Recruitment";
import Notifications from "./pages/Notifications";
import Search from "./pages/Search";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import Matching from "./pages/Matching";
import TeamDashboard from "./pages/TeamDashboard";
import Chat from "./pages/Chat";
import AdminDashboard from "./pages/AdminDashboard";
import AdminEvents from "./pages/AdminEvents";
import ExternalInvite from "./pages/ExternalInvite";
import ClubJoinRequests from "./pages/ClubJoinRequests";
import AdminClubs from "./pages/AdminClubs";
import AdminBroadcast from "./pages/AdminBroadcast";
import AdminUsers from "./pages/AdminUsers";
import AdminExternalInvites from "./pages/AdminExternalInvites";
import TeamVoting from "./pages/TeamVoting";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Student routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clubs"
          element={
            <ProtectedRoute>
              <Clubs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clubs/:clubId"
          element={
            <ProtectedRoute>
              <ClubDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recruitments/:recruitmentId"
          element={
            <ProtectedRoute>
              <Recruitment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <Search />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events"
          element={
            <ProtectedRoute>
              <Events />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:eventId"
          element={
            <ProtectedRoute>
              <EventDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/matching"
          element={
            <ProtectedRoute>
              <Matching />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teams/:teamId"
          element={
            <ProtectedRoute>
              <TeamDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clubs/:clubId/join-requests"
          element={
            <ProtectedRoute>
              <ClubJoinRequests />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teams/:teamId/chat"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teams/:teamId/external-invite"
          element={
            <ProtectedRoute>
              <ExternalInvite />
            </ProtectedRoute>
          }
        />

        {/* Admin-only routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/events"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminEvents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/clubs"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminClubs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/broadcast"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminBroadcast />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/external-invites"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminExternalInvites />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teams/:teamId/voting"
          element={
            <ProtectedRoute>
              <TeamVoting />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
