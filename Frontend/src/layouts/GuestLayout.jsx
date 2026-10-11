
import { useEffect, useState } from "react";
import {
  NavLink,
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
    icon: "dashboard",
    end: true,
  },
  {
    label: "Fitting Studio",
    to: "/guest/fitting-studio",
    icon: "shirt",
  },
  {
    label: "Avatar Presets",
    to: "/guest/avatar-presets",
    icon: "users",
  },
  {
    label: "Catalog",
    to: "/guest/catalog",
    icon: "shopping-bag",
  },
];

function GuestSidebarIcon({ name, size = 19 }) {
  const commonProps = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const icons = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),

    shirt: (
      <path d="M16 3 19.5 5 22 9l-4 2-2-2v12H8V9l-2 2-4-2 2.5-4L8 3c1 1.5 2.3 2 4 2s3-.5 4-2Z" />
    ),

    users: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
        <path d="M18 4.5a3.5 3.5 0 0 1 0 7" />
        <path d="M20 15a5 5 0 0 1 2 4" />
      </>
    ),

    "shopping-bag": (
      <>
        <path d="M4 8h16l-1 13H5L4 8Z" />
        <path d="M9 9V6a3 3 0 0 1 6 0v3" />
      </>
    ),

    login: (
      <>
        <path d="m14 7 5 5-5 5" />
        <path d="M19 12H8" />
        <path d="M12 3H6a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h6" />
      </>
    ),

    "user-plus": (
      <>
        <circle cx="9" cy="8" r="4" />
        <path d="M2 21a7 7 0 0 1 14 0" />
        <path d="M19 8v8" />
        <path d="M15 12h8" />
      </>
    ),

    close: (
      <>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </>
    ),

    menu: (
      <>
        <path d="M4 6h16" />
        <path d="M4 12h16" />
        <path d="M4 18h16" />
      </>
    ),

    chevron: (
      <path d="m9 18 6-6-6-6" />
    ),
  };

  return (
    <svg {...commonProps}>
      {icons[name] || icons.dashboard}
    </svg>
  );
}

function GuestLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    function handleEscape(event) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [mobileMenuOpen]);

  function handleLogin() {
    setMobileMenuOpen(false);
    navigate("/login");
  }

  function handleSignup() {
    setMobileMenuOpen(false);
    navigate("/signup");
  }

  return (
    <div className="guest-shell">
      {/* MOBILE MENU BUTTON */}
      <button
        type="button"
        className="guest-mobile-toggle"
        onClick={() =>
          setMobileMenuOpen((current) => !current)
        }
        aria-label={
          mobileMenuOpen
            ? "Close guest navigation"
            : "Open guest navigation"
        }
        aria-expanded={mobileMenuOpen}
        aria-controls="guest-sidebar"
      >
        <GuestSidebarIcon
          name={mobileMenuOpen ? "close" : "menu"}
          size={23}
        />
      </button>

      {/* MOBILE BACKDROP */}
      {mobileMenuOpen && (
        <div
          className="guest-mobile-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* GUEST SIDEBAR */}
      <aside
        id="guest-sidebar"
        className={`guest-sidebar ${
          mobileMenuOpen ? "mobile-open" : ""
        }`}
      >
        {/* LOGO */}
        <NavLink
          to="/guest"
          className="guest-sidebar-logo"
          aria-label="Go to Guest Dashboard"
        >
          <img
            src={fitFusionLogo}
            alt="FitFusion AI"
          />
        </NavLink>

        <div className="guest-sidebar-divider" />

        {/* NAVIGATION HEADING */}
        <div className="guest-sidebar-section-heading">
          <span>MAIN MENU</span>
        </div>

        {/* NAVIGATION LINKS */}
        <nav
          className="guest-navigation"
          aria-label="Guest navigation"
        >
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `guest-navigation-link ${
                  isActive ? "active" : ""
                }`
              }
              aria-current={undefined}
            >
              {({ isActive }) => (
                <>
                  <span className="guest-navigation-icon">
                    <GuestSidebarIcon
                      name={item.icon}
                      size={19}
                    />
                  </span>

                  <span className="guest-navigation-label">
                    {item.label}
                  </span>

                  {isActive && (
                    <span className="guest-active-indicator">
                      <GuestSidebarIcon
                        name="chevron"
                        size={15}
                      />
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* AUTHENTICATION SECTION */}
        <div className="guest-sidebar-bottom">
          <div className="guest-sidebar-divider" />

          <div className="guest-sidebar-section-heading">
            <span>ACCOUNT ACCESS</span>
          </div>

          <div className="guest-authentication-actions">
            <button
              type="button"
              className="guest-login-sidebar-button"
              onClick={handleLogin}
            >
              <span className="guest-navigation-icon">
                <GuestSidebarIcon
                  name="login"
                  size={19}
                />
              </span>

              <span>Log In</span>
            </button>

            <button
              type="button"
              className="guest-signup-sidebar-button"
              onClick={handleSignup}
            >
              <span className="guest-navigation-icon">
                <GuestSidebarIcon
                  name="user-plus"
                  size={19}
                />
              </span>

              <span>Create Account</span>
            </button>
          </div>

          {/* FOOTER */}
          <div className="guest-sidebar-footer">
            <span>FITFUSION AI</span>
            <small>Fashion meets technology</small>
          </div>
        </div>
      </aside>

      {/* EXISTING PAGE CONTENT */}
      <section className="guest-layout-content">
        <Outlet />
      </section>
    </div>
  );
}

export default GuestLayout;
