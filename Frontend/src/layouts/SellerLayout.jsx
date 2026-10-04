import { useState } from "react";

import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import fitFusionLogo from "../assets/fitfusion-logo.svg";
import "./SellerLayout.css";

const sellerNavigation = [
  {
    label: "Dashboard",
    to: "/seller/dashboard",
    matches: ["/seller/dashboard"],
  },
  {
    label: "Upload Catalog",
    to: "/seller/products/upload",
    matches: ["/seller/products/upload"],
  },
  {
    label: "Listings",
    to: "/seller/products",
    matches: [
      "/seller/products",
      "/seller/products/new",
    ],
    exclude: ["/seller/products/upload"],
  },
  {
    label: "Validation",
    to: "/seller/validation-report",
    matches: ["/seller/validation-report"],
  },
  {
    label: "Store Profile",
    to: "/seller/account",
    matches: [
      "/seller/account",
      "/seller/store-profile",
    ],
  },
];

function SellerLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [
    showLogoutConfirmation,
    setShowLogoutConfirmation,
  ] = useState(false);

  function isCurrentPage(item) {
    const matchesPath = item.matches.some(
      (path) =>
        pathname === path ||
        pathname.startsWith(`${path}/`)
    );

    const matchesExcludedPath =
      item.exclude?.some(
        (path) =>
          pathname === path ||
          pathname.startsWith(`${path}/`)
      ) || false;

    return matchesPath && !matchesExcludedPath;
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

    setShowLogoutConfirmation(false);

    navigate("/login", {
      replace: true,
    });
  }

  return (
    <div className="seller-layout">
      <aside className="seller-sidebar">
        <Link
          to="/seller/dashboard"
          className="seller-sidebar-logo"
          aria-label="Open Seller Dashboard"
        >
          <img
            src={fitFusionLogo}
            alt="FitFusion AI"
          />
        </Link>

        <nav
          className="seller-sidebar-navigation"
          aria-label="Seller navigation"
        >
          {sellerNavigation.map((item) => {
            const active = isCurrentPage(item);

            return (
              <Link
                key={item.to}
                to={item.to}
                className={
                  active
                    ? "seller-sidebar-link active"
                    : "seller-sidebar-link"
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
          className="seller-sidebar-logout"
          onClick={() =>
            setShowLogoutConfirmation(true)
          }
        >
          Logout
        </button>
      </aside>

      <section className="seller-layout-content">
        <Outlet />
      </section>

      {showLogoutConfirmation && (
        <div
          className="seller-logout-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowLogoutConfirmation(false);
            }
          }}
        >
          <section
            className="seller-logout-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-logout-title"
          >
            <div className="seller-logout-icon">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M10 5H5v14h5" />
                <path d="M14 8l4 4-4 4" />
                <path d="M8 12h10" />
              </svg>
            </div>

            <p className="seller-logout-label">
              SELLER ACCOUNT
            </p>

            <h2 id="seller-logout-title">
              Log out of FitFusion?
            </h2>

            <p className="seller-logout-message">
              You will need to enter your seller
              credentials again to access your
              dashboard and product management tools.
            </p>

            <div className="seller-logout-actions">
              <button
                type="button"
                className="seller-logout-cancel"
                onClick={() =>
                  setShowLogoutConfirmation(false)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="seller-logout-confirm"
                onClick={handleLogout}
              >
                Confirm Logout
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default SellerLayout;