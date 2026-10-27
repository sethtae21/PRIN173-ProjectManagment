
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AvatarCanvas from "./Shopper/AvatarCanvas";
import "./css/AvatarPresetPage.css";

// ======================================================
// FITFUSION AI — AVATAR PRESETS
// One built-in preset + saved custom presets
// Canvas 2D avatar preview: Front, Side, Rear
// Uses existing shared ShopperLayout / GuestLayout
// ======================================================

const PRESETS_KEY = "fitfusion-avatar-presets";
const ACTIVE_KEY = "fitfusion-avatar-preset";
const GENDER_KEY = "fitfusion-avatar-gender";
const EDITING_KEY = "fitfusion-editing-avatar-preset";

const GUEST_ACTIVE_KEY = "fitfusion-guest-avatar-preset";
const GUEST_GENDER_KEY = "fitfusion-guest-avatar-gender";

const BUILT_IN_PRESET = {
  id: "premade-default",
  name: "FitFusion Standard",
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
  builtIn: true,
};

const VIEWS = ["front", "side", "rear"];

// ======================================================
// STORAGE HELPERS
// ======================================================

function readJSON(storage, key, fallback = null) {
  try {
    const raw = storage.getItem(key);

    if (!raw) {
      return fallback;
    }

    const value = JSON.parse(raw);

    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function normalizeGender(value) {
  return String(value || "").toLowerCase() === "male"
    ? "Male"
    : "Female";
}

function normalizePreset(preset, index = 0) {
  const gender = normalizeGender(preset?.gender);

  return {
    ...preset,

    id: String(
      preset?.id ||
      preset?.presetId ||
      `custom-${index}`
    ),

    name: String(
      preset?.name ||
      preset?.presetName ||
      `Custom Avatar ${index + 1}`
    ).trim(),

    gender,

    height: Number(preset?.height) || 165,

    weight:
      Number(preset?.weight) ||
      (gender === "Male" ? 70 : 58),

    skinTone:
      preset?.skinTone ||
      preset?.skinColor ||
      "#d9aa82",

    undertone: preset?.undertone || "Neutral",

    shoulder:
      preset?.shoulder ||
      preset?.shoulderWidth ||
      "Average",

    waist:
      preset?.waist ||
      preset?.waistSize ||
      "Average",

    hip:
      preset?.hip ||
      preset?.hipSize ||
      "Average",

    thigh:
      preset?.thigh ||
      preset?.thighSize ||
      "Average",

    cupSize:
      gender === "Female"
        ? preset?.cupSize || "B"
        : null,

    builtIn: false,
  };
}

function getCustomPresets() {
  const saved = readJSON(
    localStorage,
    PRESETS_KEY,
    []
  );

  if (!Array.isArray(saved)) {
    return [];
  }

  return saved
    .filter(
      (preset) =>
        preset &&
        String(preset.id) !== BUILT_IN_PRESET.id &&
        !preset.builtIn
    )
    .map(normalizePreset);
}

function getActivePresetId(isGuest) {
  const storage = isGuest
    ? sessionStorage
    : localStorage;

  const key = isGuest
    ? GUEST_ACTIVE_KEY
    : ACTIVE_KEY;

  const active = readJSON(storage, key);

  return active?.id
    ? String(active.id)
    : BUILT_IN_PRESET.id;
}

// ======================================================
// AVATAR FIGURE
// ======================================================

function AvatarFigure({
  preset,
  view = "front",
  small = false,
}) {
  return (
    <div
      className={`avatar-preset-figure ${
        small ? "avatar-preset-figure--small" : ""
      }`}
      aria-label={`${preset.name}, ${view} view`}
    >
      <AvatarCanvas
        avatar={preset}
        view={view}
        equippedItems={{}}
      />
    </div>
  );
}

// ======================================================
// MEASUREMENT ITEM
// ======================================================

function Measurement({ label, value }) {
  return (
    <div className="avatar-preset-measurement">
      <span>{label}</span>
      <strong>{value ?? "Average"}</strong>
    </div>
  );
}

// ======================================================
// MAIN COMPONENT
// ======================================================

export default function AvatarPresetPage({
  isGuest = false,
}) {
  const navigate = useNavigate();

  const basePath = isGuest
    ? "/guest"
    : "/shopper";

  const [customPresets, setCustomPresets] = useState(
    () => (isGuest ? [] : getCustomPresets())
  );

  const [selectedPresetId, setSelectedPresetId] =
    useState(() => getActivePresetId(isGuest));

  const [previewView, setPreviewView] =
    useState("front");

  const [deleteTarget, setDeleteTarget] =
    useState(null);

  const [toastMessage, setToastMessage] =
    useState("");

  // ====================================================
  // REFRESH SAVED PRESETS
  // ====================================================

  useEffect(() => {
    function refreshPresets() {
      if (isGuest) {
        setCustomPresets([]);
      } else {
        setCustomPresets(getCustomPresets());
      }
    }

    refreshPresets();

    window.addEventListener("focus", refreshPresets);
    window.addEventListener("storage", refreshPresets);

    return () => {
      window.removeEventListener(
        "focus",
        refreshPresets
      );

      window.removeEventListener(
        "storage",
        refreshPresets
      );
    };
  }, [isGuest]);

  // ====================================================
  // NOTIFICATION TIMER
  // ====================================================

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToastMessage("");
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  // ====================================================
  // COMBINED PRESETS
  // ====================================================

  const allPresets = useMemo(
    () => [
      BUILT_IN_PRESET,
      ...customPresets,
    ],
    [customPresets]
  );

  const selectedPreset = useMemo(
    () =>
      allPresets.find(
        (preset) =>
          String(preset.id) ===
          String(selectedPresetId)
      ) || BUILT_IN_PRESET,
    [allPresets, selectedPresetId]
  );

  const activePresetId = getActivePresetId(isGuest);

  // ====================================================
  // SELECT PRESET
  // ====================================================

  function selectPreset(preset) {
    setSelectedPresetId(String(preset.id));
    setPreviewView("front");
  }

  // ====================================================
  // SAVE SELECTED ACTIVE AVATAR
  // ====================================================

  function writeActivePreset(preset) {
    const gender = normalizeGender(preset.gender);

    const activePreset = {
      ...preset,
      gender,

      cupSize:
        gender === "Female"
          ? preset.cupSize || "B"
          : null,
    };

    if (isGuest) {
      sessionStorage.setItem(
        GUEST_ACTIVE_KEY,
        JSON.stringify(activePreset)
      );

      sessionStorage.setItem(
        GUEST_GENDER_KEY,
        gender
      );
    } else {
      localStorage.setItem(
        ACTIVE_KEY,
        JSON.stringify(activePreset)
      );

      localStorage.setItem(
        GENDER_KEY,
        gender
      );
    }
  }

  // ====================================================
  // USE AVATAR
  // ====================================================

  function usePreset(preset) {
    try {
      writeActivePreset(preset);

      setSelectedPresetId(String(preset.id));

      navigate(
        `${basePath}/fitting-studio/customize`
      );
    } catch (error) {
      console.error(
        "Unable to use avatar preset:",
        error
      );

      setToastMessage(
        "Unable to load this avatar. Please try again."
      );
    }
  }

  // ====================================================
  // EDIT AVATAR
  // ====================================================

  function editPreset(preset) {
    if (isGuest || preset.builtIn) {
      try {
        writeActivePreset(preset);

        navigate(
          `${basePath}/fitting-studio/customize`
        );
      } catch (error) {
        console.error(
          "Unable to customize avatar:",
          error
        );

        setToastMessage(
          "Unable to open avatar customization."
        );
      }

      return;
    }

    try {
      localStorage.setItem(
        EDITING_KEY,
        JSON.stringify(preset)
      );

      navigate(
        `/shopper/avatar-presets/${encodeURIComponent(
          preset.id
        )}/edit`
      );
    } catch (error) {
      console.error(
        "Unable to edit avatar preset:",
        error
      );

      setToastMessage(
        "Unable to open this preset for editing."
      );
    }
  }

  // ====================================================
  // CREATE CUSTOM AVATAR
  // ====================================================

  function createAvatar() {
    navigate(
      `${basePath}/fitting-studio/customize`
    );
  }

  // ====================================================
  // DELETE PRESET
  // ====================================================

  function requestDelete(preset) {
    if (isGuest || preset.builtIn) {
      setToastMessage(
        "The built-in avatar cannot be deleted."
      );
      return;
    }

    setDeleteTarget(preset);
  }

  function confirmDelete() {
    if (
      !deleteTarget ||
      isGuest ||
      deleteTarget.builtIn
    ) {
      return;
    }

    try {
      const remaining = customPresets.filter(
        (preset) =>
          String(preset.id) !==
          String(deleteTarget.id)
      );

      localStorage.setItem(
        PRESETS_KEY,
        JSON.stringify(remaining)
      );

      const active = readJSON(
        localStorage,
        ACTIVE_KEY
      );

      if (
        String(active?.id) ===
        String(deleteTarget.id)
      ) {
        localStorage.removeItem(ACTIVE_KEY);
      }

      const editing = readJSON(
        localStorage,
        EDITING_KEY
      );

      if (
        String(editing?.id) ===
        String(deleteTarget.id)
      ) {
        localStorage.removeItem(EDITING_KEY);
      }

      if (
        String(selectedPresetId) ===
        String(deleteTarget.id)
      ) {
        setSelectedPresetId(
          BUILT_IN_PRESET.id
        );

        setPreviewView("front");
      }

      setCustomPresets(remaining);

      setToastMessage(
        `“${deleteTarget.name}” was deleted successfully.`
      );

      setDeleteTarget(null);
    } catch (error) {
      console.error(
        "Unable to delete avatar preset:",
        error
      );

      setToastMessage(
        "Unable to delete this avatar. Please try again."
      );
    }
  }

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <main className="avatar-presets-page-content">
      <div className="avatar-presets-body">

        {/* =========================================
            PAGE INTRODUCTION
        ========================================= */}

        <section className="avatar-presets-intro">
          <div className="avatar-presets-intro-copy">
            <p className="avatar-presets-eyebrow">
              YOUR FITTING PROFILE
            </p>

            <h1>Choose an Avatar Preset</h1>

            <span>
              {isGuest
                ? "Explore our premade 2D avatar. Create an account to save your own customized avatars."
                : "Choose the premade avatar or select one of your saved custom avatars to continue fitting clothes."}
            </span>
          </div>

          {!isGuest && (
            <button
              type="button"
              className="avatar-presets-create"
              onClick={createAvatar}
            >
              <span aria-hidden="true">+</span>
              Create Custom Avatar
            </button>
          )}
        </section>

        {/* =========================================
            WORKSPACE
        ========================================= */}

        <div className="avatar-presets-workspace">

          {/* =====================================
              LEFT — AVATAR LIST
          ===================================== */}

          <section className="avatar-presets-list-panel">
            <div className="avatar-presets-panel-heading">
              <div>
                <p>AVAILABLE PRESETS</p>

                <h2>
                  {allPresets.length}{" "}
                  {allPresets.length === 1
                    ? "Avatar"
                    : "Avatars"}
                </h2>
              </div>

              {!isGuest && (
                <span>
                  {customPresets.length} Custom
                </span>
              )}
            </div>

            <div className="avatar-presets-grid">
              {allPresets.map((preset) => {
                const isSelected =
                  String(selectedPreset.id) ===
                  String(preset.id);

                const isActive =
                  String(activePresetId) ===
                  String(preset.id);

                return (
                  <article
                    key={preset.id}
                    className={`avatar-preset-card ${
                      isSelected ? "selected" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="avatar-preset-select-area"
                      aria-pressed={isSelected}
                      onClick={() =>
                        selectPreset(preset)
                      }
                    >
                      <div className="avatar-preset-card-image">
                        <AvatarFigure
                          preset={preset}
                          view="front"
                          small
                        />
                      </div>

                      <div className="avatar-preset-card-badges">
                        <span className="avatar-preset-type">
                          {preset.builtIn
                            ? "PREMADE"
                            : "CUSTOM"}
                        </span>

                        {isActive && (
                          <span className="avatar-preset-active-tag">
                            In Use
                          </span>
                        )}
                      </div>

                      <strong>{preset.name}</strong>

                      <small>
                        {preset.gender}
                        {" • "}
                        {preset.height} cm
                        {" • "}
                        {preset.weight} kg
                      </small>
                    </button>

                    <div className="avatar-preset-card-actions">
                      <button
                        type="button"
                        className="avatar-preset-card-use"
                        onClick={() =>
                          usePreset(preset)
                        }
                      >
                        Use
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          editPreset(preset)
                        }
                      >
                        {preset.builtIn
                          ? "Customize"
                          : "Edit"}
                      </button>

                      {!preset.builtIn && !isGuest && (
                        <button
                          type="button"
                          className="avatar-preset-delete"
                          onClick={() =>
                            requestDelete(preset)
                          }
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* =====================================
              RIGHT — SELECTED AVATAR PREVIEW
          ===================================== */}

          <aside className="avatar-preset-preview-panel">
            <div className="avatar-preset-preview-header">
              <div>
                <p>LIVE 2D PREVIEW</p>

                <h2>{selectedPreset.name}</h2>
              </div>

              <span>
                {selectedPreset.builtIn
                  ? "Premade"
                  : "Custom"}
              </span>
            </div>

            {/* FRONT / SIDE / REAR */}

            <div
              className="avatar-preset-view-buttons"
              role="group"
              aria-label="Avatar preview angle"
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

            {/* BLENDER-RENDERED 2D CANVAS */}

            <div className="avatar-preset-preview-stage">
              <AvatarFigure
                key={`${selectedPreset.id}-${previewView}`}
                preset={selectedPreset}
                view={previewView}
              />

              <span className="avatar-preset-view-label">
                {previewView.toUpperCase()} VIEW
              </span>
            </div>

            {/* AVATAR INFORMATION */}

            <div className="avatar-preset-measurements">
              <Measurement
                label="Gender"
                value={selectedPreset.gender}
              />

              <Measurement
                label="Height"
                value={`${selectedPreset.height} cm`}
              />

              <Measurement
                label="Weight"
                value={`${selectedPreset.weight} kg`}
              />

              <Measurement
                label="Shoulders"
                value={selectedPreset.shoulder}
              />

              <Measurement
                label="Waist"
                value={selectedPreset.waist}
              />

              <Measurement
                label="Hips"
                value={selectedPreset.hip}
              />

              <Measurement
                label="Thighs"
                value={selectedPreset.thigh}
              />

              <Measurement
                label="Undertone"
                value={selectedPreset.undertone}
              />

              {selectedPreset.gender === "Female" && (
                <Measurement
                  label="Cup Size"
                  value={selectedPreset.cupSize || "B"}
                />
              )}

              <div className="avatar-preset-measurement">
                <span>Skin Tone</span>

                <div className="avatar-preset-skin-row">
                  <i
                    className="avatar-preset-skin-dot"
                    style={{
                      backgroundColor:
                        selectedPreset.skinTone,
                    }}
                    aria-hidden="true"
                  />

                  <strong>
                    {selectedPreset.skinTone}
                  </strong>
                </div>
              </div>
            </div>

            {/* PREVIEW ACTIONS */}

            <div className="avatar-preset-preview-actions">
              <button
                type="button"
                className="avatar-preset-use-button"
                onClick={() =>
                  usePreset(selectedPreset)
                }
              >
                Use This Avatar
              </button>

              <button
                type="button"
                className="avatar-preset-edit-button"
                onClick={() =>
                  editPreset(selectedPreset)
                }
              >
                {selectedPreset.builtIn
                  ? "Customize Avatar"
                  : "Edit Preset"}
              </button>

              {!selectedPreset.builtIn &&
                !isGuest && (
                  <button
                    type="button"
                    className="avatar-preset-preview-delete"
                    onClick={() =>
                      requestDelete(selectedPreset)
                    }
                  >
                    Delete Preset
                  </button>
                )}
            </div>
          </aside>
        </div>
      </div>

      {/* =========================================
          DELETE CONFIRMATION
      ========================================= */}

      {deleteTarget && !isGuest && (
        <div
          className="avatar-preset-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setDeleteTarget(null);
            }
          }}
        >
          <section
            className="avatar-preset-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-preset-title"
          >
            <div className="avatar-preset-modal-icon">
              !
            </div>

            <p>DELETE AVATAR PRESET</p>

            <h2 id="delete-preset-title">
              Delete “{deleteTarget.name}”?
            </h2>

            <span>
              This avatar preset will be permanently
              deleted. Your saved outfits and order
              history will not be deleted.
            </span>

            <div className="avatar-preset-modal-actions">
              <button
                type="button"
                onClick={() =>
                  setDeleteTarget(null)
                }
              >
                Keep Preset
              </button>

              <button
                type="button"
                className="confirm-delete"
                onClick={confirmDelete}
              >
                Delete Preset
              </button>
            </div>
          </section>
        </div>
      )}

      {/* =========================================
          NOTIFICATION
      ========================================= */}

      {toastMessage && (
        <div
          className="avatar-preset-toast"
          role="status"
        >
          {toastMessage}
        </div>
      )}
    </main>
  );
}
