import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";
import "./css/AccountManagementPage.css";

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

function clearAuthStorage() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("fitfusion-current-user");
  sessionStorage.removeItem("userRole");
  sessionStorage.removeItem("userEmail");
  sessionStorage.removeItem("registeredAccount");
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

function AccountManagementPage() {
  const navigate = useNavigate();

  /* ---------- real profile from MongoDB ---------- */
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");

  /* ---------- edit profile modal ---------- */
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    mobile: "",
    street: "",
    barangay: "",
    city: "",
    province: "",
    postal_code: "",
  });
  const [editErrors, setEditErrors] = useState({});
  const [editSaving, setEditSaving] = useState(false);

  /* ---------- deactivation modal ---------- */
  const [showDeactivateModal, setShowDeactivateModal] =
    useState(false);
  const [deactivationReason, setDeactivationReason] =
    useState("");
  const [otherReason, setOtherReason] = useState("");
  const [confirmationChecked, setConfirmationChecked] =
    useState(false);
  const [deactivationError, setDeactivationError] =
    useState("");
  const [isDeactivating, setIsDeactivating] =
    useState(false);

  /* ---------- fetch real account on mount (FR-1.2) ---------- */
  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
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
          // non-critical cache sync
        }
      } catch (error) {
        console.error("Profile load failed:", error);
        if (!cancelled) {
          setLoadError(
            "Could not load your account details. Please try again."
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

  /* ---------- derived display values ---------- */
  const details = useMemo(() => {
    if (!profile) return null;

    const barangay = profile.barangay || "";
    const city = profile.city || "";
    const barangayCity =
      [barangay, city].filter(Boolean).join(", ");

    const completeAddress = [
      profile.street,
      barangay,
      city,
      profile.province,
      profile.postal_code,
    ]
      .filter(Boolean)
      .join(", ");

    return {
      fullName: profile.full_name || "",
      email: profile.email || "",
      mobileNumber: profile.mobile || "",
      memberSince: formatJoinDate(profile.date_joined),
      streetAddress: profile.street || "",
      barangayCity,
      province: profile.province || "",
      postalCode: profile.postal_code || "",
      completeAddress,
    };
  }, [profile]);

  const reasons = [
    { value: "Taking a break", label: "I want to take a break" },
    { value: "Privacy concerns", label: "Privacy or security concerns" },
    { value: "Not using the platform", label: "I am no longer using FitFusion AI" },
    { value: "Other", label: "Other reason" },
  ];

  const reasonIsValid =
    deactivationReason !== "" &&
    (deactivationReason !== "Other" || otherReason.trim().length > 0);

  const canDeactivate =
    reasonIsValid && confirmationChecked && !isDeactivating;

  /* ---------- escape-key closing for both modals ---------- */
  useEffect(() => {
    if (!showDeactivateModal && !showEditModal) return;

    function handleEscape(event) {
      if (event.key === "Escape") {
        if (showDeactivateModal) closeDeactivateModal();
        if (showEditModal) closeEditModal();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [showDeactivateModal, showEditModal]);

  function showNotice(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 4000);
  }

  /* ---------- EDIT PROFILE (FR-1.3) ---------- */
  function openEditModal() {
    if (!profile) return;
    setEditForm({
      full_name: profile.full_name || "",
      mobile: profile.mobile || "",
      street: profile.street || "",
      barangay: profile.barangay || "",
      city: profile.city || "",
      province: profile.province || "",
      postal_code: profile.postal_code || "",
    });
    setEditErrors({});
    setShowEditModal(true);
  }

  function closeEditModal() {
    if (editSaving) return;
    setShowEditModal(false);
    setEditErrors({});
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
    if (!/^\d{11}$/.test(editForm.mobile)) {
      nextErrors.mobile = "Mobile number must contain exactly 11 digits.";
    } else if (!editForm.mobile.startsWith("09")) {
      nextErrors.mobile = "Philippine mobile number must start with 09.";
    }
    if (!editForm.street.trim()) {
      nextErrors.street = "Street address is required.";
    }
    if (!editForm.barangay.trim()) {
      nextErrors.barangay = "Barangay is required.";
    }
    if (!editForm.city.trim()) {
      nextErrors.city = "City is required.";
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

  async function handleSaveProfile(event) {
    event.preventDefault();
    if (!validateEdit()) return;
    if (editSaving) return;

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
        // non-critical cache sync
      }

      window.dispatchEvent(new Event("fitfusion-account-updated"));
      setShowEditModal(false);
      showNotice("Profile and delivery address updated successfully.");
    } catch (error) {
      console.error("Profile update failed:", error);
      let message = "Update failed. Please try again.";
      try {
        const data = JSON.parse(error.message);
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

  /* ---------- DEACTIVATE (FR-1.4, real backend call) ---------- */
  function openDeactivateModal() {
    setDeactivationReason("");
    setOtherReason("");
    setConfirmationChecked(false);
    setDeactivationError("");
    setShowDeactivateModal(true);
  }

  function closeDeactivateModal() {
    if (isDeactivating) return;
    setShowDeactivateModal(false);
    setDeactivationReason("");
    setOtherReason("");
    setConfirmationChecked(false);
    setDeactivationError("");
  }

  async function handleDeactivateAccount() {
    if (!reasonIsValid) {
      setDeactivationError("Please select a reason for deactivation.");
      return;
    }

    if (!confirmationChecked) {
      setDeactivationError(
        "Please confirm that you understand the effects of deactivation."
      );
      return;
    }

    if (isDeactivating) return;

    setIsDeactivating(true);
    setDeactivationError("");

    const finalReason =
      deactivationReason === "Other"
        ? otherReason.trim()
        : deactivationReason;

    try {
      await authAPI.deactivateAccount({
        reason: finalReason,
        refresh: localStorage.getItem("refresh_token") || "",
      });

      window.dispatchEvent(new Event("fitfusion-account-updated"));
      clearAuthStorage();

      navigate("/login", {
        replace: true,
        state: {
          deactivated: true,
          message:
            "Your account has been deactivated. Your data is retained for future reactivation.",
        },
      });
    } catch (error) {
      console.error("Account deactivation failed:", error);
      setDeactivationError(
        "Unable to deactivate your account. Please try again."
      );
      setIsDeactivating(false);
    }
  }

  /* ---------- render states ---------- */
  if (isLoading) {
    return (
      <main className="account-page">
        <section className="account-page-introduction">
          <p className="account-page-eyebrow">MY ACCOUNT</p>
          <h1>Account Management</h1>
          <p className="account-page-description">
            Loading your account details from the server...
          </p>
        </section>
      </main>
    );
  }

  if (loadError || !profile || !details) {
    return (
      <main className="account-page">
        <section className="account-page-introduction">
          <p className="account-page-eyebrow">MY ACCOUNT</p>
          <h1>Account Management</h1>
          <p className="account-page-description">
            {loadError || "Account details are unavailable."}
          </p>
          <button
            type="button"
            className="account-primary-button"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="account-page">
      <section className="account-page-introduction">
        <p className="account-page-eyebrow">MY ACCOUNT</p>

        <h1>Account Management</h1>

        <p className="account-page-description">
          Keep your personal details, delivery address,
          and security information up to date.
        </p>
      </section>

      {notice && (
        <div className="account-deactivate-error" role="status" style={{ background: "#eef6ee", borderColor: "#2f6b3a", color: "#2f6b3a" }}>
          {notice}
        </div>
      )}

      <section className="account-page-grid">
        {/* PROFILE DETAILS */}
        <article className="account-card account-profile-card">
          <div className="account-card-heading">
            <div>
              <p className="account-card-label">PROFILE DETAILS</p>
              <h2>Personal information</h2>
            </div>

            <button
              type="button"
              className="account-primary-button"
              onClick={openEditModal}
            >
              Edit Profile
            </button>
          </div>

          <div className="account-information-list">
            <InformationRow label="Full Name" value={details.fullName} />
            <InformationRow label="Member Since" value={details.memberSince} />
            <InformationRow label="Email Address" value={details.email} />
            <InformationRow label="Mobile Number" value={details.mobileNumber} />
          </div>
        </article>

        {/* ACCOUNT ACTIONS */}
        <article className="account-card account-actions-card">
          <div className="account-card-heading">
            <div>
              <p className="account-card-label">ACCOUNT DEACTIVATION</p>
              <h2>Deactivate your account</h2>
            </div>
          </div>

          <div className="account-action-list">
            <AccountAction
              icon={<DeactivateIcon />}
              title="Deactivate Account"
              description="Temporarily disable your shopper account while retaining your profile, saved outfits, and order information."
              buttonLabel="Deactivate Account"
              danger
              onClick={openDeactivateModal}
            />
          </div>
        </article>

        {/* DELIVERY ADDRESS */}
        <article className="account-card account-address-card">
          <div className="account-card-heading">
            <div>
              <p className="account-card-label">DELIVERY INFORMATION</p>
              <h2>Delivery address</h2>
            </div>
          </div>

          <div className="account-address-content">
            <div className="account-address-icon">
              <LocationIcon />
            </div>

            <div>
              <strong>Default delivery address</strong>
              <p>{details.completeAddress || "Not provided"}</p>
            </div>
          </div>

          <div className="account-address-details">
            <InformationRow label="Street Address" value={details.streetAddress} />
            <InformationRow label="Barangay / City" value={details.barangayCity} />
            <InformationRow label="Province" value={details.province} />
            <InformationRow label="Postal Code" value={details.postalCode} />
          </div>
        </article>
      </section>

      {/* EDIT PROFILE MODAL (FR-1.3) */}
      {showEditModal && (
        <div
          className="account-deactivate-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeEditModal();
            }
          }}
        >
          <form
            className="account-deactivate-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-modal-title"
            onSubmit={handleSaveProfile}
            noValidate
          >
            <button
              type="button"
              className="account-deactivate-close"
              onClick={closeEditModal}
              aria-label="Close edit dialog"
              disabled={editSaving}
            >
              ×
            </button>

            <p className="account-deactivate-eyebrow">PROFILE SETTINGS</p>

            <h2 id="edit-modal-title">Edit Profile & Delivery Address</h2>

            <p className="account-deactivate-description">
              Changes are saved directly to your account in the
              database. Email address and role cannot be changed.
            </p>

            <label className="account-card-label">Full Name</label>
            <input
              className="account-deactivate-other"
              type="text"
              name="full_name"
              value={editForm.full_name}
              onChange={handleEditChange}
            />
            {editErrors.full_name && (
              <div className="account-deactivate-error" role="alert">
                {editErrors.full_name}
              </div>
            )}

            <label className="account-card-label">Mobile Number</label>
            <input
              className="account-deactivate-other"
              type="tel"
              name="mobile"
              value={editForm.mobile}
              onChange={handleEditChange}
              maxLength={11}
            />
            {editErrors.mobile && (
              <div className="account-deactivate-error" role="alert">
                {editErrors.mobile}
              </div>
            )}

            <label className="account-card-label">Street Address</label>
            <input
              className="account-deactivate-other"
              type="text"
              name="street"
              value={editForm.street}
              onChange={handleEditChange}
            />
            {editErrors.street && (
              <div className="account-deactivate-error" role="alert">
                {editErrors.street}
              </div>
            )}

            <label className="account-card-label">Barangay</label>
            <input
              className="account-deactivate-other"
              type="text"
              name="barangay"
              value={editForm.barangay}
              onChange={handleEditChange}
            />
            {editErrors.barangay && (
              <div className="account-deactivate-error" role="alert">
                {editErrors.barangay}
              </div>
            )}

            <label className="account-card-label">City / Municipality</label>
            <input
              className="account-deactivate-other"
              type="text"
              name="city"
              value={editForm.city}
              onChange={handleEditChange}
            />
            {editErrors.city && (
              <div className="account-deactivate-error" role="alert">
                {editErrors.city}
              </div>
            )}

            <label className="account-card-label">Province</label>
            <select
              className="account-deactivate-other"
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
              <div className="account-deactivate-error" role="alert">
                {editErrors.province}
              </div>
            )}

            <label className="account-card-label">Postal Code</label>
            <input
              className="account-deactivate-other"
              type="text"
              name="postal_code"
              value={editForm.postal_code}
              onChange={handleEditChange}
              maxLength={4}
            />
            {editErrors.postal_code && (
              <div className="account-deactivate-error" role="alert">
                {editErrors.postal_code}
              </div>
            )}

            {editErrors.form && (
              <div className="account-deactivate-error" role="alert">
                {editErrors.form}
              </div>
            )}

            <div className="account-deactivate-actions">
              <button
                type="button"
                className="account-deactivate-cancel"
                onClick={closeEditModal}
                disabled={editSaving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="account-deactivate-submit"
                disabled={editSaving}
              >
                {editSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DEACTIVATION CONFIRMATION MODAL (FR-1.4) */}
      {showDeactivateModal && (
        <div
          className="account-deactivate-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDeactivateModal();
            }
          }}
        >
          <section
            className="account-deactivate-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="deactivate-modal-title"
            aria-describedby="deactivate-modal-description"
          >
            <button
              type="button"
              className="account-deactivate-close"
              onClick={closeDeactivateModal}
              aria-label="Close deactivation dialog"
              disabled={isDeactivating}
            >
              ×
            </button>

            <div className="account-deactivate-icon">
              <DeactivateIcon />
            </div>

            <p className="account-deactivate-eyebrow">ACCOUNT SECURITY</p>

            <h2 id="deactivate-modal-title">Deactivate Your Account?</h2>

            <p
              id="deactivate-modal-description"
              className="account-deactivate-description"
            >
              Your account will be temporarily deactivated.
              Your profile information, saved outfits,
              and order history will be retained for
              future reactivation.
            </p>

            <div className="account-deactivate-warning">
              <strong>Before you continue</strong>
              <p>
                You will be signed out of FitFusion AI.
                Deactivation is enforced by the backend:
                login and all API access are blocked until
                your account is reactivated. Your data is
                retained in compliance with RA 10173.
              </p>
            </div>

            <fieldset className="account-deactivate-reasons">
              <legend>Reason for deactivation *</legend>

              {reasons.map((reason) => (
                <label
                  key={reason.value}
                  className={`account-deactivate-reason ${
                    deactivationReason === reason.value ? "selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="deactivationReason"
                    value={reason.value}
                    checked={deactivationReason === reason.value}
                    onChange={() => {
                      setDeactivationReason(reason.value);
                      setDeactivationError("");
                    }}
                  />
                  <span>{reason.label}</span>
                </label>
              ))}

              {deactivationReason === "Other" && (
                <textarea
                  className="account-deactivate-other"
                  value={otherReason}
                  onChange={(event) => {
                    setOtherReason(event.target.value.slice(0, 300));
                    setDeactivationError("");
                  }}
                  placeholder="Please specify your reason..."
                  rows={3}
                  maxLength={300}
                  aria-label="Other deactivation reason"
                />
              )}
            </fieldset>

            <label className="account-deactivate-confirmation">
              <input
                type="checkbox"
                checked={confirmationChecked}
                onChange={(event) => {
                  setConfirmationChecked(event.target.checked);
                  setDeactivationError("");
                }}
              />
              <span>
                I understand that my account will be
                temporarily deactivated and that I
                will be signed out.
              </span>
            </label>

            {deactivationError && (
              <div className="account-deactivate-error" role="alert">
                {deactivationError}
              </div>
            )}

            <div className="account-deactivate-actions">
              <button
                type="button"
                className="account-deactivate-cancel"
                onClick={closeDeactivateModal}
                disabled={isDeactivating}
              >
                Cancel
              </button>

              <button
                type="button"
                className="account-deactivate-submit"
                onClick={handleDeactivateAccount}
                disabled={!canDeactivate}
              >
                {isDeactivating ? "Deactivating..." : "Confirm Deactivation"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function InformationRow({ label, value }) {
  return (
    <div className="account-information-row">
      <span>{label}</span>
      <strong>{value || "Not provided"}</strong>
    </div>
  );
}

function AccountAction({
  icon,
  title,
  description,
  buttonLabel,
  danger = false,
  onClick,
}) {
  return (
    <div className={`account-action-item ${danger ? "danger" : ""}`}>
      <div className="account-action-icon">{icon}</div>

      <div className="account-action-text">
        <strong>{title}</strong>
        <p>{description}</p>
      </div>

      <button
        type="button"
        className={`account-action-button ${danger ? "danger" : ""}`}
        onClick={onClick}
      >
        {buttonLabel}
      </button>
    </div>
  );
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function DeactivateIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3a9 9 0 1 0 9 9" />
      <path d="M12 2v10" />
      <path d="M16 3a9 9 0 0 1 5 5" />
    </svg>
  );
}

export default AccountManagementPage;