
import { useNavigate } from "react-router-dom";
import "./css/ShopperDashboard.css";

/* ==========================================
   STORAGE HELPERS
========================================== */

function readStoredArray(...keys) {
  for (const key of keys) {
    try {
      const savedValue = localStorage.getItem(key);

      if (savedValue) {
        const parsedValue = JSON.parse(savedValue);

        if (Array.isArray(parsedValue)) {
          return parsedValue;
        }
      }
    } catch {
      // Continue checking other keys.
    }
  }

  return [];
}

function getCurrentShopper() {
  const possibleAccounts = [
    {
      storage: localStorage,
      key: "fitfusion-current-user",
    },
    {
      storage: sessionStorage,
      key: "registeredAccount",
    },
  ];

  for (const item of possibleAccounts) {
    try {
      const savedAccount = item.storage.getItem(item.key);

      if (savedAccount) {
        return JSON.parse(savedAccount);
      }
    } catch {
      // Continue checking other accounts.
    }
  }

  return null;
}

/* ==========================================
   SHOPPER DASHBOARD
========================================== */

function ShopperDashboard() {
  const navigate = useNavigate();
  const shopper = getCurrentShopper();

  const username =
    shopper?.username ||
    shopper?.firstName ||
    "Shopper";

  const cartItems = readStoredArray(
    "fitfusion-cart",
    "fitfusion-shopping-cart",
    "cartItems"
  );

  const savedOutfits = readStoredArray(
    "fitfusion-saved-outfits",
    "savedOutfits"
  );

  const avatarPresets = readStoredArray(
    "fitfusion-avatar-presets",
    "avatarPresets"
  );

  return (
    <main className="shopper-dashboard-page">
      {/* HEADER - MATCHES ORDER HISTORY */}
      <header className="shopper-dashboard-header">
        <div className="shopper-dashboard-top-actions">
          <button
            type="button"
            className="shopper-cart-button"
            onClick={() => navigate("/shopper/cart")}
            aria-label={`Open cart with ${cartItems.length} items`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 7H6" />
              <circle cx="10" cy="20" r="1" />
              <circle cx="18" cy="20" r="1" />
            </svg>

            <strong>{cartItems.length}</strong>
          </button>
        </div>
      </header>

      {/* DASHBOARD CONTENT */}
      <div className="shopper-dashboard-body">
        {/* WELCOME */}
        <section className="shopper-welcome">
          <p>WELCOME, {username.toUpperCase()}</p>

          <h1>Start your first fitting session</h1>

          <span>
            Choose the premade avatar or create a
            Male/Female custom avatar.
          </span>
        </section>

        {/* FITTING PROFILE CARD */}
        <section className="shopper-start-card">
          <div className="shopper-start-card-content">
            <p className="shopper-card-label">
              START HERE
            </p>

            <h2>Your fitting profile is empty</h2>

            <p>
              Use the premade avatar immediately,
              or customize height, weight, skin
              tone, and body proportions.
            </p>

            <div className="shopper-card-actions">
              <button
                type="button"
                className="shopper-primary-button"
                onClick={() =>
                  navigate("/shopper/avatar-presets")
                }
              >
                Use Premade Preset
              </button>

              <button
                type="button"
                className="shopper-secondary-button"
                onClick={() =>
                  navigate("/shopper/fitting-studio")
                }
              >
                Create Custom Avatar
              </button>
            </div>
          </div>

          <div
            className="shopper-start-decoration"
            aria-hidden="true"
          >
            <div className="shopper-avatar-symbol">
              <span className="shopper-avatar-head" />
              <span className="shopper-avatar-body" />
            </div>
          </div>
        </section>

        {/* QUICK ACTIONS */}
        <section className="shopper-quick-actions">
          <DashboardAction
            number="01"
            title="Browse Catalog"
            description="Discover clothing from different sellers."
            onClick={() =>
              navigate("/shopper/catalog")
            }
          />

          <DashboardAction
            number="02"
            title="Open Fitting Studio"
            description="Customize your avatar and try clothing."
            onClick={() =>
              navigate("/shopper/fitting-studio")
            }
          />

          <DashboardAction
            number="03"
            title="Saved Outfits"
            description="Review your saved clothing combinations."
            onClick={() =>
              navigate("/shopper/saved-outfits")
            }
          />
        </section>

        {/* ACCOUNT OVERVIEW */}
        <section className="shopper-account-status">
          <div className="shopper-status-heading">
            <div>
              <p>ACCOUNT OVERVIEW</p>
              <h2>Your FitFusion activity</h2>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate("/shopper/account")
              }
            >
              Manage Account
            </button>
          </div>

          <StatusRow
            label="Avatar presets"
            value={`${avatarPresets.length} custom • 1 premade`}
            onClick={() =>
              navigate("/shopper/avatar-presets")
            }
          />

          <StatusRow
            label="Saved outfits"
            value={
              savedOutfits.length > 0
                ? `${savedOutfits.length} saved ${
                    savedOutfits.length === 1
                      ? "outfit"
                      : "outfits"
                  }`
                : "No saved outfits"
            }
            onClick={() =>
              navigate("/shopper/saved-outfits")
            }
          />

          <StatusRow
            label="Shopping cart"
            value={
              cartItems.length > 0
                ? `${cartItems.length} ${
                    cartItems.length === 1
                      ? "item"
                      : "items"
                  }`
                : "Your cart is empty"
            }
            onClick={() =>
              navigate("/shopper/cart")
            }
          />

          <StatusRow
            label="Orders"
            value="View your order history"
            onClick={() =>
              navigate("/shopper/orders")
            }
          />
        </section>
      </div>
    </main>
  );
}

/* ==========================================
   QUICK ACTION COMPONENT
========================================== */

function DashboardAction({
  number,
  title,
  description,
  onClick,
}) {
  return (
    <button
      type="button"
      className="shopper-quick-action"
      onClick={onClick}
    >
      <span className="shopper-quick-number">
        {number}
      </span>

      <div>
        <strong>{title}</strong>
        <small>{description}</small>
      </div>

      <span
        className="shopper-action-arrow"
        aria-hidden="true"
      >
        →
      </span>
    </button>
  );
}

/* ==========================================
   ACCOUNT STATUS COMPONENT
========================================== */

function StatusRow({ label, value, onClick }) {
  return (
    <button
      type="button"
      className="shopper-status-row"
      onClick={onClick}
    >
      <strong>{label}</strong>

      <span>{value}</span>

      <span
        className="shopper-status-arrow"
        aria-hidden="true"
      >
        →
      </span>
    </button>
  );
}

export default ShopperDashboard;
