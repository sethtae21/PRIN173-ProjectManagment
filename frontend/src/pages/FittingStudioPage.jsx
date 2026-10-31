import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  presetsApi,
  outfitsApi,
  bodyProportion,
  fetchRankedRecommendations,
  loadMatchReasons,
} from "../services/api";
import RatingControl from "../components/RatingControl";
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

const HEIGHT_RANGE = { min: 120, max: 218 };
const WEIGHT_RANGE = { min: 30, max: 200 };

const BODY_BUILDS = ["Slim", "Balanced", "Full", "Curve"];
const BUILD_BMI = {
  Slim: 17.5,
  Balanced: 21.7,
  Full: 27.5,
  Curve: 32,
};

const MATCH_CATEGORIES = [
  { key: "colorCompatibility", label: "Color compatibility" },
  { key: "heightContrast", label: "Height contrast" },
  { key: "proportionShading", label: "Proportion shading" },
  { key: "styleOccasion", label: "Style / occasion match" },
];

// FIX (dress on male avatar): one-piece DRESS-class cuts are female-only in
// this catalog (SRS category list: tops/bottoms/dresses/outerwear/footwear).
// We gate on the RAW CATEGORY token only -- never the product name (a
// "dress shirt" is menswear) and never the backend gender tag (the approved
// blazer is mis-tagged "Women" in seed data, so trusting it would hide the
// very garments the user signed off on). Deterministic, no ML (charter
// boundary preserved): the male avatar simply is not offered, cannot equip,
// and never renders a dress-class item.
const FEMALE_ONLY_CATEGORY_PATTERN = /dress|gown|jumpsuit|romper|one-?piece/i;

function isFemaleOnlyItem(item) {
  if (!item) return false;
  if (item.femaleOnlyCut === true) return true;
  return FEMALE_ONLY_CATEGORY_PATTERN.test(String(item.rawCategory || ""));
}

function avatarGenderAllowsItem(avatarGender, item) {
  if (normalizeGender(avatarGender) !== "Male") return true; // female: show all
  return !isFemaleOnlyItem(item);
}

// Strip any female-only cut already sitting in an equipped slot (e.g. a
// dress restored from a pre-fix session) so it cannot paint on a male body.
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

  if (/shoe|sneaker|footwear|boot|sandal/.test(label)) {
    return "shoes";
  }

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
// FIX (dress on male): preserve the RAW category + a femaleOnlyCut flag so
// the gender gate survives the category collapse (a dress would otherwise be
// relabelled "top" and slip onto the male torso).
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

