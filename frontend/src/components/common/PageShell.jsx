import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { fetchNotifications } from "../../api/notifications";
import { clearSession } from "../../utils/clubHelpers";

const NAV_LINKS = [
  { to: "/events", label: "Events" },
  { to: "/clubs", label: "Clubs" },
  { to: "/search", label: "Search" },
  { to: "/profile", label: "Profile" },
];

const linkClass = ({ isActive }) =>
  `font-medium ${
    isActive ? "text-indigo-600" : "text-gray-700 hover:text-indigo-600"
  }`;

/**
 * Navbar + footer wrapper (Dashboard ke look jaisa).
 * unreadCount pass karoge to wahi badge mein dikhega, nahi to khud fetch karta hai.
 */
export default function PageShell({ children, unreadCount }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [fetchedCount, setFetchedCount] = useState(0);

  useEffect(() => {
    if (unreadCount !== undefined) return undefined;
    let cancelled = false;
    fetchNotifications({ limit: 1 })
      .then((res) => {
        if (!cancelled) setFetchedCount((res.meta && res.meta.unread_count) || 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [unreadCount]);

  const badge = unreadCount !== undefined ? unreadCount : fetchedCount;

  const handleLogout = () => {
    clearSession();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/dashboard" className="text-2xl font-bold text-indigo-600">
            CampusX
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className={linkClass}>
                {l.label}
              </NavLink>
            ))}
            <Link to="/notifications" className="relative" aria-label="Notifications">
              <span className="text-2xl">🔔</span>
              {badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-1.5 rounded-lg hover:bg-red-700 text-sm"
            >
              Logout
            </button>
          </div>

          <div className="flex items-center gap-4 md:hidden">
            <Link to="/notifications" className="relative" aria-label="Notifications">
              <span className="text-2xl">🔔</span>
              {badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Menu"
              aria-expanded={menuOpen}
              className="text-2xl text-gray-700"
            >
              ☰
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t px-6 py-3 flex flex-col gap-3 bg-white">
            {NAV_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={linkClass}
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="text-left text-red-600 font-medium"
            >
              Logout
            </button>
          </div>
        )}
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">{children}</main>

      <footer className="bg-white border-t py-6 text-center text-gray-500 text-sm">
        © 2026 CampusX · IIIT Vadodara
      </footer>
    </div>
  );
}
