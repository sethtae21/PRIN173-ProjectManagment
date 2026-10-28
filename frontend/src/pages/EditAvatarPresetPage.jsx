import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AvatarCanvas from "./Shopper/AvatarCanvas";
import { presetsApi } from "../services/api";
import "./css/EditAvatarPresetPage.css";

// =====================================================
// FITFUSION AI — EDIT AVATAR PRESET (DB INTEGRATED)
// UI-ONLY: the Weight slider is replaced by a Body Build
// selector (Slim/Balanced/Full/Curve). The numeric weight
// is derived from build + height and still sent to the API,
// so models/serializers stay untouched for now.
// =====================================================

const ACTIVE_KEY = "fitfusion-avatar-preset";
const GENDER_KEY = "fitfusion-avatar-gender";
const EDITING_KEY = "fitfusion-editing-avatar-preset";

const UNDERTONE_OPTIONS = ["Warm", "Cool", "Neutral"];
const SHOULDER_OPTIONS = ["Narrow", "Average", "Broad"];
const WAIST_OPTIONS = ["Slim", "Average", "Curvy"];
const HIP_OPTIONS = ["Slim", "Average", "Wide"];
const THIGH_OPTIONS = ["Slim", "Average", "Thick"];
const CUP_OPTIONS = ["A", "B", "C", "D"];

const BODY_BUILDS = ["Slim", "Balanced", "Full", "Curve"];
const BUILD_BMI = { Slim: 17.5, Balanced: 21.7, Full: 27.5, Curve: 32 };

const LEGACY_CHOICES = {
  shoulder: { balanced: "average", regular: "average", slim: "narrow", wide: "broad", thick: "broad", curvy: "broad" },
  waist: { regular: "average", full: "curvy", balanced: "average", narrow: "slim", broad: "curvy", wide: "curvy", thick: "curvy" },
  hip: { narrow: "slim", balanced: "average", regular: "average", broad: "wide", thick: "wide", curvy: "wide" },
  thigh: { regular: "average", full: "thick", balanced: "average", broad: "thick", wide: "thick", curvy: "thick" },
  undertone: {},
};

const HEIGHT_RANGE = { min: 120, max: 218.4 };
const WEIGHT_RANGE = { min: 30, max: 200 };

const DEFAULT_PRESET = {
  id: "",
  name: "",
  gender: "Female",
  height: 165,
  weight: 58,
  skinTone: "#d9aa82",
  undertone: "Neutral",
  shoulder: "Average",
  waist: "Average",
  hip: "Average",
  thigh: "Average",
  cupSize: "B",
  bodyType: "Balanced",
  builtIn: false,
};

const SKIN_TONES = ["#f5d6bd", "#e7b98f", "#d9aa82", "#bb7d55", "#925c3c", "#603a28"];

const VIEWS = ["front", "rear"];

function readStorageObject(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function round2(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.round(number * 100) / 100;
}

function toDecimal(value, fallback, range) {
  const number = round2(value);
  if (number === null) return fallback;
  return Math.min(range.max, Math.max(range.min, number));
}

function calculateBodyType(height, weight) {
  const meters = Number(height) / 100;
  const mass = Number(weight);
  if (!Number.isFinite(meters) || !Number.isFinite(mass) || meters <= 0 || mass <= 0) return "Balanced";
  const index = mass / (meters * meters);
  if (index < 18.5) return "Slim";
  if (index < 25) return "Balanced";
  if (index < 30) return "Full";
  return "Curve";
}

function weightForBuild(build, height) {
  const meters = Number(height) / 100;
  if (!Number.isFinite(meters) || meters <= 0) return 58;
  const bmi = BUILD_BMI[build] ?? 21.7;
  const raw = bmi * meters * meters;
  return Math.min(WEIGHT_RANGE.max, Math.max(WEIGHT_RANGE.min, Math.round(raw * 10) / 10));
}

function normalizeChoice(value, options, fallback, group) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return fallback;
  const mapped = (LEGACY_CHOICES[group] || {})[raw] || raw;
  const found = options.find((option) => option.toLowerCase() === mapped);
  return found || fallback;
}

function normalizeGender(value) {
  return String(value || "").toLowerCase() === "male" ? "Male" : "Female";
}

