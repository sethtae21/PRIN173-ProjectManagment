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
  authApi,
  API_URL,
} from "../services/api";
import {
  UAT_PAIRED_QUESTIONS,
  RATING_SOURCES,
  RATING_TARGET_TYPES,
  isUATAnswer,
  uatSessionStorageKey,
  RECOMMENDATION_RATING_COPY,
  FIT_RATING_COPY,
  PRE_CHECK_COPY,
  POST_CHECK_COPY,
  GUEST_RATING_CTA,
  GUEST_PENDING_RATING_KEY,
  panelOverallTargetId,
} from "../services/uat";
import RatingModal from "../components/RatingControl";
import AvatarCanvas from "./Shopper/AvatarCanvas";
import "./css/FittingStudioPage.css";

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
// catalog (SRS FR-3.1 category list). Gate on the RAW CATEGORY token only --
// never the product NAME (a "dress shirt" is menswear) and never the backend
// gender tag (seed data mis-tags approved menswear as "Women").
const FEMALE_ONLY_CATEGORY_PATTERN = /dress|gown|jumpsuit|romper|one-?piece/i;

// CHANGED (rating redesign): the four button-triggered rating surfaces.
const RATING_COPY_BY_KIND = {
  recommendations: RECOMMENDATION_RATING_COPY,
  fit: FIT_RATING_COPY,
  pre: PRE_CHECK_COPY,
  post: POST_CHECK_COPY,
};

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
  if (
    !equipped ||
    typeof equipped !== "object" ||
    normalizeGender(avatarGender) !== "Male"
  ) {
    return equipped;
  }

  let changed = false;
  const next = { ...equipped };

  for (const key of Object.keys(next)) {
    if (next[key] && isFemaleOnlyItem(next[key])) {
      next[key] = null;
      changed = true;
    }
  }

  return changed ? next : equipped;
}

// Surface the REAL server validation message (KAN-115 UAT feedback) instead of
// a generic string, so a contract mismatch is visible to the user and testers.
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

// CHANGED (footwear permanently removed): only top / bottom slots exist.
function normalizeCategory(category) {
  const label = String(category || "").toLowerCase();

  if (/pant|trouser|jean|short|skirt|bottom/.test(label)) {
    return "bottom";
  }

  return "top";
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

  return {
    ...item,
    id,
    name: resolvedName,
    store:
      item.store ||
      item.store_name ||
      item.sellerName ||
      "FitFusion Store",
    category: normalizeCategory(item.category),
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
    size_regions: item.size_regions,
  };
}

// CHANGED (footwear removed): every garment must match the avatar size.
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

// One self-contained section per item: each owns its own fetch of the FR-7.2
// breakdown so garments can be expanded, loaded, retried and collapsed
// independently.
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

// Slot-keyed match reasons: at most one section per body slot (top / bottom),
// in slot order. Trying on or reviewing a garment replaces the previous card
// of its slot.
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

  const [expandedIds, setExpandedIds] = useState(() => itemIds);

  const avatarContext = JSON.stringify({ avatar, isGuest });
  const previousAvatarContext = useRef(avatarContext);
  const previousRequestVersion = useRef(requestVersion);

  useEffect(() => {
    if (previousAvatarContext.current === avatarContext) return;
    previousAvatarContext.current = avatarContext;
    setExpandedIds([]);
  }, [avatarContext]);

  useEffect(() => {
    if (previousRequestVersion.current === requestVersion) return;
    previousRequestVersion.current = requestVersion;

    if (!focusItemId) return;

    const focus = String(focusItemId);
    setExpandedIds((current) =>
      current.includes(focus) ? current : [...current, focus]
    );
  }, [requestVersion, focusItemId]);

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

