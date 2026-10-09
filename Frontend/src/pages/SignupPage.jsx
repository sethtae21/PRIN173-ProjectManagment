import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import fitFusionLogo from "../assets/fitfusion-logo.svg";
import "./css/SignupPage.css";

const provinces = [
  "Abra",
  "Agusan del Norte",
  "Agusan del Sur",
  "Aklan",
  "Albay",
  "Antique",
  "Apayao",
  "Aurora",
  "Basilan",
  "Bataan",
  "Batanes",
  "Batangas",
  "Benguet",
  "Biliran",
  "Bohol",
  "Bukidnon",
  "Bulacan",
  "Cagayan",
  "Camarines Norte",
  "Camarines Sur",
  "Camiguin",
  "Capiz",
  "Catanduanes",
  "Cavite",
  "Cebu",
  "Cotabato",
  "Davao de Oro",
  "Davao del Norte",
  "Davao del Sur",
  "Davao Occidental",
  "Davao Oriental",
  "Dinagat Islands",
  "Eastern Samar",
  "Guimaras",
  "Ifugao",
  "Ilocos Norte",
  "Ilocos Sur",
  "Iloilo",
  "Isabela",
  "Kalinga",
  "La Union",
  "Laguna",
  "Lanao del Norte",
  "Lanao del Sur",
  "Leyte",
  "Maguindanao del Norte",
  "Maguindanao del Sur",
  "Marinduque",
  "Masbate",
  "Metro Manila",
  "Misamis Occidental",
  "Misamis Oriental",
  "Mountain Province",
  "Negros Occidental",
  "Negros Oriental",
  "Northern Samar",
  "Nueva Ecija",
  "Nueva Vizcaya",
  "Occidental Mindoro",
  "Oriental Mindoro",
  "Palawan",
  "Pampanga",
  "Pangasinan",
  "Quezon",
  "Quirino",
  "Rizal",
  "Romblon",
  "Samar",
  "Sarangani",
  "Siquijor",
  "Sorsogon",
  "South Cotabato",
  "Southern Leyte",
  "Sultan Kudarat",
  "Sulu",
  "Surigao del Norte",
  "Surigao del Sur",
  "Tarlac",
  "Tawi-Tawi",
  "Zambales",
  "Zamboanga del Norte",
  "Zamboanga del Sur",
  "Zamboanga Sibugay",
];

const initialForm = {
  fullName: "",
  username: "",
  email: "",
  mobile: "",
  street: "",
  barangay: "",
  city: "",
  province: "",
  postalCode: "",
  password: "",
  confirmPassword: "",
};

const stepInformation = {
  1: {
    eyebrow: "STEP 1 OF 3",
    title: "Create your shopper identity.",
    description:
      "Enter your personal account and contact information.",
    secondary:
      "Your full name will be formatted automatically using proper capitalization.",
    label: "SHOPPER ACCOUNT",
    note: "A middle name may be included but is optional.",
  },

  2: {
    eyebrow: "STEP 2 OF 3",
    title: "Add your delivery address.",
    description:
      "Provide the address where your future orders should be delivered.",
    secondary:
      "Make sure the address is complete and accurate before continuing.",
    label: "DELIVERY INFORMATION",
    note: "Your address can be updated later from Account Management.",
  },

  3: {
    eyebrow: "STEP 3 OF 3",
    title: "Secure your account.",
    description:
      "Create a strong password that follows all security requirements.",
    secondary:
      "Your password and confirmation must match before registration.",
    label: "ACCOUNT SECURITY",
    note: "All password requirements must turn green.",
  },
};

