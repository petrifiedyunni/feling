import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

/** Sidebar layout for the internal, login-gated pages (/review, /ops). */
export function TeamShell() {
  const { user, logout } = useAuth();

  return (
    <div className="team">
      <aside className="team__sidebar">
        <div className="team__brand">
          feling<span>.</span>
          <em>team</em>
        </div>
        <nav className="team__nav">
          <NavLink to="/review" className={({ isActive }) => (isActive ? "is-active" : "")}>
            Review queue
          </NavLink>
          <NavLink to="/ops" className={({ isActive }) => (isActive ? "is-active" : "")}>
            Inventory ops
          </NavLink>
        </nav>
        <div className="team__account">
          <span>{user?.username}</span>
          <button type="button" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>
      <main className="team__main">
        <Outlet />
      </main>
    </div>
  );
}
