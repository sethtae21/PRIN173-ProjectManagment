import { useState } from "react";
import {
  NavLink,
  useNavigate,
} from "react-router-dom";

import fitFusionLogo from "../assets/fitfusion-logo.svg";
import "./GuestPage.css";

function GuestPage() {
  const navigate = useNavigate();
  const [showRegisterModal, setShowRegisterModal] =
    useState(false);
  const [restrictedFeature, setRestrictedFeature] =
    useState("");

  function openRegisterModal(feature) {
    setRestrictedFeature(feature);
    setShowRegisterModal(true);
  }

  function closeRegisterModal() {
    setShowRegisterModal(false);
    setRestrictedFeature("");
  }

  function exitGuest() {
    sessionStorage.removeItem("userRole");
    navigate("/login");
  }

  return (
    <main className="guest-dashboard">
      <aside className="guest-sidebar">
        <div className="guest-logo-container">
          <img
            src={fitFusionLogo}
            alt="FitFusion AI"
            className="guest-logo"
          />
        </div>

        <nav className="guest-navigation">
          <NavLink
            to="/guest"
            end
            className={({ isActive }) =>
              isActive
                ? "guest-nav-link active"
                : "guest-nav-link"
            }
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/guest/fitting-studio"
            className={({ isActive }) =>
              isActive
                ? "guest-nav-link active"
                : "guest-nav-link"
            }
          >
            Fitting Studio
          </NavLink>

          <NavLink
            to="/guest/avatar-presets"
            className={({ isActive }) =>
              isActive
                ? "guest-nav-link active"
                : "guest-nav-link"
            }
          >
            Avatar Presets
          </NavLink>

          <NavLink
            to="/guest/catalog"
            className={({ isActive }) =>
              isActive
                ? "guest-nav-link active"
                : "guest-nav-link"
            }
          >
            Catalog
          </NavLink>

          <button
            type="button"
            className="guest-nav-link guest-locked-link"
            onClick={() =>
              openRegisterModal("Saved Outfits")
            }
          >
            Saved Outfits
            <span>Locked</span>
          </button>
        </nav>

        <div className="guest-sidebar-register">
          <strong>REGISTER TO SAVE OR BUY</strong>

          <div>
            <button
              type="button"
              onClick={() => navigate("/signup")}
            >
              Sign up
            </button>

            <span>•</span>

            <button
              type="button"
              onClick={() => navigate("/login")}
            >
              Log in
            </button>
          </div>
        </div>

        <button
          type="button"
          className="guest-exit-button"
          onClick={exitGuest}
        >
          Exit Guest
        </button>
      </aside>

      <section className="guest-content">
        <header className="guest-header">
          <div>
            <h1>07 — GUEST DASHBOARD</h1>
            <p>Temporary visualization access</p>
          </div>

          <div className="guest-header-actions">
            <button
              type="button"
              className="guest-cart-button"
              onClick={() =>
                openRegisterModal("Shopping Cart")
              }
              aria-label="Shopping cart is locked"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 7H6" />
                <circle cx="10" cy="20" r="1" />
                <circle cx="18" cy="20" r="1" />
              </svg>

              <span>LOCKED</span>
            </button>

            <div className="guest-session-badge">
              GUEST SESSION
            </div>
          </div>
        </header>

        <div className="guest-dashboard-body">
          <section className="guest-welcome">
            <p>GUEST SESSION</p>

            <h2>
              Try the core experience immediately
            </h2>

            <span>
              Your temporary progress is erased when
              this browser session ends.
            </span>
          </section>

          <section className="guest-feature-grid">
            <article className="guest-feature-card">
              <h3>AVAILABLE</h3>

              <FeatureRow
                label="Avatar creation"
                status="Available"
                onClick={() =>
                  navigate("/guest/fitting-studio")
                }
              />

              <FeatureRow
                label="Premade preset"
                status="Available"
                onClick={() =>
                  navigate("/guest/avatar-presets")
                }
              />

              <FeatureRow
                label="Catalog browsing"
                status="Available"
                onClick={() =>
                  navigate("/guest/catalog")
                }
              />

              <FeatureRow
                label="Recommendations"
                status="Available"
                onClick={() =>
                  navigate("/guest/catalog")
                }
              />
            </article>

            <article className="guest-feature-card">
              <h3>RESTRICTED</h3>

              <FeatureRow
                label="Save avatar preset"
                status="Locked"
                locked
                onClick={() =>
                  openRegisterModal(
                    "Save Avatar Preset"
                  )
                }
              />

              <FeatureRow
                label="Save outfit"
                status="Locked"
                locked
                onClick={() =>
                  openRegisterModal("Save Outfit")
                }
              />

              <FeatureRow
                label="Shopping cart"
                status="Locked"
                locked
                onClick={() =>
                  openRegisterModal("Shopping Cart")
                }
              />

              <FeatureRow
                label="Checkout and orders"
                status="Locked"
                locked
                onClick={() =>
                  openRegisterModal(
                    "Checkout and Orders"
                  )
                }
              />
            </article>

            <article className="guest-register-card">
              <p>KEEP YOUR PROGRESS</p>

              <h3>Register to save or buy</h3>

              <span>
                Create a shopper account to keep avatar
                presets, outfits, carts, and orders.
              </span>

              <div className="guest-register-actions">
                <button
                  type="button"
                  className="guest-signup-button"
                  onClick={() => navigate("/signup")}
                >
                  Sign Up
                </button>

                <button
                  type="button"
                  className="guest-login-button"
                  onClick={() => navigate("/login")}
                >
                  Log In
                </button>
              </div>
            </article>
          </section>

          <section className="guest-route-card">
            <p>GUEST USER FLOW</p>

            <h3>
              Dashboard → Avatar → Fitting Studio →
              Catalog → Register prompt
            </h3>
          </section>
        </div>
      </section>

      {showRegisterModal && (
        <div
          className="guest-modal-overlay"
          onMouseDown={closeRegisterModal}
          role="presentation"
        >
          <section
            className="guest-register-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guest-modal-title"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="guest-modal-close"
              onClick={closeRegisterModal}
              aria-label="Close popup"
            >
              ×
            </button>

            <div className="guest-modal-lock">
              <span>🔒</span>
            </div>

            <p className="guest-modal-label">
              GUEST RESTRICTION
            </p>

            <h2 id="guest-modal-title">
              Register to continue
            </h2>

            <p>
              <strong>{restrictedFeature}</strong> is
              only available to registered shoppers.
              Create an account or log in to save your
              progress and make purchases.
            </p>

            <div className="guest-modal-actions">
              <button
                type="button"
                className="guest-modal-signup"
                onClick={() => navigate("/signup")}
              >
                Create Account
              </button>

              <button
                type="button"
                className="guest-modal-login"
                onClick={() => navigate("/login")}
              >
                Log In
              </button>
            </div>

            <button
              type="button"
              className="guest-continue-button"
              onClick={closeRegisterModal}
            >
              Continue Browsing as Guest
            </button>
          </section>
        </div>
      )}
    </main>
  );
}

function FeatureRow({
  label,
  status,
  locked = false,
  onClick,
}) {
  return (
    <button
      type="button"
      className={`guest-feature-row ${
        locked ? "locked" : ""
      }`}
      onClick={onClick}
    >
      <strong>{label}</strong>

      <span>
        {locked && (
          <span
            className="guest-small-lock"
            aria-hidden="true"
          >
            🔒
          </span>
        )}

        {status}
      </span>
    </button>
  );
}

export default GuestPage;