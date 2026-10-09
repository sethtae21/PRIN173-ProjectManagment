import { useState } from "react";
import { useNavigate } from "react-router-dom";
import fitFusionLogo from "../../assets/fitfusion-logo.svg";
import "../css/SellerSignupPage.css";

const initialForm = {
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
  confirmPassword: "",
};

function SellerSignupPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [form, setForm] =
    useState(initialForm);
  const [errors, setErrors] = useState({});

  const [showPassword, setShowPassword] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [isCreating, setIsCreating] =
    useState(false);

  const passwordRules = {
    length: form.password.length >= 8,
    uppercase: /[A-Z]/.test(form.password),
    lowercase: /[a-z]/.test(form.password),
    number: /\d/.test(form.password),
    special: /[^A-Za-z0-9]/.test(
      form.password
    ),
  };

  const passwordComplete = Object.values(
    passwordRules
  ).every(Boolean);

  const confirmStarted =
    form.confirmPassword.length > 0;

  const passwordsMatch =
    confirmStarted &&
    form.password === form.confirmPassword;

  const canCreate =
    passwordComplete &&
    passwordsMatch &&
    !isCreating;

  function handleChange(event) {
    const { name, value } = event.target;

    let updatedValue = value;

    if (name === "postalCode") {
      updatedValue = value
        .replace(/\D/g, "")
        .slice(0, 4);
    }

    setForm((current) => ({
      ...current,
      [name]: updatedValue,
    }));

    setErrors((current) => {
      const updatedErrors = {
        ...current,
        [name]: "",
      };

      if (
        name === "password" ||
        name === "confirmPassword"
      ) {
        updatedErrors.password = "";
        updatedErrors.confirmPassword = "";
      }

      return updatedErrors;
    });
  }

  function validateStepOne() {
    const newErrors = {};

    const normalizedMobile =
      form.mobile.replace(/[\s-]/g, "");

    if (!form.username.trim()) {
      newErrors.username =
        "Username is required.";
    } else if (
      form.username.trim().length < 3
    ) {
      newErrors.username =
        "Username must contain at least 3 characters.";
    }

    if (!form.storeName.trim()) {
      newErrors.storeName =
        "Store Name is required for Seller accounts.";
    } else if (
      form.storeName.trim().length < 3
    ) {
      newErrors.storeName =
        "Store Name must contain at least 3 characters.";
    }

    if (!form.email.trim()) {
      newErrors.email =
        "Email address is required.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.email.trim()
      )
    ) {
      newErrors.email =
        "Enter a valid email address.";
    }

    if (!form.mobile.trim()) {
      newErrors.mobile =
        "Mobile number is required.";
    } else if (
      !/^(09\d{9}|\+639\d{9})$/.test(
        normalizedMobile
      )
    ) {
      newErrors.mobile =
        "Use 09XXXXXXXXX or +639XXXXXXXXX.";
    }

    return newErrors;
  }

  function validateStepTwo() {
    const newErrors = {};

    if (!form.street.trim()) {
      newErrors.street =
        "House number, building, or street is required.";
    }

    if (!form.barangay.trim()) {
      newErrors.barangay =
        "Barangay is required.";
    }

    if (!form.city.trim()) {
      newErrors.city =
        "City or municipality is required.";
    }

    if (!form.province.trim()) {
      newErrors.province =
        "Province is required.";
    }

    if (!form.postalCode.trim()) {
      newErrors.postalCode =
        "Postal code is required.";
    } else if (
      !/^\d{4}$/.test(form.postalCode)
    ) {
      newErrors.postalCode =
        "Postal code must contain exactly 4 digits.";
    }

    return newErrors;
  }

  function validateStepThree() {
    const newErrors = {};

    if (!form.password) {
      newErrors.password =
        "Password is required.";
    } else if (!passwordComplete) {
      newErrors.password =
        "Complete every password requirement.";
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword =
        "Please confirm your password.";
    } else if (!passwordsMatch) {
      newErrors.confirmPassword =
        "Passwords do not match.";
    }

    return newErrors;
  }

  function handleNext() {
    let newErrors = {};

    if (step === 1) {
      newErrors = validateStepOne();
    }

    if (step === 2) {
      newErrors = validateStepTwo();
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setStep((current) => current + 1);

      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto",
      });
    }
  }

  function handleBack() {
    setErrors({});

    if (step === 1) {
      navigate(-1);
      return;
    }

    setStep((current) => current - 1);

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (step < 3) {
      handleNext();
      return;
    }

    const newErrors =
      validateStepThree();

    setErrors(newErrors);

    if (
      Object.keys(newErrors).length > 0 ||
      !canCreate
    ) {
      return;
    }

    setIsCreating(true);

    await new Promise((resolve) => {
      setTimeout(resolve, 700);
    });

    const sellerAccount = {
      role: "seller",
      username: form.username.trim(),
      storeName: form.storeName.trim(),
      email: form.email.trim(),
      mobile: form.mobile.trim(),

      address: {
        street: form.street.trim(),
        barangay: form.barangay.trim(),
        city: form.city.trim(),
        province: form.province.trim(),
        postalCode: form.postalCode,
        country: "Philippines",
      },
    };

    sessionStorage.setItem(
      "sellerAccount",
      JSON.stringify(sellerAccount)
    );

    sessionStorage.setItem(
      "userRole",
      "seller"
    );

    sessionStorage.setItem(
      "userEmail",
      sellerAccount.email
    );

    localStorage.setItem(
      "fitfusion-seller-account",
      JSON.stringify(sellerAccount)
    );

    localStorage.setItem(
      "fitfusion-current-user",
      JSON.stringify(sellerAccount)
    );

    navigate("/seller/dashboard", {
      replace: true,
    });
  }

  const stepInformation = {
    1: {
      number: "STEP 1 OF 3",
      title: "Create your seller identity.",
      first:
        "Enter your account, contact information, and required Store Name.",
      second:
        "Your Store Name will be assigned automatically to accepted product listings.",
    },

    2: {
      number: "STEP 2 OF 3",
      title: "Where is your store located?",
      first:
        "Enter each part of your store address separately.",
      second:
        "This information will be associated with your authenticated Seller account.",
    },

    3: {
      number: "STEP 3 OF 3",
      title: "Secure your seller account.",
      first:
        "Every password requirement is checked while you type.",
      second:
        "The account button remains disabled until all requirements are met.",
    },
  };

  return (
    <main className="seller-register-page">
      <section className="seller-register-card">
        <img
          src={fitFusionLogo}
          alt="FitFusion AI"
          className="seller-register-logo"
        />

        <header className="seller-register-header">
          <h1>Create your seller account</h1>

          <p>
            Selected role:{" "}
            <strong>Seller</strong>
            <span> • </span>

            <button
              type="button"
              onClick={() => navigate(-1)}
            >
              Change role
            </button>
          </p>
        </header>

        <div className="seller-register-progress">
          <ProgressStep
            number={1}
            label="Account & Store"
            currentStep={step}
          />

          <ProgressStep
            number={2}
            label="Store Address"
            currentStep={step}
          />

          <ProgressStep
            number={3}
            label="Account Security"
            currentStep={step}
          />
        </div>

        <div className="seller-register-content">
          <aside className="seller-register-panel">
            <div>
              <p className="seller-register-step-label">
                {
                  stepInformation[step]
                    .number
                }
              </p>

              <h2>
                {
                  stepInformation[step]
                    .title
                }
              </h2>

              <p>
                {
                  stepInformation[step]
                    .first
                }
              </p>

              <p>
                {
                  stepInformation[step]
                    .second
                }
              </p>
            </div>

            <div className="seller-register-role">
              <strong>SELLER ACCOUNT</strong>

              <span>
                Required fields are marked
                with an asterisk.
              </span>
            </div>
          </aside>

          <form
            className="seller-register-form"
            onSubmit={handleSubmit}
            noValidate
          >
            {step === 1 && (
              <>
                <FormHeading
                  eyebrow="ACCOUNT & STORE"
                  title="Tell us about your seller account."
                  description="The Store Name is required and will appear with every accepted listing."
                />

                <FormField
                  label="Username"
                  name="username"
                  placeholder="Enter username"
                  value={form.username}
                  error={errors.username}
                  onChange={handleChange}
                  required
                />

                <FormField
                  label="Store Name"
                  name="storeName"
                  placeholder="Enter your store name"
                  value={form.storeName}
                  error={errors.storeName}
                  onChange={handleChange}
                  required
                />

                <div className="seller-register-field-row">
                  <FormField
                    label="Email Address"
                    name="email"
                    type="email"
                    placeholder="seller@example.com"
                    value={form.email}
                    error={errors.email}
                    onChange={handleChange}
                    required
                  />

                  <FormField
                    label="Mobile Number"
                    name="mobile"
                    type="tel"
                    placeholder="+63 9XX XXX XXXX"
                    value={form.mobile}
                    error={errors.mobile}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="seller-register-note">
                  <strong>
                    SELLER REQUIREMENT
                  </strong>

                  <p>
                    Your authenticated Store Name
                    will be assigned automatically
                    to uploaded catalog products.
                  </p>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <FormHeading
                  eyebrow="STORE ADDRESS"
                  title="Enter your location details."
                  description="Each part of the address must be entered in its corresponding field."
                />

                <FormField
                  label="House No. / Building / Street"
                  name="street"
                  placeholder="Enter complete address line"
                  value={form.street}
                  error={errors.street}
                  onChange={handleChange}
                  required
                />

                <div className="seller-register-field-row">
                  <FormField
                    label="Barangay"
                    name="barangay"
                    placeholder="Enter barangay"
                    value={form.barangay}
                    error={errors.barangay}
                    onChange={handleChange}
                    required
                  />

                  <FormField
                    label="City / Municipality"
                    name="city"
                    placeholder="Enter city or municipality"
                    value={form.city}
                    error={errors.city}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="seller-register-field-row">
                  <FormField
                    label="Province"
                    name="province"
                    placeholder="Enter province"
                    value={form.province}
                    error={errors.province}
                    onChange={handleChange}
                    required
                  />

                  <FormField
                    label="Postal Code"
                    name="postalCode"
                    placeholder="Enter 4-digit postal code"
                    value={form.postalCode}
                    error={errors.postalCode}
                    onChange={handleChange}
                    inputMode="numeric"
                    maxLength={4}
                    required
                  />
                </div>

                <div className="seller-register-country">
                  <label htmlFor="seller-country">
                    Country
                  </label>

                  <input
                    id="seller-country"
                    value="Philippines"
                    disabled
                    readOnly
                  />
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <FormHeading
                  eyebrow="ACCOUNT SECURITY"
                  title="Create a secure password."
                  description="The checks and password confirmation update in real time."
                />

                <div className="seller-register-field-row">
                  <PasswordField
                    label="Password"
                    name="password"
                    value={form.password}
                    placeholder="Enter password"
                    show={showPassword}
                    onToggle={() =>
                      setShowPassword(
                        (current) =>
                          !current
                      )
                    }
                    onChange={handleChange}
                    error={errors.password}
                  />

                  <PasswordField
                    label="Confirm Password"
                    name="confirmPassword"
                    value={
                      form.confirmPassword
                    }
                    placeholder="Re-enter password"
                    show={
                      showConfirmPassword
                    }
                    onToggle={() =>
                      setShowConfirmPassword(
                        (current) =>
                          !current
                      )
                    }
                    onChange={handleChange}
                    error={
                      errors.confirmPassword
                    }
                  />
                </div>

                <div
                  className={`seller-password-match ${
                    !confirmStarted
                      ? "waiting"
                      : passwordsMatch
                        ? "matched"
                        : "not-matched"
                  }`}
                  aria-live="polite"
                >
                  <span>
                    {!confirmStarted
                      ? "✓"
                      : passwordsMatch
                        ? "✓"
                        : "×"}
                  </span>

                  <div>
                    <strong>
                      {!confirmStarted
                        ? "Confirm your password"
                        : passwordsMatch
                          ? "Passwords match"
                          : "Passwords do not match"}
                    </strong>

                    <p>
                      {!confirmStarted
                        ? "Re-enter your password to verify it."
                        : passwordsMatch
                          ? "Your password confirmation is correct."
                          : "Enter the same password in both fields."}
                    </p>
                  </div>
                </div>

                <section className="seller-password-checklist">
                  <h3>
                    PASSWORD REQUIREMENTS — LIVE
                  </h3>

                  <div className="seller-password-rule-grid">
                    <PasswordRule
                      passed={
                        passwordRules.length
                      }
                      text="At least 8 characters"
                    />

                    <PasswordRule
                      passed={
                        passwordRules.uppercase
                      }
                      text="One uppercase letter"
                    />

                    <PasswordRule
                      passed={
                        passwordRules.lowercase
                      }
                      text="One lowercase letter"
                    />

                    <PasswordRule
                      passed={
                        passwordRules.number
                      }
                      text="One number"
                    />

                    <PasswordRule
                      passed={
                        passwordRules.special
                      }
                      text="One special character"
                    />
                  </div>
                </section>

                {form.password &&
                  !passwordComplete && (
                    <div className="seller-security-message error">
                      <strong>
                        Password is incomplete.
                      </strong>

                      <span>
                        Complete every requirement
                        before creating the account.
                      </span>
                    </div>
                  )}

                {passwordComplete &&
                  passwordsMatch && (
                    <div className="seller-security-message success">
                      <strong>
                        Account security complete.
                      </strong>

                      <span>
                        You may now create your
                        Seller account.
                      </span>
                    </div>
                  )}
              </>
            )}

            <div className="seller-register-buttons">
              <button
                type="button"
                className="seller-register-back"
                onClick={handleBack}
              >
                Back
              </button>

              {step < 3 ? (
                <button
                  type="submit"
                  className="seller-register-next"
                >
                  {step === 1
                    ? "Next: Address"
                    : "Next: Security"}
                </button>
              ) : (
                <button
                  type="submit"
                  className="seller-register-next"
                  disabled={!canCreate}
                >
                  {isCreating
                    ? "Creating Account..."
                    : "Create Seller Account"}
                </button>
              )}
            </div>

            <p className="seller-register-counter">
              Step {step} of 3
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}

