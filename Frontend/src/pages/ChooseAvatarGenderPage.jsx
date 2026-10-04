import { useNavigate } from "react-router-dom";
import "./css/ChooseAvatarGenderPage.css";

function ChooseAvatarGenderPage({ isGuest = false }) {
  const navigate = useNavigate();
  
  // Dynamically set the base path based on the user's role
  const basePath = isGuest ? "/guest" : "/shopper";

  function handleCustomize(gender) {
    navigate(`${basePath}/fitting-studio/customize?gender=${gender}`);
  }

  function handleUsePremade() {
    navigate(`${basePath}/avatar-presets`);
  }

  return (
    <div className="choose-avatar-gender-page">
      
      {/* Top Bar */}
      <div className="page-top-bar">
        <div className="page-title-group">
          <h1>{isGuest ? "09G — GUEST AVATAR GENDER" : "Choose Avatar Gender"}</h1>
          <p>
            Choose Male or Female for this {isGuest ? "temporary " : ""}session.
          </p>
        </div>

        {/* Only show these badges for Guests */}
        {isGuest && (
          <div className="top-badges">
            <div className="badge badge-locked">
              <span>🛒</span> LOCKED
            </div>
            <div className="badge badge-guest">
              GUEST SESSION
            </div>
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="content-grid">
        
        {/* Left: Avatar Selection Cards */}
        <div className="avatar-selection-area">
          <div className="section-label">AVATAR CREATION</div>
          <h2 className="section-title">Choose avatar gender</h2>
          <p className="section-subtitle">
            Gender determines which body-proportion options are available.
          </p>

          <div className="gender-cards-container">
            {/* Male Card */}
            <div className="gender-card">
              <div className="avatar-placeholder male">
                <div className="avatar-head"></div>
                <div className="avatar-body"></div>
                <div className="avatar-legs">
                  <div className="avatar-leg"></div>
                  <div className="avatar-leg"></div>
                </div>
              </div>
              <h3>Male Avatar</h3>
              <p>No cup-size control</p>
              <button 
                className="btn-customize" 
                onClick={() => handleCustomize("male")}
              >
                Customize Male
              </button>
            </div>

            {/* Female Card */}
            <div className="gender-card">
              <div className="avatar-placeholder female">
                <div className="avatar-head"></div>
                <div className="avatar-body"></div>
                <div className="avatar-legs">
                  <div className="avatar-leg"></div>
                  <div className="avatar-leg"></div>
                </div>
              </div>
              <h3>Female Avatar</h3>
              <p>Cup size available</p>
              <button 
                className="btn-customize" 
                onClick={() => handleCustomize("female")}
              >
                Customize Female
              </button>
            </div>
          </div>
        </div>

        {/* Right: Guest Info Panel (Only visible to Guests) */}
        {isGuest && (
          <aside className="guest-info-panel">
            <h4>GUEST SESSION</h4>
            <p>Avatar changes are temporary.</p>
          </aside>
        )}
      </div>

      {/* Bottom Action: Premade Preset */}
      <div className="bottom-action-area">
        <button className="btn-premade-preset" onClick={handleUsePremade}>
          <span className="title">Use the Premade Preset</span>
          <span className="subtitle">
            No custom avatar is required<br />to browse the preset.
          </span>
        </button>
      </div>

    </div>
  );
}

export default ChooseAvatarGenderPage;