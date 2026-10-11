
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./css/AccountManagementPage.css";

const defaultAccount = {
  fullName: "Karol Tamo",
  username: "dein",
  email: "karol@gmail.com",
  mobileNumber: "09123456781",
  streetAddress: "123 Sample Street",
  barangayCity: "Makati City",
  province: "Metro Manila",
  postalCode: "1200",
};

function readStoredAccount() {
  const storageKeys = [
    "fitfusion-current-user",
    "registeredAccount",
    "fitfusion-shopper-account",
  ];

  for (const key of storageKeys) {
    try {
      const savedValue =
        localStorage.getItem(key) ||
        sessionStorage.getItem(key);

      if (!savedValue) continue;

      const parsedValue = JSON.parse(savedValue);

      if (
        parsedValue &&
        typeof parsedValue === "object" &&
        !Array.isArray(parsedValue)
      ) {
        return {
          ...defaultAccount,
          ...parsedValue,
        };
      }
    } catch (error) {
      console.error(`Unable to read ${key}:`, error);
    }
  }

  return defaultAccount;
}

function getAccountDetails(account) {
  const address =
    account.address &&
    typeof account.address === "object"
      ? account.address
      : {};

  const fullName =
    account.fullName ||
    account.name ||
    defaultAccount.fullName;

  const username =
    account.username ||
    defaultAccount.username;

  const email =
    account.email ||
    defaultAccount.email;

  const mobileNumber =
    account.mobileNumber ||
    account.mobile ||
    account.phone ||
    defaultAccount.mobileNumber;

  const streetAddress =
    address.street ||
    account.streetAddress ||
    account.street ||
    (typeof account.address === "string"
      ? account.address
      : "") ||
    defaultAccount.streetAddress;

  const barangay =
    address.barangay ||
    account.barangay ||
    "";

  const city =
    address.city ||
    account.city ||
    "";

  const barangayCity =
    account.barangayCity ||
    [barangay, city].filter(Boolean).join(", ") ||
    defaultAccount.barangayCity;

  const province =
    address.province ||
    account.province ||
    defaultAccount.province;

  const postalCode =
    address.postalCode ||
    account.postalCode ||
    account.zipCode ||
    defaultAccount.postalCode;

  const completeAddress = [
    streetAddress,
    barangayCity,
    province,
    postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    fullName,
    username,
    email,
    mobileNumber,
    streetAddress,
    barangayCity,
    province,
    postalCode,
    completeAddress,
  };
}

