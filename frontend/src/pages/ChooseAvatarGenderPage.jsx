import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  imageToCanvas,
  detectBodyBounds,
  tintBody,
} from "./Shopper/canvasWarp2D";

import "./css/ChooseAvatarGenderPage.css";

const PREVIEW_WIDTH = 480;
const PREVIEW_HEIGHT = 660;

const STUDIO_SESSION_PREFIX = "fitfusion-fitting-studio-session-";

const AVATAR_IMAGES = {
  Male: "/Avatars/Male_Standard/Male_Standard_front.png",
  Female: "/Avatars/Female_Standard/Female_Standard_front.png",
};


// ==========================================
// GENDER HELPERS
// ==========================================

function normalizeGender(value) {
  if (
    typeof value === "string" &&
    value.toLowerCase() === "male"
  ) {
    return "Male";
  }

  if (
    typeof value === "string" &&
    value.toLowerCase() === "female"
  ) {
    return "Female";
  }

  return "";
}

function getSavedGender(isGuest) {
  const storage = isGuest
    ? sessionStorage
    : localStorage;

  const genderKey = isGuest
    ? "fitfusion-guest-avatar-gender"
    : "fitfusion-avatar-gender";

  return normalizeGender(
    storage.getItem(genderKey)
  );
}

// ==========================================
// FIX (female -> male redirect bug):
// keep the cached Fitting Studio session in
// sync with the gender chosen here, so the
// customize page never resurrects a stale
// avatar of the opposite gender.
// ==========================================

function syncStudioSessionGender(isGuest, gender) {
  const key = `${STUDIO_SESSION_PREFIX}${isGuest ? "guest" : "shopper"}`;

  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return;

    const session = JSON.parse(raw);

    if (!session || typeof session !== "object" || !session.avatar) {
      return;
    }

    session.avatar.gender = gender;
    session.avatar.cupSize =
      gender === "Female"
        ? session.avatar.cupSize || "B"
        : null;

    sessionStorage.setItem(key, JSON.stringify(session));
  } catch (error) {
    console.warn(
      "Unable to sync fitting studio session gender:",
      error
    );
  }
}

// ==========================================
// ACTUAL BLENDER AVATAR PREVIEW
// ==========================================

function AvatarPreview({ gender }) {
  const canvasRef = useRef(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    let cancelled = false;

    const image = new Image();

    setError(false);

    image.onload = () => {
      if (cancelled) return;

      try {
        canvas.width = PREVIEW_WIDTH;
        canvas.height = PREVIEW_HEIGHT;

        ctx.clearRect(
          0,
          0,
          PREVIEW_WIDTH,
          PREVIEW_HEIGHT
        );

        // Prepare a smaller copy of the Blender PNG.
        const source = imageToCanvas(
          image,
          360,
          720
        );

        const bounds = detectBodyBounds(source);

        if (!bounds) {
          setError(true);
          return;
        }

        // Apply the same default skin tone used
        // in the actual Fitting Studio.
        const tinted = tintBody(
          source,
          "#dca77d",
          "Neutral"
        );

        const paddingX = 30;
        const paddingY = 20;

        const availableWidth =
          PREVIEW_WIDTH - paddingX * 2;

        const availableHeight =
          PREVIEW_HEIGHT - paddingY * 2;

        // Crop the transparent empty space so
        // both avatars appear at a similar size.
        const scale = Math.min(
          availableWidth / bounds.width,
          availableHeight / bounds.height
        );

        const drawWidth = bounds.width * scale;
        const drawHeight = bounds.height * scale;

        const drawX =
          (PREVIEW_WIDTH - drawWidth) / 2;

        const drawY =
          PREVIEW_HEIGHT -
          paddingY -
          drawHeight;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        ctx.drawImage(
          tinted,
          bounds.left,
          bounds.top,
          bounds.width,
          bounds.height,
          drawX,
          drawY,
          drawWidth,
          drawHeight
        );
      } catch (err) {
        console.error(
          "Avatar preview error:",
          err
        );

        if (!cancelled) {
          setError(true);
        }
      }
    };

    image.onerror = () => {
      if (!cancelled) {
        setError(true);
      }
    };

    image.src = AVATAR_IMAGES[gender];

    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
    };
  }, [gender]);

  return (
    <div
      className={`gender-avatar-preview rendered ${gender.toLowerCase()}`}
      aria-hidden="true"
    >
      <div className="gender-avatar-preview-glow" />

      <canvas
        ref={canvasRef}
        className="gender-avatar-canvas"
        width={PREVIEW_WIDTH}
        height={PREVIEW_HEIGHT}
      />

      {error && (
        <span className="gender-avatar-error">
          Avatar preview unavailable
        </span>
      )}
    </div>
  );
}

