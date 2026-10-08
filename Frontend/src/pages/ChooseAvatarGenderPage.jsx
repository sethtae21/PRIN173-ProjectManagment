import { useState } from "react";
import { useNavigate } from "react-router-dom";

import "./css/ChooseAvatarGenderPage.css";

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

function ChooseAvatarGenderPage({
  isGuest = false,
}) {
  const navigate = useNavigate();

  const [selectedGender, setSelectedGender] =
    useState(() =>
      getSavedGender(isGuest)
    );

  const basePath = isGuest
    ? "/guest"
    : "/shopper";

  function saveSelectedGender(gender) {
    const normalizedGender =
      normalizeGender(gender);

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

    setSelectedGender(normalizedGender);
  }

  function handleContinue() {
    if (!selectedGender) {
      return;
    }

    /*
     * Save the current value again before
     * navigating to ensure the next page
     * receives the selected gender.
     */
    saveSelectedGender(selectedGender);

    navigate(
      `${basePath}/fitting-studio/customize`
    );
  }

  return (
    <main className="gender-page">
      <div className="gender-page-content">
        <section className="gender-introduction">
          <p>AVATAR CUSTOMIZATION</p>

          <h1>Choose your avatar</h1>

          <span>
            Select Male or Female before
            continuing to avatar customization.
          </span>
        </section>

        <section className="gender-options">
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
            <div
              className="gender-avatar-preview male"
              aria-hidden="true"
            >
              <div className="gender-avatar-hair" />
              <div className="gender-avatar-head" />
              <div className="gender-avatar-neck" />
              <div className="gender-avatar-body" />
              <div className="gender-avatar-left-arm" />
              <div className="gender-avatar-right-arm" />
              <div className="gender-avatar-left-leg" />
              <div className="gender-avatar-right-leg" />
            </div>

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
            <div
              className="gender-avatar-preview female"
              aria-hidden="true"
            >
              <div className="gender-avatar-hair" />
              <div className="gender-avatar-head" />
              <div className="gender-avatar-neck" />
              <div className="gender-avatar-body" />
              <div className="gender-avatar-left-arm" />
              <div className="gender-avatar-right-arm" />
              <div className="gender-avatar-left-leg" />
              <div className="gender-avatar-right-leg" />
            </div>

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