import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";
import "./css/AccountManagementPage.css";

function clearAuthStorage() {
  const authKeys = [
    "access_token",
    "refresh_token",
    "fitfusion_access",
    "fitfusion_refresh",
    "fitfusion_user",
    "fitfusion-current-user",
    "userRole",
    "userEmail",
    "registeredAccount",
    "session",
    "fitfusion_session",
  ];

  authKeys.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
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

  /* ---------- delete (archive) modal only ---------- */
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

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

  /* ---------- DELETE (archive) modal ---------- */
  function openDeleteModal() {
    setDeleteConfirmed(false);
    setDeleteError("");
    setShowDeleteModal(true);
  }

  function closeDeleteModal() {
    if (isDeleting) return;
    setShowDeleteModal(false);
    setDeleteConfirmed(false);
    setDeleteError("");
  }

  async function handleDeleteAccount() {
    if (!deleteConfirmed) {
      setDeleteError("Please confirm that you want to archive your account.");
      return;
    }

    if (isDeleting) return;

    setIsDeleting(true);
    setDeleteError("");

    try {
      const refresh =
        localStorage.getItem("refresh_token") ||
        sessionStorage.getItem("refresh_token") ||
        "";
      await authAPI.deleteAccount(refresh);
      clearAuthStorage();
      navigate("/login", {
        replace: true,
        state: {
          archived: true,
          message:
            "Your account has been archived. Your profile, saved outfits, and order history are retained for compliance and may be restored by support.",
        },
      });
    } catch (error) {
      console.error("Account archive failed:", error);
      setDeleteError("Unable to archive your account. Please try again.");
      setIsDeleting(false);
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

        {/* ACCOUNT ACTIONS — Archive only */}
        <article className="account-card account-actions-card">
          <div className="account-card-heading">
            <div>
              <p className="account-card-label">ACCOUNT ACTIONS</p>
              <h2>Manage your account</h2>
            </div>
          </div>

          <div className="account-action-list">
            <AccountAction
              icon={<DeleteIcon />}
              title="Archive Account"
              description="Archive your account and sign out. Your profile, saved outfits, and order history are retained for compliance and may be restored by support."
              buttonLabel="Archive Account"
              danger
              onClick={openDeleteModal}
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

      {/* DELETE (ARCHIVE) CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div
          className="account-deactivate-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDeleteModal();
            }
          }}
        >
          <section
            className="account-deactivate-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
            aria-describedby="delete-modal-description"
          >
            <button
              type="button"
              className="account-deactivate-close"
              onClick={closeDeleteModal}
              aria-label="Close delete dialog"
              disabled={isDeleting}
            >
              ×
            </button>

            <div className="account-deactivate-icon">
              <DeleteIcon />
            </div>

            <p className="account-deactivate-eyebrow">DATA PRIVACY</p>

            <h2 id="delete-modal-title">Archive Your Account?</h2>

            <p id="delete-modal-description" className="account-deactivate-description">
              This action signs you out and archives your account.
              Your profile, saved outfits, and order history are retained
              in the database and may be restored by support.
            </p>

            <div className="account-deactivate-warning">
              <strong>What happens next</strong>
              <p>
                You will no longer be able to log in. Your data is not
                erased — it is archived for compliance with RA 10173.
                Contact support to reactivate your account in the future.
              </p>
            </div>

            <label className="account-deactivate-confirmation">
              <input
                type="checkbox"
                checked={deleteConfirmed}
                onChange={(event) => {
                  setDeleteConfirmed(event.target.checked);
                  setDeleteError("");
                }}
              />
              <span>
                I understand my account will be archived, I will be signed out,
                and I will not be able to log in until the account is restored.
              </span>
            </label>

            {deleteError && (
              <div className="account-deactivate-error" role="alert">
                {deleteError}
              </div>
            )}

            <div className="account-deactivate-actions">
              <button
                type="button"
                className="account-deactivate-cancel"
                onClick={closeDeleteModal}
                disabled={isDeleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="account-deactivate-submit"
                onClick={handleDeleteAccount}
                disabled={!deleteConfirmed || isDeleting}
              >
                {isDeleting ? "Archiving..." : "Confirm Archive"}
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

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export default AccountManagementPage;