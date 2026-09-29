import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const STORAGE_KEY = "feling.team-sidebar-collapsed";

function loadCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

const NAV_ITEMS = [
  { to: "/review", label: "Review queue", short: "R" },
  { to: "/ops", label: "Inventory ops", short: "O" },
];

/** Sidebar layout for the internal, login-gated pages (/review, /ops).
 * Collapse state is a per-viewer convenience, remembered in localStorage. */
export function TeamShell() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(loadCollapsed);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      // per-viewer convenience only — fine if it doesn't persist
    }
  }, [collapsed]);

  return (
    <div className={`team${collapsed ? " team--collapsed" : ""}`}>
      <aside className="team__sidebar">
        <div className="team__top">
          <div className="team__brand">
            {collapsed ? (
              "f."
            ) : (
              <>
                feling<span>.</span>
                <em>team</em>
              </>
            )}
          </div>
          <button
            type="button"
            className="team__toggle"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? "›" : "‹"}
          </button>
        </div>
        <nav className="team__nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? "is-active" : "")}
              title={item.label}
            >
              {collapsed ? <span className="team__nav-short">{item.short}</span> : item.label}
            </NavLink>
          ))}
        </nav>
        <div className="team__account">
          {!collapsed && <span>{user?.username}</span>}
          <button type="button" onClick={logout} title="Log out">
            {collapsed ? "⏻" : "Log out"}
          </button>
        </div>
      </aside>
      <main className="team__main">
        <Outlet />
      </main>
    </div>
  );
}
