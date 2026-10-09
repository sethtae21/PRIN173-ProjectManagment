import { useState } from "react";
import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import fitFusionLogo from "../assets/fitfusion-logo.svg";
import "./ShopperLayout.css";

const navigationItems = [
  {
    label: "Dashboard",
    to: "/shopper/dashboard",
    matches: ["/shopper/dashboard"],
  },
  {
    label: "Fitting Studio",
    to: "/shopper/fitting-studio",
    matches: ["/shopper/fitting-studio"],
  },
  {
    label: "Avatar Presets",
    to: "/shopper/avatar-presets",
    matches: ["/shopper/avatar-presets"],
  },
  {
    label: "Catalog",
    to: "/shopper/catalog",
    matches: [
      "/shopper/catalog",
      "/shopper/products",
      "/shopper/sellers",
      "/shopper/store",
    ],
  },
  {
    label: "Saved Outfits",
    to: "/shopper/saved-outfits",
    matches: ["/shopper/saved-outfits"],
  },
  {
    label: "Orders",
    to: "/shopper/orders",
    matches: [
      "/shopper/orders",
      "/shopper/order-confirmation",
    ],
  },
  {
    label: "Account",
    to: "/shopper/account",
    matches: ["/shopper/account"],
  },
];

function ShopperLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [
    showLogoutModal,
    setShowLogoutModal,
  ] = useState(false);

  function isCurrentPage(matches) {
    return matches.some(
      (path) =>
        pathname === path ||
        pathname.startsWith(`${path}/`)
    );
  }

  function handleLogout() {
    sessionStorage.removeItem("userRole");
    sessionStorage.removeItem("userEmail");
    sessionStorage.removeItem(
      "registeredAccount"
    );

    localStorage.removeItem(
      "fitfusion-current-user"
    );

    setShowLogoutModal(false);

    navigate("/login", {
      replace: true,
    });
  }

  return (
    <div className="shopper-shell">
      <aside className="unified-shopper-sidebar">
        <Link
          to="/shopper/dashboard"
          className="unified-sidebar-logo"
          aria-label="Open shopper dashboard"
        >
          <img
            src={fitFusionLogo}
            alt="FitFusion AI"
          />
        </Link>

        <nav
          className="unified-shopper-navigation"
          aria-label="Shopper navigation"
        >
          {navigationItems.map((item) => {
            const active = isCurrentPage(
              item.matches
            );

            return (
              <Link
                key={item.to}
                to={item.to}
                className={
                  active
                    ? "unified-shopper-link active"
                    : "unified-shopper-link"
                }
                aria-current={
                  active ? "page" : undefined
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          className="unified-shopper-logout"
          onClick={() =>
            setShowLogoutModal(true)
          }
        >
          Logout
        </button>
      </aside>

      <section className="shopper-layout-content">
        <Outlet />
      </section>

      {showLogoutModal && (
        <div
          className="shopper-logout-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setShowLogoutModal(false);
            }
          }}
        >
          <section
            className="shopper-logout-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shopper-logout-title"
          >
            <p className="shopper-logout-label">
              CONFIRM LOGOUT
            </p>

            <h2 id="shopper-logout-title">
              Leave your shopper account?
            </h2>

            <p>
              You will need to log in again to
              access your saved outfits, cart, and
              order history.
            </p>

            <div className="shopper-logout-actions">
              <button
                type="button"
                className="shopper-logout-cancel"
                onClick={() =>
                  setShowLogoutModal(false)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="shopper-logout-confirm"
                onClick={handleLogout}
              >
                Log Out
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default ShopperLayout;