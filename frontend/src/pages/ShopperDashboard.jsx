import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AvatarCanvas from "./Shopper/AvatarCanvas";
import "./css/ShopperDashboard.css";

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

const STANDARD_IMAGES = {
  Female: {
    front: "/Avatars/Female_Standard/Female_Standard_front.png",
    rear: "/Avatars/Female_Standard/Female_Standard_rear.png",
  },
  Male: {
    front: "/Avatars/Male_Standard/Male_Standard_front.png",
    rear: "/Avatars/Male_Standard/Male_Standard_rear.png",
  },
};

const AVATAR_VIEWS = [
  { key: "front", label: "Front", description: "Front View" },
  { key: "rear", label: "Rear", description: "Rear View" },
];

const EMPTY_ITEMS = {};

/* STORAGE HELPERS */

function readStoredArray(...keys) {
  for (const key of keys) {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) continue;

      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed?.items)) return parsed.items;
      if (Array.isArray(parsed?.cartItems)) return parsed.cartItems;
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
    { storage: localStorage, key: "fitfusion-current-user" },
    { storage: sessionStorage, key: "registeredAccount" },
  ];

  for (const source of sources) {
    try {
      const saved = source.storage.getItem(source.key);
      if (!saved) continue;

      const parsed = JSON.parse(saved);

      if (parsed && typeof parsed === "object") {
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
      Number.isFinite(quantity) && quantity > 0 ? quantity : 1
    );
  }, 0);
}

/* AVATAR HELPERS */

function isValidAvatar(avatar) {
  return Boolean(
    avatar &&
    typeof avatar === "object" &&
    !Array.isArray(avatar) &&
    (
      avatar.id ||
      avatar.presetId ||
      avatar.gender ||
      avatar.height ||
      avatar.weight
    )
  );
}

function isPremadeAvatar(avatar) {
  if (!isValidAvatar(avatar)) return true;

  const id = String(avatar.id || avatar.presetId || "");

  return (
    avatar.builtIn === true ||
    avatar.isPremade === true ||
    id === "fitfusion-standard" ||
    id === "premade-default"
  );
}

function normalizeAvatar(avatar) {
  if (!isValidAvatar(avatar)) {
    return { ...STANDARD_AVATAR };
  }

  const gender =
    String(avatar.gender || "Female").trim().toLowerCase() === "male"
      ? "Male"
      : "Female";

  return {
    ...STANDARD_AVATAR,
    ...avatar,
    id: avatar.id || avatar.presetId || STANDARD_AVATAR.id,
    name: avatar.name || avatar.presetName || "Custom Avatar",
    gender,
    skinTone:
      avatar.skinTone ||
      avatar.skin_tone ||
      avatar.skinColor ||
      STANDARD_AVATAR.skinTone,
    shoulder:
      avatar.shoulder ||
      avatar.shoulderWidth ||
      STANDARD_AVATAR.shoulder,
    waist: avatar.waist || avatar.waistSize || STANDARD_AVATAR.waist,
    hip: avatar.hip || avatar.hipSize || STANDARD_AVATAR.hip,
    thigh: avatar.thigh || avatar.thighSize || STANDARD_AVATAR.thigh,
    cupSize:
      gender === "Female"
        ? avatar.cupSize || avatar.cup_size || "B"
        : null,

    // Do not inherit builtIn: true from the standard defaults.
    builtIn: isPremadeAvatar(avatar),
  };
}

function getPresetTimestamp(preset) {
  const values = [
    preset.updatedAt,
    preset.updated_at,
    preset.createdAt,
    preset.created_at,
  ];

  for (const value of values) {
    if (!value) continue;

    const timestamp = new Date(value).getTime();
    if (Number.isFinite(timestamp)) return timestamp;
  }

  return 0;
}

/* DASHBOARD DATA */

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

  const activeAvatar = readStoredObject("fitfusion-avatar-preset");

  const customPresets = storedPresets
    .filter(
      (preset) => isValidAvatar(preset) && !isPremadeAvatar(preset)
    )
    .sort((a, b) => getPresetTimestamp(b) - getPresetTimestamp(a));

  const activeCustomAvatar =
    isValidAvatar(activeAvatar) && !isPremadeAvatar(activeAvatar)
      ? activeAvatar
      : null;

  // Prefer the selected custom avatar. Otherwise use a saved custom preset.
  const customAvatar = activeCustomAvatar || customPresets[0] || null;

  const displayAvatar = customAvatar
    ? normalizeAvatar(customAvatar)
    : normalizeAvatar(activeAvatar || STANDARD_AVATAR);

  const hasActiveAvatar =
    Boolean(customAvatar) || isValidAvatar(activeAvatar);

  const activeCustomIsListed =
    activeCustomAvatar &&
    customPresets.some(
      (preset) =>
        String(preset.id || preset.presetId) ===
        String(activeCustomAvatar.id || activeCustomAvatar.presetId)
    );

  return {
    username: getShopperName(shopper),
    cartCount: getCartCount(cartItems),
    savedOutfitCount: savedOutfits.length,
    customPresetCount:
      customPresets.length +
      (activeCustomAvatar && !activeCustomIsListed ? 1 : 0),
    hasActiveAvatar,
    hasCustomAvatar: Boolean(customAvatar),
    displayAvatar,
  };
}

