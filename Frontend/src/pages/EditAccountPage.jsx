import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";
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

/* Map the backend accounts_user document → form shape */
function profileFromUser(user = {}) {
  return {
    fullName: user.full_name || "",
    email: user.email || "",
    mobile: user.mobile || "",
    street: user.street || "",
    barangay: user.barangay || "",
    city: user.city || "",
    province: user.province || "",
    postalCode: user.postal_code || "",
  };
}

/* Map backend validation errors → form field names */
function mapBackendErrors(data) {
  const keyMap = {
    full_name: "fullName",
    postal_code: "postalCode",
  };

  const errors = {};

  Object.entries(data || {}).forEach(([key, value]) => {
    const field = keyMap[key] || key;
    const message = Array.isArray(value) ? value[0] : value;
    if (typeof message === "string") {
      errors[field] = message;
    }
  });

  return errors;
}

/* Keep the shared frontend cache in sync so greetings/other pages update */
function cacheCurrentUser(user) {
  try {
    const prev = JSON.parse(
      localStorage.getItem("fitfusion-current-user") || "{}"
    );
    localStorage.setItem(
      "fitfusion-current-user",
      JSON.stringify({ ...prev, ...user })
    );
  } catch {
    // non-critical cache sync
  }

  window.dispatchEvent(new Event("fitfusion-account-updated"));
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
        <small className="edit-account-error">{error}</small>
      )}
    </label>
  );
}

