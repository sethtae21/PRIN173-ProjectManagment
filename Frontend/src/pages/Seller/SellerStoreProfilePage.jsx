import {
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import "../css/SellerStoreProfilePage.css";

const defaultSellerAccount = {
  storeName: "Maison Aurelia",
  username: "aurelia_store",
  email: "seller@aurelia.example",
  mobile: "+63 912 888 4455",
  address: "Makati, Metro Manila",
  role: "Seller",
};

function formatSellerAddress(address, account = {}) {
  if (typeof address === "string") {
    return address;
  }

  if (address && typeof address === "object") {
    const formattedAddress = [
      address.street,
      address.barangayCity,
      address.city,
      address.province,
      address.postalCode,
    ]
      .filter(Boolean)
      .join(", ");

    return (
      formattedAddress ||
      defaultSellerAccount.address
    );
  }

  const separateAddressFields = [
    account.street,
    account.barangayCity,
    account.city,
    account.province,
    account.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    separateAddressFields ||
    defaultSellerAccount.address
  );
}

function loadSellerAccount() {
  try {
    const savedAccount =
      localStorage.getItem(
        "fitfusion-seller-account"
      ) ||
      sessionStorage.getItem(
        "registeredAccount"
      );

    if (!savedAccount) {
      return defaultSellerAccount;
    }

    const account = JSON.parse(savedAccount);

    return {
      storeName:
        account.storeName ||
        account.store_name ||
        defaultSellerAccount.storeName,

      username:
        account.username ||
        defaultSellerAccount.username,

      email:
        account.email ||
        defaultSellerAccount.email,

      mobile:
        account.mobile ||
        account.phone ||
        defaultSellerAccount.mobile,

      address: formatSellerAddress(
        account.address,
        account
      ),

      role: "Seller",
    };
  } catch (error) {
    console.error(
      "Unable to load seller account:",
      error
    );

    return defaultSellerAccount;
  }
}

function loadSellerProducts() {
  try {
    const savedProducts =
      localStorage.getItem(
        "fitfusion-seller-products"
      );

    if (!savedProducts) {
      return [];
    }

    const parsedProducts =
      JSON.parse(savedProducts);

    if (Array.isArray(parsedProducts)) {
      return parsedProducts;
    }

    if (
      parsedProducts &&
      Array.isArray(parsedProducts.products)
    ) {
      return parsedProducts.products;
    }

    return [];
  } catch (error) {
    console.error(
      "Unable to load seller products:",
      error
    );

    return [];
  }
}

function SellerStoreProfilePage() {
  const navigate = useNavigate();

  const [sellerAccount, setSellerAccount] =
    useState(loadSellerAccount);

  const [activeModal, setActiveModal] =
    useState("");

  const [notice, setNotice] = useState("");

  const [profileForm, setProfileForm] =
    useState(loadSellerAccount);

  const [profileErrors, setProfileErrors] =
    useState({});

  const [passwordForm, setPasswordForm] =
    useState({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

  const [passwordErrors, setPasswordErrors] =
    useState({});

  const [
    deleteConfirmation,
    setDeleteConfirmation,
  ] = useState("");

  const sellerProducts = useMemo(
    () => loadSellerProducts(),
    []
  );

  const listingStatistics = useMemo(() => {
    if (sellerProducts.length === 0) {
      return {
        total: 24,
        active: 20,
        pending: 0,
        rejected: 4,
      };
    }

    const active = sellerProducts.filter(
      (product) =>
        product.status === "Active" ||
        product.status === "Accepted"
    ).length;

    const pending = sellerProducts.filter(
      (product) =>
        product.status === "Pending"
    ).length;

    const rejected = sellerProducts.filter(
      (product) =>
        product.status === "Rejected"
    ).length;

    return {
      total: sellerProducts.length,
      active,
      pending,
      rejected,
    };
  }, [sellerProducts]);

  const passwordRequirements = {
    length:
      passwordForm.newPassword.length >= 8,

    uppercase:
      /[A-Z]/.test(
        passwordForm.newPassword
      ),

    lowercase:
      /[a-z]/.test(
        passwordForm.newPassword
      ),

    number:
      /\d/.test(
        passwordForm.newPassword
      ),

    special:
      /[^A-Za-z0-9]/.test(
        passwordForm.newPassword
      ),
  };

  const passwordIsValid =
    Object.values(
      passwordRequirements
    ).every(Boolean);

  function openProfileModal() {
    setProfileForm({
      ...sellerAccount,
      address: formatSellerAddress(
        sellerAccount.address,
        sellerAccount
      ),
    });

    setProfileErrors({});
    setActiveModal("profile");
  }

  function openPasswordModal() {
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    setPasswordErrors({});
    setActiveModal("password");
  }

  function closeModal() {
    setActiveModal("");
    setProfileErrors({});
    setPasswordErrors({});
    setDeleteConfirmation("");
  }

  function handleProfileChange(event) {
    const { name, value } = event.target;

    setProfileForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    setProfileErrors((currentErrors) => ({
      ...currentErrors,
      [name]: "",
    }));
  }

  function validateProfile() {
    const errors = {};

    if (!profileForm.storeName.trim()) {
      errors.storeName =
        "Store Name is required.";
    }

    if (!profileForm.username.trim()) {
      errors.username =
        "Username is required.";
    }

    if (!profileForm.email.trim()) {
      errors.email =
        "Email Address is required.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        profileForm.email
      )
    ) {
      errors.email =
        "Enter a valid email address.";
    }

    if (!profileForm.mobile.trim()) {
      errors.mobile =
        "Phone Number is required.";
    }

    if (!profileForm.address.trim()) {
      errors.address =
        "Store Address is required.";
    }

    setProfileErrors(errors);

    return Object.keys(errors).length === 0;
  }

  function saveProfile(event) {
    event.preventDefault();

    if (!validateProfile()) {
      return;
    }

    const updatedAccount = {
      storeName: profileForm.storeName.trim(),
      username: profileForm.username.trim(),
      email: profileForm.email.trim(),
      mobile: profileForm.mobile.trim(),
      address: profileForm.address.trim(),
      role: "Seller",
    };

    localStorage.setItem(
      "fitfusion-seller-account",
      JSON.stringify(updatedAccount)
    );

    setSellerAccount(updatedAccount);
    setActiveModal("");

    setNotice(
      "Your seller profile was updated successfully."
    );
  }

  function handlePasswordChange(event) {
    const { name, value } = event.target;

    setPasswordForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    setPasswordErrors((currentErrors) => ({
      ...currentErrors,
      [name]: "",
    }));
  }

  function savePassword(event) {
    event.preventDefault();

    const errors = {};

    if (!passwordForm.currentPassword) {
      errors.currentPassword =
        "Enter your current password.";
    }

    if (!passwordForm.newPassword) {
      errors.newPassword =
        "Enter a new password.";
    } else if (!passwordIsValid) {
      errors.newPassword =
        "The new password must satisfy every password requirement.";
    }

    if (
      passwordForm.currentPassword &&
      passwordForm.currentPassword ===
        passwordForm.newPassword
    ) {
      errors.newPassword =
        "The new password must be different from your current password.";
    }

    if (
      passwordForm.newPassword !==
      passwordForm.confirmPassword
    ) {
      errors.confirmPassword =
        "The passwords do not match.";
    }

    setPasswordErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setActiveModal("");

    setNotice(
      "Your password was changed successfully."
    );
  }

  function deleteSellerAccount() {
    if (deleteConfirmation !== "DELETE") {
      return;
    }

    localStorage.removeItem(
      "fitfusion-seller-account"
    );

    localStorage.removeItem(
      "fitfusion-seller-products"
    );

    localStorage.removeItem(
      "fitfusion-current-user"
    );

    sessionStorage.removeItem(
      "registeredAccount"
    );

    sessionStorage.removeItem("userRole");
    sessionStorage.removeItem("userEmail");

    navigate("/", {
      replace: true,
    });
  }

  return (
    <main className="seller-account-page">
      <header className="seller-account-header">
        <div className="seller-account-header-text">
          <h1>
            08B — SELLER STORE PROFILE
          </h1>

          <p>
            Manage your store information,
            seller account, and account security.
          </p>
        </div>

        <div className="seller-account-role-badge">
          SELLER
        </div>
      </header>

      <div className="seller-account-content">
        <section className="seller-account-title">
          <p>MY STORE</p>

          <h2>Seller Store Profile</h2>

          <span>
            Keep your store information and
            security details up to date.
          </span>
        </section>

        {notice && (
          <div
            className="seller-account-notice"
            role="status"
          >
            <span>{notice}</span>

            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        )}

        <section className="seller-account-main-grid">
          <article className="seller-account-details-card">
            <div className="seller-account-card-heading">
              <div>
                <p>STORE DETAILS</p>

                <h3>Seller information</h3>
              </div>

              <button
                type="button"
                className="seller-account-edit-button"
                onClick={openProfileModal}
              >
                Edit Store Profile
              </button>
            </div>

            <div className="seller-account-information">
              <InformationRow
                label="Store Name"
                value={
                  sellerAccount.storeName
                }
              />

              <InformationRow
                label="Username"
                value={
                  sellerAccount.username
                }
              />

              <InformationRow
                label="Email Address"
                value={sellerAccount.email}
              />

              <InformationRow
                label="Phone Number"
                value={sellerAccount.mobile}
              />

              <InformationRow
                label="Store Address"
                value={sellerAccount.address}
              />

              <InformationRow
                label="Assigned Role"
                value={sellerAccount.role}
              />
            </div>
          </article>

          <article className="seller-account-security-card">
            <div className="seller-account-security-heading">
              <p>ACCOUNT SECURITY</p>

              <h3>Password and privacy</h3>
            </div>

            <div className="seller-account-password-box">
              <div className="seller-account-lock-icon">
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
              </div>

              <div>
                <strong>Password</strong>

                <p>
                  Use a strong password that you
                  do not use for another account.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="seller-account-password-button"
              onClick={openPasswordModal}
            >
              Change Password
            </button>
          </article>
        </section>

        <section className="seller-account-activity-card">
          <div className="seller-account-activity-heading">
            <div>
              <p>STORE ACTIVITY</p>

              <h3>
                Listings and validation
              </h3>
            </div>

            <button
              type="button"
              className="seller-account-listings-button"
              onClick={() =>
                navigate("/seller/products")
              }
            >
              View Listings
            </button>
          </div>

          <div className="seller-account-statistics">
            <StatisticCard
              label="Owned Listings"
              value={
                listingStatistics.total
              }
            />

            <StatisticCard
              label="Active Listings"
              value={
                listingStatistics.active
              }
            />

            <StatisticCard
              label="Pending Validation"
              value={
                listingStatistics.pending
              }
            />

            <StatisticCard
              label="Rejected Uploads"
              value={
                listingStatistics.rejected
              }
              rejected
            />
          </div>
        </section>

        <section className="seller-account-danger-card">
          <div>
            <p>DANGER ZONE</p>

            <h3>Delete Seller Account</h3>

            <span>
              Deleting this account permanently
              removes the Seller profile, Store
              Name, and all owned listings.
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              setActiveModal("delete")
            }
          >
            Delete Seller Account
          </button>
        </section>
      </div>

      {activeModal === "profile" && (
        <AccountModal
          title="Edit Store Profile"
          description="Update your store and contact information."
          onClose={closeModal}
        >
          <form
            className="seller-account-form"
            onSubmit={saveProfile}
            noValidate
          >
            <AccountInput
              label="Store Name"
              name="storeName"
              value={profileForm.storeName}
              error={
                profileErrors.storeName
              }
              onChange={handleProfileChange}
            />

            <AccountInput
              label="Username"
              name="username"
              value={profileForm.username}
              error={
                profileErrors.username
              }
              onChange={handleProfileChange}
            />

            <AccountInput
              label="Email Address"
              name="email"
              type="email"
              value={profileForm.email}
              error={profileErrors.email}
              onChange={handleProfileChange}
            />

            <AccountInput
              label="Phone Number"
              name="mobile"
              value={profileForm.mobile}
              error={profileErrors.mobile}
              onChange={handleProfileChange}
            />

            <AccountInput
              label="Store Address"
              name="address"
              value={profileForm.address}
              error={
                profileErrors.address
              }
              onChange={handleProfileChange}
            />

            <div className="seller-account-modal-actions">
              <button
                type="button"
                className="seller-account-modal-secondary"
                onClick={closeModal}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="seller-account-modal-primary"
              >
                Save Changes
              </button>
            </div>
          </form>
        </AccountModal>
      )}

      {activeModal === "password" && (
        <AccountModal
          title="Change Password"
          description="Create a strong password for your Seller account."
          onClose={closeModal}
        >
          <form
            className="seller-account-form"
            onSubmit={savePassword}
            noValidate
          >
            <AccountInput
              label="Current Password"
              name="currentPassword"
              type="password"
              value={
                passwordForm.currentPassword
              }
              error={
                passwordErrors.currentPassword
              }
              onChange={handlePasswordChange}
            />

            <AccountInput
              label="New Password"
              name="newPassword"
              type="password"
              value={
                passwordForm.newPassword
              }
              error={
                passwordErrors.newPassword
              }
              onChange={handlePasswordChange}
            />

            <div className="seller-account-password-rules">
              <PasswordRule
                passed={
                  passwordRequirements.length
                }
                text="At least 8 characters"
              />

              <PasswordRule
                passed={
                  passwordRequirements.uppercase
                }
                text="One uppercase letter"
              />

              <PasswordRule
                passed={
                  passwordRequirements.lowercase
                }
                text="One lowercase letter"
              />

              <PasswordRule
                passed={
                  passwordRequirements.number
                }
                text="One number"
              />

              <PasswordRule
                passed={
                  passwordRequirements.special
                }
                text="One special character"
              />
            </div>

            <AccountInput
              label="Confirm New Password"
              name="confirmPassword"
              type="password"
              value={
                passwordForm.confirmPassword
              }
              error={
                passwordErrors.confirmPassword
              }
              onChange={handlePasswordChange}
            />

            <div className="seller-account-modal-actions">
              <button
                type="button"
                className="seller-account-modal-secondary"
                onClick={closeModal}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="seller-account-modal-primary"
              >
                Save Password
              </button>
            </div>
          </form>
        </AccountModal>
      )}

      {activeModal === "delete" && (
        <AccountModal
          title="Delete Seller Account?"
          description="This action cannot be undone."
          onClose={closeModal}
          danger
        >
          <div className="seller-account-delete-content">
            <p>
              Your store profile and all products
              owned by this seller will be
              permanently removed.
            </p>

            <label>
              <span>
                Type <strong>DELETE</strong> to
                confirm
              </span>

              <input
                type="text"
                value={deleteConfirmation}
                onChange={(event) =>
                  setDeleteConfirmation(
                    event.target.value
                  )
                }
                placeholder="DELETE"
              />
            </label>

            <div className="seller-account-modal-actions">
              <button
                type="button"
                className="seller-account-modal-secondary"
                onClick={closeModal}
              >
                Cancel
              </button>

              <button
                type="button"
                className="seller-account-delete-confirm"
                disabled={
                  deleteConfirmation !==
                  "DELETE"
                }
                onClick={deleteSellerAccount}
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </AccountModal>
      )}
    </main>
  );
}

function InformationRow({ label, value }) {
  let displayedValue = value;

  if (
    displayedValue !== null &&
    typeof displayedValue === "object"
  ) {
    displayedValue = Object.values(
      displayedValue
    )
      .filter(Boolean)
      .join(", ");
  }

  if (
    displayedValue === null ||
    displayedValue === undefined ||
    displayedValue === ""
  ) {
    displayedValue = "Not provided";
  }

  return (
    <div className="seller-account-info-row">
      <span>{label}</span>

      <strong>
        {String(displayedValue)}
      </strong>
    </div>
  );
}

function StatisticCard({
  label,
  value,
  rejected = false,
}) {
  return (
    <article
      className={
        rejected
          ? "seller-account-stat-card rejected"
          : "seller-account-stat-card"
      }
    >
      <span>{label}</span>

      <strong>{String(value)}</strong>
    </article>
  );
}

function AccountInput({
  label,
  error,
  ...inputProperties
}) {
  return (
    <label className="seller-account-field">
      <span>{label}</span>

      <input
        {...inputProperties}
        className={
          error
            ? "seller-account-input-error"
            : ""
        }
      />

      {error && (
        <small role="alert">{error}</small>
      )}
    </label>
  );
}

function PasswordRule({ passed, text }) {
  return (
    <div
      className={
        passed
          ? "seller-account-password-rule passed"
          : "seller-account-password-rule"
      }
    >
      <span>{passed ? "✓" : "○"}</span>

      {text}
    </div>
  );
}

function AccountModal({
  title,
  description,
  onClose,
  children,
  danger = false,
}) {
  return (
    <div
      className="seller-account-modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className={
          danger
            ? "seller-account-modal danger"
            : "seller-account-modal"
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby="seller-account-modal-title"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <header className="seller-account-modal-header">
          <div>
            <h2 id="seller-account-modal-title">
              {title}
            </h2>

            <p>{description}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </header>

        {children}
      </section>
    </div>
  );
}

export default SellerStoreProfilePage;