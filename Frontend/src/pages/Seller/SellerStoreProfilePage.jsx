import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI, catalogAPI } from "../../services/api";
import "../css/SellerStoreProfilePage.css";

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
  "Nueva Vizcaya", "Occidental Mindoro", "Oriental Mindoro",
  "Palawan", "Pampanga", "Pangasinan", "Quezon",
  "Quirino", "Rizal", "Romblon", "Samar", "Sarangani",
  "Siquijor", "Sorsogon", "South Cotabato",
  "Southern Leyte", "Sultan Kudarat", "Sulu",
  "Surigao del Norte", "Surigao del Sur", "Tarlac",
  "Tawi-Tawi", "Zambales", "Zamboanga del Norte",
  "Zamboanga del Sur", "Zamboanga Sibugay",
];

const REASONS = [
  ["Taking a break", "I want to take a break"],
  ["Privacy or security concerns", "Privacy or security concerns"],
  ["No longer using FitFusion AI", "I am no longer using FitFusion AI"],
  ["Other", "Other reason"],
];

const PASSWORD_RULES = [
  { label: "at least 8 characters", test: (v) => v.length >= 8 },
  { label: "an uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { label: "a lowercase letter", test: (v) => /[a-z]/.test(v) },
  { label: "a number", test: (v) => /\d/.test(v) },
  { label: "a special character", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

function clearAuthStorage() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("fitfusion-current-user");
  sessionStorage.removeItem("userRole");
  sessionStorage.removeItem("userEmail");
  sessionStorage.removeItem("sellerAccount");
}

function formatJoinDate(value) {
  if (!value) return "Not available";
  try {
    return new Date(value).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "Not available";
  }
}

function capitalizeRole(role) {
  const value = String(role || "").trim();
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "Seller";
}

function InformationRow({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || "Not provided"}</dd>
    </div>
  );
}

function DeactivateIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3a9 9 0 1 0 9 9M12 2v10M16 3a9 9 0 0 1 5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SellerStoreProfilePage() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    rejected: 0,
  });

  const [notice, setNotice] = useState("");

  /* Edit profile modal */
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    store_name: "",
    mobile: "",
    street: "",
    barangay: "",
    city: "",
    province: "",
    postal_code: "",
  });
  const [editErrors, setEditErrors] = useState({});
  const [editSaving, setEditSaving] = useState(false);

  /* Change password modal */
  const [showPassword, setShowPassword] = useState(false);
  const [pwForm, setPwForm] = useState({
    old_password: "",
    new_password: "",
    new_password_confirm: "",
  });
  const [visiblePasswords, setVisiblePasswords] = useState({
    old_password: false,
    new_password: false,
    new_password_confirm: false,
  });
  const [pwError, setPwError] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  /* Deactivate modal */
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [reason, setReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [deactivateError, setDeactivateError] = useState("");
  const [deactivating, setDeactivating] = useState(false);

  const validReason =
    Boolean(reason) &&
    (reason !== "Other" || Boolean(otherReason.trim()));

  /* ---------- Load real profile + live stats ---------- */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setLoadError("");

      try {
        const res = await authAPI.getProfile();
        const user = res?.user || res || {};
        if (!cancelled) setProfile(user);

        try {
          const prev = JSON.parse(
            localStorage.getItem("fitfusion-current-user") || "{}"
          );
          localStorage.setItem(
            "fitfusion-current-user",
            JSON.stringify({ ...prev, ...user })
          );
        } catch {
          // non-critical
        }
      } catch (err) {
        console.error("Profile load failed:", err);
        if (!cancelled) {
          setLoadError(
            "Could not load your profile. Please try again."
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }

      try {
        const listings = await catalogAPI.myListings();
        const list = Array.isArray(listings) ? listings : [];
        if (!cancelled) {
          setStats({
            total: list.length,
            approved: list.filter(
              (item) => String(item.status).toLowerCase() === "active"
            ).length,
            rejected: list.filter(
              (item) => String(item.status).toLowerCase() === "rejected"
            ).length,
          });
        }
      } catch {
        // stats are secondary; keep zeros on failure
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  function showNotice(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 4000);
  }

  /* ---------- Edit profile ---------- */
  function openEdit() {
    if (!profile) return;
    setEditForm({
      full_name: profile.full_name || "",
      store_name: profile.store_name || "",
      mobile: profile.mobile || "",
      street: profile.street || "",
      barangay: profile.barangay || "",
      city: profile.city || "",
      province: profile.province || "",
      postal_code: profile.postal_code || "",
    });
    setEditErrors({});
    setShowEdit(true);
  }

  function handleEditChange(event) {
    const { name, value } = event.target;
    setEditForm((current) => ({ ...current, [name]: value }));
    setEditErrors((current) => ({ ...current, [name]: "", form: "" }));
  }

  function validateEdit() {
    const nextErrors = {};

    if (!editForm.full_name.trim()) {
      nextErrors.full_name = "Full name is required.";
    }
    if (!editForm.store_name.trim()) {
      nextErrors.store_name = "Store name is required.";
    }
    if (!/^\d{11}$/.test(editForm.mobile)) {
      nextErrors.mobile = "Mobile number must contain exactly 11 digits.";
    } else if (!editForm.mobile.startsWith("09")) {
      nextErrors.mobile = "Philippine mobile number must start with 09.";
    }
    if (!editForm.street.trim()) {
      nextErrors.street = "Store address is required.";
    }
    if (!editForm.barangay.trim()) {
      nextErrors.barangay = "Barangay is required.";
    }
    if (!editForm.city.trim()) {
      nextErrors.city = "City or municipality is required.";
    }
    if (!editForm.province) {
      nextErrors.province = "Please select your province.";
    }
    if (!/^\d{4}$/.test(editForm.postal_code)) {
      nextErrors.postal_code = "Postal code must contain exactly 4 digits.";
    }

    setEditErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function submitEdit(event) {
    event.preventDefault();
    if (!validateEdit()) return;

    setEditSaving(true);
    try {
      const res = await authAPI.updateProfile(editForm);
      const updated = res?.user || res;

      setProfile(updated);

      try {
        const prev = JSON.parse(
          localStorage.getItem("fitfusion-current-user") || "{}"
        );
        localStorage.setItem(
          "fitfusion-current-user",
          JSON.stringify({ ...prev, ...updated })
        );
      } catch {
        // non-critical
      }

      setShowEdit(false);
      showNotice("Profile updated successfully.");
    } catch (err) {
      console.error("Profile update failed:", err);
      let message = "Update failed. Please try again.";
      try {
        const data = JSON.parse(err.message);
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          message = `${firstKey}: ${
            Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey]
          }`;
        }
      } catch {
        // keep default message
      }
      setEditErrors({ form: message });
    } finally {
      setEditSaving(false);
    }
  }

  /* ---------- Change password ---------- */
  function openPassword() {
    setShowEdit(false);
    setPwForm({
      old_password: "",
      new_password: "",
      new_password_confirm: "",
    });
    setPwError("");
    setShowPassword(true);
  }

  function closePassword() {
    setShowPassword(false);
    setShowEdit(true);
  }

  function togglePasswordVisibility(name) {
    setVisiblePasswords((current) => ({
      ...current,
      [name]: !current[name],
    }));
  }

  function handlePwChange(event) {
    const { name, value } = event.target;
    setPwForm((current) => ({ ...current, [name]: value }));
    setPwError("");
  }

  async function submitPassword(event) {
    event.preventDefault();

    const failedRules = PASSWORD_RULES.filter(
      (rule) => !rule.test(pwForm.new_password)
    );

    if (failedRules.length > 0) {
      setPwError(
        `New password must include ${failedRules
          .map((rule) => rule.label)
          .join(", ")}.`
      );
      return;
    }

    if (pwForm.new_password !== pwForm.new_password_confirm) {
      setPwError("Passwords do not match.");
      return;
    }

    setPwSaving(true);
    try {
      await authAPI.changePassword(pwForm);
      clearAuthStorage();
      window.location.href = "/login";
    } catch (err) {
      console.error("Password change failed:", err);
      let message = "Password change failed. Please try again.";
      try {
        const data = JSON.parse(err.message);
        if (data.old_password) {
          message = Array.isArray(data.old_password)
            ? data.old_password[0]
            : data.old_password;
        } else if (data.new_password) {
          message = Array.isArray(data.new_password)
            ? data.new_password[0]
            : data.new_password;
        } else if (data.non_field_errors) {
          message = data.non_field_errors[0];
        } else if (data.detail) {
          message = data.detail;
        }
      } catch {
        // keep default message
      }
      setPwError(message);
    } finally {
      setPwSaving(false);
    }
  }

  /* ---------- Deactivate account ---------- */
  function openDeactivate() {
    setReason("");
    setOtherReason("");
    setAcknowledged(false);
    setDeactivateError("");
    setShowDeactivate(true);
  }

  function closeDeactivate() {
    setShowDeactivate(false);
    setDeactivateError("");
  }

  async function confirmDeactivate() {
    if (!validReason) {
      setDeactivateError("Please select a reason for deactivation.");
      return;
    }
    if (!acknowledged) {
      setDeactivateError("Please acknowledge the deactivation notice.");
      return;
    }

    setDeactivating(true);
    try {
      await authAPI.deactivateAccount({
        reason: reason === "Other" ? otherReason.trim() : reason,
        refresh: localStorage.getItem("refresh_token") || "",
      });

      clearAuthStorage();
      window.location.href = "/";
    } catch (err) {
      console.error("Deactivation failed:", err);
      setDeactivateError("Deactivation failed. Please try again.");
      setDeactivating(false);
    }
  }

  /* ---------- Logout ---------- */
  async function logout() {
    try {
      await authAPI.logout(localStorage.getItem("refresh_token"));
    } catch {
      // ignore logout API failures; clear locally anyway
    }
    clearAuthStorage();
    navigate("/login", { replace: true });
  }

  /* ---------- Render states ---------- */
  if (isLoading) {
    return (
      <main className="seller-store-profile-page">
        <div className="seller-store-profile-body">
          <section className="seller-store-profile-introduction">
            <p className="seller-store-profile-label">
              SELLER STORE PROFILE
            </p>
            <h1>Loading…</h1>
            <p>Fetching your account information from the server.</p>
          </section>
        </div>
      </main>
    );
  }

  if (loadError || !profile) {
    return (
      <main className="seller-store-profile-page">
        <div className="seller-store-profile-body">
          <section className="seller-store-profile-introduction">
            <p className="seller-store-profile-label">
              SELLER STORE PROFILE
            </p>
            <h1>Unavailable</h1>
            <p>{loadError || "Profile could not be loaded."}</p>
            <button
              type="button"
              className="seller-profile-primary-button"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="seller-store-profile-page">
      <div
        className="seller-store-profile-body"
        hidden={showEdit || showPassword}
      >
        {/* PAGE INTRODUCTION */}
        <section className="seller-store-profile-introduction">
          <p className="seller-store-profile-label">
            SELLER STORE PROFILE
          </p>

          <h1>{profile.store_name || "My Store"}</h1>

          <p>
            View and manage your personal information,
            business address, store details, and account security.
          </p>
        </section>

        {notice && (
          <p className="seller-profile-notice" role="status">
            {notice}
          </p>
        )}

        {/* PROFILE GRID */}
        <section className="seller-store-profile-grid">
          {/* SELLER ACCOUNT INFORMATION */}
          <article className="seller-profile-card seller-profile-account-card">
            <h2>Seller Account Information</h2>

            <dl className="seller-profile-details">
              <InformationRow
                label="Full Name"
                value={profile.full_name}
              />

              <InformationRow
                label="Member Since"
                value={formatJoinDate(profile.date_joined)}
              />

              <InformationRow
                label="Email"
                value={profile.email}
              />

              <InformationRow
                label="Mobile Number"
                value={profile.mobile}
              />

              <InformationRow
                label="Assigned Role"
                value={capitalizeRole(profile.role)}
              />

              <InformationRow
                label="Store Name"
                value={profile.store_name}
              />
            </dl>

            <div className="seller-profile-actions">
              <button
                type="button"
                className="seller-profile-primary-button"
                onClick={openEdit}
              >
                Edit Store Profile
              </button>

            </div>
          </article>

          {/* STORE ADDRESS */}
          <article className="seller-profile-card seller-profile-address-card">
            <h2>Store Address</h2>

            <dl className="seller-profile-details">
              <InformationRow
                label="Store Address"
                value={profile.street}
              />

              <InformationRow
                label="Barangay"
                value={profile.barangay}
              />

              <InformationRow
                label="City / Municipality"
                value={profile.city}
              />

              <InformationRow
                label="Province"
                value={profile.province}
              />

              <InformationRow
                label="Postal Code"
                value={profile.postal_code}
              />
            </dl>
          </article>

          {/* PRIVACY AND ACCOUNT ACTIONS */}
          <article className="seller-profile-card seller-profile-privacy-card">
            <h2>Privacy & Account Actions</h2>

            <div className="seller-profile-statistics">
              <p>
                <span>Owned Listings</span>
                <strong>{stats.total}</strong>
              </p>

              <p>
                <span>Approved Uploads</span>
                <strong>{stats.approved}</strong>
              </p>

              <p>
                <span>Rejected Uploads</span>
                <strong>{stats.rejected}</strong>
              </p>
            </div>

            <p className="seller-profile-warning">
              Deactivating your seller account will
              temporarily disable access. Your store
              information, uploaded products, and
              report records will be retained.
            </p>

            <div className="seller-profile-danger-actions">
              <button
                type="button"
                className="seller-profile-deactivate-button"
                onClick={openDeactivate}
              >
                Deactivate Seller Account
              </button>

              <button
                type="button"
                className="seller-profile-logout-button"
                onClick={logout}
              >
                Logout
              </button>
            </div>
          </article>
        </section>
      </div>

      {/* EDIT STORE PROFILE */}
      {showEdit && (
        <div className="seller-profile-edit-page-overlay">
          <form
            className="seller-profile-modal seller-profile-edit-modal"
            onSubmit={submitEdit}
            noValidate
          >
            <button
              type="button"
              className="seller-profile-edit-back"
              onClick={() => setShowEdit(false)}
            >
              ← Back to Store Profile
            </button>

            <p className="seller-store-profile-label">
              PROFILE DETAILS
            </p>

            <h2>Edit Store Profile</h2>

            <p className="seller-profile-modal-description">
              Changes are saved directly to your seller
              account in the database.
            </p>

            <div className="seller-profile-form-grid">
              <p className="seller-profile-form-section">
                PERSONAL INFORMATION
              </p>

            <label className="seller-profile-field">
              <span className="seller-store-profile-label">
                Full Name
              </span>
              <input
                className="seller-profile-deactivate-other"
                type="text"
                name="full_name"
                value={editForm.full_name}
                onChange={handleEditChange}
              />
              {editErrors.full_name && (
                <small className="seller-profile-form-error">
                  {editErrors.full_name}
                </small>
              )}
            </label>

            <label className="seller-profile-field">
              <span className="seller-store-profile-label">
                Store Name
              </span>
              <input
                className="seller-profile-deactivate-other"
                type="text"
                name="store_name"
                value={editForm.store_name}
                onChange={handleEditChange}
              />
              {editErrors.store_name && (
                <small className="seller-profile-form-error">
                  {editErrors.store_name}
                </small>
              )}
            </label>

            <label className="seller-profile-field">
              <span className="seller-store-profile-label">
                Mobile Number
              </span>
              <input
                className="seller-profile-deactivate-other"
                type="tel"
                name="mobile"
                value={editForm.mobile}
                onChange={handleEditChange}
                maxLength={11}
              />
              {editErrors.mobile && (
                <small className="seller-profile-form-error">
                  {editErrors.mobile}
                </small>
              )}
            </label>

              <p className="seller-profile-form-section">
                STORE ADDRESS
              </p>

            <label className="seller-profile-field full">
              <span className="seller-store-profile-label">
                Store Address
              </span>
              <input
                className="seller-profile-deactivate-other"
                type="text"
                name="street"
                value={editForm.street}
                onChange={handleEditChange}
              />
              {editErrors.street && (
                <small className="seller-profile-form-error">
                  {editErrors.street}
                </small>
              )}
            </label>

            <label className="seller-profile-field">
              <span className="seller-store-profile-label">
                Barangay
              </span>
              <input
                className="seller-profile-deactivate-other"
                type="text"
                name="barangay"
                value={editForm.barangay}
                onChange={handleEditChange}
              />
              {editErrors.barangay && (
                <small className="seller-profile-form-error">
                  {editErrors.barangay}
                </small>
              )}
            </label>

            <label className="seller-profile-field">
              <span className="seller-store-profile-label">
                City / Municipality
              </span>
              <input
                className="seller-profile-deactivate-other"
                type="text"
                name="city"
                value={editForm.city}
                onChange={handleEditChange}
              />
              {editErrors.city && (
                <small className="seller-profile-form-error">
                  {editErrors.city}
                </small>
              )}
            </label>

            <label className="seller-profile-field">
              <span className="seller-store-profile-label">
                Province
              </span>
              <select
                className="seller-profile-deactivate-other"
                name="province"
                value={editForm.province}
                onChange={handleEditChange}
              >
                <option value="">Select your province</option>
                {PROVINCES.map((province) => (
                  <option key={province} value={province}>
                    {province}
                  </option>
                ))}
              </select>
              {editErrors.province && (
                <small className="seller-profile-form-error">
                  {editErrors.province}
                </small>
              )}
            </label>

            <label className="seller-profile-field">
              <span className="seller-store-profile-label">
                Postal Code
              </span>
              <input
                className="seller-profile-deactivate-other"
                type="text"
                name="postal_code"
                value={editForm.postal_code}
                onChange={handleEditChange}
                maxLength={4}
              />
              {editErrors.postal_code && (
                <small className="seller-profile-form-error">
                  {editErrors.postal_code}
                </small>
              )}
            </label>
            </div>

            {editErrors.form && (
              <p className="seller-profile-form-error" role="alert">
                {editErrors.form}
              </p>
            )}

            <div className="seller-profile-modal-actions seller-profile-edit-actions">
              <button
                type="button"
                className="seller-profile-secondary-button"
                onClick={() => setShowEdit(false)}
                disabled={editSaving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="seller-profile-secondary-button"
                onClick={openPassword}
                disabled={editSaving}
              >
                Change Password
              </button>

              <button
                type="submit"
                className="seller-profile-primary-button"
                disabled={editSaving}
              >
                {editSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CHANGE PASSWORD PAGE */}
      {showPassword && (
        <div className="seller-profile-edit-page-overlay">
          <form
            className="seller-profile-modal seller-profile-edit-modal seller-profile-password-page"
            onSubmit={submitPassword}
            noValidate
          >
            <button
              type="button"
              className="seller-profile-edit-back"
              onClick={closePassword}
            >
              ← Back to Edit Store Profile
            </button>

            <p className="seller-store-profile-label">
              ACCOUNT SECURITY
            </p>

            <h2>Change Password</h2>

            <p className="seller-profile-modal-description">
              Enter your current password and create a secure new password.
            </p>

            <div className="seller-profile-password-fields">
              {[
                ["old_password", "Current Password", "current-password"],
                ["new_password", "New Password", "new-password"],
                ["new_password_confirm", "Confirm New Password", "new-password"],
              ].map(([name, label, autoComplete]) => (
                <label className="seller-profile-field" key={name}>
                  <span className="seller-store-profile-label">
                    {label}
                  </span>
                  <div className="seller-profile-password-input">
                    <input
                      type={visiblePasswords[name] ? "text" : "password"}
                      name={name}
                      value={pwForm[name]}
                      onChange={handlePwChange}
                      autoComplete={autoComplete}
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility(name)}
                      aria-label={`${visiblePasswords[name] ? "Hide" : "Show"} ${label}`}
                    >
                      {visiblePasswords[name] ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>
              ))}
            </div>

            <section className="seller-profile-password-rules">
              <strong>Password requirements</strong>
              {PASSWORD_RULES.map((rule) => {
                const passed = rule.test(pwForm.new_password);

                return (
                  <p className={passed ? "passed" : ""} key={rule.label}>
                    <span aria-hidden="true">{passed ? "✓" : "○"}</span>
                    Include {rule.label}.
                  </p>
                );
              })}
            </section>

            {pwError && (
              <p className="seller-profile-form-error" role="alert">
                {pwError}
              </p>
            )}

            <div className="seller-profile-modal-actions">
              <button
                type="button"
                className="seller-profile-secondary-button"
                onClick={closePassword}
                disabled={pwSaving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="seller-profile-primary-button"
                disabled={pwSaving}
              >
                {pwSaving ? "Updating…" : "Update Password"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DEACTIVATION CONFIRMATION POPUP */}
      {showDeactivate && (
        <div
          className="seller-profile-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDeactivate();
            }
          }}
        >
          <section
            className="seller-profile-modal seller-profile-deactivate-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-deactivate-title"
          >
            <button
              type="button"
              className="seller-profile-modal-close"
              onClick={closeDeactivate}
              aria-label="Close dialog"
            >
              ×
            </button>

            <div className="seller-profile-deactivate-icon">
              <DeactivateIcon />
            </div>

            <p className="seller-store-profile-label">
              ACCOUNT SECURITY
            </p>

            <h2 id="seller-deactivate-title">
              Deactivate Your Seller Account?
            </h2>

            <p className="seller-profile-modal-description">
              Your seller account will be marked as
              deactivated and you will be signed out.
              Your store records and products will not
              be deleted.
            </p>

            <div className="seller-profile-deactivate-warning">
              <strong>Before you continue</strong>

              <p>
                Deactivation is enforced by the backend:
                login and all API access will be blocked
                until the account is reactivated by support.
              </p>
            </div>

            <fieldset className="seller-profile-deactivate-reasons">
              <legend>Reason for deactivation *</legend>

              {REASONS.map(([value, label]) => (
                <label
                  key={value}
                  className={`seller-profile-deactivate-reason ${
                    reason === value ? "selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="deactivationReason"
                    value={value}
                    checked={reason === value}
                    onChange={() => {
                      setReason(value);
                      setDeactivateError("");
                    }}
                  />
                  <span>{label}</span>
                </label>
              ))}

              {reason === "Other" && (
                <textarea
                  className="seller-profile-deactivate-other"
                  value={otherReason}
                  onChange={(event) => {
                    setOtherReason(event.target.value.slice(0, 300));
                    setDeactivateError("");
                  }}
                  placeholder="Please specify your reason..."
                  rows={3}
                  maxLength={300}
                />
              )}
            </fieldset>

            <label className="seller-profile-deactivate-confirmation">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => {
                  setAcknowledged(event.target.checked);
                  setDeactivateError("");
                }}
              />
              <span>
                I understand that my seller account will be
                deactivated and I will be signed out.
              </span>
            </label>

            {deactivateError && (
              <p className="seller-profile-form-error" role="alert">
                {deactivateError}
              </p>
            )}

            <div className="seller-profile-modal-actions">
              <button
                type="button"
                className="seller-profile-secondary-button"
                onClick={closeDeactivate}
                disabled={deactivating}
              >
                Cancel
              </button>

              <button
                type="button"
                className="seller-profile-deactivate-button"
                disabled={!validReason || !acknowledged || deactivating}
                onClick={confirmDeactivate}
              >
                {deactivating ? "Deactivating…" : "Confirm Deactivation"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default SellerStoreProfilePage;