function normalizePreset(preset, index = 0) {
  const gender = normalizeGender(preset?.gender);

  const height = toDecimal(preset?.height, 165, HEIGHT_RANGE);
  const weight = toDecimal(preset?.weight, gender === "Male" ? 70 : 58, WEIGHT_RANGE);

  return {
    ...DEFAULT_PRESET,
    ...preset,

    id: String(preset?.id || preset?.presetId || `custom-${index}`),
    name: String(preset?.name || preset?.presetName || "Custom Avatar"),

    gender,
    height,
    weight,

    skinTone: preset?.skinTone || preset?.skin_tone || preset?.skinColor || "#d9aa82",

    undertone: normalizeChoice(preset?.undertone, UNDERTONE_OPTIONS, "Neutral", "undertone"),
    shoulder: normalizeChoice(preset?.shoulder || preset?.shoulderWidth, SHOULDER_OPTIONS, "Average", "shoulder"),
    waist: normalizeChoice(preset?.waist || preset?.waistSize, WAIST_OPTIONS, "Average", "waist"),
    hip: normalizeChoice(preset?.hip || preset?.hipSize, HIP_OPTIONS, "Average", "hip"),
    thigh: normalizeChoice(preset?.thigh || preset?.thighSize, THIGH_OPTIONS, "Average", "thigh"),

    cupSize:
      gender === "Female"
        ? String(preset?.cupSize || preset?.cup_size || "B").toUpperCase()
        : null,

    bodyType: calculateBodyType(height, weight),
    builtIn: Boolean(preset?.builtIn),
  };
}

function toServerPayload(preset) {
  const lower = (value) => String(value || "").trim().toLowerCase();

  return {
    name: String(preset.name || "").trim(),
    gender: lower(preset.gender),
    height: round2(preset.height),
    weight: round2(preset.weight),
    skin_tone: preset.skinTone || "#d9aa82",
    undertone: lower(preset.undertone),
    shoulder: lower(preset.shoulder),
    waist: lower(preset.waist),
    hip: lower(preset.hip),
    thigh: lower(preset.thigh),
    cup_size: preset.gender === "Female" ? preset.cupSize || "B" : null,
  };
}

