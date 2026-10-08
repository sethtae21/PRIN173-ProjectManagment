import {
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";

import fitFusionLogo from "../assets/fitfusion-logo.svg";
import "./GuestLayout.css";

const navigationItems = [
  {
    label: "Guest Dashboard",
    to: "/guest",
    end: true,
  },
  {
    label: "Fitting Studio",
    to: "/guest/fitting-studio",
  },
  {
    label: "Avatar Presets",
    to: "/guest/avatar-presets",
  },
  {
    label: "Catalog",
    to: "/guest/catalog",
  },
];

function GuestLayout() {
  const navigate = useNavigate();

  return (
    <div className="guest-shell">
      <aside className="guest-sidebar">
        <NavLink
          to="/guest"
          className="guest-sidebar-logo"
          aria-label="Go to Guest Dashboard"
        >
          <img
            src={fitFusionLogo}
            alt="FitFusion AI"
          />
        </NavLink>

        <nav
          className="guest-navigation"
          aria-label="Guest navigation"
        >
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive
                  ? "guest-navigation-link active"
                  : "guest-navigation-link"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="guest-authentication-actions">
          <button
            type="button"
            className="guest-login-sidebar-button"
            onClick={() => navigate("/login")}
          >
            Log In
          </button>

          <button
            type="button"
            className="guest-signup-sidebar-button"
            onClick={() => navigate("/signup")}
          >
            Create Account
          </button>
        </div>
      </aside>

      <section className="guest-layout-content">
        <Outlet />
      </section>
    </div>
  );
}

export default GuestLayout;