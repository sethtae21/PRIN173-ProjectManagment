import { useState } from "react";

import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import fitFusionLogo from "../assets/fitfusion-logo.svg";
import "./GuestLayout.css";

const navigationItems = [
  {
    label: "Guest Dashboard",
    to: "/guest",
    paths: ["/guest"],
    exact: true,
  },
  {
    label: "Fitting Studio",
    to: "/guest/fitting-studio",
    paths: ["/guest/fitting-studio"],
  },
  {
    label: "Avatar Preset",
    to: "/guest/avatar-presets",
    paths: ["/guest/avatar-presets"],
  },
  {
    label: "Catalog",
    to: "/guest/catalog",
    paths: [
      "/guest/catalog",
      "/guest/products",
      "/guest/sellers",
      "/guest/store",
    ],
  },
];

const restrictedItems = [
  {
    label: "Saved Outfits",
    feature: "save and manage outfits",
  },
  {
    label: "Orders",
    feature: "view order history",
  },
  {
    label: "Account",
    feature: "manage an account",
  },
];

function getGuestPageHeader(pathname) {
  if (
    pathname.startsWith(
      "/guest/fitting-studio/customize"
    )
  ) {
    return {
      code: "11G",
      title: "GUEST FITTING STUDIO",
      description:
        "Customize a temporary avatar and try recommended clothing.",
    };
  }

  if (
    pathname.startsWith(
      "/guest/fitting-studio/select-items"
    )
  ) {
    return {
      code: "15G",
      title: "SELECT ITEMS",
      description:
        "Preview selected garments during this temporary guest session.",
    };
  }

  if (
    pathname.startsWith(
      "/guest/fitting-studio"
    )
  ) {
    return {
      code: "09G",
      title: "GUEST AVATAR GENDER",
      description:
        "Choose Male or Female for this temporary session.",
    };
  }

  if (
    pathname.startsWith(
      "/guest/avatar-presets"
    )
  ) {
    return {
      code: "07G",
      title: "GUEST AVATAR PRESETS",
      description:
        "Select a temporary avatar for this session. Changes will not be saved.",
    };
  }

  if (
    pathname.startsWith("/guest/products")
  ) {
    return {
      code: "10",
      title: "PRODUCT DETAILS",
      description:
        "View product information, available sizes, ratings, and seller details.",
    };
  }

  if (
    pathname.startsWith("/guest/sellers") ||
    pathname.startsWith("/guest/store")
  ) {
    return {
      code: "10A",
      title: "SELLER STORE",
      description:
        "Browse products available from this verified FitFusion seller.",
    };
  }

  if (pathname.startsWith("/guest/catalog")) {
    return {
      code: "09",
      title: "PRODUCT CATALOG",
      description:
        "Browse products from verified FitFusion sellers.",
    };
  }

  return {
    code: "07",
    title: "GUEST DASHBOARD",
    description: "Temporary visualization access",
  };
}

function GuestLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const pageHeader =
    getGuestPageHeader(pathname);

  const [
    restrictionModal,
    setRestrictionModal,
  ] = useState({
    isOpen: false,
    feature: "",
  });

  function isCurrentPage(item) {
    if (item.exact) {
      return pathname === item.to;
    }

    return item.paths.some(
      (path) =>
        pathname === path ||
        pathname.startsWith(`${path}/`)
    );
  }

  function openGuestRestriction(feature) {
    setRestrictionModal({
      isOpen: true,
      feature:
        feature ||
        "access this registered-user feature",
    });
  }

  function closeGuestRestriction() {
    setRestrictionModal({
      isOpen: false,
      feature: "",
    });
  }

  function goToLogin() {
    closeGuestRestriction();

    navigate("/login");
  }

  function goToSignup() {
    closeGuestRestriction();

    navigate("/signup");
  }

  return (
    <div className="guest-shell">
      <aside className="guest-sidebar">
        <Link
          to="/guest"
          className="guest-sidebar-logo"
          aria-label="Go to guest dashboard"
        >
          <img
            src={fitFusionLogo}
            alt="FitFusion AI"
          />
        </Link>

        <nav
          className="guest-navigation"
          aria-label="Guest navigation"
        >
          {navigationItems.map((item) => {
            const active =
              isCurrentPage(item);

            return (
              <Link
                key={item.to}
                to={item.to}
                className={
                  active
                    ? "guest-navigation-link active"
                    : "guest-navigation-link"
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

        <section className="guest-restricted-section">
          <p className="guest-restricted-title">
            Account Required
          </p>

          {restrictedItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className="guest-restricted-link"
              onClick={() =>
                openGuestRestriction(
                  item.feature
                )
              }
            >
              <span>{item.label}</span>

              <span className="guest-lock-label">
                Locked
              </span>
            </button>
          ))}
        </section>

        <div className="guest-authentication-actions">
          <button
            type="button"
            className="guest-login-button"
            onClick={goToLogin}
          >
            Log In
          </button>

          <button
            type="button"
            className="guest-signup-button"
            onClick={goToSignup}
          >
            Create Account
          </button>
        </div>
      </aside>

      <section className="guest-main-content">
        <header className="guest-unified-header">
          <div className="guest-header-copy">
            <h1>
              <span>{pageHeader.code}</span>
              {" — "}
              {pageHeader.title}
            </h1>

            <p>{pageHeader.description}</p>
          </div>

          <div className="guest-header-actions">
            <button
              type="button"
              className="guest-locked-cart"
              onClick={() =>
                openGuestRestriction(
                  "use the shopping cart"
                )
              }
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 7H6" />

                <circle
                  cx="10"
                  cy="20"
                  r="1"
                />

                <circle
                  cx="18"
                  cy="20"
                  r="1"
                />
              </svg>

              <span>LOCKED</span>
            </button>

            <div className="guest-session-badge">
              GUEST SESSION
            </div>
          </div>
        </header>

        <div className="guest-page-outlet">
          <Outlet
            context={{
              isGuest: true,
              openGuestRestriction,
            }}
          />
        </div>
      </section>

      {restrictionModal.isOpen && (
        <div
          className="guest-modal-backdrop"
          role="presentation"
          onMouseDown={
            closeGuestRestriction
          }
        >
          <section
            className="guest-restriction-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guest-restriction-title"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="guest-modal-close"
              onClick={
                closeGuestRestriction
              }
              aria-label="Close message"
            >
              ×
            </button>

            <div className="guest-modal-icon">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <rect
                  x="5"
                  y="10"
                  width="14"
                  height="10"
                  rx="2"
                />

                <path d="M8 10V7a4 4 0 0 1 8 0v3" />

                <circle
                  cx="12"
                  cy="15"
                  r="1"
                />
              </svg>
            </div>

            <p className="guest-modal-label">
              ACCOUNT REQUIRED
            </p>

            <h2 id="guest-restriction-title">
              Create an account to continue
            </h2>

            <p className="guest-modal-message">
              Guest users cannot{" "}
              {restrictionModal.feature}. Log
              in or create an account to unlock
              this feature and save your
              activity.
            </p>

            <div className="guest-modal-actions">
              <button
                type="button"
                className="guest-modal-primary"
                onClick={goToSignup}
              >
                Create Account
              </button>

              <button
                type="button"
                className="guest-modal-secondary"
                onClick={goToLogin}
              >
                Log In
              </button>
            </div>

            <button
              type="button"
              className="guest-modal-cancel"
              onClick={
                closeGuestRestriction
              }
            >
              Continue as Guest
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

export default GuestLayout;