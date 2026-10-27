import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";
import "./css/AccountManagementPage.css";

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
  const closeDeactivateModal = useCallback(() => {
    if (isDeactivating) return;
    setShowDeactivateModal(false);
    setDeactivationReason("");
    setOtherReason("");
    setConfirmationChecked(false);
    setDeactivationError("");
  }, [isDeactivating]);

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

  /* ---------- escape-key closing for deactivation modal ---------- */
  useEffect(() => {
    if (!showDeactivateModal) return;

    function handleEscape(event) {
      if (event.key === "Escape") {
        closeDeactivateModal();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [showDeactivateModal, closeDeactivateModal]);

  /* ---------- DEACTIVATE (FR-1.4, real backend call) ---------- */
  function openDeactivateModal() {
    setDeactivationReason("");
    setOtherReason("");
    setConfirmationChecked(false);
    setDeactivationError("");
    setShowDeactivateModal(true);
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
          Keep your personal details, home address, and
          security information up to date.
        </p>
      </section>

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
              onClick={() => navigate("/shopper/account/edit#profile")}
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

        {/* HOME ADDRESS */}
        <article className="account-card account-address-card">
          <div className="account-card-heading">
            <div>
              <p className="account-card-label">HOME ADDRESS</p>
              <h2>Home address</h2>
            </div>
          </div>

          <div className="account-address-content">
            <div className="account-address-icon">
              <LocationIcon />
            </div>

            <div>
              <strong>Home address</strong>
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