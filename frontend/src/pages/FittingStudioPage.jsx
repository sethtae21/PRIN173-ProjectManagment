
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../services/api";
import RatingControl from "../components/RatingControl";
import AvatarCanvas from "./Shopper/AvatarCanvas";
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

// Session data is temporary, including for registered shoppers.
// Saved avatar presets remain independent from clothing previews.
const STUDIO_SESSION_PREFIX =
  "fitfusion-fitting-studio-session-";

const STUDIO_PENDING_PREFIX =
  "fitfusion-fitting-studio-pending-item-";

const HEIGHT_RANGE = { min: 120, max: 218 };
const WEIGHT_RANGE = { min: 30, max: 200 };

function sessionKey(isGuest) {
  return `${STUDIO_SESSION_PREFIX}${
    isGuest ? "guest" : "shopper"
  }`;
}

function pendingKey(isGuest) {
  return `${STUDIO_PENDING_PREFIX}${
    isGuest ? "guest" : "shopper"
  }`;
}

function readJson(storage, key) {
  try {
    return JSON.parse(storage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function readStudioSession(isGuest) {
  const session = readJson(
    sessionStorage,
    sessionKey(isGuest)
  );

  return session && typeof session === "object"
    ? session
    : null;
}

function normalizeCategory(category) {
  const label = String(category || "").toLowerCase();

  if (/shoe|sneaker|footwear|boot|sandal/.test(label)) {
    return "shoes";
  }

  if (/pant|trouser|jean|short|skirt|bottom/.test(label)) {
    return "bottom";
  }

  return "top";
}

function normalizeStudioItem(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const id = item.id ?? item.product_id;

  if (id === undefined || id === null) {
    return null;
  }

  return {
    ...item,
    id,
    name:
      item.name ||
      item.product_name ||
      "Clothing item",
    store:
      item.store ||
      item.store_name ||
      item.sellerName ||
      "FitFusion Store",
    category: normalizeCategory(item.category),
    size: String(
      item.selectedSize ||
      item.availableSize ||
      item.size ||
      "M"
    ).toUpperCase(),
    color:
      item.selectedColor ||
      item.color ||
      "Unspecified",
    price: Number(item.price || 0),
    image:
      item.image ||
      item.frontImageUrl ||
      item.front_image ||
      "",
  };
}

// Only use explicit fitting limits supplied by a seller.
// A size label such as "S" is not a reliable weight limit.
function sizeRecordFor(item) {
  const source =
    item.fit_limits ||
    item.size_chart ||
    item.sizeChart ||
    item.size_measurements;

  const size = String(
    item.size || item.selectedSize || ""
  ).toUpperCase();

  if (Array.isArray(source)) {
    return (
      source.find(
        (entry) =>
          String(
            entry?.size || entry?.label || ""
          ).toUpperCase() === size
      ) || null
    );
  }

  if (source && typeof source === "object") {
    return (
      source[size] ||
      source[size.toLowerCase()] ||
      source
    );
  }

  return item;
}

function finiteNumber(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function readRange(record, type, globalRange) {
  const unit = type === "height" ? "cm" : "kg";
  const unitCapitalized = type === "height"
    ? "Cm"
    : "Kg";

  const nested =
    record?.[type] &&
    typeof record[type] === "object"
      ? record[type]
      : {};

  const minimum = finiteNumber(
    record?.[`min_${type}`] ??
    record?.[`min_${type}_${unit}`] ??
    record?.[`${type}Min`] ??
    record?.[`${type}Min${unitCapitalized}`] ??
    nested.min
  );

  const maximum = finiteNumber(
    record?.[`max_${type}`] ??
    record?.[`max_${type}_${unit}`] ??
    record?.[`${type}Max`] ??
    record?.[`${type}Max${unitCapitalized}`] ??
    nested.max
  );

  if (minimum === null && maximum === null) {
    return null;
  }

  const low = Math.max(
    globalRange.min,
    minimum ?? globalRange.min
  );

  const high = Math.min(
    globalRange.max,
    maximum ?? globalRange.max
  );

  if (low > high) {
    return { invalid: true };
  }

  return {
    min: low,
    max: high,
    hasMaximum: maximum !== null,
  };
}

function limitsForItem(item) {
  const record = sizeRecordFor(item);

  if (!record) {
    return {
      height: null,
      weight: null,
    };
  }

  return {
    height: readRange(
      record,
      "height",
      HEIGHT_RANGE
    ),
    weight: readRange(
      record,
      "weight",
      WEIGHT_RANGE
    ),
  };
}

function combinedFitLimits(items) {
  const limits = {
    height: { ...HEIGHT_RANGE },
    weight: { ...WEIGHT_RANGE },
    hasHeight: false,
    hasWeight: false,
    hasHeightMaximum: false,
    hasWeightMaximum: false,
    incompatible: false,
  };

  for (
    const item of Object.values(items).filter(Boolean)
  ) {
    const ranges = limitsForItem(item);

    for (const type of ["height", "weight"]) {
      const range = ranges[type];

      if (!range) {
        continue;
      }

      if (range.invalid) {
        limits.incompatible = true;
        continue;
      }

      limits[type].min = Math.max(
        limits[type].min,
        range.min
      );

      limits[type].max = Math.min(
        limits[type].max,
        range.max
      );

      if (type === "height") {
        limits.hasHeight = true;

        if (range.hasMaximum) {
          limits.hasHeightMaximum = true;
        }
      } else {
        limits.hasWeight = true;

        if (range.hasMaximum) {
          limits.hasWeightMaximum = true;
        }
      }
    }
  }

  if (
    limits.height.min > limits.height.max ||
    limits.weight.min > limits.weight.max
  ) {
    limits.incompatible = true;
  }

  return limits;
}

function clamp(value, range) {
  return Math.min(
    range.max,
    Math.max(
      range.min,
      Number(value) || range.min
    )
  );
}

function applyFitLimits(avatar, limits) {
  return {
    ...avatar,
    height: String(
      clamp(avatar.height, limits.height)
    ),
    weight: String(
      clamp(avatar.weight, limits.weight)
    ),
  };
}

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

function readAuthState() {
  if (!localStorage.getItem("access_token")) {
    return null;
  }

  try {
    const user = JSON.parse(
      localStorage.getItem(
        "fitfusion-current-user"
      ) || "null"
    );

    return user || {};
  } catch {
    return {};
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

  const presetKey = isGuest
    ? "fitfusion-guest-avatar-preset"
    : "fitfusion-avatar-preset";

  let savedPreset = null;

  try {
    savedPreset = JSON.parse(
      storage.getItem(presetKey) || "null"
    );
  } catch {
    savedPreset = null;
  }

  return {
    gender: normalizeGender(
      storage.getItem(genderKey) ||
      savedPreset?.gender ||
      "Female"
    ),
    height: savedPreset?.height || "160",
    weight: savedPreset?.weight || "55",
    shoulder:
      savedPreset?.shoulder || "Average",
    waist: savedPreset?.waist || "Average",
    hip: savedPreset?.hip || "Average",
    cupSize: savedPreset?.cupSize || "B",
    thigh: savedPreset?.thigh || "Average",
    skinTone:
      savedPreset?.skinTone || "#dca77d",
    undertone:
      savedPreset?.undertone || "Neutral",
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
            aria-pressed={value === option}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function FittingStudioPage({
  isGuest = false,
}) {
  const navigate = useNavigate();

  const [avatar, setAvatar] = useState(
    () =>
      readStudioSession(isGuest)?.avatar ||
      loadAvatar(isGuest)
  );

  const [
    currentView,
    setCurrentView,
  ] = useState(
    () =>
      readStudioSession(isGuest)?.currentView ||
      "Front"
  );

  const [
    activePanel,
    setActivePanel,
  ] = useState("customize");

  const [
    equippedItems,
    setEquippedItems,
  ] = useState(
    () =>
      readStudioSession(isGuest)?.equippedItems || {
        top: null,
        bottom: null,
        shoes: null,
      }
  );

  const [
    originalDimensions,
    setOriginalDimensions,
  ] = useState(
    () =>
      readStudioSession(isGuest)
        ?.originalDimensions || null
  );

  const [
    catalogRecommendations,
    setCatalogRecommendations,
  ] = useState([]);

  const [
    catalogLoading,
    setCatalogLoading,
  ] = useState(true);

  const [
    showRegistrationModal,
    setShowRegistrationModal,
  ] = useState(false);

  const [
    showSaveOutfitModal,
    setShowSaveOutfitModal,
  ] = useState(false);

  const [
    showSaveAvatarModal,
    setShowSaveAvatarModal,
  ] = useState(false);

  const [
    avatarPresetName,
    setAvatarPresetName,
  ] = useState("");

  const [
    avatarPresetNameError,
    setAvatarPresetNameError,
  ] = useState("");

  const [outfitName, setOutfitName] =
    useState("");

  const [
    outfitNameError,
    setOutfitNameError,
  ] = useState("");

  const [
    notification,
    setNotification,
  ] = useState("");

  const basePath = isGuest
    ? "/guest"
    : "/shopper";

  const isFemale =
    avatar.gender.toLowerCase() === "female";

  const equippedItemsArray = useMemo(
    () =>
      Object.values(equippedItems).filter(
        Boolean
      ),
    [equippedItems]
  );

  const fitLimits = useMemo(
    () => combinedFitLimits(equippedItems),
    [equippedItems]
  );

  const atHeightMax =
    fitLimits.hasHeightMaximum &&
    Number(avatar.height) >=
      fitLimits.height.max;

  const atWeightMax =
    fitLimits.hasWeightMaximum &&
    Number(avatar.weight) >=
      fitLimits.weight.max;

  // Preserve the avatar, outfit, and viewing angle.
  useEffect(() => {
    sessionStorage.setItem(
      sessionKey(isGuest),
      JSON.stringify({
        avatar,
        currentView,
        equippedItems,
        originalDimensions,
      })
    );
  }, [
    avatar,
    currentView,
    equippedItems,
    originalDimensions,
    isGuest,
  ]);

  // Load real catalog products.
  useEffect(() => {
    let active = true;

    async function loadRecommendations() {
      try {
        const response = await fetch(
          `${API_URL}/catalog/`
        );

        if (!response.ok) {
          throw new Error(
            "Catalog unavailable"
          );
        }

        const data = await response.json();

        const records = Array.isArray(data)
          ? data
          : data.results ||
            data.products ||
            [];

        if (active) {
          setCatalogRecommendations(
            records
              .map(normalizeStudioItem)
              .filter(Boolean)
              .slice(0, 12)
          );
        }
      } catch (error) {
        console.warn(
          "Unable to load catalog recommendations:",
          error
        );
      } finally {
        if (active) {
          setCatalogLoading(false);
        }
      }
    }

    loadRecommendations();

    return () => {
      active = false;
    };
  }, []);

  // Receive clothing selected from Product Details.
  useEffect(() => {
    const key = pendingKey(isGuest);

    const pending = readJson(
      sessionStorage,
      key
    );

    if (!pending) {
      return;
    }

    sessionStorage.removeItem(key);

    const item = normalizeStudioItem(pending);

    if (!item) {
      return;
    }

    const next = {
      ...equippedItems,
      [item.category]: item,
    };

    const nextLimits =
      combinedFitLimits(next);

    if (nextLimits.incompatible) {
      displayNotification(
        "These garment sizes have conflicting fitting limits. Try another size."
      );
      return;
    }

    if (
      !Object.values(equippedItems).some(
        Boolean
      )
    ) {
      setOriginalDimensions({
        height: avatar.height,
        weight: avatar.weight,
      });
    }

    setEquippedItems(next);

    setAvatar((current) =>
      applyFitLimits(current, nextLimits)
    );

    if (
      !nextLimits.hasHeight &&
      !nextLimits.hasWeight
    ) {
      displayNotification(
        `${item.name} equipped. Seller height/weight limits are not available; no body-size restriction was assumed.`
      );
    } else {
      displayNotification(
        `${item.name} equipped. Preview adjusted to its available fitting limits.`
      );
    }

    // Consume the pending item once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openProductDetails(item) {
    if (item.sampleOnly) {
      displayNotification(
        "This is a sample preview, not a catalog listing. Open Catalog to view real product details."
      );
      return;
    }

    sessionStorage.setItem(
      sessionKey(isGuest),
      JSON.stringify({
        avatar,
        currentView,
        equippedItems,
        originalDimensions,
      })
    );

    navigate(
      `${basePath}/products/${encodeURIComponent(
        item.id
      )}`,
      {
        state: {
          fromFittingStudio: true,
        },
      }
    );
  }

  // Save guest avatar temporarily.
  useEffect(() => {
    if (isGuest) {
      sessionStorage.setItem(
        "fitfusion-guest-avatar-preset",
        JSON.stringify(avatar)
      );
    }
  }, [avatar, isGuest]);

  function displayNotification(message) {
    setNotification(message);

    window.setTimeout(() => {
      setNotification("");
    }, 2500);
  }

  function updateAvatar(field, value) {
    if (
      field === "height" ||
      field === "weight"
    ) {
      const range = fitLimits[field];
      const requested = Number(value);
      const adjusted = clamp(
        requested,
        range
      );

      if (requested > range.max) {
        displayNotification(
          `Maximum ${field} preview reached for the selected garment size.`
        );
      } else if (
        requested < range.min
      ) {
        displayNotification(
          `Minimum ${field} preview reached for the selected garment size.`
        );
      }

      setAvatar((current) => ({
        ...current,
        [field]: String(adjusted),
      }));

      return;
    }

    setAvatar((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function notifyAtLimit(field) {
    const flag =
      `has${field[0].toUpperCase()}${field.slice(
        1
      )}Maximum`;

    if (
      fitLimits[flag] &&
      Number(avatar[field]) >=
        fitLimits[field].max
    ) {
      displayNotification(
        `Maximum ${field} preview reached for this clothing size. Move the slider backward or choose another size.`
      );
    }
  }

  function openRegistrationPopup() {
    setShowRegistrationModal(true);
  }

  // =====================================
  // SAVE AVATAR PRESET
  // =====================================

  function handleSavePreset() {
    if (isGuest) {
      openRegistrationPopup();
      return;
    }

    setAvatarPresetName("");
    setAvatarPresetNameError("");
    setShowSaveAvatarModal(true);
  }

  function closeSaveAvatarModal() {
    setShowSaveAvatarModal(false);
    setAvatarPresetName("");
    setAvatarPresetNameError("");
  }

  function confirmSaveAvatarPreset(event) {
    event.preventDefault();

    if (isGuest) {
      closeSaveAvatarModal();
      openRegistrationPopup();
      return;
    }

    const name = avatarPresetName
      .trim()
      .replace(/\s+/g, " ");

    if (!name) {
      setAvatarPresetNameError(
        "Please enter a preset name before saving."
      );
      return;
    }

    if (name.length > 50) {
      setAvatarPresetNameError(
        "Preset name must not exceed 50 characters."
      );
      return;
    }

    const savedPresets = readStoredArray(
      "fitfusion-avatar-presets"
    );

    const isDuplicate =
      name.toLowerCase() ===
        "fitfusion standard" ||
      savedPresets.some(
        (preset) =>
          String(preset.name || "")
            .trim()
            .toLowerCase() ===
          name.toLowerCase()
      );

    if (isDuplicate) {
      setAvatarPresetNameError(
        "This preset name already exists. Please choose another name."
      );
      return;
    }

    const newPreset = {
      ...avatar,
      id: `avatar-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`,
      name,
      gender: normalizeGender(
        avatar.gender
      ),
      cupSize: isFemale
        ? avatar.cupSize
        : null,
      builtIn: false,
      updatedAt:
        new Date().toISOString(),
    };

    try {
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
        newPreset.gender
      );

      closeSaveAvatarModal();

      displayNotification(
        `“${name}” was saved to Avatar Presets.`
      );
    } catch (error) {
      console.error(
        "Unable to save avatar preset:",
        error
      );

      setAvatarPresetNameError(
        "Unable to save your avatar preset. Please try again."
      );
    }
  }

  // =====================================
  // EQUIP / REMOVE CLOTHING
  // =====================================

  function tryRecommendedItem(rawItem) {
    const item = normalizeStudioItem(
      rawItem
    );

    if (!item) {
      return;
    }

    const next = {
      ...equippedItems,
      [item.category]: item,
    };

    const nextLimits =
      combinedFitLimits(next);

    if (nextLimits.incompatible) {
      displayNotification(
        "Selected garment sizes have incompatible fitting limits. Choose a different size."
      );
      return;
    }

    if (!equippedItemsArray.length) {
      setOriginalDimensions({
        height: avatar.height,
        weight: avatar.weight,
      });
    }

    setEquippedItems(next);

    setAvatar((current) =>
      applyFitLimits(current, nextLimits)
    );

    if (
      !nextLimits.hasHeight &&
      !nextLimits.hasWeight
    ) {
      displayNotification(
        `${item.name} equipped. No verified height/weight limits were supplied for this size.`
      );
    } else {
      displayNotification(
        `${item.name} equipped. Avatar preview adjusted within the garment limits.`
      );
    }
  }

  function removeEquippedItem(category) {
    const next = {
      ...equippedItems,
      [category]: null,
    };

    const hasRemaining =
      Object.values(next).some(Boolean);

    setEquippedItems(next);

    if (!hasRemaining) {
      if (originalDimensions) {
        setAvatar((current) => ({
          ...current,
          ...originalDimensions,
        }));
      }

      setOriginalDimensions(null);
    } else {
      setAvatar((current) =>
        applyFitLimits(
          current,
          combinedFitLimits(next)
        )
      );
    }
  }

  function handleRecommendations() {
    setActivePanel("recommendations");
  }

  // =====================================
  // SAVE OUTFIT
  // =====================================

  function saveOutfit() {
    if (isGuest) {
      openRegistrationPopup();
      return;
    }

    if (
      equippedItemsArray.length === 0
    ) {
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

    const trimmedName =
      outfitName.trim();

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

    const savedOutfits =
      readStoredArray(
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
      avatarView:
        currentView.toLowerCase(),
      avatar: {
        ...avatar,
        cupSize: isFemale
          ? avatar.cupSize
          : null,
        view: currentView,
      },
      products: savedProducts,
      items: equippedItemsArray,
      createdAt:
        new Date().toISOString(),
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

  // =====================================
  // CART
  // =====================================

  function continueToCart() {
    if (isGuest) {
      openRegistrationPopup();
      return;
    }

    if (
      equippedItemsArray.length === 0
    ) {
      displayNotification(
        "Try at least one clothing item first."
      );
      return;
    }

    localStorage.setItem(
      "fitfusion-selected-items",
      JSON.stringify(
        equippedItemsArray.map(
          (item) => ({
            ...item,
            quantity: 1,
          })
        )
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
              Customize your avatar and
              switch between Front, Side,
              and Rear views.

              {isGuest &&
                " Your changes are temporary and will be removed when the guest session ends."}
            </span>
          </div>

          <button
            type="button"
            className="studio-change-gender"
            onClick={() => {
              sessionStorage.removeItem(
                sessionKey(isGuest)
              );

              navigate(
                `${basePath}/fitting-studio`
              );
            }}
          >
            Change Gender
          </button>
        </section>

        {/* MAIN WORKSPACE */}

        <div className="studio-workspace">
          {/* CUSTOMIZATION PANEL */}

          <section className="studio-controls-card">
            <div className="studio-panel-tabs">
              <button
                type="button"
                className={
                  activePanel === "customize"
                    ? "active"
                    : ""
                }
                aria-pressed={
                  activePanel === "customize"
                }
                onClick={() =>
                  setActivePanel(
                    "customize"
                  )
                }
              >
                Customize
              </button>

              <button
                type="button"
                className={
                  activePanel ===
                  "recommendations"
                    ? "active"
                    : ""
                }
                aria-pressed={
                  activePanel ===
                  "recommendations"
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

            {activePanel === "customize" ? (
              <div className="studio-customization-panel">
                <div className="studio-selected-gender">
                  <span>
                    Selected Gender
                  </span>

                  <strong>
                    {avatar.gender}
                  </strong>
                </div>

                {/* EXISTING HEIGHT AND WEIGHT SLIDERS */}

                <div className="studio-measurement-grid">
                  <div className="studio-slider-field">
                    <div className="studio-slider-header">
                      <label htmlFor="studio-height">
                        Height
                      </label>

                      <strong>
                        {avatar.height} cm
                      </strong>
                    </div>

                    <input
                      id="studio-height"
                      className="studio-slider"
                      type="range"
                      min={
                        fitLimits.height.min
                      }
                      max={
                        fitLimits.height.max
                      }
                      step="1"
                      value={clamp(
                        avatar.height,
                        fitLimits.height
                      )}
                      onPointerUp={() =>
                        notifyAtLimit(
                          "height"
                        )
                      }
                      onKeyUp={() =>
                        notifyAtLimit(
                          "height"
                        )
                      }
                      onChange={(event) =>
                        updateAvatar(
                          "height",
                          event.target.value
                        )
                      }
                    />

                    <div className="studio-slider-limits">
                      <span>
                        {fitLimits.height.min} cm
                      </span>

                      <span>
                        {fitLimits.height.max} cm
                      </span>
                    </div>
                  </div>

                  <div className="studio-slider-field">
                    <div className="studio-slider-header">
                      <label htmlFor="studio-weight">
                        Weight
                      </label>

                      <strong>
                        {avatar.weight} kg
                      </strong>
                    </div>

                    <input
                      id="studio-weight"
                      className="studio-slider"
                      type="range"
                      min={
                        fitLimits.weight.min
                      }
                      max={
                        fitLimits.weight.max
                      }
                      step="1"
                      value={clamp(
                        avatar.weight,
                        fitLimits.weight
                      )}
                      onPointerUp={() =>
                        notifyAtLimit(
                          "weight"
                        )
                      }
                      onKeyUp={() =>
                        notifyAtLimit(
                          "weight"
                        )
                      }
                      onChange={(event) =>
                        updateAvatar(
                          "weight",
                          event.target.value
                        )
                      }
                    />

                    <div className="studio-slider-limits">
                      <span>
                        {fitLimits.weight.min} kg
                      </span>

                      <span>
                        {fitLimits.weight.max} kg
                      </span>
                    </div>
                  </div>
                </div>

                {/* CLOTHING SIZE VALIDATION */}

                {equippedItemsArray.length > 0 && (
                  <div
                    className="studio-fit-validation"
                    role="status"
                    style={{
                      margin: "12px 0",
                      padding: "12px",
                      borderRadius: "10px",
                      background: "#fff9e9",
                      border:
                        "1px solid #e6d8ac",
                      color: "#675328",
                      fontSize: "12px",
                      lineHeight: 1.5,
                    }}
                  >
                    {atHeightMax ||
                    atWeightMax ? (
                      <strong>
                        Maximum{" "}
                        {atHeightMax &&
                        atWeightMax
                          ? "height and weight"
                          : atHeightMax
                          ? "height"
                          : "weight"}{" "}
                        preview reached for
                        the selected garment
                        size. You can move the
                        slider backward, but
                        not beyond its maximum.
                      </strong>
                    ) : fitLimits.hasHeight ||
                      fitLimits.hasWeight ? (
                      <span>
                        Garment size limits
                        are active on the
                        existing Height and
                        Weight controls where
                        seller data is
                        available.
                      </span>
                    ) : (
                      <span>
                        No verified height
                        or weight limits were
                        provided for these
                        garments. Your normal
                        slider limits remain
                        available; clothing
                        size alone cannot
                        determine body weight
                        or height.
                      </span>
                    )}
                  </div>
                )}

                {/* BODY PROPORTIONS */}

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
                    updateAvatar(
                      "waist",
                      value
                    )
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
                    updateAvatar(
                      "hip",
                      value
                    )
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
                    updateAvatar(
                      "thigh",
                      value
                    )
                  }
                />

                {/* SKIN TONE */}

                <div className="studio-skin-section">
                  <span>
                    Skin Tone
                  </span>

                  <div className="studio-skin-options">
                    {SKIN_TONES.map(
                      (skinTone) => (
                        <button
                          key={
                            skinTone.name
                          }
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
                          aria-pressed={
                            avatar.skinTone ===
                            skinTone.value
                          }
                          aria-label={
                            skinTone.name
                          }
                          title={
                            skinTone.name
                          }
                        />
                      )
                    )}
                  </div>
                </div>

                <ControlGroup
                  label="Undertone"
                  value={
                    avatar.undertone
                  }
                  options={[
                    "Warm",
                    "Cool",
                    "Neutral",
                  ]}
                  onChange={(value) =>
                    updateAvatar(
                      "undertone",
                      value
                    )
                  }
                />

                <button
                  type="button"
                  className={
                    isGuest
                      ? "studio-registration-button"
                      : "studio-save-preset"
                  }
                  onClick={
                    handleSavePreset
                  }
                >
                  {isGuest
                    ? "Registration Required to Save"
                    : "Save Avatar Preset"}
                </button>
              </div>
            ) : (
              /* RECOMMENDATIONS */

              <div className="studio-recommendations-panel">
                <p className="studio-recommendation-note">
                  Select Try Item to
                  preview clothing on your
                  avatar. Click a catalog
                  product name to view its
                  details. Sample-only
                  picks are not linked to
                  real listings.
                </p>

                {catalogLoading && (
                  <p>
                    Loading catalog clothing...
                  </p>
                )}

                {(catalogRecommendations.length
                  ? catalogRecommendations
                  : RECOMMENDED_ITEMS.map(
                      (item) => ({
                        ...item,
                        sampleOnly: true,
                      })
                    )
                ).map((item) => (
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
                      <h3>
                        {item.sampleOnly ? (
                          <span
                            title="Sample preview — not linked to a real catalog listing"
                          >
                            {item.name} (Sample)
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="studio-product-link"
                            onClick={() =>
                              openProductDetails(
                                item
                              )
                            }
                            style={{
                              border: 0,
                              padding: 0,
                              background:
                                "none",
                              color:
                                "inherit",
                              textDecoration:
                                "underline",
                              textUnderlineOffset:
                                "3px",
                              cursor:
                                "pointer",
                              font:
                                "inherit",
                              textAlign:
                                "left",
                            }}
                            title="View product details"
                          >
                            {item.name}
                          </button>
                        )}
                      </h3>

                      <p>
                        {item.store}
                      </p>

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
                ))}
              </div>
            )}
          </section>

          {/* AVATAR PREVIEW — CANVAS 2D */}

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
                  aria-pressed={
                    currentView === view
                  }
                  onClick={() =>
                    setCurrentView(
                      view
                    )
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
              <AvatarCanvas
                avatar={avatar}
                view={currentView}
                equippedItems={
                  equippedItems
                }
              />

              <div className="studio-avatar-summary">
                <div>
                  <span>
                    Gender
                  </span>

                  <strong>
                    {avatar.gender}
                  </strong>
                </div>

                <div>
                  <span>
                    Height
                  </span>

                  <strong>
                    {avatar.height} cm
                  </strong>
                </div>

                <div>
                  <span>
                    Weight
                  </span>

                  <strong>
                    {avatar.weight} kg
                  </strong>
                </div>
              </div>
            </div>
          </section>

          {/* EQUIPPED ITEMS */}

          <aside className="studio-equipped-card">
            <h2>
              EQUIPPED ITEMS
            </h2>

            {equippedItemsArray.length ===
            0 ? (
              <div className="studio-empty-equipped">
                <span
                  aria-hidden="true"
                >
                  ◇
                </span>

                <h3>
                  No clothing equipped
                </h3>

                <p>
                  {isGuest
                    ? "Open Recommendations to try a sample clothing item on your avatar."
                    : "Open Recommendations and select Try Item."}
                </p>
              </div>
            ) : (
              <div className="studio-equipped-list">
                {Object.entries(
                  equippedItems
                ).map(
                  ([
                    category,
                    item,
                  ]) =>
                    item && (
                      <article
                        key={
                          category
                        }
                        className="studio-equipped-item"
                      >
                        <div>
                          <span>
                            {category}
                          </span>

                          <strong>
                            {item.sampleOnly ? (
                              item.name
                            ) : (
                              <button
                                type="button"
                                className="studio-product-link"
                                onClick={() =>
                                  openProductDetails(
                                    item
                                  )
                                }
                                style={{
                                  border: 0,
                                  padding: 0,
                                  background:
                                    "none",
                                  color:
                                    "inherit",
                                  textDecoration:
                                    "underline",
                                  textUnderlineOffset:
                                    "3px",
                                  cursor:
                                    "pointer",
                                  font:
                                    "inherit",
                                  fontWeight:
                                    "inherit",
                                  textAlign:
                                    "left",
                                }}
                                title="View product details"
                              >
                                {item.name}
                              </button>
                            )}
                          </strong>

                          <small>
                            Size{" "}
                            {item.size}
                            {" • "}
                            {item.color}
                          </small>

                          <RatingControl
                            key={`${category}-${item.id}`}
                            itemId={
                              item.id
                            }
                            isEquipped={
                              Boolean(
                                item
                              )
                            }
                            authState={
                              isGuest
                                ? null
                                : readAuthState()
                            }
                            onGuestRate={
                              openRegistrationPopup
                            }
                          />
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
              className="studio-open-recommendations"
              onClick={
                handleRecommendations
              }
            >
              {isGuest
                ? "Browse Sample Picks"
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
              onClick={
                continueToCart
              }
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

      {/* SAVE AVATAR PRESET POPUP */}

      {showSaveAvatarModal &&
        !isGuest && (
          <div
            className="studio-modal-backdrop"
            role="presentation"
            onMouseDown={(
              event
            ) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeSaveAvatarModal();
              }
            }}
          >
            <section
              className="studio-save-outfit-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="studio-avatar-preset-title"
            >
              <button
                type="button"
                className="studio-modal-close"
                onClick={
                  closeSaveAvatarModal
                }
                aria-label="Close save avatar preset popup"
              >
                ×
              </button>

              <p className="studio-modal-label">
                SAVE YOUR AVATAR
              </p>

              <h2 id="studio-avatar-preset-title">
                Save Avatar Preset
              </h2>

              <p className="studio-modal-description">
                Enter a name for your
                customized avatar
                before saving it to
                Avatar Presets.
              </p>

              <form
                onSubmit={
                  confirmSaveAvatarPreset
                }
                noValidate
              >
                <label
                  className="studio-save-outfit-field"
                  htmlFor="studio-avatar-preset-name"
                >
                  Preset Name{" "}
                  <span>*</span>
                </label>

                <input
                  id="studio-avatar-preset-name"
                  type="text"
                  className={`studio-save-outfit-input ${
                    avatarPresetNameError
                      ? "invalid"
                      : ""
                  }`}
                  value={
                    avatarPresetName
                  }
                  onChange={(
                    event
                  ) => {
                    setAvatarPresetName(
                      event.target.value
                    );
                    setAvatarPresetNameError(
                      ""
                    );
                  }}
                  placeholder="e.g. My Everyday Avatar"
                  maxLength={50}
                  autoFocus
                  required
                  aria-invalid={
                    Boolean(
                      avatarPresetNameError
                    )
                  }
                  aria-describedby={
                    avatarPresetNameError
                      ? "studio-avatar-preset-name-error"
                      : undefined
                  }
                />

                <div className="studio-save-outfit-hint">
                  {avatarPresetNameError ? (
                    <span
                      id="studio-avatar-preset-name-error"
                      className="studio-save-outfit-error"
                      role="alert"
                    >
                      {avatarPresetNameError}
                    </span>
                  ) : (
                    <span>
                      Required field
                    </span>
                  )}

                  <span>
                    {
                      avatarPresetName.length
                    }
                    /50
                  </span>
                </div>

                <div className="studio-save-outfit-actions">
                  <button
                    type="button"
                    className="studio-save-cancel-button"
                    onClick={
                      closeSaveAvatarModal
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="studio-save-confirm-button"
                  >
                    Save Preset
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

      {/* SAVE OUTFIT POPUP */}

      {showSaveOutfitModal &&
        !isGuest && (
          <div
            className="studio-modal-backdrop"
            role="presentation"
            onMouseDown={(
              event
            ) => {
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
                onClick={
                  closeSaveOutfitModal
                }
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
                Give your outfit a
                name so you can
                easily find it in
                Saved Outfits.
              </p>

              <form
                onSubmit={
                  confirmSaveOutfit
                }
                noValidate
              >
                <label
                  className="studio-save-outfit-field"
                  htmlFor="studio-outfit-name"
                >
                  Outfit Name{" "}
                  <span>*</span>
                </label>

                <input
                  id="studio-outfit-name"
                  type="text"
                  className={`studio-save-outfit-input ${
                    outfitNameError
                      ? "invalid"
                      : ""
                  }`}
                  value={
                    outfitName
                  }
                  onChange={(
                    event
                  ) => {
                    setOutfitName(
                      event.target.value
                    );
                    setOutfitNameError(
                      ""
                    );
                  }}
                  placeholder="e.g. Weekend Casual"
                  maxLength={50}
                  autoFocus
                  required
                  aria-invalid={
                    Boolean(
                      outfitNameError
                    )
                  }
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
                      {
                        outfitNameError
                      }
                    </span>
                  ) : (
                    <span>
                      Required field
                    </span>
                  )}

                  <span>
                    {outfitName.length}
                    /50
                  </span>
                </div>

                <div className="studio-save-outfit-actions">
                  <button
                    type="button"
                    className="studio-save-cancel-button"
                    onClick={
                      closeSaveOutfitModal
                    }
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
          onMouseDown={(
            event
          ) => {
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
              Unlock the complete
              fitting experience
            </h2>

            <p className="studio-modal-description">
              Create an account or
              log in to save avatar
              presets and outfits,
              and add clothing items
              to your cart. You can
              continue trying clothing
              as a Guest.
            </p>

            <div className="studio-modal-actions">
              <button
                type="button"
                className="studio-modal-primary"
                onClick={() =>
                  navigate(
                    "/signup"
                  )
                }
              >
                Create Account
              </button>

              <button
                type="button"
                className="studio-modal-secondary"
                onClick={() =>
                  navigate(
                    "/login"
                  )
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
