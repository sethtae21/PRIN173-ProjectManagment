import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AvatarCanvas from "./Shopper/AvatarCanvas";
import { presetsApi } from "../services/api";
import "./css/AvatarPresetPage.css";

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

const VIEWS = ["front", "rear"];

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

function readJSON(storage, key, fallback = null) {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) ?? fallback : fallback;
  } catch {
    return fallback;
  }
}

function getPresetList(data) {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.results) ? data.results : [];
}

function normalizeGender(value) {
  return String(value || "").trim().toLowerCase() === "male"
    ? "Male"
    : "Female";
}

function capitalizeChoice(value, fallback) {
  const text = String(value || "").trim().toLowerCase();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : fallback;
}

function normalizePreset(preset, index = 0) {
  const gender = normalizeGender(preset?.gender);

  return {
    ...preset,
    id: String(preset?.id || preset?.presetId || `custom-${index}`),
    name: String(
      preset?.name || preset?.presetName || `Custom Avatar ${index + 1}`
    ).trim(),
    gender,
    height: Number(preset?.height) || 165,
    weight: Number(preset?.weight) || (gender === "Male" ? 70 : 58),
    skinTone:
      preset?.skinTone ||
      preset?.skin_tone ||
      preset?.skinColor ||
      "#d9aa82",
    undertone: capitalizeChoice(preset?.undertone, "Neutral"),
    shoulder: capitalizeChoice(
      preset?.shoulder || preset?.shoulderWidth,
      "Average"
    ),
    waist: capitalizeChoice(preset?.waist || preset?.waistSize, "Average"),
    hip: capitalizeChoice(preset?.hip || preset?.hipSize, "Average"),
    thigh: capitalizeChoice(preset?.thigh || preset?.thighSize, "Average"),
    cupSize:
      gender === "Female"
        ? String(preset?.cupSize || preset?.cup_size || "B").toUpperCase()
        : null,
    builtIn: false,
  };
}

function getActivePresetId(isGuest) {
  const storage = isGuest ? sessionStorage : localStorage;
  const key = isGuest ? GUEST_ACTIVE_KEY : ACTIVE_KEY;
  const active = readJSON(storage, key);

  return active?.id ? String(active.id) : BUILT_IN_PRESET.id;
}

function syncCachedName(id, name) {
  for (const key of [ACTIVE_KEY, EDITING_KEY]) {
    try {
      const cached = readJSON(localStorage, key);

      if (String(cached?.id || cached?.presetId) !== String(id)) continue;

      localStorage.setItem(
        key,
        JSON.stringify({
          ...cached,
          name,
          ...(Object.prototype.hasOwnProperty.call(cached, "presetName")
            ? { presetName: name }
            : {}),
        })
      );
    } catch (error) {
      console.error("Unable to update cached preset name:", error);
    }
  }
}

function removeCachedPreset(id) {
  for (const key of [ACTIVE_KEY, EDITING_KEY]) {
    try {
      const cached = readJSON(localStorage, key);

      if (String(cached?.id || cached?.presetId) === String(id)) {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error("Unable to clear cached preset:", error);
    }
  }
}

function AvatarFigure({ preset, view = "front", small = false }) {
  return (
    <div
      className={`avatar-preset-figure ${
        small ? "avatar-preset-figure--small" : ""
      }`}
      aria-label={`${preset.name}, ${view} view`}
    >
      <AvatarCanvas avatar={preset} view={view} equippedItems={{}} />
    </div>
  );
}

function Measurement({ label, value }) {
  return (
    <div className="avatar-preset-measurement">
      <span>{label}</span>
      <strong>{value ?? "Average"}</strong>
    </div>
  );
}

function PresetModal({ children, titleId, busy, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;

    if (dialog && !dialog.open) dialog.showModal();

    return () => {
      if (dialog?.open) dialog.close();

      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="avatar-preset-modal"
      aria-labelledby={titleId}
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (busy || event.target !== event.currentTarget) return;

        const rect = event.currentTarget.getBoundingClientRect();
        const outside =
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom;

        if (outside) onClose();
      }}
    >
      {children}
    </dialog>
  );
}

