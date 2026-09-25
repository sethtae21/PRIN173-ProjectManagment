import { useState } from "react";
import { useNavigate } from "react-router-dom";
import fitFusionLogo from "../assets/fitfusion-logo.svg";
import "./SignupPage.css";

const initialForm = {
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

function SignupPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] =
    useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const passwordRules = {
    length: form.password.length >= 8,
    uppercase: /[A-Z]/.test(form.password),
    lowercase: /[a-z]/.test(form.password),
    number: /\d/.test(form.password),
    special: /[^A-Za-z0-9]/.test(form.password),
  };

  const passwordComplete = Object.values(
    passwordRules
  ).every(Boolean);

  const passwordsMatch =
    form.confirmPassword !== "" &&
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

    setForm((currentForm) => ({
      ...currentForm,
      [name]: updatedValue,
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: "",
    }));
  }

  function validateStepOne() {
    const newErrors = {};
    const mobile = form.mobile.replace(
      /[\s-]/g,
      ""
    );

    if (!form.username.trim()) {
      newErrors.username = "Username is required.";
    } else if (form.username.trim().length < 3) {
      newErrors.username =
        "Username must contain at least 3 characters.";
    }

    if (!form.email.trim()) {
      newErrors.email = "Email address is required.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.email.trim()
      )
    ) {
      newErrors.email =
        "Enter a valid email address.";
    }

    if (!form.mobile.trim()) {
      newErrors.mobile = "Mobile number is required.";
    } else if (
      !/^(09\d{9}|\+639\d{9})$/.test(mobile)
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
      newErrors.barangay = "Barangay is required.";
    }

    if (!form.city.trim()) {
      newErrors.city =
        "City or municipality is required.";
    }

    if (!form.province.trim()) {
      newErrors.province = "Province is required.";
    }

    if (!form.postalCode.trim()) {
      newErrors.postalCode =
        "Postal code is required.";
    } else if (!/^\d{4}$/.test(form.postalCode)) {
      newErrors.postalCode =
        "Postal code must contain exactly 4 digits.";
    }

    return newErrors;
  }

  function validateStepThree() {
    const newErrors = {};

    if (!form.password) {
      newErrors.password = "Password is required.";
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
      setStep((currentStep) => currentStep + 1);
      window.scrollTo(0, 0);
    }
  }

  function handleBack() {
    setErrors({});

    if (step === 1) {
      navigate("/login");
      return;
    }

    setStep((currentStep) => currentStep - 1);
    window.scrollTo(0, 0);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (step < 3) {
      handleNext();
      return;
    }

    const newErrors = validateStepThree();
    setErrors(newErrors);

    if (
      Object.keys(newErrors).length > 0 ||
      !canCreate
    ) {
      return;
    }

    setIsCreating(true);

    await new Promise((resolve) =>
      setTimeout(resolve, 700)
    );

    const account = {
      role: "shopper",
      username: form.username.trim(),
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
      "registeredAccount",
      JSON.stringify(account)
    );

    sessionStorage.setItem("userRole", "shopper");
    sessionStorage.setItem(
      "userEmail",
      form.email.trim()
    );

    navigate("/shopper/dashboard");
  }

  const information = {
    1: {
      number: "STEP 1 OF 3",
      title: "Let’s start with the basics.",
      first:
        "Only your account and contact details are requested on this step.",
      second:
        "Your address and password come later.",
    },
    2: {
      number: "STEP 2 OF 3",
      title: "Where should orders go?",
      first:
        "Each part of the address has its own field to prevent incomplete delivery information.",
      second:
        "You can return to the previous step anytime.",
    },
    3: {
      number: "STEP 3 OF 3",
      title: "Secure your account.",
      first:
        "Your password is checked as you type.",
      second:
        "Create Account stays disabled until every requirement is satisfied.",
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
          <h1>Create your account</h1>

          <p>
            Selected role: Registered User
            <span> • </span>

            <button
              type="button"
              onClick={() => navigate("/login")}
            >
              Change role
            </button>
          </p>
        </header>

        <div className="signup-progress">
          <ProgressStep
            number={1}
            label="Account & Contact"
            currentStep={step}
          />

          <ProgressStep
            number={2}
            label="Delivery Address"
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

              <h2>{information[step].title}</h2>

              <p>{information[step].first}</p>
              <p>{information[step].second}</p>
            </div>

            <div className="signup-role-box">
              <strong>REGISTERED SHOPPER</strong>
              <span>
                Required fields are marked with an
                asterisk.
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
                  eyebrow="ACCOUNT & CONTACT"
                  title="Tell us how to identify and contact you."
                  description="This information will be used for your account and order updates."
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
                  <strong>REGISTERED SHOPPER</strong>

                  <p>
                    A Store Name is not requested because
                    this account is for shopping.
                  </p>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <FormHeading
                  eyebrow="DELIVERY ADDRESS"
                  title="Enter each location detail separately."
                  description="Used as the default delivery address during checkout."
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
                  <label>Country</label>
                  <input
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
                  description="The checklist updates in real time while you type."
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
                    value={form.confirmPassword}
                    placeholder="Re-enter password"
                    show={showConfirmPassword}
                    onToggle={() =>
                      setShowConfirmPassword(
                        (current) => !current
                      )
                    }
                    onChange={handleChange}
                    error={errors.confirmPassword}
                  />
                </div>

                <div className="password-checklist">
                  <h3>
                    PASSWORD REQUIREMENTS — LIVE
                  </h3>

                  <div className="password-rule-grid">
                    <PasswordRule
                      passed={passwordRules.length}
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
                      passed={passwordRules.number}
                      text="One number"
                    />

                    <PasswordRule
                      passed={passwordRules.special}
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
                        Registration remains blocked
                        until every check passes.
                      </span>
                    </div>
                  )}

                {passwordComplete &&
                  form.confirmPassword &&
                  !passwordsMatch && (
                    <div className="security-message error">
                      <strong>
                        Passwords do not match.
                      </strong>

                      <span>
                        Enter the same password in both
                        fields.
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
                        You may now create your account.
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
                    : "Create Account"}
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
        className={error ? "invalid" : ""}
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
      <label htmlFor={name}>{label} *</label>

      <div
        className={`password-field ${
          error ? "invalid" : ""
        }`}
      >
        <input
          id={name}
          name={name}
          type={show ? "text" : "password"}
          value={value}
          placeholder={placeholder}
          onChange={onChange}
        />

        <button
          type="button"
          onClick={onToggle}
          aria-label={
            show ? "Hide password" : "Show password"
          }
        >
          {show ? "◉" : "◌"}
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
      <span>{passed ? "✓" : "○"}</span>
      <p>{text}</p>
    </div>
  );
}

export default SignupPage;