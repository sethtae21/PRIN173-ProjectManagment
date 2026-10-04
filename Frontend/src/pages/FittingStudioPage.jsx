import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./css/FittingStudioPage.css";

const RECOMMENDED_ITEMS = [
  {
    id: "rec-linen-shirt",
    name: "Linen Shirt",
    store: "Aurelia Studio",
    category: "top",
    color: "Beige",
    size: "M",
    price: 750,
    matchScore: "6/7",
  },
  {
    id: "rec-straight-pants",
    name: "Straight Pants",
    store: "Noir & Thread",
    category: "bottom",
    color: "Charcoal",
    size: "M",
    price: 1100,
    matchScore: "6/7",
  },
  {
    id: "rec-outerwear",
    name: "Lightweight Outerwear",
    store: "Atelier Four",
    category: "outerwear",
    color: "Taupe",
    size: "M",
    price: 900,
    matchScore: "5/7",
  },
  {
    id: "rec-sneakers",
    name: "Everyday Sneakers",
    store: "Maison Sol",
    category: "shoes",
    color: "White",
    size: "7",
    price: 1500,
    matchScore: "6/7",
  },
];

const SKIN_TONES = [
  { name: "Light", value: "#f1c9a5" },
  { name: "Warm", value: "#dca77d" },
  { name: "Medium", value: "#bd8058" },
  { name: "Deep", value: "#855338" },
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
    const storedValue = JSON.parse(
      (isGuest ? sessionStorage : localStorage).getItem(key) || "[]"
    );
    return Array.isArray(storedValue) ? storedValue : [];
  } catch {
    return [];
  }
}

function loadInitialAvatar(isGuest) {
  const storage = isGuest ? sessionStorage : localStorage;
  const gender = storage.getItem("fitfusion-avatar-gender") || "Female";

  try {
    const savedPreset = JSON.parse(
      storage.getItem("fitfusion-avatar-preset") || "null"
    );

    if (savedPreset) {
      return {
        gender: savedPreset.gender || gender,
        height: savedPreset.height || "160",
        weight: savedPreset.weight || "55",
        skinTone: savedPreset.skinTone || "#dca77d",
        shoulder: savedPreset.shoulder || "Average",
        waist: savedPreset.waist || "Average",
        hip: savedPreset.hip || "Average",
        cupSize: savedPreset.cupSize || "B",
        thigh: savedPreset.thigh || "Average",
      };
    }
  } catch {
    // Use default values.
  }

  return {
    gender,
    height: "160",
    weight: "55",
    skinTone: "#dca77d",
    shoulder: "Average",
    waist: "Average",
    hip: "Average",
    cupSize: "B",
    thigh: "Average",
  };
}

function getCartCount(isGuest) {
  if (isGuest) return 0;
  const cartItems = readStoredArray("fitfusion-cart-items");
  return cartItems.reduce((total, item) => total + Number(item.quantity || 1), 0);
}

