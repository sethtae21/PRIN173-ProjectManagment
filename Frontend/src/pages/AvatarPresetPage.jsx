import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import "./css/AvatarPresetPage.css";

const BUILT_IN_PRESET = {
  id: "premade-default",
  name: "FitFusion Standard",
  gender: "Female",
  height: 165,
  weight: 58,
  skinTone: "#d9aa82",
  shoulder: "Balanced",
  waist: "Regular",
  hip: "Balanced",
  thigh: "Regular",
  cupSize: "B",
  builtIn: true,
};

function readStorageArray(key) {
  try {
    const storedValue = JSON.parse(
      localStorage.getItem(key) || "[]"
    );

    return Array.isArray(storedValue)
      ? storedValue
      : [];
  } catch {
    return [];
  }
}

function normalizeGender(value) {
  if (
    typeof value === "string" &&
    value.toLowerCase() === "male"
  ) {
    return "Male";
  }

  return "Female";
}

function AvatarPresetPage({
  isGuest = false,
}) {
  const navigate = useNavigate();

  const basePath = isGuest
    ? "/guest"
    : "/shopper";

  const [customPresets, setCustomPresets] =
    useState([]);

  const [
    selectedPresetId,
    setSelectedPresetId,
  ] = useState(BUILT_IN_PRESET.id);

  const [previewView, setPreviewView] =
    useState("front");

  const [deleteTarget, setDeleteTarget] =
    useState(null);

  const [toastMessage, setToastMessage] =
    useState("");

  useEffect(() => {
    if (isGuest) {
      /*
       * Guests cannot have permanently
       * saved custom presets.
       */
      setCustomPresets([]);
      return;
    }

    const savedPresets = readStorageArray(
      "fitfusion-avatar-presets"
    ).map((preset, index) => {
      const gender = normalizeGender(
        preset.gender
      );

      return {
        id:
          preset.id ||
          `saved-preset-${index}`,

        name:
          preset.name ||
          `Custom Avatar ${index + 1}`,

        gender,
        height:
          Number(preset.height) || 165,
        weight:
          Number(preset.weight) || 58,

        skinTone:
          preset.skinTone || "#d9aa82",

        shoulder:
          preset.shoulder || "Balanced",

        waist:
          preset.waist || "Regular",

        hip:
          preset.hip || "Balanced",

        thigh:
          preset.thigh || "Regular",

        /*
         * Cup size only applies to
         * Female avatars.
         */
        cupSize:
          gender === "Female"
            ? preset.cupSize || "B"
            : null,

        builtIn:
          Boolean(preset.builtIn),
      };
    });

    setCustomPresets(savedPresets);
  }, [isGuest]);

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setToastMessage("");
    }, 2600);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toastMessage]);

  const allPresets = useMemo(
    () => [
      BUILT_IN_PRESET,
      ...customPresets,
    ],
    [customPresets]
  );

  const selectedPreset =
    allPresets.find(
      (preset) =>
        preset.id === selectedPresetId
    ) || BUILT_IN_PRESET;

  function selectPreset(preset) {
    setSelectedPresetId(preset.id);
    setPreviewView("front");
  }

  function usePreset(preset) {
    const gender = normalizeGender(
      preset.gender
    );

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
        "fitfusion-guest-avatar-preset",
        JSON.stringify(activePreset)
      );

      sessionStorage.setItem(
        "fitfusion-guest-avatar-gender",
        gender
      );

      setToastMessage(
        `Using ${activePreset.name} for this temporary session.`
      );
    } else {
      localStorage.setItem(
        "fitfusion-avatar-preset",
        JSON.stringify(activePreset)
      );

      localStorage.setItem(
        "fitfusion-avatar-gender",
        gender
      );

      setToastMessage(
        `${activePreset.name} is now your active avatar.`
      );
    }

    window.setTimeout(() => {
      navigate(
        `${basePath}/fitting-studio/customize`
      );
    }, 700);
  }

  function editPreset(preset) {
    const gender = normalizeGender(
      preset.gender
    );

    const presetToEdit = {
      ...preset,
      gender,

      cupSize:
        gender === "Female"
          ? preset.cupSize || "B"
          : null,
    };

    if (isGuest) {
      sessionStorage.setItem(
        "fitfusion-guest-avatar-preset",
        JSON.stringify(presetToEdit)
      );

      sessionStorage.setItem(
        "fitfusion-guest-avatar-gender",
        gender
      );

      navigate(
        "/guest/fitting-studio/customize"
      );

      return;
    }

    if (preset.builtIn) {
      localStorage.setItem(
        "fitfusion-avatar-preset",
        JSON.stringify(presetToEdit)
      );

      localStorage.setItem(
        "fitfusion-avatar-gender",
        gender
      );

      navigate(
        "/shopper/fitting-studio/customize"
      );

      return;
    }

    localStorage.setItem(
      "fitfusion-editing-avatar-preset",
      JSON.stringify(presetToEdit)
    );

    navigate(
      `/shopper/avatar-presets/${preset.id}/edit`
    );
  }

  function requestDelete(preset) {
    if (preset.builtIn) {
      setToastMessage(
        "The built-in preset cannot be deleted."
      );

      return;
    }

    setDeleteTarget(preset);
  }

  function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    const nextPresets =
      customPresets.filter(
        (preset) =>
          preset.id !== deleteTarget.id
      );

    setCustomPresets(nextPresets);

    localStorage.setItem(
      "fitfusion-avatar-presets",
      JSON.stringify(nextPresets)
    );

    if (
      selectedPresetId ===
      deleteTarget.id
    ) {
      setSelectedPresetId(
        BUILT_IN_PRESET.id
      );
    }

    setToastMessage(
      `${deleteTarget.name} was deleted.`
    );

    setDeleteTarget(null);
  }

  return (
    <main className="avatar-presets-page-content">
      <div className="avatar-presets-body">
        <section className="avatar-presets-intro">
          <div>
            <p>YOUR FITTING PROFILE</p>

            <h1>
              Choose an avatar preset
            </h1>

            <span>
              {isGuest
                ? "Use the premade avatar to start your temporary fitting session."
                : "Use the premade avatar or select one of your saved custom avatars."}
            </span>
          </div>

          {!isGuest && (
            <button
              type="button"
              className="avatar-presets-create"
              onClick={() =>
                navigate(
                  "/shopper/fitting-studio"
                )
              }
            >
              + Create Custom Avatar
            </button>
          )}
        </section>

        <section className="avatar-presets-workspace">
          <div className="avatar-presets-list-panel">
            <div className="avatar-presets-panel-heading">
              <div>
                <p>AVAILABLE PRESETS</p>

                <h2>
                  {allPresets.length}{" "}
                  {allPresets.length === 1
                    ? "avatar"
                    : "avatars"}
                </h2>
              </div>

              {!isGuest && (
                <span>
                  {customPresets.length} custom
                </span>
              )}
            </div>

            <div className="avatar-presets-grid">
              {allPresets.map((preset) => (
                <article
                  key={preset.id}
                  className={
                    selectedPresetId ===
                    preset.id
                      ? "avatar-preset-card selected"
                      : "avatar-preset-card"
                  }
                  onClick={() =>
                    selectPreset(preset)
                  }
                >
                  <button
                    type="button"
                    className="avatar-preset-select-area"
                    onClick={() =>
                      selectPreset(preset)
                    }
                  >
                    <AvatarFigure
                      preset={preset}
                      view="front"
                      small
                    />

                    <span className="avatar-preset-type">
                      {preset.builtIn
                        ? "PREMADE"
                        : "CUSTOM"}
                    </span>

                    <strong>
                      {preset.name}
                    </strong>

                    <small>
                      {normalizeGender(
                        preset.gender
                      )}{" "}
                      • {preset.height} cm
                    </small>
                  </button>

                  <div className="avatar-preset-card-actions">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        usePreset(preset);
                      }}
                    >
                      Use
                    </button>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        editPreset(preset);
                      }}
                    >
                      {preset.builtIn
                        ? "Customize"
                        : "Edit"}
                    </button>

                    {!preset.builtIn &&
                      !isGuest && (
                        <button
                          type="button"
                          className="avatar-preset-delete"
                          onClick={(
                            event
                          ) => {
                            event.stopPropagation();

                            requestDelete(
                              preset
                            );
                          }}
                        >
                          Delete
                        </button>
                      )}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="avatar-preset-preview-panel">
            <div className="avatar-preset-preview-header">
              <div>
                <p>PREVIEW</p>

                <h2>
                  {selectedPreset.name}
                </h2>
              </div>

              <span>
                {selectedPreset.builtIn
                  ? "Premade"
                  : "Custom"}
              </span>
            </div>

            <div className="avatar-preset-view-buttons">
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

            <div className="avatar-preset-preview-stage">
              <AvatarFigure
                preset={selectedPreset}
                view={previewView}
              />

              <span className="avatar-preset-view-label">
                {previewView.toUpperCase()}{" "}
                VIEW
              </span>
            </div>

            <div className="avatar-preset-measurements">
              <Measurement
                label="Gender"
                value={normalizeGender(
                  selectedPreset.gender
                )}
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
                label="Shoulder"
                value={
                  selectedPreset.shoulder
                }
              />

              <Measurement
                label="Waist"
                value={selectedPreset.waist}
              />

              <Measurement
                label="Hip"
                value={selectedPreset.hip}
              />

              <Measurement
                label="Thigh"
                value={selectedPreset.thigh}
              />

              {normalizeGender(
                selectedPreset.gender
              ) === "Female" && (
                <Measurement
                  label="Cup Size"
                  value={
                    selectedPreset.cupSize ||
                    "B"
                  }
                />
              )}
            </div>

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
            </div>
          </aside>
        </section>
      </div>

      {deleteTarget && !isGuest && (
        <div
          className="avatar-preset-modal-backdrop"
          role="presentation"
          onMouseDown={() =>
            setDeleteTarget(null)
          }
        >
          <section
            className="avatar-preset-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-preset-title"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="avatar-preset-modal-icon">
              !
            </div>

            <p>DELETE AVATAR PRESET</p>

            <h2 id="delete-preset-title">
              Delete “{deleteTarget.name}”?
            </h2>

            <span>
              This avatar preset will be
              permanently removed.
            </span>

            <div className="avatar-preset-modal-actions">
              <button
                type="button"
                onClick={() =>
                  setDeleteTarget(null)
                }
              >
                Cancel
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

function Measurement({
  label,
  value,
}) {
  return (
    <div className="avatar-preset-measurement">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AvatarFigure({
  preset,
  view,
  small = false,
}) {
  const gender =
    normalizeGender(preset.gender);

  const genderClass =
    gender === "Male"
      ? "male"
      : "female";

  const className = [
    "preset-avatar",
    `preset-avatar-${genderClass}`,
    `preset-avatar-${view}`,
    small
      ? "preset-avatar-small"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      style={{
        "--avatar-skin":
          preset.skinTone ||
          "#d9aa82",
      }}
      aria-label={`${preset.name} ${view} view`}
    >
      <div className="preset-avatar-head">
        <span />
      </div>

      <div className="preset-avatar-neck" />

      <div className="preset-avatar-body">
        <div className="preset-avatar-shirt" />
      </div>

      <div className="preset-avatar-arm left" />
      <div className="preset-avatar-arm right" />
      <div className="preset-avatar-leg left" />
      <div className="preset-avatar-leg right" />
    </div>
  );
}

export default AvatarPresetPage;