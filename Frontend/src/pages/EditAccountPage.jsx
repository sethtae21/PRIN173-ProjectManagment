import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";

import fitFusionLogo from "../assets/fitfusion-logo.svg";
import "./css/EditAccountPage.css";

const DEFAULT_ACCOUNT = {
  username: "karolshopper",
  fullName: "Karol Dein Tamo",
  firstName: "Karol",
  lastName: "Tamo",
  email: "karol@example.com",
  phone: "09123456789",
  address: "123 Rizal Street",
  barangay: "Barangay San Antonio, Makati City",
  barangayCity:
    "Barangay San Antonio, Makati City",
  city: "",
  province: "Metro Manila",
  postalCode: "1203",
  password: "Password123!",
};

function normalizeAccount(rawAccount = {}) {
  const rawAddress = rawAccount.address;

  const addressObject =
    rawAddress &&
    typeof rawAddress === "object"
      ? rawAddress
      : {};

  const street =
    typeof rawAddress === "string"
      ? rawAddress
      : addressObject.street ||
        addressObject.houseStreet ||
        addressObject.houseNumberStreet ||
        addressObject.addressLine ||
        rawAccount.street ||
        rawAccount.houseStreet ||
        "";

  const separateBarangay =
    rawAccount.barangay ||
    addressObject.barangay ||
    "";

  const separateCity =
    rawAccount.city ||
    addressObject.city ||
    "";

  const barangayCity =
    rawAccount.barangayCity ||
    addressObject.barangayCity ||
    [separateBarangay, separateCity]
      .filter(Boolean)
      .join(", ");

  const province =
    rawAccount.province ||
    addressObject.province ||
    "";

  const postalCode =
    rawAccount.postalCode ||
    addressObject.postalCode ||
    addressObject.zipCode ||
    "";

  const generatedFullName =
    rawAccount.fullName ||
    [
      rawAccount.firstName,
      rawAccount.middleName,
      rawAccount.lastName,
    ]
      .filter(Boolean)
      .join(" ");

  return {
    ...DEFAULT_ACCOUNT,
    ...rawAccount,

    fullName:
      generatedFullName ||
      DEFAULT_ACCOUNT.fullName,

    address:
      street || DEFAULT_ACCOUNT.address,

    barangay:
      barangayCity ||
      DEFAULT_ACCOUNT.barangay,

    barangayCity:
      barangayCity ||
      DEFAULT_ACCOUNT.barangayCity,

    city: "",

    province:
      province || DEFAULT_ACCOUNT.province,

    postalCode: String(
      postalCode ||
        DEFAULT_ACCOUNT.postalCode
    ),
  };
}

function readStoredAccount() {
  const keys = [
    "fitfusion-current-user",
    "registeredAccount",
  ];

  for (const key of keys) {
    const storedValue =
      localStorage.getItem(key) ||
      sessionStorage.getItem(key);

    if (!storedValue) {
      continue;
    }

    try {
      const parsedAccount =
        JSON.parse(storedValue);

      return normalizeAccount(parsedAccount);
    } catch {
      // Continue checking the next storage key.
    }
  }

  return normalizeAccount(DEFAULT_ACCOUNT);
}

function saveStoredAccount(account) {
  const normalizedAccount =
    normalizeAccount(account);

  localStorage.setItem(
    "fitfusion-current-user",
    JSON.stringify(normalizedAccount)
  );

  localStorage.setItem(
    "registeredAccount",
    JSON.stringify(normalizedAccount)
  );

  sessionStorage.setItem(
    "registeredAccount",
    JSON.stringify(normalizedAccount)
  );
}

function EditAccountPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [account, setAccount] = useState(
    readStoredAccount
  );

  const [step, setStep] = useState(
    window.location.hash === "#password"
      ? 2
      : 1
  );

  const [profileData, setProfileData] =
    useState(() => {
      const storedAccount =
        readStoredAccount();

      return {
        username:
          storedAccount.username || "",

        fullName:
          storedAccount.fullName || "",

        email:
          storedAccount.email || "",

        phone:
          storedAccount.phone || "",

        address:
          typeof storedAccount.address ===
          "string"
            ? storedAccount.address
            : "",

        barangay:
          storedAccount.barangayCity ||
          storedAccount.barangay ||
          "",

        province:
          storedAccount.province || "",

        postalCode: String(
          storedAccount.postalCode || ""
        ),
      };
    });

  const [passwordData, setPasswordData] =
    useState({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

  const [profileErrors, setProfileErrors] =
    useState({});

  const [passwordErrors, setPasswordErrors] =
    useState({});

  const [showPasswords, setShowPasswords] =
    useState({
      currentPassword: false,
      newPassword: false,
      confirmPassword: false,
    });

  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (location.hash === "#password") {
      setStep(2);
    } else {
      setStep(1);
    }
  }, [location.hash]);

  const passwordRules = useMemo(
    () => ({
      minimumLength:
        passwordData.newPassword.length >= 8,

      uppercase: /[A-Z]/.test(
        passwordData.newPassword
      ),

      lowercase: /[a-z]/.test(
        passwordData.newPassword
      ),

      number: /\d/.test(
        passwordData.newPassword
      ),

      specialCharacter:
        /[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]]/.test(
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
      left: 0,
      behavior: "smooth",
    });
  }

  function handleProfileChange(event) {
    const { name, value } = event.target;

    setProfileData((currentData) => ({
      ...currentData,
      [name]: value,
    }));

    setProfileErrors((currentErrors) => ({
      ...currentErrors,
      [name]: "",
    }));

    setNotice("");
  }

  function validateProfile() {
    const errors = {};

    const username = String(
      profileData.username || ""
    ).trim();

    const fullName = String(
      profileData.fullName || ""
    ).trim();

    const email = String(
      profileData.email || ""
    ).trim();

    const phone = String(
      profileData.phone || ""
    ).replace(/\s/g, "");

    const address = String(
      profileData.address || ""
    ).trim();

    const barangay = String(
      profileData.barangay || ""
    ).trim();

    const province = String(
      profileData.province || ""
    ).trim();

    const postalCode = String(
      profileData.postalCode || ""
    ).trim();

    if (username.length < 3) {
      errors.username =
        "Username must contain at least 3 characters.";
    }

    if (!fullName) {
      errors.fullName =
        "Please enter your complete name.";
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      errors.email =
        "Please enter a valid email address.";
    }

    if (!/^09\d{9}$/.test(phone)) {
      errors.phone =
        "Enter an 11-digit mobile number beginning with 09.";
    }

    if (!address) {
      errors.address =
        "Please enter your house number and street.";
    }

    if (!barangay) {
      errors.barangay =
        "Please enter your barangay and city.";
    }

    if (!province) {
      errors.province =
        "Please enter your province.";
    }

    if (!/^\d{4}$/.test(postalCode)) {
      errors.postalCode =
        "Postal code must contain exactly 4 numbers.";
    }

    setProfileErrors(errors);

    return Object.keys(errors).length === 0;
  }

  function handleProfileSubmit(event) {
    event.preventDefault();

    if (!validateProfile()) {
      setNotice(
        "Please correct the highlighted profile fields."
      );

      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });

      return;
    }

    const cleanedFullName = String(
      profileData.fullName
    ).trim();

    const nameParts =
      cleanedFullName.split(/\s+/);

    const updatedAccount =
      normalizeAccount({
        ...account,

        username: String(
          profileData.username
        ).trim(),

        fullName: cleanedFullName,

        firstName:
          nameParts[0] || "",

        lastName:
          nameParts.length > 1
            ? nameParts.slice(1).join(" ")
            : "",

        email: String(
          profileData.email
        ).trim(),

        phone: String(
          profileData.phone
        ).replace(/\s/g, ""),

        address: String(
          profileData.address
        ).trim(),

        barangay: String(
          profileData.barangay
        ).trim(),

        barangayCity: String(
          profileData.barangay
        ).trim(),

        city: "",

        province: String(
          profileData.province
        ).trim(),

        postalCode: String(
          profileData.postalCode
        ).trim(),
      });

    saveStoredAccount(updatedAccount);
    setAccount(updatedAccount);

    setStep(2);

    navigate(
      "/shopper/account/edit#password",
      { replace: true }
    );

    setNotice(
      "Profile saved successfully. You may now update your password."
    );

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  }

  function resetProfile() {
    const storedAccount =
      readStoredAccount();

    setProfileData({
      username:
        storedAccount.username || "",

      fullName:
        storedAccount.fullName || "",

      email:
        storedAccount.email || "",

      phone:
        storedAccount.phone || "",

      address:
        typeof storedAccount.address ===
        "string"
          ? storedAccount.address
          : "",

      barangay:
        storedAccount.barangayCity ||
        storedAccount.barangay ||
        "",

      province:
        storedAccount.province || "",

      postalCode: String(
        storedAccount.postalCode || ""
      ),
    });

    setProfileErrors({});
    setNotice("Profile fields were reset.");
  }

  function handlePasswordChange(event) {
    const { name, value } = event.target;

    setPasswordData((currentData) => ({
      ...currentData,
      [name]: value,
    }));

    setPasswordErrors((currentErrors) => ({
      ...currentErrors,
      [name]: "",
    }));

    setNotice("");
  }

  function togglePassword(fieldName) {
    setShowPasswords((currentState) => ({
      ...currentState,
      [fieldName]:
        !currentState[fieldName],
    }));
  }

  function validatePassword() {
    const errors = {};

    const savedPassword =
      account.password ||
      DEFAULT_ACCOUNT.password;

    if (!passwordData.currentPassword) {
      errors.currentPassword =
        "Enter your current password.";
    } else if (
      passwordData.currentPassword !==
      savedPassword
    ) {
      errors.currentPassword =
        "The current password you entered is incorrect.";
    }

    if (!passwordData.newPassword) {
      errors.newPassword =
        "Enter your new password.";
    } else if (!passwordRequirementsPassed) {
      errors.newPassword =
        "Your new password must meet all five password requirements.";
    } else if (
      passwordData.newPassword ===
      passwordData.currentPassword
    ) {
      errors.newPassword =
        "Your new password must be different from your current password.";
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword =
        "Confirm your new password.";
    } else if (
      passwordData.confirmPassword !==
      passwordData.newPassword
    ) {
      errors.confirmPassword =
        "The passwords do not match. Enter the same new password again.";
    }

    setPasswordErrors(errors);

    return Object.keys(errors).length === 0;
  }

  function handlePasswordSubmit(event) {
    event.preventDefault();

    if (!validatePassword()) {
      setNotice(
        "Please correct the highlighted password fields."
      );

      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });

      return;
    }

    const updatedAccount =
      normalizeAccount({
        ...account,
        password:
          passwordData.newPassword,
      });

    saveStoredAccount(updatedAccount);
    setAccount(updatedAccount);

    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    setPasswordErrors({});

    setNotice(
      "Your password was updated successfully."
    );

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  }

  function clearPasswordForm() {
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    setPasswordErrors({});
    setNotice("");
  }

  function handleLogout() {
    const confirmed = window.confirm(
      "Are you sure you want to log out?"
    );

    if (!confirmed) {
      return;
    }

    sessionStorage.removeItem("userRole");
    sessionStorage.removeItem("userEmail");

    navigate("/login");
  }

  return (
    <main className="edit-account-page">
      <aside className="edit-account-sidebar">
        <div className="edit-account-sidebar-logo">
          <img
            src={fitFusionLogo}
            alt="FitFusion AI"
          />
        </div>

        <nav className="edit-account-navigation">
          <NavLink
            to="/shopper/dashboard"
            className="edit-account-nav-link"
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/shopper/fitting-studio"
            className="edit-account-nav-link"
          >
            Fitting Studio
          </NavLink>

          <NavLink
            to="/shopper/avatar-presets"
            className="edit-account-nav-link"
          >
            Avatar Presets
          </NavLink>

          <NavLink
            to="/shopper/catalog"
            className="edit-account-nav-link"
          >
            Catalog
          </NavLink>

          <NavLink
            to="/shopper/saved-outfits"
            className="edit-account-nav-link"
          >
            Saved Outfits
          </NavLink>

          <NavLink
            to="/shopper/orders"
            className="edit-account-nav-link"
          >
            Order History
          </NavLink>

          <NavLink
            to="/shopper/account"
            className="edit-account-nav-link active"
          >
            Account
          </NavLink>
        </nav>

        <button
          type="button"
          className="edit-account-logout"
          onClick={handleLogout}
        >
          Logout
        </button>
      </aside>

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
              Update your personal information and
              account security one step at a time.
            </p>
          </div>

          <div className="edit-account-role">
            REGISTERED SHOPPER
          </div>
        </header>

        <div className="edit-account-body">
          <section className="edit-account-progress">
            <button
              type="button"
              className={
                step === 1
                  ? "edit-account-step active"
                  : "edit-account-step completed"
              }
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
              className={
                step === 2
                  ? "edit-account-progress-line active"
                  : "edit-account-progress-line"
              }
            />

            <button
              type="button"
              className={
                step === 2
                  ? "edit-account-step active"
                  : "edit-account-step"
              }
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
              className={
                notice.includes("successfully")
                  ? "edit-account-notice success"
                  : "edit-account-notice"
              }
              role="status"
            >
              {notice}
            </div>
          )}

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
                    Enter your personal and delivery
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
                    name="phone"
                    value={profileData.phone}
                    error={profileErrors.phone}
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
                  <div className="edit-account-full-field">
                    <FormField
                      label="House Number and Street"
                      name="address"
                      value={profileData.address}
                      error={profileErrors.address}
                      onChange={handleProfileChange}
                      placeholder="Enter house number and street"
                      autoComplete="street-address"
                    />
                  </div>

                  <FormField
                    label="Barangay / City"
                    name="barangay"
                    value={profileData.barangay}
                    error={profileErrors.barangay}
                    onChange={handleProfileChange}
                    placeholder="Enter barangay and city"
                    autoComplete="address-level2"
                  />

                  <FormField
                    label="Province"
                    name="province"
                    value={profileData.province}
                    error={profileErrors.province}
                    onChange={handleProfileChange}
                    placeholder="Enter province"
                    autoComplete="address-level1"
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
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </form>
          )}

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
                    Enter your current password and
                    create a secure new password.
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
                  visible={showPasswords.newPassword}
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
                    passed={
                      passwordRules.uppercase
                    }
                    label="One uppercase letter"
                  />

                  <PasswordRule
                    passed={
                      passwordRules.lowercase
                    }
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
                  Use a password that you do not use
                  for another account. Password changes
                  take effect immediately.
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
                  Update Password
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

function FormField({
  label,
  name,
  type = "text",
  value,
  error,
  onChange,
  placeholder,
  autoComplete,
  maxLength,
  inputMode,
}) {
  return (
    <label className="edit-account-field">
      <span>
        {label} <strong>*</strong>
      </span>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        maxLength={maxLength}
        inputMode={inputMode}
        className={error ? "input-error" : ""}
      />

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
    <label className="edit-account-field edit-account-password-field">
      <span>
        {label} <strong>*</strong>
      </span>

      <div
        className={
          error
            ? "edit-account-password-input input-error"
            : "edit-account-password-input"
        }
      >
        <input
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
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>

      {error && (
        <small className="edit-account-error">
          {error}
        </small>
      )}
    </label>
  );
}

function PasswordRule({ passed, label }) {
  return (
    <div
      className={
        passed
          ? "edit-account-rule passed"
          : "edit-account-rule"
      }
    >
      <span>{passed ? "✓" : "○"}</span>
      <p>{label}</p>
    </div>
  );
}

export default EditAccountPage;