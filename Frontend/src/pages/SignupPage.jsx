import { useState } from "react";
import { useNavigate } from "react-router-dom";
import fitFusionLogo from "../assets/fitfusion-logo.svg";
import "./css/SignupPage.css";

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

function SignupPage({
  accountRole = "shopper",
}) {
  const navigate = useNavigate();

  const isSeller = accountRole === "seller";

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

    if (isSeller && !form.storeName.trim()) {
      newErrors.storeName =
        "Store Name is required for Seller accounts.";
    } else if (
      isSeller &&
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
      navigate("/login");
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

    const account = {
      role: isSeller ? "seller" : "shopper",
      username: form.username.trim(),
      email: form.email.trim(),
      mobile: form.mobile.trim(),

      ...(isSeller
        ? {
            storeName:
              form.storeName.trim(),
          }
        : {}),

      address: {
        street: form.street.trim(),
        barangay: form.barangay.trim(),
        city: form.city.trim(),
        province: form.province.trim(),
        postalCode: form.postalCode,
        country: "Philippines",
      },
    };

    if (isSeller) {
      sessionStorage.setItem(
        "sellerAccount",
        JSON.stringify(account)
      );

      localStorage.setItem(
        "fitfusion-seller-account",
        JSON.stringify(account)
      );
    } else {
      sessionStorage.setItem(
        "registeredAccount",
        JSON.stringify(account)
      );

      localStorage.setItem(
        "fitfusion-shopper-account",
        JSON.stringify(account)
      );
    }

    sessionStorage.setItem(
      "userRole",
      account.role
    );

    sessionStorage.setItem(
      "userEmail",
      account.email
    );

    localStorage.setItem(
      "fitfusion-current-user",
      JSON.stringify(account)
    );

    navigate(
      isSeller
        ? "/seller/dashboard"
        : "/shopper/dashboard",
      { replace: true }
    );
  }

  const information = {
    1: {
      number: "STEP 1 OF 3",

      title: isSeller
        ? "Create your seller identity."
        : "Let’s start with the basics.",

      first: isSeller
        ? "Enter your account, contact, and required Store Name."
        : "Only your account and contact details are requested on this step.",

      second:
        "Your address and password will be entered in the next steps.",
    },

    2: {
      number: "STEP 2 OF 3",

      title: isSeller
        ? "Where is your store located?"
        : "Where should orders go?",

      first: isSeller
        ? "This address identifies your Seller account and store location."
        : "This address will be used as your default delivery address.",

      second:
        "Enter every part of the address in its corresponding field.",
    },

    3: {
      number: "STEP 3 OF 3",
      title: "Secure your account.",

      first:
        "Every password requirement is checked while you type.",

      second:
        "The account button remains disabled until the passwords match.",
    },
  };

  return (
    <main className="signup-page">
      <section className="signup-card">
        <img
          src={fitFusionLogo}
          alt="FitFusion AI"
          className="signup-logo"
        />

        <header className="signup-header">
          <h1>
            {isSeller
              ? "Create your seller account"
              : "Create your shopper account"}
          </h1>

          <p>
            Selected role:{" "}
            <strong>
              {isSeller
                ? "Seller"
                : "Registered Shopper"}
            </strong>

            <span> • </span>

            <button
              type="button"
              onClick={() =>
                navigate("/login")
              }
            >
              Change role
            </button>
          </p>
        </header>

        <div className="signup-progress">
          <ProgressStep
            number={1}
            label={
              isSeller
                ? "Account & Store"
                : "Account & Contact"
            }
            currentStep={step}
          />

          <ProgressStep
            number={2}
            label="Address"
            currentStep={step}
          />

          <ProgressStep
            number={3}
            label="Account Security"
            currentStep={step}
          />
        </div>

        <div className="signup-main-content">
          <aside className="signup-side-panel">
            <div>
              <p className="signup-step-label">
                {information[step].number}
              </p>

              <h2>
                {information[step].title}
              </h2>

              <p>
                {information[step].first}
              </p>

              <p>
                {information[step].second}
              </p>
            </div>

            <div className="signup-role-box">
              <strong>
                {isSeller
                  ? "SELLER ACCOUNT"
                  : "REGISTERED SHOPPER"}
              </strong>

              <span>
                Required fields are marked with
                an asterisk.
              </span>
            </div>
          </aside>

          <form
            className="signup-form"
            onSubmit={handleSubmit}
            noValidate
          >
            {step === 1 && (
              <>
                <FormHeading
                  eyebrow={
                    isSeller
                      ? "ACCOUNT & STORE"
                      : "ACCOUNT & CONTACT"
                  }
                  title={
                    isSeller
                      ? "Tell us about your seller account."
                      : "Tell us how to identify and contact you."
                  }
                  description={
                    isSeller
                      ? "The Store Name is required and will be assigned automatically to uploaded products."
                      : "This information will be used for your account and order updates."
                  }
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

                {isSeller && (
                  <FormField
                    label="Store Name"
                    name="storeName"
                    placeholder="Enter your store name"
                    value={form.storeName}
                    error={errors.storeName}
                    onChange={handleChange}
                    required
                  />
                )}

                <div className="signup-field-row">
                  <FormField
                    label="Email Address"
                    name="email"
                    type="email"
                    placeholder="name@example.com"
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

                <div className="signup-note">
                  <strong>
                    {isSeller
                      ? "SELLER REQUIREMENT"
                      : "REGISTERED SHOPPER"}
                  </strong>

                  <p>
                    {isSeller
                      ? "Your Store Name will be displayed with every accepted product listing."
                      : "A Store Name is not requested because this account is for shopping."}
                  </p>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <FormHeading
                  eyebrow={
                    isSeller
                      ? "STORE ADDRESS"
                      : "DELIVERY ADDRESS"
                  }
                  title="Enter each location detail separately."
                  description={
                    isSeller
                      ? "This information will be associated with your authenticated Seller account."
                      : "This information will be used as your default delivery address."
                  }
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

                <div className="signup-field-row">
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

                <div className="signup-field-row">
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

                <div className="signup-country">
                  <label htmlFor="country">
                    Country
                  </label>

                  <input
                    id="country"
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

                <div className="signup-field-row">
                  <PasswordField
                    label="Password"
                    name="password"
                    value={form.password}
                    placeholder="Enter password"
                    show={showPassword}
                    onToggle={() =>
                      setShowPassword(
                        (current) => !current
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
                        (current) => !current
                      )
                    }
                    onChange={handleChange}
                    error={
                      errors.confirmPassword
                    }
                  />
                </div>

                <div
                  className={`password-match-message ${
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

                <div className="password-checklist">
                  <h3>
                    PASSWORD REQUIREMENTS — LIVE
                  </h3>

                  <div className="password-rule-grid">
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
                </div>

                {form.password &&
                  !passwordComplete && (
                    <div className="security-message error">
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
                    <div className="security-message success">
                      <strong>
                        Account security complete.
                      </strong>

                      <span>
                        You may now create your
                        account.
                      </span>
                    </div>
                  )}
              </>
            )}

            <div className="signup-buttons">
              <button
                type="button"
                className="signup-back"
                onClick={handleBack}
              >
                Back
              </button>

              {step < 3 ? (
                <button
                  type="submit"
                  className="signup-next"
                >
                  {step === 1
                    ? "Next: Address"
                    : "Next: Security"}
                </button>
              ) : (
                <button
                  type="submit"
                  className="signup-next"
                  disabled={!canCreate}
                >
                  {isCreating
                    ? "Creating Account..."
                    : isSeller
                      ? "Create Seller Account"
                      : "Create Shopper Account"}
                </button>
              )}
            </div>

            <p className="signup-counter">
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
  let className = "progress-item";

  if (number === currentStep) {
    className += " active";
  }

  if (number < currentStep) {
    className += " complete";
  }

  return (
    <div className={className}>
      <div className="progress-number">
        {number < currentStep ? "✓" : number}
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
    <header className="form-heading">
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
    <div className="signup-field">
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
        <p className="field-error">
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
    <div className="signup-field">
      <label htmlFor={name}>
        {label} *
      </label>

      <div
        className={`password-field ${
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
          aria-pressed={show}
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
        <p className="field-error">
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
      className={`password-rule ${
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

export default SignupPage;