function ProgressStep({
  number,
  label,
  currentStep,
}) {
  let className =
    "seller-progress-item";

  if (number === currentStep) {
    className += " active";
  }

  if (number < currentStep) {
    className += " complete";
  }

  return (
    <div className={className}>
      <div className="seller-progress-number">
        {number < currentStep
          ? "✓"
          : number}
      </div>

      <span>{label}</span>
    </div>
  );
}

function FormHeading({
  eyebrow,
  title,
  description,
}) {
  return (
    <header className="seller-form-heading">
      <p>{eyebrow}</p>
      <h2>{title}</h2>
      <span>{description}</span>
    </header>
  );
}

function FormField({
  label,
  name,
  type = "text",
  value,
  placeholder,
  error,
  onChange,
  required,
  ...properties
}) {
  return (
    <div className="seller-register-field">
      <label htmlFor={name}>
        {label}
        {required ? " *" : ""}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        className={
          error ? "invalid" : ""
        }
        {...properties}
      />

      {error && (
        <p className="seller-field-error">
          <span>!</span>
          {error}
        </p>
      )}
    </div>
  );
}

function PasswordField({
  label,
  name,
  value,
  placeholder,
  show,
  onToggle,
  onChange,
  error,
}) {
  return (
    <div className="seller-register-field">
      <label htmlFor={name}>
        {label} *
      </label>

      <div
        className={`seller-password-field ${
          error ? "invalid" : ""
        }`}
      >
        <input
          id={name}
          name={name}
          type={
            show ? "text" : "password"
          }
          value={value}
          placeholder={placeholder}
          onChange={onChange}
          autoComplete="new-password"
        />

        <button
          type="button"
          onClick={onToggle}
          aria-label={
            show
              ? `Hide ${label.toLowerCase()}`
              : `Show ${label.toLowerCase()}`
          }
          title={
            show
              ? "Hide password"
              : "Show password"
          }
        >
          <EyeIcon hidden={!show} />
        </button>
      </div>

      {error && (
        <p className="seller-field-error">
          <span>!</span>
          {error}
        </p>
      )}
    </div>
  );
}

function PasswordRule({ passed, text }) {
  return (
    <div
      className={`seller-password-rule ${
        passed ? "passed" : ""
      }`}
    >
      <span>✓</span>
      <p>{text}</p>
    </div>
  );
}

function EyeIcon({ hidden }) {
  if (hidden) {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M3 3l18 18" />

        <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" />

        <path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5.5 0 9 5 9 5a16.6 16.6 0 0 1-3.1 3.7" />

        <path d="M6.6 6.7C4.3 8.2 3 10 3 10s3.5 5 9 5a9.8 9.8 0 0 0 3-.5" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5Z" />

      <circle
        cx="12"
        cy="12"
        r="2.5"
      />
    </svg>
  );
}

export default SellerSignupPage;