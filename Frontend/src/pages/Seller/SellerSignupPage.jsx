
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import fitFusionLogo from "../../assets/fitfusion-logo.svg";
import "../css/SellerSignupPage.css";

const provinces = [
  "Abra", "Agusan del Norte", "Agusan del Sur", "Aklan",
  "Albay", "Antique", "Apayao", "Aurora", "Basilan",
  "Bataan", "Batanes", "Batangas", "Benguet", "Biliran",
  "Bohol", "Bukidnon", "Bulacan", "Cagayan",
  "Camarines Norte", "Camarines Sur", "Camiguin",
  "Capiz", "Catanduanes", "Cavite", "Cebu", "Cotabato",
  "Davao de Oro", "Davao del Norte", "Davao del Sur",
  "Davao Occidental", "Davao Oriental", "Dinagat Islands",
  "Eastern Samar", "Guimaras", "Ifugao", "Ilocos Norte",
  "Ilocos Sur", "Iloilo", "Isabela", "Kalinga",
  "La Union", "Laguna", "Lanao del Norte", "Lanao del Sur",
  "Leyte", "Maguindanao del Norte", "Maguindanao del Sur",
  "Marinduque", "Masbate", "Metro Manila",
  "Misamis Occidental", "Misamis Oriental",
  "Mountain Province", "Negros Occidental",
  "Negros Oriental", "Northern Samar", "Nueva Ecija",
  "Nueva Vizcaya", "Occidental Mindoro", "Oriental Mindoro",
  "Palawan", "Pampanga", "Pangasinan", "Quezon",
  "Quirino", "Rizal", "Romblon", "Samar", "Sarangani",
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

const stepInformation = {
  1: {
    eyebrow: "STEP 1 OF 3",
    title: "Create your seller identity.",
    description:
      "Enter your account, contact information, and required Store Name.",
    secondary:
      "Your Store Name will be assigned automatically to accepted product listings.",
    label: "SELLER ACCOUNT",
    note:
      "A middle name may be included in your full name but is optional."
  },
  2: {
    eyebrow: "STEP 2 OF 3",
    title: "Add your business address.",
    description:
      "Provide the address associated with your seller account.",
    secondary:
      "Make sure your business address is complete and accurate.",
    label: "SELLER ADDRESS",
    note:
      "This address can be updated later from your Store Profile."
  },
  3: {
    eyebrow: "STEP 3 OF 3",
    title: "Secure your seller account.",
    description:
      "Create a strong password that follows all security requirements.",
    secondary:
      "Your password and confirmation must match before registration.",
    label: "ACCOUNT SECURITY",
    note: "All password requirements must turn green."
  }
};

function formatProperCase(value) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(
      /(^|[\s'-])([a-zà-öø-ÿ])/gu,
      (_, separator, letter) =>
        `${separator}${letter.toUpperCase()}`
    );
}

function isValidFullName(value) {
  return /^[A-Za-zÀ-ÖØ-öø-ÿÑñ.' -]+$/u.test(value);
}

function EyeIcon({ visible }) {
  if (visible) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5Z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" />
      <path d="M9.8 4.3A10.8 10.8 0 0 1 12 4c5.5 0 9 5 9 5a16.4 16.4 0 0 1-3 3.5" />
      <path d="M6.1 6.1C4.2 7.3 3 9 3 9s3.5 5 9 5a10.8 10.8 0 0 0 3.1-.4" />
    </svg>
  );
}

function Requirement({ passed, children }) {
  return (
    <li className={passed ? "passed" : ""}>
      <span aria-hidden="true">✓</span>
      <p>{children}</p>
    </li>
  );
}

function InputField({
  label,
  name,
  value,
  error,
  onChange,
  onBlur,
  type = "text",
  wide = false,
  ...inputProps
}) {
  return (
    <label
      className={`seller-register-field ${
        wide ? "seller-register-wide" : ""
      }`}
    >
      <span>{label} *</span>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={error ? "input-error" : ""}
        aria-invalid={Boolean(error)}
        {...inputProps}
      />

      {error && (
        <small className="seller-register-error">
          {error}
        </small>
      )}
    </label>
  );
}

function SellerSignupPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const currentInformation = stepInformation[step];

  const passwordRules = useMemo(
    () => ({
      length: form.password.length >= 8,
      uppercase: /[A-Z]/.test(form.password),
      lowercase: /[a-z]/.test(form.password),
      number: /\d/.test(form.password),
      special: /[^A-Za-z0-9]/.test(form.password)
    }),
    [form.password]
  );

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

    setForm((current) => ({
      ...current,
      [name]: value
    }));

    setErrors((current) => ({
      ...current,
      [name]: ""
    }));

    setSubmitError("");
  }

  function formatFullName() {
    setForm((current) => ({
      ...current,
      fullName: formatProperCase(current.fullName)
    }));
  }

  function validateStepOne() {
    const nextErrors = {};

    const formattedFullName = formatProperCase(form.fullName);

    if (!formattedFullName) {
      nextErrors.fullName = "Full name is required.";
    } else if (!isValidFullName(formattedFullName)) {
      nextErrors.fullName =
        "Full name may contain letters, spaces, apostrophes, periods, and hyphens only.";
    } else if (
      formattedFullName.split(" ").filter(Boolean).length < 2
    ) {
      nextErrors.fullName =
        "Please enter at least your first name and surname.";
    }

    if (!form.username.trim()) {
      nextErrors.username = "Username is required.";
    } else if (form.username.trim().length < 3) {
      nextErrors.username =
        "Username must contain at least 3 characters.";
    }

    if (!form.storeName.trim()) {
      nextErrors.storeName =
        "Store Name is required for Seller accounts.";
    } else if (form.storeName.trim().length < 2) {
      nextErrors.storeName =
        "Store Name must contain at least 2 characters.";
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

    setForm((current) => ({
      ...current,
      fullName: formattedFullName
    }));

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  function validateStepTwo() {
    const nextErrors = {};

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
      nextErrors.province =
        "Please select your province.";
    }

    if (!form.postalCode.trim()) {
      nextErrors.postalCode =
        "Postal code is required.";
    } else if (!/^\d{4}$/.test(form.postalCode)) {
      nextErrors.postalCode =
        "Postal code must contain exactly 4 digits.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  function validateStepThree() {
    const nextErrors = {};

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

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function handleNext() {
    let valid = false;

    if (step === 1) {
      valid = validateStepOne();
    }

    if (step === 2) {
      valid = validateStepTwo();
    }

    if (!valid) return;

    setErrors({});
    setSubmitError("");
    setStep((current) => Math.min(current + 1, 3));

    scrollToTop();
  }

  function handleBack() {
    if (step === 1) {
      navigate("/signup");
      return;
    }

    setErrors({});
    setSubmitError("");

    setStep((current) => current - 1);
    scrollToTop();
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (step !== 3 || isSubmitting) return;
    if (!validateStepThree()) return;

    setIsSubmitting(true);
    setSubmitError("");

    const sellerAccount = {
      id: `seller-${Date.now()}`,
      role: "seller",
      fullName: formatProperCase(form.fullName),
      username: form.username.trim(),
      storeName: form.storeName.trim(),
      email: form.email.trim().toLowerCase(),
      mobile: form.mobile,

      address: {
        street: form.street.trim(),
        barangay: form.barangay.trim(),
        city: form.city.trim(),
        province: form.province,
        postalCode: form.postalCode.trim()
      },

      createdAt: new Date().toISOString()
    };

    try {
      // Frontend-only registration:
      // Registration does not require an API or database.

      let users = [];

      try {
        const storedUsers = JSON.parse(
          localStorage.getItem("fitfusion-users") || "[]"
        );

        users = Array.isArray(storedUsers)
          ? storedUsers
          : [];
      } catch {
        users = [];
      }

      // Replace matching mock account records.
      // This avoids blocking registration during frontend testing.
      const remainingUsers = users.filter((user) => {
        const sameEmail =
          String(user.email || "").toLowerCase() ===
          sellerAccount.email;

        const sameUsername =
          String(user.username || "").toLowerCase() ===
          sellerAccount.username.toLowerCase();

        const sameStore =
          user.role === "seller" &&
          String(user.storeName || "").toLowerCase() ===
          sellerAccount.storeName.toLowerCase();

        return !sameEmail && !sameUsername && !sameStore;
      });

      const updatedUsers = [
        ...remainingUsers,
        sellerAccount
      ];

      // Keep the same mock storage keys used by the project.
      // Never save actual passwords in localStorage.
      localStorage.setItem(
        "fitfusion-users",
        JSON.stringify(updatedUsers)
      );

      localStorage.setItem(
        "fitfusion-current-user",
        JSON.stringify(sellerAccount)
      );

      localStorage.setItem(
        "sellerAccount",
        JSON.stringify(sellerAccount)
      );

      sessionStorage.setItem(
        "sellerAccount",
        JSON.stringify(sellerAccount)
      );

      sessionStorage.setItem("userRole", "seller");

      sessionStorage.setItem(
        "userEmail",
        sellerAccount.email
      );

      // Successful frontend registration.
      navigate("/seller/dashboard", {
        replace: true
      });
    } catch (error) {
      console.error("Seller registration failed:", error);

      setSubmitError(
        "The Seller account could not be created. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="seller-register-page">
      <div className="seller-register-background left" />
      <div className="seller-register-background right" />

      <header className="seller-register-header">
        <button
          type="button"
          className="seller-register-logo"
          onClick={() => navigate("/")}
          aria-label="Return to landing page"
        >
          <img
            src={fitFusionLogo}
            alt="FitFusion AI"
          />
        </button>

        <div className="seller-register-header-actions">
          <span>Already registered?</span>

          <button
            type="button"
            onClick={() => navigate("/login")}
          >
            Log In
          </button>
        </div>
      </header>

      <section className="seller-register-shell">
        <aside className="seller-register-panel">
          <div>
            <p className="seller-register-step-label">
              {currentInformation.eyebrow}
            </p>

            <h1>{currentInformation.title}</h1>

            <p className="seller-register-description">
              {currentInformation.description}
            </p>

            <p className="seller-register-secondary">
              {currentInformation.secondary}
            </p>
          </div>

          <div className="seller-register-panel-note">
            <strong>
              {currentInformation.label}
            </strong>

            <p>{currentInformation.note}</p>
          </div>
        </aside>

        <form
          className="seller-register-form"
          onSubmit={handleSubmit}
          noValidate
        >
          {step === 1 && (
            <section className="seller-register-form-step">
              <div className="seller-register-title">
                <p>ACCOUNT & STORE</p>

                <h2>
                  Tell us about your seller account.
                </h2>

                <span>
                  The Store Name is required and will
                  appear with every accepted listing.
                </span>
              </div>

              <div className="seller-register-grid">
                <InputField
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

                <InputField
                  label="Username"
                  name="username"
                  value={form.username}
                  error={errors.username}
                  onChange={updateField}
                  placeholder="Enter username"
                  autoComplete="username"
                  wide
                />

                <InputField
                  label="Store Name"
                  name="storeName"
                  value={form.storeName}
                  error={errors.storeName}
                  onChange={updateField}
                  placeholder="Enter your store name"
                  wide
                />

                <InputField
                  label="Email Address"
                  name="email"
                  type="email"
                  value={form.email}
                  error={errors.email}
                  onChange={updateField}
                  placeholder="seller@example.com"
                  autoComplete="email"
                />

                <InputField
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

                <div className="seller-register-information">
                  <strong>SELLER REQUIREMENT</strong>

                  <p>
                    Enter your first name, optional middle
                    name, and surname in the Full Name field.
                    Your Store Name will be assigned
                    automatically to accepted product listings.
                  </p>
                </div>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="seller-register-form-step">
              <div className="seller-register-title">
                <p>BUSINESS ADDRESS</p>

                <h2>
                  Where is your seller account located?
                </h2>

                <span>
                  Enter a complete Philippine business address.
                </span>
              </div>

              <div className="seller-register-grid">
                <InputField
                  label="House Number and Street"
                  name="street"
                  value={form.street}
                  error={errors.street}
                  onChange={updateField}
                  placeholder="123 Ayala Avenue"
                  autoComplete="address-line1"
                  wide
                />

                <InputField
                  label="Barangay"
                  name="barangay"
                  value={form.barangay}
                  error={errors.barangay}
                  onChange={updateField}
                  placeholder="Barangay San Antonio"
                  autoComplete="address-line2"
                />

                <InputField
                  label="City / Municipality"
                  name="city"
                  value={form.city}
                  error={errors.city}
                  onChange={updateField}
                  placeholder="Makati City"
                  autoComplete="address-level2"
                />

                <label className="seller-register-field">
                  <span>Province *</span>

                  <select
                    name="province"
                    value={form.province}
                    onChange={updateField}
                    className={
                      errors.province
                        ? "input-error"
                        : ""
                    }
                    aria-invalid={Boolean(errors.province)}
                    autoComplete="address-level1"
                  >
                    <option value="">
                      Select your province
                    </option>

                    {provinces.map((province) => (
                      <option
                        key={province}
                        value={province}
                      >
                        {province}
                      </option>
                    ))}
                  </select>

                  {errors.province && (
                    <small className="seller-register-error">
                      {errors.province}
                    </small>
                  )}
                </label>

                <InputField
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

                <div className="seller-register-information">
                  <strong>ADDRESS INFORMATION</strong>

                  <p>
                    Your address is associated with
                    your Seller account and Store Profile.
                  </p>
                </div>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="seller-register-form-step">
              <div className="seller-register-title">
                <p>ACCOUNT SECURITY</p>

                <h2>
                  Create a secure password.
                </h2>

                <span>
                  All password requirements must be
                  satisfied before registration.
                </span>
              </div>

              <div className="seller-register-security">
                <div className="seller-register-password-fields">
                  <label className="seller-register-field">
                    <span>Password *</span>

                    <div
                      className={`seller-register-password ${
                        errors.password
                          ? "input-error"
                          : ""
                      }`}
                    >
                      <input
                        type={
                          showPassword
                            ? "text"
                            : "password"
                        }
                        name="password"
                        value={form.password}
                        onChange={updateField}
                        placeholder="Enter password"
                        autoComplete="new-password"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(
                            (current) => !current
                          )
                        }
                        aria-label={
                          showPassword
                            ? "Hide password"
                            : "Show password"
                        }
                      >
                        <EyeIcon visible={showPassword} />
                      </button>
                    </div>

                    {errors.password && (
                      <small className="seller-register-error">
                        {errors.password}
                      </small>
                    )}
                  </label>

                  <label className="seller-register-field">
                    <span>Confirm Password *</span>

                    <div
                      className={`seller-register-password ${
                        errors.confirmPassword
                          ? "input-error"
                          : ""
                      }`}
                    >
                      <input
                        type={
                          showConfirmation
                            ? "text"
                            : "password"
                        }
                        name="confirmPassword"
                        value={form.confirmPassword}
                        onChange={updateField}
                        placeholder="Confirm password"
                        autoComplete="new-password"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmation(
                            (current) => !current
                          )
                        }
                        aria-label={
                          showConfirmation
                            ? "Hide confirmation password"
                            : "Show confirmation password"
                        }
                      >
                        <EyeIcon
                          visible={showConfirmation}
                        />
                      </button>
                    </div>

                    {form.confirmPassword && (
                      <small
                        className={
                          passwordsMatch
                            ? "seller-password-status valid"
                            : "seller-password-status invalid"
                        }
                      >
                        {passwordsMatch
                          ? "✓ Passwords match."
                          : "× Passwords do not match."}
                      </small>
                    )}

                    {errors.confirmPassword && (
                      <small className="seller-register-error">
                        {errors.confirmPassword}
                      </small>
                    )}
                  </label>
                </div>

                <aside className="seller-register-requirements">
                  <strong>
                    PASSWORD REQUIREMENTS
                  </strong>

                  <ul>
                    <Requirement
                      passed={passwordRules.length}
                    >
                      At least 8 characters
                    </Requirement>

                    <Requirement
                      passed={passwordRules.uppercase}
                    >
                      At least one uppercase letter
                    </Requirement>

                    <Requirement
                      passed={passwordRules.lowercase}
                    >
                      At least one lowercase letter
                    </Requirement>

                    <Requirement
                      passed={passwordRules.number}
                    >
                      At least one number
                    </Requirement>

                    <Requirement
                      passed={passwordRules.special}
                    >
                      At least one special character
                    </Requirement>
                  </ul>
                </aside>
              </div>

              {submitError && (
                <div
                  className="seller-register-submit-error"
                  role="alert"
                >
                  {submitError}
                </div>
              )}
            </section>
          )}

          <footer className="seller-register-actions">
            <button
              type="button"
              className="seller-register-back"
              onClick={handleBack}
              disabled={isSubmitting}
            >
              Back
            </button>

            <div className="seller-register-next-area">
              {step < 3 ? (
                <button
                  type="button"
                  className="seller-register-next"
                  onClick={handleNext}
                >
                  {step === 1
                    ? "Next: Address"
                    : "Next: Security"}
                </button>
              ) : (
                <button
                  type="submit"
                  className="seller-register-next"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "Creating Account..."
                    : "Create Seller Account"}
                </button>
              )}

              <span>
                Step {step} of 3
              </span>
            </div>
          </footer>
        </form>
      </section>
    </main>
  );
}

export default SellerSignupPage;
