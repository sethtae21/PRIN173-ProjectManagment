import { useNavigate } from "react-router-dom";
import "./css/GuestPage.css";

const guestFeatures = [
  {
    number: "01",
    title: "Create an Avatar",
    description:
      "Create a temporary Male or Female avatar for your current guest session.",
    buttonLabel: "Open Fitting Studio",
    path: "/guest/fitting-studio",
  },
  {
    number: "02",
    title: "Use a Premade Preset",
    description:
      "Start immediately using the available premade avatar preset.",
    buttonLabel: "View Avatar Presets",
    path: "/guest/avatar-presets",
  },
  {
    number: "03",
    title: "Browse the Catalog",
    description:
      "Explore clothing products and view their complete product information.",
    buttonLabel: "Browse Catalog",
    path: "/guest/catalog",
  },
];

function GuestPage() {
  const navigate = useNavigate();

  return (
    <main className="guest-dashboard-page">
      {/* The page header was removed because GuestLayout
          already provides the shared application layout. */}

      <section className="guest-dashboard-hero">
        <div className="guest-dashboard-hero-content">
          <p className="guest-dashboard-eyebrow">
            TEMPORARY GUEST ACCESS
          </p>

          <h1>Try the FitFusion experience</h1>

          <p className="guest-dashboard-introduction">
            Create a temporary avatar, explore the available
            preset, and browse clothing products without creating
            an account.
          </p>

          <p className="guest-dashboard-notice">
            Your avatar selections and fitting progress are
            temporary and will be removed when your browser session
            ends.
          </p>

          <button
            type="button"
            className="guest-dashboard-primary-button"
            onClick={() =>
              navigate("/guest/fitting-studio")
            }
          >
            Start Fitting Session
          </button>
        </div>

        <div
          className="guest-dashboard-visual"
          aria-hidden="true"
        >
          <div className="guest-dashboard-visual-ring">
            <div className="guest-dashboard-avatar">
              <div className="guest-avatar-head" />
              <div className="guest-avatar-neck" />
              <div className="guest-avatar-body" />
              <div className="guest-avatar-legs">
                <span />
                <span />
              </div>
            </div>
          </div>

          <span className="guest-visual-label">
            TEMPORARY FITTING SESSION
          </span>
        </div>
      </section>

      <section className="guest-dashboard-section">
        <div className="guest-section-heading">
          <div>
            <p className="guest-section-label">
              AVAILABLE TO GUESTS
            </p>

            <h2>Explore the core features</h2>
          </div>

          <p>
            No account is required for these temporary features.
          </p>
        </div>

        <div className="guest-feature-grid">
          {guestFeatures.map((feature) => (
            <article
              className="guest-feature-card"
              key={feature.title}
            >
              <span className="guest-feature-number">
                {feature.number}
              </span>

              <h3>{feature.title}</h3>

              <p>{feature.description}</p>

              <button
                type="button"
                className="guest-feature-button"
                onClick={() => navigate(feature.path)}
              >
                {feature.buttonLabel}
                <span aria-hidden="true">→</span>
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="guest-account-banner">
        <div>
          <p className="guest-section-label">
            KEEP YOUR PROGRESS
          </p>

          <h2>Create an account when you are ready</h2>

          <p>
            Register to permanently save avatar presets and
            outfits, add products to your cart, place mock orders,
            and view your order history.
          </p>
        </div>

        <div className="guest-account-actions">
          <button
            type="button"
            className="guest-dashboard-primary-button"
            onClick={() => navigate("/signup")}
          >
            Create Account
          </button>

          <button
            type="button"
            className="guest-dashboard-secondary-button"
            onClick={() => navigate("/login")}
          >
            Log In
          </button>
        </div>
      </section>
    </main>
  );
}

export default GuestPage;