function ProvinceField({ value, error, onChange }) {
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
        <option value="">Select your province</option>

        {PROVINCES.map((province) => (
          <option key={province} value={province}>
            {province}
          </option>
        ))}
      </select>

      {error && (
        <small className="edit-account-error">{error}</small>
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
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>

      {error && (
        <small className="edit-account-error">{error}</small>
      )}
    </div>
  );
}

function PasswordRule({ passed, label }) {
  return (
    <div className={`edit-account-rule ${passed ? "passed" : ""}`}>
      <span aria-hidden="true">{passed ? "✓" : "○"}</span>
      <p>{label}</p>
    </div>
  );
}

function EditAccountPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const isPasswordView = location.hash === "#password";

  /* ---------- real account from MongoDB ---------- */
  const [account, setAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [profileData, setProfileData] = useState({
    fullName: "",
    email: "",
    mobile: "",
    street: "",
    barangay: "",
    city: "",
    province: "",
    postalCode: "",
  });

  const [passwordData, setPasswordData] = useState(emptyPassword);

  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});

  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState("info");

  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  /* ---------- FR-1.2: load real profile on mount ---------- */
  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setIsLoading(true);
      setLoadError("");

      try {
        const res = await authAPI.getProfile();
        const user = res?.user || res || {};

        if (!cancelled) {
          setAccount(user);
          setProfileData(profileFromUser(user));
        }
      } catch (error) {
        console.error("Profile load failed:", error);
        if (!cancelled) {
          setLoadError(
            "Could not load your account information. Please try again."
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const passwordRules = useMemo(
    () => ({
      minimumLength: passwordData.newPassword.length >= 8,
      uppercase: /[A-Z]/.test(passwordData.newPassword),
      lowercase: /[a-z]/.test(passwordData.newPassword),
      number: /\d/.test(passwordData.newPassword),
      specialCharacter: /[^A-Za-z0-9]/.test(
        passwordData.newPassword
      ),
    }),
    [passwordData.newPassword]
  );

  const passwordRequirementsPassed =
    Object.values(passwordRules).every(Boolean);

  function changeStep(nextStep) {
    setNotice("");
    setProfileErrors({});
    setPasswordErrors({});

    navigate(
      nextStep === 1
        ? "/shopper/account/edit#profile"
        : "/shopper/account/edit#password",
      { replace: true }
    );

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------- profile form ---------- */
  function handleProfileChange(event) {
    const { name } = event.target;
    let { value } = event.target;

    if (name === "mobile") {
      value = value.replace(/\D/g, "").slice(0, 11);
    }

    if (name === "postalCode") {
      value = value.replace(/\D/g, "").slice(0, 4);
    }

    setProfileData((current) => ({ ...current, [name]: value }));
    setProfileErrors((current) => ({ ...current, [name]: "" }));
    setNotice("");
  }

  function validateProfile() {
    const errors = {};

    const fullName = properCase(profileData.fullName);

    if (!fullName) {
      errors.fullName = "Full name is required.";
    } else if (!/^[A-Za-zÀ-ÖØ-öø-ÿÑñ.' -]+$/u.test(fullName)) {
      errors.fullName =
        "Full name may only contain letters, spaces, apostrophes, periods, and hyphens.";
    } else if (fullName.split(" ").filter(Boolean).length < 2) {
      errors.fullName =
        "Please enter at least your first name and surname.";
    }

    if (!/^09\d{9}$/.test(profileData.mobile)) {
      errors.mobile =
        "Enter an 11-digit mobile number beginning with 09.";
    }

    if (!profileData.street.trim()) {
      errors.street = "Please enter your house number and street.";
    }

    if (!profileData.barangay.trim()) {
      errors.barangay = "Please enter your barangay.";
    }

    if (!profileData.city.trim()) {
      errors.city = "Please enter your city or municipality.";
    }

    if (!profileData.province) {
      errors.province = "Please select your province.";
    } else if (!PROVINCES.includes(profileData.province)) {
      errors.province = "Please select a valid Philippine province.";
    }

    if (!/^\d{4}$/.test(profileData.postalCode)) {
      errors.postalCode = "Postal code must contain exactly 4 digits.";
    }

    setProfileErrors(errors);

    return Object.keys(errors).length === 0;
  }

  /* ---------- FR-1.3: save profile to MongoDB via PATCH /profile/ ---------- */
  async function handleProfileSubmit(event) {
    event.preventDefault();

    if (!validateProfile()) {
      setNoticeType("error");
      setNotice("Please correct the highlighted profile fields.");
      return;
    }

    if (profileSaving) return;

    setProfileSaving(true);

    try {
      const payload = {
        full_name: properCase(profileData.fullName),
        mobile: profileData.mobile,
        street: profileData.street.trim(),
        barangay: profileData.barangay.trim(),
        city: profileData.city.trim(),
        province: profileData.province,
        postal_code: profileData.postalCode,
      };

      const res = await authAPI.updateProfile(payload);
      const updated = res?.user || res;

      setAccount(updated);
      setProfileData(profileFromUser(updated));
      cacheCurrentUser(updated);

      setNoticeType("success");
      setNotice(
        "Your account information was saved to your profile successfully."
      );
    } catch (error) {
      console.error("Profile update failed:", error);

      let data = null;
      try {
        data = JSON.parse(error.message);
      } catch {
        data = null;
      }

      const fieldErrors = mapBackendErrors(data);

      if (fieldErrors && Object.keys(fieldErrors).length > 0) {
        setProfileErrors(fieldErrors);
        setNoticeType("error");
        setNotice("Please correct the highlighted profile fields.");
      } else {
        setNoticeType("error");
        setNotice("Unable to save your profile. Please try again.");
      }
    } finally {
      setProfileSaving(false);
    }
  }

  /* ---------- password form (already backend-wired) ---------- */
  function handlePasswordChange(event) {
    const { name, value } = event.target;

    setPasswordData((current) => ({ ...current, [name]: value }));
    setPasswordErrors((current) => ({ ...current, [name]: "" }));
    setNotice("");
  }

  function togglePassword(name) {
    setShowPasswords((current) => ({ ...current, [name]: !current[name] }));
  }

  function validatePassword() {
    const errors = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword = "Please enter your current password.";
    }

    if (!passwordData.newPassword) {
      errors.newPassword = "Please enter a new password.";
    } else if (!passwordRequirementsPassed) {
      errors.newPassword =
        "Your new password must meet all five requirements.";
    } else if (
      passwordData.newPassword === passwordData.currentPassword
    ) {
      errors.newPassword =
        "Your new password must be different from your current password.";
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = "Please confirm your new password.";
    } else if (
      passwordData.confirmPassword !== passwordData.newPassword
    ) {
      errors.confirmPassword =
        "The new password and confirmation do not match.";
    }

    setPasswordErrors(errors);

    return Object.keys(errors).length === 0;
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();

    if (!validatePassword()) {
      setNoticeType("error");
      setNotice("Please correct the highlighted password fields.");
      return;
    }

    setPasswordSaving(true);

    try {
      await authAPI.changePassword({
        old_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
        new_password_confirm: passwordData.confirmPassword,
      });

      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("fitfusion-current-user");
      sessionStorage.removeItem("userRole");
      sessionStorage.removeItem("userEmail");
      sessionStorage.removeItem("registeredAccount");

      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Password update failed:", error);

      let message = "Password update failed. Please try again.";

      try {
        const response = JSON.parse(error.message);
        const firstError = Object.values(response).flat()[0];
        if (typeof firstError === "string") {
          message = firstError;
        }
      } catch {
        // Keep the default message when the response is not field-formatted JSON.
      }

      setNoticeType("error");
      setNotice(message);
    } finally {
      setPasswordSaving(false);
    }
  }

  /* ---------- render states ---------- */
  if (isLoading) {
    return (
      <main className="edit-account-page">
        <section className="edit-account-content">
          <header className="edit-account-header">
            <div>
              <button
                type="button"
                className="edit-account-back-link"
                onClick={() => navigate("/shopper/account")}
              >
                ← Back to Account
              </button>
              <h1>Edit Shopper Profile</h1>
              <p>Loading your account information…</p>
            </div>
          </header>
        </section>
      </main>
    );
  }

  if (loadError || !account) {
    return (
      <main className="edit-account-page">
        <section className="edit-account-content">
          <header className="edit-account-header">
            <div>
              <button
                type="button"
                className="edit-account-back-link"
                onClick={() => navigate("/shopper/account")}
              >
                ← Back to Account
              </button>
              <h1>Edit Shopper Profile</h1>
              <p>{loadError || "Account information is unavailable."}</p>
              <button
                type="button"
                className="edit-account-primary-button"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          </header>
        </section>
      </main>
    );
  }

  return (
    <main className="edit-account-page">
      <section className="edit-account-content">
        <header className="edit-account-header">
          <div>
            <button
              type="button"
              className="edit-account-back-link"
              onClick={() => navigate("/shopper/account")}
            >
              ← Back to Account
            </button>

            <h1>Edit Shopper Profile</h1>

            <p>
              Update your personal details and home address, or change
              your password.
            </p>
          </div>
        </header>

        <div className="edit-account-body">
          {notice && (
            <div
              className={`edit-account-notice ${noticeType}`}
              role={noticeType === "error" ? "alert" : "status"}
            >
              {notice}
            </div>
          )}

          {!isPasswordView && (
            <form
              className="edit-account-card"
              onSubmit={handleProfileSubmit}
              noValidate
            >
              <div className="edit-account-card-heading">
                <div>
                  <p>ACCOUNT INFORMATION</p>
                  <h2>Edit Account Information</h2>
                  <span>
                    Update your personal information and home address.
                  </span>
                </div>
              </div>

              <div className="edit-account-divider" />

              <section className="edit-account-section">
                <p className="edit-account-section-label">
                  PERSONAL INFORMATION
                </p>

                <div className="edit-account-form-grid">
                  <FormField
                    label="Full Name"
                    name="fullName"
                    value={profileData.fullName}
                    error={profileErrors.fullName}
                    onChange={handleProfileChange}
                    onBlur={() =>
                      setProfileData((current) => ({
                        ...current,
                        fullName: properCase(current.fullName),
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
                    readOnly
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
                  HOME ADDRESS
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
                  onClick={() => navigate("/shopper/account")}
                  disabled={profileSaving}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="edit-account-clear-button"
                  onClick={() => changeStep(2)}
                  disabled={profileSaving}
                >
                  Change Password
                </button>

                <button
                  type="submit"
                  className="edit-account-primary-button"
                  disabled={profileSaving}
                >
                  {profileSaving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          )}

          {isPasswordView && (
            <form
              className="edit-account-card edit-account-password-card"
              onSubmit={handlePasswordSubmit}
              noValidate
            >
              <div className="edit-account-card-heading">
                <div>
                  <p>ACCOUNT SECURITY</p>
                  <h2>Change Password</h2>
                  <span>
                    Enter your current password and create a secure
                    new password.
                  </span>
                </div>
              </div>

              <div className="edit-account-divider" />

              <section className="edit-account-section">
                <PasswordField
                  label="Current Password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  error={passwordErrors.currentPassword}
                  onChange={handlePasswordChange}
                  visible={showPasswords.currentPassword}
                  onToggle={() => togglePassword("currentPassword")}
                  autoComplete="current-password"
                />

                <PasswordField
                  label="New Password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  error={passwordErrors.newPassword}
                  onChange={handlePasswordChange}
                  visible={showPasswords.newPassword}
                  onToggle={() => togglePassword("newPassword")}
                  autoComplete="new-password"
                />

                <PasswordField
                  label="Confirm New Password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  error={passwordErrors.confirmPassword}
                  onChange={handlePasswordChange}
                  visible={showPasswords.confirmPassword}
                  onToggle={() => togglePassword("confirmPassword")}
                  autoComplete="new-password"
                />
              </section>

              <section className="edit-account-requirements">
                <h3>Password requirements</h3>

                <div className="edit-account-rules">
                  <PasswordRule
                    passed={passwordRules.minimumLength}
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
                    passed={passwordRules.specialCharacter}
                    label="One special character"
                  />
                </div>
              </section>

              <div className="edit-account-form-actions">
                <button
                  type="button"
                  className="edit-account-secondary-button"
                  onClick={() => navigate("/shopper/account")}
                  disabled={passwordSaving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="edit-account-primary-button"
                  disabled={passwordSaving}
                >
                  {passwordSaving ? "Updating…" : "Update Password"}
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