/* MAIN DASHBOARD */

function ShopperDashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(getDashboardData);
  const [standardGender, setStandardGender] = useState("Female");
  const [actionError, setActionError] = useState("");

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

    events.forEach((event) =>
      window.addEventListener(event, refreshDashboard)
    );

    return () => {
      events.forEach((event) =>
        window.removeEventListener(event, refreshDashboard)
      );
    };
  }, [refreshDashboard]);

  const {
    username,
    cartCount,
    savedOutfitCount,
    customPresetCount,
    hasActiveAvatar,
    hasCustomAvatar,
    displayAvatar: previewAvatar,
  } = dashboard;

  const hasStartedFitting = hasActiveAvatar || customPresetCount > 0;
  const isNewShopper = !hasStartedFitting;

  const avatarLabel = hasCustomAvatar
    ? previewAvatar.name
    : "FitFusion Standard";

  function openAvatarPresets() {
    navigate("/shopper/avatar-presets");
  }

  function openFittingStudio() {
    navigate("/shopper/fitting-studio");
  }

  function continueFitting() {
    if (hasCustomAvatar) {
      try {
        localStorage.setItem(
          "fitfusion-avatar-preset",
          JSON.stringify(previewAvatar)
        );
        localStorage.setItem(
          "fitfusion-avatar-gender",
          previewAvatar.gender
        );
        setActionError("");
        navigate("/shopper/fitting-studio/customize");
      } catch {
        setActionError("Unable to open your avatar. Please try again.");
      }
      return;
    }

    openAvatarPresets();
  }

  return (
    <main className="shopper-dashboard-page">
      <header className="shopper-dashboard-header">
        <div className="shopper-dashboard-top-actions">
          <button
            type="button"
            className="shopper-cart-button"
            onClick={() => navigate("/shopper/cart")}
            aria-label={`Open cart with ${cartCount} items`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 7H6" />
              <circle cx="10" cy="20" r="1" />
              <circle cx="18" cy="20" r="1" />
            </svg>
            <strong>{cartCount}</strong>
          </button>
        </div>
      </header>

      <div className="shopper-dashboard-body">
        <section className="shopper-welcome">
          <p>
            WELCOME{hasStartedFitting ? " BACK" : ""},{" "}
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

        <section className="shopper-start-card">
          <div className="shopper-start-card-content">
            <p className="shopper-card-label">
              {hasCustomAvatar
                ? "YOUR FITTING PROFILE"
                : "START YOUR FITTING JOURNEY"}
            </p>

            <h2>
              {hasCustomAvatar
                ? "Your avatar is ready to style"
                : "Meet your Standard Avatar"}
            </h2>

            <p>
              {hasCustomAvatar
                ? `Your fitting profile is ${previewAvatar.name}. Continue your session or manage your avatar presets.`
                : "Explore our Male and Female Standard Avatars. Use a premade avatar or create your own using height, weight, skin tone, and body proportions."}
            </p>

            <div className="shopper-active-avatar">
              <span className="shopper-active-dot" />
              <div>
                <strong>{avatarLabel}</strong>
                <small>
                  {hasCustomAvatar
                    ? "Your saved customized fitting avatar"
                    : "Premade avatar available to select"}
                </small>
              </div>
            </div>

            <div className="shopper-card-actions">
              <button
                type="button"
                className="shopper-primary-button"
                onClick={continueFitting}
              >
                {hasCustomAvatar
                  ? "Continue Fitting Session"
                  : "Use Standard Avatar"}
                <span aria-hidden="true">→</span>
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

            {actionError && (
              <p className="shopper-action-error" role="alert">
                {actionError}
              </p>
            )}
          </div>

          {/* AVATAR PREVIEW — FRONT AND REAR TOGETHER */}

          <div className="shopper-avatar-preview-panel">
            <section
              className="shopper-fitting-preview"
              aria-label={
                hasCustomAvatar
                  ? "Your customized avatar preview"
                  : "Standard avatar preview"
              }
            >
              <div className="shopper-preview-header">
                <div>
                  <p>FIT PREVIEW</p>
                  <h2>Your virtual fitting room</h2>
                </div>

                <span className="shopper-preview-badge">2D AVATAR</span>
              </div>

              <div className="shopper-avatar-selector">
                <div className="shopper-avatar-selector-text">
                  <p>
                    {hasCustomAvatar
                      ? "YOUR CUSTOM AVATAR"
                      : "PREMADE AVATAR"}
                  </p>
                  <span>
                    {hasCustomAvatar
                      ? `${previewAvatar.name} — your saved body settings and skin tone.`
                      : "Explore the 2D avatar from two viewing angles."}
                  </span>
                </div>

                {hasCustomAvatar ? (
                  <span className="shopper-custom-avatar-badge">
                    SAVED PRESET
                  </span>
                ) : (
                  <div
                    className="shopper-gender-switch"
                    role="group"
                    aria-label="Choose standard avatar gender"
                  >
                    {["Female", "Male"].map((gender) => (
                      <button
                        key={gender}
                        type="button"
                        className={
                          standardGender === gender ? "active" : ""
                        }
                        aria-pressed={standardGender === gender}
                        onClick={() => setStandardGender(gender)}
                      >
                        {gender}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="shopper-view-grid">
                {AVATAR_VIEWS.map((view) => (
                  <figure className="shopper-view-card" key={view.key}>
                    <div className="shopper-avatar-preview-stage">
                      {hasCustomAvatar ? (
                        <div className="shopper-custom-avatar-canvas">
                          <AvatarCanvas
                            avatar={previewAvatar}
                            view={view.key}
                            equippedItems={EMPTY_ITEMS}
                          />
                        </div>
                      ) : (
                        <img
                          className="shopper-standard-avatar-image"
                          src={STANDARD_IMAGES[standardGender][view.key]}
                          alt={`${standardGender} Standard Avatar - ${view.description}`}
                        />
                      )}

                      <span className="shopper-view-badge">
                        {view.label.toUpperCase()}
                      </span>
                    </div>

                    <figcaption>{view.description}</figcaption>
                  </figure>
                ))}
              </div>

              <div className="shopper-preview-statistics">
                <div>
                  <strong>{hasCustomAvatar ? "Custom" : "1"}</strong>
                  <span>
                    {hasCustomAvatar
                      ? "Your saved fitting profile"
                      : "Standard avatar per gender"}
                  </span>
                </div>

                <div>
                  <strong>2</strong>
                  <span>Viewing angles</span>
                </div>

                <div>
                  <strong>2D</strong>
                  <span>Layered fitting</span>
                </div>
              </div>
            </section>
          </div>
        </section>

        <section
          className="shopper-quick-actions"
          aria-label="Quick actions"
        >
          <DashboardAction
            number="01"
            title="Browse Catalog"
            description="Discover clothing from different sellers."
            onClick={() => navigate("/shopper/catalog")}
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
                    savedOutfitCount === 1 ? "outfit" : "outfits"
                  }`
                : "Review your saved clothing combinations."
            }
            onClick={() => navigate("/shopper/saved-outfits")}
          />
        </section>

        <section className="shopper-account-status">
          <div className="shopper-status-heading">
            <div>
              <p>ACCOUNT OVERVIEW</p>
              <h2>Your FitFusion activity</h2>
            </div>

            <button
              type="button"
              onClick={() => navigate("/shopper/account")}
            >
              Manage Account
            </button>
          </div>

          <div className="shopper-stats-grid">
            <StatCard
              number={customPresetCount + 1}
              label="Total Avatar Presets"
            />
            <StatCard number={savedOutfitCount} label="Saved Outfits" />
            <StatCard number={cartCount} label="Cart Items" />
          </div>

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
              value={hasActiveAvatar ? avatarLabel : "Not selected yet"}
              onClick={openAvatarPresets}
            />
            <StatusRow
              label="Saved outfits"
              value={
                savedOutfitCount > 0
                  ? `${savedOutfitCount} saved ${
                      savedOutfitCount === 1 ? "outfit" : "outfits"
                    }`
                  : "No saved outfits"
              }
              onClick={() => navigate("/shopper/saved-outfits")}
            />
            <StatusRow
              label="Shopping cart"
              value={
                cartCount > 0
                  ? `${cartCount} ${cartCount === 1 ? "item" : "items"}`
                  : "Your cart is empty"
              }
              onClick={() => navigate("/shopper/cart")}
            />
            <StatusRow
              label="Orders"
              value="View your order history"
              onClick={() => navigate("/shopper/orders")}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function DashboardAction({ number, title, description, onClick }) {
  return (
    <button
      type="button"
      className="shopper-quick-action"
      onClick={onClick}
    >
      <span className="shopper-quick-number">{number}</span>
      <div>
        <strong>{title}</strong>
        <small>{description}</small>
      </div>
      <span className="shopper-action-arrow" aria-hidden="true">→</span>
    </button>
  );
}

function StatCard({ number, label }) {
  return (
    <div className="shopper-stat-card">
      <strong>{number}</strong>
      <span>{label}</span>
    </div>
  );
}

function StatusRow({ label, value, onClick }) {
  return (
    <button
      type="button"
      className="shopper-status-row"
      onClick={onClick}
    >
      <strong>{label}</strong>
      <span>{value}</span>
      <span className="shopper-status-arrow" aria-hidden="true">→</span>
    </button>
  );
}

export default ShopperDashboard;