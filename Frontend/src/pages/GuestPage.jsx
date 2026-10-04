import {
  useNavigate,
  useOutletContext,
} from "react-router-dom";

import "./css/GuestPage.css";

function GuestPage() {
  const navigate = useNavigate();

  const guestContext =
    useOutletContext();

  function openRestriction(feature) {
    if (
      guestContext?.openGuestRestriction
    ) {
      guestContext.openGuestRestriction(
        feature
      );
    }
  }

  return (
    <main className="guest-home-page">
      <header className="guest-home-header">
        <div>
          <h1>
            07 — GUEST DASHBOARD
          </h1>

          <p>
            Temporary visualization access
          </p>
        </div>

        <div className="guest-home-header-actions">
          <button
            type="button"
            className="guest-home-cart-button"
            onClick={() =>
              openRestriction(
                "use the shopping cart"
              )
            }
            aria-label="Shopping cart is locked"
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

          <div className="guest-home-session-badge">
            GUEST SESSION
          </div>
        </div>
      </header>

      <div className="guest-home-body">
        <section className="guest-home-welcome">
          <p>GUEST SESSION</p>

          <h2>
            Try the core experience
            immediately
          </h2>

          <span>
            Your temporary progress is
            erased when this browser
            session ends.
          </span>
        </section>

        <section className="guest-home-feature-grid">
          {/* Available features */}

          <article className="guest-home-feature-card">
            <h3>AVAILABLE</h3>

            <FeatureRow
              label="Avatar creation"
              status="Available"
              onClick={() =>
                navigate(
                  "/guest/fitting-studio"
                )
              }
            />

            <FeatureRow
              label="Premade preset"
              status="Available"
              onClick={() =>
                navigate(
                  "/guest/avatar-presets"
                )
              }
            />

            <FeatureRow
              label="Catalog browsing"
              status="Available"
              onClick={() =>
                navigate(
                  "/guest/catalog"
                )
              }
            />

            <FeatureRow
              label="Recommendations"
              status="Available"
              onClick={() =>
                navigate(
                  "/guest/catalog"
                )
              }
            />
          </article>

          {/* Restricted features */}

          <article className="guest-home-feature-card">
            <h3>RESTRICTED</h3>

            <FeatureRow
              label="Save avatar preset"
              status="Locked"
              locked
              onClick={() =>
                openRestriction(
                  "save avatar presets"
                )
              }
            />

            <FeatureRow
              label="Save outfit"
              status="Locked"
              locked
              onClick={() =>
                openRestriction(
                  "save outfits"
                )
              }
            />

            <FeatureRow
              label="Shopping cart"
              status="Locked"
              locked
              onClick={() =>
                openRestriction(
                  "add products to the shopping cart"
                )
              }
            />

            <FeatureRow
              label="Checkout and orders"
              status="Locked"
              locked
              onClick={() =>
                openRestriction(
                  "check out and place orders"
                )
              }
            />
          </article>

          {/* Registration prompt */}

          <article className="guest-home-register-card">
            <p>
              KEEP YOUR PROGRESS
            </p>

            <h3>
              Register to save or buy
            </h3>

            <span>
              Create a shopper account to
              keep avatar presets, outfits,
              carts, and orders.
            </span>

            <div className="guest-home-register-actions">
              <button
                type="button"
                className="guest-home-signup-button"
                onClick={() =>
                  navigate("/signup")
                }
              >
                Sign Up
              </button>

              <button
                type="button"
                className="guest-home-login-button"
                onClick={() =>
                  navigate("/login")
                }
              >
                Log In
              </button>
            </div>
          </article>
        </section>

        <section className="guest-home-route-card">
          <p>GUEST USER FLOW</p>

          <h3>
            Dashboard → Avatar → Fitting
            Studio → Catalog → Register
            Prompt
          </h3>
        </section>
      </div>
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
      className={`guest-home-feature-row ${
        locked ? "locked" : ""
      }`}
      onClick={onClick}
    >
      <strong>{label}</strong>

      <span>
        {locked && (
          <span
            className="guest-home-small-lock"
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