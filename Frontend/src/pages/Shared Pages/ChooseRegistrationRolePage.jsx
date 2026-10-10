
import { useNavigate } from "react-router-dom";
import fitFusionLogo from "../../assets/fitfusion-logo.svg";
import "../css/ChooseRegistrationRolePage.css";

function ChooseRegistrationRolePage() {
  const navigate = useNavigate();

  return (
    <main className="role-page">
      <div className="role-background role-background-left" />
      <div className="role-background role-background-right" />

      {/* FITFUSION LOGO */}
      <button
        type="button"
        className="role-logo-button"
        onClick={() => navigate("/")}
        aria-label="Return to homepage"
      >
        <img
          src={fitFusionLogo}
          alt="FitFusion AI"
        />
      </button>

      <section className="role-content">
        {/* PAGE HEADING */}
        <header className="role-heading">
          <p>CREATE YOUR ACCOUNT</p>

          <h1>Choose your role</h1>

          <span>
            The selected role determines your permissions
            and destination after login.
          </span>
        </header>

        {/* ROLE SELECTION */}
        <div className="role-card-grid">

          {/* SHOPPER ROLE */}
          <article className="role-card">
            <div className="role-icon role-icon-shopper">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle cx="12" cy="8" r="4" />

                <path d="M4.5 21c.5-4.5 3-7 7.5-7s7 2.5 7.5 7" />
              </svg>
            </div>

            <h2>SHOPPER</h2>

            <p>
              Avatar customization, virtual fitting,
              saved outfits, cart, and orders
            </p>

            <button
              type="button"
              className="role-primary-button"
              onClick={() => navigate("/signup/shopper")}
            >
              Select Shopper
            </button>
          </article>

          {/* SELLER ROLE */}
          <article className="role-card">
            <div className="role-icon role-icon-seller">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M4 10h16" />
                <path d="M5 10v10h14V10" />
                <path d="M3 10l2-6h14l2 6" />
                <path d="M9 20v-6h6v6" />
              </svg>
            </div>

            <h2>SELLER</h2>

            <p>
              Catalog upload, product listings,
              validation, and store management
            </p>

            <button
              type="button"
              className="role-secondary-button"
              onClick={() => navigate("/signup/seller")}
            >
              Select Seller
            </button>
          </article>
        </div>

        {/* SELLER REGISTRATION NOTE */}
        <p className="role-seller-note">
          Selecting Seller makes the Store Name field
          required during registration.
        </p>

        {/* FOOTER LINKS */}
        <div className="role-footer-links">
          <button
            type="button"
            onClick={() => navigate("/login")}
          >
            Already registered? Log in
          </button>

          <span>•</span>

          <button
            type="button"
            onClick={() => navigate("/guest")}
          >
            Continue as Guest
          </button>
        </div>
      </section>
    </main>
  );
}

export default ChooseRegistrationRolePage;
