
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../css/SellerEditAccountPage.css";

const PROVINCES = [
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
  "Nueva Vizcaya", "Occidental Mindoro",
  "Oriental Mindoro", "Palawan", "Pampanga",
  "Pangasinan", "Quezon", "Quirino", "Rizal",
  "Romblon", "Samar", "Sarangani", "Siquijor",
  "Sorsogon", "South Cotabato", "Southern Leyte",
  "Sultan Kudarat", "Sulu", "Surigao del Norte",
  "Surigao del Sur", "Tarlac", "Tawi-Tawi",
  "Zambales", "Zamboanga del Norte",
  "Zamboanga del Sur", "Zamboanga Sibugay",
];

const DEFAULT_PROFILE = {
  id: "seller-demo",
  role: "seller",
  fullName: "Sample Seller",
  username: "aurelia_store",
  storeName: "Maison Aurelia",
  email: "seller@aurelia.example",
  mobile: "09128884455",
  street: "123 Ayala Avenue",
  barangay: "San Antonio",
  city: "Makati City",
  province: "Metro Manila",
  postalCode: "1203",
};

const EMPTY_PASSWORD = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

function readJSON(storage, key) {
  try {
    const value = storage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

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

function normalizeProfile(raw = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const address =
    source.address && typeof source.address === "object"
      ? source.address
      : {};

  return {
    ...DEFAULT_PROFILE,
    ...source,
    role: "seller",
    mobile:
      source.mobile ||
      source.mobileNumber ||
      source.phone ||
      DEFAULT_PROFILE.mobile,
    street:
      address.street ||
      source.street ||
      source.streetAddress ||
      DEFAULT_PROFILE.street,
    barangay:
      address.barangay ||
      source.barangay ||
      DEFAULT_PROFILE.barangay,
    city:
      address.city ||
      source.city ||
      DEFAULT_PROFILE.city,
    province:
      address.province ||
      source.province ||
      DEFAULT_PROFILE.province,
    postalCode: String(
      address.postalCode ||
      source.postalCode ||
      DEFAULT_PROFILE.postalCode
    ),
  };
}

function readProfile() {
  const current = readJSON(
    localStorage,
    "fitfusion-current-user"
  );
  const saved = readJSON(
    localStorage,
    "fitfusion-seller-profile"
  );
  const registered = readJSON(localStorage, "sellerAccount");

  if (
    current &&
    String(current.role).toLowerCase() === "seller"
  ) {
    const matchingSaved =
      saved &&
      (
        (current.id && saved.id === current.id) ||
        String(saved.email).toLowerCase() ===
          String(current.email).toLowerCase()
      );

    return normalizeProfile({
      ...(matchingSaved ? saved : {}),
      ...current,
      address:
        current.address || (matchingSaved ? saved.address : {}),
    });
  }

  return normalizeProfile(saved || registered || {});
}

function getFormValues(account) {
  return {
    fullName: account.fullName || "",
    username: account.username || "",
    storeName: account.storeName || "",
    email: account.email || "",
    mobile: account.mobile || "",
    street: account.street || "",
    barangay: account.barangay || "",
    city: account.city || "",
    province: account.province || "",
    postalCode: account.postalCode || "",
  };
}

function Field({
  label,
  name,
  value,
  error,
  onChange,
  full = false,
  type = "text",
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
      <label htmlFor={`seller-edit-${name}`}>
        {label} <strong>*</strong>
      </label>

      <div
        className={`edit-account-password-input ${
          error ? "input-error" : ""
        }`}
      >
        <input
          id={`seller-edit-${name}`}
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
          aria-label={`Toggle visibility of ${label}`}
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

function SellerEditAccountPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Store Profile sends its own route so the Back button
  // always returns to the correct existing page.
  const returnTo =
    location.state?.returnTo || "/seller/profile";

  const [profile, setProfile] = useState(readProfile);

  const [form, setForm] = useState(() =>
    getFormValues(readProfile())
  );

  const isPasswordView = location.hash === "#password";

  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState("info");

  const [passwordForm, setPasswordForm] =
    useState(EMPTY_PASSWORD);

  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const passwordRules = useMemo(() => ({
    length: passwordForm.newPassword.length >= 8,
    uppercase: /[A-Z]/.test(passwordForm.newPassword),
    lowercase: /[a-z]/.test(passwordForm.newPassword),
    number: /\d/.test(passwordForm.newPassword),
    special: /[^A-Za-z0-9]/.test(passwordForm.newPassword),
  }), [passwordForm.newPassword]);

  function changeStep(nextStep) {
    setErrors({});
    setNotice("");

    navigate(
      `/seller/account/edit#${
        nextStep === 1 ? "profile" : "password"
      }`,
      {
        replace: true,
        state: { returnTo },
      }
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleChange(event) {
    const { name } = event.target;
    let { value } = event.target;

    if (name === "mobile") {
      value = value.replace(/\D/g, "").slice(0, 11);
    }

    if (name === "postalCode") {
      value = value.replace(/\D/g, "").slice(0, 4);
    }

    setForm(current => ({
      ...current,
      [name]: value,
    }));

    setErrors(current => ({
      ...current,
      [name]: "",
    }));

    setNotice("");
  }

  function validateProfile() {
    const next = {};

    const name = properCase(form.fullName);

    if (!name) {
      next.fullName = "Full name is required.";
    } else if (
      !/^[A-Za-zÀ-ÖØ-öø-ÿÑñ.' -]+$/u.test(name)
    ) {
      next.fullName =
        "Use only letters, spaces, apostrophes, periods, and hyphens.";
    } else if (
      name.split(" ").filter(Boolean).length < 2
    ) {
      next.fullName =
        "Enter at least your first name and surname.";
    }

    if (form.storeName.trim().length < 2) {
      next.storeName =
        "Store Name must contain at least 2 characters.";
    }

    if (!/^09\d{9}$/.test(form.mobile)) {
      next.mobile =
        "Enter exactly 11 digits beginning with 09.";
    }

    if (!form.street.trim()) {
      next.street = "House number and street are required.";
    }

    if (!form.barangay.trim()) {
      next.barangay = "Barangay is required.";
    }

    if (!form.city.trim()) {
      next.city = "City or municipality is required.";
    }

    if (!PROVINCES.includes(form.province)) {
      next.province = "Please select a valid province.";
    }

    if (!/^\d{4}$/.test(form.postalCode)) {
      next.postalCode =
        "Postal code must contain exactly four digits.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function saveProfile(event) {
    event.preventDefault();

    if (!validateProfile()) {
      setNoticeType("error");
      setNotice("Please correct the highlighted fields.");
      return;
    }

    const address = {
      street: form.street.trim(),
      barangay: form.barangay.trim(),
      city: form.city.trim(),
      province: form.province,
      postalCode: form.postalCode,
    };

    const updated = {
      ...profile,
      role: "seller",
      fullName: properCase(form.fullName),
      storeName: form.storeName.trim(),
      mobile: form.mobile,
      ...address,
      address,
      updatedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(
        "fitfusion-seller-profile",
        JSON.stringify(updated)
      );

      localStorage.setItem(
        "sellerAccount",
        JSON.stringify(updated)
      );

      const current = readJSON(
        localStorage,
        "fitfusion-current-user"
      );

      if (
        current &&
        String(current.role).toLowerCase() === "seller"
      ) {
        localStorage.setItem(
          "fitfusion-current-user",
          JSON.stringify({ ...current, ...updated })
        );
      }

      sessionStorage.setItem(
        "sellerAccount",
        JSON.stringify(updated)
      );

      const users = readJSON(localStorage, "fitfusion-users");

      if (Array.isArray(users)) {
        const updatedUsers = users.map(user => {
          const matches =
            String(user.role).toLowerCase() === "seller" &&
            (
              (profile.id && user.id === profile.id) ||
              String(user.email).toLowerCase() ===
                String(profile.email).toLowerCase()
            );

          return matches ? { ...user, ...updated } : user;
        });

        localStorage.setItem(
          "fitfusion-users",
          JSON.stringify(updatedUsers)
        );
      }

      window.dispatchEvent(
        new Event("fitfusion-account-updated")
      );

      setProfile(updated);
      setForm(getFormValues(updated));

      setNoticeType("success");
      setNotice(
        "Your seller account information was saved successfully."
      );
    } catch {
      setNoticeType("error");
      setNotice(
        "Unable to save your changes. Please try again."
      );
    }
  }

  function handlePasswordChange(event) {
    const { name, value } = event.target;

    setPasswordForm(current => ({
      ...current,
      [name]: value,
    }));

    setErrors(current => ({
      ...current,
      [name]: "",
    }));

    setNotice("");
  }

  function validatePassword(event) {
    event.preventDefault();

    const next = {};

    if (!passwordForm.currentPassword) {
      next.currentPassword =
        "Please enter your current password.";
    }

    if (!Object.values(passwordRules).every(Boolean)) {
      next.newPassword =
        "Complete all five password requirements.";
    } else if (
      passwordForm.newPassword ===
      passwordForm.currentPassword
    ) {
      next.newPassword =
        "New password must differ from the current password.";
    }

    if (!passwordForm.confirmPassword) {
      next.confirmPassword =
        "Please confirm your new password.";
    } else if (
      passwordForm.confirmPassword !==
      passwordForm.newPassword
    ) {
      next.confirmPassword =
        "The new password and confirmation do not match.";
    }

    setErrors(next);

    if (Object.keys(next).length > 0) {
      setNoticeType("error");
      setNotice("Please correct the highlighted fields.");
      return;
    }

    // Do not store passwords in browser storage.
    // Actual password changes require a backend.
    setPasswordForm({ ...EMPTY_PASSWORD });
    setNoticeType("info");
    setNotice(
      "Password validation passed. Actual password changes will be available after backend integration."
    );
  }

  return (
    <main className="edit-account-page seller-edit-account-page">
      <section className="edit-account-content">
        <header className="edit-account-header">
          <div>
            <button
              type="button"
              className="edit-account-back-link"
              onClick={() => navigate(returnTo)}
            >
              ← Back to Store Profile
            </button>

            <h1>Edit Seller Account</h1>
            <p>
              Update your personal details, store information,
              and business address, or change your password.
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
              onSubmit={saveProfile}
              noValidate
            >
              <div className="edit-account-card-heading">
                <div>
                  <p>ACCOUNT INFORMATION</p>
                  <h2>Edit Account Information</h2>
                  <span>
                    Update your personal, store, and business address details.
                  </span>
                </div>
              </div>

              <div className="edit-account-divider" />

              <section className="edit-account-section">
                <p className="edit-account-section-label">
                  PERSONAL INFORMATION
                </p>

                <div className="edit-account-form-grid">
                  <Field
                    label="Full Name"
                    name="fullName"
                    value={form.fullName}
                    error={errors.fullName}
                    onChange={handleChange}
                    onBlur={() =>
                      setForm(current => ({
                        ...current,
                        fullName: properCase(current.fullName),
                      }))
                    }
                    full
                  />

                  <Field
                    label="Store Name"
                    name="storeName"
                    value={form.storeName}
                    error={errors.storeName}
                    onChange={handleChange}
                  />

                  <Field
                    label="Email Address"
                    name="email"
                    type="email"
                    value={form.email}
                    readOnly
                  />

                  <Field
                    label="Mobile Number"
                    name="mobile"
                    type="tel"
                    value={form.mobile}
                    error={errors.mobile}
                    onChange={handleChange}
                    placeholder="09XXXXXXXXX"
                    inputMode="numeric"
                    maxLength={11}
                  />
                </div>
              </section>

              <div className="edit-account-divider" />

              <section className="edit-account-section">
                <p className="edit-account-section-label">
                  BUSINESS ADDRESS
                </p>

                <div className="edit-account-form-grid">
                  <Field
                    label="House Number and Street"
                    name="street"
                    value={form.street}
                    error={errors.street}
                    onChange={handleChange}
                    full
                  />

                  <Field
                    label="Barangay"
                    name="barangay"
                    value={form.barangay}
                    error={errors.barangay}
                    onChange={handleChange}
                  />

                  <Field
                    label="City / Municipality"
                    name="city"
                    value={form.city}
                    error={errors.city}
                    onChange={handleChange}
                  />

                  <label className="edit-account-field">
                    <span>
                      Province <strong>*</strong>
                    </span>

                    <select
                      name="province"
                      value={form.province}
                      onChange={handleChange}
                      className={errors.province ? "input-error" : ""}
                      aria-invalid={Boolean(errors.province)}
                      autoComplete="address-level1"
                    >
                      <option value="">Select your province</option>
                      {PROVINCES.map(province => (
                        <option key={province} value={province}>
                          {province}
                        </option>
                      ))}
                    </select>

                    {errors.province && (
                      <small className="edit-account-error">
                        {errors.province}
                      </small>
                    )}
                  </label>

                  <Field
                    label="Postal Code"
                    name="postalCode"
                    value={form.postalCode}
                    error={errors.postalCode}
                    onChange={handleChange}
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="1200"
                  />
                </div>
              </section>

              <div className="edit-account-form-actions">
                <button
                  type="button"
                  className="edit-account-secondary-button"
                  onClick={() => navigate(returnTo)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="edit-account-clear-button"
                  onClick={() => changeStep(2)}
                >
                  Change Password
                </button>

                <button
                  type="submit"
                  className="edit-account-primary-button"
                >
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {isPasswordView && (
            <form
              className="edit-account-card"
              onSubmit={validatePassword}
              noValidate
            >
              <div className="edit-account-card-heading">
                <div>
                  <p>ACCOUNT SECURITY</p>
                  <h2>Change Password</h2>
                  <span>
                    Enter your current password and create
                    a stronger new password.
                  </span>
                </div>
              </div>

              <div className="edit-account-divider" />

              <section className="edit-account-section">
                {[
                  ["currentPassword", "Current Password"],
                  ["newPassword", "New Password"],
                  ["confirmPassword", "Confirm New Password"],
                ].map(([name, label]) => (
                  <PasswordField
                    key={name}
                    label={label}
                    name={name}
                    value={passwordForm[name]}
                    error={errors[name]}
                    onChange={handlePasswordChange}
                    visible={showPasswords[name]}
                    onToggle={() =>
                      setShowPasswords(current => ({
                        ...current,
                        [name]: !current[name],
                      }))
                    }
                    autoComplete={
                      name === "currentPassword"
                        ? "current-password"
                        : "new-password"
                    }
                  />
                ))}
              </section>

              <section className="edit-account-requirements">
                <h3>Password requirements</h3>

                <div className="edit-account-rules">
                  <PasswordRule
                    passed={passwordRules.length}
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
                    passed={passwordRules.special}
                    label="One special character"
                  />
                </div>
              </section>

              <div className="edit-account-info">
                <span>i</span>
                <p>
                  During frontend development, password
                  requirements are validated without changing
                  actual account credentials.
                </p>
              </div>

              <div className="edit-account-form-actions">
                <button
                  type="button"
                  className="edit-account-secondary-button"
                  onClick={() => navigate(returnTo)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="edit-account-clear-button"
                  onClick={() => {
                    setPasswordForm({ ...EMPTY_PASSWORD });
                    setErrors({});
                    setNotice("");
                  }}
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

export default SellerEditAccountPage;
