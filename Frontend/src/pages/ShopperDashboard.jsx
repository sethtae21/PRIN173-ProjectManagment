import { NavLink, useNavigate } from "react-router-dom";
import fitFusionLogo from "../assets/fitfusion-logo.svg";
import "./ShopperDashboard.css";

function ShopperDashboard() {
  const navigate = useNavigate();

  const savedAccount = sessionStorage.getItem(
    "registeredAccount"
  );

  let username = "Shopper";

  if (savedAccount) {
    try {
      const account = JSON.parse(savedAccount);
      username = account.username || "Shopper";
    } catch {
      username = "Shopper";
    }
  }

  function handleLogout() {
    const confirmed = window.confirm(
      "Are you sure you want to log out?"
    );

    if (!confirmed) {
      return;
    }

    sessionStorage.removeItem("userRole");
    sessionStorage.removeItem("userEmail");

    navigate("/login");
  }

  return (
    <main className="shopper-dashboard">
      <aside className="shopper-sidebar">
        <div className="shopper-sidebar-logo">
          <img
            src={fitFusionLogo}
            alt="FitFusion AI"
          />
        </div>

        <nav className="shopper-navigation">
          <NavLink
            to="/shopper/dashboard"
            className={({ isActive }) =>
              isActive
                ? "shopper-nav-link active"
                : "shopper-nav-link"
            }
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/shopper/fitting-studio"
            className={({ isActive }) =>
              isActive
                ? "shopper-nav-link active"
                : "shopper-nav-link"
            }
          >
            Fitting Studio
          </NavLink>

          <NavLink
            to="/shopper/avatar-presets"
            className={({ isActive }) =>
              isActive
                ? "shopper-nav-link active"
                : "shopper-nav-link"
            }
          >
            Avatar Presets
          </NavLink>

          <NavLink
            to="/shopper/catalog"
            className={({ isActive }) =>
              isActive
                ? "shopper-nav-link active"
                : "shopper-nav-link"
            }
          >
            Catalog
          </NavLink>

          <NavLink
            to="/shopper/saved-outfits"
            className={({ isActive }) =>
              isActive
                ? "shopper-nav-link active"
                : "shopper-nav-link"
            }
          >
            Saved Outfits
          </NavLink>

          <NavLink
            to="/shopper/account"
            className={({ isActive }) =>
              isActive
                ? "shopper-nav-link active"
                : "shopper-nav-link"
            }
          >
            Account
          </NavLink>
        </nav>

        <button
          type="button"
          className="shopper-logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>
      </aside>

      <section className="shopper-content">
        <header className="shopper-header">
          <div>
            <p className="shopper-page-code">
              05 — NEW USER DASHBOARD
            </p>

            <p className="shopper-page-description">
              Onboarding and empty states
            </p>
          </div>

          <div className="shopper-header-actions">
            <button
              type="button"
              className="shopper-cart-button"
              onClick={() =>
                navigate("/shopper/cart")
              }
              aria-label="Open cart with 0 items"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 7H6" />
                <circle cx="10" cy="20" r="1" />
                <circle cx="18" cy="20" r="1" />
              </svg>

              <span>0</span>
            </button>

            <div className="shopper-role-badge">
              REGISTERED SHOPPER
            </div>
          </div>
        </header>

        <div className="shopper-dashboard-body">
          <section className="shopper-welcome">
            <p>WELCOME, {username.toUpperCase()}</p>

            <h1>Start your first fitting session</h1>

            <span>
              Choose the premade avatar or create a
              Male/Female custom avatar.
            </span>
          </section>

          <section className="shopper-onboarding-grid">
            <article className="shopper-start-card">
              <p className="shopper-card-label">
                START HERE
              </p>

              <h2>Your fitting profile is empty</h2>

              <p>
                Use the one premade avatar immediately,
                or customize height, weight, skin tone,
                and body proportions.
              </p>

              <div className="shopper-card-actions">
                <button
                  type="button"
                  className="shopper-primary-button"
                  onClick={() =>
                    navigate(
                      "/shopper/avatar-presets"
                    )
                  }
                >
                  Use Premade Preset
                </button>

                <button
                  type="button"
                  className="shopper-secondary-button"
                  onClick={() =>
                    navigate(
                      "/shopper/fitting-studio"
                    )
                  }
                >
                  Create Custom Avatar
                </button>
              </div>
            </article>

            <article className="shopper-guide-card">
              <p>2-MINUTE ONBOARDING</p>

              <ol>
                <li>
                  <span>1</span>
                  Select avatar
                </li>

                <li>
                  <span>2</span>
                  Open Fitting Studio
                </li>

                <li>
                  <span>3</span>
                  Try a garment
                </li>

                <li>
                  <span>4</span>
                  Save or add to cart
                </li>
              </ol>
            </article>
          </section>

          <section className="shopper-account-status">
            <h2>ACCOUNT STATUS</h2>

            <StatusRow
              label="Avatar presets"
              value="0 custom • 1 premade"
              onClick={() =>
                navigate("/shopper/avatar-presets")
              }
            />

            <StatusRow
              label="Saved outfits"
              value="No saved outfits"
              onClick={() =>
                navigate("/shopper/saved-outfits")
              }
            />

            <StatusRow
              label="Orders"
              value="No orders yet"
              onClick={() =>
                navigate("/shopper/account")
              }
            />
          </section>
        </div>
      </section>
    </main>
  );
}

function StatusRow({ label, value, onClick }) {
  return (
    <button
      type="button"
      className="shopper-status-row"
      onClick={onClick}
    >
      <strong>{label}</strong>
      <span>{value}</span>
    </button>
  );
}

export default ShopperDashboard;