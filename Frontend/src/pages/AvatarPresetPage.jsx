import { useEffect, useMemo, useState } from "react";
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
    const storedValue = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(storedValue) ? storedValue : [];
  } catch {
    return [];
  }
}

function AvatarPresetPage({ isGuest = false }) {
  const navigate = useNavigate();
  const basePath = isGuest ? "/guest" : "/shopper";

  const [customPresets, setCustomPresets] = useState([]);
  const [selectedPresetId, setSelectedPresetId] = useState(BUILT_IN_PRESET.id);
  const [previewView, setPreviewView] = useState("front");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    if (isGuest) {
      setCustomPresets([]); // Guests cannot have saved custom presets (FR-1.9)
      return;
    }
    const savedPresets = readStorageArray("fitfusion-avatar-presets").map((preset, index) => ({
      id: preset.id || `saved-preset-${index}`,
      name: preset.name || `Custom Avatar ${index + 1}`,
      gender: preset.gender || "Female",
      height: Number(preset.height) || 165,
      weight: Number(preset.weight) || 58,
      skinTone: preset.skinTone || "#d9aa82",
      shoulder: preset.shoulder || "Balanced",
      waist: preset.waist || "Regular",
      hip: preset.hip || "Balanced",
      thigh: preset.thigh || "Regular",
      cupSize: preset.cupSize || "B",
      builtIn: Boolean(preset.builtIn),
    }));
    setCustomPresets(savedPresets);
  }, [isGuest]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const allPresets = useMemo(() => [BUILT_IN_PRESET, ...customPresets], [customPresets]);
  const selectedPreset = allPresets.find((p) => p.id === selectedPresetId) || BUILT_IN_PRESET;

  const cartCount = useMemo(() => {
    if (isGuest) return 0;
    return readStorageArray("fitfusion-cart-items").reduce((total, item) => total + (Number(item.quantity) || 1), 0);
  }, [isGuest]);

  function selectPreset(preset) {
    setSelectedPresetId(preset.id);
    setPreviewView("front");
  }

  function usePreset(preset) {
    const activePreset = { ...preset };
    
    if (isGuest) {
      // Ephemeral guest storage (FR-1.9)
      sessionStorage.setItem("fitfusion-guest-avatar-preset", JSON.stringify(activePreset));
      sessionStorage.setItem("fitfusion-guest-avatar-gender", activePreset.gender.toLowerCase());
      setToastMessage(`Using ${activePreset.name} for this temporary session.`);
    } else {
      localStorage.setItem("fitfusion-avatar-preset", JSON.stringify(activePreset));
      localStorage.setItem("fitfusion-avatar-gender", activePreset.gender.toLowerCase());
      setToastMessage(`${activePreset.name} is now your active avatar.`);
    }

    window.setTimeout(() => {
      navigate(`${basePath}/fitting-studio/customize`);
    }, 700);
  }

  function editPreset(preset) {
    if (isGuest) {
      navigate(`${basePath}/fitting-studio/customize`);
      return;
    }
    
    if (preset.builtIn) {
      localStorage.setItem("fitfusion-avatar-preset", JSON.stringify(preset));
      localStorage.setItem("fitfusion-avatar-gender", preset.gender.toLowerCase());
      navigate(`${basePath}/fitting-studio/customize`);
      return;
    }

    localStorage.setItem("fitfusion-editing-avatar-preset", JSON.stringify(preset));
    navigate(`${basePath}/avatar-presets/${preset.id}/edit`);
  }

  function requestDelete(preset) {
    if (preset.builtIn) {
      setToastMessage("The built-in preset cannot be deleted.");
      return;
    }
    setDeleteTarget(preset);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const nextPresets = customPresets.filter((p) => p.id !== deleteTarget.id);
    setCustomPresets(nextPresets);
    localStorage.setItem("fitfusion-avatar-presets", JSON.stringify(nextPresets));

    if (selectedPresetId === deleteTarget.id) {
      setSelectedPresetId(BUILT_IN_PRESET.id);
    }
    setToastMessage(`${deleteTarget.name} was deleted.`);
    setDeleteTarget(null);
  }

  return (
    <div className="avatar-presets-page-content">
      <header className="avatar-presets-header">
        <div>
          <p className="avatar-presets-code">
            {isGuest ? "07G — GUEST AVATAR PRESETS" : "07 — AVATAR PRESETS"}
          </p>
          <p className="avatar-presets-description">
            {isGuest 
              ? "Select a temporary avatar for this session. Changes will not be saved." 
              : "Select, edit, or remove your saved 2D avatars."}
          </p>
        </div>

        <div className="avatar-presets-header-actions">
          {!isGuest && (
            <button
              type="button"
              className="avatar-presets-cart"
              onClick={() => navigate("/shopper/cart")}
              aria-label={`Open cart with ${cartCount} items`}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 7H6" />
                <circle cx="10" cy="20" r="1" />
                <circle cx="18" cy="20" r="1" />
              </svg>
              <span>{cartCount}</span>
            </button>
          )}

          <div className={`avatar-presets-role ${isGuest ? "guest-role" : ""}`}>
            {isGuest ? "GUEST SESSION" : "REGISTERED SHOPPER"}
          </div>
        </div>
      </header>

      <div className="avatar-presets-body">
        <section className="avatar-presets-intro">
          <div>
            <p>YOUR FITTING PROFILE</p>
            <h1>Choose an avatar preset</h1>
            <span>
              {isGuest 
                ? "Use the premade avatar to start your temporary try-on session." 
                : "Use the premade avatar or select one of your saved custom avatars."}
            </span>
          </div>

          {!isGuest && (
            <button
              type="button"
              className="avatar-presets-create"
              onClick={() => navigate("/shopper/fitting-studio")}
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
                <h2>{allPresets.length} avatar{allPresets.length === 1 ? "" : "s"}</h2>
              </div>
              {!isGuest && <span>{customPresets.length} custom</span>}
            </div>

            <div className="avatar-presets-grid">
              {allPresets.map((preset) => (
                <article
                  key={preset.id}
                  className={selectedPresetId === preset.id ? "avatar-preset-card selected" : "avatar-preset-card"}
                  onClick={() => selectPreset(preset)}
                >
                  <button
                    type="button"
                    className="avatar-preset-select-area"
                    onClick={() => selectPreset(preset)}
                  >
                    <AvatarFigure preset={preset} view="front" small />
                    <span className="avatar-preset-type">{preset.builtIn ? "PREMADE" : "CUSTOM"}</span>
                    <strong>{preset.name}</strong>
                    <small>{preset.gender} • {preset.height} cm</small>
                  </button>

                  <div className="avatar-preset-card-actions">
                    <button type="button" onClick={(e) => { e.stopPropagation(); usePreset(preset); }}>
                      Use
                    </button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); editPreset(preset); }}>
                      {preset.builtIn ? "Customize" : "Edit"}
                    </button>
                    {!preset.builtIn && !isGuest && (
                      <button
                        type="button"
                        className="avatar-preset-delete"
                        onClick={(e) => { e.stopPropagation(); requestDelete(preset); }}
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
                <h2>{selectedPreset.name}</h2>
              </div>
              <span>{selectedPreset.builtIn ? "Premade" : "Custom"}</span>
            </div>

            <div className="avatar-preset-view-buttons">
              {["front", "side", "rear"].map((view) => (
                <button
                  key={view}
                  type="button"
                  className={previewView === view ? "active" : ""}
                  onClick={() => setPreviewView(view)}
                >
                  {view}
                </button>
              ))}
            </div>

            <div className="avatar-preset-preview-stage">
              <AvatarFigure preset={selectedPreset} view={previewView} />
              <span className="avatar-preset-view-label">{previewView.toUpperCase()} VIEW</span>
            </div>

            <div className="avatar-preset-measurements">
              <Measurement label="Gender" value={selectedPreset.gender} />
              <Measurement label="Height" value={`${selectedPreset.height} cm`} />
              <Measurement label="Weight" value={`${selectedPreset.weight} kg`} />
              <Measurement label="Shoulder" value={selectedPreset.shoulder} />
              <Measurement label="Waist" value={selectedPreset.waist} />
              <Measurement label="Hip" value={selectedPreset.hip} />
              <Measurement label="Thigh" value={selectedPreset.thigh} />
              {selectedPreset.gender.toLowerCase().includes("female") && (
                <Measurement label="Cup size" value={selectedPreset.cupSize} />
              )}
            </div>

            <div className="avatar-preset-preview-actions">
              <button type="button" className="avatar-preset-use-button" onClick={() => usePreset(selectedPreset)}>
                Use This Avatar
              </button>
              <button type="button" className="avatar-preset-edit-button" onClick={() => editPreset(selectedPreset)}>
                {selectedPreset.builtIn ? "Customize Avatar" : "Edit Preset"}
              </button>
            </div>
          </aside>
        </section>
      </div>

      {deleteTarget && !isGuest && (
        <div className="avatar-preset-modal-backdrop" role="presentation" onMouseDown={() => setDeleteTarget(null)}>
          <section
            className="avatar-preset-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-preset-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="avatar-preset-modal-icon">!</div>
            <p>DELETE AVATAR PRESET</p>
            <h2 id="delete-preset-title">Delete “{deleteTarget.name}”?</h2>
            <span>This avatar preset will be permanently removed.</span>
            <div className="avatar-preset-modal-actions">
              <button type="button" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button type="button" className="confirm-delete" onClick={confirmDelete}>Delete Preset</button>
            </div>
          </section>
        </div>
      )}

      {toastMessage && <div className="avatar-preset-toast" role="status">{toastMessage}</div>}
    </div>
  );
}

function Measurement({ label, value }) {
  return (
    <div className="avatar-preset-measurement">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AvatarFigure({ preset, view, small = false }) {
  const genderClass = preset.gender.toLowerCase().includes("male") ? "male" : "female";
  return (
    <div
      className={[
        "preset-avatar",
        `preset-avatar-${genderClass}`,
        `preset-avatar-${view}`,
        small ? "preset-avatar-small" : "",
      ].filter(Boolean).join(" ")}
      style={{ "--avatar-skin": preset.skinTone || "#d9aa82" }}
      aria-label={`${preset.name} ${view} view`}
    >
      <div className="preset-avatar-head"><span /></div>
      <div className="preset-avatar-neck" />
      <div className="preset-avatar-body"><div className="preset-avatar-shirt" /></div>
      <div className="preset-avatar-arm left" />
      <div className="preset-avatar-arm right" />
      <div className="preset-avatar-leg left" />
      <div className="preset-avatar-leg right" />
    </div>
  );
}

export default AvatarPresetPage;