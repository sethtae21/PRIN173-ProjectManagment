import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import fitFusionLogo from "../assets/fitfusion-logo.svg";
import { authAPI } from "../services/api"; // Import the API service
import "./css/SignupPage.css";

const initialFormData = {
  username: "",
  email: "",
  mobile: "",
  street: "",
  city: "",
  province: "",
  postalCode: "",
  password: "",
  confirmPassword: "",
};

const steps = [
  { number: 1, title: "Account & Contact", description: "Basic account information" },
  { number: 2, title: "Delivery Address", description: "Shipping information" },
  { number: 3, title: "Account Security", description: "Create a secure password" },
];

function SignupPage() {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [formMessage, setFormMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // New loading state

  const passwordChecks = useMemo(
    () => ({
      minimumLength: formData.password.length >= 8,
      uppercase: /[A-Z]/.test(formData.password),
      lowercase: /[a-z]/.test(formData.password),
      number: /[0-9]/.test(formData.password),
      specialCharacter: /[^A-Za-z0-9]/.test(formData.password),
    }),
    [formData.password]
  );

  const passwordIsValid = Object.values(passwordChecks).every(Boolean);
  const passwordsMatch = formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((currentData) => ({ ...currentData, [name]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [name]: "" }));
    setFormMessage("");
  }

  function validateStepOne() {
    const newErrors = {};
    if (!formData.username.trim()) newErrors.username = "Username is required.";
    else if (formData.username.trim().length < 3) newErrors.username = "Username must contain at least 3 characters.";

    if (!formData.email.trim()) newErrors.email = "Email address is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Enter a valid email address.";

    if (!formData.mobile.trim()) newErrors.mobile = "Mobile number is required.";
    else if (!/^(09\d{9}|\+639\d{9})$/.test(formData.mobile.replace(/\s/g, ""))) newErrors.mobile = "Use 09XXXXXXXXX or +639XXXXXXXXX.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function validateStepTwo() {
    const newErrors = {};
    if (!formData.street.trim()) newErrors.street = "Street and house information are required.";
    if (!formData.city.trim()) newErrors.city = "Barangay or city is required.";
    if (!formData.province.trim()) newErrors.province = "Province is required.";
    if (!formData.postalCode.trim()) newErrors.postalCode = "Postal code is required.";
    else if (!/^\d{4}$/.test(formData.postalCode)) newErrors.postalCode = "Postal code must contain exactly 4 digits.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function validateStepThree() {
    const newErrors = {};
    if (!formData.password) newErrors.password = "Password is required.";
    else if (!passwordIsValid) newErrors.password = "Complete all password requirements.";

    if (!formData.confirmPassword) newErrors.confirmPassword = "Please confirm your password.";
    else if (!passwordsMatch) newErrors.confirmPassword = "Passwords do not match.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleNext() {
    let stepIsValid = false;
    if (currentStep === 1) stepIsValid = validateStepOne();
    if (currentStep === 2) stepIsValid = validateStepTwo();

    if (!stepIsValid) return;

    setErrors({});
    setFormMessage("");
    setCurrentStep((step) => step + 1);
  }

  function handleBack() {
    setErrors({});
    setFormMessage("");
    setCurrentStep((step) => Math.max(1, step - 1));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validateStepThree()) return;

    setIsSubmitting(true);
    setFormMessage("");
    setErrors({});

    try {
      // Map frontend form to backend expected payload
      const payload = {
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: "user", // FIX: Backend expects "user" instead of "shopper"
        phone: formData.mobile.trim(),
        // Include address fields
        street: formData.street.trim(),
        city: formData.city.trim(),
        province: formData.province.trim(),
        postal_code: formData.postalCode.trim(),
      };

      const response = await authAPI.register(payload);

      // Save token and user info on success
      if (response.tokens?.access) {
        localStorage.setItem("access_token", response.tokens.access);
      }

      const currentUser = {
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        role: "shopper", // Keep as "shopper" for frontend routing logic
      };

      localStorage.setItem("fitfusion-current-user", JSON.stringify(currentUser));
      sessionStorage.setItem("userRole", "shopper");
      sessionStorage.setItem("userEmail", currentUser.email);
      sessionStorage.setItem("registeredAccount", JSON.stringify(currentUser));

      navigate("/shopper/dashboard", { replace: true });
    } catch (error) {
      console.error("Registration failed:", error);
      let generalError = "Registration failed. Please check your details.";
      
      // Try to parse specific field errors from Django backend
      try {
        const errorData = JSON.parse(error.message);
        if (errorData.username) generalError = `Username: ${errorData.username[0]}`;
        else if (errorData.email) generalError = `Email: ${errorData.email[0]}`;
        else if (errorData.role) generalError = `Role: ${errorData.role[0]}`;
        else if (errorData.detail) generalError = errorData.detail;
        else if (errorData.non_field_errors) generalError = errorData.non_field_errors[0];
      } catch (e) {
        // Not JSON, keep generalError as is
      }

      setFormMessage(generalError);
      setCurrentStep(1); // Go back to step 1 to show the error
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="signup-page">
      <div className="signup-background signup-background-left" />
      <div className="signup-background signup-background-right" />

      <header className="signup-topbar">
        <Link to="/" className="signup-logo-link" aria-label="Return to FitFusion home">
          <img src={fitFusionLogo} alt="FitFusion AI" />
        </Link>
        <p>Already registered? <Link to="/login">Log in</Link></p>
      </header>

      <section className="signup-container">
        <aside className="signup-information-panel">
          <div className="signup-introduction">
            <p>SHOPPER REGISTRATION</p>
            <h1>Create your <span> fitting profile.</span></h1>
            <p className="signup-introduction-text">
              Create your account to customize an avatar, try clothing, save outfits, manage your cart, and view orders.
            </p>
          </div>

          <div className="signup-sidebar-steps">
            {steps.map((step) => (
              <div
                className={`signup-sidebar-step ${currentStep === step.number ? "active" : ""} ${currentStep > step.number ? "completed" : ""}`}
                key={step.number}
              >
                <span className="signup-sidebar-number">{currentStep > step.number ? "✓" : step.number}</span>
                <div>
                  <strong>{step.title}</strong>
                  <small>{step.description}</small>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="signup-form-panel">
          <div className="signup-progress-heading">
            <span>Step {currentStep} of {steps.length}</span>
            <div className="signup-progress-track">
              <div className="signup-progress-value" style={{ width: `${(currentStep / steps.length) * 100}%` }} />
            </div>
          </div>

          <form className="signup-form" onSubmit={handleSubmit} noValidate>
            {currentStep === 1 && <SignupStepOne formData={formData} errors={errors} handleChange={handleChange} />}
            {currentStep === 2 && <SignupStepTwo formData={formData} errors={errors} handleChange={handleChange} />}
            {currentStep === 3 && (
              <SignupStepThree
                formData={formData}
                errors={errors}
                handleChange={handleChange}
                passwordChecks={passwordChecks}
                passwordsMatch={passwordsMatch}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                showConfirmPassword={showConfirmPassword}
                setShowConfirmPassword={setShowConfirmPassword}
              />
            )}

            {formMessage && (
              <div className="signup-form-message" role="alert">
                {formMessage}
              </div>
            )}

            <div className="signup-form-actions">
              {currentStep > 1 && (
                <button type="button" className="signup-back-button" onClick={handleBack} disabled={isSubmitting}>
                  Back
                </button>
              )}

              {currentStep < 3 ? (
                <button type="button" className="signup-next-button" onClick={handleNext}>
                  Save and Continue
                </button>
              ) : (
                <button
                  type="submit"
                  className="signup-next-button"
                  disabled={!passwordIsValid || !passwordsMatch || isSubmitting}
                >
                  {isSubmitting ? "Creating Account..." : "Create Shopper Account"}
                </button>
              )}
            </div>
          </form>
        </section>
      </section>
    </main>
  );
}

// --- Helper Components (Unchanged) ---
function SignupStepOne({ formData, errors, handleChange }) {
  return (
    <>
      <div className="signup-form-heading">
        <p>STEP 1</p>
        <h2>Account & Contact</h2>
        <span>Enter your basic account and contact information.</span>
      </div>
      <div className="signup-fields-grid">
        <SignupInput label="Username" name="username" value={formData.username} onChange={handleChange} placeholder="Choose a username" autoComplete="username" error={errors.username} required />
        <SignupInput label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="name@example.com" autoComplete="email" error={errors.email} required />
        <SignupInput label="Mobile Number" name="mobile" type="tel" value={formData.mobile} onChange={handleChange} placeholder="09XXXXXXXXX" autoComplete="tel" error={errors.mobile} required fullWidth />
      </div>
    </>
  );
}

function SignupStepTwo({ formData, errors, handleChange }) {
  return (
    <>
      <div className="signup-form-heading">
        <p>STEP 2</p>
        <h2>Delivery Address</h2>
        <span>Keep every location value in its proper field.</span>
      </div>
      <div className="signup-fields-grid">
        <SignupInput label="House Number and Street" name="street" value={formData.street} onChange={handleChange} placeholder="123 Sample Street" autoComplete="street-address" error={errors.street} required fullWidth />
        <SignupInput label="Barangay / City" name="city" value={formData.city} onChange={handleChange} placeholder="Barangay and city" autoComplete="address-level2" error={errors.city} required />
        <SignupInput label="Province" name="province" value={formData.province} onChange={handleChange} placeholder="Province" autoComplete="address-level1" error={errors.province} required />
        <SignupInput label="Postal Code" name="postalCode" value={formData.postalCode} onChange={handleChange} placeholder="0000" inputMode="numeric" maxLength={4} autoComplete="postal-code" error={errors.postalCode} required />
      </div>
    </>
  );
}

function SignupStepThree({ formData, errors, handleChange, passwordChecks, passwordsMatch, showPassword, setShowPassword, showConfirmPassword, setShowConfirmPassword }) {
  return (
    <>
      <div className="signup-form-heading">
        <p>STEP 3</p>
        <h2>Account Security</h2>
        <span>Create a password that meets all requirements.</span>
      </div>
      <div className="signup-security-fields">
        <label className="signup-field" htmlFor="signup-password">
          <span className="signup-field-label">Password<strong aria-hidden="true">*</strong></span>
          <div className="signup-password-wrapper">
            <input id="signup-password" name="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={handleChange} placeholder="Enter your password" autoComplete="new-password" className={errors.password ? "signup-input-error" : ""} required />
            <button type="button" className="signup-password-toggle" onClick={() => setShowPassword((currentValue) => !currentValue)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {errors.password && <small className="signup-field-error">{errors.password}</small>}
        </label>

        <div className="signup-password-requirements">
          <Requirement complete={passwordChecks.minimumLength}>At least 8 characters</Requirement>
          <Requirement complete={passwordChecks.uppercase}>One uppercase letter</Requirement>
          <Requirement complete={passwordChecks.lowercase}>One lowercase letter</Requirement>
          <Requirement complete={passwordChecks.number}>One number</Requirement>
          <Requirement complete={passwordChecks.specialCharacter}>One special character</Requirement>
        </div>

        <label className="signup-field" htmlFor="signup-confirm-password">
          <span className="signup-field-label">Confirm Password<strong aria-hidden="true">*</strong></span>
          <div className="signup-password-wrapper">
            <input id="signup-confirm-password" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} value={formData.confirmPassword} onChange={handleChange} placeholder="Re-enter your password" autoComplete="new-password" className={errors.confirmPassword ? "signup-input-error" : ""} required />
            <button type="button" className="signup-password-toggle" onClick={() => setShowConfirmPassword((currentValue) => !currentValue)} aria-label={showConfirmPassword ? "Hide confirmed password" : "Show confirmed password"} aria-pressed={showConfirmPassword}>
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
          </div>
          {errors.confirmPassword && <small className="signup-field-error">{errors.confirmPassword}</small>}
          {!errors.confirmPassword && passwordsMatch && <small className="signup-field-success">Passwords match.</small>}
        </label>
      </div>
    </>
  );
}

function SignupInput({ label, name, type = "text", value, onChange, placeholder, error, required = false, fullWidth = false, ...inputProperties }) {
  return (
    <label className={`signup-field ${fullWidth ? "signup-field-full-width" : ""}`} htmlFor={`signup-${name}`}>
      <span className="signup-field-label">{label}{required && <strong aria-hidden="true">*</strong>}</span>
      <input id={`signup-${name}`} name={name} type={type} value={value} onChange={onChange} placeholder={placeholder} className={error ? "signup-input-error" : ""} required={required} {...inputProperties} />
      {error && <small className="signup-field-error">{error}</small>}
    </label>
  );
}

function Requirement({ complete, children }) {
  return (
    <p className={complete ? "completed" : ""}>
      <span aria-hidden="true">{complete ? "✓" : "○"}</span>
      {children}
    </p>
  );
}

export default SignupPage;