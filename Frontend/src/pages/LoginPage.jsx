import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import fitFusionLogo from "../assets/fitfusion-logo.svg";
import "./LoginPage.css";

function LoginPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));

    setErrors((previousErrors) => ({
      ...previousErrors,
      [name]: "",
    }));

    setGeneralError("");
  }

  function validateForm() {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email address is required.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())
    ) {
      newErrors.email =
        "Enter a valid email address, such as name@example.com.";
    }

    if (!formData.password) {
      newErrors.password = "Password is required.";
    } else if (formData.password.length < 8) {
      newErrors.password =
        "Password must contain at least 8 characters.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setGeneralError("");

    const isValid = validateForm();

    if (!isValid) {
      return;
    }

    setIsLoading(true);

    // Temporary loading effect for the frontend prototype.
    await new Promise((resolve) => setTimeout(resolve, 600));

    const normalizedEmail = formData.email
      .trim()
      .toLowerCase();

    /*
      TEMPORARY PROTOTYPE LOGIN

      Seller:
      Email: seller@fitfusion.com
      Password: Password1!

      Shopper:
      Email: shopper@fitfusion.com
      Password: Password1!

      This will be replaced with the actual backend login API.
    */

    const correctPassword = "Password1!";

    if (formData.password !== correctPassword) {
      setGeneralError(
        "The email address or password is incorrect. Please try again."
      );

      setIsLoading(false);
      return;
    }

    if (normalizedEmail === "seller@fitfusion.com") {
      sessionStorage.setItem("userRole", "seller");
      sessionStorage.setItem("userEmail", normalizedEmail);

      navigate("/seller/dashboard");
      return;
    }

    if (normalizedEmail === "shopper@fitfusion.com") {
      sessionStorage.setItem("userRole", "shopper");
      sessionStorage.setItem("userEmail", normalizedEmail);

      navigate("/shopper/dashboard");
      return;
    }

    setGeneralError(
      "The email address or password is incorrect. Please try again."
    );

    setIsLoading(false);
  }

  function handleGuestAccess() {
    sessionStorage.setItem("userRole", "guest");
    sessionStorage.removeItem("userEmail");

    navigate("/guest");
  }

  return (
    <main className="login-page">
      <div
        className="login-background login-background-left"
        aria-hidden="true"
      />

      <div
        className="login-background login-background-right"
        aria-hidden="true"
      />

      <header className="login-header">
        <img
          src={fitFusionLogo}
          alt="FitFusion AI"
          className="login-logo"
        />
      </header>

      <section className="login-container">
        <aside className="login-welcome-panel">
          <div className="welcome-message">
            <h1>
              Welcome back to
              <span>your fitting room.</span>
            </h1>
          </div>

          <div className="role-information">
            <p>Shopper account → Shopper Dashboard</p>
            <p>Seller account → Seller Dashboard</p>
            <p>Guest → Continue without an account</p>
          </div>
        </aside>

        <section className="login-form-section">
          <div className="login-form-wrapper">
            <div className="login-heading">
              <h2>Log in</h2>

              <p>
                One form; the assigned role controls the
                redirect.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label htmlFor="email">
                  Email Address
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={
                    errors.email ? "input-error" : ""
                  }
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={
                    errors.email
                      ? "email-error"
                      : undefined
                  }
                />

                {errors.email && (
                  <p
                    id="email-error"
                    className="field-error"
                  >
                    <span aria-hidden="true">!</span>
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  Password
                </label>

                <div
                  className={`password-input-wrapper ${
                    errors.password ? "input-error" : ""
                  }`}
                >
                  <input
                    id="password"
                    name="password"
                    type={
                      showPassword ? "text" : "password"
                    }
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={handleChange}
                    aria-invalid={Boolean(
                      errors.password
                    )}
                    aria-describedby={
                      errors.password
                        ? "password-error"
                        : undefined
                    }
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowPassword(
                        (currentValue) =>
                          !currentValue
                      )
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M3 3 21 21" />
                        <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" />
                        <path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c5.5 0 9 5.1 9 5.1a15.8 15.8 0 0 1-3 3.5" />
                        <path d="M6.6 6.6C4.3 8 3 10.1 3 10.1S6.5 15.2 12 15.2c1 0 2-.2 2.8-.5" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z" />
                        <circle
                          cx="12"
                          cy="12"
                          r="2.5"
                        />
                      </svg>
                    )}
                  </button>
                </div>

                {errors.password && (
                  <p
                    id="password-error"
                    className="field-error"
                  >
                    <span aria-hidden="true">!</span>
                    {errors.password}
                  </p>
                )}
              </div>

              <div className="forgot-password-row">
                <Link to="/forgot-password">
                  Forgot password?
                </Link>
              </div>

              {generalError && (
                <div
                  className="login-error-message"
                  role="alert"
                >
                  <strong>Unable to log in</strong>
                  <span>{generalError}</span>
                </div>
              )}

              <button
                type="submit"
                className="login-button"
                disabled={isLoading}
              >
                {isLoading
                  ? "Logging in..."
                  : "Log In"}
              </button>

              <p className="signup-message">
                No account yet?{" "}
                <Link to="/signup">
                  Create an account
                </Link>
              </p>

              <button
                type="button"
                className="guest-button"
                onClick={handleGuestAccess}
              >
                Continue as Guest
              </button>
            </form>
          </div>
        </section>
      </section>
    </main>
  );
}

export default LoginPage;