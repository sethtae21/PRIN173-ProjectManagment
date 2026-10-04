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
      "/shopper/cart",
      "/shopper/checkout",
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
    return matches.some((path) => {
      return (
        pathname === path ||
        pathname.startsWith(`${path}/`)
      );
    });
  }

  function openLogoutModal() {
    setShowLogoutModal(true);
  }

  function closeLogoutModal() {
    setShowLogoutModal(false);
  }

  function handleLogout() {
    sessionStorage.removeItem("userRole");
    sessionStorage.removeItem("userEmail");
    sessionStorage.removeItem(
      "fitfusion-current-user"
    );

    localStorage.removeItem(
      "fitfusion-current-user"
    );

    closeLogoutModal();

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
          aria-label="Go to shopper dashboard"
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
            const isActive = isCurrentPage(
              item.matches
            );

            return (
              <Link
                key={item.to}
                to={item.to}
                className={
                  isActive
                    ? "unified-shopper-link active"
                    : "unified-shopper-link"
                }
                aria-current={
                  isActive ? "page" : undefined
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
          onClick={openLogoutModal}
        >
          Logout
        </button>
      </aside>

      <div className="shopper-shell-content">
        <Outlet />
      </div>

      {showLogoutModal && (
        <div
          className="unified-logout-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeLogoutModal();
            }
          }}
        >
          <section
            className="unified-logout-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="unified-logout-title"
          >
            <div
              className="unified-logout-icon"
              aria-hidden="true"
            >
              ↪
            </div>

            <p>END SESSION</p>

            <h2 id="unified-logout-title">
              Log out of FitFusion?
            </h2>

            <span>
              You will need to log in again to
              access your registered shopper
              account.
            </span>

            <div className="unified-logout-actions">
              <button
                type="button"
                onClick={closeLogoutModal}
              >
                Cancel
              </button>

              <button
                type="button"
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