function FormSection({ number, title, description, children }) {
  return (
    <section className="edit-avatar-form-section">
      <div className="edit-avatar-section-heading">
        <span className="edit-avatar-section-number">{number}</span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function RangeField({ id, label, value, min, max, step = 0.1, unit, error, onChange }) {
  const numericValue = Number(value);

  const sliderValue =
    value !== "" && Number.isFinite(numericValue)
      ? Math.min(max, Math.max(min, numericValue))
      : min;

  return (
    <div className={`edit-avatar-range-field ${error ? "has-error" : ""}`}>
      <div className="edit-avatar-range-heading">
        <label htmlFor={id}>{label}</label>
        <div>
          <input
            type="number"
            aria-label={`${label} in ${unit}`}
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
          <span>{unit}</span>
        </div>
      </div>

      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={sliderValue}
        onChange={(event) => onChange(event.target.value)}
      />

      <div className="edit-avatar-range-limits">
        <span>{min} {unit}</span>
        <span>{max} {unit}</span>
      </div>

      {error && <small className="edit-avatar-error-message">{error}</small>}
    </div>
  );
}

function SelectField({ label, value, options, onChange }) {
  const currentValue = String(value ?? "");

  const availableOptions = options.includes(currentValue)
    ? options
    : [currentValue, ...options].filter(Boolean);

  return (
    <label className="edit-avatar-select-field">
      <span>{label}</span>
      <select value={currentValue} onChange={(event) => onChange(event.target.value)}>
        {availableOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div className="edit-avatar-summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Modal({ children, onClose, titleId }) {
  return (
    <div
      className="edit-avatar-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="edit-avatar-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        {children}
      </section>
    </div>
  );
}

export default function EditAvatarPresetPage() {
  const navigate = useNavigate();
  const { presetId } = useParams();

  const [formData, setFormData] = useState({ ...DEFAULT_PRESET });
  const [originalPreset, setOriginalPreset] = useState(null);
  const [previewView, setPreviewView] = useState("front");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [errors, setErrors] = useState({});
  const [toastMessage, setToastMessage] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  useEffect(() => {
    let active = true;

    window.scrollTo(0, 0);

    async function loadPreset() {
      setLoading(true);
      setNotFound(false);

      let selected = null;

      try {
        const record = await presetsApi.get(presetId);
        selected = record ? normalizePreset(record) : null;
      } catch {
        const editing = readStorageObject(EDITING_KEY);
        if (editing && String(editing.id || editing.presetId) === String(presetId)) {
          selected = normalizePreset(editing);
        }
      }

      if (!active) return;

      if (!selected || selected.builtIn) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setFormData(selected);
      setOriginalPreset(selected);
      setErrors({});
      setPreviewView("front");
      setLoading(false);
    }

    loadPreset();

    return () => {
      active = false;
    };
  }, [presetId]);

  useEffect(() => {
    if (!toastMessage) return undefined;
    const timer = window.setTimeout(() => setToastMessage(""), 3000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const bodyType = useMemo(
    () => calculateBodyType(formData.height, formData.weight),
    [formData.height, formData.weight]
  );

  const skinOptions = useMemo(() => {
    const current = String(formData.skinTone || "").trim().toLowerCase();
    if (!current) return SKIN_TONES;
    return SKIN_TONES.some((tone) => tone.toLowerCase() === current)
      ? SKIN_TONES
      : [...SKIN_TONES, formData.skinTone];
  }, [formData.skinTone]);

  const hasChanges = useMemo(() => {
    if (!originalPreset) return false;

    const fields = ["name", "gender", "height", "weight", "skinTone", "undertone", "shoulder", "waist", "hip", "thigh", "cupSize"];

    return fields.some((field) => String(formData[field] ?? "") !== String(originalPreset[field] ?? ""));
  }, [formData, originalPreset]);

  const previewAvatar = useMemo(() => ({ ...formData, bodyType }), [formData, bodyType]);

  function updateField(field, value) {
    setFormData((current) => ({
      ...current,
      [field]: value,
      ...(field === "gender" ? { cupSize: value === "Female" ? current.cupSize || "B" : null } : {}),
    }));

    setErrors((current) => ({ ...current, [field]: "" }));
  }

  function selectBodyBuild(build) {
    setFormData((current) => ({ ...current, weight: weightForBuild(build, current.height) }));
    setErrors((current) => ({ ...current, weight: "" }));
  }

  function validateForm() {
    const nextErrors = {};

    const name = String(formData.name || "").trim();

    if (!name) {
      nextErrors.name = "Avatar name is required. Please enter a name for your saved avatar.";
    } else if (name.length < 3) {
      nextErrors.name = "Avatar name must contain at least 3 characters.";
    } else if (name.length > 50) {
      nextErrors.name = "Avatar name must not exceed 50 characters.";
    } else if (name.toLowerCase() === "fitfusion standard") {
      nextErrors.name = "This name is reserved for the built-in avatar. Please choose another name.";
    }

    const height = Number(formData.height);

    if (formData.height === "" || !Number.isFinite(height)) {
      nextErrors.height = `Height is required. Please enter a value between ${HEIGHT_RANGE.min} and ${HEIGHT_RANGE.max} cm.`;
    } else if (height < HEIGHT_RANGE.min || height > HEIGHT_RANGE.max) {
      nextErrors.height = `Height must be between ${HEIGHT_RANGE.min} and ${HEIGHT_RANGE.max} cm.`;
    }

    // Weight is derived from Body Build, so it is always valid — no UI check needed.

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function buildUpdatedPreset() {
    return {
      ...formData,
      name: formData.name.trim(),
      height: toDecimal(formData.height, 165, HEIGHT_RANGE),
      weight: toDecimal(formData.weight, 58, WEIGHT_RANGE),
      gender: formData.gender,
      cupSize: formData.gender === "Female" ? formData.cupSize || "B" : null,
      bodyType,
      builtIn: false,
    };
  }

  async function savePreset(event) {
    event?.preventDefault();

    if (!validateForm()) {
      setToastMessage("Please correct the highlighted fields before saving.");
      return;
    }

    const name = formData.name.trim();

    try {
      const existing = await presetsApi.list();
      const list = Array.isArray(existing) ? existing : existing.results || [];

      const duplicate = list.some(
        (preset) =>
          String(preset.id) !== String(formData.id) &&
          String(preset.name || "").trim().toLowerCase() === name.toLowerCase()
      );

      if (duplicate) {
        setErrors((current) => ({
          ...current,
          name: "Another saved avatar already uses this name. Please choose a unique name.",
        }));
        setToastMessage("Please correct the highlighted fields before saving.");
        return;
      }

      const updatedPreset = buildUpdatedPreset();

      await presetsApi.update(updatedPreset.id, toServerPayload(updatedPreset));

      const activePreset = readStorageObject(ACTIVE_KEY);
      if (activePreset && String(activePreset.id) === String(updatedPreset.id)) {
        localStorage.setItem(ACTIVE_KEY, JSON.stringify(updatedPreset));
        localStorage.setItem(GENDER_KEY, updatedPreset.gender);
      }

      localStorage.setItem(EDITING_KEY, JSON.stringify(updatedPreset));

      setFormData(updatedPreset);
      setOriginalPreset(updatedPreset);

      navigate("/shopper/avatar-presets");
    } catch (error) {
      console.error("Unable to save avatar preset:", error);
      setToastMessage("Unable to save changes. Please try again.");
    }
  }

  function useInFittingStudio() {
    if (!validateForm()) {
      setToastMessage("Please correct the avatar details before continuing.");
      return;
    }

    if (hasChanges) {
      setToastMessage("Please save your changes before using this avatar.");
      return;
    }

    try {
      const selectedPreset = buildUpdatedPreset();
      localStorage.setItem(ACTIVE_KEY, JSON.stringify(selectedPreset));
      localStorage.setItem(GENDER_KEY, selectedPreset.gender);
      navigate("/shopper/fitting-studio/customize");
    } catch (error) {
      console.error("Unable to load avatar:", error);
      setToastMessage("Unable to open this avatar in Fitting Studio.");
    }
  }

  async function confirmDelete() {
    try {
      await presetsApi.remove(formData.id);

      const activePreset = readStorageObject(ACTIVE_KEY);
      if (activePreset && String(activePreset.id) === String(formData.id)) {
        localStorage.removeItem(ACTIVE_KEY);
      }

      const editingPreset = readStorageObject(EDITING_KEY);
      if (editingPreset && String(editingPreset.id) === String(formData.id)) {
        localStorage.removeItem(EDITING_KEY);
      }

      setShowDeleteModal(false);
      navigate("/shopper/avatar-presets");
    } catch (error) {
      console.error("Unable to delete avatar:", error);
      setShowDeleteModal(false);
      setToastMessage("Unable to delete this avatar. Please try again.");
    }
  }

  function handleCancel() {
    if (hasChanges) {
      setShowDiscardModal(true);
      return;
    }
    navigate("/shopper/avatar-presets");
  }

  if (loading) {
    return (
      <main className="edit-avatar-loading">
        <div className="edit-avatar-loader" />
        <p>Loading avatar preset...</p>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="edit-avatar-not-found">
        <section>
          <p>AVATAR PRESET NOT FOUND</p>
          <h1>This avatar is no longer available</h1>
          <span>
            The preset may have been deleted, or the selected link may be incorrect. Built-in avatars cannot be
            edited here.
          </span>
          <button type="button" onClick={() => navigate("/shopper/avatar-presets")}>
            Return to Avatar Presets
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="edit-avatar-page">
      <div className="edit-avatar-body">
        <section className="edit-avatar-title-row">
          <div className="edit-avatar-title-copy">
            <button type="button" className="edit-avatar-back" onClick={handleCancel}>
              ← Back to Avatar Presets
            </button>
            <h1>Edit your avatar</h1>
            <p>Customize your saved avatar and review the changes using the Front and Rear views.</p>
          </div>

          <div className={`edit-avatar-save-status ${hasChanges ? "changed" : ""}`} role="status">
            <span />
            {hasChanges ? "Unsaved changes" : "All changes saved"}
          </div>
        </section>

        <section className="edit-avatar-workspace">
          <form className="edit-avatar-form" onSubmit={savePreset}>
            <FormSection number="01" title="Preset information" description="Give your avatar a recognizable name.">
              <div className="edit-avatar-field">
                <label htmlFor="avatar-name">Avatar name</label>
                <input
                  id="avatar-name"
                  type="text"
                  maxLength={50}
                  value={formData.name}
                  className={errors.name ? "field-error" : ""}
                  placeholder="Example: Everyday Avatar"
                  onChange={(event) => updateField("name", event.target.value)}
                />
                <div className="edit-avatar-field-footer">
                  <small className={errors.name ? "edit-avatar-error-message" : ""}>
                    {errors.name || "Use a unique name containing 3–50 characters."}
                  </small>
                  <small>{formData.name.length}/50</small>
                </div>
              </div>
            </FormSection>

            <FormSection number="02" title="Avatar gender" description="Choose the body model used for your 2D avatar.">
              <div className="edit-avatar-gender-options">
                {["Female", "Male"].map((gender) => (
                  <button
                    key={gender}
                    type="button"
                    className={formData.gender === gender ? "active" : ""}
                    aria-pressed={formData.gender === gender}
                    onClick={() => updateField("gender", gender)}
                  >
                    <span>{gender === "Female" ? "♀" : "♂"}</span>
                    <strong>{gender}</strong>
                  </button>
                ))}
              </div>
            </FormSection>

            <FormSection
              number="03"
              title="Body measurements"
              description="Adjust your height and body build to determine the avatar's general body shape."
            >
              <div className="edit-avatar-measurement-grid">
                <RangeField
                  id="avatar-height"
                  label="Height"
                  value={formData.height}
                  min={HEIGHT_RANGE.min}
                  max={HEIGHT_RANGE.max}
                  step={0.1}
                  unit="cm"
                  error={errors.height}
                  onChange={(value) => updateField("height", value)}
                />
              </div>

              {/* UI-ONLY: Weight slider replaced by Body Build selector */}
              <div className="edit-avatar-select-grid">
                <SelectField label="Body Build" value={bodyType} options={BODY_BUILDS} onChange={selectBodyBuild} />
              </div>

              <div className="edit-avatar-body-result">
                <div>
                  <span>Calculated body type</span>
                  <small>Based on height and body build</small>
                </div>
                <strong>{bodyType}</strong>
              </div>
            </FormSection>

            <FormSection number="04" title="Skin tone" description="Select the skin tone and undertone for your avatar.">
              <div className="edit-avatar-skin-options">
                {skinOptions.map((skinTone, index) => (
                  <button
                    key={skinTone}
                    type="button"
                    className={formData.skinTone === skinTone ? "active" : ""}
                    style={{ "--skin-color": skinTone }}
                    aria-label={`Skin tone ${index + 1}`}
                    aria-pressed={formData.skinTone === skinTone}
                    onClick={() => updateField("skinTone", skinTone)}
                  >
                    <span />
                  </button>
                ))}
              </div>

              <div className="edit-avatar-select-grid edit-avatar-undertone">
                <SelectField
                  label="Undertone"
                  value={formData.undertone}
                  options={UNDERTONE_OPTIONS}
                  onChange={(value) => updateField("undertone", value)}
                />
              </div>
            </FormSection>

            <FormSection number="05" title="Body proportions" description="Fine-tune the proportions of your 2D avatar.">
              <div className="edit-avatar-select-grid">
                <SelectField
                  label="Shoulder"
                  value={formData.shoulder}
                  options={SHOULDER_OPTIONS}
                  onChange={(value) => updateField("shoulder", value)}
                />
                <SelectField
                  label="Waist"
                  value={formData.waist}
                  options={WAIST_OPTIONS}
                  onChange={(value) => updateField("waist", value)}
                />
                <SelectField
                  label="Hip"
                  value={formData.hip}
                  options={HIP_OPTIONS}
                  onChange={(value) => updateField("hip", value)}
                />
                <SelectField
                  label="Thigh"
                  value={formData.thigh}
                  options={THIGH_OPTIONS}
                  onChange={(value) => updateField("thigh", value)}
                />
                {formData.gender === "Female" && (
                  <SelectField
                    label="Cup size"
                    value={formData.cupSize || "B"}
                    options={CUP_OPTIONS}
                    onChange={(value) => updateField("cupSize", value)}
                  />
                )}
              </div>

              <div className="edit-avatar-proportion-note">
                <strong>Note:</strong>
                <span>
                  These settings control your avatar's visual proportions. Clothing sizes are determined separately
                  by the seller's product information.
                </span>
              </div>
            </FormSection>

            <div className="edit-avatar-form-actions">
              <button type="button" className="edit-avatar-cancel-button" onClick={handleCancel}>
                Cancel
              </button>
              <button type="submit" className="edit-avatar-save-button" disabled={!hasChanges}>
                Save Changes
              </button>
            </div>
          </form>

          <aside className="edit-avatar-preview-panel">
            <div className="edit-avatar-preview-heading">
              <div>
                <p>LIVE 2D PREVIEW</p>
                <h2>{formData.name || "Custom Avatar"}</h2>
              </div>
              <span>{bodyType}</span>
            </div>

            <div className="edit-avatar-view-buttons" role="group" aria-label="Avatar preview view">
              {VIEWS.map((view) => (
                <button
                  key={view}
                  type="button"
                  className={previewView === view ? "active" : ""}
                  aria-pressed={previewView === view}
                  onClick={() => setPreviewView(view)}
                >
                  {view}
                </button>
              ))}
            </div>

            <div className="edit-avatar-preview-stage">
              <div className="edit-avatar-rendered-figure">
                <AvatarCanvas avatar={previewAvatar} view={previewView} equippedItems={{}} />
              </div>
              <span className="edit-avatar-view-label">{previewView.toUpperCase()} VIEW</span>
            </div>

            <div className="edit-avatar-summary">
              <SummaryItem label="Gender" value={formData.gender} />
              <SummaryItem label="Height" value={`${formData.height} cm`} />
              {/* UI-ONLY: Weight row replaced by Body Build */}
              <SummaryItem label="Body Build" value={bodyType} />
              <SummaryItem label="Shoulder" value={formData.shoulder} />
              <SummaryItem label="Waist" value={formData.waist} />
              <SummaryItem label="Hip" value={formData.hip} />
              <SummaryItem label="Thigh" value={formData.thigh} />
              {formData.gender === "Female" && <SummaryItem label="Cup size" value={formData.cupSize || "B"} />}
              <SummaryItem label="Undertone" value={formData.undertone} />
            </div>

            <button type="button" className="edit-avatar-use-button" onClick={useInFittingStudio}>
              Use in Fitting Studio
            </button>
            <button type="button" className="edit-avatar-delete-button" onClick={() => setShowDeleteModal(true)}>
              Delete Avatar Preset
            </button>
          </aside>
        </section>
      </div>

      {showDeleteModal && (
        <Modal titleId="edit-avatar-delete-title" onClose={() => setShowDeleteModal(false)}>
          <div className="edit-avatar-modal-icon danger">!</div>
          <p className="edit-avatar-modal-label danger">DELETE AVATAR PRESET</p>
          <h2 id="edit-avatar-delete-title">Delete "{formData.name}"?</h2>
          <span>
            This avatar preset will be permanently removed from your account. Your saved outfits and previous orders
            will not be deleted.
          </span>
          <div className="edit-avatar-modal-actions">
            <button type="button" onClick={() => setShowDeleteModal(false)}>
              Keep Preset
            </button>
            <button type="button" className="danger-button" onClick={confirmDelete}>
              Delete Preset
            </button>
          </div>
        </Modal>
      )}

      {showDiscardModal && (
        <Modal titleId="edit-avatar-discard-title" onClose={() => setShowDiscardModal(false)}>
          <div className="edit-avatar-modal-icon">?</div>
          <p className="edit-avatar-modal-label">UNSAVED CHANGES</p>
          <h2 id="edit-avatar-discard-title">Discard your changes?</h2>
          <span>
            Your latest changes have not been saved. Leaving this page will keep the previously saved avatar details.
          </span>
          <div className="edit-avatar-modal-actions">
            <button type="button" onClick={() => setShowDiscardModal(false)}>
              Continue Editing
            </button>
            <button type="button" className="discard-button" onClick={() => navigate("/shopper/avatar-presets")}>
              Discard Changes
            </button>
          </div>
        </Modal>
      )}

      {toastMessage && (
        <div className="edit-avatar-toast" role="status">
          {toastMessage}
        </div>
      )}
    </main>
  );
}