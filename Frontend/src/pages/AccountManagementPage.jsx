import { useMemo } from "react";
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
      const localValue =
        localStorage.getItem(key);

      const sessionValue =
        sessionStorage.getItem(key);

      const savedValue =
        localValue || sessionValue;

      if (savedValue) {
        const parsedValue =
          JSON.parse(savedValue);

        if (
          parsedValue &&
          typeof parsedValue === "object"
        ) {
          return {
            ...defaultAccount,
            ...parsedValue,
          };
        }
      }
    } catch (error) {
      console.error(
        `Unable to read ${key}:`,
        error,
      );
    }
  }

  return defaultAccount;
}

function AccountManagementPage() {
  const navigate = useNavigate();

  const account = useMemo(
    () => readStoredAccount(),
    [],
  );

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
    account.streetAddress ||
    account.street ||
    defaultAccount.streetAddress;

  const barangayCity =
    account.barangayCity ||
    account.city ||
    account.barangay ||
    defaultAccount.barangayCity;

  const province =
    account.province ||
    defaultAccount.province;

  const postalCode =
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

  return (
    <main className="account-page">
      <section className="account-page-introduction">
        <p className="account-page-eyebrow">
          MY ACCOUNT
        </p>

        <h1>Account Management</h1>

        <p className="account-page-description">
          Keep your personal details,
          delivery address, and security
          information up to date.
        </p>
      </section>

      <section className="account-page-grid">
        <article className="account-card account-profile-card">
          <div className="account-card-heading">
            <div>
              <p className="account-card-label">
                PROFILE DETAILS
              </p>

              <h2>
                Personal information
              </h2>
            </div>

            <button
              type="button"
              className="account-primary-button"
              onClick={() =>
                navigate(
                  "/shopper/account/edit#profile",
                )
              }
            >
              Edit Profile
            </button>
          </div>

          <div className="account-information-list">
            <InformationRow
              label="Full Name"
              value={fullName}
            />

            <InformationRow
              label="Username"
              value={username}
            />

            <InformationRow
              label="Email Address"
              value={email}
            />

            <InformationRow
              label="Mobile Number"
              value={mobileNumber}
            />
          </div>
        </article>

        <article className="account-card account-security-card">
          <div className="account-card-heading">
            <div>
              <p className="account-card-label">
                ACCOUNT SECURITY
              </p>

              <h2>
                Password and privacy
              </h2>
            </div>
          </div>

          <div className="account-security-information">
            <div className="account-security-icon">
              <LockIcon />
            </div>

            <div>
              <strong>Password</strong>

              <p>
                Use a strong password that
                you do not use for another
                account.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="account-secondary-button account-full-button"
            onClick={() =>
              navigate(
                "/shopper/account/edit#password",
              )
            }
          >
            Change Password
          </button>
        </article>

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
                  "/shopper/account/edit#address",
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

              <p>{completeAddress}</p>
            </div>
          </div>

          <div className="account-address-details">
            <InformationRow
              label="Street Address"
              value={streetAddress}
            />

            <InformationRow
              label="Barangay / City"
              value={barangayCity}
            />

            <InformationRow
              label="Province"
              value={province}
            />

            <InformationRow
              label="Postal Code"
              value={postalCode}
            />
          </div>
        </article>

        <article className="account-card account-actions-card">
          <div className="account-card-heading">
            <div>
              <p className="account-card-label">
                ACCOUNT ACTIONS
              </p>

              <h2>
                Privacy and account control
              </h2>
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
                  "/shopper/account/edit#profile",
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
                  "/shopper/account/edit#password",
                )
              }
            />

            <AccountAction
              icon={<TrashIcon />}
              title="Delete shopper account"
              description="Permanently remove your shopper account and saved information."
              buttonLabel="Account Deletion"
              danger
              onClick={() =>
                navigate(
                  "/shopper/account/edit#danger-zone",
                )
              }
            />
          </div>
        </article>
      </section>
    </main>
  );
}

function InformationRow({
  label,
  value,
}) {
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
      className={
        danger
          ? "account-action-item danger"
          : "account-action-item"
      }
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
        className={
          danger
            ? "account-action-button danger"
            : "account-action-button"
        }
        onClick={onClick}
      >
        {buttonLabel}
      </button>
    </div>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
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
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />

      <circle
        cx="12"
        cy="10"
        r="2.5"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="8"
        r="4"
      />

      <path d="M4 21c.8-5 3.5-7 8-7s7.2 2 8 7" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M12 3 20 6v5c0 5.2-3.1 8.5-8 10-4.9-1.5-8-4.8-8-10V6l8-3Z" />

      <path d="m9 12 2 2 4-5" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" />
    </svg>
  );
}

export default AccountManagementPage;