
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AvatarCanvas from "./Shopper/AvatarCanvas";
import "./css/EditAvatarPresetPage.css";

// =====================================================
// FITFUSION AI — EDIT AVATAR PRESET
// Uses the existing shared ShopperLayout.
// No separate sidebar or page header.
// =====================================================

const PRESETS_KEY = "fitfusion-avatar-presets";
const ACTIVE_KEY = "fitfusion-avatar-preset";
const GENDER_KEY = "fitfusion-avatar-gender";
const EDITING_KEY = "fitfusion-editing-avatar-preset";

const DEFAULT_PRESET = {
  id: "",
  name: "",
  gender: "Female",
  height: 165,
  weight: 58,
  skinTone: "#d9aa82",
  undertone: "Neutral",
  shoulder: "Balanced",
  waist: "Regular",
  hip: "Balanced",
  thigh: "Regular",
  cupSize: "B",
  bodyType: "Balanced",
  builtIn: false,
};

const SKIN_TONES = [
  "#f5d6bd",
  "#e7b98f",
  "#d9aa82",
  "#bb7d55",
  "#925c3c",
  "#603a28",
];

const VIEWS = ["front", "side", "rear"];

// =====================================================
// STORAGE HELPERS
// =====================================================

function readStorageArray(key) {
  try {
    const value = JSON.parse(
      localStorage.getItem(key) || "[]"
    );

    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function readStorageObject(key) {
  try {
    return JSON.parse(
      localStorage.getItem(key) || "null"
    );
  } catch {
    return null;
  }
}

// =====================================================
// AVATAR HELPERS
// =====================================================

function calculateBodyType(height, weight) {
  const meters = Number(height) / 100;
  const kg = Number(weight);

  if (
    !Number.isFinite(meters) ||
    !Number.isFinite(kg) ||
    meters <= 0 ||
    kg <= 0
  ) {
    return "Balanced";
  }

  const index = kg / (meters * meters);

  if (index < 18.5) return "Slim";
  if (index < 25) return "Balanced";
  if (index < 30) return "Full";

  return "Curve";
}

function normalizePreset(preset, index = 0) {
  const gender =
    String(preset?.gender).toLowerCase() === "male"
      ? "Male"
      : "Female";

  const height = Number(preset?.height) || 165;

  const weight =
    Number(preset?.weight) ||
    (gender === "Male" ? 70 : 58);

  return {
    ...DEFAULT_PRESET,
    ...preset,

    id: String(
      preset?.id ||
      preset?.presetId ||
      `custom-${index}`
    ),

    name: String(
      preset?.name ||
      preset?.presetName ||
      "Custom Avatar"
    ),

    gender,
    height,
    weight,

    skinTone:
      preset?.skinTone ||
      preset?.skinColor ||
      "#d9aa82",

    undertone:
      preset?.undertone || "Neutral",

    shoulder:
      preset?.shoulder ||
      preset?.shoulderWidth ||
      "Balanced",

    waist:
      preset?.waist ||
      preset?.waistSize ||
      "Regular",

    hip:
      preset?.hip ||
      preset?.hipSize ||
      "Balanced",

    thigh:
      preset?.thigh ||
      preset?.thighSize ||
      "Regular",

    cupSize:
      gender === "Female"
        ? preset?.cupSize || "B"
        : null,

    bodyType: calculateBodyType(
      height,
      weight
    ),

    builtIn: Boolean(preset?.builtIn),
  };
}

// =====================================================
// FORM SECTION
// =====================================================

function FormSection({
  number,
  title,
  description,
  children,
}) {
  return (
    <section className="edit-avatar-form-section">
      <div className="edit-avatar-section-heading">
        <span className="edit-avatar-section-number">
          {number}
        </span>

        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      {children}
    </section>
  );
}

// =====================================================
// HEIGHT / WEIGHT FIELD
// =====================================================

function RangeField({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  error,
  onChange,
}) {
  const numericValue = Number(value);

  const sliderValue =
    value !== "" && Number.isFinite(numericValue)
      ? Math.min(max, Math.max(min, numericValue))
      : min;

  return (
    <div
      className={`edit-avatar-range-field ${
        error ? "has-error" : ""
      }`}
    >
      <div className="edit-avatar-range-heading">
        <label htmlFor={id}>
          {label}
        </label>

        <div>
          <input
            type="number"
            aria-label={`${label} in ${unit}`}
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(event) =>
              onChange(event.target.value)
            }
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
        onChange={(event) =>
          onChange(event.target.value)
        }
      />

      <div className="edit-avatar-range-limits">
        <span>
          {min} {unit}
        </span>

        <span>
          {max} {unit}
        </span>
      </div>

      {error && (
        <small className="edit-avatar-error-message">
          {error}
        </small>
      )}
    </div>
  );
}

// =====================================================
// SELECT FIELD
// =====================================================

function SelectField({
  label,
  value,
  options,
  onChange,
}) {
  const currentValue = String(value ?? "");

  const availableOptions = options.includes(
    currentValue
  )
    ? options
    : [currentValue, ...options].filter(Boolean);

  return (
    <label className="edit-avatar-select-field">
      <span>{label}</span>

      <select
        value={currentValue}
        onChange={(event) =>
          onChange(event.target.value)
        }
      >
        {availableOptions.map((option) => (
          <option
            key={option}
            value={option}
          >
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

// =====================================================
// SUMMARY ITEM
// =====================================================

function SummaryItem({
  label,
  value,
}) {
  return (
    <div className="edit-avatar-summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

// =====================================================
// CONFIRMATION MODAL
// =====================================================

function Modal({
  children,
  onClose,
  titleId,
}) {
  return (
    <div
      className="edit-avatar-modal-backdrop"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        className="edit-avatar-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {children}
      </section>
    </div>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function EditAvatarPresetPage() {
  const navigate = useNavigate();
  const { presetId } = useParams();

  // ---------------------------------------------------
  // STATES
  // ---------------------------------------------------

  const [formData, setFormData] = useState({
    ...DEFAULT_PRESET,
  });

  const [
    originalPreset,
    setOriginalPreset,
  ] = useState(null);

  const [
    previewView,
    setPreviewView,
  ] = useState("front");

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [errors, setErrors] = useState({});

  const [
    toastMessage,
    setToastMessage,
  ] = useState("");

  const [
    showDeleteModal,
    setShowDeleteModal,
  ] = useState(false);

  const [
    showDiscardModal,
    setShowDiscardModal,
  ] = useState(false);

  // ---------------------------------------------------
  // LOAD SAVED AVATAR
  // ---------------------------------------------------

  useEffect(() => {
    window.scrollTo(0, 0);

    setLoading(true);
    setNotFound(false);

    const presets = readStorageArray(
      PRESETS_KEY
    ).map(normalizePreset);

    let selected = presets.find(
      (preset) =>
        String(preset.id) === String(presetId)
    );

    if (!selected) {
      const editing = readStorageObject(
        EDITING_KEY
      );

      if (
        editing &&
        String(
          editing.id || editing.presetId
        ) === String(presetId)
      ) {
        selected = normalizePreset(editing);
      }
    }

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
  }, [presetId]);

  // ---------------------------------------------------
  // NOTIFICATION
  // ---------------------------------------------------

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setToastMessage("");
    }, 3000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toastMessage]);

  // ---------------------------------------------------
  // CALCULATED BODY TYPE
  // ---------------------------------------------------

  const bodyType = useMemo(
    () =>
      calculateBodyType(
        formData.height,
        formData.weight
      ),
    [formData.height, formData.weight]
  );

  // ---------------------------------------------------
  // DETECT UNSAVED CHANGES
  // ---------------------------------------------------

  const hasChanges = useMemo(() => {
    if (!originalPreset) {
      return false;
    }

    const fields = [
      "name",
      "gender",
      "height",
      "weight",
      "skinTone",
      "undertone",
      "shoulder",
      "waist",
      "hip",
      "thigh",
      "cupSize",
    ];

    return fields.some(
      (field) =>
        String(formData[field] ?? "") !==
        String(originalPreset[field] ?? "")
    );
  }, [formData, originalPreset]);

  // ---------------------------------------------------
  // LIVE CANVAS PREVIEW DATA
  // ---------------------------------------------------

  const previewAvatar = useMemo(
    () => ({
      ...formData,
      bodyType,
    }),
    [formData, bodyType]
  );

  // ---------------------------------------------------
  // UPDATE FIELD
  // ---------------------------------------------------

  function updateField(field, value) {
    setFormData((current) => ({
      ...current,

      [field]: value,

      ...(field === "gender"
        ? {
            cupSize:
              value === "Female"
                ? current.cupSize || "B"
                : null,
          }
        : {}),
    }));

    setErrors((current) => ({
      ...current,
      [field]: "",
    }));
  }

  // ---------------------------------------------------
  // VALIDATION
  // ---------------------------------------------------

  function validateForm() {
    const nextErrors = {};

    const name = String(
      formData.name || ""
    ).trim();

    if (!name) {
      nextErrors.name =
        "Avatar name is required. Please enter a name for your saved avatar.";
    } else if (name.length < 3) {
      nextErrors.name =
        "Avatar name must contain at least 3 characters.";
    } else if (name.length > 50) {
      nextErrors.name =
        "Avatar name must not exceed 50 characters.";
    } else {
      const duplicate = readStorageArray(
        PRESETS_KEY
      ).some(
        (preset) =>
          String(preset.id) !==
            String(formData.id) &&
          String(
            preset.name ||
              preset.presetName ||
              ""
          )
            .trim()
            .toLowerCase() ===
            name.toLowerCase()
      );

      if (
        name.toLowerCase() ===
        "fitfusion standard"
      ) {
        nextErrors.name =
          "This name is reserved for the built-in avatar. Please choose another name.";
      } else if (duplicate) {
        nextErrors.name =
          "Another saved avatar already uses this name. Please choose a unique name.";
      }
    }

    const height = Number(formData.height);
    const weight = Number(formData.weight);

    if (
      formData.height === "" ||
      !Number.isFinite(height)
    ) {
      nextErrors.height =
        "Height is required. Please enter a value between 120 and 218.4 cm.";
    } else if (
      height < 120 ||
      height > 218.4
    ) {
      nextErrors.height =
        "Height must be between 120 and 218.4 cm.";
    }

    if (
      formData.weight === "" ||
      !Number.isFinite(weight)
    ) {
      nextErrors.weight =
        "Weight is required. Please enter a value between 30 and 200 kg.";
    } else if (
      weight < 30 ||
      weight > 200
    ) {
      nextErrors.weight =
        "Weight must be between 30 and 200 kg.";
    }

    setErrors(nextErrors);

    return (
      Object.keys(nextErrors).length === 0
    );
  }

  // ---------------------------------------------------
  // BUILD UPDATED PRESET
  // ---------------------------------------------------

  function buildUpdatedPreset() {
    return {
      ...formData,

      name: formData.name.trim(),

      height: Number(formData.height),
      weight: Number(formData.weight),

      gender: formData.gender,

      cupSize:
        formData.gender === "Female"
          ? formData.cupSize || "B"
          : null,

      bodyType,
      builtIn: false,

      updatedAt: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------
  // SAVE TO LOCAL STORAGE
  // ---------------------------------------------------

  function persistPreset(updatedPreset) {
    const presets = readStorageArray(
      PRESETS_KEY
    );

    const existingIndex = presets.findIndex(
      (preset) =>
        String(preset.id) ===
        String(updatedPreset.id)
    );

    const nextPresets = [...presets];

    if (existingIndex >= 0) {
      nextPresets[existingIndex] =
        updatedPreset;
    } else {
      nextPresets.push(updatedPreset);
    }

    localStorage.setItem(
      PRESETS_KEY,
      JSON.stringify(nextPresets)
    );

    localStorage.setItem(
      EDITING_KEY,
      JSON.stringify(updatedPreset)
    );

    const activePreset = readStorageObject(
      ACTIVE_KEY
    );

    if (
      activePreset &&
      String(activePreset.id) ===
        String(updatedPreset.id)
    ) {
      localStorage.setItem(
        ACTIVE_KEY,
        JSON.stringify(updatedPreset)
      );

      localStorage.setItem(
        GENDER_KEY,
        updatedPreset.gender
      );
    }

    setFormData(updatedPreset);
    setOriginalPreset(updatedPreset);
  }

  // ---------------------------------------------------
  // SAVE CHANGES
  // ---------------------------------------------------

  function savePreset(event) {
    event?.preventDefault();

    if (!validateForm()) {
      setToastMessage(
        "Please correct the highlighted fields before saving."
      );
      return;
    }

    try {
      const updatedPreset =
        buildUpdatedPreset();

      persistPreset(updatedPreset);

      navigate("/shopper/avatar-presets");
    } catch (error) {
      console.error(
        "Unable to save avatar preset:",
        error
      );

      setToastMessage(
        "Unable to save changes. Please try again."
      );
    }
  }

  // ---------------------------------------------------
  // USE IN FITTING STUDIO
  // ---------------------------------------------------

  function useInFittingStudio() {
    if (!validateForm()) {
      setToastMessage(
        "Please correct the avatar details before continuing."
      );
      return;
    }

    if (hasChanges) {
      setToastMessage(
        "Please save your changes before using this avatar."
      );
      return;
    }

    try {
      const selectedPreset =
        buildUpdatedPreset();

      localStorage.setItem(
        ACTIVE_KEY,
        JSON.stringify(selectedPreset)
      );

      localStorage.setItem(
        GENDER_KEY,
        selectedPreset.gender
      );

      navigate(
        "/shopper/fitting-studio/customize"
      );
    } catch (error) {
      console.error(
        "Unable to load avatar:",
        error
      );

      setToastMessage(
        "Unable to open this avatar in Fitting Studio."
      );
    }
  }

  // ---------------------------------------------------
  // DELETE PRESET
  // ---------------------------------------------------

  function confirmDelete() {
    try {
      const remaining = readStorageArray(
        PRESETS_KEY
      ).filter(
        (preset) =>
          String(preset.id) !==
          String(formData.id)
      );

      localStorage.setItem(
        PRESETS_KEY,
        JSON.stringify(remaining)
      );

      const activePreset = readStorageObject(
        ACTIVE_KEY
      );

      if (
        activePreset &&
        String(activePreset.id) ===
          String(formData.id)
      ) {
        localStorage.removeItem(ACTIVE_KEY);
      }

      const editingPreset = readStorageObject(
        EDITING_KEY
      );

      if (
        editingPreset &&
        String(editingPreset.id) ===
          String(formData.id)
      ) {
        localStorage.removeItem(EDITING_KEY);
      }

      setShowDeleteModal(false);

      navigate("/shopper/avatar-presets");
    } catch (error) {
      console.error(
        "Unable to delete avatar:",
        error
      );

      setToastMessage(
        "Unable to delete this avatar. Please try again."
      );
    }
  }

  // ---------------------------------------------------
  // BACK / CANCEL
  // ---------------------------------------------------

  function handleCancel() {
    if (hasChanges) {
      setShowDiscardModal(true);
      return;
    }

    navigate("/shopper/avatar-presets");
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <main className="edit-avatar-loading">
        <div className="edit-avatar-loader" />
        <p>Loading avatar preset...</p>
      </main>
    );
  }

  // =====================================================
  // NOT FOUND
  // =====================================================

  if (notFound) {
    return (
      <main className="edit-avatar-not-found">
        <section>
          <p>AVATAR PRESET NOT FOUND</p>

          <h1>
            This avatar is no longer available
          </h1>

          <span>
            The preset may have been deleted,
            or the selected link may be incorrect.
            Built-in avatars cannot be edited here.
          </span>

          <button
            type="button"
            onClick={() =>
              navigate("/shopper/avatar-presets")
            }
          >
            Return to Avatar Presets
          </button>
        </section>
      </main>
    );
  }

  // =====================================================
  // MAIN PAGE
  // =====================================================

  return (
    <main className="edit-avatar-page">

      {/*
        NO EXTRA HEADER.
        ShopperLayout handles shared navigation.
      */}

      <div className="edit-avatar-body">

        {/* =========================================
            PAGE TITLE
        ========================================= */}

        <section className="edit-avatar-title-row">
          <div className="edit-avatar-title-copy">

            <button
              type="button"
              className="edit-avatar-back"
              onClick={handleCancel}
            >
              ← Back to Avatar Presets
            </button>

            <h1>Edit your avatar</h1>

            <p>
              Customize your saved avatar and
              review the changes using the Front,
              Side, and Rear views.
            </p>
          </div>

          <div
            className={`edit-avatar-save-status ${
              hasChanges ? "changed" : ""
            }`}
            role="status"
          >
            <span />

            {hasChanges
              ? "Unsaved changes"
              : "All changes saved"}
          </div>
        </section>

        {/* =========================================
            TWO-COLUMN WORKSPACE
        ========================================= */}

        <section className="edit-avatar-workspace">

          {/* =====================================
              LEFT: AVATAR CUSTOMIZATION
          ===================================== */}

          <form
            className="edit-avatar-form"
            onSubmit={savePreset}
          >

            {/* PRESET INFORMATION */}

            <FormSection
              number="01"
              title="Preset information"
              description="Give your avatar a recognizable name."
            >
              <div className="edit-avatar-field">
                <label htmlFor="avatar-name">
                  Avatar name
                </label>

                <input
                  id="avatar-name"
                  type="text"
                  maxLength={50}
                  value={formData.name}
                  className={
                    errors.name ? "field-error" : ""
                  }
                  placeholder="Example: Everyday Avatar"
                  onChange={(event) =>
                    updateField(
                      "name",
                      event.target.value
                    )
                  }
                />

                <div className="edit-avatar-field-footer">
                  <small
                    className={
                      errors.name
                        ? "edit-avatar-error-message"
                        : ""
                    }
                  >
                    {errors.name ||
                      "Use a unique name containing 3–50 characters."}
                  </small>

                  <small>
                    {formData.name.length}/50
                  </small>
                </div>
              </div>
            </FormSection>

            {/* AVATAR GENDER */}

            <FormSection
              number="02"
              title="Avatar gender"
              description="Choose the body model used for your 2D avatar."
            >
              <div className="edit-avatar-gender-options">
                {["Female", "Male"].map(
                  (gender) => (
                    <button
                      key={gender}
                      type="button"
                      className={
                        formData.gender === gender
                          ? "active"
                          : ""
                      }
                      aria-pressed={
                        formData.gender === gender
                      }
                      onClick={() =>
                        updateField(
                          "gender",
                          gender
                        )
                      }
                    >
                      <span>
                        {gender === "Female"
                          ? "♀"
                          : "♂"}
                      </span>

                      <strong>{gender}</strong>
                    </button>
                  )
                )}
              </div>
            </FormSection>

            {/* BODY MEASUREMENTS */}

            <FormSection
              number="03"
              title="Body measurements"
              description="Adjust your height and weight to determine the avatar's general body shape."
            >
              <div className="edit-avatar-measurement-grid">
                <RangeField
                  id="avatar-height"
                  label="Height"
                  value={formData.height}
                  min={120}
                  max={218.4}
                  step={0.1}
                  unit="cm"
                  error={errors.height}
                  onChange={(value) =>
                    updateField(
                      "height",
                      value
                    )
                  }
                />

                <RangeField
                  id="avatar-weight"
                  label="Weight"
                  value={formData.weight}
                  min={30}
                  max={200}
                  step={1}
                  unit="kg"
                  error={errors.weight}
                  onChange={(value) =>
                    updateField(
                      "weight",
                      value
                    )
                  }
                />
              </div>

              <div className="edit-avatar-body-result">
                <div>
                  <span>
                    Calculated body type
                  </span>

                  <small>
                    Based on height and weight
                  </small>
                </div>

                <strong>{bodyType}</strong>
              </div>
            </FormSection>

            {/* SKIN TONE */}

            <FormSection
              number="04"
              title="Skin tone"
              description="Select the skin tone and undertone for your avatar."
            >
              <div className="edit-avatar-skin-options">
                {SKIN_TONES.map(
                  (skinTone, index) => (
                    <button
                      key={skinTone}
                      type="button"
                      className={
                        formData.skinTone ===
                        skinTone
                          ? "active"
                          : ""
                      }
                      style={{
                        "--skin-color":
                          skinTone,
                      }}
                      aria-label={`Skin tone ${
                        index + 1
                      }`}
                      aria-pressed={
                        formData.skinTone ===
                        skinTone
                      }
                      onClick={() =>
                        updateField(
                          "skinTone",
                          skinTone
                        )
                      }
                    >
                      <span />
                    </button>
                  )
                )}
              </div>

              <div className="edit-avatar-select-grid edit-avatar-undertone">
                <SelectField
                  label="Undertone"
                  value={formData.undertone}
                  options={[
                    "Warm",
                    "Cool",
                    "Neutral",
                  ]}
                  onChange={(value) =>
                    updateField(
                      "undertone",
                      value
                    )
                  }
                />
              </div>
            </FormSection>

            {/* BODY PROPORTIONS */}

            <FormSection
              number="05"
              title="Body proportions"
              description="Fine-tune the proportions of your 2D avatar."
            >
              <div className="edit-avatar-select-grid">

                <SelectField
                  label="Shoulder"
                  value={formData.shoulder}
                  options={[
                    "Narrow",
                    "Average",
                    "Balanced",
                    "Broad",
                  ]}
                  onChange={(value) =>
                    updateField(
                      "shoulder",
                      value
                    )
                  }
                />

                <SelectField
                  label="Waist"
                  value={formData.waist}
                  options={[
                    "Slim",
                    "Average",
                    "Regular",
                    "Full",
                  ]}
                  onChange={(value) =>
                    updateField(
                      "waist",
                      value
                    )
                  }
                />

                <SelectField
                  label="Hip"
                  value={formData.hip}
                  options={[
                    "Narrow",
                    "Average",
                    "Balanced",
                    "Wide",
                  ]}
                  onChange={(value) =>
                    updateField(
                      "hip",
                      value
                    )
                  }
                />

                <SelectField
                  label="Thigh"
                  value={formData.thigh}
                  options={[
                    "Slim",
                    "Average",
                    "Regular",
                    "Full",
                  ]}
                  onChange={(value) =>
                    updateField(
                      "thigh",
                      value
                    )
                  }
                />

                {formData.gender ===
                  "Female" && (
                  <SelectField
                    label="Cup size"
                    value={
                      formData.cupSize || "B"
                    }
                    options={[
                      "A",
                      "B",
                      "C",
                      "D",
                    ]}
                    onChange={(value) =>
                      updateField(
                        "cupSize",
                        value
                      )
                    }
                  />
                )}
              </div>

              <div className="edit-avatar-proportion-note">
                <strong>Note:</strong>

                <span>
                  These settings control your
                  avatar's visual proportions.
                  Clothing sizes are determined
                  separately by the seller's
                  product information.
                </span>
              </div>
            </FormSection>

            {/* FORM ACTIONS */}

            <div className="edit-avatar-form-actions">
              <button
                type="button"
                className="edit-avatar-cancel-button"
                onClick={handleCancel}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="edit-avatar-save-button"
                disabled={!hasChanges}
              >
                Save Changes
              </button>
            </div>
          </form>

          {/* =====================================
              RIGHT: LIVE AVATAR PREVIEW
          ===================================== */}

          <aside className="edit-avatar-preview-panel">

            <div className="edit-avatar-preview-heading">
              <div>
                <p>LIVE 2D PREVIEW</p>

                <h2>
                  {formData.name ||
                    "Custom Avatar"}
                </h2>
              </div>

              <span>{bodyType}</span>
            </div>

            {/* FRONT / SIDE / REAR */}

            <div
              className="edit-avatar-view-buttons"
              role="group"
              aria-label="Avatar preview view"
            >
              {VIEWS.map((view) => (
                <button
                  key={view}
                  type="button"
                  className={
                    previewView === view
                      ? "active"
                      : ""
                  }
                  aria-pressed={
                    previewView === view
                  }
                  onClick={() =>
                    setPreviewView(view)
                  }
                >
                  {view}
                </button>
              ))}
            </div>

            {/* BLENDER-RENDERED CANVAS 2D */}

            <div className="edit-avatar-preview-stage">
              <div className="edit-avatar-rendered-figure">
                <AvatarCanvas
                  avatar={previewAvatar}
                  view={previewView}
                  equippedItems={{}}
                />
              </div>

              <span className="edit-avatar-view-label">
                {previewView.toUpperCase()} VIEW
              </span>
            </div>

            {/* AVATAR SUMMARY */}

            <div className="edit-avatar-summary">

              <SummaryItem
                label="Gender"
                value={formData.gender}
              />

              <SummaryItem
                label="Height"
                value={`${formData.height} cm`}
              />

              <SummaryItem
                label="Weight"
                value={`${formData.weight} kg`}
              />

              <SummaryItem
                label="Body type"
                value={bodyType}
              />

              <SummaryItem
                label="Shoulder"
                value={formData.shoulder}
              />

              <SummaryItem
                label="Waist"
                value={formData.waist}
              />

              <SummaryItem
                label="Hip"
                value={formData.hip}
              />

              <SummaryItem
                label="Thigh"
                value={formData.thigh}
              />

              {formData.gender ===
                "Female" && (
                <SummaryItem
                  label="Cup size"
                  value={
                    formData.cupSize || "B"
                  }
                />
              )}

              <SummaryItem
                label="Undertone"
                value={formData.undertone}
              />
            </div>

            {/* PREVIEW ACTIONS */}

            <button
              type="button"
              className="edit-avatar-use-button"
              onClick={useInFittingStudio}
            >
              Use in Fitting Studio
            </button>

            <button
              type="button"
              className="edit-avatar-delete-button"
              onClick={() =>
                setShowDeleteModal(true)
              }
            >
              Delete Avatar Preset
            </button>
          </aside>
        </section>
      </div>

      {/* =========================================
          DELETE CONFIRMATION
      ========================================= */}

      {showDeleteModal && (
        <Modal
          titleId="edit-avatar-delete-title"
          onClose={() =>
            setShowDeleteModal(false)
          }
        >
          <div className="edit-avatar-modal-icon danger">
            !
          </div>

          <p className="edit-avatar-modal-label danger">
            DELETE AVATAR PRESET
          </p>

          <h2 id="edit-avatar-delete-title">
            Delete "{formData.name}"?
          </h2>

          <span>
            This avatar preset will be
            permanently removed. Your saved
            outfits and previous orders will
            not be deleted.
          </span>

          <div className="edit-avatar-modal-actions">
            <button
              type="button"
              onClick={() =>
                setShowDeleteModal(false)
              }
            >
              Keep Preset
            </button>

            <button
              type="button"
              className="danger-button"
              onClick={confirmDelete}
            >
              Delete Preset
            </button>
          </div>
        </Modal>
      )}

      {/* =========================================
          DISCARD CONFIRMATION
      ========================================= */}

      {showDiscardModal && (
        <Modal
          titleId="edit-avatar-discard-title"
          onClose={() =>
            setShowDiscardModal(false)
          }
        >
          <div className="edit-avatar-modal-icon">
            ?
          </div>

          <p className="edit-avatar-modal-label">
            UNSAVED CHANGES
          </p>

          <h2 id="edit-avatar-discard-title">
            Discard your changes?
          </h2>

          <span>
            Your latest changes have not been
            saved. Leaving this page will keep
            the previously saved avatar details.
          </span>

          <div className="edit-avatar-modal-actions">
            <button
              type="button"
              onClick={() =>
                setShowDiscardModal(false)
              }
            >
              Continue Editing
            </button>

            <button
              type="button"
              className="discard-button"
              onClick={() =>
                navigate(
                  "/shopper/avatar-presets"
                )
              }
            >
              Discard Changes
            </button>
          </div>
        </Modal>
      )}

      {/* =========================================
          NOTIFICATION
      ========================================= */}

      {toastMessage && (
        <div
          className="edit-avatar-toast"
          role="status"
        >
          {toastMessage}
        </div>
      )}
    </main>
  );
}
