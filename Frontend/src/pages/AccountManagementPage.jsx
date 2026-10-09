import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./css/AccountManagementPage.css";

function readStoredArray(key) {
  try {
    const storedValue = localStorage.getItem(key);
    const parsedValue = JSON.parse(
      storedValue || "[]"
    );

    return Array.isArray(parsedValue)
      ? parsedValue
      : [];
  } catch {
    return [];
  }
}

function getCurrentUser() {
  const savedUser =
    localStorage.getItem(
      "fitfusion-current-user"
    ) ||
    sessionStorage.getItem(
      "registeredAccount"
    );

  if (!savedUser) {
    return null;
  }

  try {
    return JSON.parse(savedUser);
  } catch {
    return null;
  }
}

function AccountManagementPage() {
  const navigate = useNavigate();

  const [showDeleteModal, setShowDeleteModal] =
    useState(false);

  const currentUser = getCurrentUser();

  const cartItems = readStoredArray(
    "fitfusion-cart"
  );

  const user = {
    fullName:
      currentUser?.fullName ||
      currentUser?.name ||
      currentUser?.username ||
      "Registered Shopper",
    username:
      currentUser?.username || "shopper",
    email:
      currentUser?.email ||
      "shopper@example.com",
    mobile:
      currentUser?.mobile || "Not provided",
    street:
      currentUser?.address?.street ||
      currentUser?.street ||
      "Not provided",
    city:
      currentUser?.address?.city ||
      currentUser?.city ||
      "Not provided",
    province:
      currentUser?.address?.province ||
      currentUser?.province ||
      "Not provided",
    postalCode:
      currentUser?.address?.postalCode ||
      currentUser?.postalCode ||
      "Not provided",
  };

  function handleDeleteAccount() {
    localStorage.removeItem(
      "fitfusion-current-user"
    );

    sessionStorage.removeItem(
      "registeredAccount"
    );

    sessionStorage.removeItem("userRole");
    sessionStorage.removeItem("userEmail");

    setShowDeleteModal(false);

    navigate("/", {
      replace: true,
    });
  }

  return (
    <main className="account-management-page">
      {/* ShopperLayout provides the sidebar. */}

      <div className="account-top-actions">
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

          <span>{cartItems.length}</span>
        </button>

        <div className="account-role-badge">
          REGISTERED SHOPPER
        </div>
      </div>

      <div className="account-management-content">
        <section className="account-introduction">
          <p>MY ACCOUNT</p>

          <h1>Account Management</h1>

          <span>
            Keep your personal details, delivery
            address, and security information up to
            date.
          </span>
        </section>

        <div className="account-management-grid">
          <section className="account-profile-card">
            <div className="account-card-heading">
              <div>
                <p>PROFILE DETAILS</p>
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

            <AccountRow
              label="Full Name"
              value={user.fullName}
            />

            <AccountRow
              label="Username"
              value={user.username}
            />

            <AccountRow
              label="Email Address"
              value={user.email}
            />

            <AccountRow
              label="Mobile Number"
              value={user.mobile}
            />
          </section>

          <section className="account-security-card">
            <p className="account-card-label">
              ACCOUNT SECURITY
            </p>

            <h2>Password and privacy</h2>

            <div className="account-security-summary">
              <div className="account-lock-icon">
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
          </section>

          <section className="account-address-card">
            <div className="account-card-heading">
              <div>
                <p>DELIVERY ADDRESS</p>
                <h2>Shipping information</h2>
              </div>

              <button
                type="button"
                className="account-outline-button"
                onClick={() =>
                  navigate(
                    "/shopper/account/edit#address"
                  )
                }
              >
                Edit Address
              </button>
            </div>

            <AccountRow
              label="House / Street"
              value={user.street}
            />

            <AccountRow
              label="Barangay / City"
              value={user.city}
            />

            <AccountRow
              label="Province"
              value={user.province}
            />

            <AccountRow
              label="Postal Code"
              value={user.postalCode}
            />
          </section>

          <section className="account-links-card">
            <p className="account-card-label">
              SHOPPER ACTIVITY
            </p>

            <h2>Account shortcuts</h2>

            <button
              type="button"
              className="account-shortcut"
              onClick={() =>
                navigate("/shopper/orders")
              }
            >
              <span>
                <strong>Order History</strong>
                <small>
                  View previous and current orders
                </small>
              </span>

              <b aria-hidden="true">→</b>
            </button>

            <button
              type="button"
              className="account-shortcut"
              onClick={() =>
                navigate(
                  "/shopper/saved-outfits"
                )
              }
            >
              <span>
                <strong>Saved Outfits</strong>
                <small>
                  Manage saved clothing combinations
                </small>
              </span>

              <b aria-hidden="true">→</b>
            </button>

            <button
              type="button"
              className="account-shortcut"
              onClick={() =>
                navigate(
                  "/shopper/avatar-presets"
                )
              }
            >
              <span>
                <strong>Avatar Presets</strong>
                <small>
                  View and update avatar presets
                </small>
              </span>

              <b aria-hidden="true">→</b>
            </button>
          </section>
        </div>

        <section className="account-danger-zone">
          <div>
            <p>DANGER ZONE</p>
            <h2>Delete shopper account</h2>

            <span>
              Account deletion removes your shopper
              information and locally stored account
              access.
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowDeleteModal(true)
            }
          >
            Delete Account
          </button>
        </section>
      </div>

      {showDeleteModal && (
        <div
          className="account-delete-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setShowDeleteModal(false);
            }
          }}
        >
          <section
            className="account-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
          >
            <p>DELETE SHOPPER ACCOUNT</p>

            <h2 id="delete-account-title">
              Delete your account?
            </h2>

            <span>
              This action cannot be undone. Your
              account information will be removed
              from this prototype.
            </span>

            <div className="account-delete-actions">
              <button
                type="button"
                className="account-delete-cancel"
                onClick={() =>
                  setShowDeleteModal(false)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="account-delete-confirm"
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

function AccountRow({ label, value }) {
  return (
    <div className="account-information-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default AccountManagementPage;