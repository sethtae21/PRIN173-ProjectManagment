import { useState } from "react";
import { useNavigate } from "react-router-dom";

import "../css/SellerStoreProfilePage.css";

const defaultProfile = {
  username: "aurelia_store",
  email: "seller@aurelia.example",
  mobile: "+63 912 888 4455",
  address: "Makati, Metro Manila",
  role: "Seller",
  storeName: "Maison Aurelia",
};

function getInitialProfile() {
  const savedProfile = localStorage.getItem(
    "fitfusion-seller-profile"
  );

  if (!savedProfile) {
    return defaultProfile;
  }

  try {
    return {
      ...defaultProfile,
      ...JSON.parse(savedProfile),
    };
  } catch {
    return defaultProfile;
  }
}

function SellerStoreProfilePage() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(
    getInitialProfile
  );

  const [editForm, setEditForm] =
    useState(profile);

  const [showEditModal, setShowEditModal] =
    useState(false);

  const [
    showPasswordModal,
    setShowPasswordModal,
  ] = useState(false);

  const [showDeleteModal, setShowDeleteModal] =
    useState(false);

  const [passwordForm, setPasswordForm] =
    useState({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

  const [formMessage, setFormMessage] =
    useState("");

  function openEditModal() {
    setEditForm(profile);
    setFormMessage("");
    setShowEditModal(true);
  }

  function handleEditChange(event) {
    const { name, value } = event.target;

    setEditForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function saveProfile(event) {
    event.preventDefault();

    if (
      !editForm.storeName.trim() ||
      !editForm.username.trim() ||
      !editForm.email.trim() ||
      !editForm.mobile.trim() ||
      !editForm.address.trim()
    ) {
      setFormMessage(
        "Please complete all required seller information."
      );

      return;
    }

    setProfile(editForm);

    localStorage.setItem(
      "fitfusion-seller-profile",
      JSON.stringify(editForm)
    );

    setShowEditModal(false);
  }

  function handlePasswordChange(event) {
    const { name, value } = event.target;

    setPasswordForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function savePassword(event) {
    event.preventDefault();

    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      setFormMessage(
        "Please complete all password fields."
      );

      return;
    }

    if (
      passwordForm.newPassword.length < 8
    ) {
      setFormMessage(
        "The new password must contain at least 8 characters."
      );

      return;
    }

    if (
      passwordForm.newPassword !==
      passwordForm.confirmPassword
    ) {
      setFormMessage(
        "The new password and confirmation do not match."
      );

      return;
    }

    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    setFormMessage("");
    setShowPasswordModal(false);

    window.alert(
      "Password updated successfully."
    );
  }

  function deleteSellerAccount() {
    localStorage.removeItem(
      "fitfusion-seller-profile"
    );

    localStorage.removeItem(
      "fitfusion-seller-products"
    );

    localStorage.removeItem(
      "fitfusion-current-user"
    );

    sessionStorage.clear();

    setShowDeleteModal(false);

    navigate("/", {
      replace: true,
    });
  }

  function handleLogout() {
    sessionStorage.removeItem("userRole");
    sessionStorage.removeItem("userEmail");

    localStorage.removeItem(
      "fitfusion-current-user"
    );

    navigate("/login", {
      replace: true,
    });
  }

  return (
    <section className="seller-store-profile-page">
      {/* The large page header was removed. */}

      <div className="seller-store-profile-body">
        <section className="seller-store-profile-introduction">
          <p className="seller-store-profile-label">
            SELLER STORE PROFILE
          </p>

          <h1>{profile.storeName}</h1>

          <p>
            View and update your seller account
            and authenticated store information.
          </p>
        </section>

        <section className="seller-store-profile-grid">
          <article className="seller-profile-card">
            <h2>
              Seller Account Information
            </h2>

            <dl className="seller-profile-details">
              <div>
                <dt>Username</dt>
                <dd>{profile.username}</dd>
              </div>

              <div>
                <dt>Email</dt>
                <dd>{profile.email}</dd>
              </div>

              <div>
                <dt>Mobile</dt>
                <dd>{profile.mobile}</dd>
              </div>

              <div>
                <dt>Address</dt>
                <dd>{profile.address}</dd>
              </div>

              <div>
                <dt>Assigned role</dt>
                <dd>{profile.role}</dd>
              </div>

              <div>
                <dt>Store Name</dt>
                <dd>{profile.storeName}</dd>
              </div>
            </dl>

            <div className="seller-profile-actions">
              <button
                type="button"
                className="seller-profile-primary-button"
                onClick={openEditModal}
              >
                Edit Store Profile
              </button>

              <button
                type="button"
                className="seller-profile-secondary-button"
                onClick={() => {
                  setFormMessage("");
                  setShowPasswordModal(true);
                }}
              >
                Change Password
              </button>
            </div>
          </article>

          <article className="seller-profile-card seller-profile-privacy-card">
            <h2>
              Privacy & Account Actions
            </h2>

            <div className="seller-profile-statistics">
              <p>
                <span>Owned listings</span>
                <strong>24</strong>
              </p>

              <p>
                <span>Accepted uploads</span>
                <strong>20</strong>
              </p>

              <p>
                <span>Rejected uploads</span>
                <strong>4</strong>
              </p>
            </div>

            <p className="seller-profile-warning">
              Account deletion removes your seller
              profile and owned listings.
            </p>

            <div className="seller-profile-danger-actions">
              <button
                type="button"
                className="seller-profile-delete-button"
                onClick={() =>
                  setShowDeleteModal(true)
                }
              >
                Delete Seller Account
              </button>

              <button
                type="button"
                className="seller-profile-logout-button"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </article>
        </section>
      </div>

      {showEditModal && (
        <div className="seller-profile-modal-overlay">
          <section
            className="seller-profile-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
          >
            <p className="seller-store-profile-label">
              UPDATE INFORMATION
            </p>

            <h2 id="edit-profile-title">
              Edit Store Profile
            </h2>

            <form onSubmit={saveProfile}>
              <label>
                Username

                <input
                  type="text"
                  name="username"
                  value={editForm.username}
                  onChange={handleEditChange}
                />
              </label>

              <label>
                Store Name

                <input
                  type="text"
                  name="storeName"
                  value={editForm.storeName}
                  onChange={handleEditChange}
                />
              </label>

              <label>
                Email Address

                <input
                  type="email"
                  name="email"
                  value={editForm.email}
                  onChange={handleEditChange}
                />
              </label>

              <label>
                Mobile Number

                <input
                  type="tel"
                  name="mobile"
                  value={editForm.mobile}
                  onChange={handleEditChange}
                />
              </label>

              <label>
                Business Address

                <textarea
                  name="address"
                  rows="3"
                  value={editForm.address}
                  onChange={handleEditChange}
                />
              </label>

              {formMessage && (
                <p className="seller-profile-form-error">
                  {formMessage}
                </p>
              )}

              <div className="seller-profile-modal-actions">
                <button
                  type="button"
                  className="seller-profile-secondary-button"
                  onClick={() =>
                    setShowEditModal(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="seller-profile-primary-button"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {showPasswordModal && (
        <div className="seller-profile-modal-overlay">
          <section
            className="seller-profile-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-password-title"
          >
            <p className="seller-store-profile-label">
              ACCOUNT SECURITY
            </p>

            <h2 id="change-password-title">
              Change Password
            </h2>

            <form onSubmit={savePassword}>
              <label>
                Current Password

                <input
                  type="password"
                  name="currentPassword"
                  value={
                    passwordForm.currentPassword
                  }
                  onChange={handlePasswordChange}
                />
              </label>

              <label>
                New Password

                <input
                  type="password"
                  name="newPassword"
                  value={
                    passwordForm.newPassword
                  }
                  onChange={handlePasswordChange}
                />
              </label>

              <label>
                Confirm New Password

                <input
                  type="password"
                  name="confirmPassword"
                  value={
                    passwordForm.confirmPassword
                  }
                  onChange={handlePasswordChange}
                />
              </label>

              {formMessage && (
                <p className="seller-profile-form-error">
                  {formMessage}
                </p>
              )}

              <div className="seller-profile-modal-actions">
                <button
                  type="button"
                  className="seller-profile-secondary-button"
                  onClick={() =>
                    setShowPasswordModal(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="seller-profile-primary-button"
                >
                  Update Password
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {showDeleteModal && (
        <div className="seller-profile-modal-overlay">
          <section
            className="seller-profile-modal seller-profile-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
          >
            <p className="seller-store-profile-label">
              DANGER ZONE
            </p>

            <h2 id="delete-account-title">
              Delete Seller Account?
            </h2>

            <p>
              Your seller information and product
              listings will be removed. This action
              cannot be undone.
            </p>

            <div className="seller-profile-modal-actions">
              <button
                type="button"
                className="seller-profile-secondary-button"
                onClick={() =>
                  setShowDeleteModal(false)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="seller-profile-delete-button"
                onClick={deleteSellerAccount}
              >
                Confirm Delete
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

export default SellerStoreProfilePage;