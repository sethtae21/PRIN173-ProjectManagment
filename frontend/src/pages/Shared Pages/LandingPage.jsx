
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import fitFusionLogo from "../../assets/fitfusion-logo.svg";
import "../css/LandingPage.css";

// Images inside the public folder are accessed from the URL root.
// Do not include "public" in these paths.

const AVATAR_ASSETS = {
  Female: {
    front: "/Avatars/Female_Standard/Female_Standard_front.png",
    side: "/Avatars/Female_Standard/Female_Standard_side.png",
    rear: "/Avatars/Female_Standard/Female_Standard_rear.png",
  },
  Male: {
    front: "/Avatars/Male_Standard/Male_Standard_front.png",
    side: "/Avatars/Male_Standard/Male_Standard_side.png",
    rear: "/Avatars/Male_Standard/Male_Standard_rear.png",
  },
};


const AVATAR_VIEWS = [
  { key: "front", label: "Front", description: "Front View" },
  { key: "side", label: "Side", description: "Side View" },
  { key: "rear", label: "Rear", description: "Rear View" },
];

function LandingPage() {
  const navigate = useNavigate();
  const [selectedGender, setSelectedGender] = useState("Female");

  const currentAvatar = AVATAR_ASSETS[selectedGender];

  return (
    <main className="landing-page">
      <div className="landing-background landing-background-left" />
      <div className="landing-background landing-background-right" />

      <header className="landing-header">
        <button
          type="button"
          className="landing-logo-button"
          onClick={() => navigate("/")}
          aria-label="Go to FitFusion AI homepage"
        >
          <img src={fitFusionLogo} alt="FitFusion AI" />
        </button>

        <nav className="landing-navigation" aria-label="Public navigation">
          <button
            type="button"
            className="landing-login-button"
            onClick={() => navigate("/login")}
          >
            Log In
          </button>

          <button
            type="button"
            className="landing-create-button"
            onClick={() => navigate("/signup")}
          >
            Create Account
          </button>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-content">
          <p className="landing-eyebrow">VIRTUAL FASHION FITTING</p>

          <h1>
            Find your style.
            <span>See how it fits.</span>
          </h1>

          <p className="landing-description">
            Build your personal 2D avatar, explore clothing from trusted
            sellers, and preview recommended outfits from the front, side,
            and rear views.
          </p>

          <div className="landing-actions">
            <button
              type="button"
              className="landing-primary-button"
              onClick={() => navigate("/signup")}
            >
              Create an Account
            </button>

            <button
              type="button"
              className="landing-secondary-button"
              onClick={() => navigate("/guest")}
            >
              Continue as Guest
            </button>
          </div>

          <p className="landing-existing-account">
            Already registered?{" "}
            <button type="button" onClick={() => navigate("/login")}>
              Log in
            </button>
          </p>
        </div>

        <section className="landing-fitting-preview">
          <div className="landing-preview-header">
            <div>
              <p>FIT PREVIEW</p>
              <h2>Your virtual fitting room</h2>
            </div>

            <span className="landing-match-score">2D AVATAR</span>
          </div>

          <div className="landing-avatar-selector">
            <div className="landing-avatar-selector-text">
              <p>PREMADE AVATAR</p>
              <span>
                Explore the 2D avatar from three viewing angles.
              </span>
            </div>

            <div
              className="landing-gender-switch"
              role="group"
              aria-label="Choose avatar gender"
            >
              {["Female", "Male"].map((gender) => (
                <button
                  key={gender}
                  type="button"
                  className={`landing-gender-button ${
                    selectedGender === gender ? "active" : ""
                  }`}
                  aria-pressed={selectedGender === gender}
                  onClick={() => setSelectedGender(gender)}
                >
                  {gender}
                </button>
              ))}
            </div>
          </div>

          <div className="landing-view-grid">
            {AVATAR_VIEWS.map((view) => (
              <article className="landing-view-card" key={view.key}>
                <div className="landing-avatar">
                  <img
                    className="landing-avatar-image"
                    src={currentAvatar[view.key]}
                    alt={`${selectedGender} standard avatar - ${view.description}`}
                  />

                  <span>{view.label.toUpperCase()}</span>
                </div>

                <p>{view.description}</p>
              </article>
            ))}
          </div>

          <div className="landing-preview-statistics">
            <div>
              <strong>1</strong>
              <span>Standard avatar per gender</span>
            </div>

            <div>
              <strong>3</strong>
              <span>Viewing angles</span>
            </div>

            <div>
              <strong>2D</strong>
              <span>Layered fitting</span>
            </div>
          </div>
        </section>
      </section>

      <section className="landing-features">
        <article>
          <span>01</span>
          <h2>Create your avatar</h2>
          <p>
            Start with a standard avatar and customize your height,
            weight, body type, and skin tone.
          </p>
        </article>

        <article>
          <span>02</span>
          <h2>Explore the catalog</h2>
          <p>
            Browse clothing products, product details, ratings,
            and participating seller stores.
          </p>
        </article>

        <article>
          <span>03</span>
          <h2>Try recommended clothing</h2>
          <p>
            Preview recommended garments from the front, side, and rear
            before adding them to your cart.
          </p>
        </article>
      </section>
    </main>
  );
}

export default LandingPage;
