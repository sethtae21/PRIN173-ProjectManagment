
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AvatarCanvas from "./Shopper/AvatarCanvas";
import "./css/ShopperDashboard.css";

/* ==========================================
   FITFUSION AI - SHOPPER DASHBOARD
========================================== */

const STANDARD_AVATAR = {
  id: "fitfusion-standard",
  name: "FitFusion Standard",
  gender: "Female",
  height: 165,
  weight: 58,
  skinTone: "#d9aa82",
  undertone: "Neutral",
  shoulder: "Balanced",
  waist: "Regular",
  hip: "Balanced",
  thigh: "Regular",
  cupSize: "B",
  bodyType: "Balanced",
  builtIn: true,
};

const AVATAR_VIEWS = ["front", "side", "rear"];

/* ==========================================
   STORAGE HELPERS
========================================== */

function readStoredArray(...keys) {
  for (const key of keys) {
    try {
      const saved = localStorage.getItem(key);

      if (!saved) continue;

      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        return parsed;
      }

      if (parsed && typeof parsed === "object") {
        if (Array.isArray(parsed.items)) {
          return parsed.items;
        }

        if (Array.isArray(parsed.cartItems)) {
          return parsed.cartItems;
        }
      }
    } catch {
      // Try the next storage key.
    }
  }

  return [];
}

function readStoredObject(...keys) {
  for (const key of keys) {
    try {
      const saved = localStorage.getItem(key);

      if (!saved) continue;

      const parsed = JSON.parse(saved);

      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      ) {
        return parsed;
      }
    } catch {
      // Try the next storage key.
    }
  }

  return null;
}

function getCurrentShopper() {
  const sources = [
    {
      storage: localStorage,
      key: "fitfusion-current-user",
    },
    {
      storage: sessionStorage,
      key: "registeredAccount",
    },
  ];

  for (const source of sources) {
    try {
      const saved = source.storage.getItem(source.key);

      if (!saved) continue;

      const parsed = JSON.parse(saved);

      if (
        parsed &&
        typeof parsed === "object"
      ) {
        return parsed;
      }
    } catch {
      // Try the next source.
    }
  }

  return null;
}

function getShopperName(shopper) {
  const name =
    shopper?.full_name ||
    shopper?.fullName ||
    shopper?.username ||
    shopper?.firstName ||
    shopper?.first_name ||
    "Shopper";

  return String(name).trim() || "Shopper";
}

function getCartCount(items) {
  return items.reduce((total, item) => {
    const quantity = Number(item?.quantity ?? 1);

    return total + (
      Number.isFinite(quantity) && quantity > 0
        ? quantity
        : 1
    );
  }, 0);
}

/* ==========================================
   AVATAR HELPERS
========================================== */

function isValidAvatar(avatar) {
  if (
    !avatar ||
    typeof avatar !== "object" ||
    Array.isArray(avatar)
  ) {
    return false;
  }

  return Boolean(
    avatar.id ||
    avatar.presetId ||
    avatar.gender ||
    avatar.height ||
    avatar.weight
  );
}

function normalizeAvatar(avatar) {
  if (!isValidAvatar(avatar)) {
    return { ...STANDARD_AVATAR };
  }

  return {
    ...STANDARD_AVATAR,
    ...avatar,

    id:
      avatar.id ||
      avatar.presetId ||
      STANDARD_AVATAR.id,

    name:
      avatar.name ||
      avatar.presetName ||
      STANDARD_AVATAR.name,

    gender:
      avatar.gender ||
      STANDARD_AVATAR.gender,

    skinTone:
      avatar.skinTone ||
      avatar.skinColor ||
      STANDARD_AVATAR.skinTone,
  };
}

/* ==========================================
   DASHBOARD DATA
========================================== */

function getDashboardData() {
  const shopper = getCurrentShopper();

  const cartItems = readStoredArray(
    "fitfusion-cart",
    "fitfusion-cart-items",
    "fitfusion-shopping-cart",
    "cartItems"
  );

  const savedOutfits = readStoredArray(
    "fitfusion-saved-outfits",
    "savedOutfits"
  );

  const storedPresets = readStoredArray(
    "fitfusion-avatar-presets",
    "avatarPresets"
  );

  const activeAvatar = readStoredObject(
    "fitfusion-avatar-preset"
  );

  const customPresets = storedPresets.filter(
    (preset) =>
      preset &&
      typeof preset === "object" &&
      !preset.builtIn &&
      !preset.isPremade &&
      String(preset.id || preset.presetId) !==
        STANDARD_AVATAR.id
  );

  const hasActiveAvatar = isValidAvatar(activeAvatar);

  const displayAvatar = hasActiveAvatar
    ? normalizeAvatar(activeAvatar)
    : { ...STANDARD_AVATAR };

  return {
    username: getShopperName(shopper),
    cartCount: getCartCount(cartItems),
    savedOutfitCount: savedOutfits.length,
    customPresetCount: customPresets.length,
    hasActiveAvatar,
    displayAvatar,
  };
}

