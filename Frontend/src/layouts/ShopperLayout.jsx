
import { useEffect, useState } from "react";
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
    icon: "dashboard",
    matches: ["/shopper/dashboard"],
  },
  {
    label: "Fitting Studio",
    to: "/shopper/fitting-studio",
    icon: "shirt",
    matches: ["/shopper/fitting-studio"],
  },
  {
    label: "Avatar Presets",
    to: "/shopper/avatar-presets",
    icon: "users",
    matches: ["/shopper/avatar-presets"],
  },
  {
    label: "Catalog",
    to: "/shopper/catalog",
    icon: "shopping-bag",
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
    icon: "bookmark",
    matches: ["/shopper/saved-outfits"],
  },
  {
    label: "Orders",
    to: "/shopper/orders",
    icon: "package",
    matches: [
      "/shopper/orders",
      "/shopper/order-confirmation",
    ],
  },
  {
    label: "Account",
    to: "/shopper/account",
    icon: "user",
    matches: ["/shopper/account"],
  },
];

function SidebarIcon({ name, size = 19 }) {
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

    bookmark: (
      <path d="M6 3h12v18l-6-4-6 4V3Z" />
    ),

    package: (
      <>
        <path d="m12 2 9 5v10l-9 5-9-5V7l9-5Z" />
        <path d="m3 7 9 5 9-5" />
        <path d="M12 12v10" />
        <path d="m7.5 4.5 9 5" />
      </>
    ),

    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),

    logout: (
      <>
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M12 3h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-6" />
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

function ShopperLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [showLogoutModal, setShowLogoutModal] =
    useState(false);

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  function isCurrentPage(matches) {
    return matches.some(
      (path) =>
        pathname === path ||
        pathname.startsWith(`${path}/`)
    );
  }

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!showLogoutModal) return;

    function handleEscape(event) {
      if (event.key === "Escape") {
        setShowLogoutModal(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [showLogoutModal]);

  function handleLogout() {
    sessionStorage.removeItem("userRole");
    sessionStorage.removeItem("userEmail");
    sessionStorage.removeItem("registeredAccount");

    localStorage.removeItem(
      "fitfusion-current-user"
    );

    setShowLogoutModal(false);
    setMobileMenuOpen(false);

    navigate("/login", {
      replace: true,
    });
  }

  return (
    <div className="shopper-shell">
      {/* MOBILE SIDEBAR TOGGLE */}
      <button
        type="button"
        className="shopper-mobile-toggle"
        onClick={() =>
          setMobileMenuOpen((current) => !current)
        }
        aria-label={
          mobileMenuOpen
            ? "Close navigation menu"
            : "Open navigation menu"
        }
        aria-expanded={mobileMenuOpen}
        aria-controls="shopper-sidebar"
      >
        <SidebarIcon
          name={mobileMenuOpen ? "close" : "menu"}
          size={23}
        />
      </button>

      {/* MOBILE BACKDROP */}
      {mobileMenuOpen && (
        <div
          className="shopper-mobile-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* SHARED SIDEBAR */}
      <aside
        id="shopper-sidebar"
        className={`unified-shopper-sidebar ${
          mobileMenuOpen ? "mobile-open" : ""
        }`}
      >
        {/* LOGO */}
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

        <div className="unified-sidebar-divider" />

        {/* NAVIGATION */}
        <div className="unified-sidebar-section-heading">
          <span>MAIN MENU</span>
        </div>

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
                className={`unified-shopper-link ${
                  active ? "active" : ""
                }`}
                aria-current={
                  active ? "page" : undefined
                }
              >
                <span className="unified-shopper-link-icon">
                  <SidebarIcon
                    name={item.icon}
                    size={19}
                  />
                </span>

                <span className="unified-shopper-link-label">
                  {item.label}
                </span>

                {active && (
                  <span className="unified-shopper-active-indicator">
                    <SidebarIcon
                      name="chevron"
                      size={15}
                    />
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* BOTTOM SECTION */}
        <div className="unified-shopper-sidebar-bottom">
          <div className="unified-sidebar-divider" />

          <button
            type="button"
            className="unified-shopper-logout"
            onClick={() =>
              setShowLogoutModal(true)
            }
          >
            <span className="unified-shopper-link-icon">
              <SidebarIcon
                name="logout"
                size={19}
              />
            </span>

            <span>Logout</span>
          </button>

          <div className="unified-sidebar-footer">
            <span>FITFUSION AI</span>
            <small>Fashion meets technology</small>
          </div>
        </div>
      </aside>

      {/* EXISTING PAGE CONTENT */}
      <section className="shopper-layout-content">
        <Outlet />
      </section>

      {/* LOGOUT CONFIRMATION */}
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
              access your saved outfits, cart,
              and order history.
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
