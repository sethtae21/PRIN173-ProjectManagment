
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import fitFusionLogo from "../assets/fitfusion-logo.svg";
import "./css/SignupPage.css";

const provinces = [
  "Abra", "Agusan del Norte", "Agusan del Sur", "Aklan",
  "Albay", "Antique", "Apayao", "Aurora", "Basilan",
  "Bataan", "Batanes", "Batangas", "Benguet", "Biliran",
  "Bohol", "Bukidnon", "Bulacan", "Cagayan",
  "Camarines Norte", "Camarines Sur", "Camiguin",
  "Capiz", "Catanduanes", "Cavite", "Cebu", "Cotabato",
  "Davao de Oro", "Davao del Norte", "Davao del Sur",
  "Davao Occidental", "Davao Oriental", "Dinagat Islands",
  "Eastern Samar", "Guimaras", "Ifugao",
  "Ilocos Norte", "Ilocos Sur", "Iloilo", "Isabela",
  "Kalinga", "La Union", "Laguna", "Lanao del Norte",
  "Lanao del Sur", "Leyte", "Maguindanao del Norte",
  "Maguindanao del Sur", "Marinduque", "Masbate",
  "Metro Manila", "Misamis Occidental",
  "Misamis Oriental", "Mountain Province",
  "Negros Occidental", "Negros Oriental",
  "Northern Samar", "Nueva Ecija", "Nueva Vizcaya",
  "Occidental Mindoro", "Oriental Mindoro", "Palawan",
  "Pampanga", "Pangasinan", "Quezon", "Quirino",
  "Rizal", "Romblon", "Samar", "Sarangani",
  "Siquijor", "Sorsogon", "South Cotabato",
  "Southern Leyte", "Sultan Kudarat", "Sulu",
  "Surigao del Norte", "Surigao del Sur", "Tarlac",
  "Tawi-Tawi", "Zambales", "Zamboanga del Norte",
  "Zamboanga del Sur", "Zamboanga Sibugay"
];

const initialForm = {
  fullName: "",
  username: "",
  storeName: "",
  email: "",
  mobile: "",
  street: "",
  barangay: "",
  city: "",
  province: "",
  postalCode: "",
  password: "",
  confirmPassword: ""
};

function properCase(value) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(
      /(^|[\s'-])([a-zà-öø-ÿ])/gu,
      (_, separator, letter) =>
        separator + letter.toUpperCase()
    );
}

const requirements = [
  ["length", "At least 8 characters"],
  ["uppercase", "At least one uppercase letter"],
  ["lowercase", "At least one lowercase letter"],
  ["number", "At least one number"],
  ["special", "At least one special character"]
];

function EyeIcon({ visible }) {
  return visible ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" />
      <path d="M9.8 4.3A10.8 10.8 0 0 1 12 4c5.5 0 9 5 9 5a16.4 16.4 0 0 1-3 3.5" />
      <path d="M6.1 6.1C4.2 7.3 3 9 3 9s3.5 5 9 5a10.8 10.8 0 0 0 3.1-.4" />
    </svg>
  );
}

function FormField({
  label,
  name,
  value,
  error,
  onChange,
  onBlur,
  wide = false,
  type = "text",
  ...props
}) {
  return (
    <label className={`ff-register-field ${wide ? "wide" : ""}`}>
      <span>{label} *</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={error ? "input-error" : ""}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error && (
        <small className="ff-register-error">{error}</small>
      )}
    </label>
  );
}

