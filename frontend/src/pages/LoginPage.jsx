import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import fitFusionLogo from "../assets/fitfusion-logo.svg";
import { authAPI } from "../services/api";
import { setSession } from "../services/session";
import "./css/LoginPage.css";

function LoginPage() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ email: "", password: "" });
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

    if (!credentials.email.trim() || !credentials.password) {
      setErrorMessage("Please enter your email address and password.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Attempt login via backend API
      const response = await authAPI.login(credentials.email.trim().toLowerCase(), credentials.password);

      // Determine role and extract user data
      const userData = response.user || {};
      const role = userData.role === "seller" ? "seller" : "shopper";
      
      const currentUser = {
        id: userData.id,
        full_name: userData.full_name || credentials.email,
        email: userData.email || credentials.email,
        role: role,
        store_name: userData.store_name || "",
      };

      // Persist session atomically via session.js (replaces all manual localStorage writes)
      setSession({
        access: response.tokens?.access || response.access,
        refresh: response.tokens?.refresh || response.refresh,
        user: currentUser,
      });

      if (role === "shopper") {
        navigate("/shopper/dashboard", { replace: true });
      } else {
        navigate("/seller/dashboard", { replace: true });
      }
    } catch (error) {
      console.error("Login failed:", error);
      let errorMsg = "The email address or password is incorrect.";
      try {
        const errorData = JSON.parse(error.message);
        if (errorData.detail) {
          errorMsg = errorData.detail;
        } else {
          const firstKey = Object.keys(errorData)[0];
          if (firstKey) {
            errorMsg = Array.isArray(errorData[firstKey]) ? errorData[firstKey][0] : errorData[firstKey];
          }
        }
      } catch {}
      setErrorMessage(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleGuestEntry() {
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
                <label htmlFor="login-email">Email Address</label>
                <input 
                  id="login-email" 
                  name="email" 
                  type="email" 
                  value={credentials.email} 
                  onChange={handleChange} 
                  placeholder="name@example.com" 
                  autoComplete="email" 
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