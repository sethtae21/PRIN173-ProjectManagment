
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./css/FittingStudioPage.css";

const SKIN_TONES = [
  { name: "Light", value: "#f1c9a5" },
  { name: "Warm", value: "#dca77d" },
  { name: "Medium", value: "#bd8058" },
  { name: "Deep", value: "#855338" },
];

const RECOMMENDED_ITEMS = [
  {
    id: "linen-shirt",
    name: "Linen Shirt",
    store: "Aurelia Studio",
    category: "top",
    color: "Beige",
    size: "M",
    price: 750,
  },
  {
    id: "straight-pants",
    name: "Straight Pants",
    store: "Noir & Thread",
    category: "bottom",
    color: "Charcoal",
    size: "M",
    price: 1100,
  },
  {
    id: "everyday-shoes",
    name: "Everyday Shoes",
    store: "Maison Sol",
    category: "shoes",
    color: "White",
    size: "7",
    price: 1500,
  },
];

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(amount);
}

function readStoredArray(key) {
  try {
    const value = JSON.parse(
      localStorage.getItem(key) || "[]"
    );

    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function normalizeGender(value) {
  return String(value).toLowerCase() === "male"
    ? "Male"
    : "Female";
}

function loadAvatar(isGuest) {
  const storage = isGuest
    ? sessionStorage
    : localStorage;

  const genderKey = isGuest
    ? "fitfusion-guest-avatar-gender"
    : "fitfusion-avatar-gender";

  let savedPreset = null;

  if (!isGuest) {
    try {
      savedPreset = JSON.parse(
        localStorage.getItem(
          "fitfusion-avatar-preset"
        ) || "null"
      );
    } catch {
      savedPreset = null;
    }
  }

  return {
    gender: normalizeGender(
      storage.getItem(genderKey) ||
        savedPreset?.gender ||
        "Female"
    ),
    height: savedPreset?.height || "160",
    weight: savedPreset?.weight || "55",
    shoulder: savedPreset?.shoulder || "Average",
    waist: savedPreset?.waist || "Average",
    hip: savedPreset?.hip || "Average",
    cupSize: savedPreset?.cupSize || "B",
    thigh: savedPreset?.thigh || "Average",
    skinTone: savedPreset?.skinTone || "#dca77d",
  };
}

function ControlGroup({
  label,
  value,
  options,
  onChange,
}) {
  return (
    <div className="studio-control-group">
      <span>{label}</span>

      <div>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={
              value === option ? "active" : ""
            }
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function FittingStudioPage({ isGuest = false }) {
  const navigate = useNavigate();

  const [avatar, setAvatar] = useState(() =>
    loadAvatar(isGuest)
  );

  const [currentView, setCurrentView] =
    useState("Front");

  const [activePanel, setActivePanel] =
    useState("customize");

  const [equippedItems, setEquippedItems] =
    useState({
      top: null,
      bottom: null,
      shoes: null,
    });

  const [
    showRegistrationModal,
    setShowRegistrationModal,
  ] = useState(false);

  const [
    showSaveOutfitModal,
    setShowSaveOutfitModal,
  ] = useState(false);

  const [outfitName, setOutfitName] =
    useState("");

  const [outfitNameError, setOutfitNameError] =
    useState("");

  const [notification, setNotification] =
    useState("");

  const equippedItemsArray = useMemo(
    () =>
      Object.values(equippedItems).filter(
        Boolean
      ),
    [equippedItems]
  );

  const basePath = isGuest
    ? "/guest"
    : "/shopper";

  const isFemale =
    avatar.gender.toLowerCase() === "female";

  const avatarClassName = [
    "studio-avatar",
    avatar.gender.toLowerCase(),
    currentView.toLowerCase(),
    `shoulder-${avatar.shoulder.toLowerCase()}`,
    `waist-${avatar.waist.toLowerCase()}`,
    `hip-${avatar.hip.toLowerCase()}`,
    `thigh-${avatar.thigh.toLowerCase()}`,
  ].join(" ");

  function updateAvatar(field, value) {
    setAvatar((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function displayNotification(message) {
    setNotification(message);

    window.setTimeout(() => {
      setNotification("");
    }, 2500);
  }

  function openRegistrationPopup() {
    setShowRegistrationModal(true);
  }

  function handleSavePreset() {
    if (isGuest) {
      openRegistrationPopup();
      return;
    }

    const savedPresets = readStoredArray(
      "fitfusion-avatar-presets"
    );

    const newPreset = {
      id: `avatar-${Date.now()}`,
      name: `${avatar.gender} Avatar ${
        savedPresets.length + 1
      }`,
      ...avatar,
      cupSize: isFemale
        ? avatar.cupSize
        : null,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(
      "fitfusion-avatar-presets",
      JSON.stringify([
        newPreset,
        ...savedPresets,
      ])
    );

    localStorage.setItem(
      "fitfusion-avatar-preset",
      JSON.stringify(newPreset)
    );

    localStorage.setItem(
      "fitfusion-avatar-gender",
      avatar.gender
    );

    displayNotification(
      "Your avatar preset was saved."
    );
  }

  function tryRecommendedItem(item) {
    setEquippedItems((current) => ({
      ...current,
      [item.category]: item,
    }));

    displayNotification(
      `${item.name} is now equipped.`
    );
  }

  function removeEquippedItem(category) {
    setEquippedItems((current) => ({
      ...current,
      [category]: null,
    }));
  }

  function handleRecommendations() {
    if (isGuest) {
      openRegistrationPopup();
      return;
    }

    setActivePanel("recommendations");
  }

  /* =====================================
     SAVE OUTFIT POPUP
  ===================================== */

  function saveOutfit() {
    if (isGuest) {
      openRegistrationPopup();
      return;
    }

    if (equippedItemsArray.length === 0) {
      displayNotification(
        "Try at least one clothing item before saving."
      );
      return;
    }

    setOutfitName("");
    setOutfitNameError("");
    setShowSaveOutfitModal(true);
  }

  function closeSaveOutfitModal() {
    setShowSaveOutfitModal(false);
    setOutfitName("");
    setOutfitNameError("");
  }

  function confirmSaveOutfit(event) {
    event.preventDefault();

    const trimmedName = outfitName.trim();

    if (!trimmedName) {
      setOutfitNameError(
        "Please enter an outfit name before saving."
      );
      return;
    }

    if (trimmedName.length > 50) {
      setOutfitNameError(
        "Outfit name must not exceed 50 characters."
      );
      return;
    }

    const savedOutfits = readStoredArray(
      "fitfusion-saved-outfits"
    );

    const savedProducts =
      equippedItemsArray.map((item) => ({
        id: item.id,
        name: item.name,
        seller: item.store,
        category: item.category,
        color: item.color,
        size: item.size,
        price: item.price,
        quantity: 1,
        image: item.image || "",
      }));

    const newOutfit = {
      id: `outfit-${Date.now()}`,
      name: trimmedName,
      occasion: "Casual",
      description: "",
      avatarView: currentView.toLowerCase(),
      avatar: {
        ...avatar,
        cupSize: isFemale
          ? avatar.cupSize
          : null,
        view: currentView,
      },
      products: savedProducts,
      items: equippedItemsArray,
      createdAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(
        "fitfusion-saved-outfits",
        JSON.stringify([
          newOutfit,
          ...savedOutfits,
        ])
      );

      closeSaveOutfitModal();

      displayNotification(
        `"${trimmedName}" was saved successfully!`
      );
    } catch {
      setOutfitNameError(
        "Unable to save your outfit. Please try again."
      );
    }
  }

  /* =====================================
     CART
  ===================================== */

  function continueToCart() {
    if (isGuest) {
      openRegistrationPopup();
      return;
    }

    if (equippedItemsArray.length === 0) {
      displayNotification(
        "Try at least one clothing item first."
      );
      return;
    }

    localStorage.setItem(
      "fitfusion-selected-items",
      JSON.stringify(
        equippedItemsArray.map((item) => ({
          ...item,
          quantity: 1,
        }))
      )
    );

    navigate(
      "/shopper/fitting-studio/select-items"
    );
  }

  return (
    <main
      className={`fitting-studio-page ${
        isGuest ? "guest-studio" : ""
      }`}
    >
      <div className="studio-body">
        {/* INTRODUCTION */}

        <section className="studio-introduction">
          <div>
            <p>VIRTUAL FITTING</p>

            <h1>
              Customize and try clothing
            </h1>

            <span>
              Customize your avatar and switch
              between Front, Side, and Rear views.
              {isGuest &&
                " Your changes are temporary and will be removed when the guest session ends."}
            </span>
          </div>

          <button
            type="button"
            className="studio-change-gender"
            onClick={() =>
              navigate(
                `${basePath}/fitting-studio`
              )
            }
          >
            Change Gender
          </button>
        </section>

        {/* WORKSPACE */}

        <div className="studio-workspace">
          {/* CUSTOMIZATION PANEL */}

          <section className="studio-controls-card">
            {!isGuest && (
              <div className="studio-panel-tabs">
                <button
                  type="button"
                  className={
                    activePanel === "customize"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setActivePanel("customize")
                  }
                >
                  Customize
                </button>

                <button
                  type="button"
                  className={
                    activePanel === "recommendations"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setActivePanel(
                      "recommendations"
                    )
                  }
                >
                  Recommendations
                </button>
              </div>
            )}

            {activePanel === "customize" ||
            isGuest ? (
              <div className="studio-customization-panel">
                <div className="studio-selected-gender">
                  <span>Selected Gender</span>
                  <strong>{avatar.gender}</strong>
                </div>

                <div className="studio-measurement-grid">
                  <label>
                    <span>Height</span>

                    <div className="studio-input-unit">
                      <input
                        type="number"
                        min="120"
                        max="220"
                        value={avatar.height}
                        onChange={(event) =>
                          updateAvatar(
                            "height",
                            event.target.value
                          )
                        }
                      />
                      <span>cm</span>
                    </div>
                  </label>

                  <label>
                    <span>Weight</span>

                    <div className="studio-input-unit">
                      <input
                        type="number"
                        min="30"
                        max="200"
                        value={avatar.weight}
                        onChange={(event) =>
                          updateAvatar(
                            "weight",
                            event.target.value
                          )
                        }
                      />
                      <span>kg</span>
                    </div>
                  </label>
                </div>

                <ControlGroup
                  label="Shoulder Width"
                  value={avatar.shoulder}
                  options={[
                    "Narrow",
                    "Average",
                    "Broad",
                  ]}
                  onChange={(value) =>
                    updateAvatar(
                      "shoulder",
                      value
                    )
                  }
                />

                <ControlGroup
                  label="Waist"
                  value={avatar.waist}
                  options={[
                    "Slim",
                    "Average",
                    "Curvy",
                  ]}
                  onChange={(value) =>
                    updateAvatar("waist", value)
                  }
                />

                <ControlGroup
                  label="Hip"
                  value={avatar.hip}
                  options={[
                    "Slim",
                    "Average",
                    "Wide",
                  ]}
                  onChange={(value) =>
                    updateAvatar("hip", value)
                  }
                />

                {isFemale && (
                  <ControlGroup
                    label="Cup Size"
                    value={avatar.cupSize}
                    options={[
                      "A",
                      "B",
                      "C",
                      "D",
                    ]}
                    onChange={(value) =>
                      updateAvatar(
                        "cupSize",
                        value
                      )
                    }
                  />
                )}

                <ControlGroup
                  label="Thigh"
                  value={avatar.thigh}
                  options={[
                    "Slim",
                    "Average",
                    "Thick",
                  ]}
                  onChange={(value) =>
                    updateAvatar("thigh", value)
                  }
                />

                <div className="studio-skin-section">
                  <span>Skin Tone</span>

                  <div className="studio-skin-options">
                    {SKIN_TONES.map(
                      (skinTone) => (
                        <button
                          key={skinTone.name}
                          type="button"
                          className={
                            avatar.skinTone ===
                            skinTone.value
                              ? "selected"
                              : ""
                          }
                          style={{
                            backgroundColor:
                              skinTone.value,
                          }}
                          onClick={() =>
                            updateAvatar(
                              "skinTone",
                              skinTone.value
                            )
                          }
                          aria-label={
                            skinTone.name
                          }
                          title={skinTone.name}
                        />
                      )
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  className={
                    isGuest
                      ? "studio-registration-button"
                      : "studio-save-preset"
                  }
                  onClick={handleSavePreset}
                >
                  {isGuest
                    ? "Registration Required to Save"
                    : "Save Avatar Preset"}
                </button>
              </div>
            ) : (
              <div className="studio-recommendations-panel">
                <p className="studio-recommendation-note">
                  Select an item to display it
                  on your avatar.
                </p>

                {RECOMMENDED_ITEMS.map(
                  (item) => (
                    <article
                      key={item.id}
                      className="studio-recommendation-item"
                    >
                      <div
                        className={`studio-clothing-thumbnail ${item.category}`}
                        aria-hidden="true"
                      >
                        <span />
                      </div>

                      <div className="studio-recommendation-information">
                        <h3>{item.name}</h3>
                        <p>{item.store}</p>
                        <strong>
                          {formatCurrency(
                            item.price
                          )}
                        </strong>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          tryRecommendedItem(
                            item
                          )
                        }
                      >
                        Try Item
                      </button>
                    </article>
                  )
                )}
              </div>
            )}
          </section>

          {/* AVATAR PREVIEW */}

          <section className="studio-avatar-card">
            <div className="studio-view-buttons">
              {[
                "Front",
                "Side",
                "Rear",
              ].map((view) => (
                <button
                  key={view}
                  type="button"
                  className={
                    currentView === view
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setCurrentView(view)
                  }
                >
                  {view}
                </button>
              ))}
            </div>

            <div className="studio-avatar-label">
              <span>
                {avatar.gender} Avatar
              </span>

              <strong>
                {currentView} View
              </strong>
            </div>

            <div className="studio-avatar-stage">
              <div
                className={avatarClassName}
                style={{
                  "--avatar-skin":
                    avatar.skinTone,
                }}
              >
                <div className="studio-avatar-hair" />

                <div className="studio-avatar-head">
                  {currentView !== "Rear" && (
                    <>
                      <span />
                      <span />
                    </>
                  )}
                </div>

                <div className="studio-avatar-neck" />
                <div className="studio-avatar-base-body" />
                <div className="studio-avatar-left-arm" />
                <div className="studio-avatar-right-arm" />
                <div className="studio-avatar-left-leg" />
                <div className="studio-avatar-right-leg" />

                {equippedItems.top && (
                  <div className="equipped-top" />
                )}

                {equippedItems.bottom && (
                  <div className="equipped-bottom" />
                )}

                {equippedItems.shoes && (
                  <>
                    <div className="equipped-shoe-left" />
                    <div className="equipped-shoe-right" />
                  </>
                )}
              </div>
            </div>

            <div className="studio-avatar-summary">
              <div>
                <span>Gender</span>
                <strong>
                  {avatar.gender}
                </strong>
              </div>

              <div>
                <span>Height</span>
                <strong>
                  {avatar.height} cm
                </strong>
              </div>

              <div>
                <span>Weight</span>
                <strong>
                  {avatar.weight} kg
                </strong>
              </div>
            </div>
          </section>

          {/* EQUIPPED ITEMS */}

          <aside className="studio-equipped-card">
            <h2>EQUIPPED ITEMS</h2>

            {equippedItemsArray.length === 0 ? (
              <div className="studio-empty-equipped">
                <span aria-hidden="true">
                  ◇
                </span>

                <h3>
                  No clothing equipped
                </h3>

                <p>
                  {isGuest
                    ? "Create an account or log in to access clothing recommendations."
                    : "Open Recommendations and select Try Item."}
                </p>
              </div>
            ) : (
              <div className="studio-equipped-list">
                {Object.entries(
                  equippedItems
                ).map(
                  ([category, item]) =>
                    item && (
                      <article
                        key={category}
                        className="studio-equipped-item"
                      >
                        <div>
                          <span>
                            {category}
                          </span>

                          <strong>
                            {item.name}
                          </strong>

                          <small>
                            Size {item.size} •{" "}
                            {item.color}
                          </small>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removeEquippedItem(
                              category
                            )
                          }
                        >
                          Remove
                        </button>
                      </article>
                    )
                )}
              </div>
            )}

            <button
              type="button"
              className={
                isGuest
                  ? "studio-restricted-action"
                  : "studio-open-recommendations"
              }
              onClick={handleRecommendations}
            >
              {isGuest
                ? "Registration Required for Recommendations"
                : "Open Recommendations"}
            </button>

            <button
              type="button"
              className={
                isGuest
                  ? "studio-restricted-action"
                  : "studio-save-outfit"
              }
              onClick={saveOutfit}
            >
              {isGuest
                ? "Registration Required to Save Outfit"
                : "Save Outfit"}
            </button>

            <button
              type="button"
              className={
                isGuest
                  ? "studio-restricted-action"
                  : "studio-select-cart-items"
              }
              onClick={continueToCart}
            >
              {isGuest
                ? "Registration Required to Add to Cart"
                : "Select Items for Cart"}
            </button>
          </aside>
        </div>
      </div>

      {/* NOTIFICATION */}

      {notification && (
        <div
          className="studio-notification"
          role="status"
        >
          {notification}
        </div>
      )}

      {/* =====================================
          SAVE OUTFIT NAME POPUP
      ===================================== */}

      {showSaveOutfitModal && !isGuest && (
        <div
          className="studio-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeSaveOutfitModal();
            }
          }}
        >
          <section
            className="studio-save-outfit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="studio-save-title"
          >
            <button
              type="button"
              className="studio-modal-close"
              onClick={closeSaveOutfitModal}
              aria-label="Close save outfit popup"
            >
              ×
            </button>

            <p className="studio-modal-label">
              SAVE YOUR LOOK
            </p>

            <h2 id="studio-save-title">
              Save Outfit
            </h2>

            <p className="studio-modal-description">
              Give your outfit a name so you
              can easily find it in Saved Outfits.
            </p>

            <form
              onSubmit={confirmSaveOutfit}
              noValidate
            >
              <label
                className="studio-save-outfit-field"
                htmlFor="studio-outfit-name"
              >
                Outfit Name <span>*</span>
              </label>

              <input
                id="studio-outfit-name"
                type="text"
                className={`studio-save-outfit-input ${
                  outfitNameError
                    ? "invalid"
                    : ""
                }`}
                value={outfitName}
                onChange={(event) => {
                  setOutfitName(
                    event.target.value
                  );

                  setOutfitNameError("");
                }}
                placeholder="e.g. Weekend Casual"
                maxLength={50}
                autoFocus
                required
                aria-invalid={Boolean(
                  outfitNameError
                )}
                aria-describedby={
                  outfitNameError
                    ? "studio-outfit-name-error"
                    : undefined
                }
              />

              <div className="studio-save-outfit-hint">
                {outfitNameError ? (
                  <span
                    id="studio-outfit-name-error"
                    className="studio-save-outfit-error"
                  >
                    {outfitNameError}
                  </span>
                ) : (
                  <span>
                    Required field
                  </span>
                )}

                <span>
                  {outfitName.length}/50
                </span>
              </div>

              <div className="studio-save-outfit-actions">
                <button
                  type="button"
                  className="studio-save-cancel-button"
                  onClick={closeSaveOutfitModal}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="studio-save-confirm-button"
                >
                  Save Outfit
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* REGISTRATION POPUP */}

      {showRegistrationModal && (
        <div
          className="studio-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowRegistrationModal(
                false
              );
            }
          }}
        >
          <section
            className="studio-registration-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="registration-title"
          >
            <button
              type="button"
              className="studio-modal-close"
              aria-label="Close registration popup"
              onClick={() =>
                setShowRegistrationModal(
                  false
                )
              }
            >
              ×
            </button>

            <div className="studio-modal-icon">
              ◇
            </div>

            <p className="studio-modal-label">
              REGISTRATION REQUIRED
            </p>

            <h2 id="registration-title">
              Unlock the complete fitting
              experience
            </h2>

            <p className="studio-modal-description">
              Create an account or log in to
              access recommendations, save
              avatar presets and outfits, and
              add clothing items to your cart.
            </p>

            <div className="studio-modal-actions">
              <button
                type="button"
                className="studio-modal-primary"
                onClick={() =>
                  navigate("/signup")
                }
              >
                Create Account
              </button>

              <button
                type="button"
                className="studio-modal-secondary"
                onClick={() =>
                  navigate("/login")
                }
              >
                Log In
              </button>
            </div>

            <button
              type="button"
              className="studio-modal-continue"
              onClick={() =>
                setShowRegistrationModal(
                  false
                )
              }
            >
              Continue as Guest
            </button>
          </section>
        </div>
      )}
    </main>
  );
}

export default FittingStudioPage;