/* ==========================================
   MAIN DASHBOARD
========================================== */

function ShopperDashboard() {
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(
    getDashboardData
  );

  const [avatarView, setAvatarView] = useState("front");

  const refreshDashboard = useCallback(() => {
    setDashboard(getDashboardData());
  }, []);

  useEffect(() => {
    refreshDashboard();

    const events = [
      "focus",
      "storage",
      "pageshow",
      "fitfusion-avatar-updated",
      "fitfusion-outfits-updated",
      "fitfusion-cart-updated",
    ];

    events.forEach((event) => {
      window.addEventListener(event, refreshDashboard);
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(
          event,
          refreshDashboard
        );
      });
    };
  }, [refreshDashboard]);

  const {
    username,
    cartCount,
    savedOutfitCount,
    customPresetCount,
    hasActiveAvatar,
    displayAvatar,
  } = dashboard;

  const hasCustomPresets = customPresetCount > 0;

  const hasStartedFitting =
    hasActiveAvatar || hasCustomPresets;

  const isNewShopper = !hasStartedFitting;

  const previewAvatar = useMemo(
    () => normalizeAvatar(displayAvatar),
    [displayAvatar]
  );

  const equippedItems = useMemo(() => ({}), []);

  const isStandardAvatar =
    !hasActiveAvatar ||
    Boolean(previewAvatar.builtIn);

  const avatarLabel = isStandardAvatar
    ? "FitFusion Standard"
    : previewAvatar.name;

  function openAvatarPresets() {
    navigate("/shopper/avatar-presets");
  }

  function openFittingStudio() {
    navigate("/shopper/fitting-studio");
  }

  function continueFitting() {
    if (hasActiveAvatar) {
      navigate("/shopper/fitting-studio/customize");
      return;
    }

    openAvatarPresets();
  }

  return (
    <main className="shopper-dashboard-page">

      {/* ======================================
          HEADER
      ====================================== */}

      <header className="shopper-dashboard-header">
        <div className="shopper-dashboard-top-actions">
          <button
            type="button"
            className="shopper-cart-button"
            onClick={() => navigate("/shopper/cart")}
            aria-label={`Open cart with ${cartCount} items`}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 7H6" />
              <circle cx="10" cy="20" r="1" />
              <circle cx="18" cy="20" r="1" />
            </svg>

            <strong>{cartCount}</strong>
          </button>
        </div>
      </header>

      {/* ======================================
          DASHBOARD CONTENT
      ====================================== */}

      <div className="shopper-dashboard-body">

        {/* WELCOME */}

        <section className="shopper-welcome">
          <p>
            WELCOME{hasStartedFitting ? " BACK" : ""},
            {" "}
            {username.toUpperCase()}
          </p>

          <h1>
            {isNewShopper
              ? "Start your first fitting session"
              : "Ready to style your next look?"}
          </h1>

          <span>
            {isNewShopper
              ? "Begin with the FitFusion Standard Avatar or create your own customized fitting profile."
              : "Continue your fitting session, discover new clothing, and manage your saved looks."}
          </span>
        </section>

        {/* ======================================
            MAIN FITTING CARD
        ====================================== */}

        <section className="shopper-start-card">

          {/* LEFT CONTENT */}

          <div className="shopper-start-card-content">
            <p className="shopper-card-label">
              {isNewShopper
                ? "START YOUR FITTING JOURNEY"
                : "YOUR FITTING PROFILE"}
            </p>

            <h2>
              {isNewShopper
                ? "Meet your Standard Avatar"
                : hasActiveAvatar
                ? "Your avatar is ready to style"
                : "Choose your fitting avatar"}
            </h2>

            <p>
              {isNewShopper
                ? "FitFusion includes one premade average-body avatar. You can use it immediately or customize your own avatar using height, weight, skin tone, and body proportions."
                : hasActiveAvatar
                ? `Your active fitting profile is ${previewAvatar.name}. Continue your session or manage your avatar presets.`
                : "You have saved avatar presets. Select one to begin fitting, or use the Standard Avatar."}
            </p>

            {/* AVATAR INFORMATION */}

            <div className="shopper-active-avatar">
              <span className="shopper-active-dot" />

              <div>
                <strong>
                  {avatarLabel}
                </strong>

                <small>
                  {hasActiveAvatar
                    ? "Currently selected fitting avatar"
                    : "Premade avatar available to select"}
                </small>
              </div>
            </div>

            {/* ACTIONS */}

            <div className="shopper-card-actions">
              <button
                type="button"
                className="shopper-primary-button"
                onClick={continueFitting}
              >
                {hasActiveAvatar
                  ? "Continue Fitting Session"
                  : "Use Standard Avatar"}

                <span aria-hidden="true">
                  →
                </span>
              </button>

              <button
                type="button"
                className="shopper-secondary-button"
                onClick={() =>
                  navigate(
                    hasStartedFitting
                      ? "/shopper/avatar-presets"
                      : "/shopper/fitting-studio"
                  )
                }
              >
                {hasStartedFitting
                  ? "Manage Avatar Presets"
                  : "Create Custom Avatar"}
              </button>
            </div>
          </div>

          {/* ======================================
              REAL 2D AVATAR PREVIEW
          ====================================== */}

          <div className="shopper-avatar-preview-panel">
            <div className="shopper-avatar-preview-top">
              <span>2D AVATAR PREVIEW</span>

              <strong>
                {hasActiveAvatar
                  ? "SELECTED"
                  : "STANDARD"}
              </strong>
            </div>

            <div className="shopper-avatar-preview-stage">
              <AvatarCanvas
                avatar={previewAvatar}
                view={avatarView}
                equippedItems={equippedItems}
              />
            </div>

            <div className="shopper-avatar-view-controls">
              {AVATAR_VIEWS.map((view) => (
                <button
                  key={view}
                  type="button"
                  className={
                    avatarView === view
                      ? "active"
                      : ""
                  }
                  aria-pressed={avatarView === view}
                  onClick={() => setAvatarView(view)}
                >
                  {view.charAt(0).toUpperCase() +
                    view.slice(1)}
                </button>
              ))}
            </div>

            <div className="shopper-avatar-preview-details">
              <strong>{avatarLabel}</strong>

              <span>
                {previewAvatar.gender} ·{" "}
                {previewAvatar.height} cm ·{" "}
                {previewAvatar.weight} kg
              </span>

              <small>
                {isStandardAvatar
                  ? "Average / Standard body profile"
                  : "Custom fitting profile"}
              </small>
            </div>
          </div>
        </section>

        {/* ======================================
            QUICK ACTIONS
        ====================================== */}

        <section
          className="shopper-quick-actions"
          aria-label="Quick actions"
        >
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
            title="Fitting Studio"
            description="Customize your avatar and try clothing."
            onClick={openFittingStudio}
          />

          <DashboardAction
            number="03"
            title="Saved Outfits"
            description={
              savedOutfitCount > 0
                ? `${savedOutfitCount} saved ${
                    savedOutfitCount === 1
                      ? "outfit"
                      : "outfits"
                  }`
                : "Review your saved clothing combinations."
            }
            onClick={() =>
              navigate("/shopper/saved-outfits")
            }
          />
        </section>

        {/* ======================================
            ACCOUNT OVERVIEW
        ====================================== */}

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

          {/* STATISTICS */}

          <div className="shopper-stats-grid">
            <StatCard
              number={customPresetCount + 1}
              label="Total Avatar Presets"
            />

            <StatCard
              number={savedOutfitCount}
              label="Saved Outfits"
            />

            <StatCard
              number={cartCount}
              label="Cart Items"
            />
          </div>

          {/* ACCOUNT STATUS */}

          <div className="shopper-status-list">
            <StatusRow
              label="Avatar presets"
              value={`${customPresetCount} custom · 1 standard`}
              onClick={openAvatarPresets}
            />

            <StatusRow
              label="Standard avatar"
              value="FitFusion Standard · Available"
              onClick={openAvatarPresets}
            />

            <StatusRow
              label="Active fitting profile"
              value={
                hasActiveAvatar
                  ? previewAvatar.name
                  : "Not selected yet"
              }
              onClick={openAvatarPresets}
            />

            <StatusRow
              label="Saved outfits"
              value={
                savedOutfitCount > 0
                  ? `${savedOutfitCount} saved ${
                      savedOutfitCount === 1
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
                cartCount > 0
                  ? `${cartCount} ${
                      cartCount === 1
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
          </div>
        </section>
      </div>
    </main>
  );
}

/* ==========================================
   QUICK ACTION
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
   STAT CARD
========================================== */

function StatCard({ number, label }) {
  return (
    <div className="shopper-stat-card">
      <strong>{number}</strong>
      <span>{label}</span>
    </div>
  );
}

/* ==========================================
   STATUS ROW
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
