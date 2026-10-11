
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./css/EditAccountPage.css";

const PROVINCES = [
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

const DEFAULT_ACCOUNT = {
  username: "karolshopper",
  fullName: "Karol Dein Tamo",
  email: "karol@example.com",
  mobile: "09123456789",
  address: {
    street: "123 Rizal Street",
    barangay: "San Antonio",
    city: "Makati City",
    province: "Metro Manila",
    postalCode: "1203",
  },
};

const emptyPassword = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

function properCase(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(
      /(^|[\s'-])([a-zà-öø-ÿ])/gu,
      (_, separator, letter) =>
        separator + letter.toUpperCase()
    );
}

function normalizeAccount(raw = {}) {
  const source =
    raw && typeof raw === "object" ? raw : {};

  const address =
    source.address &&
    typeof source.address === "object"
      ? source.address
      : {};

  const combinedBarangayCity =
    source.barangayCity ||
    (typeof source.barangay === "string"
      ? source.barangay
      : "");

  const combinedParts = String(combinedBarangayCity)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const legacyBarangay =
    combinedParts.length > 1
      ? combinedParts.slice(0, -1).join(", ")
      : "";

  const legacyCity =
    combinedParts.length > 1
      ? combinedParts[combinedParts.length - 1]
      : combinedParts[0] || "";

  return {
    ...DEFAULT_ACCOUNT,
    ...source,

    username:
      source.username ||
      DEFAULT_ACCOUNT.username,

    fullName:
      source.fullName ||
      [
        source.firstName,
        source.middleName,
        source.lastName,
      ]
        .filter(Boolean)
        .join(" ") ||
      DEFAULT_ACCOUNT.fullName,

    email:
      source.email ||
      DEFAULT_ACCOUNT.email,

    mobile:
      source.mobile ||
      source.mobileNumber ||
      source.phone ||
      DEFAULT_ACCOUNT.mobile,

    address: {
      street:
        address.street ||
        source.streetAddress ||
        source.street ||
        (typeof source.address === "string"
          ? source.address
          : "") ||
        DEFAULT_ACCOUNT.address.street,

      barangay:
        address.barangay ||
        legacyBarangay ||
        DEFAULT_ACCOUNT.address.barangay,

      city:
        address.city ||
        source.city ||
        legacyCity ||
        DEFAULT_ACCOUNT.address.city,

      province:
        address.province ||
        source.province ||
        DEFAULT_ACCOUNT.address.province,

      postalCode: String(
        address.postalCode ||
        source.postalCode ||
        source.zipCode ||
        DEFAULT_ACCOUNT.address.postalCode
      ),
    },
  };
}

function readStoredAccount() {
  const keys = [
    "fitfusion-current-user",
    "registeredAccount",
    "fitfusion-shopper-account",
  ];

  for (const key of keys) {
    try {
      const saved =
        localStorage.getItem(key) ||
        sessionStorage.getItem(key);

      if (!saved) continue;

      const parsed = JSON.parse(saved);

      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed) &&
        String(parsed.role || "shopper").toLowerCase() !==
          "seller"
      ) {
        return normalizeAccount(parsed);
      }
    } catch {
      // Continue checking the remaining storage keys.
    }
  }

  return normalizeAccount(DEFAULT_ACCOUNT);
}

function createProfileData(account) {
  const normalized = normalizeAccount(account);

  return {
    username: normalized.username,
    fullName: normalized.fullName,
    email: normalized.email,
    mobile: normalized.mobile,
    street: normalized.address.street,
    barangay: normalized.address.barangay,
    city: normalized.address.city,
    province: normalized.address.province,
    postalCode: normalized.address.postalCode,
  };
}

function saveStoredAccount(account, previousAccount) {
  const normalized = normalizeAccount(account);
  const serialized = JSON.stringify(normalized);

  localStorage.setItem(
    "fitfusion-current-user",
    serialized
  );

  localStorage.setItem(
    "registeredAccount",
    serialized
  );

  localStorage.setItem(
    "fitfusion-shopper-account",
    serialized
  );

  sessionStorage.setItem(
    "registeredAccount",
    serialized
  );

  try {
    const storedUsers = JSON.parse(
      localStorage.getItem("fitfusion-users") || "[]"
    );

    if (Array.isArray(storedUsers)) {
      const previousEmail = String(
        previousAccount.email || ""
      ).toLowerCase();

      const updatedUsers = storedUsers.map((user) => {
        const sameId =
          normalized.id &&
          user.id === normalized.id;

        const sameEmail =
          String(user.email || "").toLowerCase() ===
          previousEmail;

        if (
          String(user.role || "shopper").toLowerCase() !==
          "seller" &&
          (sameId || sameEmail)
        ) {
          return {
            ...user,
            ...normalized,
          };
        }

        return user;
      });

      localStorage.setItem(
        "fitfusion-users",
        JSON.stringify(updatedUsers)
      );
    }
  } catch {
    // The primary account has already been saved.
  }

  window.dispatchEvent(
    new Event("fitfusion-account-updated")
  );
}

function FormField({
  label,
  name,
  value,
  error,
  onChange,
  type = "text",
  full = false,
  ...props
}) {
  return (
    <label
      className={`edit-account-field ${
        full ? "edit-account-full-field" : ""
      }`}
    >
      <span>
        {label} <strong>*</strong>
      </span>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className={error ? "input-error" : ""}
        aria-invalid={Boolean(error)}
        {...props}
      />

      {error && (
        <small className="edit-account-error">
          {error}
        </small>
      )}
    </label>
  );
}

function ProvinceField({
  value,
  error,
  onChange,
}) {
  return (
    <label className="edit-account-field">
      <span>
        Province <strong>*</strong>
      </span>

      <select
        name="province"
        value={value}
        onChange={onChange}
        className={error ? "input-error" : ""}
        aria-invalid={Boolean(error)}
        autoComplete="address-level1"
      >
        <option value="">
          Select your province
        </option>

        {PROVINCES.map((province) => (
          <option
            key={province}
            value={province}
          >
            {province}
          </option>
        ))}
      </select>

      {error && (
        <small className="edit-account-error">
          {error}
        </small>
      )}
    </label>
  );
}

function PasswordField({
  label,
  name,
  value,
  error,
  onChange,
  visible,
  onToggle,
  autoComplete,
}) {
  return (
    <div className="edit-account-field">
      <label htmlFor={`edit-${name}`}>
        {label} <strong>*</strong>
      </label>

      <div
        className={`edit-account-password-input ${
          error ? "input-error" : ""
        }`}
      >
        <input
          id={`edit-${name}`}
          type={visible ? "text" : "password"}
          name={name}
          value={value}
          onChange={onChange}
          placeholder="Enter password"
          autoComplete={autoComplete}
        />

        <button
          type="button"
          onClick={onToggle}
          aria-label={
            visible
              ? `Hide ${label}`
              : `Show ${label}`
          }
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>

      {error && (
        <small className="edit-account-error">
          {error}
        </small>
      )}
    </div>
  );
}

function PasswordRule({ passed, label }) {
  return (
    <div
      className={`edit-account-rule ${
        passed ? "passed" : ""
      }`}
    >
      <span aria-hidden="true">
        {passed ? "✓" : "○"}
      </span>
      <p>{label}</p>
    </div>
  );
}

function EditAccountPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [account, setAccount] = useState(
    readStoredAccount
  );

  const [step, setStep] = useState(
    location.hash === "#password" ? 2 : 1
  );

  const [profileData, setProfileData] = useState(
    () => createProfileData(readStoredAccount())
  );

  const [passwordData, setPasswordData] = useState(
    emptyPassword
  );

  const [profileErrors, setProfileErrors] =
    useState({});

  const [passwordErrors, setPasswordErrors] =
    useState({});

  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] =
    useState("info");

  const [showPasswords, setShowPasswords] =
    useState({
      currentPassword: false,
      newPassword: false,
      confirmPassword: false,
    });

  useEffect(() => {
    setStep(
      location.hash === "#password" ? 2 : 1
    );
  }, [location.hash]);

  const passwordRules = useMemo(
    () => ({
      minimumLength:
        passwordData.newPassword.length >= 8,

      uppercase:
        /[A-Z]/.test(passwordData.newPassword),

      lowercase:
        /[a-z]/.test(passwordData.newPassword),

      number:
        /\d/.test(passwordData.newPassword),

      specialCharacter:
        /[^A-Za-z0-9]/.test(
          passwordData.newPassword
        ),
    }),
    [passwordData.newPassword]
  );

  const passwordRequirementsPassed =
    Object.values(passwordRules).every(Boolean);

  function changeStep(nextStep) {
    setStep(nextStep);
    setNotice("");
    setProfileErrors({});
    setPasswordErrors({});

    navigate(
      nextStep === 1
        ? "/shopper/account/edit#profile"
        : "/shopper/account/edit#password",
      { replace: true }
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleProfileChange(event) {
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

    setProfileData((current) => ({
      ...current,
      [name]: value,
    }));

    setProfileErrors((current) => ({
      ...current,
      [name]: "",
    }));

    setNotice("");
  }

  function validateProfile() {
    const errors = {};

    const fullName = properCase(
      profileData.fullName
    );

    if (
      profileData.username.trim().length < 3
    ) {
      errors.username =
        "Username must contain at least 3 characters.";
    }

    if (!fullName) {
      errors.fullName =
        "Full name is required.";
    } else if (
      !/^[A-Za-zÀ-ÖØ-öø-ÿÑñ.' -]+$/u.test(fullName)
    ) {
      errors.fullName =
        "Full name may only contain letters, spaces, apostrophes, periods, and hyphens.";
    } else if (
      fullName.split(" ").filter(Boolean).length < 2
    ) {
      errors.fullName =
        "Please enter at least your first name and surname.";
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        profileData.email.trim()
      )
    ) {
      errors.email =
        "Please enter a valid email address.";
    }

    if (
      !/^09\d{9}$/.test(profileData.mobile)
    ) {
      errors.mobile =
        "Enter an 11-digit mobile number beginning with 09.";
    }

    if (!profileData.street.trim()) {
      errors.street =
        "Please enter your house number and street.";
    }

    if (!profileData.barangay.trim()) {
      errors.barangay =
        "Please enter your barangay.";
    }

    if (!profileData.city.trim()) {
      errors.city =
        "Please enter your city or municipality.";
    }

    if (!profileData.province) {
      errors.province =
        "Please select your province.";
    } else if (
      !PROVINCES.includes(profileData.province)
    ) {
      errors.province =
        "Please select a valid Philippine province.";
    }

    if (
      !/^\d{4}$/.test(profileData.postalCode)
    ) {
      errors.postalCode =
        "Postal code must contain exactly 4 digits.";
    }

    setProfileErrors(errors);

    return Object.keys(errors).length === 0;
  }

  function handleProfileSubmit(event) {
    event.preventDefault();

    if (!validateProfile()) {
      setNoticeType("error");
      setNotice(
        "Please correct the highlighted profile fields."
      );
      return;
    }

    const fullName = properCase(
      profileData.fullName
    );

    const nameParts = fullName.split(/\s+/);

    const address = {
      street: profileData.street.trim(),
      barangay: profileData.barangay.trim(),
      city: profileData.city.trim(),
      province: profileData.province,
      postalCode: profileData.postalCode,
    };

    const updatedAccount = {
      ...account,
      username: profileData.username.trim(),
      fullName,
      firstName: nameParts[0] || "",
      email: profileData.email
        .trim()
        .toLowerCase(),
      mobile: profileData.mobile,
      mobileNumber: profileData.mobile,
      phone: profileData.mobile,
      address,
      street: address.street,
      streetAddress: address.street,
      barangay: address.barangay,
      city: address.city,
      barangayCity: [
        address.barangay,
        address.city,
      ].join(", "),
      province: address.province,
      postalCode: address.postalCode,
      updatedAt: new Date().toISOString(),
    };

    try {
      saveStoredAccount(
        updatedAccount,
        account
      );

      setAccount(updatedAccount);

      setProfileData(
        createProfileData(updatedAccount)
      );

      changeStep(2);

      setNoticeType("success");
      setNotice(
        "Profile saved successfully. You may now proceed to account security."
      );
    } catch (error) {
      console.error(
        "Profile update failed:",
        error
      );

      setNoticeType("error");
      setNotice(
        "Unable to save your profile. Please try again."
      );
    }
  }

  function resetProfile() {
    const savedAccount =
      readStoredAccount();

    setAccount(savedAccount);
    setProfileData(
      createProfileData(savedAccount)
    );

    setProfileErrors({});
    setNoticeType("info");
    setNotice("Profile fields were reset.");
  }

  function handlePasswordChange(event) {
    const { name, value } = event.target;

    setPasswordData((current) => ({
      ...current,
      [name]: value,
    }));

    setPasswordErrors((current) => ({
      ...current,
      [name]: "",
    }));

    setNotice("");
  }

  function togglePassword(name) {
    setShowPasswords((current) => ({
      ...current,
      [name]: !current[name],
    }));
  }

  function validatePassword() {
    const errors = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword =
        "Please enter your current password.";
    }

    if (!passwordData.newPassword) {
      errors.newPassword =
        "Please enter a new password.";
    } else if (!passwordRequirementsPassed) {
      errors.newPassword =
        "Your new password must meet all five requirements.";
    } else if (
      passwordData.newPassword ===
      passwordData.currentPassword
    ) {
      errors.newPassword =
        "Your new password must be different from your current password.";
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword =
        "Please confirm your new password.";
    } else if (
      passwordData.confirmPassword !==
      passwordData.newPassword
    ) {
      errors.confirmPassword =
        "The new password and confirmation do not match.";
    }

    setPasswordErrors(errors);

    return Object.keys(errors).length === 0;
  }

  function handlePasswordSubmit(event) {
    event.preventDefault();

    if (!validatePassword()) {
      setNoticeType("error");
      setNotice(
        "Please correct the highlighted password fields."
      );
      return;
    }

    // Frontend-only validation.
    // Actual credential verification and password
    // changes must be performed by the backend.
    setNoticeType("info");
    setNotice(
      "Password validation passed. Actual password changes will become available after backend authentication is integrated."
    );

    setPasswordData({
      ...emptyPassword,
    });

    setPasswordErrors({});
  }

  function clearPasswordForm() {
    setPasswordData({
      ...emptyPassword,
    });

    setPasswordErrors({});
    setNotice("");
  }

  return (
    <main className="edit-account-page">
      <section className="edit-account-content">
        <header className="edit-account-header">
          <div>
            <button
              type="button"
              className="edit-account-back-link"
              onClick={() =>
                navigate("/shopper/account")
              }
            >
              ← Back to Account
            </button>

            <h1>Edit Account</h1>

            <p>
              Update your personal information
              and account security one step
              at a time.
            </p>
          </div>
        </header>

        <div className="edit-account-body">
          {/* STEP PROGRESS */}
          <section className="edit-account-progress">
            <button
              type="button"
              className={`edit-account-step ${
                step === 1
                  ? "active"
                  : "completed"
              }`}
              onClick={() => changeStep(1)}
            >
              <span>1</span>

              <div>
                <strong>Profile Details</strong>
                <small>
                  Personal and delivery information
                </small>
              </div>
            </button>

            <div
              className={`edit-account-progress-line ${
                step === 2 ? "active" : ""
              }`}
            />

            <button
              type="button"
              className={`edit-account-step ${
                step === 2 ? "active" : ""
              }`}
              onClick={() => changeStep(2)}
            >
              <span>2</span>

              <div>
                <strong>Account Security</strong>
                <small>
                  Change your account password
                </small>
              </div>
            </button>
          </section>

          {notice && (
            <div
              className={`edit-account-notice ${noticeType}`}
              role={
                noticeType === "error"
                  ? "alert"
                  : "status"
              }
            >
              {notice}
            </div>
          )}

          {/* STEP 1: PROFILE AND ADDRESS */}
          {step === 1 && (
            <form
              className="edit-account-card"
              onSubmit={handleProfileSubmit}
              noValidate
            >
              <div className="edit-account-card-heading">
                <div>
                  <p>STEP 1 OF 2</p>

                  <h2>
                    Profile and Delivery Information
                  </h2>

                  <span>
                    Update your personal and delivery
                    information before continuing to
                    account security.
                  </span>
                </div>

                <div className="edit-account-number">
                  1
                </div>
              </div>

              <div className="edit-account-divider" />

              <section className="edit-account-section">
                <p className="edit-account-section-label">
                  PERSONAL INFORMATION
                </p>

                <div className="edit-account-form-grid">
                  <FormField
                    label="Username"
                    name="username"
                    value={profileData.username}
                    error={profileErrors.username}
                    onChange={handleProfileChange}
                    placeholder="Enter username"
                    autoComplete="username"
                  />

                  <FormField
                    label="Full Name"
                    name="fullName"
                    value={profileData.fullName}
                    error={profileErrors.fullName}
                    onChange={handleProfileChange}
                    onBlur={() =>
                      setProfileData((current) => ({
                        ...current,
                        fullName: properCase(
                          current.fullName
                        ),
                      }))
                    }
                    placeholder="Enter complete name"
                    autoComplete="name"
                  />

                  <FormField
                    label="Email Address"
                    name="email"
                    type="email"
                    value={profileData.email}
                    error={profileErrors.email}
                    onChange={handleProfileChange}
                    placeholder="name@example.com"
                    autoComplete="email"
                  />

                  <FormField
                    label="Mobile Number"
                    name="mobile"
                    type="tel"
                    value={profileData.mobile}
                    error={profileErrors.mobile}
                    onChange={handleProfileChange}
                    placeholder="09XXXXXXXXX"
                    autoComplete="tel"
                    maxLength={11}
                    inputMode="numeric"
                  />
                </div>
              </section>

              <div className="edit-account-divider" />

              <section className="edit-account-section">
                <p className="edit-account-section-label">
                  DELIVERY ADDRESS
                </p>

                <div className="edit-account-form-grid">
                  <FormField
                    label="House Number and Street"
                    name="street"
                    value={profileData.street}
                    error={profileErrors.street}
                    onChange={handleProfileChange}
                    placeholder="Enter house number and street"
                    autoComplete="address-line1"
                    full
                  />

                  <FormField
                    label="Barangay"
                    name="barangay"
                    value={profileData.barangay}
                    error={profileErrors.barangay}
                    onChange={handleProfileChange}
                    placeholder="Enter barangay"
                    autoComplete="address-line2"
                  />

                  <FormField
                    label="City / Municipality"
                    name="city"
                    value={profileData.city}
                    error={profileErrors.city}
                    onChange={handleProfileChange}
                    placeholder="Enter city or municipality"
                    autoComplete="address-level2"
                  />

                  <ProvinceField
                    value={profileData.province}
                    error={profileErrors.province}
                    onChange={handleProfileChange}
                  />

                  <FormField
                    label="Postal Code"
                    name="postalCode"
                    value={profileData.postalCode}
                    error={profileErrors.postalCode}
                    onChange={handleProfileChange}
                    placeholder="0000"
                    autoComplete="postal-code"
                    maxLength={4}
                    inputMode="numeric"
                  />
                </div>
              </section>

              <div className="edit-account-form-actions">
                <button
                  type="button"
                  className="edit-account-secondary-button"
                  onClick={resetProfile}
                >
                  Reset
                </button>

                <button
                  type="submit"
                  className="edit-account-primary-button"
                >
                  Save and Continue
                  <span aria-hidden="true">
                    →
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: ACCOUNT SECURITY */}
          {step === 2 && (
            <form
              className="edit-account-card"
              onSubmit={handlePasswordSubmit}
              noValidate
            >
              <div className="edit-account-card-heading">
                <div>
                  <p>STEP 2 OF 2</p>

                  <h2>Account Security</h2>

                  <span>
                    Enter your current password
                    and create a secure new password.
                  </span>
                </div>

                <div className="edit-account-number">
                  2
                </div>
              </div>

              <div className="edit-account-divider" />

              <section className="edit-account-section">
                <PasswordField
                  label="Current Password"
                  name="currentPassword"
                  value={
                    passwordData.currentPassword
                  }
                  error={
                    passwordErrors.currentPassword
                  }
                  onChange={handlePasswordChange}
                  visible={
                    showPasswords.currentPassword
                  }
                  onToggle={() =>
                    togglePassword(
                      "currentPassword"
                    )
                  }
                  autoComplete="current-password"
                />

                <PasswordField
                  label="New Password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  error={passwordErrors.newPassword}
                  onChange={handlePasswordChange}
                  visible={
                    showPasswords.newPassword
                  }
                  onToggle={() =>
                    togglePassword("newPassword")
                  }
                  autoComplete="new-password"
                />

                <PasswordField
                  label="Confirm New Password"
                  name="confirmPassword"
                  value={
                    passwordData.confirmPassword
                  }
                  error={
                    passwordErrors.confirmPassword
                  }
                  onChange={handlePasswordChange}
                  visible={
                    showPasswords.confirmPassword
                  }
                  onToggle={() =>
                    togglePassword(
                      "confirmPassword"
                    )
                  }
                  autoComplete="new-password"
                />
              </section>

              <section className="edit-account-requirements">
                <h3>Password requirements</h3>

                <div className="edit-account-rules">
                  <PasswordRule
                    passed={
                      passwordRules.minimumLength
                    }
                    label="At least 8 characters"
                  />

                  <PasswordRule
                    passed={passwordRules.uppercase}
                    label="One uppercase letter"
                  />

                  <PasswordRule
                    passed={passwordRules.lowercase}
                    label="One lowercase letter"
                  />

                  <PasswordRule
                    passed={passwordRules.number}
                    label="One number"
                  />

                  <PasswordRule
                    passed={
                      passwordRules.specialCharacter
                    }
                    label="One special character"
                  />
                </div>
              </section>

              <div className="edit-account-info">
                <span>i</span>

                <p>
                  Password changes require backend
                  authentication. During frontend
                  development, this form validates
                  password requirements without
                  storing credentials.
                </p>
              </div>

              <div className="edit-account-form-actions">
                <button
                  type="button"
                  className="edit-account-secondary-button"
                  onClick={() => changeStep(1)}
                >
                  ← Back
                </button>

                <button
                  type="button"
                  className="edit-account-clear-button"
                  onClick={clearPasswordForm}
                >
                  Clear
                </button>

                <button
                  type="submit"
                  className="edit-account-primary-button"
                >
                  Validate Password
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

export default EditAccountPage;