export default function AvatarPresetPage({ isGuest = false }) {
  const navigate = useNavigate();
  const basePath = isGuest ? "/guest" : "/shopper";

  const [customPresets, setCustomPresets] = useState([]);
  const [selectedPresetId, setSelectedPresetId] = useState(() =>
    getActivePresetId(isGuest)
  );
  const [previewView, setPreviewView] = useState("front");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [presetName, setPresetName] = useState("");
  const [renameError, setRenameError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [loading, setLoading] = useState(!isGuest);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState(false);

  const mutationRef = useRef(false);
  const requestVersionRef = useRef(0);

  useEffect(() => {
    let active = true;

    setSelectedPresetId(getActivePresetId(isGuest));
    setRenameTarget(null);
    setDeleteTarget(null);

    async function fetchPresets() {
      if (mutationRef.current) return;

      const version = ++requestVersionRef.current;

      if (isGuest) {
        setCustomPresets([]);
        setLoading(false);
        setLoadError("");
        return;
      }

      setLoading(true);
      setLoadError("");

      try {
        const data = await presetsApi.list();

        if (active && version === requestVersionRef.current) {
          setCustomPresets(getPresetList(data).map(normalizePreset));
        }
      } catch (error) {
        console.error("Unable to load avatar presets:", error);

        if (active && version === requestVersionRef.current) {
          setLoadError("Unable to load saved avatars. Please try again.");
        }
      } finally {
        if (active && version === requestVersionRef.current) {
          setLoading(false);
        }
      }
    }

    fetchPresets();
    window.addEventListener("focus", fetchPresets);

    return () => {
      active = false;
      window.removeEventListener("focus", fetchPresets);
    };
  }, [isGuest, reloadKey]);

  useEffect(() => {
    if (!toastMessage) return undefined;

    const timer = window.setTimeout(() => setToastMessage(""), 3500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const allPresets = useMemo(
    () => [BUILT_IN_PRESET, ...customPresets],
    [customPresets]
  );

  const selectedPreset = useMemo(
    () =>
      allPresets.find(
        (preset) => String(preset.id) === String(selectedPresetId)
      ) || BUILT_IN_PRESET,
    [allPresets, selectedPresetId]
  );

  const activePresetId = getActivePresetId(isGuest);

  function selectPreset(preset) {
    setSelectedPresetId(String(preset.id));
    setPreviewView("front");
  }

  function usePreset(preset) {
    try {
      const gender = normalizeGender(preset.gender);
      const activePreset = {
        ...preset,
        gender,
        cupSize: gender === "Female" ? preset.cupSize || "B" : null,
      };

      const storage = isGuest ? sessionStorage : localStorage;

      storage.setItem(
        isGuest ? GUEST_ACTIVE_KEY : ACTIVE_KEY,
        JSON.stringify(activePreset)
      );
      storage.setItem(isGuest ? GUEST_GENDER_KEY : GENDER_KEY, gender);

      setSelectedPresetId(String(preset.id));
      navigate(`${basePath}/fitting-studio/customize`);
    } catch (error) {
      console.error("Unable to use avatar preset:", error);
      setToastMessage("Unable to load this avatar. Please try again.");
    }
  }

  function requestRename(preset) {
    if (isGuest || preset.builtIn || mutationRef.current) return;

    setRenameTarget(preset);
    setPresetName(preset.name);
    setRenameError("");
  }

  function closeRename() {
    if (mutationRef.current) return;
    setRenameTarget(null);
    setRenameError("");
  }

  async function confirmRename(event) {
    event.preventDefault();

    if (
      !renameTarget ||
      isGuest ||
      renameTarget.builtIn ||
      mutationRef.current
    ) {
      return;
    }

    const name = presetName.trim();

    if (name.length < 3 || name.length > 50) {
      setRenameError("Enter a preset name containing 3–50 characters.");
      return;
    }

    if (name.toLowerCase() === BUILT_IN_PRESET.name.toLowerCase()) {
      setRenameError("This name is reserved for the premade avatar.");
      return;
    }

    if (name === renameTarget.name) {
      closeRename();
      return;
    }

    mutationRef.current = true;
    requestVersionRef.current += 1;
    setBusy(true);
    setLoading(false);
    setRenameError("");

    const targetId = renameTarget.id;

    try {
      const data = await presetsApi.list();
      const duplicate = getPresetList(data).some(
        (preset) =>
          String(preset.id || preset.presetId) !== String(targetId) &&
          String(preset.name || preset.presetName || "")
            .trim()
            .toLowerCase() === name.toLowerCase()
      );

      if (duplicate) {
        setRenameError(
          "Another preset already uses this name. Please choose a different name."
        );
        return;
      }

      // Read the current server record so full-update APIs retain
      // its saved measurements, appearance, and other settings.
      const currentRecord = await presetsApi.get(targetId);

      if (!currentRecord || typeof currentRecord !== "object") {
        throw new Error("The saved preset is unavailable.");
      }

      await presetsApi.update(targetId, {
        ...currentRecord,
        name,
      });

      setCustomPresets((current) =>
        current.map((preset) =>
          String(preset.id) === String(targetId)
            ? {
                ...preset,
                name,
                ...(Object.prototype.hasOwnProperty.call(preset, "presetName")
                  ? { presetName: name }
                  : {}),
              }
            : preset
        )
      );

      syncCachedName(targetId, name);
      setRenameTarget(null);
      setToastMessage(`Preset renamed to “${name}”.`);
    } catch (error) {
      console.error("Unable to rename avatar preset:", error);
      setRenameError("Unable to rename this preset. Please try again.");
    } finally {
      mutationRef.current = false;
      setBusy(false);
    }
  }

  function requestDelete(preset) {
    if (isGuest || preset.builtIn || mutationRef.current) return;

    setDeleteTarget(preset);
    setDeleteError("");
  }

  function closeDelete() {
    if (mutationRef.current) return;
    setDeleteTarget(null);
    setDeleteError("");
  }

  async function confirmDelete() {
    if (
      !deleteTarget ||
      isGuest ||
      deleteTarget.builtIn ||
      mutationRef.current
    ) {
      return;
    }

    mutationRef.current = true;
    requestVersionRef.current += 1;
    setBusy(true);
    setLoading(false);
    setDeleteError("");

    const target = deleteTarget;

    try {
      await presetsApi.remove(target.id);

      setCustomPresets((current) =>
        current.filter((preset) => String(preset.id) !== String(target.id))
      );

      removeCachedPreset(target.id);

      if (String(selectedPresetId) === String(target.id)) {
        setSelectedPresetId(BUILT_IN_PRESET.id);
        setPreviewView("front");
      }

      setDeleteTarget(null);
      setToastMessage(`“${target.name}” was deleted successfully.`);
    } catch (error) {
      console.error("Unable to delete avatar preset:", error);
      setDeleteError("Unable to delete this preset. Please try again.");
    } finally {
      mutationRef.current = false;
      setBusy(false);
    }
  }

  return (
    <main className="avatar-presets-page-content">
      <div className="avatar-presets-body">
        <section className="avatar-presets-intro">
          <div className="avatar-presets-intro-copy">
            <p className="avatar-presets-eyebrow">YOUR FITTING PROFILE</p>
            <h1>Choose an Avatar Preset</h1>
            <span>
              {isGuest
                ? "Explore our premade 2D avatar. Create an account to save your own customized avatars."
                : "Choose an avatar to continue fitting clothes. You can rename or delete your saved custom presets."}
            </span>
          </div>

          {!isGuest && (
            <button
              type="button"
              className="avatar-presets-create"
              onClick={() => navigate(`${basePath}/fitting-studio/customize`)}
            >
              <span aria-hidden="true">+</span>
              Create Custom Avatar
            </button>
          )}
        </section>

        <div className="avatar-presets-workspace">
          <section className="avatar-presets-list-panel">
            <div className="avatar-presets-panel-heading">
              <div>
                <p>AVAILABLE PRESETS</p>
                <h2>
                  {allPresets.length}{" "}
                  {allPresets.length === 1 ? "Avatar" : "Avatars"}
                </h2>
              </div>
              {!isGuest && <span>{customPresets.length} Custom</span>}
            </div>

            {loading && (
              <p className="avatar-presets-loading" role="status">
                Loading saved avatars...
              </p>
            )}

            {loadError && (
              <div className="avatar-presets-load-error" role="alert">
                <p>{loadError}</p>
                <button
                  type="button"
                  onClick={() => setReloadKey((current) => current + 1)}
                >
                  Try Again
                </button>
              </div>
            )}

            <div className="avatar-presets-grid">
              {allPresets.map((preset) => {
                const isSelected =
                  String(selectedPreset.id) === String(preset.id);
                const isActive =
                  String(activePresetId) === String(preset.id);
                const canManage = !preset.builtIn && !isGuest;

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
                      onClick={() => selectPreset(preset)}
                    >
                      <div className="avatar-preset-card-image">
                        <AvatarFigure preset={preset} view="front" small />
                      </div>

                      <div className="avatar-preset-card-badges">
                        <span className="avatar-preset-type">
                          {preset.builtIn ? "PREMADE" : "CUSTOM"}
                        </span>
                        {isActive && (
                          <span className="avatar-preset-active-tag">In Use</span>
                        )}
                      </div>

                      <strong>{preset.name}</strong>
                      <small>
                        {preset.gender} • {preset.height} cm •{" "}
                        {calculateBodyType(preset.height, preset.weight)}
                      </small>
                    </button>

                    <div className="avatar-preset-card-actions">
                      <button
                        type="button"
                        className="avatar-preset-card-use"
                        onClick={() => usePreset(preset)}
                      >
                        Use
                      </button>

                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => requestRename(preset)}
                            aria-label={`Rename ${preset.name}`}
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            className="avatar-preset-delete"
                            onClick={() => requestDelete(preset)}
                            aria-label={`Delete ${preset.name}`}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="avatar-preset-preview-panel">
            <div className="avatar-preset-preview-header">
              <div>
                <p>LIVE 2D PREVIEW</p>
                <h2>{selectedPreset.name}</h2>
              </div>
              <span>{selectedPreset.builtIn ? "Premade" : "Custom"}</span>
            </div>

            <div
              className="avatar-preset-view-buttons"
              role="group"
              aria-label="Avatar preview angle"
            >
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

            <div className="avatar-preset-measurements">
              <Measurement label="Gender" value={selectedPreset.gender} />
              <Measurement
                label="Height"
                value={`${selectedPreset.height} cm`}
              />
              <Measurement
                label="Body Build"
                value={calculateBodyType(
                  selectedPreset.height,
                  selectedPreset.weight
                )}
              />
              <Measurement label="Shoulders" value={selectedPreset.shoulder} />
              <Measurement label="Waist" value={selectedPreset.waist} />
              <Measurement label="Hips" value={selectedPreset.hip} />
              <Measurement label="Thighs" value={selectedPreset.thigh} />
              <Measurement label="Undertone" value={selectedPreset.undertone} />

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
                    style={{ backgroundColor: selectedPreset.skinTone }}
                    aria-hidden="true"
                  />
                  <strong>{selectedPreset.skinTone}</strong>
                </div>
              </div>
            </div>

            <div className="avatar-preset-preview-actions">
              <button
                type="button"
                className="avatar-preset-use-button"
                onClick={() => usePreset(selectedPreset)}
              >
                Use This Avatar
              </button>

              {!selectedPreset.builtIn && !isGuest && (
                <>
                  <button
                    type="button"
                    className="avatar-preset-rename-button"
                    onClick={() => requestRename(selectedPreset)}
                  >
                    Rename Preset
                  </button>
                  <button
                    type="button"
                    className="avatar-preset-preview-delete"
                    onClick={() => requestDelete(selectedPreset)}
                  >
                    Delete Preset
                  </button>
                </>
              )}
            </div>
          </aside>
        </div>
      </div>

      {renameTarget && !isGuest && (
        <PresetModal
          titleId="rename-preset-title"
          busy={busy}
          onClose={closeRename}
        >
          <div className="avatar-preset-modal-icon rename" aria-hidden="true">
            ✎
          </div>
          <p className="avatar-preset-modal-eyebrow">RENAME AVATAR PRESET</p>
          <h2 id="rename-preset-title">Give your preset a name</h2>
          <span>Your avatar measurements and appearance will stay the same.</span>

          <form onSubmit={confirmRename} noValidate>
            <div className="avatar-preset-name-field">
              <label htmlFor="avatar-preset-name">Preset name</label>
              <input
                id="avatar-preset-name"
                type="text"
                value={presetName}
                maxLength={50}
                autoFocus
                autoComplete="off"
                disabled={busy}
                aria-invalid={Boolean(renameError)}
                aria-describedby={`avatar-preset-name-help${
                  renameError ? " avatar-preset-name-error" : ""
                }`}
                onChange={(event) => {
                  setPresetName(event.target.value);
                  setRenameError("");
                }}
              />
              <div className="avatar-preset-name-help">
                <small id="avatar-preset-name-help">
                  Use a unique name with 3–50 characters.
                </small>
                <small>{presetName.length}/50</small>
              </div>

              {renameError && (
                <p
                  id="avatar-preset-name-error"
                  className="avatar-preset-form-error"
                  role="alert"
                >
                  {renameError}
                </p>
              )}
            </div>

            <div className="avatar-preset-modal-actions">
              <button type="button" disabled={busy} onClick={closeRename}>
                Cancel
              </button>
              <button
                type="submit"
                className="confirm-rename"
                disabled={busy || presetName.trim() === renameTarget.name}
              >
                {busy ? "Saving..." : "Save Name"}
              </button>
            </div>
          </form>
        </PresetModal>
      )}

      {deleteTarget && !isGuest && (
        <PresetModal
          titleId="delete-preset-title"
          busy={busy}
          onClose={closeDelete}
        >
          <div className="avatar-preset-modal-icon" aria-hidden="true">!</div>
          <p className="avatar-preset-modal-eyebrow danger">
            DELETE AVATAR PRESET
          </p>
          <h2 id="delete-preset-title">Delete “{deleteTarget.name}”?</h2>
          <span>
            This avatar preset will be permanently deleted from your account.
          </span>

          {deleteError && (
            <p className="avatar-preset-form-error" role="alert">
              {deleteError}
            </p>
          )}

          <div className="avatar-preset-modal-actions">
            <button
              type="button"
              autoFocus
              disabled={busy}
              onClick={closeDelete}
            >
              Keep Preset
            </button>
            <button
              type="button"
              className="confirm-delete"
              disabled={busy}
              onClick={confirmDelete}
            >
              {busy ? "Deleting..." : "Delete Preset"}
            </button>
          </div>
        </PresetModal>
      )}

      {toastMessage && (
        <div className="avatar-preset-toast" role="status">
          {toastMessage}
        </div>
      )}
    </main>
  );
}