export default function SignupPage({ role = "shopper" }) {
  const navigate = useNavigate();
  const isSeller = role === "seller";
  const accountType = isSeller ? "Seller" : "Shopper";

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const stepInformation = {
    1: {
      eyebrow: "STEP 1 OF 3",
      title: `Create your ${role} identity.`,
      description: isSeller
        ? "Enter your account, contact information, and required Store Name."
        : "Enter your personal account and contact information.",
      secondary: isSeller
        ? "Your Store Name will be assigned to accepted product listings."
        : "Your full name will be formatted automatically using proper capitalization.",
      label: `${accountType.toUpperCase()} ACCOUNT`,
      note: "A middle name may be included but is optional."
    },
    2: {
      eyebrow: "STEP 2 OF 3",
      title: isSeller
        ? "Add your business address."
        : "Add your delivery address.",
      description: isSeller
        ? "Provide the address associated with your seller account."
        : "Provide the address where your future orders should be delivered.",
      secondary: "Make sure your address is complete and accurate.",
      label: isSeller ? "SELLER ADDRESS" : "DELIVERY INFORMATION",
      note: isSeller
        ? "This address can be updated later from your Store Profile."
        : "Your address can be updated later from Account Management."
    },
    3: {
      eyebrow: "STEP 3 OF 3",
      title: isSeller
        ? "Secure your seller account."
        : "Secure your account.",
      description: "Create a strong password that follows all security requirements.",
      secondary: "Your password and confirmation must match before registration.",
      label: "ACCOUNT SECURITY",
      note: "All password requirements must turn green."
    }
  };

  const information = stepInformation[step];

  const passwordRules = useMemo(() => ({
    length: form.password.length >= 8,
    uppercase: /[A-Z]/.test(form.password),
    lowercase: /[a-z]/.test(form.password),
    number: /\d/.test(form.password),
    special: /[^A-Za-z0-9]/.test(form.password)
  }), [form.password]);

  const passwordIsValid =
    Object.values(passwordRules).every(Boolean);

  const passwordsMatch =
    form.confirmPassword.length > 0 &&
    form.password === form.confirmPassword;

  function updateField(event) {
    const { name } = event.target;
    let { value } = event.target;

    if (name === "mobile") {
      value = value.replace(/\D/g, "").slice(0, 11);
    }

    if (name === "postalCode") {
      value = value.replace(/\D/g, "").slice(0, 4);
    }

    setForm(current => ({ ...current, [name]: value }));
    setErrors(current => ({ ...current, [name]: "" }));
    setSubmitError("");
  }

  function formatFullName() {
    setForm(current => ({
      ...current,
      fullName: properCase(current.fullName)
    }));
  }

  function getStepErrors(currentStep) {
    const nextErrors = {};

    if (currentStep === 1) {
      const fullName = properCase(form.fullName);

      if (!fullName) {
        nextErrors.fullName = "Full name is required.";
      } else if (!/^[A-Za-zÀ-ÖØ-öø-ÿÑñ.' -]+$/u.test(fullName)) {
        nextErrors.fullName =
          "Full name may contain letters, spaces, apostrophes, periods, and hyphens only.";
      } else if (fullName.split(" ").filter(Boolean).length < 2) {
        nextErrors.fullName =
          "Please enter at least your first name and surname.";
      }

      if (!form.username.trim()) {
        nextErrors.username = "Username is required.";
      } else if (form.username.trim().length < 3) {
        nextErrors.username =
          "Username must contain at least 3 characters.";
      }

      if (isSeller) {
        if (!form.storeName.trim()) {
          nextErrors.storeName = "Store Name is required.";
        } else if (form.storeName.trim().length < 2) {
          nextErrors.storeName =
            "Store Name must contain at least 2 characters.";
        }
      }

      if (!form.email.trim()) {
        nextErrors.email = "Email address is required.";
      } else if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
      ) {
        nextErrors.email = "Please enter a valid email address.";
      }

      if (!form.mobile) {
        nextErrors.mobile = "Mobile number is required.";
      } else if (!/^\d{11}$/.test(form.mobile)) {
        nextErrors.mobile =
          "Mobile number must contain exactly 11 digits.";
      } else if (!form.mobile.startsWith("09")) {
        nextErrors.mobile =
          "Philippine mobile number must start with 09.";
      }
    }

    if (currentStep === 2) {
      if (!form.street.trim()) {
        nextErrors.street =
          "House number and street are required.";
      }

      if (!form.barangay.trim()) {
        nextErrors.barangay = "Barangay is required.";
      }

      if (!form.city.trim()) {
        nextErrors.city =
          "City or municipality is required.";
      }

      if (!form.province) {
        nextErrors.province = "Please select your province.";
      }

      if (!form.postalCode.trim()) {
        nextErrors.postalCode = "Postal code is required.";
      } else if (!/^\d{4}$/.test(form.postalCode)) {
        nextErrors.postalCode =
          "Postal code must contain exactly 4 digits.";
      }
    }

    if (currentStep === 3) {
      if (!passwordIsValid) {
        nextErrors.password =
          "Complete all password requirements.";
      }

      if (!form.confirmPassword) {
        nextErrors.confirmPassword =
          "Please confirm your password.";
      } else if (!passwordsMatch) {
        nextErrors.confirmPassword =
          "The passwords do not match.";
      }
    }

    return nextErrors;
  }

  function validateStep(currentStep) {
    const nextErrors = getStepErrors(currentStep);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleNext() {
    if (!validateStep(step)) return;

    if (step === 1) formatFullName();

    setErrors({});
    setSubmitError("");
    setStep(current => Math.min(current + 1, 3));
    scrollTop();
  }

  function handleBack() {
    if (step === 1) {
      navigate("/signup");
      return;
    }

    setErrors({});
    setSubmitError("");
    setStep(current => current - 1);
    scrollTop();
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (step !== 3 || !validateStep(3)) return;

    // Frontend-only registration.
    // No API or database duplicate check is performed.
    const account = {
      id: `${role}-${Date.now()}`,
      role,
      fullName: properCase(form.fullName),
      username: form.username.trim(),
      ...(isSeller ? { storeName: form.storeName.trim() } : {}),
      email: form.email.trim().toLowerCase(),
      mobile: form.mobile,
      address: {
        street: form.street.trim(),
        barangay: form.barangay.trim(),
        city: form.city.trim(),
        province: form.province,
        postalCode: form.postalCode.trim()
      },
      // Passwords are deliberately not stored in browser storage.
      // Actual credentials will be handled by the backend later.
      createdAt: new Date().toISOString()
    };

    try {
      const storageKey = "fitfusion-users";
      let savedUsers = [];

      try {
        const parsed = JSON.parse(
          localStorage.getItem(storageKey) || "[]"
        );
        savedUsers = Array.isArray(parsed) ? parsed : [];
      } catch {
        savedUsers = [];
      }

      // Demo behavior: replace matching mock records
      // instead of blocking signup.
      const filteredUsers = savedUsers.filter(user => {
        const sameEmail =
          String(user.email || "").toLowerCase() === account.email;

        const sameUsername =
          String(user.username || "").toLowerCase() ===
          account.username.toLowerCase();

        return !sameEmail && !sameUsername;
      });

      localStorage.setItem(
        storageKey,
        JSON.stringify([...filteredUsers, account])
      );

      localStorage.setItem(
        "fitfusion-current-user",
        JSON.stringify(account)
      );

      localStorage.setItem(
        isSeller ? "sellerAccount" : "registeredAccount",
        JSON.stringify(account)
      );

      sessionStorage.setItem(
        isSeller ? "sellerAccount" : "registeredAccount",
        JSON.stringify(account)
      );

      sessionStorage.setItem("userRole", role);
      sessionStorage.setItem("userEmail", account.email);

      navigate(
        isSeller ? "/seller/dashboard" : "/shopper/dashboard",
        { replace: true }
      );
    } catch {
      setSubmitError(
        "Your demo account could not be saved. Please check browser storage and try again."
      );
    }
  }

  return (
    <main className="ff-register-page">
      <div className="ff-register-background left" />
      <div className="ff-register-background right" />

      <header className="ff-register-header">
        <button
          type="button"
          className="ff-register-logo"
          onClick={() => navigate("/")}
          aria-label="Return to landing page"
        >
          <img src={fitFusionLogo} alt="FitFusion AI" />
        </button>

        <div className="ff-register-header-actions">
          <span>Already registered?</span>
          <button
            type="button"
            onClick={() => navigate("/login")}
          >
            Log In
          </button>
        </div>
      </header>

      <section className="ff-register-shell">
        <aside className="ff-register-panel">
          <div>
            <p className="ff-register-step-label">
              {information.eyebrow}
            </p>
            <h1>{information.title}</h1>
            <p className="ff-register-description">
              {information.description}
            </p>
            <p className="ff-register-secondary">
              {information.secondary}
            </p>
          </div>

          <div className="ff-register-panel-note">
            <strong>{information.label}</strong>
            <p>{information.note}</p>
          </div>
        </aside>

        <form
          className="ff-register-form"
          onSubmit={handleSubmit}
          noValidate
        >
          {step === 1 && (
            <section className="ff-register-form-step">
              <div className="ff-register-title">
                <p>{isSeller ? "ACCOUNT & STORE" : "ACCOUNT & CONTACT"}</p>
                <h2>
                  Tell us about your {role} account.
                </h2>
                <span>
                  {isSeller
                    ? "The Store Name is required and will appear with accepted listings."
                    : "Enter your personal and contact information."}
                </span>
              </div>

              <div className="ff-register-grid">
                <FormField
                  label="Full Name"
                  name="fullName"
                  value={form.fullName}
                  error={errors.fullName}
                  onChange={updateField}
                  onBlur={formatFullName}
                  placeholder="Juan Santos Dela Cruz"
                  autoComplete="name"
                  wide
                />

                <FormField
                  label="Username"
                  name="username"
                  value={form.username}
                  error={errors.username}
                  onChange={updateField}
                  placeholder="Enter username"
                  autoComplete="username"
                  wide
                />

                {isSeller && (
                  <FormField
                    label="Store Name"
                    name="storeName"
                    value={form.storeName}
                    error={errors.storeName}
                    onChange={updateField}
                    placeholder="Enter your store name"
                    wide
                  />
                )}

                <FormField
                  label="Email Address"
                  name="email"
                  type="email"
                  value={form.email}
                  error={errors.email}
                  onChange={updateField}
                  placeholder={`${role}@example.com`}
                  autoComplete="email"
                />

                <FormField
                  label="Mobile Number"
                  name="mobile"
                  type="tel"
                  value={form.mobile}
                  error={errors.mobile}
                  onChange={updateField}
                  placeholder="09XXXXXXXXX"
                  autoComplete="tel"
                  inputMode="numeric"
                  maxLength={11}
                />

                <div className="ff-register-information">
                  <strong>
                    {isSeller ? "SELLER REQUIREMENT" : "NAME AND MOBILE FORMAT"}
                  </strong>
                  <p>
                    Enter your first name, optional middle name,
                    and surname in one field. Your mobile number
                    must contain exactly 11 digits and begin with 09.
                    {isSeller &&
                      " Your Store Name will appear with your product listings."}
                  </p>
                </div>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="ff-register-form-step">
              <div className="ff-register-title">
                <p>
                  {isSeller ? "BUSINESS ADDRESS" : "DELIVERY ADDRESS"}
                </p>
                <h2>
                  {isSeller
                    ? "Where is your seller account located?"
                    : "Where should your orders be delivered?"}
                </h2>
                <span>
                  Enter a complete Philippine address.
                </span>
              </div>

              <div className="ff-register-grid">
                <FormField
                  label="House Number and Street"
                  name="street"
                  value={form.street}
                  error={errors.street}
                  onChange={updateField}
                  placeholder="123 Ayala Avenue"
                  autoComplete="address-line1"
                  wide
                />

                <FormField
                  label="Barangay"
                  name="barangay"
                  value={form.barangay}
                  error={errors.barangay}
                  onChange={updateField}
                  placeholder="Barangay San Antonio"
                  autoComplete="address-line2"
                />

                <FormField
                  label="City / Municipality"
                  name="city"
                  value={form.city}
                  error={errors.city}
                  onChange={updateField}
                  placeholder="Makati City"
                  autoComplete="address-level2"
                />

                <label className="ff-register-field">
                  <span>Province *</span>
                  <select
                    name="province"
                    value={form.province}
                    onChange={updateField}
                    className={errors.province ? "input-error" : ""}
                    aria-invalid={Boolean(errors.province)}
                    autoComplete="address-level1"
                  >
                    <option value="">Select your province</option>
                    {provinces.map(province => (
                      <option key={province} value={province}>
                        {province}
                      </option>
                    ))}
                  </select>
                  {errors.province && (
                    <small className="ff-register-error">
                      {errors.province}
                    </small>
                  )}
                </label>

                <FormField
                  label="Postal Code"
                  name="postalCode"
                  value={form.postalCode}
                  error={errors.postalCode}
                  onChange={updateField}
                  placeholder="1200"
                  autoComplete="postal-code"
                  inputMode="numeric"
                  maxLength={4}
                />

                <div className="ff-register-information">
                  <strong>
                    {isSeller ? "ADDRESS INFORMATION" : "ADDRESS PRIVACY"}
                  </strong>
                  <p>
                    {isSeller
                      ? "Your address is associated with your Seller account and Store Profile."
                      : "Your address is used for account and delivery-related functions."}
                  </p>
                </div>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="ff-register-form-step">
              <div className="ff-register-title">
                <p>ACCOUNT SECURITY</p>
                <h2>Create a secure password.</h2>
                <span>
                  All password requirements must be satisfied
                  before registration.
                </span>
              </div>

              <div className="ff-register-security">
                <div className="ff-register-password-fields">
                  <label className="ff-register-field">
                    <span>Password *</span>
                    <div className={`ff-register-password ${
                      errors.password ? "input-error" : ""
                    }`}>
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={form.password}
                        onChange={updateField}
                        placeholder="Enter password"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        <EyeIcon visible={showPassword} />
                      </button>
                    </div>
                    {errors.password && (
                      <small className="ff-register-error">
                        {errors.password}
                      </small>
                    )}
                  </label>

                  <label className="ff-register-field">
                    <span>Confirm Password *</span>
                    <div className={`ff-register-password ${
                      errors.confirmPassword ? "input-error" : ""
                    }`}>
                      <input
                        type={showConfirmation ? "text" : "password"}
                        name="confirmPassword"
                        value={form.confirmPassword}
                        onChange={updateField}
                        placeholder="Confirm password"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmation(v => !v)}
                        aria-label={
                          showConfirmation
                            ? "Hide confirmation password"
                            : "Show confirmation password"
                        }
                      >
                        <EyeIcon visible={showConfirmation} />
                      </button>
                    </div>

                    {form.confirmPassword && (
                      <small className={`ff-password-status ${
                        passwordsMatch ? "valid" : "invalid"
                      }`}>
                        {passwordsMatch
                          ? "✓ Passwords match."
                          : "× Passwords do not match."}
                      </small>
                    )}

                    {errors.confirmPassword && (
                      <small className="ff-register-error">
                        {errors.confirmPassword}
                      </small>
                    )}
                  </label>
                </div>

                <aside className="ff-register-requirements">
                  <strong>PASSWORD REQUIREMENTS</strong>
                  <ul>
                    {requirements.map(([key, label]) => (
                      <li
                        key={key}
                        className={passwordRules[key] ? "passed" : ""}
                      >
                        <span aria-hidden="true">✓</span>
                        <p>{label}</p>
                      </li>
                    ))}
                  </ul>
                </aside>
              </div>

              {submitError && (
                <div className="ff-register-submit-error" role="alert">
                  {submitError}
                </div>
              )}
            </section>
          )}

          <footer className="ff-register-actions">
            <button
              type="button"
              className="ff-register-back"
              onClick={handleBack}
            >
              Back
            </button>

            <div className="ff-register-next-area">
              {step < 3 ? (
                <button
                  type="button"
                  className="ff-register-next"
                  onClick={handleNext}
                >
                  {step === 1 ? "Next: Address" : "Next: Security"}
                </button>
              ) : (
                <button
                  type="submit"
                  className="ff-register-next"
                >
                  Create {accountType} Account
                </button>
              )}
              <span>Step {step} of 3</span>
            </div>
          </footer>
        </form>
      </section>
    </main>
  );
}
