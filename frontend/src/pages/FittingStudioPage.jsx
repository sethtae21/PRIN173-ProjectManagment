  import { useEffect, useMemo, useRef, useState } from "react";
  import { useNavigate } from "react-router-dom";
  import {
    presetsApi,
    outfitsApi,
    bodyProportion,
    fetchRankedRecommendations,
    loadMatchReasons,
    SIZE_RANGE_TABLE,
    sizeForBodyBuild,
    getAccessToken,
    STYLE_FOCUS_OPTIONS,
    ratingsApi,
    API_URL,
    authApi, // embedded accounts_user survey submission
  } from "../services/api";
  import {
    UAT_PAIRED_QUESTIONS,
    UAT_PHASES,
    RATING_SOURCES,
    RATING_TARGET_TYPES,
    isUATAnswer,
    uatSessionStorageKey,
    STUDIO_SURVEY_QUESTIONS,
    STUDIO_GUEST_CTA,
  } from "../services/uat";
  import RatingControl from "../components/RatingControl";
  import AvatarCanvas from "./Shopper/AvatarCanvas";
  import "./css/FittingStudioPage.css";

  const UAT_SURVEY_ENABLED = false; // set true to restore UAT pre/post survey popups

  const SKIN_TONES = [
    { name: "Light", value: "#f1c9a5" },
    { name: "Warm", value: "#dca77d" },
    { name: "Medium", value: "#bd8058" },
    { name: "Deep", value: "#855338" },
  ];

  const ITEMS_PER_PAGE = 10;

  const STUDIO_VIEWS = ["Front", "Rear"];
  const STUDIO_SESSION_PREFIX = "fitfusion-fitting-studio-session-";
  const STUDIO_PENDING_PREFIX = "fitfusion-fitting-studio-pending-item-";

  // NEW (popup redesign): 3 minutes of idle time triggers the post-session
  // popup so the pre/post delta is captured even when the shopper neither
  // saves an outfit nor leaves the page.
  const POST_SURVEY_IDLE_MS = 180000;

  // CHANGED (charter-aligned UAT): questionnaire now comes from the shared
  // contract in services/uat.js — keys are the backend contract, prompts stay
  // here for UI wording only.
  const UAT_QUESTIONS = UAT_PAIRED_QUESTIONS;

  const UAT_AFTER_EXTRA_QUESTIONS = [
    {
      key: "responsiveness",
      prompt: "How responsive did the virtual try-on canvas feel when switching items or views?",
      lowLabel: "Very slow",
      highLabel: "Very responsive",
    },
    {
      key: "privacy_comfort",
      prompt: "How comfortable did you feel using the avatar creator without uploading a personal photo?",
      lowLabel: "Very uncomfortable",
      highLabel: "Very comfortable",
    },
    {
      key: "style_discovery",
      prompt: "Did the recommendations introduce you to a color or style you wouldn't normally have considered?",
      lowLabel: "No",
      highLabel: "Yes",
      isBoolean: true,
    },
    {
      key: "match_helpfulness",
      prompt: "How helpful were the Match Reasons in understanding why an item was recommended?",
      lowLabel: "Not at all helpful",
      highLabel: "Very helpful",
    },
  ];

  const HEIGHT_RANGE = { min: 120, max: 218 };
  const WEIGHT_RANGE = { min: 30, max: 200 };

  const BODY_BUILDS = ["Slim", "Balanced", "Full", "Curve"];
  const BUILD_BMI = {
    Slim: 17.5,
    Balanced: 21.7,
    Full: 27.5,
    Curve: 32,
  };

  // KAN-FIX: The rule id "styleOccasion" is kept to map to the frozen backend
  // rule id (style_occasion / WEIGHTS untouched), but the UI label is now
  // "Style match" since occasion_tags were removed from the pipeline.
  const MATCH_CATEGORIES = [
    { key: "colorCompatibility", label: "Color compatibility" },
    { key: "heightContrast", label: "Height contrast" },
    { key: "proportionShading", label: "Proportion shading" },
    { key: "styleOccasion", label: "Style match" },
  ];

  // FIX (dress on male): one-piece DRESS-class cuts are female-only in this
  // catalog (SRS FR-3.1 category list: Tops/Bottoms/Dresses/Outerwear).
  // Gate on the RAW CATEGORY token only -- never the product NAME (a "dress
  // shirt" is menswear) and never the backend gender tag (seed data mis-tags
  // approved menswear, e.g. the blazer, as "Women"). Deterministic, no ML.
  const FEMALE_ONLY_CATEGORY_PATTERN = /dress|gown|jumpsuit|romper|one-?piece/i;

  function isFemaleOnlyItem(item) {
    if (!item) return false;
    if (item.femaleOnlyCut === true) return true;
    return FEMALE_ONLY_CATEGORY_PATTERN.test(String(item.rawCategory || ""));
  }

  function normalizeGender(value) {
    return String(value).toLowerCase() === "male" ? "Male" : "Female";
  }

  function avatarGenderAllowsItem(avatarGender, item) {
    if (normalizeGender(avatarGender) !== "Male") return true; // female: show all
    return !isFemaleOnlyItem(item);
  }

  // Strip any female-only cut already sitting in an equipped slot (e.g. a dress
  // restored from a pre-fix session) so it cannot paint on a male body.
  function sanitizeEquipped(equipped, avatarGender) {
    if (!equipped || typeof equipped !== "object") {
      return { top: null, bottom: null };
    }

    const next = {
      top: equipped.top || null,
      bottom: equipped.bottom || null,
    };

    if (normalizeGender(avatarGender) !== "Male") return next;

    for (const key of Object.keys(next)) {
      if (next[key] && isFemaleOnlyItem(next[key])) {
        next[key] = null;
      }
    }

    return next;
  }

  // Surface the REAL server validation message (KAN-115 UAT feedback) instead of
  // a generic string, so a contract mismatch (e.g. a 400 keyed on `items`) is
  // visible to the user and to testers. The API layer throws an ApiError whose
  // .message is already the joined "field: reason | field: reason" form; we also
  // handle a raw .data object defensively.
  function extractApiError(error, fallback) {
    const data = error?.data ?? error?.response?.data;

    if (data && typeof data === "object") {
      const parts = [];
      for (const [field, value] of Object.entries(data)) {
        if (Array.isArray(value)) {
          parts.push(`${field}: ${value.join(", ")}`);
        } else if (typeof value === "string") {
          parts.push(`${field}: ${value}`);
        }
      }
      if (parts.length) return parts.join(" | ");
      if (typeof data.detail === "string") return data.detail;
    }

    if (typeof error?.message === "string" && error.message) {
      return error.message;
    }

    return fallback;
  }

  function sessionKey(isGuest) {
    return `${STUDIO_SESSION_PREFIX}${isGuest ? "guest" : "shopper"}`;
  }

  function pendingKey(isGuest) {
    return `${STUDIO_PENDING_PREFIX}${isGuest ? "guest" : "shopper"}`;
  }

  function readJson(storage, key) {
    try {
      return JSON.parse(storage.getItem(key) || "null");
    } catch {
      return null;
    }
  }

  function readStudioSession(isGuest) {
    const session = readJson(sessionStorage, sessionKey(isGuest));
    return session && typeof session === "object" ? session : null;
  }

  // FIX (stale look after sidebar hops): the studio no longer writes
  // equippedItems into its own session, so the `equippedGender` stamp now also
  // acts as a writer marker. A session WITHOUT the stamp can only come from an
  // external flow writer (Saved Outfits -> "Open Fitting Studio", FR-5.6);
  // those looks are re-equipped. Everything else starts empty.
  function sessionNeedsEquipReset(session, storedGender, avatarGender) {
    if (!session || typeof session !== "object") return false;

    const equippedGender = session.equippedGender
      ? normalizeGender(session.equippedGender)
      : null;

    if (equippedGender && equippedGender !== normalizeGender(avatarGender)) {
      return true;
    }

    const sessionGender = session.avatar?.gender
      ? normalizeGender(session.avatar.gender)
      : null;

    if (storedGender && sessionGender && storedGender !== sessionGender) {
      return true;
    }

    return false;
  }

  function calculateBodyType(height, weight) {
    const meters = Number(height) / 100;
    const mass = Number(weight);

    if (
      !Number.isFinite(meters) ||
      !Number.isFinite(mass) ||
      meters <= 0 ||
      mass <= 0
    ) {
      return "Balanced";
    }

    const index = mass / (meters * meters);

    if (index < 18.5) return "Slim";
    if (index < 25) return "Balanced";
    if (index < 30) return "Full";

    return "Curve";
  }

  function weightForBuild(build, height) {
    const meters = Number(height) / 100;

    if (!Number.isFinite(meters) || meters <= 0) return 55;

    const bmi = BUILD_BMI[build] ?? 21.7;
    const raw = bmi * meters * meters;

    return Math.min(
      WEIGHT_RANGE.max,
      Math.max(WEIGHT_RANGE.min, Math.round(raw * 10) / 10)
    );
  }

  function normalizeCategory(category) {
    const label = String(category || "").toLowerCase();

    if (/pant|trouser|jean|short|skirt|bottom/.test(label)) {
      return "bottom";
    }

    if (/^(top|tops|dress|dresses|outerwear)$/.test(label)) {
      return "top";
    }

    return null;
  }

  function mediaUrl(path) {
    if (!path) return "";
    const raw = String(path);
    if (raw.startsWith("http")) return raw;
    return raw.startsWith("/") ? raw : `/${raw}`;
  }

  // Normalize backend recommendation payload into the internal item structure.
  // Preserve the RAW category + a femaleOnlyCut flag so the gender gate survives
  // the category collapse (a dress would otherwise be relabelled "top").
  function normalizeStudioItem(item) {
    if (!item || typeof item !== "object") return null;

    const id = item.id ?? item.item_id ?? item.product_id;

    if (id === undefined || id === null) return null;

    const rawCategory = String(item.category || "");
    const resolvedName = item.name || item.product_name || "Clothing item";
    const category = normalizeCategory(rawCategory);

    if (!category) return null;

    return {
      ...item,
      id,
      name: resolvedName,
      store:
        item.store ||
        item.store_name ||
        item.sellerName ||
        "FitFusion Store",
      category,
      rawCategory,
      femaleOnlyCut: FEMALE_ONLY_CATEGORY_PATTERN.test(rawCategory),
      size: String(
        item.selectedSize || item.availableSize || item.size || "M"
      ).toUpperCase(),
      catalogSize: String(item.size || "").toUpperCase(),
      color: item.selectedColor || item.color || "Unspecified",
      price: Number(item.price || 0),
      image: mediaUrl(
        item.image || item.front_image || item.frontImageUrl || ""
      ),
      total_score: item.total_score,
      max_score: item.max_score,
      size_cm: item.size_cm,
    };
  }

  function matchesAvatarSize(item, avatarSize) {
    if (!item) return false;
    const garmentSize = String(
      item.catalogSize || item.size || ""
    ).toUpperCase();
    return (
      garmentSize !== "" &&
      garmentSize === String(avatarSize || "").toUpperCase()
    );
  }

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
            String(entry?.size || entry?.label || "").toUpperCase() === size
        ) || null
      );
    }

    if (source && typeof source === "object") {
      return source[size] || source[size.toLowerCase()] || source;
    }

    return item;
  }

  function finiteNumber(value) {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function readRange(record, type, globalRange) {
    const unit = type === "height" ? "cm" : "kg";
    const unitCapitalized = type === "height" ? "Cm" : "Kg";

    const nested =
      record?.[type] && typeof record[type] === "object" ? record[type] : {};

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

    if (minimum === null && maximum === null) return null;

    const low = Math.max(globalRange.min, minimum ?? globalRange.min);
    const high = Math.min(globalRange.max, maximum ?? globalRange.max);

    if (low > high) return { invalid: true };

    return { min: low, max: high, hasMaximum: maximum !== null };
  }

  function limitsForItem(item) {
    const record = sizeRecordFor(item);

    if (!record) return { height: null, weight: null };

    return {
      height: readRange(record, "height", HEIGHT_RANGE),
      weight: readRange(record, "weight", WEIGHT_RANGE),
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

    for (const item of Object.values(items).filter(Boolean)) {
      const ranges = limitsForItem(item);

      for (const type of ["height", "weight"]) {
        const range = ranges[type];

        if (!range) continue;

        if (range.invalid) {
          limits.incompatible = true;
          continue;
        }

        limits[type].min = Math.max(limits[type].min, range.min);
        limits[type].max = Math.min(limits[type].max, range.max);

        if (type === "height") {
          limits.hasHeight = true;
          if (range.hasMaximum) limits.hasHeightMaximum = true;
        } else {
          limits.hasWeight = true;
          if (range.hasMaximum) limits.hasWeightMaximum = true;
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
    return Math.min(range.max, Math.max(range.min, Number(value) || range.min));
  }

  function applyFitLimits(avatar, limits) {
    return {
      ...avatar,
      height: String(clamp(avatar.height, limits.height)),
      weight: String(clamp(avatar.weight, limits.weight)),
    };
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(amount);
  }

  // FIX (registration popup shown to logged-in shoppers): the unified session
  // (services/session.js) stores the JWT under fitfusion.session.v1; the legacy
  // localStorage "access_token" key is never written anymore, so the old check
  // always returned null and RatingControl took its guest path (FR-7.5 prompt).
  // Derive the auth state from the canonical session token; guests (isGuest)
  // still receive null from the caller.
  function readAuthState() {
    if (!getAccessToken()) return null;

    try {
      const user = JSON.parse(
        localStorage.getItem("fitfusion-current-user") || "null"
      );
      return user || {};
    } catch {
      return {};
    }
  }

  function readStoredGender(isGuest) {
    const storage = isGuest ? sessionStorage : localStorage;
    const genderKey = isGuest
      ? "fitfusion-guest-avatar-gender"
      : "fitfusion-avatar-gender";
    const raw = String(storage.getItem(genderKey) || "").trim().toLowerCase();
    if (raw === "male") return "Male";
    if (raw === "female") return "Female";
    return "";
  }

  function getCurrentUserId() {
    try {
      const rawSession = localStorage.getItem("fitfusion.session.v1");
      const session = rawSession ? JSON.parse(rawSession) : null;
      const user = session?.user || JSON.parse(localStorage.getItem("fitfusion-current-user") || "null");
      if (user && typeof user === "object") {
        return String(user.id ?? user.user_id ?? user.pk ?? user.email ?? "guest");
      }
    } catch {
      // ignore parse issues and fall back to a guest-scoped key
    }
    return "guest";
  }

  function uatPhaseStorageKey(productId, phase) {
    return `fitfusion-uat-${phase}-${getCurrentUserId()}-${productId}`;
  }

  function readUatSession() {
    try {
      const value = JSON.parse(localStorage.getItem(uatSessionStorageKey(getCurrentUserId())) || "null");
      return value && typeof value === "object" ? value : null;
    } catch {
      return null;
    }
  }

  function readUatPhaseAnswers(productId, phase) {
    try {
      const raw = JSON.parse(localStorage.getItem(uatPhaseStorageKey(productId, phase)) || "{}") || {};
      return typeof raw === "object" ? raw : {};
    } catch {
      return {};
    }
  }

  function saveUatPhaseAnswers(productId, phase, answers) {
    if (!productId) return;
    localStorage.setItem(uatPhaseStorageKey(productId, phase), JSON.stringify(answers));
  }

  function uatCompletionStorageKey() {
    return `fitfusion-uat-completed-${getCurrentUserId()}`;
  }

  function readUatCompletionMap() {
    try {
      const raw = JSON.parse(localStorage.getItem(uatCompletionStorageKey()) || "{}") || {};
      return raw && typeof raw === "object" ? raw : {};
    } catch {
      return {};
    }
  }

  function saveUatCompletionMap(value) {
    localStorage.setItem(uatCompletionStorageKey(), JSON.stringify(value || {}));
  }

  function reconcileAvatarGender(avatar, isGuest) {
    const saved = readStoredGender(isGuest);

    if (!saved || !avatar || avatar.gender === saved) {
      return avatar;
    }

    return {
      ...avatar,
      gender: saved,
      cupSize: saved === "Female" ? avatar.cupSize || "B" : null,
    };
  }

  function activePresetKey(isGuest) {
    return isGuest
      ? "fitfusion-guest-avatar-preset"
      : "fitfusion-avatar-preset";
  }

  // NEW: id of the preset last activated via "Use" (Avatar Presets, dashboard
  // Continue Fitting Session, preset editor). The studio compares it against
  // the session's avatarPresetId stamp to detect a freshly activated body.
  function readActivePresetId(isGuest) {
    const storage = isGuest ? sessionStorage : localStorage;
    const saved = readJson(storage, activePresetKey(isGuest));
    const id = saved?.id ?? saved?.presetId;
    return id === undefined || id === null ? null : String(id);
  }

  function choiceValue(value) {
    return String(value || "").trim().toLowerCase();
  }

  function capitalizeChoice(value, fallback) {
    const text = String(value || "").trim();
    if (!text) return fallback;
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  // ADDED (exact-size persistence): one-decimal / two-decimal preservers that
  // REPLACE the old toWholeCm() integer snapping. The AvatarPreset model now
  // uses FloatField for height / weight / body_build_cm, so the slider's exact
  // value (e.g. 177.4 cm, 95.7 cm) is stored and displayed un-rounded.
  function round1(value, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.round(number * 10) / 10;
  }

  function round2(value, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.round(number * 100) / 100;
  }

  // CHANGED (preset fidelity + exact decimals): the studio save payload carries
  //   * height        : one decimal (177.4), not rounded to 177
  //   * weight        : two decimals, exact kg derived from the build slider
  //   * body_build_cm : one decimal (95.7), not rounded to 96
  //   * style_focus   : the shopper's dressing-for context
  function toServerPreset(avatar, name, isFemale) {
    return {
      name,
      gender: choiceValue(avatar.gender),
      height: round1(avatar.height, 160),
      weight: round2(avatar.weight, 55),
      skin_tone: avatar.skinTone || "#dca77d",
      undertone: choiceValue(avatar.undertone),
      shoulder: choiceValue(avatar.shoulder),
      waist: choiceValue(avatar.waist),
      hip: choiceValue(avatar.hip),
      thigh: choiceValue(avatar.thigh),
      cup_size: isFemale ? avatar.cupSize || "B" : null,
      body_build_cm: round1(
        weightToVisualBuild(avatar.height, avatar.weight),
        99
      ),
      style_focus: choiceValue(avatar.styleFocus),
    };
  }

  // CHANGED: map the persisted style_focus / body_build_cm back into the local
  // active-preset cache object so loadAvatar() adopts the saved Style Focus and
  // the cache stays consistent with the server record.
  function fromServerPreset(record) {
    const gender = normalizeGender(record?.gender);

    return {
      id: String(record?.id || record?.presetId || ""),
      name: String(record?.name || "Custom Avatar"),
      gender,
      height: String(record?.height ?? "160"),
      weight: String(record?.weight ?? "55"),
      skinTone: record?.skin_tone || record?.skinTone || "#dca77d",
      undertone: capitalizeChoice(record?.undertone, "Neutral"),
      shoulder: capitalizeChoice(record?.shoulder, "Average"),
      waist: capitalizeChoice(record?.waist, "Average"),
      hip: capitalizeChoice(record?.hip, "Average"),
      thigh: capitalizeChoice(record?.thigh, "Average"),
      cupSize:
        gender === "Female"
          ? capitalizeChoice(record?.cup_size || record?.cupSize, "B")
          : null,
      styleFocus: capitalizeChoice(
        record?.style_focus || record?.styleFocus,
        "Casual"
      ),
      bodyBuildCm: Number(record?.body_build_cm ?? record?.bodyBuildCm) || 99,
      builtIn: false,
    };
  }

  function loadAvatar(isGuest) {
    const storage = isGuest ? sessionStorage : localStorage;
    const genderKey = isGuest
      ? "fitfusion-guest-avatar-gender"
      : "fitfusion-avatar-gender";
    const savedPreset = readJson(storage, activePresetKey(isGuest));

    return {
      gender: normalizeGender(
        storage.getItem(genderKey) || savedPreset?.gender || "Female"
      ),
      height: savedPreset?.height || "160",
      weight: savedPreset?.weight || "55",
      shoulder: capitalizeChoice(savedPreset?.shoulder, "Average"),
      waist: capitalizeChoice(savedPreset?.waist, "Average"),
      hip: capitalizeChoice(savedPreset?.hip, "Average"),
      cupSize: savedPreset?.cupSize || "B",
      thigh: capitalizeChoice(savedPreset?.thigh, "Average"),
      skinTone:
        savedPreset?.skinTone || savedPreset?.skin_tone || "#dca77d",
      undertone: capitalizeChoice(savedPreset?.undertone, "Neutral"),
      // FIX (style_occasion always 0): the shopper's dressing-for context is a
      // first-class avatar field; api.js maps it to approved style tags and
      // sends them with every recommendation / match-reasons request.
      styleFocus: savedPreset?.styleFocus || "Casual",
    };
  }

  function validateMatchDetails(details) {
    if (!details || typeof details !== "object") {
      throw new Error("Match details unavailable");
    }

    return MATCH_CATEGORIES.map(({ key, label }) => {
      const entry = details[key];

      if (
        !entry ||
        typeof entry.score !== "number" ||
        typeof entry.maxScore !== "number" ||
        !Number.isFinite(entry.score) ||
        !Number.isFinite(entry.maxScore) ||
        entry.maxScore <= 0 ||
        entry.score < 0 ||
        entry.score > entry.maxScore ||
        typeof entry.reason !== "string" ||
        !entry.reason.trim()
      ) {
        throw new Error(`Missing or invalid match detail: ${key}`);
      }

      return {
        key,
        label,
        score: entry.score,
        maxScore: entry.maxScore,
        reason: entry.reason.trim(),
      };
    });
  }

  function ControlGroup({ label, value, options, onChange }) {
    return (
      <div className="studio-control-group">
        <span>{label}</span>
        <div>
          {options.map((option) => (
            <button
              key={option}
              type="button"
              className={value === option ? "active" : ""}
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

  const CROP_THRESHOLD_STEPS = [128, 64, 32, 12];

  function alphaBBox(data, w, h, threshold) {
    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        if (data[(y * w + x) * 4 + 3] > threshold) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < minX || maxY < minY) return null;

    return { minX, minY, maxX, maxY };
  }

  function computeCropDataURL(img) {
    const w = img.naturalWidth;
    const h = img.naturalHeight;

    if (!w || !h) return null;

    const scale = Math.min(1, 256 / Math.max(w, h));
    const sw = Math.max(1, Math.round(w * scale));
    const sh = Math.max(1, Math.round(h * scale));

    const probe = document.createElement("canvas");
    probe.width = sw;
    probe.height = sh;

    const pctx = probe.getContext("2d", { willReadFrequently: true });
    pctx.drawImage(img, 0, 0, sw, sh);

    const data = pctx.getImageData(0, 0, sw, sh).data;

    let box = null;

    for (const threshold of CROP_THRESHOLD_STEPS) {
      box = alphaBBox(data, sw, sh, threshold);
      if (box) break;
    }

    if (!box) return null;

    const inv = 1 / scale;
    const pad = Math.round(Math.max(2, (box.maxX - box.minX) * 0.05));

    const sx = Math.max(0, Math.floor((box.minX - pad) * inv));
    const sy = Math.max(0, Math.floor((box.minY - pad) * inv));
    const ex = Math.min(w, Math.ceil((box.maxX + pad) * inv));
    const ey = Math.min(h, Math.ceil((box.maxY + pad) * inv));

    const cw = ex - sx;
    const ch = ey - sy;

    if (cw <= 0 || ch <= 0) return null;

    const out = document.createElement("canvas");
    out.width = cw;
    out.height = ch;
    out.getContext("2d").drawImage(img, sx, sy, cw, ch, 0, 0, cw, ch);

    return out.toDataURL("image/png");
  }

  function RecommendationThumb({ item }) {
    const [displaySrc, setDisplaySrc] = useState(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
      let active = true;

      setDisplaySrc(null);
      setFailed(false);

      if (!item.image) return undefined;

      const img = new Image();

      img.onload = () => {
        if (!active) return;
        try {
          const cropped = computeCropDataURL(img);
          setDisplaySrc(cropped || item.image);
        } catch {
          setDisplaySrc(item.image);
        }
      };

      img.onerror = () => {
        if (active) setFailed(true);
      };

      img.src = item.image;

      return () => {
        active = false;
      };
    }, [item.image]);

    return (
      <div
        className={`studio-clothing-thumbnail ${item.category}`}
        aria-hidden="true"
      >
        {displaySrc && !failed ? (
          <img
            src={displaySrc}
            alt={item.name}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
            onError={() => setFailed(true)}
          />
        ) : (
          <span />
        )}
      </div>
    );
  }

  // CHANGED (multi-item match reasons): one self-contained section per item.
  // Each section owns its own fetch of the FR-7.2 breakdown so the sweater and
  // the jeans can be expanded, loaded, retried and collapsed independently.
  function MatchReasonSection({
    item,
    avatar,
    isGuest,
    expanded,
    onToggle,
    loadMatchReasonsService,
    onBrowse,
    onTryItem,
  }) {
    const [requestCount, setRequestCount] = useState(0);
    const [result, setResult] = useState({
      status: "idle",
      rows: [],
      context: "",
    });

    const context = JSON.stringify({ item, avatar, isGuest });
    const previousContext = useRef(context);

    // Discard stale rows the moment this section's item/avatar context moves.
    useEffect(() => {
      if (previousContext.current === context) return;
      previousContext.current = context;
      setResult({ status: "idle", rows: [], context: "" });
    }, [context]);

    useEffect(() => {
      if (!expanded || !item) return undefined;

      const controller = new AbortController();
      let active = true;

      setResult({ status: "loading", rows: [], context });

      async function fetchMatchDetails() {
        try {
          if (typeof loadMatchReasonsService !== "function") {
            throw new Error("Match service has not been connected");
          }

          const details = await loadMatchReasonsService({
            item,
            avatar: { ...avatar },
            isGuest,
            signal: controller.signal,
          });

          const rows = validateMatchDetails(details);

          if (active) {
            setResult({ status: "success", rows, context });
          }
        } catch (error) {
          if (!active || controller.signal.aborted) return;
          console.warn("Unable to load match reasons:", error);
          setResult({ status: "error", rows: [], context: "" });
        }
      }

      fetchMatchDetails();

      return () => {
        active = false;
        controller.abort();
      };
    }, [
      expanded,
      requestCount,
      context,
      item,
      avatar,
      isGuest,
      loadMatchReasonsService,
    ]);

    const currentResult =
      result.context === context ? result : { status: "idle", rows: [] };

    const loading =
      expanded &&
      (currentResult.status === "loading" || currentResult.status === "idle");

    const breakdownId = `studio-match-breakdown-${item.id}`;

    return (
      <article className="studio-match-item-card">
        <div className="studio-match-item-title">
          <span>{item.category}</span>
          <h3>{item.name}</h3>
          <p>{item.store}</p>
        </div>

        <button
          type="button"
          className="studio-match-primary-button"
          aria-expanded={expanded}
          aria-controls={breakdownId}
          onClick={onToggle}
        >
          {expanded ? "Hide Match Reasons" : "View Match Reasons"}
          <span aria-hidden="true">{expanded ? "−" : "+"}</span>
        </button>

        {expanded && (
          <div
            id={breakdownId}
            className="studio-match-breakdown"
            aria-busy={loading}
          >
            {loading && (
              <p className="studio-match-status" role="status">
                Loading match details...
              </p>
            )}

            {currentResult.status === "error" && (
              <div className="studio-match-error">
                <p role="alert">Match details unavailable. Please retry.</p>
                <button
                  type="button"
                  className="studio-match-outline-button"
                  onClick={() => setRequestCount((count) => count + 1)}
                >
                  Retry
                </button>
              </div>
            )}

            {currentResult.status === "success" && (
              <div className="studio-match-score-list">
                {currentResult.rows.map((row) => (
                  <article key={row.key} className="studio-match-score">
                    <div className="studio-match-score-heading">
                      <h3>{row.label}</h3>
                      <strong>
                        {row.score}/{row.maxScore}
                      </strong>
                    </div>
                    <meter
                      min={0}
                      max={row.maxScore}
                      value={row.score}
                      aria-label={`${row.label} score`}
                    >
                      {row.score} out of {row.maxScore}
                    </meter>
                    <p>{row.reason}</p>
                  </article>
                ))}
              </div>
            )}

            <div className="studio-match-actions">
              <button
                type="button"
                className="studio-match-outline-button"
                onClick={() => {
                  onToggle();
                  onBrowse();
                }}
              >
                Back to Recommendations
              </button>
              <button
                type="button"
                className="studio-match-primary-button"
                onClick={() => onTryItem(item)}
              >
                Try Item
              </button>
            </div>
          </div>
        )}
      </article>
    );
  }

  // CHANGED (slot-keyed match reasons): the card renders AT MOST ONE section
  // per body slot (top / bottom), in slot order. Trying on or reviewing a
  // garment replaces the previous card of its slot, so the panel shows one
  // upper-body card + one lower-body card and never a stale replaced garment.
  function MatchReasonsCard({
    items,
    avatar,
    isGuest,
    requestVersion,
    focusItemId,
    loadMatchReasonsService,
    onBrowse,
    onTryItem,
  }) {
    const itemIds = items.map((entry) => String(entry.id));
    const idsKey = itemIds.join("|");

    // FIX (saved outfits auto-expand): items already present on mount (e.g. a
    // look restored from Saved Outfits) open immediately so the scores are
    // visible without an extra click.
    const [expandedIds, setExpandedIds] = useState(() => itemIds);

    const avatarContext = JSON.stringify({ avatar, isGuest });
    const previousAvatarContext = useRef(avatarContext);
    const previousRequestVersion = useRef(requestVersion);

    // Preserve the old single-item behaviour: any avatar-profile change
    // collapses the open breakdowns (their scores no longer apply).
    useEffect(() => {
      if (previousAvatarContext.current === avatarContext) return;
      previousAvatarContext.current = avatarContext;
      setExpandedIds([]);
    }, [avatarContext]);

    // Expand the section whose row-level "View Match Reasons" was pressed.
    useEffect(() => {
      if (previousRequestVersion.current === requestVersion) return;
      previousRequestVersion.current = requestVersion;

      if (!focusItemId) return;

      const focus = String(focusItemId);
      setExpandedIds((current) =>
        current.includes(focus) ? current : [...current, focus]
      );
    }, [requestVersion, focusItemId]);

    // Drop expansions for items that left the list (slot replaced / unequip /
    // gender change).
    useEffect(() => {
      const valid = idsKey ? idsKey.split("|") : [];
      setExpandedIds((current) => current.filter((id) => valid.includes(id)));
    }, [idsKey]);

    function toggleExpanded(id) {
      setExpandedIds((current) =>
        current.includes(id)
          ? current.filter((entry) => entry !== id)
          : [...current, id]
      );
    }

    return (
      <section className="studio-match-card" aria-labelledby="studio-match-heading">
        <div className="studio-match-heading">
          <span className="studio-match-icon" aria-hidden="true">
            ✧
          </span>
          <div>
            <p>RECOMMENDATION DETAILS</p>
            <h2 id="studio-match-heading">View Match Reasons</h2>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="studio-match-empty">
            <p>
              Try an item or select View Match Reasons on a recommended item to
              review its scores and explanation.
            </p>
            <button
              type="button"
              className="studio-match-outline-button"
              onClick={onBrowse}
            >
              Browse Recommendations
            </button>
          </div>
        ) : (
          <div className="studio-match-item-list">
            {items.map((item) => {
              const id = String(item.id);
              return (
                <MatchReasonSection
                  key={id}
                  item={item}
                  avatar={avatar}
                  isGuest={isGuest}
                  expanded={expandedIds.includes(id)}
                  onToggle={() => toggleExpanded(id)}
                  loadMatchReasonsService={loadMatchReasonsService}
                  onBrowse={onBrowse}
                  onTryItem={onTryItem}
                />
              );
            })}
          </div>
        )}
      </section>
    );
  }

  const BODY_BUILD_RANGE = { min: 86, max: 112 };

  function visualBuildToWeight(buildCm, heightCm) {
    const build = clamp(buildCm, BODY_BUILD_RANGE);
    const heightMeters = Number(heightCm) / 100;

    const progress =
      (build - BODY_BUILD_RANGE.min) /
      (BODY_BUILD_RANGE.max - BODY_BUILD_RANGE.min);

    const visualRatio = 21 + progress * 11;

    return visualRatio * heightMeters * heightMeters;
  }

  function weightToVisualBuild(heightCm, weightKg) {
    const heightMeters = Number(heightCm) / 100;
    const weight = Number(weightKg);

    if (
      !Number.isFinite(heightMeters) ||
      !Number.isFinite(weight) ||
      heightMeters <= 0 ||
      weight <= 0
    ) {
      return 99;
    }

    const visualRatio = weight / (heightMeters * heightMeters);

    const build =
      BODY_BUILD_RANGE.min +
      ((visualRatio - 21) / 11) *
        (BODY_BUILD_RANGE.max - BODY_BUILD_RANGE.min);

    return Math.round(clamp(build, BODY_BUILD_RANGE) * 10) / 10;
  }

  // ---------------------------------------------------------------------------
  // SIZE CAPS (revised lock policy): while clothing is equipped, the slider
  // MINIMUMS stay fixed (Body Build 86 cm, Height 120 cm) and ONLY the MAXIMUMS
  // snap to the equipped garment size:
  //   * buildMax  = top of the smallest equipped clothing size band
  //                 (SIZE_RANGE_TABLE, client mirror of backend
  //                 knowledge_table.py), pulled 0.1 cm down because bands are
  //                 half-open [lo, hi) except 4XL -- so a size-M garment is
  //                 never stretched onto an L body. Smaller bodies remain
  //                 allowed (a larger garment fits a smaller body loosely).
  //   * heightMax = HEIGHT_RANGE.max * (buildMax / BODY_BUILD_RANGE.max).
  //                 The backend size policy defines NO per-size height band
  //                 (height is a single 120-218 cm range), but the canvas
  //                 lattice scales the garment photo using height AND girth
  //                 together, so the height cap is derived proportionally from
  //                 the same band top (M -> 182.8 cm, L -> 190.6 cm,
  //                 4XL -> full 218 cm).
  // With nothing equipped the caps are null and both sliders keep their full
  // ranges.
  // ---------------------------------------------------------------------------
  function sizeBandForLabel(label) {
    const band = SIZE_RANGE_TABLE[String(label || "").toUpperCase()];
    return Array.isArray(band) && band.length === 2 ? band : null;
  }

  function equippedClothingSizeLabels(equipped) {
    const labels = [];

    for (const item of Object.values(equipped || {})) {
      if (!item) continue;
      const label = String(item.catalogSize || item.size || "").toUpperCase();
      if (label && !labels.includes(label)) labels.push(label);
    }

    return labels;
  }

  function sizeCapsForEquipped(equipped) {
    let buildMax = Infinity;

    for (const label of equippedClothingSizeLabels(equipped)) {
      const band = sizeBandForLabel(label);
      if (!band) continue;

      const [lo, hi] = band;
      let top = hi;
      if (sizeForBodyBuild(hi) !== sizeForBodyBuild(lo)) {
        top = Math.max(lo, Math.round((hi - 0.1) * 10) / 10);
      }
      buildMax = Math.min(buildMax, top);
    }

    if (!Number.isFinite(buildMax)) return null;

    const heightMax = Math.min(
      HEIGHT_RANGE.max,
      Math.round((HEIGHT_RANGE.max * (buildMax / BODY_BUILD_RANGE.max)) * 10) / 10
    );

    return { buildMax, heightMax };
  }

  function applySizeCaps(avatar, caps) {
    if (!caps) return avatar;

    let next = avatar;

    const height = Number(next.height);
    if (height > caps.heightMax) {
      const build = weightToVisualBuild(next.height, next.weight);
      next = {
        ...next,
        height: String(caps.heightMax),
        weight: String(visualBuildToWeight(build, caps.heightMax)),
      };
    }

    const build = weightToVisualBuild(next.height, next.weight);
    if (build > caps.buildMax) {
      next = {
        ...next,
        weight: String(visualBuildToWeight(caps.buildMax, next.height)),
      };
    }

    return next === avatar ? avatar : next;
  }

  function FittingStudioPage({ isGuest = false }) {
    const navigate = useNavigate();
    const recommendationsRef = useRef(null);
    const matchPanelRef = useRef(null);

    // CHANGED (activated-preset adoption): if the preset activated via "Use"
    // (Avatar Presets / dashboard / preset editor) differs from the preset the
    // cached session avatar came from, the studio adopts the activated preset's
    // body instead of resurrecting the stale session body.
    const [avatar, setAvatar] = useState(() => {
      const session = readStudioSession(isGuest);
      const activeId = readActivePresetId(isGuest);
      const sessionMatchesActive =
        !activeId || String(session?.avatarPresetId ?? "") === activeId;

      const base =
        session?.avatar && sessionMatchesActive
          ? session.avatar
          : loadAvatar(isGuest);

      // FIX (style_occasion always 0): older sessions predate styleFocus;
      // default them so the avatar profile always carries a dressing-for context.
      return reconcileAvatarGender(
        { ...base, styleFocus: base.styleFocus || "Casual" },
        isGuest
      );
    });

    // NEW: stamp of the preset id the live avatar was loaded from.
    const [avatarPresetId, setAvatarPresetId] = useState(() => {
      const session = readStudioSession(isGuest);
      const activeId = readActivePresetId(isGuest);

      if (activeId && String(session?.avatarPresetId ?? "") !== activeId) {
        return activeId;
      }

      return session?.avatarPresetId ?? activeId ?? "";
    });

    const [currentView, setCurrentView] = useState(() => {
      const stored = readStudioSession(isGuest)?.currentView || "Front";
      return STUDIO_VIEWS.includes(stored) ? stored : "Front";
    });

    const [activePanel, setActivePanel] = useState("customize");

    // CHANGED (bug: stale look after sidebar hops): the studio no longer
    // persists equippedItems in its own session writes, so a cached look can
    // only arrive from an EXTERNAL flow writer (Saved Outfits -> "Open Fitting
    // Studio", FR-5.6) whose session carries no equippedGender stamp. Every
    // other re-entry -- sidebar pages, gender page, presets, refresh -- starts
    // with an empty avatar, exactly as required.
    const [equippedItems, setEquippedItems] = useState(() => {
      const session = readStudioSession(isGuest);

      const externalLook =
        session &&
        !("equippedGender" in session) &&
        session.equippedItems &&
        typeof session.equippedItems === "object";

      if (!externalLook) {
        return { top: null, bottom: null };
      }

      if (
        sessionNeedsEquipReset(session, readStoredGender(isGuest), avatar.gender)
      ) {
        return { top: null, bottom: null };
      }

      return sanitizeEquipped(session.equippedItems, avatar.gender);
    });

    // CHANGED: dimension snapshots are in-memory only now (FR-5.6 sessions
    // already store null), so a restored look never drags stale dimensions in.
    const [originalDimensions, setOriginalDimensions] = useState(() => null);

    const [catalogRecommendations, setCatalogRecommendations] = useState([]);
    const [catalogLoading, setCatalogLoading] = useState(true);

    // CHANGED (slot-keyed match reasons, max one card per body slot): the panel
    // state is a {top, bottom} map instead of an id list. Trying on OR
    // reviewing a garment REPLACES the card occupying its slot, so a jacket
    // swapped out for a sweater can never linger beside it -- upper body +
    // lower body = two cards in the normal clothing flow. A restored saved
    // look (FR-5.6) seeds the slots from its equipped garments.
    const [selectedMatchSlots, setSelectedMatchSlots] = useState(() => {
      const session = readStudioSession(isGuest);
      const externalLook =
        session &&
        !("equippedGender" in session) &&
        session.equippedItems &&
        typeof session.equippedItems === "object";

      if (!externalLook) {
        return { top: null, bottom: null };
      }

      const sanitized = sanitizeEquipped(session.equippedItems, avatar.gender);
      return {
        top: normalizeStudioItem(sanitized?.top),
        bottom: normalizeStudioItem(sanitized?.bottom),
      };
    });
    const [matchRequestVersion, setMatchRequestVersion] = useState(0);

    // NEW: id of the item whose breakdown should auto-expand after a row-level
    // "View Match Reasons" press.
    const [focusMatchItemId, setFocusMatchItemId] = useState("");

    // NEW (OBJ-05 / FR-7.5): your persisted 1-5 ratings keyed by catalog item id,
    // used to pre-fill the star control on every recommendation row.
    const [myRatings, setMyRatings] = useState({});

    const [showRegistrationModal, setShowRegistrationModal] = useState(false);
    const [showSaveOutfitModal, setShowSaveOutfitModal] = useState(false);
    const [showSaveAvatarModal, setShowSaveAvatarModal] = useState(false);

    const [avatarPresetName, setAvatarPresetName] = useState("");
    const [avatarPresetNameError, setAvatarPresetNameError] = useState("");

    const [outfitName, setOutfitName] = useState("");
    const [outfitNameError, setOutfitNameError] = useState("");
    const [notification, setNotification] = useState("");
    const [uatSession, setUatSession] = useState(() => readUatSession());
    const [uatPhase, setUatPhase] = useState("before");
    const [uatCurrentProductId, setUatCurrentProductId] = useState(() => {
      const session = readUatSession();
      return session?.product_id ? String(session.product_id) : "";
    });
    const [uatBeforeAnswers, setUatBeforeAnswers] = useState(() => ({}));
    const [uatAfterAnswers, setUatAfterAnswers] = useState(() => ({}));
    const [uatSurveySubmitting, setUatSurveySubmitting] = useState(false);
    const [uatSurveyOpen, setUatSurveyOpen] = useState(false);
    const [uatSurveyPhase, setUatSurveyPhase] = useState("before");
    const [uatPendingEquipItem, setUatPendingEquipItem] = useState(null);
    const [uatCompletedProducts, setUatCompletedProducts] = useState(() => readUatCompletionMap());
    const [uatMatchReasonsOpenedByProduct, setUatMatchReasonsOpenedByProduct] = useState({});
    const [uatThankYouVisible, setUatThankYouVisible] = useState(false);

    // ------------------------------------------------------------------
    // NEW (popup redesign): pre/post session rating popups.
    // pre  -> opens on FIRST EQUIP or opening the Recommendations panel.
    // post -> opens on Save Outfit, leaving the studio, or 3 min idle.
    // Answers are staged in sessionStorage until the post popup submits so the
    // whole visit lands in accounts_user as ONE embedded survey document.
    // CHANGED (storage fix): popup data — including the 👍/ — is stored ONLY
    // in accounts_user.fitting_studio_surveys; it never writes Rating rows, so
    // accounts_rating stays exclusive to the FR-7.5 rating surfaces.
    // ------------------------------------------------------------------
    const [studioSessionId] = useState(
      () =>
        `studio-${Date.now().toString(36)}-${Math.random()
          .toString(36)
          .slice(2, 10)}`
    );
    const [preSurveyOpen, setPreSurveyOpen] = useState(false);
    const [preAnswers, setPreAnswers] = useState({});
    const [postSurveyOpen, setPostSurveyOpen] = useState(false);
    const [postAnswers, setPostAnswers] = useState({});
    const [postVote, setPostVote] = useState("");
    const [surveySaving, setSurveySaving] = useState(false);

    const pendingNavigationRef = useRef(null);
    const pendingActionRef = useRef(null);
    const preSurveyShownRef = useRef(false);
    const preSurveyDoneRef = useRef(false);
    const postSurveyDoneRef = useRef(false);
    const postSurveyOpenRef = useRef(false);
    const anyModalOpenRef = useRef(false);

    const [currentPage, setCurrentPage] = useState(1);

    const basePath = isGuest ? "/guest" : "/shopper";
    const uatEnabled =
      UAT_SURVEY_ENABLED &&
      !isGuest &&
      new URLSearchParams(window.location.search).get("uat") === "1";
    const isFemale = avatar.gender.toLowerCase() === "female";
    const bodyBuild = weightToVisualBuild(avatar.height, avatar.weight);
    const currentUatAnswers = uatPhase === "before" ? uatBeforeAnswers : uatAfterAnswers;
    const uatSurveyVisible = uatEnabled && !isGuest && uatCurrentProductId;

    const proportion = useMemo(
      () => bodyProportion(avatar.height, bodyBuild),
      [avatar.height, bodyBuild]
    );

    // Size caps: minimums fixed, maximums snap to the equipped garment size.
    const sizeCaps = useMemo(
      () => sizeCapsForEquipped(equippedItems),
      [equippedItems]
    );

    const sizeCapLabels = useMemo(
      () => equippedClothingSizeLabels(equippedItems),
      [equippedItems]
    );

    const equippedItemsArray = useMemo(
      () => Object.values(equippedItems).filter(Boolean),
      [equippedItems]
    );

    // CHANGED: panel cards in slot order (top, bottom) -- at most one
    // per slot, so normally exactly the upper-body + lower-body pair.
    const selectedMatchItems = useMemo(
      () => Object.values(selectedMatchSlots).filter(Boolean),
      [selectedMatchSlots]
    );

    // CHANGED: id set of everything shown in the View Match Reasons panel;
    // drives the gold "match-selected" outline on recommendation rows.
    const selectedMatchIds = useMemo(
      () => new Set(selectedMatchItems.map((item) => String(item.id))),
      [selectedMatchItems]
    );

    const fitLimits = useMemo(
      () => combinedFitLimits(equippedItems),
      [equippedItems]
    );

    const buildRange = useMemo(
      () => ({
        min: BODY_BUILD_RANGE.min,
        max: sizeCaps ? sizeCaps.buildMax : BODY_BUILD_RANGE.max,
      }),
      [sizeCaps]
    );

    const heightRange = useMemo(() => {
      const min = fitLimits.height.min;
      const max = Math.max(
        min,
        Math.min(
          fitLimits.height.max,
          sizeCaps ? sizeCaps.heightMax : HEIGHT_RANGE.max
        )
      );
      return { min, max };
    }, [fitLimits, sizeCaps]);

    const recommendationItems = useMemo(
      () =>
        catalogRecommendations.filter(
          (item) =>
            matchesAvatarSize(item, proportion.size) &&
            avatarGenderAllowsItem(avatar.gender, item)
        ),
      [catalogRecommendations, proportion.size, avatar.gender]
    );

    const totalPages = Math.ceil(recommendationItems.length / ITEMS_PER_PAGE);

    const paginatedItems = useMemo(
      () =>
        recommendationItems.slice(
          (currentPage - 1) * ITEMS_PER_PAGE,
          currentPage * ITEMS_PER_PAGE
        ),
      [recommendationItems, currentPage]
    );

    const atHeightMax =
      fitLimits.hasHeightMaximum && Number(avatar.height) >= fitLimits.height.max;

    const atWeightMax =
      fitLimits.hasWeightMaximum && Number(avatar.weight) >= fitLimits.weight.max;

    // FIX (style_occasion always 0): the Style Focus is part of the recommendation
    // context, so changing it re-ranks the catalog list (style_occasion is the
    // additive tie-refiner in FR-7.2) and refreshes match reasons.
    const recommendationKey = useMemo(
      () =>
        JSON.stringify({
          undertone: String(avatar.undertone || "").toLowerCase(),
          heightCm: Math.round(Number(avatar.height) || 0),
          bodyShape: [avatar.shoulder, avatar.waist, avatar.hip, avatar.thigh]
            .map((value) => String(value || "").toLowerCase())
            .join("|"),
          styleFocus: String(avatar.styleFocus || "Casual"),
        }),
      [
        avatar.undertone,
        avatar.height,
        avatar.shoulder,
        avatar.waist,
        avatar.hip,
        avatar.thigh,
        avatar.styleFocus,
      ]
    );

    // CHANGED: the session now carries avatar + view + writer stamp + the
    // preset-id stamp. Equipped items are deliberately NOT persisted, so
    // leaving the studio always comes back to an empty avatar.
    useEffect(() => {
      sessionStorage.setItem(
        sessionKey(isGuest),
        JSON.stringify({
          avatar,
          currentView,
          equippedGender: avatar.gender,
          avatarPresetId,
        })
      );
    }, [avatar, currentView, isGuest, avatarPresetId]);

    useEffect(() => {
      let active = true;
      const controller = new AbortController();

      const timer = window.setTimeout(() => {
        async function loadRecommendations() {
          try {
            const ranked = await fetchRankedRecommendations(
              avatar,
              50,
              controller.signal
            );

            if (active) {
              setCatalogRecommendations(
                ranked.map(normalizeStudioItem).filter(Boolean)
              );
              setCurrentPage(1);
            }
          } catch (error) {
            if (error.name === "AbortError") return;
            console.warn(
              "Unable to load ranked recommendations (is Django running on 127.0.0.1:8000?):",
              error
            );
          } finally {
            if (active) setCatalogLoading(false);
          }
        }

        setCatalogLoading(true);
        loadRecommendations();
      }, 350);

      return () => {
        active = false;
        controller.abort();
        window.clearTimeout(timer);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recommendationKey]);

    useEffect(() => {
      setCurrentPage(1);
    }, [proportion.size]);

    const prevGenderRef = useRef(avatar.gender);

    // Clear all equipped items the instant the avatar gender changes.
    useEffect(() => {
      if (prevGenderRef.current !== avatar.gender) {
        setEquippedItems({
          top: null,
          bottom: null,
        });
        setSelectedMatchSlots({ top: null, bottom: null });
        setFocusMatchItemId("");
        setOriginalDimensions(null);
        prevGenderRef.current = avatar.gender;
      }
    }, [avatar.gender]);

    // Keep the avatar inside the equipped garment's caps even when a restored
    // look (FR-5.6) or a pending item put the body above them.
    useEffect(() => {
      setAvatar((current) => applySizeCaps(current, sizeCaps));
    }, [sizeCaps]);

    useEffect(() => {
      if (!uatCurrentProductId) return;
      setUatBeforeAnswers(readUatPhaseAnswers(uatCurrentProductId, "before"));
      setUatAfterAnswers(readUatPhaseAnswers(uatCurrentProductId, "after"));
    }, [uatCurrentProductId]);

    /* NEW (OBJ-05 / FR-7.5): load the shopper's persisted item ratings once so
      recommendation stars pre-fill with what you already rated. Guests skip the
      call entirely (/ratings/mine/ is IsAuthenticated and would 401).
      FIX (audit): prefill ONLY from ratings actually cast on the
      recommendation panel. Fit-visualization and product-page ratings share
      the same catalog target_id and would otherwise masquerade as
      recommendation approvals in the UI (OBJ-05 evidence integrity). */
    useEffect(() => {
      if (isGuest) return undefined;
      let active = true;

      async function loadMyRatings() {
        try {
          const list = await ratingsApi.mine();
          if (!active) return;
          const map = {};
          (Array.isArray(list) ? list : []).forEach((entry) => {
            if (
              entry &&
              entry.score != null &&
              entry.target_type === RATING_TARGET_TYPES.ITEM &&
              entry.source === RATING_SOURCES.RECOMMENDATION_PANEL
            ) {
              map[String(entry.target_id)] = Number(entry.score);
            }
          });
          setMyRatings(map);
        } catch (error) {
          console.warn("Unable to load your saved ratings:", error?.message || error);
        }
      }

      loadMyRatings();

      return () => {
        active = false;
      };
    }, [isGuest]);

    useEffect(() => {
      const key = pendingKey(isGuest);
      const pending = readJson(sessionStorage, key);

      if (!pending) return;

      sessionStorage.removeItem(key);

      const item = normalizeStudioItem(pending);

      if (!item) return;

      if (UAT_SURVEY_ENABLED && uatEnabled && !isGuest) {
        const productId = String(item.id);
        const completed = readUatCompletionMap();
        setUatCurrentProductId(productId);
        setUatPhase("before");
        const session = readUatSession();
        if (!session || String(session.product_id) !== productId) {
          void startUatSession(productId);
        }
        if (!completed[productId]) {
          setUatPendingEquipItem(item);
          setUatSurveyPhase("before");
          setUatSurveyOpen(true);
          return;
        }
      }

      if (!avatarGenderAllowsItem(avatar.gender, item)) {
        displayNotification(
          `${item.name} is not available for your current avatar gender.`
        );
        return;
      }

      const next = { ...equippedItems, [item.category]: item };
      const nextLimits = combinedFitLimits(next);

      if (nextLimits.incompatible) {
        displayNotification(
          "These garment sizes have conflicting fitting limits. Try another size."
        );
        return;
      }

      if (!Object.values(equippedItems).some(Boolean)) {
        setOriginalDimensions({
          height: avatar.height,
          weight: avatar.weight,
        });
      }

      setEquippedItems(next);
      // CHANGED: pending equip takes over its body slot in the match panel.
      setSelectedMatchSlots((current) => ({ ...current, [item.category]: item }));
      setAvatar((current) =>
        applySizeCaps(
          applyFitLimits(current, nextLimits),
          sizeCapsForEquipped(next)
        )
      );

      displayNotification(
        !nextLimits.hasHeight && !nextLimits.hasWeight
          ? `${item.name} equipped. Seller height/weight limits are not available; no body-size restriction was assumed.`
          : `${item.name} equipped. Preview adjusted to its available fitting limits.`
      );

      // NEW (popup redesign): equipping the first item opens the pre-session
      // rating popup before the shopper starts interacting with the canvas.
      maybeOpenPreSurvey();

      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // NEW (popup redesign): POST-SESSION trigger #2 — any in-app anchor click
    // (sidebar links, sidebar logo) that would leave this page is captured in
    // the CAPTURE phase and paused; React Router's Link honors
    // defaultPrevented, so preventing here is enough to hold the navigation
    // until the shopper submits or skips the post-session rating.
    useEffect(() => {
      if (!UAT_SURVEY_ENABLED) return;

      function handleCaptureClick(event) {
        if (!UAT_SURVEY_ENABLED) return;

        const target = event.target;
        const anchor =
          target && typeof target.closest === "function"
            ? target.closest("a[href]")
            : null;

        if (!anchor) return;

        const href = anchor.getAttribute("href") || "";
        if (!href.startsWith("/") || href.startsWith("//")) return;
        if (href === window.location.pathname) return;

        const intercepted = openPostSurvey({ navigation: { path: href } });
        if (intercepted) event.preventDefault();
      }

      document.addEventListener("click", handleCaptureClick, true);
      return () => document.removeEventListener("click", handleCaptureClick, true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // NEW (popup redesign): POST-SESSION trigger #3 — 3 minutes of idle time.
    // The timer re-arms on any pointer/key/scroll activity and never fires
    // while another modal is open or before the pre-session popup has shown.
    useEffect(() => {
      if (!UAT_SURVEY_ENABLED) return;
      if (uatEnabled) return undefined;

      let timer = null;
      const events = ["pointerdown", "keydown", "scroll", "touchstart"];

      function arm() {
        if (timer) window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          if (
            preSurveyShownRef.current &&
            !postSurveyDoneRef.current &&
            !postSurveyOpenRef.current &&
            !anyModalOpenRef.current
          ) {
            openPostSurvey({});
          }
        }, POST_SURVEY_IDLE_MS);
      }

      events.forEach((name) =>
        window.addEventListener(name, arm, { passive: true })
      );
      arm();

      return () => {
        events.forEach((name) => window.removeEventListener(name, arm));
        if (timer) window.clearTimeout(timer);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Keep the idle trigger aware of every blocking overlay.
    useEffect(() => {
      anyModalOpenRef.current =
        preSurveyOpen ||
        postSurveyOpen ||
        showSaveOutfitModal ||
        showSaveAvatarModal ||
        showRegistrationModal ||
        uatSurveyOpen;
    }, [
      preSurveyOpen,
      postSurveyOpen,
      showSaveOutfitModal,
      showSaveAvatarModal,
      showRegistrationModal,
      uatSurveyOpen,
    ]);

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
      window.setTimeout(() => setNotification(""), 2500);
    }

    // NEW (popup redesign): PRE-SESSION trigger — first equip OR opening the
    // Recommendations panel. Fires at most once per studio visit. Tester mode
    // (?uat=1) keeps ownership of the charter UAT survey, so no double popup.
    function maybeOpenPreSurvey() {
      if (!UAT_SURVEY_ENABLED) return;
      if (uatEnabled || preSurveyShownRef.current) return;
      preSurveyShownRef.current = true;
      setPreSurveyOpen(true);
    }

    // NEW (popup redesign): central post-session opener. Returns true when the
    // popup actually took over (caller must pause its own flow).
    function openPostSurvey(pending = {}) {
      if (!UAT_SURVEY_ENABLED) return false;
      if (uatEnabled || postSurveyDoneRef.current || postSurveyOpenRef.current) {
        return false;
      }
      pendingNavigationRef.current = pending.navigation || null;
      pendingActionRef.current = pending.action || null;
      postSurveyOpenRef.current = true;
      setPostSurveyOpen(true);
      return true;
    }

    // Resume whatever the post-session popup paused (navigation or Save Outfit).
    function proceedWithPending() {
      const nav = pendingNavigationRef.current;
      const action = pendingActionRef.current;
      pendingNavigationRef.current = null;
      pendingActionRef.current = null;
      if (nav) {
        navigate(nav.path, nav.state ? { state: nav.state } : undefined);
        return;
      }
      if (action === "save-outfit") openSaveOutfitModalNow();
    }

    // In-page navigation guard. Buttons that call navigate() directly (product
    // links, Change Gender, Select Items for Cart) go through here so the
    // post-session popup fires for them too.
    function requestNavigation(path, state) {
      if (!openPostSurvey({ navigation: { path, state } })) {
        navigate(path, state ? { state } : undefined);
      }
    }

    function getPreSurveyKey() {
      return `fitfusion-studio-pre-survey-${getCurrentUserId()}`;
    }

    function readStagedPreAnswers() {
      try {
        const raw = sessionStorage.getItem(getPreSurveyKey());
        sessionStorage.removeItem(getPreSurveyKey());
        const parsed = raw ? JSON.parse(raw) : null;
        return parsed && typeof parsed === "object" ? parsed : {};
      } catch {
        return {};
      }
    }

    function numOrNull(value) {
      const number = Number(value);
      return Number.isFinite(number) ? number : null;
    }

    // KAN-89 log shape, stored ONLY in accounts_user.fitting_studio_surveys:
    //   { session_id, user_type, pre_confidence, pre_return_intent,
    //     post_confidence, post_return_intent, fit_like_dislike, timestamp }
    // CHANGED (storage fix): the 👍/ reaction is NO LONGER mirrored into
    // POST /ratings/ — it lives exclusively in the embedded survey document so
    // accounts_rating never receives popup artifacts (e.g. the old
    // "fitting-studio-look" rows). The FR-7.5 fit-visualization Rating rows are
    // still created by the RatingControl on equipped items, which is the
    // surface the OBJ-01 KPI join reads.
    async function persistPopupSurvey(pre, post, vote) {
      if (!UAT_SURVEY_ENABLED) return;
      if (isGuest) return;

      const payload = {
        session_id: studioSessionId,
        user_type: "registered",
        pre_confidence: numOrNull(pre?.confidence),
        pre_return_intent: numOrNull(pre?.return_intent),
        post_confidence: numOrNull(post?.confidence),
        post_return_intent: numOrNull(post?.return_intent),
        fit_like_dislike: vote || null,
        equipped_item_ids: equippedItemsArray.map((item) => String(item.id)),
        avatar_context: {
          gender: avatar.gender,
          height: avatar.height,
          weight: avatar.weight,
          body_build_cm: bodyBuild,
        },
      };

      setSurveySaving(true);
      try {
        await authApi.submitFittingStudioSurvey(payload);
        window.dispatchEvent(new Event("fitfusion-account-updated"));
        displayNotification("Thanks! Your session feedback was saved to your account.");
          } catch (error) {
        console.warn("Unable to save fitting studio survey:", error?.message || error);
        displayNotification(
          `Rating not saved: ${error?.message || "survey endpoint unavailable."}`
        );
      } finally {
        setSurveySaving(false);
      }
    }

    // PRE popup actions ------------------------------------------------------
    function submitPreSurvey() {
      if (!UAT_SURVEY_ENABLED) return;
      const answers = { ...preAnswers };
      setPreSurveyOpen(false);
      preSurveyDoneRef.current = true;
      if (isGuest) return; // guests only ever see the signup CTA button
      sessionStorage.setItem(getPreSurveyKey(), JSON.stringify(answers));
    }

    function skipPreSurvey() {
      if (!UAT_SURVEY_ENABLED) return;
      setPreSurveyOpen(false);
      preSurveyDoneRef.current = true;
      if (!isGuest) {
        sessionStorage.setItem(getPreSurveyKey(), JSON.stringify({}));
      }
    }

    // POST popup actions -----------------------------------------------------
    async function submitPostSurvey() {
      if (!UAT_SURVEY_ENABLED) return;
      const post = { ...postAnswers };
      const vote = postVote;
      const pre = readStagedPreAnswers();

      postSurveyDoneRef.current = true;
      postSurveyOpenRef.current = false;
      setPostSurveyOpen(false);

      if (isGuest) {
        proceedWithPending();
        return;
      }

      await persistPopupSurvey(pre, post, vote);
      proceedWithPending();
    }

    function skipPostSurvey() {
      if (!UAT_SURVEY_ENABLED) return;
      const pre = readStagedPreAnswers();

      postSurveyDoneRef.current = true;
      postSurveyOpenRef.current = false;
      setPostSurveyOpen(false);

      // FR-7.5: skipping never loses already-given pre-session answers.
      if (!isGuest && (pre.confidence != null || pre.return_intent != null)) {
        void persistPopupSurvey(pre, {}, "");
      }
      proceedWithPending();
    }

    // Guest call-to-action replaces the submit button on BOTH popups (FR-7.5).
    function handleGuestSurveyCta() {
      if (!UAT_SURVEY_ENABLED) return;
      preSurveyDoneRef.current = true;
      postSurveyDoneRef.current = true;
      preSurveyShownRef.current = true;
      postSurveyOpenRef.current = false;
      setPreSurveyOpen(false);
      setPostSurveyOpen(false);
      navigate("/signup");
    }

    // CHANGED: snapshot carries the preset-id stamp as well.
    // CHANGED (post-session popup): leaving to a product page now goes through
    // requestNavigation so the post popup fires first.
    function openProductDetails(item) {
      sessionStorage.setItem(
        sessionKey(isGuest),
        JSON.stringify({
          avatar,
          currentView,
          equippedGender: avatar.gender,
          avatarPresetId,
        })
      );

      requestNavigation(`${basePath}/products/${encodeURIComponent(item.id)}`, {
        fromFittingStudio: true,
      });
    }

    function updateAvatar(field, value) {
      if (field === "height") {
        const nextHeight = clamp(value, heightRange);
        const currentHeight = Number(avatar.height);
        const currentWeight = Number(avatar.weight);

        const nextWeight =
          currentHeight > 0 && currentWeight > 0
            ? currentWeight * Math.pow(nextHeight / currentHeight, 2)
            : visualBuildToWeight(bodyBuild, nextHeight);

      if (
        nextWeight < fitLimits.weight.min ||
        nextWeight > fitLimits.weight.max
      ) {
        displayNotification(
          "This height cannot keep your selected body build within the current fitting limits."
        );
        return;
      }

      setAvatar((current) => ({
        ...current,
        height: String(nextHeight),
        weight: String(nextWeight),
      }));

      return;
    }

    if (field === "weight") {
      setAvatar((current) => ({
        ...current,
        weight: String(clamp(value, fitLimits.weight)),
      }));
      return;
    }

    setAvatar((current) => ({ ...current, [field]: value }));
  }

  function selectBodyBuild(value) {
    const nextBuild = clamp(value, buildRange);
    const nextWeight = visualBuildToWeight(nextBuild, avatar.height);

    if (
      nextWeight < fitLimits.weight.min ||
      nextWeight > fitLimits.weight.max
    ) {
      displayNotification(
        "This body build is outside the current garment fitting limits."
      );
      return;
    }

    setAvatar((current) => ({ ...current, weight: String(nextWeight) }));
  }

  function notifyAtLimit(field) {
    const flag = `has${field[0].toUpperCase()}${field.slice(1)}Maximum`;

    if (fitLimits[flag] && Number(avatar[field]) >= fitLimits[field].max) {
      displayNotification(
        `Maximum ${
          field === "weight" ? "body build" : field
        } preview reached for this clothing size. Move the slider backward or choose another size.`
      );
    }
  }

  function openRegistrationPopup() {
    setShowRegistrationModal(true);
  }

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

  async function confirmSaveAvatarPreset(event) {
    event.preventDefault();

    if (isGuest) {
      closeSaveAvatarModal();
      openRegistrationPopup();
      return;
    }

    const name = avatarPresetName.trim().replace(/\s+/g, " ");

    if (!name) {
      setAvatarPresetNameError("Please enter a preset name before saving.");
      return;
    }

    if (name.length > 50) {
      setAvatarPresetNameError("Preset name must not exceed 50 characters.");
      return;
    }

    try {
      const existing = await presetsApi.list();
      const savedPresets = Array.isArray(existing)
        ? existing
        : existing.results || [];

      const isDuplicate =
        name.toLowerCase() === "fitfusion standard" ||
        savedPresets.some(
          (preset) =>
            String(preset.name || "").trim().toLowerCase() ===
            name.toLowerCase()
        );

      if (isDuplicate) {
        setAvatarPresetNameError(
          "This preset name already exists. Please choose another name."
        );
        return;
      }

      const newPreset = toServerPreset(avatar, name, isFemale);
      const created = await presetsApi.create(newPreset);
      const savedPreset = fromServerPreset(created);

      localStorage.setItem(
        "fitfusion-avatar-presets",
        JSON.stringify([savedPreset])
      );
      localStorage.setItem(
        "fitfusion-avatar-preset",
        JSON.stringify(savedPreset)
      );
      localStorage.setItem("fitfusion-avatar-gender", savedPreset.gender);
      setAvatarPresetId(savedPreset.id);

      closeSaveAvatarModal();
      displayNotification(`"${name}" was saved to Avatar Presets.`);
    } catch (error) {
      console.error("Unable to save avatar preset:", error);
      setAvatarPresetNameError(
        extractApiError(
          error,
          "Unable to save your avatar preset. Please try again."
        )
      );
    }
  }

  function tryRecommendedItem(rawItem) {
    const item = normalizeStudioItem(rawItem);

    if (!item) return;

    if (!avatarGenderAllowsItem(avatar.gender, item)) {
      displayNotification(
        `${item.name} is not available for your current avatar gender.`
      );
      return;
    }

    const next = { ...equippedItems, [item.category]: item };
    const nextLimits = combinedFitLimits(next);

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

    // CHANGED: equipping takes over the garment's body slot in the match
    // reasons panel, replacing any previous card for that slot.
    setSelectedMatchSlots((current) => ({ ...current, [item.category]: item }));
    setEquippedItems(next);
    setAvatar((current) =>
      applySizeCaps(
        applyFitLimits(current, nextLimits),
        sizeCapsForEquipped(next)
      )
    );

    displayNotification(
      !nextLimits.hasHeight && !nextLimits.hasWeight
        ? `${item.name} equipped. No verified height/weight limits were supplied for this size.`
        : `${item.name} equipped. Avatar preview adjusted within the garment limits.`
    );

    // NEW (popup redesign): first equip opens the pre-session rating popup.
    maybeOpenPreSurvey();
  }

  function removeEquippedItem(category) {
    const removedItem = equippedItems[category];

    if (!removedItem) return;

    const next = { ...equippedItems, [category]: null };
    const hasRemaining = Object.values(next).some(Boolean);

    setEquippedItems(next);

    // CHANGED: clear the slot card when it IS the removed garment; a merely
    // reviewed card for that slot survives the unequip.
    setSelectedMatchSlots((current) =>
      current[category] &&
      String(current[category].id) === String(removedItem.id)
        ? { ...current, [category]: null }
        : current
    );

    if (!hasRemaining) {
      if (originalDimensions) {
        setAvatar((current) => ({ ...current, ...originalDimensions }));
      }
      setOriginalDimensions(null);
    } else {
      setAvatar((current) =>
        applySizeCaps(
          applyFitLimits(current, combinedFitLimits(next)),
          sizeCapsForEquipped(next)
        )
      );
    }
  }

  async function startUatSession(productId) {
    if (!UAT_SURVEY_ENABLED) return null;
    if (!uatEnabled || isGuest || !productId) return null;
    const current = readUatSession();
    if (current && String(current.product_id) === String(productId)) {
      setUatSession(current);
      setUatCurrentProductId(String(productId));
      return current;
    }

    const token = getAccessToken();
    if (!token) return null;

    try {
      const response = await fetch(`${API_URL}/ratings/uat/session/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: "shopper", product_id: String(productId) }),
      });

      if (!response.ok) {
        throw new Error("Unable to start UAT session");
      }

      const data = await response.json();
      const session = {
        session_id: data.session_id,
        product_id: String(productId),
        role: data.role || "shopper",
      };
      localStorage.setItem(uatSessionStorageKey(getCurrentUserId()), JSON.stringify(session));
      setUatSession(session);
      setUatCurrentProductId(String(productId));
      return session;
    } catch (error) {
      console.error("Unable to start UAT session:", error);
      return null;
    }
  }

  async function submitUatResponse(productId, phase, questionKey, value) {
    if (!UAT_SURVEY_ENABLED) return null;
    const session = readUatSession();
    // FIX (charter-aligned UAT): `0` is a valid answer (style_discovery "No").
    // The old falsy guard (`!value`) dropped every zero-valued response before
    // it reached the API. Only null/undefined/empty is skipped now.
    if (!session || !productId || !questionKey || !isUATAnswer(value)) return null;

    const token = getAccessToken();
    if (!token) return null;

    try {
      setUatSurveySubmitting(true);
      const response = await fetch(`${API_URL}/ratings/uat/response/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: session.session_id,
          product_id: String(productId),
          phase,
          question_key: questionKey,
          value,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || "Unable to save UAT response");
      }

      const answers = phase === "before" ? { ...uatBeforeAnswers } : { ...uatAfterAnswers };
      answers[questionKey] = Number(value);
      if (phase === "before") {
        setUatBeforeAnswers(answers);
        saveUatPhaseAnswers(productId, "before", answers);
      } else {
        setUatAfterAnswers(answers);
        saveUatPhaseAnswers(productId, "after", answers);
        const completionMap = readUatCompletionMap();
        completionMap[String(productId)] = true;
        saveUatCompletionMap(completionMap);
        setUatCompletedProducts(completionMap);
      }
      return await response.json();
    } catch (error) {
      console.error("Unable to save UAT response:", error);
      return null;
    } finally {
      setUatSurveySubmitting(false);
    }
  }

  function handleUatAnswer(productId, phase, questionKey, value) {
    if (!UAT_SURVEY_ENABLED) return;
    if (!productId || !questionKey || value == null) return;
    void submitUatResponse(productId, phase, questionKey, value);
  }

  function applyPendingUatItem(item) {
    if (!item) return;
    if (!avatarGenderAllowsItem(avatar.gender, item)) {
      displayNotification(
        `${item.name} is not available for your current avatar gender.`
      );
      return;
    }

    const next = { ...equippedItems, [item.category]: item };
    const nextLimits = combinedFitLimits(next);

    if (nextLimits.incompatible) {
      displayNotification(
        "These garment sizes have conflicting fitting limits. Try another size."
      );
      return;
    }

    if (!Object.values(equippedItems).some(Boolean)) {
      setOriginalDimensions({
        height: avatar.height,
        weight: avatar.weight,
      });
    }

    setEquippedItems(next);
    setSelectedMatchSlots((current) => ({ ...current, [item.category]: item }));
    setAvatar((current) =>
      applySizeCaps(
        applyFitLimits(current, nextLimits),
        sizeCapsForEquipped(next)
      )
    );

    displayNotification(
      !nextLimits.hasHeight && !nextLimits.hasWeight
        ? `${item.name} equipped. Seller height/weight limits are not available; no body-size restriction was assumed.`
        : `${item.name} equipped. Preview adjusted to its available fitting limits.`
    );
  }

  function handleUatModalSave() {
    if (!UAT_SURVEY_ENABLED) return;
    const productId = String(uatCurrentProductId || uatPendingEquipItem?.id || "");
    if (!productId) return;

    if (uatSurveyPhase === "before") {
      const answers = { ...uatBeforeAnswers };
      const requiredQuestions = UAT_QUESTIONS.map((question) => question.key);
      const answeredCount = requiredQuestions.filter((key) => answers[key] != null).length;

      if (answeredCount === 0) {
        setUatSurveyOpen(false);
        setUatSurveyPhase("after");
        if (uatPendingEquipItem) {
          applyPendingUatItem(uatPendingEquipItem);
          setUatPendingEquipItem(null);
        }
        return;
      }

      setUatSurveyOpen(false);
      if (uatPendingEquipItem) {
        applyPendingUatItem(uatPendingEquipItem);
        setUatPendingEquipItem(null);
      }
      setUatPhase("after");
      setUatSurveyPhase("after");
      setUatSurveyOpen(true);
      return;
    }

    const completionMap = readUatCompletionMap();
    completionMap[String(productId)] = true;
    saveUatCompletionMap(completionMap);
    setUatCompletedProducts(completionMap);
    setUatSurveyOpen(false);
    setUatThankYouVisible(true);
  }

  function handleUatModalSkip() {
    if (!UAT_SURVEY_ENABLED) return;
    const productId = String(uatCurrentProductId || uatPendingEquipItem?.id || "");
    if (uatSurveyPhase === "before") {
      setUatSurveyOpen(false);
      setUatSurveyPhase("after");
      if (uatPendingEquipItem) {
        applyPendingUatItem(uatPendingEquipItem);
        setUatPendingEquipItem(null);
      }
      setUatPhase("after");
      setUatSurveyOpen(true);
      return;
    }

    if (productId) {
      const completionMap = readUatCompletionMap();
      completionMap[productId] = true;
      saveUatCompletionMap(completionMap);
      setUatCompletedProducts(completionMap);
    }
    setUatSurveyOpen(false);
    setUatThankYouVisible(true);
  }

  function handleUatFinishTryOn() {
    if (!UAT_SURVEY_ENABLED) return;
    const productId = String(uatCurrentProductId || "");
    if (!productId) return;
    setUatSurveyPhase("after");
    setUatSurveyOpen(true);
  }

  // CHANGED (popup redesign): opening the Recommendations panel is a
  // pre-session trigger, so it also arms the pre popup.
  function handleRecommendations() {
    setActivePanel("recommendations");
    maybeOpenPreSurvey();

    window.requestAnimationFrame(() => {
      recommendationsRef.current?.focus({ preventScroll: true });
      recommendationsRef.current?.scrollIntoView({
        block: "start",
        behavior: "auto",
      });
    });
  }

  // CHANGED: reviewing a recommendation takes over its body slot in the
  // panel (replacing the previous card for that slot) and expands it.
  function handleViewMatchReasons(rawItem) {
    const item = normalizeStudioItem(rawItem);

    if (!item) return;

    setSelectedMatchSlots((current) => ({ ...current, [item.category]: item }));
    setFocusMatchItemId(String(item.id));
    setMatchRequestVersion((version) => version + 1);
    setUatMatchReasonsOpenedByProduct((current) => ({
      ...current,
      [String(item.id)]: true,
    }));

    window.requestAnimationFrame(() => {
      matchPanelRef.current?.focus({ preventScroll: true });
      matchPanelRef.current?.scrollIntoView({
        block: "nearest",
        behavior: "auto",
      });
    });
  }

  function openSaveOutfitModalNow() {
    setOutfitName("");
    setOutfitNameError("");
    setShowSaveOutfitModal(true);
  }

  // CHANGED (popup redesign): Save Outfit is a post-session trigger. The save
  // modal only opens after the shopper submits or skips the rating.
  function saveOutfit() {
    if (isGuest) {
      openRegistrationPopup();
      return;
    }

    if (equippedItemsArray.length === 0) {
      displayNotification("Try at least one clothing item before saving.");
      return;
    }

    if (!openPostSurvey({ action: "save-outfit" })) {
      openSaveOutfitModalNow();
    }
  }

  function closeSaveOutfitModal() {
    setShowSaveOutfitModal(false);
    setOutfitName("");
    setOutfitNameError("");
  }

  async function confirmSaveOutfit(event) {
    event.preventDefault();

    const trimmedName = outfitName.trim();

    if (!trimmedName) {
      setOutfitNameError("Please enter an outfit name before saving.");
      return;
    }

    if (trimmedName.length > 50) {
      setOutfitNameError("Outfit name must not exceed 50 characters.");
      return;
    }

    // FIX (save outfit 400 "items"): the deployed OutfitSerializer.items is a
    // PrimaryKeyRelatedField(many=True) over the catalog M2M (outfits/models.py;
    // the green test suite posts/reads items as a LIST OF ID STRINGS and
    // validates item status). The previous payload sent whole item OBJECTS, so
    // DRF rejected `items` -> 400. We now send exactly the contract the real
    // API accepts: { name, items: [catalogItemId, ...] }. This persists the
    // named combination + its catalog links in MongoDB via the backend
    // (KAN-69: "persist outfits through the backend rather than relying on
    // client-only demo state"; KAN-115: wire to the real Django APIs).
    const itemIds = equippedItemsArray
      .map((item) => String(item.id))
      .filter(Boolean);

    if (!itemIds.length) {
      setOutfitNameError("No valid clothing items to save.");
      return;
    }

    const newOutfit = {
      name: trimmedName,
      items: itemIds,
    };

    try {
      await outfitsApi.create(newOutfit);
      closeSaveOutfitModal();

      window.dispatchEvent(new Event("fitfusion-outfits-updated"));

      displayNotification(`"${trimmedName}" was saved successfully!`);
    } catch (error) {
      console.error("Unable to save outfit:", error);
      setOutfitNameError(
        extractApiError(error, "Unable to save your outfit. Please try again.")
      );
    }
  }

  // CHANGED (post-session popup): the cart hand-off is a page change, so it
  // now routes through requestNavigation.
  function continueToCart() {
    if (isGuest) {
      openRegistrationPopup();
      return;
    }

    if (equippedItemsArray.length === 0) {
      displayNotification("Try at least one clothing item first.");
      return;
    }

    localStorage.setItem(
      "fitfusion-selected-items",
      JSON.stringify(
        equippedItemsArray.map((item) => ({ ...item, quantity: 1 }))
      )
    );

    requestNavigation("/shopper/fitting-studio/select-items");
  }

  return (
    <main className={`fitting-studio-page ${isGuest ? "guest-studio" : ""}`}>
      <div className="studio-body">
        <section className="studio-introduction">
          <div>
            <p>VIRTUAL FITTING</p>
            <h1>Customize and try clothing</h1>
            <span>
              Customize your avatar and switch between Front and Rear views.
              {isGuest &&
                " Your changes are temporary and will be removed when the guest session ends."}
            </span>
          </div>

          {/* CHANGED (post-session popup): Change Gender leaves the studio, so
              it now routes through requestNavigation. */}
          <button
            type="button"
            className="studio-change-gender"
            onClick={() => {
              sessionStorage.removeItem(sessionKey(isGuest));
              requestNavigation(`${basePath}/fitting-studio`);
            }}
          >
            Change Gender
          </button>
        </section>

        {UAT_SURVEY_ENABLED && uatSurveyOpen && uatCurrentProductId && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(24, 18, 14, 0.6)", zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
            <div style={{ width: "min(780px, 100%)", maxHeight: "88vh", overflowY: "auto", background: "#fffaf2", borderRadius: "18px", border: "1px solid #d7b777", boxShadow: "0 22px 60px rgba(39, 28, 17, 0.25)", padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "18px" }}>
                <div>
                  <p style={{ margin: 0, fontSize: "11px", letterSpacing: "0.12em", color: "#7a6957", textTransform: "uppercase" }}>UAT Survey</p>
                  <h2 style={{ margin: "6px 0 0", fontSize: "1.6rem", color: "#201a16" }}>{uatSurveyPhase === "before" ? "Before try-on" : "After try-on"}</h2>
                </div>
                <button type="button" onClick={handleUatModalSkip} style={{ background: "transparent", border: "1px solid #caa96b", borderRadius: "999px", padding: "10px 16px", color: "#4e3e2b", fontWeight: 700, cursor: "pointer" }}>
                  Skip
                </button>
              </div>

              <div style={{ display: "grid", gap: "18px" }}>
                {(uatSurveyPhase === "before" ? UAT_QUESTIONS : [
                  ...UAT_QUESTIONS,
                  ...UAT_AFTER_EXTRA_QUESTIONS.filter((question) => {
                    if (question.key === "responsiveness" || question.key === "privacy_comfort") return true;
                    if (question.key === "style_discovery") return Boolean(uatMatchReasonsOpenedByProduct[String(uatCurrentProductId)]);
                    if (question.key === "match_helpfulness") return Boolean(uatMatchReasonsOpenedByProduct[String(uatCurrentProductId)]);
                    return false;
                  }),
                ]).map((question) => {
                  const isBooleanQuestion = question.isBoolean;
                  const selectedValue = (uatSurveyPhase === "before" ? uatBeforeAnswers : uatAfterAnswers)[question.key];

                  return (
                    <div key={question.key} style={{ display: "grid", gap: "10px" }}>
                      <label style={{ fontWeight: 600, color: "#201a16", lineHeight: 1.4 }}>{question.prompt}</label>

                      {isBooleanQuestion ? (
                        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                          {[{ value: 1, label: "Yes" }, { value: 0, label: "No" }].map((option) => (
                            <button
                              key={`${question.key}-${option.value}`}
                              type="button"
                              onClick={() => handleUatAnswer(uatCurrentProductId, uatSurveyPhase, question.key, option.value)}
                              style={{
                                minWidth: "88px",
                                padding: "10px 16px",
                                borderRadius: "999px",
                                border: selectedValue === option.value ? "1px solid #4d3a21" : "1px solid #d0c0a2",
                                background: selectedValue === option.value ? "#d9a84d" : "#f8f2e8",
                                color: selectedValue === option.value ? "#1e170f" : "#4a392d",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div style={{ display: "grid", gap: "8px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {[1, 2, 3, 4, 5].map((score) => (
                              <button
                                key={`${question.key}-${score}`}
                                type="button"
                                style={{
                                  minWidth: "44px",
                                  padding: "8px 12px",
                                  borderRadius: "999px",
                                  border: selectedValue === score ? "1px solid #4d3a21" : "1px solid #d0c0a2",
                                  background: selectedValue === score ? "#d9a84d" : "#f8f2e8",
                                  color: selectedValue === score ? "#1e170f" : "#4a392d",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                                onClick={() => handleUatAnswer(uatCurrentProductId, uatSurveyPhase, question.key, score)}
                                aria-label={`${question.prompt} answer ${score}`}
                              >
                                {score}
                              </button>
                            ))}
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#7a6957" }}>
                            <span>{question.lowLabel}</span>
                            <span>{question.highLabel}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "22px", flexWrap: "wrap" }}>
                <button type="button" onClick={handleUatModalSkip} style={{ background: "#f3ead8", border: "1px solid #d0c0a2", borderRadius: "999px", padding: "12px 18px", color: "#3e2e22", fontWeight: 700, cursor: "pointer" }}>
                  {uatSurveyPhase === "before" ? "Skip for now" : "Close"}
                </button>
                <button type="button" onClick={handleUatModalSave} style={{ background: "#23201d", border: "none", borderRadius: "999px", padding: "12px 20px", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                  {uatSurveyPhase === "before" ? "Save & continue" : "Submit"}
                </button>
              </div>

              {uatSurveySubmitting && <p style={{ margin: "12px 0 0", color: "#675328" }}>Saving UAT response…</p>}
            </div>
          </div>
        )}

        {UAT_SURVEY_ENABLED && uatThankYouVisible && (
          <div style={{ marginBottom: "18px", background: "#f2f7ef", border: "1px solid #84ba85", borderRadius: "12px", padding: "12px 14px", color: "#1d4520", fontWeight: 600 }}>
            Thank you for helping us validate the shopping experience.
          </div>
        )}

        <div className="studio-workspace">
          <section
            className="studio-controls-card"
            ref={recommendationsRef}
            tabIndex={-1}
            aria-label="Avatar customization and recommendations"
          >
            <div className="studio-panel-tabs">
              <button
                type="button"
                className={activePanel === "customize" ? "active" : ""}
                aria-pressed={activePanel === "customize"}
                onClick={() => setActivePanel("customize")}
              >
                Customize
              </button>
              {/* CHANGED (popup redesign): switching to Recommendations is a
                  pre-session popup trigger. */}
              <button
                type="button"
                className={activePanel === "recommendations" ? "active" : ""}
                aria-pressed={activePanel === "recommendations"}
                onClick={() => {
                  setActivePanel("recommendations");
                  maybeOpenPreSurvey();
                }}
              >
                Recommendations
              </button>
            </div>

            {activePanel === "customize" ? (
              <div className="studio-customization-panel">
                <div className="studio-measurement-grid">
                  <div className="studio-slider-field">
                    <div className="studio-slider-header">
                      <label htmlFor="studio-height">Height</label>
                      <strong>{avatar.height} cm</strong>
                    </div>
                    <input
                      id="studio-height"
                      className="studio-slider"
                      type="range"
                      min={heightRange.min}
                      max={heightRange.max}
                      step="0.1"
                      value={clamp(avatar.height, heightRange)}
                      onPointerUp={() => notifyAtLimit("height")}
                      onKeyUp={() => notifyAtLimit("height")}
                      onChange={(event) =>
                        updateAvatar("height", event.target.value)
                      }
                      aria-valuetext={`${avatar.height} centimeters`}
                    />
                    <div className="studio-slider-limits">
                      <span>{heightRange.min} cm</span>
                      <span>{heightRange.max} cm</span>
                    </div>
                  </div>

                  <div className="studio-slider-field">
                    <div className="studio-slider-header">
                      <label htmlFor="studio-body-build">Body Build</label>
                      <strong>{bodyBuild} cm</strong>
                    </div>
                    <input
                      id="studio-body-build"
                      className="studio-slider"
                      type="range"
                      min={buildRange.min}
                      max={buildRange.max}
                      step="0.1"
                      value={clamp(bodyBuild, buildRange)}
                      onPointerUp={() => notifyAtLimit("weight")}
                      onKeyUp={() => notifyAtLimit("weight")}
                      onChange={(event) =>
                        selectBodyBuild(Number(event.target.value))
                      }
                      aria-valuetext={`${bodyBuild} centimeters`}
                    />
                    <div className="studio-slider-limits">
                      <span>{buildRange.min} cm</span>
                      <span>{buildRange.max} cm</span>
                    </div>
                  </div>
                </div>

                {equippedItemsArray.length > 0 && (
                  <div
                    className="studio-fit-validation"
                    role="status"
                    style={{
                      margin: "12px 0",
                      padding: "12px",
                      borderRadius: "10px",
                      background: "#fff9e9",
                      border: "1px solid #e6d8ac",
                      color: "#675328",
                      fontSize: "12px",
                      lineHeight: 1.5,
                    }}
                  >
                    {sizeCaps && (
                      <p style={{ margin: "0 0 6px" }}>
                        <strong>Size cap active:</strong> while a size{" "}
                        {sizeCapLabels.join(" / ")} garment is equipped, Body
                        Build is capped at {sizeCaps.buildMax} cm and Height at{" "}
                        {sizeCaps.heightMax} cm (minimums stay{" "}
                        {BODY_BUILD_RANGE.min} cm / {HEIGHT_RANGE.min} cm).
                        Remove all clothing to restore the full ranges.
                      </p>
                    )}
                    {atHeightMax || atWeightMax ? (
                      <strong>
                        Maximum{" "}
                        {atHeightMax && atWeightMax
                          ? "height and body build"
                          : atHeightMax
                            ? "height"
                            : "body build"}{" "}
                        preview reached for the selected garment size. You can
                        move the slider backward, but not beyond its maximum.
                      </strong>
                    ) : fitLimits.hasHeight || fitLimits.hasWeight ? (
                      <span>
                        Garment size limits are active on the existing Height
                        and Body Build controls where seller data is available.
                      </span>
                    ) : (
                      <span>
                        No verified height or weight limits were provided for
                        these garments. Your normal slider limits remain
                        available; clothing size alone cannot determine body
                        build or height.
                      </span>
                    )}
                  </div>
                )}

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
                {isFemale && (
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
                        key={skinTone.name}
                        type="button"
                        className={
                          avatar.skinTone === skinTone.value ? "selected" : ""
                        }
                        style={{ backgroundColor: skinTone.value }}
                        onClick={() => updateAvatar("skinTone", skinTone.value)}
                        aria-pressed={avatar.skinTone === skinTone.value}
                        aria-label={skinTone.name}
                        title={skinTone.name}
                      />
                    ))}
                  </div>
                </div>

                <ControlGroup
                  label="Undertone"
                  value={avatar.undertone}
                  options={["Warm", "Cool", "Neutral"]}
                  onChange={(value) => updateAvatar("undertone", value)}
                />

                {/* FIX (style_occasion always 0 / ceiling 6/7): the shopper's
                    dressing-for context. api.js maps this to approved
                    style tags and sends them with every
                    recommendation + match-reasons request, so FR-7.2 rule 4
                    can finally fire on tag overlap. */}
                <ControlGroup
                  label="Style Focus"
                  value={avatar.styleFocus || "Casual"}
                  options={STYLE_FOCUS_OPTIONS}
                  onChange={(value) => updateAvatar("styleFocus", value)}
                />

                <button
                  type="button"
                  className={
                    isGuest ? "studio-registration-button" : "studio-save-preset"
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
                  Select Try Item to preview clothing on your avatar. Select
                  View Match Reasons to review its recommendation details. Click
                  a catalog product name to view its listing. Rate a
                  recommendation with the stars to feed your feedback (FR-7.5).
                </p>

                <p
                  className="studio-recommendation-note"
                  style={{ marginTop: "-8px", color: "#857660" }}
                >
                  Size gate active: clothing is listed only in your avatar size
                  ({proportion.size}). Dresses and other female-only cuts are
                  hidden on the male avatar.
                </p>

                {catalogLoading && (
                  <p role="status">Loading ranked recommendations...</p>
                )}

                {!catalogLoading && recommendationItems.length === 0 && (
                  <p role="status">
                    {catalogRecommendations.length === 0
                      ? "No catalog items available for recommendation."
                      : `No recommendations match your avatar's size (${proportion.size}) or gender. Move the Body Build slider to change your size, or switch gender to browse the other cut.`}
                  </p>
                )}

                {paginatedItems.map((item) => (
                  <article
                    key={item.id}
                    className={`studio-recommendation-item ${
                      selectedMatchIds.has(String(item.id))
                        ? "match-selected"
                        : ""
                    }`}
                  >
                    <RecommendationThumb item={item} />

                    <div className="studio-recommendation-information">
                      <h3>
                        <button
                          type="button"
                          className="studio-product-link"
                          onClick={() => openProductDetails(item)}
                          title="View product details"
                        >
                          {item.name}
                        </button>
                      </h3>
                      <p>{item.store}</p>
                      <strong>{formatCurrency(item.price)}</strong>
                      {item.size_cm && (
                        <small style={{ display: "block", color: "#857660" }}>
                          Size {item.size} {item.size_cm}
                        </small>
                      )}
                      {/* NEW (OBJ-05 / FR-7.5): rate the recommendation itself.
                          Registered: persisted via POST /ratings/ (upsert,
                          updateable). Guest: session-aggregated by the backend
                          + sign-up/login prompt. */}
                      <RatingControl
                        key={`rec-rating-${item.id}`}
                        itemId={item.id}
                        targetType={RATING_TARGET_TYPES.ITEM}
                        source={RATING_SOURCES.RECOMMENDATION_PANEL}
                        alwaysVisible
                        allowUpdate
                        label="Rate recommendation"
                        successNotice="Thanks for rating this recommendation."
                        initialRating={myRatings[String(item.id)] || 0}
                        authState={isGuest ? null : readAuthState()}
                        onGuestRate={openRegistrationPopup}
                      />
                    </div>

                    {item.total_score !== undefined &&
                      item.max_score !== undefined && (
                        <div
                          className="studio-match-score-badge"
                          style={{
                            padding: "8px 12px",
                            borderRadius: "8px",
                            background: "#f5f1e8",
                            border: "1px solid #d4c4a8",
                            textAlign: "center",
                            minWidth: "60px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "10px",
                              color: "#857660",
                              marginBottom: "2px",
                            }}
                          >
                            Match
                          </div>
                          <strong
                            style={{ fontSize: "16px", color: "#675328" }}
                          >
                            {item.total_score}/{item.max_score}
                          </strong>
                        </div>
                      )}

                    <button
                      type="button"
                      onClick={() => tryRecommendedItem(item)}
                    >
                      Try Item
                    </button>

                    <button
                      type="button"
                      className="studio-recommendation-match-button"
                      onClick={() => handleViewMatchReasons(item)}
                      aria-label={`View match reasons for ${item.name}`}
                    >
                      View Match Reasons
                    </button>
                  </article>
                ))}

                {totalPages > 1 && (
                  <div
                    className="studio-pagination-controls"
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "16px",
                      marginTop: "24px",
                      paddingTop: "24px",
                      borderTop: "1px solid #e8e0d0",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      style={{
                        padding: "10px 16px",
                        border: "1px solid #d4c4a8",
                        borderRadius: "8px",
                        background: currentPage === 1 ? "#f5f1e8" : "#fff",
                        color: currentPage === 1 ? "#999" : "#675328",
                        cursor: currentPage === 1 ? "not-allowed" : "pointer",
                        fontSize: "14px",
                        fontWeight: "600",
                      }}
                      aria-label="Previous page"
                    >
                      ← Previous
                    </button>

                    <span
                      style={{
                        color: "#675328",
                        fontSize: "14px",
                        fontWeight: "500",
                      }}
                    >
                      Page {currentPage} of {totalPages}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      style={{
                        padding: "10px 16px",
                        border: "1px solid #d4c4a8",
                        borderRadius: "8px",
                        background:
                          currentPage === totalPages ? "#f5f1e8" : "#fff",
                        color:
                          currentPage === totalPages ? "#999" : "#675328",
                        cursor:
                          currentPage === totalPages ? "not-allowed" : "pointer",
                        fontSize: "14px",
                        fontWeight: "600",
                      }}
                      aria-label="Next page"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="studio-avatar-card">
            <div className="studio-view-buttons">
              {STUDIO_VIEWS.map((view) => (
                <button
                  key={view}
                  type="button"
                  className={currentView === view ? "active" : ""}
                  aria-pressed={currentView === view}
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
              <AvatarCanvas
                avatar={avatar}
                view={currentView}
                equippedItems={equippedItems}
              />

              <div className="studio-avatar-summary">
                <div>
                  <span>Gender</span>
                  <strong>{avatar.gender}</strong>
                </div>
                <div>
                  <span>Size</span>
                  <strong>{proportion.size}</strong>
                </div>
                <div>
                  <span>Average</span>
                  <strong>{proportion.average} cm</strong>
                </div>
              </div>
            </div>
          </section>

          <aside className="studio-right-column">
            <div
              ref={matchPanelRef}
              className="studio-match-panel-container"
              tabIndex={-1}
              aria-label="Match reasons for your tried and reviewed items"
            >
              <MatchReasonsCard
                items={selectedMatchItems}
                avatar={avatar}
                isGuest={isGuest}
                requestVersion={matchRequestVersion}
                focusItemId={focusMatchItemId}
                loadMatchReasonsService={loadMatchReasons}
                onBrowse={handleRecommendations}
                onTryItem={tryRecommendedItem}
              />
            </div>

            <section className="studio-equipped-card">
              <h2>EQUIPPED ITEMS</h2>

              {equippedItemsArray.length === 0 ? (
                <div className="studio-empty-equipped">
                  <span aria-hidden="true">◇</span>
                  <h3>No clothing equipped</h3>
                  <p>
                    {isGuest
                      ? "Open Recommendations to try a clothing item on your avatar."
                      : "Open Recommendations and select Try Item."}
                  </p>
                </div>
              ) : (
                <div className="studio-equipped-list">
                  {Object.entries(equippedItems).map(([category, item]) =>
                    item ? (
                      <article key={category} className="studio-equipped-item">
                        <div>
                          <span>{category}</span>
                          <strong>
                            <button
                              type="button"
                              className="studio-product-link"
                              onClick={() => openProductDetails(item)}
                              title="View product details"
                            >
                              {item.name}
                            </button>
                          </strong>
                          <small>
                            Size {item.size} • {item.color}
                          </small>
                          {/* CHANGED (OBJ-01 / Criterion 9): tag the equipped-item
                              rating as fit-visualization evidence so the KPI
                              export can join it to the correct charter objective. */}
                          <RatingControl
                            key={`${category}-${item.id}`}
                            itemId={item.id}
                            targetType={RATING_TARGET_TYPES.FIT}
                            source={RATING_SOURCES.FIT_VISUALIZATION}
                            isEquipped={Boolean(item)}
                            authState={isGuest ? null : readAuthState()}
                            onGuestRate={openRegistrationPopup}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeEquippedItem(category)}
                        >
                          Remove
                        </button>
                      </article>
                    ) : null
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
                {isGuest ? "Browse Recommendations" : "Open Recommendations"}
              </button>

              <button
                type="button"
                className={
                  isGuest ? "studio-restricted-action" : "studio-save-outfit"
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
            </section>
          </aside>
        </div>
      </div>

      {/* ==========================================
          PRE-SESSION RATING POPUP (Criterion 9 / 11)
          Opens on first equip or opening Recommendations. Two 1-5 star
          questions, same direction as post so the gain math stays valid.
          Guests get the signup CTA instead of a submit button (FR-7.5).
      ========================================== */}
      {UAT_SURVEY_ENABLED && preSurveyOpen && (
        <div className="studio-modal-backdrop" role="presentation">
          <section
            className="studio-save-outfit-modal studio-survey-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="studio-pre-survey-title"
          >
            <p className="studio-modal-label">BEFORE YOU START STYLING</p>
            <h2 id="studio-pre-survey-title">
              Help us improve your experience!
            </h2>
            <p className="studio-modal-description">
              Before you start styling, how confident are you right now?
              Ratings are optional and never block your session (FR-7.5).
              {isGuest &&
                " As a guest your answers stay on this device unless you create an account."}
            </p>

            {STUDIO_SURVEY_QUESTIONS.map((question, index) => (
              <div key={question.key} className="studio-survey-question">
                <span>
                  {index + 1}. {question.prePrompt}
                </span>
                <div
                  className="studio-survey-scale"
                  role="group"
                  aria-label={`${question.prePrompt} (1 to 5)`}
                >
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      key={`${question.key}-${score}`}
                      type="button"
                      className={
                        preAnswers[question.key] === score ? "active" : ""
                      }
                      aria-pressed={preAnswers[question.key] === score}
                      aria-label={`${score} out of 5`}
                      onClick={() =>
                        setPreAnswers((current) => ({
                          ...current,
                          [question.key]: score,
                        }))
                      }
                    >
                      ★ {score}
                    </button>
                  ))}
                </div>
                <div className="studio-survey-scale-labels">
                  <span>1 = {question.preLowLabel}</span>
                  <span>5 = {question.preHighLabel}</span>
                </div>
              </div>
            ))}

            <div className="studio-save-outfit-actions">
              <button
                type="button"
                className="studio-save-cancel-button"
                onClick={skipPreSurvey}
              >
                Skip for now
              </button>
              {isGuest ? (
                <button
                  type="button"
                  className="studio-save-confirm-button"
                  onClick={handleGuestSurveyCta}
                >
                  {STUDIO_GUEST_CTA}
                </button>
              ) : (
                <button
                  type="button"
                  className="studio-save-confirm-button"
                  onClick={submitPreSurvey}
                >
                  Start Styling
                </button>
              )}
            </div>
            {surveySaving && (
              <p className="studio-survey-saving" role="status">
                Saving your ratings…
              </p>
            )}
          </section>
        </div>
      )}

      {/* ==========================================
          POST-SESSION RATING POPUP (Criterion 9 / 11)
          Opens on Save Outfit, leaving the studio, or 3 minutes idle.
          Captures the pre/post delta + the fit like/dislike, then resumes
          the paused navigation or Save-Outfit modal.
      ========================================== */}
      {UAT_SURVEY_ENABLED && postSurveyOpen && (
        <div className="studio-modal-backdrop" role="presentation">
          <section
            className="studio-save-outfit-modal studio-survey-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="studio-post-survey-title"
          >
            <p className="studio-modal-label">AFTER YOUR TRY-ON SESSION</p>
            <h2 id="studio-post-survey-title">How was your virtual try-on?</h2>
            <p className="studio-modal-description">
              You've explored some great looks! Quick check-in — skipping
              never blocks your session (FR-7.5).
              {isGuest &&
                " As a guest your answers stay on this device unless you create an account."}
            </p>

            {STUDIO_SURVEY_QUESTIONS.map((question, index) => (
              <div key={question.key} className="studio-survey-question">
                <span>
                  {index + 1}. {question.postPrompt}
                </span>
                <div
                  className="studio-survey-scale"
                  role="group"
                  aria-label={`${question.postPrompt} (1 to 5)`}
                >
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      key={`${question.key}-${score}`}
                      type="button"
                      className={
                        postAnswers[question.key] === score ? "active" : ""
                      }
                      aria-pressed={postAnswers[question.key] === score}
                      aria-label={`${score} out of 5`}
                      onClick={() =>
                        setPostAnswers((current) => ({
                          ...current,
                          [question.key]: score,
                        }))
                      }
                    >
                      ★ {score}
                    </button>
                  ))}
                </div>
                <div className="studio-survey-scale-labels">
                  <span>1 = {question.postLowLabel}</span>
                  <span>5 = {question.postHighLabel}</span>
                </div>
              </div>
            ))}

            <div className="studio-survey-question">
              <span>3. Did the fit visualization help you make better styling decisions?</span>
              <div className="studio-survey-vote">
                <button
                  type="button"
                  className={postVote === "like" ? "active" : ""}
                  aria-pressed={postVote === "like"}
                  onClick={() =>
                    setPostVote((current) => (current === "like" ? "" : "like"))
                  }
                >
                  👍 Like
                </button>
                <button
                  type="button"
                  className={postVote === "dislike" ? "active" : ""}
                  aria-pressed={postVote === "dislike"}
                  onClick={() =>
                    setPostVote((current) =>
                      current === "dislike" ? "" : "dislike"
                    )
                  }
                >
                  👎 Dislike
                </button>
              </div>
            </div>

            <div className="studio-save-outfit-actions">
              <button
                type="button"
                className="studio-save-cancel-button"
                onClick={skipPostSurvey}
              >
                Skip
              </button>
              {isGuest ? (
                <button
                  type="button"
                  className="studio-save-confirm-button"
                  onClick={handleGuestSurveyCta}
                >
                  {STUDIO_GUEST_CTA}
                </button>
              ) : (
                <button
                  type="button"
                  className="studio-save-confirm-button"
                  onClick={submitPostSurvey}
                >
                  Submit & Continue
                </button>
              )}
            </div>
            {surveySaving && (
              <p className="studio-survey-saving" role="status">
                Saving your ratings…
              </p>
            )}
          </section>
        </div>
      )}

      {notification && (
        <div className="studio-notification" role="status">
          {notification}
        </div>
      )}

      {showSaveAvatarModal && !isGuest && (
        <div
          className="studio-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeSaveAvatarModal();
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
              onClick={closeSaveAvatarModal}
              aria-label="Close save avatar preset popup"
            >
              ×
            </button>
            <p className="studio-modal-label">SAVE YOUR AVATAR</p>
            <h2 id="studio-avatar-preset-title">Save Avatar Preset</h2>
            <p className="studio-modal-description">
              Enter a name for your customized avatar before saving it to
              Avatar Presets.
            </p>
            <form onSubmit={confirmSaveAvatarPreset} noValidate>
              <label
                className="studio-save-outfit-field"
                htmlFor="studio-avatar-preset-name"
              >
                Preset Name <span>*</span>
              </label>
              <input
                id="studio-avatar-preset-name"
                type="text"
                className={
                  "studio-save-outfit-input " +
                  (avatarPresetNameError ? "invalid" : "")
                }
                value={avatarPresetName}
                onChange={(event) => {
                  setAvatarPresetName(event.target.value);
                  setAvatarPresetNameError("");
                }}
                placeholder="e.g. My Everyday Avatar"
                maxLength={50}
                autoFocus
                required
                aria-invalid={Boolean(avatarPresetNameError)}
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
                  <span>Required field</span>
                )}
                <span>{avatarPresetName.length}/50</span>
              </div>
              <div className="studio-save-outfit-actions">
                <button
                  type="button"
                  className="studio-save-cancel-button"
                  onClick={closeSaveAvatarModal}
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

      {showSaveOutfitModal && !isGuest && (
        <div
          className="studio-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeSaveOutfitModal();
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
            <p className="studio-modal-label">SAVE YOUR LOOK</p>
            <h2 id="studio-save-title">Save Outfit</h2>
            <p className="studio-modal-description">
              Give your outfit a name so you can easily find it in Saved
              Outfits.
            </p>
            <form onSubmit={confirmSaveOutfit} noValidate>
              <label
                className="studio-save-outfit-field"
                htmlFor="studio-outfit-name"
              >
                Outfit Name <span>*</span>
              </label>
              <input
                id="studio-outfit-name"
                type="text"
                className={
                  "studio-save-outfit-input " + (outfitNameError ? "invalid" : "")
                }
                value={outfitName}
                onChange={(event) => {
                  setOutfitName(event.target.value);
                  setOutfitNameError("");
                }}
                placeholder="e.g. Weekend Casual"
                maxLength={50}
                autoFocus
                required
                aria-invalid={Boolean(outfitNameError)}
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
                    role="alert"
                  >
                    {outfitNameError}
                  </span>
                ) : (
                  <span>Required field</span>
                )}
                <span>{outfitName.length}/50</span>
              </div>
              <div className="studio-save-outfit-actions">
                <button
                  type="button"
                  className="studio-save-cancel-button"
                  onClick={closeSaveOutfitModal}
                >
                  Cancel
                </button>
                <button type="submit" className="studio-save-confirm-button">
                  Save Outfit
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {showRegistrationModal && (
        <div
          className="studio-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget)
              setShowRegistrationModal(false);
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
              onClick={() => setShowRegistrationModal(false)}
            >
              ×
            </button>
            <div className="studio-modal-icon">◇</div>
            <p className="studio-modal-label">REGISTRATION REQUIRED</p>
            <h2 id="registration-title">
              Unlock the complete fitting experience
            </h2>
            <p className="studio-modal-description">
              Create an account or log in to save avatar presets and outfits,
              and add clothing items to your cart. You can continue trying
              clothing as a Guest.
            </p>
            <div className="studio-modal-actions">
              <button
                type="button"
                className="studio-modal-primary"
                onClick={() => navigate("/signup")}
              >
                Create Account
              </button>
              <button
                type="button"
                className="studio-modal-secondary"
                onClick={() => navigate("/login")}
              >
                Log In
              </button>
            </div>
            <button
              type="button"
              className="studio-modal-continue"
              onClick={() => setShowRegistrationModal(false)}
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