function formatProperCase(value) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(
      /(^|[\s'-])([a-zà-öø-ÿ])/gu,
      (match, separator, letter) =>
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
      className={`shopper-register-field ${
        wide ? "shopper-register-wide" : ""
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
        {...inputProps}
      />

      {error && (
        <small className="shopper-register-error">
          {error}
        </small>
      )}
    </label>
  );
}

function SignupPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmation, setShowConfirmation] =
    useState(false);

  const currentInformation = stepInformation[step];

  const passwordRules = useMemo(
    () => ({
      length: form.password.length >= 8,
      uppercase: /[A-Z]/.test(form.password),
      lowercase: /[a-z]/.test(form.password),
      number: /\d/.test(form.password),
      special: /[^A-Za-z0-9]/.test(form.password),
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
      value = value
        .replace(/\D/g, "")
        .slice(0, 11);
    }

    if (name === "postalCode") {
      value = value
        .replace(/\D/g, "")
        .slice(0, 4);
    }

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: "",
    }));

    setSubmitError("");
  }

  function formatFullName() {
    if (!form.fullName.trim()) {
      return;
    }

    setForm((current) => ({
      ...current,
      fullName: formatProperCase(
        current.fullName
      ),
    }));
  }

  function validateStepOne() {
    const nextErrors = {};

    const formattedFullName =
      formatProperCase(form.fullName);

    if (!formattedFullName) {
      nextErrors.fullName =
        "Full name is required.";
    } else if (
      !isValidFullName(formattedFullName)
    ) {
      nextErrors.fullName =
        "Full name may contain letters, spaces, apostrophes, periods, and hyphens only.";
    } else if (
      formattedFullName
        .split(" ")
        .filter(Boolean).length < 2
    ) {
      nextErrors.fullName =
        "Please enter at least your first name and surname.";
    }

    if (!form.username.trim()) {
      nextErrors.username =
        "Username is required.";
    } else if (
      form.username.trim().length < 3
    ) {
      nextErrors.username =
        "Username must contain at least 3 characters.";
    }

    if (!form.email.trim()) {
      nextErrors.email =
        "Email address is required.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.email
      )
    ) {
      nextErrors.email =
        "Please enter a valid email address.";
    }

    if (!form.mobile) {
      nextErrors.mobile =
        "Mobile number is required.";
    } else if (!/^\d{11}$/.test(form.mobile)) {
      nextErrors.mobile =
        "Mobile number must contain exactly 11 digits.";
    } else if (
      !form.mobile.startsWith("09")
    ) {
      nextErrors.mobile =
        "Philippine mobile number must start with 09.";
    }

    setForm((current) => ({
      ...current,
      fullName: formattedFullName,
    }));

    setErrors(nextErrors);

    return (
      Object.keys(nextErrors).length === 0
    );
  }

  function validateStepTwo() {
    const nextErrors = {};

    if (!form.street.trim()) {
      nextErrors.street =
        "House number and street are required.";
    }

    if (!form.barangay.trim()) {
      nextErrors.barangay =
        "Barangay is required.";
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
    } else if (
      !/^\d{4}$/.test(form.postalCode)
    ) {
      nextErrors.postalCode =
        "Postal code must contain exactly 4 digits.";
    }

    setErrors(nextErrors);

    return (
      Object.keys(nextErrors).length === 0
    );
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

    return (
      Object.keys(nextErrors).length === 0
    );
  }

  function handleNext() {
    let valid = false;

    if (step === 1) {
      valid = validateStepOne();
    }

    if (step === 2) {
      valid = validateStepTwo();
    }

    if (!valid) {
      return;
    }

    setErrors({});

    setStep((current) => current + 1);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleBack() {
    if (step === 1) {
      navigate("/signup");
      return;
    }

    setErrors({});

    setStep((current) => current - 1);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!validateStepThree()) {
      return;
    }

    const shopperAccount = {
      id: `shopper-${Date.now()}`,
      role: "shopper",

      fullName: formatProperCase(
        form.fullName
      ),

      username: form.username.trim(),

      email: form.email
        .trim()
        .toLowerCase(),

      mobile: form.mobile,

      address: {
        street: form.street.trim(),
        barangay: form.barangay.trim(),
        city: form.city.trim(),
        province: form.province,
        postalCode:
          form.postalCode.trim(),
      },

      password: form.password,

      createdAt:
        new Date().toISOString(),
    };

    try {
      const users = JSON.parse(
        localStorage.getItem(
          "fitfusion-users"
        ) || "[]"
      );

      const accountExists = users.some(
        (user) =>
          user.email?.toLowerCase() ===
            shopperAccount.email ||
          user.username?.toLowerCase() ===
            shopperAccount.username.toLowerCase()
      );

      if (accountExists) {
        setSubmitError(
          "An account with this email address or username already exists."
        );

        return;
      }

      localStorage.setItem(
        "fitfusion-users",
        JSON.stringify([
          ...users,
          shopperAccount,
        ])
      );

      localStorage.setItem(
        "fitfusion-current-user",
        JSON.stringify(shopperAccount)
      );

      localStorage.setItem(
        "registeredAccount",
        JSON.stringify(shopperAccount)
      );

      sessionStorage.setItem(
        "registeredAccount",
        JSON.stringify(shopperAccount)
      );

      sessionStorage.setItem(
        "userRole",
        "shopper"
      );

      sessionStorage.setItem(
        "userEmail",
        shopperAccount.email
      );

      navigate("/shopper/dashboard", {
        replace: true,
      });
    } catch {
      setSubmitError(
        "The account could not be created. Please try again."
      );
    }
  }

  return (
    <main className="shopper-register-page">
      <div className="shopper-register-background left" />
      <div className="shopper-register-background right" />

      <header className="shopper-register-header">
        <button
          type="button"
          className="shopper-register-logo"
          onClick={() => navigate("/")}
          aria-label="Return to landing page"
        >
          <img
            src={fitFusionLogo}
            alt="FitFusion AI"
          />
        </button>

        <div className="shopper-register-header-actions">
          <span>Already registered?</span>

          <button
            type="button"
            onClick={() =>
              navigate("/login")
            }
          >
            Log In
          </button>
        </div>
      </header>

      <section className="shopper-register-shell">
        <aside className="shopper-register-panel">
          <div>
            <p className="shopper-register-step-label">
              {currentInformation.eyebrow}
            </p>

            <h1>
              {currentInformation.title}
            </h1>

            <p className="shopper-register-description">
              {
                currentInformation.description
              }
            </p>

            <p className="shopper-register-secondary">
              {
                currentInformation.secondary
              }
            </p>
          </div>

          <div className="shopper-register-panel-note">
            <strong>
              {currentInformation.label}
            </strong>

            <p>
              {currentInformation.note}
            </p>
          </div>
        </aside>

        <form
          className="shopper-register-form"
          onSubmit={handleSubmit}
          noValidate
        >
          {step === 1 && (
            <section className="shopper-register-form-step">
              <div className="shopper-register-title">
                <p>ACCOUNT & CONTACT</p>

                <h2>
                  Tell us about your
                  shopper account.
                </h2>

                <span>
                  Enter your personal and
                  contact information.
                </span>
              </div>

              <div className="shopper-register-grid">
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
                  placeholder="juan_delacruz"
                  autoComplete="username"
                  wide
                />

                <InputField
                  label="Email Address"
                  name="email"
                  type="email"
                  value={form.email}
                  error={errors.email}
                  onChange={updateField}
                  placeholder="shopper@example.com"
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

                <div className="shopper-register-information">
                  <strong>
                    NAME AND MOBILE FORMAT
                  </strong>

                  <p>
                    Enter your first name,
                    optional middle name, and
                    surname in one field. Your
                    mobile number must contain
                    exactly 11 digits and begin
                    with 09.
                  </p>
                </div>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="shopper-register-form-step">
              <div className="shopper-register-title">
                <p>DELIVERY ADDRESS</p>

                <h2>
                  Where should your orders
                  be delivered?
                </h2>

                <span>
                  Enter a complete Philippine
                  delivery address.
                </span>
              </div>

              <div className="shopper-register-grid">
                <InputField
                  label="House Number and Street"
                  name="street"
                  value={form.street}
                  error={errors.street}
                  onChange={updateField}
                  placeholder="123 Rizal Street"
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

                <label className="shopper-register-field">
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
                    autoComplete="address-level1"
                  >
                    <option value="">
                      Select your province
                    </option>

                    {provinces.map(
                      (province) => (
                        <option
                          key={province}
                          value={province}
                        >
                          {province}
                        </option>
                      )
                    )}
                  </select>

                  {errors.province && (
                    <small className="shopper-register-error">
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

                <div className="shopper-register-information">
                  <strong>
                    ADDRESS PRIVACY
                  </strong>

                  <p>
                    Your address is used only
                    for account and
                    delivery-related functions.
                  </p>
                </div>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="shopper-register-form-step">
              <div className="shopper-register-title">
                <p>ACCOUNT SECURITY</p>

                <h2>
                  Create a secure password.
                </h2>

                <span>
                  All password requirements
                  must be satisfied before
                  registration.
                </span>
              </div>

              <div className="shopper-register-security">
                <div className="shopper-register-password-fields">
                  <label className="shopper-register-field">
                    <span>Password *</span>

                    <div
                      className={`shopper-register-password ${
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
                            (current) =>
                              !current
                          )
                        }
                        aria-label={
                          showPassword
                            ? "Hide password"
                            : "Show password"
                        }
                      >
                        <EyeIcon
                          visible={
                            showPassword
                          }
                        />
                      </button>
                    </div>

                    {errors.password && (
                      <small className="shopper-register-error">
                        {errors.password}
                      </small>
                    )}
                  </label>

                  <label className="shopper-register-field">
                    <span>
                      Confirm Password *
                    </span>

                    <div
                      className={`shopper-register-password ${
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
                        value={
                          form.confirmPassword
                        }
                        onChange={updateField}
                        placeholder="Confirm password"
                        autoComplete="new-password"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmation(
                            (current) =>
                              !current
                          )
                        }
                        aria-label={
                          showConfirmation
                            ? "Hide confirmation password"
                            : "Show confirmation password"
                        }
                      >
                        <EyeIcon
                          visible={
                            showConfirmation
                          }
                        />
                      </button>
                    </div>

                    {form.confirmPassword && (
                      <small
                        className={
                          passwordsMatch
                            ? "shopper-password-status valid"
                            : "shopper-password-status invalid"
                        }
                      >
                        {passwordsMatch
                          ? "✓ Passwords match."
                          : "× Passwords do not match."}
                      </small>
                    )}

                    {errors.confirmPassword && (
                      <small className="shopper-register-error">
                        {
                          errors.confirmPassword
                        }
                      </small>
                    )}
                  </label>
                </div>

                <aside className="shopper-register-requirements">
                  <strong>
                    PASSWORD REQUIREMENTS
                  </strong>

                  <ul>
                    <Requirement
                      passed={
                        passwordRules.length
                      }
                    >
                      At least 8 characters
                    </Requirement>

                    <Requirement
                      passed={
                        passwordRules.uppercase
                      }
                    >
                      At least one uppercase
                      letter
                    </Requirement>

                    <Requirement
                      passed={
                        passwordRules.lowercase
                      }
                    >
                      At least one lowercase
                      letter
                    </Requirement>

                    <Requirement
                      passed={
                        passwordRules.number
                      }
                    >
                      At least one number
                    </Requirement>

                    <Requirement
                      passed={
                        passwordRules.special
                      }
                    >
                      At least one special
                      character
                    </Requirement>
                  </ul>
                </aside>
              </div>

              {submitError && (
                <div
                  className="shopper-register-submit-error"
                  role="alert"
                >
                  {submitError}
                </div>
              )}
            </section>
          )}

          <footer className="shopper-register-actions">
            <button
              type="button"
              className="shopper-register-back"
              onClick={handleBack}
            >
              Back
            </button>

            <div className="shopper-register-next-area">
              {step < 3 ? (
                <button
                  type="button"
                  className="shopper-register-next"
                  onClick={handleNext}
                >
                  {step === 1
                    ? "Next: Address"
                    : "Next: Security"}
                </button>
              ) : (
                <button
                  type="submit"
                  className="shopper-register-next"
                >
                  Create Shopper Account
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

export default SignupPage;