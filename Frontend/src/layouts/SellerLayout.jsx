import { useEffect, useState } from "react";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import fitFusionLogo from "../assets/fitfusion-logo.svg";
import { authAPI } from "../services/api";
import { clearSession } from "../services/session"; // FIX: Import canonical clearer
import "./SellerLayout.css";

const sellerNavigation = [
  {
    label: "Dashboard",
    path: "/seller/dashboard",
    icon: "dashboard",
  },
  {
    label: "Upload Catalog",
    path: "/seller/catalog-upload",
    icon: "upload",
  },
  {
    label: "Product Listings",
    path: "/seller/listings",
    icon: "products",
  },
  {
    label: "Product Validation",
    path: "/seller/report",
    icon: "validation",
  },
  {
    label: "Store Profile",
    path: "/seller/store-profile",
    icon: "store",
  },
];

function SellerIcon({ name, size = 21 }) {
  const props = {
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

  switch (name) {
    case "dashboard":
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );

    case "upload":
      return (
        <svg {...props}>
          <path d="M12 16V3" />
          <path d="m7 8 5-5 5 5" />
          <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
        </svg>
      );

    case "products":
      return (
        <svg {...props}>
          <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" />
          <path d="M3 7.5 12 12l9-4.5" />
          <path d="M12 12v9" />
        </svg>
      );

    case "validation":
      return (
        <svg {...props}>
          <path d="M12 3 20 6v5c0 5-3 8.5-8 10-5-1.5-8-5-8-10V6z" />
          <path d="m9 12 2 2 4-5" />
        </svg>
      );

    case "store":
      return (
        <svg {...props}>
          <path d="M3 10h18l-1.5-6h-15z" />
          <path d="M5 10v10h14V10" />
          <path d="M9 20v-7h6v7" />
          <path d="M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
        </svg>
      );

    case "logout":
      return (
        <svg {...props}>
          <path d="M10 17l5-5-5-5" />
          <path d="M15 12H3" />
          <path d="M12 3h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-6" />
        </svg>
      );

    case "menu":
      return (
        <svg {...props}>
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );

    case "close":
      return (
        <svg {...props}>
          <path d="M5 5l14 14M19 5 5 19" />
        </svg>
      );

    default:
      return null;
  }
}

function SellerLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] =
    useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!sidebarOpen && !logoutModalOpen) return;

    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = oldOverflow;
    };
  }, [sidebarOpen, logoutModalOpen]);

  function isNavigationActive(path) {
    const pathname = location.pathname;

    if (path === "/seller/store-profile") {
      return (
        pathname === "/seller/store-profile" ||
        pathname === "/seller/profile" ||
        pathname === "/seller/account" ||
        pathname.startsWith("/seller/account/") ||
        pathname.startsWith("/seller/store-profile/")
      );
    }

    if (path === "/seller/report") {
      return (
        pathname === "/seller/report" ||
        pathname === "/seller/validation"
      );
    }

    if (path === "/seller/catalog-upload") {
      return (
        pathname === "/seller/catalog-upload" ||
        pathname === "/seller/upload-catalog"
      );
    }

    return (
      pathname === path ||
      pathname.startsWith(`${path}/`)
    );
  }

  function closeLogoutModal() {
    setLogoutModalOpen(false);
  }

  // ✅ FIX: Proper logout sequence to prevent SWAP SUSPECT
  async function handleLogout() {
    try {
      // 1. Blacklist the refresh token on the backend
      await authAPI.logout();
    } catch (e) {
      console.warn("Logout API call failed, clearing local session anyway.", e);
    }

    // 2. Wipe in-memory mirror + canonical + ALL legacy keys atomically
    clearSession();

    sessionStorage.removeItem("userRole");
    sessionStorage.removeItem("userEmail");
    sessionStorage.removeItem("sellerAccount");
    sessionStorage.removeItem("registeredAccount");

    setLogoutModalOpen(false);
    setSidebarOpen(false);

    // 3. Force a hard reload so no stale React closures or module-level caches survive
    window.location.href = "/login";
  }

  return (
    <div className="seller-layout">
      {/* MOBILE MENU TOGGLE */}
      <button
        type="button"
        className="seller-layout-mobile-toggle"
        aria-label={
          sidebarOpen
            ? "Close seller menu"
            : "Open seller menu"
        }
        aria-expanded={sidebarOpen}
        aria-controls="seller-layout-sidebar"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <SellerIcon
          name={sidebarOpen ? "close" : "menu"}
          size={22}
        />
      </button>

      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <button
          type="button"
          className="seller-layout-overlay"
          aria-label="Close seller navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        id="seller-layout-sidebar"
        className={`seller-layout-sidebar ${
          sidebarOpen ? "open" : ""
        }`}
      >
        {/* LOGO AREA */}
        <div className="seller-layout-brand">
          <img
            src={fitFusionLogo}
            alt="FitFusion AI"
            className="seller-layout-logo"
          />
        </div>

        {/* MAIN MENU */}
        <div className="seller-layout-sidebar-section">
          <p className="seller-layout-section-label">
            MAIN MENU
          </p>

          <nav
            className="seller-layout-navigation"
            aria-label="Seller main navigation"
          >
            {sellerNavigation.map((item) => {
              const isActive =
                isNavigationActive(item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`seller-layout-nav-link ${
                    isActive ? "active" : ""
                  }`}
                  aria-current={
                    isActive ? "page" : undefined
                  }
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="seller-layout-nav-icon">
                    <SellerIcon name={item.icon} />
                  </span>

                  <span className="seller-layout-nav-text">
                    {item.label}
                  </span>

                  {isActive && (
                    <span
                      className="seller-layout-active-arrow"
                      aria-hidden="true"
                    >
                      ›
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* LOWER SIDEBAR AREA */}
        <div className="seller-layout-sidebar-bottom">
          <button
            type="button"
            className="seller-layout-logout"
            onClick={() => setLogoutModalOpen(true)}
          >
            <span className="seller-layout-nav-icon">
              <SellerIcon name="logout" />
            </span>

            <span className="seller-layout-nav-text">
              Logout
            </span>
          </button>
        </div>

        {/* FOOTER */}
        <div className="seller-layout-sidebar-footer">
          <strong>FITFUSION AI</strong>
          <span>Fashion meets technology</span>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="seller-layout-main">
        <Outlet />
      </main>

      {/* LOGOUT CONFIRMATION */}
      {logoutModalOpen && (
        <div
          className="seller-layout-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeLogoutModal();
            }
          }}
        >
          <section
            className="seller-layout-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-logout-title"
          >
            <div className="seller-layout-modal-icon">
              <SellerIcon name="logout" size={27} />
            </div>

            <p className="seller-layout-modal-eyebrow">
              ACCOUNT SESSION
            </p>

            <h2 id="seller-logout-title">
              Logout of FitFusion AI?
            </h2>

            <p className="seller-layout-modal-description">
              Are you sure you want to log out of
              your seller account? Your store
              information and product listings
              will remain saved.
            </p>

            <div className="seller-layout-modal-actions">
              <button
                type="button"
                className="seller-layout-modal-cancel"
                onClick={closeLogoutModal}
              >
                Cancel
              </button>

              <button
                type="button"
                className="seller-layout-modal-confirm"
                onClick={handleLogout}
              >
                Yes, Logout
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default SellerLayout;