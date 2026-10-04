import {
  useMemo,
  useState,
} from "react";

import {
  NavLink,
  useNavigate,
} from "react-router-dom";

import fitFusionLogo from "../assets/fitfusion-logo.svg";
import "./css/AccountManagementPage.css";

const DEFAULT_ACCOUNT = {
  username: "KarolShopper",
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

function getStoredAccount() {
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
      return normalizeAccount(
        JSON.parse(storedValue)
      );
    } catch {
      // Continue checking the next storage key.
    }
  }

  return normalizeAccount(DEFAULT_ACCOUNT);
}

function getStoredArrayLength(key) {
  try {
    const storedValue =
      localStorage.getItem(key);

    if (!storedValue) {
      return 0;
    }

    const parsedValue =
      JSON.parse(storedValue);

    return Array.isArray(parsedValue)
      ? parsedValue.length
      : 0;
  } catch {
    return 0;
  }
}

function AccountManagementPage() {
  const navigate = useNavigate();

  const [account] = useState(
    getStoredAccount
  );

  const [
    showLogoutModal,
    setShowLogoutModal,
  ] = useState(false);

  const [
    showDeleteModal,
    setShowDeleteModal,
  ] = useState(false);

  const [
    deleteConfirmation,
    setDeleteConfirmation,
  ] = useState("");

  const accountStats = useMemo(
    () => ({
      avatarPresets:
        getStoredArrayLength(
          "fitfusion-avatar-presets"
        ),

      savedOutfits:
        getStoredArrayLength(
          "fitfusion-saved-outfits"
        ),

      orders:
        getStoredArrayLength(
          "fitfusion-orders"
        ),

      favorites:
        getStoredArrayLength(
          "fitfusion-favorite-products"
        ),
    }),
    []
  );

  const fullName =
    account.fullName ||
    [
      account.firstName,
      account.lastName,
    ]
      .filter(Boolean)
      .join(" ") ||
    account.username ||
    "Shopper";

  const deliveryAddress = [
    account.address,
    account.barangayCity ||
      account.barangay,
    account.province,
    account.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  function confirmLogout() {
    sessionStorage.removeItem("userRole");
    sessionStorage.removeItem("userEmail");

    setShowLogoutModal(false);
    navigate("/login");
  }

  function handleDeleteAccount() {
    if (
      deleteConfirmation
        .trim()
        .toUpperCase() !== "DELETE"
    ) {
      return;
    }

    const keysToRemove = [
      "registeredAccount",
      "fitfusion-current-user",
      "fitfusion-avatar-presets",
      "fitfusion-avatar-preset",
      "fitfusion-avatar-gender",
      "fitfusion-editing-avatar-preset",
      "fitfusion-selected-product",
      "fitfusion-selected-items",
      "fitfusion-cart-items",
      "fitfusion-checkout-items",
      "fitfusion-favorite-products",
      "fitfusion-followed-stores",
      "fitfusion-saved-outfits",
      "fitfusion-active-outfit",
      "fitfusion-editing-outfit",
      "fitfusion-orders",
      "fitfusion-selected-order",
      "fitfusion-latest-order",
      "fitfusion-product-reviews",
    ];

    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    sessionStorage.removeItem("userRole");
    sessionStorage.removeItem("userEmail");

    setShowDeleteModal(false);
    navigate("/login");
  }

  return (
    <main className="account-page">
      <aside className="shopper-sidebar">
        <div className="shopper-sidebar-logo">
          <img
            src={fitFusionLogo}
            alt="FitFusion AI"
          />
        </div>

        <nav className="shopper-navigation">
          <NavLink
            to="/shopper/dashboard"
            className={({ isActive }) =>
              isActive
                ? "shopper-nav-link active"
                : "shopper-nav-link"
            }
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/shopper/fitting-studio"
            className={({ isActive }) =>
              isActive
                ? "shopper-nav-link active"
                : "shopper-nav-link"
            }
          >
            Fitting Studio
          </NavLink>

          <NavLink
            to="/shopper/avatar-presets"
            className={({ isActive }) =>
              isActive
                ? "shopper-nav-link active"
                : "shopper-nav-link"
            }
          >
            Avatar Presets
          </NavLink>

          <NavLink
            to="/shopper/catalog"
            className={({ isActive }) =>
              isActive
                ? "shopper-nav-link active"
                : "shopper-nav-link"
            }
          >
            Catalog
          </NavLink>

          <NavLink
            to="/shopper/saved-outfits"
            className={({ isActive }) =>
              isActive
                ? "shopper-nav-link active"
                : "shopper-nav-link"
            }
          >
            Saved Outfits
          </NavLink>

          <NavLink
            to="/shopper/orders"
            className={({ isActive }) =>
              isActive
                ? "shopper-nav-link active"
                : "shopper-nav-link"
            }
          >
            Order History
          </NavLink>

          <NavLink
            to="/shopper/account"
            className={({ isActive }) =>
              isActive
                ? "shopper-nav-link active"
                : "shopper-nav-link"
            }
          >
            Account
          </NavLink>
        </nav>

        <button
          type="button"
          className="shopper-logout-button"
          onClick={() =>
            setShowLogoutModal(true)
          }
        >
          Logout
        </button>
      </aside>

      <section className="account-content">
        <header className="account-header">
          <div>
            <p className="account-page-code">
              30 — ACCOUNT MANAGEMENT
            </p>

            <p className="account-page-description">
              Manage your personal information,
              delivery address, and account security.
            </p>
          </div>

          <div className="account-header-actions">
            <button
              type="button"
              className="account-cart-button"
              onClick={() =>
                navigate("/shopper/cart")
              }
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 7H6" />
                <circle cx="10" cy="20" r="1" />
                <circle cx="18" cy="20" r="1" />
              </svg>

              <span>Cart</span>
            </button>

            <div className="account-role-badge">
              REGISTERED SHOPPER
            </div>
          </div>
        </header>

        <div className="account-body">
          <section className="account-introduction">
            <p>MY ACCOUNT</p>

            <h1>Account Management</h1>

            <span>
              Keep your personal details and security
              information up to date.
            </span>
          </section>

          <section className="account-grid">
            <article className="account-card account-profile-card">
              <div className="account-card-heading">
                <div>
                  <p>PROFILE DETAILS</p>

                  <h2>
                    Personal information
                  </h2>
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

              <div className="account-details-list">
                <AccountDetail
                  label="Full Name"
                  value={fullName}
                />

                <AccountDetail
                  label="Username"
                  value={
                    account.username ||
                    "Shopper"
                  }
                />

                <AccountDetail
                  label="Email Address"
                  value={
                    account.email ||
                    "No email provided"
                  }
                />

                <AccountDetail
                  label="Phone Number"
                  value={
                    account.phone ||
                    "No phone number provided"
                  }
                />

                <AccountDetail
                  label="Delivery Address"
                  value={
                    deliveryAddress ||
                    "No delivery address provided"
                  }
                />
              </div>
            </article>

            <article className="account-card account-security-card">
              <div className="account-card-heading">
                <div>
                  <p>ACCOUNT SECURITY</p>
                  <h2>Password and privacy</h2>
                </div>
              </div>

              <div className="account-security-content">
                <div className="account-security-icon">
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <rect
                      x="5"
                      y="10"
                      width="14"
                      height="10"
                      rx="2"
                    />

                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </svg>
                </div>

                <div>
                  <strong>Password</strong>

                  <p>
                    Use a strong password that you do
                    not use for another account.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="account-secondary-button"
                onClick={() =>
                  navigate(
                    "/shopper/account/edit#password"
                  )
                }
              >
                Change Password
              </button>
            </article>
          </section>

          <section className="account-card account-activity-card">
            <div className="account-card-heading">
              <div>
                <p>ACCOUNT ACTIVITY</p>

                <h2>Your FitFusion data</h2>
              </div>
            </div>

            <div className="account-statistics-grid">
              <AccountStatistic
                value={
                  accountStats.avatarPresets
                }
                label="Avatar Presets"
                onClick={() =>
                  navigate(
                    "/shopper/avatar-presets"
                  )
                }
              />

              <AccountStatistic
                value={
                  accountStats.savedOutfits
                }
                label="Saved Outfits"
                onClick={() =>
                  navigate(
                    "/shopper/saved-outfits"
                  )
                }
              />

              <AccountStatistic
                value={accountStats.orders}
                label="Orders"
                onClick={() =>
                  navigate("/shopper/orders")
                }
              />

              <AccountStatistic
                value={accountStats.favorites}
                label="Favorite Products"
                onClick={() =>
                  navigate("/shopper/catalog")
                }
              />
            </div>
          </section>

          <section className="account-card account-danger-card">
            <div>
              <p className="account-danger-label">
                DANGER ZONE
              </p>

              <h2>Delete your account</h2>

              <span>
                Deleting your account permanently
                removes your profile and locally saved
                FitFusion information.
              </span>
            </div>

            <button
              type="button"
              className="account-danger-button"
              onClick={() =>
                setShowDeleteModal(true)
              }
            >
              Delete Account
            </button>
          </section>
        </div>
      </section>

      {showLogoutModal && (
        <div
          className="account-modal-overlay"
          role="presentation"
          onMouseDown={() =>
            setShowLogoutModal(false)
          }
        >
          <section
            className="account-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="account-modal-close"
              onClick={() =>
                setShowLogoutModal(false)
              }
              aria-label="Close logout confirmation"
            >
              ×
            </button>

            <p className="account-modal-label">
              LOGOUT
            </p>

            <h2 id="logout-title">
              Log out of FitFusion?
            </h2>

            <p>
              You will need to enter your account
              details again to access your shopper
              account.
            </p>

            <div className="account-modal-actions">
              <button
                type="button"
                className="account-modal-cancel"
                onClick={() =>
                  setShowLogoutModal(false)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="account-modal-confirm"
                onClick={confirmLogout}
              >
                Log Out
              </button>
            </div>
          </section>
        </div>
      )}

      {showDeleteModal && (
        <div
          className="account-modal-overlay"
          role="presentation"
          onMouseDown={() =>
            setShowDeleteModal(false)
          }
        >
          <section
            className="account-modal account-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="account-modal-close"
              onClick={() =>
                setShowDeleteModal(false)
              }
              aria-label="Close delete account dialog"
            >
              ×
            </button>

            <p className="account-modal-label account-danger-label">
              PERMANENT ACTION
            </p>

            <h2 id="delete-account-title">
              Delete your account?
            </h2>

            <p>
              This permanently removes your account,
              avatar presets, saved outfits, cart,
              favorites, and local order history.
            </p>

            <label
              className="account-delete-label"
              htmlFor="delete-confirmation"
            >
              Type <strong>DELETE</strong> to
              continue
            </label>

            <input
              id="delete-confirmation"
              type="text"
              value={deleteConfirmation}
              onChange={(event) =>
                setDeleteConfirmation(
                  event.target.value
                )
              }
              placeholder="DELETE"
              autoComplete="off"
            />

            <div className="account-modal-actions">
              <button
                type="button"
                className="account-modal-cancel"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation("");
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="account-delete-confirm"
                disabled={
                  deleteConfirmation
                    .trim()
                    .toUpperCase() !==
                  "DELETE"
                }
                onClick={handleDeleteAccount}
              >
                Delete Account
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function AccountDetail({
  label,
  value,
}) {
  return (
    <div className="account-detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AccountStatistic({
  value,
  label,
  onClick,
}) {
  return (
    <button
      type="button"
      className="account-statistic"
      onClick={onClick}
    >
      <strong>{value}</strong>
      <span>{label}</span>
    </button>
  );
}

export default AccountManagementPage;