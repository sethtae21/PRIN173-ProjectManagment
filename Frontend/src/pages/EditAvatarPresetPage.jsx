import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  NavLink,
  useNavigate,
  useParams,
} from "react-router-dom";

import fitFusionLogo from "../assets/fitfusion-logo.svg";
import "./css/EditAvatarPresetPage.css";

const DEFAULT_PRESET = {
  id: "",
  name: "",
  gender: "Female",
  height: 165,
  weight: 58,
  skinTone: "#d9aa82",
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

function readStorageArray(key) {
  try {
    const parsedValue = JSON.parse(
      localStorage.getItem(key) || "[]"
    );

    return Array.isArray(parsedValue)
      ? parsedValue
      : [];
  } catch {
    return [];
  }
}

function calculateBodyType(height, weight) {
  const heightInMeters =
    Number(height) / 100;

  if (
    !heightInMeters ||
    !Number(weight)
  ) {
    return "Balanced";
  }

  const bmi =
    Number(weight) /
    (heightInMeters * heightInMeters);

  if (bmi < 18.5) {
    return "Slim";
  }

  if (bmi < 25) {
    return "Balanced";
  }

  if (bmi < 30) {
    return "Full";
  }

  return "Curve";
}

function normalizePreset(preset, index = 0) {
  const height =
    Number(preset.height) || 165;

  const weight =
    Number(preset.weight) || 58;

  return {
    id:
      preset.id ||
      preset.presetId ||
      `custom-preset-${index}`,

    name:
      preset.name ||
      preset.presetName ||
      "Custom Avatar",

    gender: preset.gender || "Female",

    height,

    weight,

    skinTone:
      preset.skinTone ||
      preset.skinColor ||
      "#d9aa82",

    shoulder:
      preset.shoulder ||
      preset.shoulderWidth ||
      "Balanced",

    waist:
      preset.waist ||
      preset.waistSize ||
      "Regular",

    hip:
      preset.hip ||
      preset.hipSize ||
      "Balanced",

    thigh:
      preset.thigh ||
      preset.thighSize ||
      "Regular",

    cupSize: preset.cupSize || "B",

    bodyType:
      preset.bodyType ||
      calculateBodyType(
        height,
        weight
      ),

    builtIn: Boolean(preset.builtIn),

    createdAt:
      preset.createdAt ||
      new Date().toISOString(),

    updatedAt:
      preset.updatedAt || null,
  };
}

function EditAvatarPresetPage() {
  const navigate = useNavigate();
  const { presetId } = useParams();

  const [formData, setFormData] =
    useState(DEFAULT_PRESET);

  const [originalPreset, setOriginalPreset] =
    useState(null);

  const [previewView, setPreviewView] =
    useState("front");

  const [loading, setLoading] =
    useState(true);

  const [notFound, setNotFound] =
    useState(false);

  const [errors, setErrors] =
    useState({});

  const [toastMessage, setToastMessage] =
    useState("");

  const [
    showDeleteModal,
    setShowDeleteModal,
  ] = useState(false);

  const [
    showDiscardModal,
    setShowDiscardModal,
  ] = useState(false);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });

    const savedPresets =
      readStorageArray(
        "fitfusion-avatar-presets"
      ).map(normalizePreset);

    let selectedPreset =
      savedPresets.find(
        (preset) =>
          String(preset.id) ===
          String(presetId)
      );

    if (!selectedPreset) {
      const editingPresetText =
        localStorage.getItem(
          "fitfusion-editing-avatar-preset"
        );

      if (editingPresetText) {
        try {
          const editingPreset =
            normalizePreset(
              JSON.parse(
                editingPresetText
              )
            );

          if (
            String(editingPreset.id) ===
            String(presetId)
          ) {
            selectedPreset =
              editingPreset;
          }
        } catch {
          // Invalid localStorage data is ignored.
        }
      }
    }

    if (!selectedPreset) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setFormData(selectedPreset);
    setOriginalPreset(selectedPreset);
    setLoading(false);
  }, [presetId]);

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }

    const toastTimer =
      window.setTimeout(() => {
        setToastMessage("");
      }, 2600);

    return () => {
      window.clearTimeout(toastTimer);
    };
  }, [toastMessage]);

  const cartCount = useMemo(() => {
    return readStorageArray(
      "fitfusion-cart-items"
    ).reduce((total, item) => {
      return (
        total +
        (Number(item.quantity) || 1)
      );
    }, 0);
  }, []);

  const bodyType = useMemo(() => {
    return calculateBodyType(
      formData.height,
      formData.weight
    );
  }, [
    formData.height,
    formData.weight,
  ]);

  const hasChanges = useMemo(() => {
    if (!originalPreset) {
      return false;
    }

    const fieldsToCompare = [
      "name",
      "gender",
      "height",
      "weight",
      "skinTone",
      "shoulder",
      "waist",
      "hip",
      "thigh",
      "cupSize",
    ];

    return fieldsToCompare.some(
      (field) =>
        String(formData[field]) !==
        String(originalPreset[field])
    );
  }, [formData, originalPreset]);

  function updateField(field, value) {
    setFormData((currentData) => ({
      ...currentData,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        [field]: "",
      }));
    }
  }

  function validateForm() {
    const nextErrors = {};
    const trimmedName =
      formData.name.trim();

    if (!trimmedName) {
      nextErrors.name =
        "Avatar name is required. Enter a descriptive name so you can identify this preset later.";
    } else if (
      trimmedName.length < 3
    ) {
      nextErrors.name =
        "Avatar name is too short. Please enter at least 3 characters.";
    } else if (
      trimmedName.length > 30
    ) {
      nextErrors.name =
        "Avatar name is too long. Please limit the name to 30 characters.";
    }

    const height =
      Number(formData.height);

    if (!height) {
      nextErrors.height =
        "Height is required because it is used to calculate the avatar's body proportions.";
    } else if (height < 120) {
      nextErrors.height =
        "The entered height is below the supported range. Please enter at least 120 cm.";
    } else if (height > 220) {
      nextErrors.height =
        "The entered height exceeds the supported range. Please enter 220 cm or below.";
    }

    const weight =
      Number(formData.weight);

    if (!weight) {
      nextErrors.weight =
        "Weight is required because it is used together with height to determine the avatar body type.";
    } else if (weight < 30) {
      nextErrors.weight =
        "The entered weight is below the supported range. Please enter at least 30 kg.";
    } else if (weight > 200) {
      nextErrors.weight =
        "The entered weight exceeds the supported range. Please enter 200 kg or below.";
    }

    setErrors(nextErrors);

    return (
      Object.keys(nextErrors).length ===
      0
    );
  }

  function buildUpdatedPreset() {
    return {
      ...formData,
      name: formData.name.trim(),
      height: Number(formData.height),
      weight: Number(formData.weight),
      bodyType,
      builtIn: false,
      updatedAt: new Date().toISOString(),
    };
  }

  function updateActivePreset(
    updatedPreset
  ) {
    const activePresetText =
      localStorage.getItem(
        "fitfusion-avatar-preset"
      );

    if (!activePresetText) {
      return;
    }

    try {
      const activePreset =
        JSON.parse(activePresetText);

      if (
        String(activePreset.id) ===
        String(updatedPreset.id)
      ) {
        localStorage.setItem(
          "fitfusion-avatar-preset",
          JSON.stringify(
            updatedPreset
          )
        );
      }
    } catch {
      // Invalid active preset does not prevent saving.
    }
  }

  function savePreset() {
    if (!validateForm()) {
      setToastMessage(
        "Please correct the highlighted fields before saving."
      );

      return;
    }

    const savedPresets =
      readStorageArray(
        "fitfusion-avatar-presets"
      ).map(normalizePreset);

    const updatedPreset =
      buildUpdatedPreset();

    const existingIndex =
      savedPresets.findIndex(
        (preset) =>
          String(preset.id) ===
          String(presetId)
      );

    let nextPresets;

    if (existingIndex >= 0) {
      nextPresets = savedPresets.map(
        (preset, index) =>
          index === existingIndex
            ? updatedPreset
            : preset
      );
    } else {
      nextPresets = [
        ...savedPresets,
        updatedPreset,
      ];
    }

    localStorage.setItem(
      "fitfusion-avatar-presets",
      JSON.stringify(nextPresets)
    );

    localStorage.setItem(
      "fitfusion-editing-avatar-preset",
      JSON.stringify(updatedPreset)
    );

    updateActivePreset(updatedPreset);

    setOriginalPreset(updatedPreset);
    setFormData(updatedPreset);

    setToastMessage(
      "Avatar preset updated successfully."
    );

    window.setTimeout(() => {
      navigate(
        "/shopper/avatar-presets"
      );
    }, 700);
  }

  function useInFittingStudio() {
    if (!validateForm()) {
      setToastMessage(
        "Please correct the avatar details before continuing."
      );

      return;
    }

    const updatedPreset =
      buildUpdatedPreset();

    const savedPresets =
      readStorageArray(
        "fitfusion-avatar-presets"
      ).map(normalizePreset);

    const presetExists =
      savedPresets.some(
        (preset) =>
          String(preset.id) ===
          String(updatedPreset.id)
      );

    const nextPresets =
      presetExists
        ? savedPresets.map((preset) =>
            String(preset.id) ===
            String(updatedPreset.id)
              ? updatedPreset
              : preset
          )
        : [
            ...savedPresets,
            updatedPreset,
          ];

    localStorage.setItem(
      "fitfusion-avatar-presets",
      JSON.stringify(nextPresets)
    );

    localStorage.setItem(
      "fitfusion-avatar-preset",
      JSON.stringify(updatedPreset)
    );

    localStorage.setItem(
      "fitfusion-avatar-gender",
      updatedPreset.gender.toLowerCase()
    );

    navigate(
      "/shopper/fitting-studio/customize"
    );
  }

  function confirmDelete() {
    const savedPresets =
      readStorageArray(
        "fitfusion-avatar-presets"
      );

    const remainingPresets =
      savedPresets.filter(
        (preset) =>
          String(preset.id) !==
          String(presetId)
      );

    localStorage.setItem(
      "fitfusion-avatar-presets",
      JSON.stringify(
        remainingPresets
      )
    );

    const activePresetText =
      localStorage.getItem(
        "fitfusion-avatar-preset"
      );

    if (activePresetText) {
      try {
        const activePreset =
          JSON.parse(activePresetText);

        if (
          String(activePreset.id) ===
          String(presetId)
        ) {
          localStorage.removeItem(
            "fitfusion-avatar-preset"
          );
        }
      } catch {
        // Invalid stored data is ignored.
      }
    }

    localStorage.removeItem(
      "fitfusion-editing-avatar-preset"
    );

    setShowDeleteModal(false);

    setToastMessage(
      "Avatar preset deleted successfully."
    );

    window.setTimeout(() => {
      navigate(
        "/shopper/avatar-presets"
      );
    }, 650);
  }

  function handleCancel() {
    if (hasChanges) {
      setShowDiscardModal(true);
      return;
    }

    navigate(
      "/shopper/avatar-presets"
    );
  }

  function handleLogout() {
    const confirmed = window.confirm(
      "Are you sure you want to log out?"
    );

    if (!confirmed) {
      return;
    }

    sessionStorage.removeItem(
      "userRole"
    );

    sessionStorage.removeItem(
      "userEmail"
    );

    sessionStorage.removeItem(
      "registeredAccount"
    );

    localStorage.removeItem(
      "fitfusion-current-user"
    );

    navigate("/login");
  }

  if (loading) {
    return (
      <main className="edit-avatar-loading">
        <div>
          <span className="edit-avatar-loader" />

          <p>
            Loading avatar preset...
          </p>
        </div>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="edit-avatar-not-found">
        <section>
          <p>AVATAR PRESET NOT FOUND</p>

          <h1>
            This avatar is no longer available
          </h1>

          <span>
            The avatar preset may have been
            removed, or the selected link may
            be incorrect.
          </span>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/shopper/avatar-presets"
              )
            }
          >
            Return to Avatar Presets
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="edit-avatar-page">
      <aside className="edit-avatar-sidebar">
        <div className="edit-avatar-logo">
          <img
            src={fitFusionLogo}
            alt="FitFusion AI"
          />
        </div>

        <nav className="edit-avatar-navigation">
          <NavLink
            to="/shopper/dashboard"
            className="edit-avatar-nav-link"
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/shopper/fitting-studio"
            className="edit-avatar-nav-link"
          >
            Fitting Studio
          </NavLink>

          <NavLink
            to="/shopper/avatar-presets"
            className={() =>
              "edit-avatar-nav-link active"
            }
          >
            Avatar Presets
          </NavLink>

          <NavLink
            to="/shopper/catalog"
            className="edit-avatar-nav-link"
          >
            Catalog
          </NavLink>

          <NavLink
            to="/shopper/saved-outfits"
            className="edit-avatar-nav-link"
          >
            Saved Outfits
          </NavLink>

          <NavLink
            to="/shopper/orders"
            className="edit-avatar-nav-link"
          >
            Order History
          </NavLink>

          <NavLink
            to="/shopper/account"
            className="edit-avatar-nav-link"
          >
            Account
          </NavLink>
        </nav>

        <button
          type="button"
          className="edit-avatar-logout"
          onClick={handleLogout}
        >
          Logout
        </button>
      </aside>

      <section className="edit-avatar-content">
        <header className="edit-avatar-header">
          <div>
            <p className="edit-avatar-page-code">
              08 — EDIT AVATAR PRESET
            </p>

            <p className="edit-avatar-description">
              Update your saved 2D avatar
              profile
            </p>
          </div>

          <div className="edit-avatar-header-actions">
            <button
              type="button"
              className="edit-avatar-cart"
              onClick={() =>
                navigate("/shopper/cart")
              }
              aria-label={`Open cart with ${cartCount} items`}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 7H6" />

                <circle
                  cx="10"
                  cy="20"
                  r="1"
                />

                <circle
                  cx="18"
                  cy="20"
                  r="1"
                />
              </svg>

              <span>{cartCount}</span>
            </button>

            <div className="edit-avatar-role">
              REGISTERED SHOPPER
            </div>
          </div>
        </header>

        <div className="edit-avatar-body">
          <section className="edit-avatar-title-row">
            <div>
              <button
                type="button"
                className="edit-avatar-back"
                onClick={handleCancel}
              >
                ← Back to Avatar Presets
              </button>

              <h1>Edit your avatar</h1>

              <p>
                Update your information and
                review the changes using the
                Front, Side, and Rear views.
              </p>
            </div>

            <div
              className={
                hasChanges
                  ? "edit-avatar-save-status changed"
                  : "edit-avatar-save-status"
              }
            >
              <span />

              {hasChanges
                ? "Unsaved changes"
                : "All changes saved"}
            </div>
          </section>

          <section className="edit-avatar-workspace">
            <form
              className="edit-avatar-form"
              onSubmit={(event) => {
                event.preventDefault();
                savePreset();
              }}
            >
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
                    maxLength="30"
                    value={formData.name}
                    className={
                      errors.name
                        ? "field-error"
                        : ""
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
                    {errors.name ? (
                      <small className="edit-avatar-error-message">
                        {errors.name}
                      </small>
                    ) : (
                      <small>
                        Use a name containing
                        3–30 characters.
                      </small>
                    )}

                    <small>
                      {formData.name.length}
                      /30
                    </small>
                  </div>
                </div>
              </FormSection>

              <FormSection
                number="02"
                title="Avatar gender"
                description="Select the body model used for the avatar and clothing display."
              >
                <div className="edit-avatar-gender-options">
                  {[
                    "Female",
                    "Male",
                  ].map((gender) => (
                    <button
                      key={gender}
                      type="button"
                      className={
                        formData.gender ===
                        gender
                          ? "active"
                          : ""
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

                      <strong>
                        {gender}
                      </strong>
                    </button>
                  ))}
                </div>
              </FormSection>

              <FormSection
                number="03"
                title="Body measurements"
                description="Height and weight are used to estimate the avatar's general body type."
              >
                <div className="edit-avatar-measurement-grid">
                  <RangeField
                    id="avatar-height"
                    label="Height"
                    value={formData.height}
                    min={120}
                    max={220}
                    unit="cm"
                    error={errors.height}
                    onChange={(value) =>
                      updateField(
                        "height",
                        Number(value)
                      )
                    }
                  />

                  <RangeField
                    id="avatar-weight"
                    label="Weight"
                    value={formData.weight}
                    min={30}
                    max={200}
                    unit="kg"
                    error={errors.weight}
                    onChange={(value) =>
                      updateField(
                        "weight",
                        Number(value)
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
                      Based on the current
                      height and weight values
                    </small>
                  </div>

                  <strong>{bodyType}</strong>
                </div>
              </FormSection>

              <FormSection
                number="04"
                title="Skin tone"
                description="Select the skin tone displayed by the 2D avatar."
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
                        aria-label={`Select skin tone ${
                          index + 1
                        }`}
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
              </FormSection>

              <FormSection
                number="05"
                title="Body proportions"
                description="These fields provide additional details for the 2D avatar representation."
              >
                <div className="edit-avatar-select-grid">
                  <SelectField
                    label="Shoulder"
                    value={
                      formData.shoulder
                    }
                    options={[
                      "Narrow",
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
                        formData.cupSize
                      }
                      options={[
                        "A",
                        "B",
                        "C",
                        "D",
                        "DD",
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
                  <strong>
                    Important:
                  </strong>

                  <span>
                    These values are used to
                    visually adjust the avatar.
                    Final clothing sizes are
                    still determined by the
                    product information
                    provided by the seller.
                  </span>
                </div>
              </FormSection>

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

              <div className="edit-avatar-view-buttons">
                {[
                  "front",
                  "side",
                  "rear",
                ].map((view) => (
                  <button
                    key={view}
                    type="button"
                    className={
                      previewView === view
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setPreviewView(view)
                    }
                  >
                    {view}
                  </button>
                ))}
              </div>

              <div className="edit-avatar-preview-stage">
                <AvatarFigure
                  preset={formData}
                  view={previewView}
                  bodyType={bodyType}
                />

                <span className="edit-avatar-view-label">
                  {previewView.toUpperCase()}{" "}
                  VIEW
                </span>
              </div>

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
                  value={
                    formData.shoulder
                  }
                />

                <SummaryItem
                  label="Waist"
                  value={formData.waist}
                />
              </div>

              <button
                type="button"
                className="edit-avatar-use-button"
                onClick={
                  useInFittingStudio
                }
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
      </section>

      {showDeleteModal && (
        <Modal
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

          <h2>
            Delete “{formData.name}”?
          </h2>

          <span>
            This preset will be permanently
            removed. Your saved outfits and
            previous orders will not be
            deleted.
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

      {showDiscardModal && (
        <Modal
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

          <h2>
            Discard your changes?
          </h2>

          <span>
            The changes made to this avatar
            have not been saved. Leaving this
            page will restore the previously
            saved values.
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

function FormSection({
  number,
  title,
  description,
  children,
}) {
  return (
    <section className="edit-avatar-form-section">
      <div className="edit-avatar-section-heading">
        <span>{number}</span>

        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      {children}
    </section>
  );
}

function RangeField({
  id,
  label,
  value,
  min,
  max,
  unit,
  error,
  onChange,
}) {
  return (
    <div
      className={
        error
          ? "edit-avatar-range-field has-error"
          : "edit-avatar-range-field"
      }
    >
      <div className="edit-avatar-range-heading">
        <label htmlFor={id}>
          {label}
        </label>

        <div>
          <input
            type="number"
            min={min}
            max={max}
            value={value}
            onChange={(event) =>
              onChange(
                event.target.value
              )
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
        value={value}
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

function SelectField({
  label,
  value,
  options,
  onChange,
}) {
  return (
    <label className="edit-avatar-select-field">
      <span>{label}</span>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
      >
        {options.map((option) => (
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

function Modal({
  children,
  onClose,
}) {
  return (
    <div
      className="edit-avatar-modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="edit-avatar-modal"
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        {children}
      </section>
    </div>
  );
}

function AvatarFigure({
  preset,
  view,
  bodyType,
}) {
  const genderClass =
    preset.gender === "Male"
      ? "male"
      : "female";

  const bodyTypeClass =
    bodyType.toLowerCase();

  return (
    <div
      className={[
        "edit-avatar-figure",
        `edit-avatar-figure-${genderClass}`,
        `edit-avatar-figure-${view}`,
        `edit-avatar-figure-${bodyTypeClass}`,
      ].join(" ")}
      style={{
        "--avatar-skin":
          preset.skinTone ||
          "#d9aa82",
      }}
      aria-label={`${preset.gender} avatar ${view} view`}
    >
      <div className="edit-avatar-figure-head">
        <span />
      </div>

      <div className="edit-avatar-figure-neck" />

      <div className="edit-avatar-figure-body">
        <div className="edit-avatar-figure-shirt" />
      </div>

      <div className="edit-avatar-figure-arm left" />

      <div className="edit-avatar-figure-arm right" />

      <div className="edit-avatar-figure-leg left" />

      <div className="edit-avatar-figure-leg right" />
    </div>
  );
}

export default EditAvatarPresetPage;