// ==========================================
// MAIN PAGE
// ==========================================

function ChooseAvatarGenderPage({
  isGuest = false,
}) {
  const navigate = useNavigate();

  const [selectedGender, setSelectedGender] =
    useState(() => getSavedGender(isGuest));

  const basePath = isGuest
    ? "/guest"
    : "/shopper";

  // ========================================
  // SAVE SELECTED GENDER
  // ========================================

  function saveSelectedGender(gender) {
    const normalizedGender =
      normalizeGender(gender);

    if (!normalizedGender) return;

    const storage = isGuest
      ? sessionStorage
      : localStorage;

    const genderKey = isGuest
      ? "fitfusion-guest-avatar-gender"
      : "fitfusion-avatar-gender";

    storage.setItem(
      genderKey,
      normalizedGender
    );

    // FIX: also patch any cached studio session
    // so the customize page opens with THIS gender.
    syncStudioSessionGender(
      isGuest,
      normalizedGender
    );

    setSelectedGender(normalizedGender);
  }

  // ========================================
  // CONTINUE TO FITTING STUDIO
  // ========================================

  function handleContinue() {
    if (!selectedGender) return;

    saveSelectedGender(selectedGender);

    navigate(
      `${basePath}/fitting-studio/customize`
    );
  }

  return (
    <main className="gender-page">
      <div className="gender-page-content">

        {/* PAGE HEADING */}

        <section className="gender-introduction">
          <p>AVATAR CUSTOMIZATION</p>

          <h1>Choose your avatar</h1>

          <span>
            Select Male or Female before
            continuing to avatar customization.
          </span>
        </section>

        {/* GENDER SELECTION CARDS */}

        <section className="gender-options">

          {/* MALE AVATAR */}

          <button
            type="button"
            className={`gender-card ${
              selectedGender === "Male"
                ? "selected"
                : ""
            }`}
            onClick={() =>
              saveSelectedGender("Male")
            }
            aria-pressed={
              selectedGender === "Male"
            }
          >
            <AvatarPreview gender="Male" />

            <div className="gender-card-information">
              <p>MALE AVATAR</p>

              <h2>Male</h2>

              <span>
                Customize height, weight,
                shoulder width, waist, hips,
                thighs, and skin tone.
              </span>
            </div>

            <div className="gender-selection-indicator">
              {selectedGender === "Male"
                ? "Selected"
                : "Select Male"}
            </div>
          </button>

          {/* FEMALE AVATAR */}

          <button
            type="button"
            className={`gender-card ${
              selectedGender === "Female"
                ? "selected"
                : ""
            }`}
            onClick={() =>
              saveSelectedGender("Female")
            }
            aria-pressed={
              selectedGender === "Female"
            }
          >
            <AvatarPreview gender="Female" />

            <div className="gender-card-information">
              <p>FEMALE AVATAR</p>

              <h2>Female</h2>

              <span>
                Customize height, weight,
                shoulder width, waist, hips,
                cup size, thighs, and skin tone.
              </span>
            </div>

            <div className="gender-selection-indicator">
              {selectedGender === "Female"
                ? "Selected"
                : "Select Female"}
            </div>
          </button>
        </section>

        {/* PAGE ACTIONS */}

        <section className="gender-actions">
          <button
            type="button"
            className="gender-secondary-button"
            onClick={() =>
              navigate(
                `${basePath}/avatar-presets`
              )
            }
          >
            View Premade Avatar
          </button>

          <button
            type="button"
            className="gender-primary-button"
            disabled={!selectedGender}
            onClick={handleContinue}
          >
            {selectedGender
              ? `Continue with ${selectedGender}`
              : "Select a Gender First"}
          </button>
        </section>
      </div>
    </main>
  );
}

export default ChooseAvatarGenderPage;