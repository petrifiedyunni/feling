import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import { useEffect, useState, type MouseEvent } from "react";
import { useCart } from "../cart/CartContext";
import { CartDrawer } from "./CartDrawer";
import { SiteFooter } from "./SiteFooter";
import { RESET_LANDING_EVENT } from "../pages/HomePage";

export function SiteShell() {
  const [sideOpen, setSideOpen] = useState(false);
  const { count, openCart } = useCart();
  const location = useLocation();

  useEffect(() => {
    setSideOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = sideOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sideOpen]);

  const closeSide = () => setSideOpen(false);
  const isHome = location.pathname === "/";
  const isPlayground = location.pathname === "/playground";

  const onBrandClick = (e: MouseEvent<HTMLAnchorElement>) => {
    closeSide();
    if (location.pathname === "/") {
      e.preventDefault();
      window.dispatchEvent(new Event(RESET_LANDING_EVENT));
    }
  };

  return (
    <div
      className={`site site--sided ${isHome ? "site--home" : "site--browse"}${isPlayground ? " site--playground" : ""}`}
    >
      <aside className={`side ${sideOpen ? "side--open" : ""}`}>
        <nav className="side__nav" aria-label="Primary">
          <NavLink to="/shop" end onClick={closeSide}>
            New in
          </NavLink>
          <NavLink to="/shop" onClick={closeSide}>
            Shop all
          </NavLink>
          <NavLink to="/shop/bags" onClick={closeSide}>
            Bags
          </NavLink>
          <NavLink to="/shop/shoes" onClick={closeSide}>
            Shoes
          </NavLink>
          <NavLink to="/shop/ready-to-wear" onClick={closeSide}>
            Clothing
          </NavLink>
          <NavLink to="/playground" onClick={closeSide}>
            Playground
          </NavLink>
          <NavLink to="/shop" onClick={closeSide}>
            Accessories
          </NavLink>
        </nav>
      </aside>

      {sideOpen && (
        <button
          className="side__scrim"
          type="button"
          aria-label="Close menu"
          onClick={closeSide}
        />
      )}

      <header className="topbar">
        <button
          className="topbar__menu"
          type="button"
          aria-label="Open menu"
          onClick={() => setSideOpen(true)}
        >
          <span className="topbar__menu-icon" aria-hidden>
            <i />
            <i />
            <i />
          </span>
        </button>
        <Link to="/" className="topbar__brand" onClick={onBrandClick}>
          feling<span>.</span>
        </Link>
        <button
          type="button"
          className="topbar__cart"
          onClick={openCart}
          aria-label={`Cart, ${count} items`}
        >
          Cart
          <span className="topbar__count">{count}</span>
        </button>
      </header>

      <CartDrawer />

      <div className="site__main">
        <main>
          <Outlet />
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}