// SIZE CAPS: while clothing is equipped, slider MINIMUMS stay fixed and only
// the MAXIMUMS snap to the equipped garment size band (client mirror of
// backend knowledge_table.py). With nothing equipped both sliders keep their
// full ranges.
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

  const [avatar, setAvatar] = useState(() => {
    const session = readStudioSession(isGuest);
    const activeId = readActivePresetId(isGuest);
    const sessionMatchesActive =
      !activeId || String(session?.avatarPresetId ?? "") === activeId;

    const base =
      session?.avatar && sessionMatchesActive
        ? session.avatar
        : loadAvatar(isGuest);

    return reconcileAvatarGender(
      { ...base, styleFocus: base.styleFocus || "Casual" },
      isGuest
    );
  });

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

  // CHANGED (footwear permanently removed): top / bottom slots only.
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

  const [originalDimensions, setOriginalDimensions] = useState(() => null);

  const [catalogRecommendations, setCatalogRecommendations] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

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
  const [focusMatchItemId, setFocusMatchItemId] = useState("");

  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showSaveOutfitModal, setShowSaveOutfitModal] = useState(false);
  const [showSaveAvatarModal, setShowSaveAvatarModal] = useState(false);

  const [avatarPresetName, setAvatarPresetName] = useState("");
  const [avatarPresetNameError, setAvatarPresetNameError] = useState("");

  const [outfitName, setOutfitName] = useState("");
  const [outfitNameError, setOutfitNameError] = useState("");
  const [notification, setNotification] = useState("");

  // Charter tester-mode UAT survey (?uat=1) — unchanged instrument.
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
  // NEW (rating redesign): button-triggered star modals. NO auto popups,
  // NO navigation interception, NO idle timers. One shared modal state
  // drives all four surfaces (recommendations / fit / pre / post).
  // Guests: payload held in sessionStorage + sign-up/login modal; the DB
  // write is blocked (FR-7.5 / FR-1.9).
  // ------------------------------------------------------------------
  const [studioSessionId] = useState(
    () =>
      `studio-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 10)}`
  );
  const [ratingModal, setRatingModal] = useState(null); // { kind, values }
  const [ratingSaving, setRatingSaving] = useState(false);
  const [ratingError, setRatingError] = useState("");
  const [guestRatingPromptOpen, setGuestRatingPromptOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);

  const basePath = isGuest ? "/guest" : "/shopper";
  const uatEnabled = !isGuest && new URLSearchParams(window.location.search).get("uat") === "1";
  const isFemale = avatar.gender.toLowerCase() === "female";
  const bodyBuild = weightToVisualBuild(avatar.height, avatar.weight);
  const currentUatAnswers = uatPhase === "before" ? uatBeforeAnswers : uatAfterAnswers;
  const uatSurveyVisible = uatEnabled && !isGuest && uatCurrentProductId;

  const proportion = useMemo(
    () => bodyProportion(avatar.height, bodyBuild),
    [avatar.height, bodyBuild]
  );

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

  const selectedMatchItems = useMemo(
    () => Object.values(selectedMatchSlots).filter(Boolean),
    [selectedMatchSlots]
  );

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

  useEffect(() => {
    if (prevGenderRef.current !== avatar.gender) {
      setEquippedItems({ top: null, bottom: null });
      setSelectedMatchSlots({ top: null, bottom: null });
      setFocusMatchItemId("");
      setOriginalDimensions(null);
      prevGenderRef.current = avatar.gender;
    }
  }, [avatar.gender]);

  useEffect(() => {
    setAvatar((current) => applySizeCaps(current, sizeCaps));
  }, [sizeCaps]);

  useEffect(() => {
    if (!uatCurrentProductId) return;
    setUatBeforeAnswers(readUatPhaseAnswers(uatCurrentProductId, "before"));
    setUatAfterAnswers(readUatPhaseAnswers(uatCurrentProductId, "after"));
  }, [uatCurrentProductId]);

  // Pending item hand-off (product page / saved outfits -> studio).
  useEffect(() => {
    const key = pendingKey(isGuest);
    const pending = readJson(sessionStorage, key);

    if (!pending) return;

    sessionStorage.removeItem(key);

    const item = normalizeStudioItem(pending);

    if (!item) return;

    if (uatEnabled && !isGuest) {
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

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function avatarContextSnapshot() {
    return {
      gender: avatar.gender,
      height: avatar.height,
      weight: avatar.weight,
      body_build_cm: bodyBuild,
    };
  }

  // ------------------------------------------------------------------
  // Rating modal plumbing (stars only, button-triggered).
  // ------------------------------------------------------------------
  function openRatingModal(kind) {
    setRatingError("");
    setRatingModal({ kind, values: {} });
  }

  function closeRatingModal() {
    setRatingModal(null);
    setRatingError("");
  }

  function setRatingValue(key, score) {
    setRatingModal((current) =>
      current
        ? { ...current, values: { ...current.values, [key]: score } }
        : current
    );
  }

  // Guest hold: sessionStorage ONLY (dies with the tab/session, FR-1.9), then
  // the sign-up/login modal. No network write ever happens for guests.
  function holdGuestRating(kind, values) {
    try {
      sessionStorage.setItem(
        GUEST_PENDING_RATING_KEY,
        JSON.stringify({ kind, values, session_id: studioSessionId })
      );
    } catch {
      // storage unavailable: the prompt still opens; nothing is persisted
    }
    closeRatingModal();
    setGuestRatingPromptOpen(true);
  }

  async function handleRatingPrimary() {
    if (!ratingModal) return;
    const { kind, values } = ratingModal;
    const config = RATING_COPY_BY_KIND[kind];

    const missing = config.questions.some((q) => values[q.key] == null);
    if (missing) {
      setRatingError("Please select a star rating for every question.");
      return;
    }

    if (isGuest) {
      holdGuestRating(kind, values);
      return;
    }

    setRatingSaving(true);
    setRatingError("");
    try {
      if (kind === "recommendations") {
        // ONE rating for the OVERALL recommendation set (Criterion 10).
        await ratingsApi.submit({
          target_type: RATING_TARGET_TYPES.ITEM,
          target_id: panelOverallTargetId(studioSessionId),
          score: values.score,
          source: RATING_SOURCES.RECOMMENDATION_PANEL,
        });
        window.dispatchEvent(new Event("fitfusion-rating-updated"));
        displayNotification("Thanks! Rating saved.");
      } else if (kind === "fit") {
        // On-avatar look: one fit_visualization row per equipped garment so
        // the OBJ-01 user+product join keeps working, plus the visit survey's
        // fit_rating_score (Criterion 9).
        const ids = equippedItemsArray.map((item) => String(item.id));
        await Promise.all(
          ids.map((targetId) =>
            ratingsApi.submit({
              target_type: RATING_TARGET_TYPES.FIT,
              target_id: targetId,
              score: values.score,
              source: RATING_SOURCES.FIT_VISUALIZATION,
            })
          )
        );
        await authApi.submitFittingStudioSurvey({
          session_id: studioSessionId,
          fit_rating_score: values.score,
          equipped_item_ids: ids,
          avatar_context: avatarContextSnapshot(),
        });
        window.dispatchEvent(new Event("fitfusion-rating-updated"));
        displayNotification("Thanks! Rating saved.");
      } else if (kind === "pre") {
        await authApi.submitFittingStudioSurvey({
          session_id: studioSessionId,
          pre_confidence: values.confidence,
          pre_return_intent: values.return_intent,
          equipped_item_ids: equippedItemsArray.map((item) => String(item.id)),
          avatar_context: avatarContextSnapshot(),
        });
        displayNotification("Pre-session check saved.");
      } else {
        await authApi.submitFittingStudioSurvey({
          session_id: studioSessionId,
          post_confidence: values.confidence,
          post_return_intent: values.return_intent,
          equipped_item_ids: equippedItemsArray.map((item) => String(item.id)),
          avatar_context: avatarContextSnapshot(),
        });
        displayNotification("Post-session check saved.");
      }
      closeRatingModal();
    } catch (error) {
      console.warn("Unable to save rating:", error?.message || error);
      setRatingError(
        extractApiError(error, "Unable to save your rating. Please try again.")
      );
    } finally {
      setRatingSaving(false);
    }
  }

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

    navigate(`${basePath}/products/${encodeURIComponent(item.id)}`, {
      state: { fromFittingStudio: true },
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
  }

  function removeEquippedItem(category) {
    const removedItem = equippedItems[category];

    if (!removedItem) return;

    const next = { ...equippedItems, [category]: null };
    const hasRemaining = Object.values(next).some(Boolean);

    setEquippedItems(next);

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
    const session = readUatSession();
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

  function handleRecommendations() {
    setActivePanel("recommendations");

    window.requestAnimationFrame(() => {
      recommendationsRef.current?.focus({ preventScroll: true });
      recommendationsRef.current?.scrollIntoView({
        block: "start",
        behavior: "auto",
      });
    });
  }

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

  // CHANGED (rating redesign): Save Outfit no longer gates on a survey popup.
  function saveOutfit() {
    if (isGuest) {
      openRegistrationPopup();
      return;
    }

    if (equippedItemsArray.length === 0) {
      displayNotification("Try at least one clothing item before saving.");
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

    navigate("/shopper/fitting-studio/select-items");
  }

  const activeRatingConfig = ratingModal
    ? RATING_COPY_BY_KIND[ratingModal.kind]
    : null;

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

          <button
            type="button"
            className="studio-change-gender"
            onClick={() => {
              sessionStorage.removeItem(sessionKey(isGuest));
              navigate(`${basePath}/fitting-studio`);
            }}
          >
            Change Gender
          </button>
        </section>

        {uatSurveyOpen && uatCurrentProductId && (
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

        {uatThankYouVisible && (
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
              <button
                type="button"
                className={activePanel === "recommendations" ? "active" : ""}
                aria-pressed={activePanel === "recommendations"}
                onClick={() => setActivePanel("recommendations")}
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
                  a catalog product name to view its listing.
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

                {/* NEW (rating redesign): ONE button rating the OVERALL
                    recommendation set — not per-item stars. */}
                <div className="studio-rating-actions">
                  <button
                    type="button"
                    className="studio-rate-button"
                    onClick={() => openRatingModal("recommendations")}
                  >
                    {RECOMMENDATION_RATING_COPY.buttonLabel}
                  </button>
                </div>
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

            {/* NEW (rating redesign): canvas-side rating buttons. The fit
                button stays disabled until at least one garment is equipped;
                the pre/post checks are always available and optional. */}
            <div className="studio-rating-actions studio-rating-actions-canvas">
              <button
                type="button"
                className="studio-rate-button"
                disabled={equippedItemsArray.length === 0}
                title={
                  equippedItemsArray.length === 0
                    ? "Equip at least one garment to rate the avatar look"
                    : undefined
                }
                onClick={() => openRatingModal("fit")}
              >
                {FIT_RATING_COPY.buttonLabel}
              </button>
              <button
                type="button"
                className="studio-rate-button"
                onClick={() => openRatingModal("pre")}
              >
                {PRE_CHECK_COPY.buttonLabel}
              </button>
              <button
                type="button"
                className="studio-rate-button"
                onClick={() => openRatingModal("post")}
              >
                {POST_CHECK_COPY.buttonLabel}
              </button>
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

      {/* NEW (rating redesign): the single shared star modal for all four
          button-triggered surfaces. Guests get the sign-up CTA as the primary
          button; their payload is held in sessionStorage only. */}
      {ratingModal && activeRatingConfig && (
        <RatingModal
          config={activeRatingConfig}
          values={ratingModal.values}
          onChange={setRatingValue}
          onPrimary={handleRatingPrimary}
          onClose={closeRatingModal}
          primaryLabel={isGuest ? GUEST_RATING_CTA : activeRatingConfig.submitLabel}
          saving={ratingSaving}
          error={ratingError}
        />
      )}

      {/* NEW (rating redesign): guest hold prompt (FR-7.5 / FR-1.9). */}
      {guestRatingPromptOpen && (
        <div
          className="studio-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget)
              setGuestRatingPromptOpen(false);
          }}
        >
          <section
            className="studio-registration-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guest-rating-title"
          >
            <button
              type="button"
              className="studio-modal-close"
              aria-label="Close rating prompt"
              onClick={() => setGuestRatingPromptOpen(false)}
            >
              ×
            </button>
            <div className="studio-modal-icon">★</div>
            <p className="studio-modal-label">RATING HELD FOR THIS SESSION</p>
            <h2 id="guest-rating-title">
              Sign up or Log in to save your rating
            </h2>
            <p className="studio-modal-description">
              Your rating is held in this browser session only and is discarded
              when the session ends. Create an account or log in to save it to
              your profile.
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
              onClick={() => setGuestRatingPromptOpen(false)}
            >
              Maybe later
            </button>
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