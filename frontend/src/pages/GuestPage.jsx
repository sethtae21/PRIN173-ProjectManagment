
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./css/GuestPage.css";

/* ==========================================
   STANDARD AVATAR ASSETS
   Same PNGs used by LandingPage.jsx
========================================== */

const AVATAR_ASSETS = {
  Female: {
    front: "/Avatars/Female_Standard/Female_Standard_front.png",
    side: "/Avatars/Female_Standard/Female_Standard_side.png",
    rear: "/Avatars/Female_Standard/Female_Standard_rear.png",
  },
  Male: {
    front: "/Avatars/Male_Standard/Male_Standard_front.png",
    side: "/Avatars/Male_Standard/Male_Standard_side.png",
    rear: "/Avatars/Male_Standard/Male_Standard_rear.png",
  },
};

const AVATAR_VIEWS = [
  {
    key: "front",
    label: "Front",
    description: "Front View",
  },
  {
    key: "side",
    label: "Side",
    description: "Side View",
  },
  {
    key: "rear",
    label: "Rear",
    description: "Rear View",
  },
];

/* ==========================================
   GUEST FEATURES
========================================== */

const guestFeatures = [
  {
    number: "01",
    title: "Create an Avatar",
    description:
      "Create a temporary Male or Female avatar for your current guest session.",
    buttonLabel: "Open Fitting Studio",
    path: "/guest/fitting-studio",
  },
  {
    number: "02",
    title: "Use a Premade Preset",
    description:
      "Choose a Male or Female Standard Avatar and start fitting clothes immediately.",
    buttonLabel: "View Avatar Presets",
    path: "/guest/avatar-presets",
  },
  {
    number: "03",
    title: "Browse the Catalog",
    description:
      "Explore clothing products and view their complete product information.",
    buttonLabel: "Browse Catalog",
    path: "/guest/catalog",
  },
];

/* ==========================================
   AVATAR PREVIEW COMPONENT
========================================== */

function GuestAvatarPreview() {
  const [selectedGender, setSelectedGender] =
    useState("Female");

  const currentAvatar = AVATAR_ASSETS[selectedGender];

  return (
    <section
      className="guest-fitting-preview"
      aria-label="Standard avatar preview"
    >
      {/* PREVIEW HEADER */}

      <div className="guest-preview-header">
        <div>
          <p>FIT PREVIEW</p>
          <h2>Your virtual fitting room</h2>
        </div>

        <span className="guest-preview-badge">
          2D AVATAR
        </span>
      </div>

      {/* AVATAR GENDER SELECTION */}

      <div className="guest-avatar-selector">
        <div className="guest-avatar-selector-text">
          <p>PREMADE AVATAR</p>

          <span>
            Explore the 2D avatar from three viewing
            angles.
          </span>
        </div>

        <div
          className="guest-gender-switch"
          role="group"
          aria-label="Choose avatar gender"
        >
          {["Female", "Male"].map((gender) => (
            <button
              key={gender}
              type="button"
              className={`guest-gender-button ${
                selectedGender === gender
                  ? "active"
                  : ""
              }`}
              aria-pressed={selectedGender === gender}
              onClick={() =>
                setSelectedGender(gender)
              }
            >
              {gender}
            </button>
          ))}
        </div>
      </div>

      {/* FRONT / SIDE / REAR */}

      <div className="guest-view-grid">
        {AVATAR_VIEWS.map((view) => (
          <article
            className="guest-view-card"
            key={view.key}
          >
            <div className="guest-avatar-preview-stage">
              <img
                className="guest-avatar-preview-image"
                src={currentAvatar[view.key]}
                alt={`${selectedGender} Standard Avatar - ${view.description}`}
                loading="lazy"
              />

              <span>
                {view.label.toUpperCase()}
              </span>
            </div>

            <p>{view.description}</p>
          </article>
        ))}
      </div>

      {/* PREVIEW STATISTICS */}

      <div className="guest-preview-statistics">
        <div>
          <strong>1</strong>
          <span>Standard avatar per gender</span>
        </div>

        <div>
          <strong>3</strong>
          <span>Viewing angles</span>
        </div>

        <div>
          <strong>2D</strong>
          <span>Layered fitting</span>
        </div>
      </div>
    </section>
  );
}

/* ==========================================
   GUEST DASHBOARD
========================================== */

function GuestPage() {
  const navigate = useNavigate();

  return (
    <main className="guest-dashboard-page">
      {/* =====================================
          HERO SECTION
      ===================================== */}

      <section className="guest-dashboard-hero">
        {/* LEFT: WELCOME CONTENT */}

        <div className="guest-dashboard-hero-content">
          <p className="guest-dashboard-eyebrow">
            TEMPORARY GUEST ACCESS
          </p>

          <h1>
            Try the FitFusion experience
          </h1>

          <p className="guest-dashboard-introduction">
            Create a temporary avatar, explore our
            Male and Female Standard Avatars, and
            browse clothing products without
            creating an account.
          </p>

          <p className="guest-dashboard-notice">
            Your avatar selections and fitting
            progress are temporary and will be
            removed when your browser session ends.
          </p>

          <button
            type="button"
            className="guest-dashboard-primary-button"
            onClick={() =>
              navigate("/guest/fitting-studio")
            }
          >
            Start Fitting Session
          </button>
        </div>

        {/* RIGHT: ACTUAL STANDARD AVATARS */}

        <div className="guest-dashboard-preview-area">
          <GuestAvatarPreview />
        </div>
      </section>

      {/* =====================================
          AVAILABLE FEATURES
      ===================================== */}

      <section className="guest-dashboard-section">
        <div className="guest-section-heading">
          <div>
            <p className="guest-section-label">
              AVAILABLE TO GUESTS
            </p>

            <h2>
              Explore the core features
            </h2>
          </div>

          <p>
            No account is required for these
            temporary features.
          </p>
        </div>

        <div className="guest-feature-grid">
          {guestFeatures.map((feature) => (
            <article
              className="guest-feature-card"
              key={feature.title}
            >
              <span className="guest-feature-number">
                {feature.number}
              </span>

              <h3>{feature.title}</h3>

              <p>{feature.description}</p>

              <button
                type="button"
                className="guest-feature-button"
                onClick={() =>
                  navigate(feature.path)
                }
              >
                {feature.buttonLabel}

                <span aria-hidden="true">
                  →
                </span>
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* =====================================
          ACCOUNT REGISTRATION BANNER
      ===================================== */}

      <section className="guest-account-banner">
        <div>
          <p className="guest-section-label">
            KEEP YOUR PROGRESS
          </p>

          <h2>
            Create an account when you are ready
          </h2>

          <p>
            Register to permanently save avatar
            presets and outfits, add products to
            your cart, place mock orders, and view
            your order history.
          </p>
        </div>

        <div className="guest-account-actions">
          <button
            type="button"
            className="guest-dashboard-primary-button"
            onClick={() =>
              navigate("/signup")
            }
          >
            Create Account
          </button>

          <button
            type="button"
            className="guest-dashboard-secondary-button"
            onClick={() =>
              navigate("/login")
            }
          >
            Log In
          </button>
        </div>
      </section>
    </main>
  );
}

export default GuestPage;