function AccountManagementPage() {
  const navigate = useNavigate();

  const [account] = useState(readStoredAccount);

  const [showDeactivateModal, setShowDeactivateModal] =
    useState(false);

  const [deactivationReason, setDeactivationReason] =
    useState("");

  const [otherReason, setOtherReason] =
    useState("");

  const [confirmationChecked, setConfirmationChecked] =
    useState(false);

  const [deactivationError, setDeactivationError] =
    useState("");

  const [isDeactivating, setIsDeactivating] =
    useState(false);

  const details = getAccountDetails(account);

  const reasons = [
    {
      value: "Taking a break",
      label: "I want to take a break",
    },
    {
      value: "Privacy concerns",
      label: "Privacy or security concerns",
    },
    {
      value: "Not using the platform",
      label: "I am no longer using FitFusion AI",
    },
    {
      value: "Other",
      label: "Other reason",
    },
  ];

  const reasonIsValid =
    deactivationReason !== "" &&
    (
      deactivationReason !== "Other" ||
      otherReason.trim().length > 0
    );

  const canDeactivate =
    reasonIsValid &&
    confirmationChecked &&
    !isDeactivating;

  useEffect(() => {
    if (!showDeactivateModal) return;

    function handleEscape(event) {
      if (event.key === "Escape") {
        closeDeactivateModal();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [showDeactivateModal]);

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

  function handleDeactivateAccount() {
    if (!reasonIsValid) {
      setDeactivationError(
        "Please select a reason for deactivation."
      );
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

    const updatedAccount = {
      ...account,
      role: account.role || "shopper",
      accountStatus: "deactivated",
      isActive: false,
      deactivationReason: finalReason,
      deactivatedAt: new Date().toISOString(),
    };

    try {
      // Frontend-only deactivation.
      // Save the status without deleting account data.

      const serializedAccount =
        JSON.stringify(updatedAccount);

      localStorage.setItem(
        "fitfusion-current-user",
        serializedAccount
      );

      localStorage.setItem(
        "registeredAccount",
        serializedAccount
      );

      localStorage.setItem(
        "fitfusion-shopper-account",
        serializedAccount
      );

      // Synchronize the existing mock account list.
      let savedUsers = [];

      try {
        const parsedUsers = JSON.parse(
          localStorage.getItem("fitfusion-users") || "[]"
        );

        savedUsers = Array.isArray(parsedUsers)
          ? parsedUsers
          : [];
      } catch {
        savedUsers = [];
      }

      const matchingUser = (user) => {
        if (
          updatedAccount.id &&
          user.id === updatedAccount.id
        ) {
          return true;
        }

        return (
          user.role !== "seller" &&
          String(user.email || "").toLowerCase() ===
            String(updatedAccount.email || "").toLowerCase()
        );
      };

      const accountExists =
        savedUsers.some(matchingUser);

      const updatedUsers = accountExists
        ? savedUsers.map((user) =>
            matchingUser(user)
              ? { ...user, ...updatedAccount }
              : user
          )
        : [...savedUsers, updatedAccount];

      localStorage.setItem(
        "fitfusion-users",
        JSON.stringify(updatedUsers)
      );

      // Clear the active frontend session.
      sessionStorage.removeItem("userRole");
      sessionStorage.removeItem("userEmail");
      sessionStorage.removeItem("registeredAccount");

      // Preserve saved account data for future reactivation.
      // Only the active login state is cleared.
      localStorage.removeItem("fitfusion-current-user");

      window.dispatchEvent(
        new Event("fitfusion-account-updated")
      );

      setShowDeactivateModal(false);

      navigate("/login", {
        replace: true,
        state: {
          deactivated: true,
          message:
            "Your account has been deactivated in this demo.",
        },
      });
    } catch (error) {
      console.error(
        "Account deactivation failed:",
        error
      );

      setDeactivationError(
        "Unable to deactivate your account. Please try again."
      );
    } finally {
      setIsDeactivating(false);
    }
  }

  return (
    <main className="account-page">
      <section className="account-page-introduction">
        <p className="account-page-eyebrow">
          MY ACCOUNT
        </p>

        <h1>Account Management</h1>

        <p className="account-page-description">
          Keep your personal details, delivery address,
          and security information up to date.
        </p>
      </section>

      <section className="account-page-grid">
        {/* PROFILE DETAILS */}
        <article className="account-card account-profile-card">
          <div className="account-card-heading">
            <div>
              <p className="account-card-label">
                PROFILE DETAILS
              </p>

              <h2>Personal information</h2>
            </div>

            <button
              type="button"
              className="account-primary-button"
              onClick={() =>
                navigate(
                  "/shopper/account/edit#profile"
                )
              }
            >
              Edit Profile
            </button>
          </div>

          <div className="account-information-list">
            <InformationRow
              label="Full Name"
              value={details.fullName}
            />

            <InformationRow
              label="Username"
              value={details.username}
            />

            <InformationRow
              label="Email Address"
              value={details.email}
            />

            <InformationRow
              label="Mobile Number"
              value={details.mobileNumber}
            />
          </div>
        </article>

        {/* ACCOUNT SECURITY */}
        <article className="account-card account-security-card">
          <div className="account-card-heading">
            <div>
              <p className="account-card-label">
                ACCOUNT SECURITY
              </p>

              <h2>Password and privacy</h2>
            </div>
          </div>

          <div className="account-security-information">
            <div className="account-security-icon">
              <LockIcon />
            </div>

            <div>
              <strong>Password</strong>

              <p>
                Use a strong password that you do not
                use for another account.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="account-secondary-button account-full-button"
            onClick={() =>
              navigate(
                "/shopper/account/edit#password"
              )
            }
          >
            Change Password
          </button>
        </article>

        {/* DELIVERY ADDRESS */}
        <article className="account-card account-address-card">
          <div className="account-card-heading">
            <div>
              <p className="account-card-label">
                DELIVERY INFORMATION
              </p>

              <h2>Delivery address</h2>
            </div>

            <button
              type="button"
              className="account-secondary-button"
              onClick={() =>
                navigate(
                  "/shopper/account/edit#address"
                )
              }
            >
              Edit Address
            </button>
          </div>

          <div className="account-address-content">
            <div className="account-address-icon">
              <LocationIcon />
            </div>

            <div>
              <strong>
                Default delivery address
              </strong>

              <p>{details.completeAddress}</p>
            </div>
          </div>

          <div className="account-address-details">
            <InformationRow
              label="Street Address"
              value={details.streetAddress}
            />

            <InformationRow
              label="Barangay / City"
              value={details.barangayCity}
            />

            <InformationRow
              label="Province"
              value={details.province}
            />

            <InformationRow
              label="Postal Code"
              value={details.postalCode}
            />
          </div>
        </article>

        {/* ACCOUNT ACTIONS */}
        <article className="account-card account-actions-card">
          <div className="account-card-heading">
            <div>
              <p className="account-card-label">
                ACCOUNT ACTIONS
              </p>

              <h2>Privacy and account control</h2>
            </div>
          </div>

          <div className="account-action-list">
            <AccountAction
              icon={<UserIcon />}
              title="Update account details"
              description="Edit your name, username, email address, and mobile number."
              buttonLabel="Manage Profile"
              onClick={() =>
                navigate(
                  "/shopper/account/edit#profile"
                )
              }
            />

            <AccountAction
              icon={<ShieldIcon />}
              title="Manage account security"
              description="Change your password and review the security of your account."
              buttonLabel="Security Settings"
              onClick={() =>
                navigate(
                  "/shopper/account/edit#password"
                )
              }
            />

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
      </section>

      {/* DEACTIVATION CONFIRMATION MODAL */}
      {showDeactivateModal && (
        <div
          className="account-deactivate-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
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

            <p className="account-deactivate-eyebrow">
              ACCOUNT SECURITY
            </p>

            <h2 id="deactivate-modal-title">
              Deactivate Your Account?
            </h2>

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
              <strong>
                Before you continue
              </strong>

              <p>
                You will be signed out of FitFusion AI.
                Deactivation is simulated during frontend
                development and does not yet prevent
                authentication through a backend.
              </p>
            </div>

            <fieldset className="account-deactivate-reasons">
              <legend>
                Reason for deactivation *
              </legend>

              {reasons.map((reason) => (
                <label
                  key={reason.value}
                  className={`account-deactivate-reason ${
                    deactivationReason === reason.value
                      ? "selected"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="deactivationReason"
                    value={reason.value}
                    checked={
                      deactivationReason === reason.value
                    }
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
                    setOtherReason(
                      event.target.value.slice(0, 300)
                    );
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
                  setConfirmationChecked(
                    event.target.checked
                  );
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
              <div
                className="account-deactivate-error"
                role="alert"
              >
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
                {isDeactivating
                  ? "Deactivating..."
                  : "Confirm Deactivation"}
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
    <div
      className={`account-action-item ${
        danger ? "danger" : ""
      }`}
    >
      <div className="account-action-icon">
        {icon}
      </div>

      <div className="account-action-text">
        <strong>{title}</strong>
        <p>{description}</p>
      </div>

      <button
        type="button"
        className={`account-action-button ${
          danger ? "danger" : ""
        }`}
        onClick={onClick}
      >
        {buttonLabel}
      </button>
    </div>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect
        x="5"
        y="10"
        width="14"
        height="11"
        rx="2"
      />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
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

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c.8-5 3.5-7 8-7s7.2 2 8 7" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 20 6v5c0 5.2-3.1 8.5-8 10-4.9-1.5-8-4.8-8-10V6l8-3Z" />
      <path d="m9 12 2 2 4-5" />
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
