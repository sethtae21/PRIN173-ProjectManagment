import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import fitFusionLogo from "../assets/fitfusion-logo.svg";
import { authAPI } from "../services/api"; // Correct path for pages/LoginPage.jsx
import "./css/LoginPage.css";

function LoginPage() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ identifier: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setCredentials((currentCredentials) => ({ ...currentCredentials, [name]: value }));
    setErrorMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");

    if (!credentials.identifier.trim() || !credentials.password) {
      setErrorMessage("Please enter your email or username and password.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Attempt login via backend API
      const response = await authAPI.login(credentials.identifier, credentials.password);

      // Save tokens
      if (response.tokens?.access) {
        localStorage.setItem("access_token", response.tokens.access);
      }
      if (response.tokens?.refresh) {
        localStorage.setItem("refresh_token", response.tokens.refresh);
      }

      // Determine role (backend might return it, or we default)
      const userData = response.user || {};
      const role = userData.role === "seller" ? "seller" : "shopper";
      const storeName = userData.store_name || "My Store";

      const currentUser = {
        username: credentials.identifier,
        email: userData.email || credentials.identifier,
        role: role,
        storeName: storeName,
      };

      localStorage.setItem("fitfusion-current-user", JSON.stringify(currentUser));
      sessionStorage.setItem("userRole", role);
      sessionStorage.setItem("userEmail", currentUser.email);

      if (role === "shopper") {
        sessionStorage.setItem("registeredAccount", JSON.stringify(currentUser));
        navigate("/shopper/dashboard", { replace: true });
      } else {
        navigate("/seller/dashboard", { replace: true });
      }
    } catch (error) {
      console.error("Login failed:", error);
      setErrorMessage("The email, username, or password is incorrect.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleGuestEntry() {
    sessionStorage.setItem("userRole", "guest");
    sessionStorage.removeItem("userEmail");
    localStorage.removeItem("fitfusion-current-user");
    navigate("/guest");
  }

  return (
    <main className="login-page">
      <header className="login-brand-header">
        <Link to="/" className="login-logo-link" aria-label="Return to landing page">
          <img src={fitFusionLogo} alt="FitFusion AI" className="login-logo" />
        </Link>
      </header>

      <section className="login-card">
        <div className="login-welcome-panel">
          <div className="login-welcome-heading">
            <h1>Welcome back to</h1>
            <h2>your fitting room.</h2>
          </div>
          <div className="login-role-list">
            <p>Shopper account <span>→</span> Shopper Dashboard</p>
            <p>Seller account <span>→</span> Seller Dashboard</p>
            <p>Guest <span>→</span> Continue without an account</p>
          </div>
        </div>

        <div className="login-form-panel">
          <div className="login-form-wrapper">
            <div className="login-form-heading">
              <h2>Log in</h2>
              <p>One form; your assigned role controls the destination.</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit} noValidate>
              <div className="login-field">
                <label htmlFor="login-identifier">Email Address or Username</label>
                <input 
                  id="login-identifier" 
                  name="identifier" 
                  type="text" 
                  value={credentials.identifier} 
                  onChange={handleChange} 
                  placeholder="name@example.com" 
                  autoComplete="username" 
                />
              </div>

              <div className="login-field">
                <label htmlFor="login-password">Password</label>
                <div className="login-password-control">
                  <input 
                    id="login-password" 
                    name="password" 
                    type={showPassword ? "text" : "password"} 
                    value={credentials.password} 
                    onChange={handleChange} 
                    placeholder="Enter your password" 
                    autoComplete="current-password" 
                  />
                  <button 
                    type="button" 
                    className="login-password-toggle" 
                    onClick={() => setShowPassword((currentValue) => !currentValue)} 
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="login-forgot-row">
                <Link to="/forgot-password">Forgot password?</Link>
              </div>

              {errorMessage && <div className="login-error-message" role="alert">{errorMessage}</div>}

              <button type="submit" className="login-submit-button" disabled={isSubmitting}>
                {isSubmitting ? "Logging in..." : "Log In"}
              </button>
            </form>

            <p className="login-signup-message">No account yet? <Link to="/signup">Create an account</Link></p>

            <button type="button" className="login-guest-button" onClick={handleGuestEntry}>Continue as Guest</button>

            <div className="login-demo-accounts">
              <p>Demo accounts</p>
              <span>Shopper: shopper@fitfusion.com / Shopper123!</span>
              <span>Seller: seller@fitfusion.com / Seller123!</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;