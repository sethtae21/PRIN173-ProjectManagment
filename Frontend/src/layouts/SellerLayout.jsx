import { useState } from "react";

import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import fitFusionLogo from "../assets/fitfusion-logo.svg";
import "./SellerLayout.css";

const navigationItems = [
  {
    label: "Dashboard",
    to: "/seller/dashboard",
    matches: ["/seller/dashboard"],
  },
  {
    label: "Upload Catalog",
    to: "/seller/upload-catalog",
    matches: [
      "/seller/upload-catalog",
      "/seller/catalog-upload",
    ],
  },
  {
    label: "Listings",
    to: "/seller/listings",
    matches: [
      "/seller/listings",
      "/seller/products",
    ],
  },
  {
   label: "Reports",
   to: "/seller/validation",
   matches: ["/seller/validation"],
  },
  {
    label: "Store Profile",
    to: "/seller/store-profile",
    matches: ["/seller/store-profile"],
  },
];

function SellerLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [showLogoutModal, setShowLogoutModal] =
    useState(false);

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
    sessionStorage.removeItem("registeredAccount");

    localStorage.removeItem(
      "fitfusion-current-user"
    );

    setShowLogoutModal(false);

    navigate("/login", {
      replace: true,
    });
  }

  return (
    <div className="seller-shell">
      <aside className="unified-seller-sidebar">
        <Link
          to="/seller/dashboard"
          className="unified-seller-logo"
          aria-label="Go to seller dashboard"
        >
          <img
            src={fitFusionLogo}
            alt="FitFusion AI"
          />
        </Link>

        <nav
          className="unified-seller-navigation"
          aria-label="Seller navigation"
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
                    ? "unified-seller-link active"
                    : "unified-seller-link"
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
          className="unified-seller-logout"
          onClick={() =>
            setShowLogoutModal(true)
          }
        >
          Logout
        </button>
      </aside>

      <main className="seller-layout-content">
        <Outlet />
      </main>

      {showLogoutModal && (
        <div
          className="seller-logout-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowLogoutModal(false);
            }
          }}
        >
          <section
            className="seller-logout-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-logout-title"
          >
            <h2 id="seller-logout-title">
              Log out?
            </h2>

            <p>
              Are you sure you want to end your
              seller session?
            </p>

            <div className="seller-logout-actions">
              <button
                type="button"
                className="seller-logout-cancel"
                onClick={() =>
                  setShowLogoutModal(false)
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