function matchesAvatarSize(item, avatarSize) {
  if (!item) return false;
  if (item.category === "shoes") return true;
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
          String(entry?.size || entry?.label || "").toUpperCase() ===
          size
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
    record?.[type] && typeof record[type] === "object"
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

function readAuthState() {
  if (!localStorage.getItem("access_token")) return null;

  try {
    const user = JSON.parse(
      localStorage.getItem("fitfusion-current-user") || "null"
    );
    return user || {};
  } catch {
    return {};
  }
}

function normalizeGender(value) {
  return String(value).toLowerCase() === "male" ? "Male" : "Female";
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

function choiceValue(value) {
  return String(value || "").trim().toLowerCase();
}

function capitalizeChoice(value, fallback) {
  const text = String(value || "").trim();
  if (!text) return fallback;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function round2(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.round(number * 100) / 100;
}

function toServerPreset(avatar, name, isFemale) {
  return {
    name,
    gender: choiceValue(avatar.gender),
    height: round2(avatar.height) ?? 160,
    weight: round2(avatar.weight) ?? 55,
    skin_tone: avatar.skinTone || "#dca77d",
    undertone: choiceValue(avatar.undertone),
    shoulder: choiceValue(avatar.shoulder),
    waist: choiceValue(avatar.waist),
    hip: choiceValue(avatar.hip),
    thigh: choiceValue(avatar.thigh),
    cup_size: isFemale ? avatar.cupSize || "B" : null,
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
    builtIn: false,
  };
}

function loadAvatar(isGuest) {
  const storage = isGuest ? sessionStorage : localStorage;
  const genderKey = isGuest
    ? "fitfusion-guest-avatar-gender"
    : "fitfusion-avatar-gender";
  const presetKey = isGuest
    ? "fitfusion-guest-avatar-preset"
    : "fitfusion-avatar-preset";
  const savedPreset = readJson(storage, presetKey);

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

function MatchReasonsCard({
  item,
  avatar,
  isGuest,
  requestVersion,
  loadMatchReasonsService,
  onBrowse,
  onTryItem,
}) {
  const [expanded, setExpanded] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const [result, setResult] = useState({
    status: "idle",
    rows: [],
    context: "",
  });

  const context = JSON.stringify({ item, avatar, isGuest });

  const previousContext = useRef(context);
  const previousRequestVersion = useRef(requestVersion);

  useEffect(() => {
    const requestedFromRecommendation =
      previousRequestVersion.current !== requestVersion;
    const contextChanged = previousContext.current !== context;

    previousRequestVersion.current = requestVersion;
    previousContext.current = context;

    if (requestedFromRecommendation) {
      setExpanded(true);
      setRequestCount((count) => count + 1);
    } else if (contextChanged) {
      setExpanded(false);
      setResult({ status: "idle", rows: [], context: "" });
    }
  }, [context, requestVersion]);

  useEffect(() => {
    if (!expanded || !item) return;

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

  return (
    <section
      className="studio-match-card"
      aria-labelledby="studio-match-heading"
    >
      <div className="studio-match-heading">
        <span className="studio-match-icon" aria-hidden="true">
          ✧
        </span>
        <div>
          <p>RECOMMENDATION DETAILS</p>
          <h2 id="studio-match-heading">View Match Reasons</h2>
        </div>
      </div>

      {!item ? (
        <div className="studio-match-empty">
          <p>
            Select View Match Reasons on a recommended item to review its
            scores and explanation.
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
        <>
          <div className="studio-match-selected-item">
            <span>SELECTED ITEM</span>
            <h3>{item.name}</h3>
            <p>{item.store}</p>
          </div>

          <button
            type="button"
            className="studio-match-primary-button"
            aria-expanded={expanded}
            aria-controls="studio-match-breakdown"
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? "Hide Match Reasons" : "View Match Reasons"}
            <span aria-hidden="true">{expanded ? "−" : "+"}</span>
          </button>

          {expanded && (
            <div
              id="studio-match-breakdown"
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
                    setExpanded(false);
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
        </>
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

function FittingStudioPage({ isGuest = false }) {
  const navigate = useNavigate();
  const recommendationsRef = useRef(null);
  const matchPanelRef = useRef(null);

  const [avatar, setAvatar] = useState(
    () =>
      reconcileAvatarGender(
        readStudioSession(isGuest)?.avatar || loadAvatar(isGuest),
        isGuest
      )
  );

  const [currentView, setCurrentView] = useState(() => {
    const stored = readStudioSession(isGuest)?.currentView || "Front";
    return STUDIO_VIEWS.includes(stored) ? stored : "Front";
  });

  const [activePanel, setActivePanel] = useState("customize");

  // FIX (dress on male): sanitize the restored session so a dress equipped
  // before this fix cannot reappear on the male avatar after a reload.
  const [equippedItems, setEquippedItems] = useState(
    () =>
      sanitizeEquipped(
        readStudioSession(isGuest)?.equippedItems || {
          top: null,
          bottom: null,
          shoes: null,
        },
        avatar.gender
      )
  );

  const [originalDimensions, setOriginalDimensions] = useState(
    () => readStudioSession(isGuest)?.originalDimensions || null
  );

  const [catalogRecommendations, setCatalogRecommendations] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [selectedMatchItem, setSelectedMatchItem] = useState(null);
  const [matchRequestVersion, setMatchRequestVersion] = useState(0);

  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showSaveOutfitModal, setShowSaveOutfitModal] = useState(false);
  const [showSaveAvatarModal, setShowSaveAvatarModal] = useState(false);

  const [avatarPresetName, setAvatarPresetName] = useState("");
  const [avatarPresetNameError, setAvatarPresetNameError] = useState("");

  const [outfitName, setOutfitName] = useState("");
  const [outfitNameError, setOutfitNameError] = useState("");
  const [notification, setNotification] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const basePath = isGuest ? "/guest" : "/shopper";
  const isFemale = avatar.gender.toLowerCase() === "female";
  const bodyBuild = weightToVisualBuild(avatar.height, avatar.weight);

  const proportion = useMemo(
    () => bodyProportion(avatar.height, bodyBuild),
    [avatar.height, bodyBuild]
  );

  const equippedItemsArray = useMemo(
    () => Object.values(equippedItems).filter(Boolean),
    [equippedItems]
  );

  const fitLimits = useMemo(
    () => combinedFitLimits(equippedItems),
    [equippedItems]
  );

  // FIX (dress on male): gender gate chained after the size gate, so a
  // dress-class card is never even listed for the male avatar.
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

  // FIX (dress on male): the ranking endpoint only consumes undertone +
  // height_cm + body_shape; key the fetch on exactly those (debounced) so
  // slider drags no longer fire a request per pixel.
  const recommendationKey = useMemo(
    () =>
      JSON.stringify({
        undertone: String(avatar.undertone || "").toLowerCase(),
        heightCm: Math.round(Number(avatar.height) || 0),
        bodyShape: [avatar.shoulder, avatar.waist, avatar.hip, avatar.thigh]
          .map((value) => String(value || "").toLowerCase())
          .join("|"),
      }),
    [
      avatar.undertone,
      avatar.height,
      avatar.shoulder,
      avatar.waist,
      avatar.hip,
      avatar.thigh,
    ]
  );

  useEffect(() => {
    sessionStorage.setItem(
      sessionKey(isGuest),
      JSON.stringify({ avatar, currentView, equippedItems, originalDimensions })
    );
  }, [avatar, currentView, equippedItems, originalDimensions, isGuest]);

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

  // FIX (dress on male): if the avatar gender flips to Male while a
  // dress-class item is equipped, purge it from the slot immediately.
  useEffect(() => {
    setEquippedItems((current) => sanitizeEquipped(current, avatar.gender));
  }, [avatar.gender]);

  useEffect(() => {
    const key = pendingKey(isGuest);
    const pending = readJson(sessionStorage, key);

    if (!pending) return;

    sessionStorage.removeItem(key);

    const item = normalizeStudioItem(pending);

    if (!item) return;

    // FIX (dress on male): a pending dress carried from a product page must
    // not auto-equip on the male avatar.
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
    setSelectedMatchItem(item);
    setAvatar((current) => applyFitLimits(current, nextLimits));

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

  function openProductDetails(item) {
    sessionStorage.setItem(
      sessionKey(isGuest),
      JSON.stringify({ avatar, currentView, equippedItems, originalDimensions })
    );

    navigate(`${basePath}/products/${encodeURIComponent(item.id)}`, {
      state: { fromFittingStudio: true },
    });
  }

  function updateAvatar(field, value) {
    if (field === "height") {
      const nextHeight = clamp(value, fitLimits.height);
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
    const nextBuild = clamp(value, BODY_BUILD_RANGE);
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

    if (
      fitLimits[flag] &&
      Number(avatar[field]) >= fitLimits[field].max
    ) {
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

      closeSaveAvatarModal();
      displayNotification(`"${name}" was saved to Avatar Presets.`);
    } catch (error) {
      console.error("Unable to save avatar preset:", error);
      setAvatarPresetNameError(
        "Unable to save your avatar preset. Please try again."
      );
    }
  }

  function tryRecommendedItem(rawItem) {
    const item = normalizeStudioItem(rawItem);

    if (!item) return;

    // FIX (dress on male): refuse to equip a female-only cut on the male
    // avatar (the card is already hidden, this guards stale/direct calls).
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

    setSelectedMatchItem(item);
    setEquippedItems(next);
    setAvatar((current) => applyFitLimits(current, nextLimits));

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

    setSelectedMatchItem((current) => {
      if (!hasRemaining) return null;

      if (
        current &&
        String(current.id) === String(removedItem.id) &&
        current.category === removedItem.category
      ) {
        return null;
      }

      return current;
    });

    if (!hasRemaining) {
      if (originalDimensions) {
        setAvatar((current) => ({ ...current, ...originalDimensions }));
      }
      setOriginalDimensions(null);
    } else {
      setAvatar((current) => applyFitLimits(current, combinedFitLimits(next)));
    }
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

    setSelectedMatchItem(item);
    setMatchRequestVersion((version) => version + 1);

    window.requestAnimationFrame(() => {
      matchPanelRef.current?.focus({ preventScroll: true });
      matchPanelRef.current?.scrollIntoView({
        block: "nearest",
        behavior: "auto",
      });
    });
  }

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

    const savedProducts = equippedItemsArray.map((item) => ({
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
      name: trimmedName,
      occasion: "Casual",
      description: "",
      avatarView: currentView.toLowerCase(),
      avatar: {
        ...avatar,
        cupSize: isFemale ? avatar.cupSize : null,
        view: currentView,
      },
      products: savedProducts,
      items: equippedItemsArray,
    };

    try {
      await outfitsApi.create(newOutfit);
      closeSaveOutfitModal();

      window.dispatchEvent(new Event("fitfusion-outfits-updated"));

      displayNotification(`"${trimmedName}" was saved successfully!`);
    } catch {
      setOutfitNameError("Unable to save your outfit. Please try again.");
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
      JSON.stringify(equippedItemsArray.map((item) => ({ ...item, quantity: 1 })))
    );

    navigate("/shopper/fitting-studio/select-items");
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
                      min={fitLimits.height.min}
                      max={fitLimits.height.max}
                      step="0.1"
                      value={clamp(avatar.height, fitLimits.height)}
                      onPointerUp={() => notifyAtLimit("height")}
                      onKeyUp={() => notifyAtLimit("height")}
                      onChange={(event) =>
                        updateAvatar("height", event.target.value)
                      }
                      aria-valuetext={`${avatar.height} centimeters`}
                    />
                    <div className="studio-slider-limits">
                      <span>{fitLimits.height.min} cm</span>
                      <span>{fitLimits.height.max} cm</span>
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
                      min={BODY_BUILD_RANGE.min}
                      max={BODY_BUILD_RANGE.max}
                      step="0.1"
                      value={clamp(bodyBuild, BODY_BUILD_RANGE)}
                      onPointerUp={() => notifyAtLimit("weight")}
                      onKeyUp={() => notifyAtLimit("weight")}
                      onChange={(event) =>
                        selectBodyBuild(Number(event.target.value))
                      }
                      aria-valuetext={`${bodyBuild} centimeters`}
                    />
                    <div className="studio-slider-limits">
                      <span>{BODY_BUILD_RANGE.min} cm</span>
                      <span>{BODY_BUILD_RANGE.max} cm</span>
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
                  ({proportion.size}). Footwear is shown in all sizes. Dresses
                  and other female-only cuts are hidden on the male avatar.
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
                      selectedMatchItem &&
                      String(selectedMatchItem.id) === String(item.id)
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
              aria-label="Match reasons for the selected recommendation"
            >
              <MatchReasonsCard
                item={selectedMatchItem}
                avatar={avatar}
                isGuest={isGuest}
                requestVersion={matchRequestVersion}
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
                      <article
                        key={category}
                        className="studio-equipped-item"
                      >
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
                          <RatingControl
                            key={`${category}-${item.id}`}
                            itemId={item.id}
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
                  "studio-save-outfit-input " +
                  (outfitNameError ? "invalid" : "")
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
                  outfitNameError ? "studio-outfit-name-error" : undefined
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