import { useNavigate } from "react-router-dom";
import fitFusionLogo from "../../assets/fitfusion-logo.svg";
import "../css/LandingPage.css";

function LandingPage() {
  const navigate = useNavigate();

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
          <img
            src={fitFusionLogo}
            alt="FitFusion AI"
          />
        </button>

        <nav
          className="landing-navigation"
          aria-label="Public navigation"
        >
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
          <p className="landing-eyebrow">
            VIRTUAL FASHION FITTING
          </p>

          <h1>
            Find your style.
            <span>See how it fits.</span>
          </h1>

          <p className="landing-description">
            Build your personal 2D avatar, explore clothing
            from trusted sellers, and preview recommended
            outfits from the front, side, and rear views.
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
            <button
              type="button"
              onClick={() => navigate("/login")}
            >
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

            <span className="landing-match-score">
              Match score: 6/7
            </span>
          </div>

          <div className="landing-view-grid">
            <article className="landing-view-card">
              <div className="landing-avatar">
                <div className="landing-avatar-head" />
                <div className="landing-avatar-body" />
                <span>FRONT</span>
              </div>

              <p>Front View</p>
            </article>

            <article className="landing-view-card">
              <div className="landing-avatar landing-avatar-side">
                <div className="landing-avatar-head" />
                <div className="landing-avatar-body" />
                <span>SIDE</span>
              </div>

              <p>Side View</p>
            </article>

            <article className="landing-view-card">
              <div className="landing-avatar">
                <div className="landing-avatar-head" />
                <div className="landing-avatar-body" />
                <span>REAR</span>
              </div>

              <p>Rear View</p>
            </article>
          </div>

          <div className="landing-preview-statistics">
            <div>
              <strong>1</strong>
              <span>Premade avatar</span>
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
            Use the premade avatar or customize your height,
            weight, body type, and skin tone.
          </p>
        </article>

        <article>
          <span>02</span>
          <h2>Explore the catalog</h2>

          <p>
            Browse clothing products, product details,
            ratings, and participating seller stores.
          </p>
        </article>

        <article>
          <span>03</span>
          <h2>Try recommended clothing</h2>

          <p>
            Preview recommended garments from the front,
            side, and rear before adding them to your cart.
          </p>
        </article>
      </section>
    </main>
  );
}

export default LandingPage;