function FittingStudioPage({ isGuest = false }) {
  const navigate = useNavigate();
  const basePath = isGuest ? "/guest" : "/shopper";

  const [avatar, setAvatar] = useState(() => loadInitialAvatar(isGuest));
  const [currentView, setCurrentView] = useState("Front");
  const [activePanel, setActivePanel] = useState("customize");
  const [equippedItems, setEquippedItems] = useState({
    top: null,
    bottom: null,
    outerwear: null,
    shoes: null,
  });
  const [notification, setNotification] = useState("");

  const cartCount = useMemo(() => getCartCount(isGuest), [isGuest]);

  const equippedItemsArray = useMemo(
    () => Object.values(equippedItems).filter(Boolean),
    [equippedItems]
  );

  // Update storage when avatar changes (for guests, use sessionStorage)
  useEffect(() => {
    const storage = isGuest ? sessionStorage : localStorage;
    storage.setItem("fitfusion-avatar-gender", avatar.gender);
    storage.setItem("fitfusion-avatar-preset", JSON.stringify(avatar));
  }, [avatar, isGuest]);

  function updateAvatar(field, value) {
    setAvatar((currentAvatar) => ({
      ...currentAvatar,
      [field]: value,
    }));
  }

  function showNotification(message) {
    setNotification(message);
    window.setTimeout(() => setNotification(""), 2600);
  }

  function tryRecommendedItem(item) {
    setEquippedItems((currentEquippedItems) => ({
      ...currentEquippedItems,
      [item.category]: item,
    }));
    showNotification(`${item.name} is now shown on your avatar.`);
  }

  function removeEquippedItem(category) {
    setEquippedItems((currentEquippedItems) => ({
      ...currentEquippedItems,
      [category]: null,
    }));
  }

  function saveAvatarPreset() {
    if (isGuest) {
      showNotification("Guest sessions cannot save presets. Please register to save!");
      return;
    }

    const savedPresets = readStoredArray("fitfusion-avatar-presets");
    const newPreset = {
      id: `avatar-${Date.now()}`,
      name: `${avatar.gender} Avatar ${savedPresets.length + 1}`,
      ...avatar,
      updatedAt: new Date().toISOString(),
    };

    const updatedPresets = [newPreset, ...savedPresets];
    localStorage.setItem("fitfusion-avatar-presets", JSON.stringify(updatedPresets));
    localStorage.setItem("fitfusion-avatar-preset", JSON.stringify(newPreset));
    localStorage.setItem("fitfusion-avatar-gender", avatar.gender);

    showNotification("Your avatar preset was saved.");
  }

  function saveOutfit() {
    if (equippedItemsArray.length === 0) {
      showNotification("Try at least one clothing item before saving an outfit.");
      return;
    }

    if (isGuest) {
      showNotification("Guest sessions cannot save outfits. Please register to save!");
      return;
    }

    const savedOutfits = readStoredArray("fitfusion-saved-outfits");
    const newOutfit = {
      id: `outfit-${Date.now()}`,
      name: `Saved Outfit ${savedOutfits.length + 1}`,
      avatar: { ...avatar, view: currentView },
      items: equippedItemsArray,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(
      "fitfusion-saved-outfits",
      JSON.stringify([newOutfit, ...savedOutfits])
    );

    showNotification("Your outfit was saved successfully.");
  }

  function continueToCartSelection() {
    if (equippedItemsArray.length === 0) {
      showNotification("Try at least one item before continuing.");
      return;
    }

    if (isGuest) {
      showNotification("Please register to add items to your cart!");
      return;
    }

    const selectedItems = equippedItemsArray.map((item) => ({
      ...item,
      quantity: 1,
    }));

    localStorage.setItem("fitfusion-selected-items", JSON.stringify(selectedItems));
    navigate("/shopper/fitting-studio/select-items");
  }

  function changeGender() {
    navigate(`${basePath}/fitting-studio`);
  }

  const avatarClassName = [
    "studio-avatar",
    avatar.gender.toLowerCase(),
    currentView.toLowerCase(),
    `shoulder-${avatar.shoulder.toLowerCase()}`,
    `waist-${avatar.waist.toLowerCase()}`,
    `hip-${avatar.hip.toLowerCase()}`,
    `thigh-${avatar.thigh.toLowerCase()}`,
  ].join(" ");

  return (
    <div className="fitting-studio-content">
      <header className="studio-header">
        <div>
          <h1>{isGuest ? "10G — GUEST FITTING STUDIO" : "10 — FITTING STUDIO"}</h1>
          <p>
            {isGuest
              ? "Temporary avatar customization session"
              : "Customize your 2D avatar and try recommended clothing"}
          </p>
        </div>

        <div className="studio-header-actions">
          {!isGuest && (
            <button
              className="studio-cart-button"
              type="button"
              onClick={() => navigate("/shopper/cart")}
              aria-label={`Open cart with ${cartCount} items`}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 7H6" />
                <circle cx="10" cy="20" r="1" />
                <circle cx="18" cy="20" r="1" />
              </svg>
              <span>{cartCount}</span>
            </button>
          )}

          <div className={`studio-role-badge ${isGuest ? "guest-badge" : ""}`}>
            {isGuest ? "GUEST SESSION" : "REGISTERED SHOPPER"}
          </div>
        </div>
      </header>

      <div className="studio-body">
        <section className="studio-introduction">
          <div>
            <p>VIRTUAL FITTING</p>
            <h2>Customize and try clothing</h2>
            <span>
              Your avatar and equipped clothes update when you switch between
              Front, Side, and Rear views.
              {isGuest && " Session data is temporary and will be lost when you close the browser."}
            </span>
          </div>

          <button className="studio-change-gender" type="button" onClick={changeGender}>
            Change Gender
          </button>
        </section>

        <div className="studio-workspace">
          {/* Left Panel: Controls & Recommendations */}
          <section className="studio-controls-card">
            <div className="studio-panel-tabs">
              <button
                className={activePanel === "customize" ? "active" : ""}
                type="button"
                onClick={() => setActivePanel("customize")}
              >
                Customize
              </button>
              <button
                className={activePanel === "recommendations" ? "active" : ""}
                type="button"
                onClick={() => setActivePanel("recommendations")}
              >
                Recommendations
              </button>
            </div>

            {activePanel === "customize" ? (
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
                        onChange={(event) => updateAvatar("height", event.target.value)}
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
                        onChange={(event) => updateAvatar("weight", event.target.value)}
                      />
                      <span>kg</span>
                    </div>
                  </label>
                </div>

                <ControlGroup
                  label="Shoulder Width"
                  value={avatar.shoulder}
                  options={["Narrow", "Average", "Broad"]}
                  onChange={(value) => updateAvatar("shoulder", value)}
                />

                <ControlGroup
                  label="Waist"
                  value={avatar.waist}
                  options={["Slim", "Average", "Curvy"]}
                  onChange={(value) => updateAvatar("waist", value)}
                />

                <ControlGroup
                  label="Hip"
                  value={avatar.hip}
                  options={["Slim", "Average", "Wide"]}
                  onChange={(value) => updateAvatar("hip", value)}
                />

                {avatar.gender === "Female" && (
                  <ControlGroup
                    label="Cup Size"
                    value={avatar.cupSize}
                    options={["A", "B", "C", "D"]}
                    onChange={(value) => updateAvatar("cupSize", value)}
                  />
                )}

                <ControlGroup
                  label="Thigh"
                  value={avatar.thigh}
                  options={["Slim", "Average", "Thick"]}
                  onChange={(value) => updateAvatar("thigh", value)}
                />

                <div className="studio-skin-section">
                  <span>Skin Tone</span>
                  <div className="studio-skin-options">
                    {SKIN_TONES.map((skinTone) => (
                      <button
                        className={avatar.skinTone === skinTone.value ? "selected" : ""}
                        key={skinTone.name}
                        type="button"
                        style={{ backgroundColor: skinTone.value }}
                        onClick={() => updateAvatar("skinTone", skinTone.value)}
                        aria-label={skinTone.name}
                        title={skinTone.name}
                      />
                    ))}
                  </div>
                </div>

                <button
                  className="studio-save-preset"
                  type="button"
                  onClick={saveAvatarPreset}
                  disabled={isGuest}
                  style={isGuest ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                >
                  {isGuest ? "Registration Required to Save" : "Save Avatar Preset"}
                </button>
              </div>
            ) : (
              <div className="studio-recommendations-panel">
                <p className="studio-recommendation-note">
                  Recommendations are based on the current avatar and sample preference data.
                </p>

                {RECOMMENDED_ITEMS.map((item) => (
                  <article className="studio-recommendation-item" key={item.id}>
                    <div
                      className={`studio-clothing-thumbnail ${item.category}`}
                      aria-hidden="true"
                    >
                      <span />
                    </div>

                    <div className="studio-recommendation-information">
                      <h3>{item.name}</h3>
                      <p>{item.store}</p>
                      <span>Match score: {item.matchScore}</span>
                      <strong>{formatCurrency(item.price)}</strong>
                    </div>

                    <button type="button" onClick={() => tryRecommendedItem(item)}>
                      Try Item
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Center Panel: Avatar Canvas */}
          <section className="studio-avatar-card">
            <div className="studio-view-buttons">
              {["Front", "Side", "Rear"].map((view) => (
                <button
                  className={currentView === view ? "active" : ""}
                  key={view}
                  type="button"
                  onClick={() => setCurrentView(view)}
                >
                  {view}
                </button>
              ))}
            </div>

            <div className="studio-avatar-label">
              <span>{avatar.gender} Avatar</span>
              <strong>{currentView} View</strong>
            </div>

            <div className="studio-avatar-stage">
              <div className={avatarClassName} style={{ "--avatar-skin": avatar.skinTone }}>
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
                  <div className="equipped-top">
                    <span>{equippedItems.top.name}</span>
                  </div>
                )}

                {equippedItems.bottom && (
                  <div className="equipped-bottom">
                    <span>{equippedItems.bottom.name}</span>
                  </div>
                )}

                {equippedItems.outerwear && (
                  <div className="equipped-outerwear">
                    <span>{equippedItems.outerwear.name}</span>
                  </div>
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
                <span>Height</span>
                <strong>{avatar.height} cm</strong>
              </div>
              <div>
                <span>Weight</span>
                <strong>{avatar.weight} kg</strong>
              </div>
              <div>
                <span>Equipped</span>
                <strong>
                  {equippedItemsArray.length} {equippedItemsArray.length === 1 ? "item" : "items"}
                </strong>
              </div>
            </div>
          </section>

          {/* Right Panel: Equipped Items */}
          <aside className="studio-equipped-card">
            <h3>EQUIPPED ITEMS</h3>

            {equippedItemsArray.length > 0 ? (
              <div className="studio-equipped-list">
                {Object.entries(equippedItems).map(
                  ([category, item]) =>
                    item && (
                      <article className="studio-equipped-item" key={category}>
                        <div>
                          <span>{category}</span>
                          <strong>{item.name}</strong>
                          <small>
                            Size {item.size} • {item.color}
                          </small>
                        </div>
                        <button type="button" onClick={() => removeEquippedItem(category)}>
                          Remove
                        </button>
                      </article>
                    )
                )}
              </div>
            ) : (
              <div className="studio-empty-equipped">
                <span aria-hidden="true">◇</span>
                <h4>No clothing equipped</h4>
                <p>Open Recommendations and select Try Item.</p>
              </div>
            )}

            <button
              className="studio-open-recommendations"
              type="button"
              onClick={() => setActivePanel("recommendations")}
            >
              View Recommendations
            </button>

            <button
              className="studio-save-outfit"
              type="button"
              disabled={equippedItemsArray.length === 0 || isGuest}
              onClick={saveOutfit}
              style={
                isGuest && equippedItemsArray.length > 0
                  ? { opacity: 0.5, cursor: "not-allowed" }
                  : {}
              }
            >
              {isGuest ? "Register to Save Outfit" : "Save Outfit"}
            </button>

            <button
              className="studio-select-cart-items"
              type="button"
              disabled={equippedItemsArray.length === 0 || isGuest}
              onClick={continueToCartSelection}
              style={
                isGuest && equippedItemsArray.length > 0
                  ? { opacity: 0.5, cursor: "not-allowed" }
                  : {}
              }
            >
              {isGuest ? "Register to Add to Cart" : "Select Items for Cart"}
            </button>
          </aside>
        </div>
      </div>

      {notification && (
        <div className="studio-notification" role="status">
          {notification}
        </div>
      )}
    </div>
  );
}

function ControlGroup({ label, value, options, onChange }) {
  return (
    <div className="studio-control-group">
      <span>{label}</span>
      <div>
        {options.map((option) => (
          <button
            className={value === option ? "active" : ""}
            key={option}
            type="button"
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export default FittingStudioPage;