
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../css/SellerStoreProfilePage.css";

const DEFAULT_PROFILE = {
  id: "seller-demo",
  role: "seller",
  fullName: "Sample Seller",
  username: "aurelia_store",
  storeName: "Maison Aurelia",
  email: "seller@aurelia.example",
  mobile: "09128884455",
  street: "123 Ayala Avenue",
  barangay: "San Antonio",
  city: "Makati City",
  province: "Metro Manila",
  postalCode: "1203",
  accountStatus: "active",
};

const REASONS = [
  ["Taking a break", "I want to take a break"],
  [
    "Privacy or security concerns",
    "Privacy or security concerns",
  ],
  [
    "No longer using FitFusion AI",
    "I am no longer using FitFusion AI",
  ],
  ["Other", "Other reason"],
];

function readJSON(storage, key) {
  try {
    const value = storage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function normalizeProfile(raw = {}) {
  const source =
    raw && typeof raw === "object" ? raw : {};

  const address =
    source.address &&
    typeof source.address === "object"
      ? source.address
      : {};

  return {
    ...DEFAULT_PROFILE,
    ...source,
    role: "seller",

    mobile:
      source.mobile ||
      source.mobileNumber ||
      source.phone ||
      DEFAULT_PROFILE.mobile,

    street:
      address.street ||
      source.street ||
      source.streetAddress ||
      DEFAULT_PROFILE.street,

    barangay:
      address.barangay ||
      source.barangay ||
      DEFAULT_PROFILE.barangay,

    city:
      address.city ||
      source.city ||
      DEFAULT_PROFILE.city,

    province:
      address.province ||
      source.province ||
      DEFAULT_PROFILE.province,

    postalCode: String(
      address.postalCode ||
      source.postalCode ||
      DEFAULT_PROFILE.postalCode
    ),
  };
}

function readProfile() {
  const current = readJSON(
    localStorage,
    "fitfusion-current-user"
  );

  const saved = readJSON(
    localStorage,
    "fitfusion-seller-profile"
  );

  const registered = readJSON(
    localStorage,
    "sellerAccount"
  );

  if (
    current &&
    String(current.role).toLowerCase() === "seller"
  ) {
    const matchingSaved =
      saved &&
      (
        (
          current.id &&
          saved.id === current.id
        ) ||
        String(saved.email || "").toLowerCase() ===
          String(current.email || "").toLowerCase()
      );

    return normalizeProfile({
      ...(matchingSaved ? saved : {}),
      ...current,
      address:
        current.address ||
        (matchingSaved ? saved.address : {}),
    });
  }

  return normalizeProfile(
    saved || registered || {}
  );
}

function getStatistics() {
  const products = readJSON(
    localStorage,
    "fitfusion-seller-products"
  );

  const list = Array.isArray(products)
    ? products
    : [];

  function statusOf(product) {
    const status = String(
      product.reportStatus ??
      product.status ??
      product.validationStatus ??
      ""
    ).toLowerCase();

    if (
      ["active", "approved", "accepted"].includes(status)
    ) {
      return "approved";
    }

    if (status === "rejected") {
      return "rejected";
    }

    return "pending";
  }

  return {
    total: list.length,

    approved: list.filter(
      (product) =>
        statusOf(product) === "approved"
    ).length,

    rejected: list.filter(
      (product) =>
        statusOf(product) === "rejected"
    ).length,
  };
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
  const location = useLocation();

  const [profile, setProfile] =
    useState(readProfile);

  const [stats] = useState(getStatistics);

  const [
    showDeactivate,
    setShowDeactivate,
  ] = useState(false);

  const [reason, setReason] = useState("");
  const [otherReason, setOtherReason] =
    useState("");

  const [acknowledged, setAcknowledged] =
    useState(false);

  const [error, setError] = useState("");

  const validReason =
    Boolean(reason) &&
    (
      reason !== "Other" ||
      Boolean(otherReason.trim())
    );

  // Refresh the displayed account after returning
  // from the separate Seller Edit Account page.
  useEffect(() => {
    setProfile(readProfile());
  }, [location.pathname]);

  // FIXED: Navigate to the actual Seller edit route.
  function goToEdit(section) {
    navigate(
      `/seller/account/edit#${section}`,
      {
        state: {
          returnTo: "/seller/store-profile",
        },
      }
    );
  }

  function logout() {
    sessionStorage.removeItem("userRole");
    sessionStorage.removeItem("userEmail");
    sessionStorage.removeItem("sellerAccount");

    localStorage.removeItem(
      "fitfusion-current-user"
    );

    navigate("/login", {
      replace: true,
    });
  }

  function openDeactivate() {
    setReason("");
    setOtherReason("");
    setAcknowledged(false);
    setError("");
    setShowDeactivate(true);
  }

  function closeDeactivate() {
    setShowDeactivate(false);
    setError("");
  }

  function confirmDeactivate() {
    if (!validReason) {
      setError(
        "Please select a reason for deactivation."
      );
      return;
    }

    if (!acknowledged) {
      setError(
        "Please acknowledge the deactivation notice."
      );
      return;
    }

    const updated = {
      ...profile,
      role: "seller",
      accountStatus: "deactivated",
      isActive: false,
      deactivationReason:
        reason === "Other"
          ? otherReason.trim()
          : reason,
      deactivatedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(
        "fitfusion-seller-profile",
        JSON.stringify(updated)
      );

      localStorage.setItem(
        "sellerAccount",
        JSON.stringify(updated)
      );

      const users = readJSON(
        localStorage,
        "fitfusion-users"
      );

      if (Array.isArray(users)) {
        const updatedUsers = users.map(
          (user) => {
            const matches =
              String(
                user.role || ""
              ).toLowerCase() === "seller" &&
              (
                (
                  profile.id &&
                  user.id === profile.id
                ) ||
                String(
                  user.email || ""
                ).toLowerCase() ===
                  String(
                    profile.email || ""
                  ).toLowerCase()
              );

            return matches
              ? { ...user, ...updated }
              : user;
          }
        );

        localStorage.setItem(
          "fitfusion-users",
          JSON.stringify(updatedUsers)
        );
      }

      setShowDeactivate(false);
      logout();
    } catch (error) {
      console.error(
        "Account deactivation failed:",
        error
      );

      setError(
        "Unable to save the deactivation status. Please try again."
      );
    }
  }

  return (
    <main className="seller-store-profile-page">
      <div className="seller-store-profile-body">
        {/* PAGE INTRODUCTION */}

        <section className="seller-store-profile-introduction">
          <p className="seller-store-profile-label">
            SELLER STORE PROFILE
          </p>

          <h1>{profile.storeName}</h1>

          <p>
            View and manage your personal information,
            business address, store details, and account security.
          </p>
        </section>

        {/* PROFILE GRID */}

        <section className="seller-store-profile-grid">
          {/* SELLER ACCOUNT INFORMATION */}

          <article className="seller-profile-card">
            <h2>Seller Account Information</h2>

            <dl className="seller-profile-details">
              <InformationRow
                label="Full Name"
                value={profile.fullName}
              />

              <InformationRow
                label="Username"
                value={profile.username}
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
                label="House Number and Street"
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
                value={profile.postalCode}
              />

              <InformationRow
                label="Assigned Role"
                value="Seller"
              />

              <InformationRow
                label="Store Name"
                value={profile.storeName}
              />
            </dl>

            <div className="seller-profile-actions">
              {/* EDIT PROFILE BUTTON */}

              <button
                type="button"
                className="seller-profile-primary-button"
                onClick={() =>
                  goToEdit("profile")
                }
              >
                Edit Store Profile
              </button>

              {/* CHANGE PASSWORD BUTTON */}

              <button
                type="button"
                className="seller-profile-secondary-button"
                onClick={() =>
                  goToEdit("password")
                }
              >
                Change Password
              </button>
            </div>
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

      {/* DEACTIVATION CONFIRMATION POPUP */}

      {showDeactivate && (
        <div
          className="seller-profile-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
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
              deactivated, and you will be signed out.
              Your store records and products will not
              be deleted.
            </p>

            <div className="seller-profile-deactivate-warning">
              <strong>Before you continue</strong>

              <p>
                This is a frontend-only simulation.
                Actual account deactivation must later
                be enforced by backend authentication.
              </p>
            </div>

            <fieldset className="seller-profile-deactivate-reasons">
              <legend>
                Reason for deactivation *
              </legend>

              {REASONS.map(
                ([value, label]) => (
                  <label
                    key={value}
                    className={`seller-profile-deactivate-reason ${
                      reason === value
                        ? "selected"
                        : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="deactivationReason"
                      value={value}
                      checked={
                        reason === value
                      }
                      onChange={() => {
                        setReason(value);
                        setError("");
                      }}
                    />

                    <span>{label}</span>
                  </label>
                )
              )}

              {reason === "Other" && (
                <textarea
                  className="seller-profile-deactivate-other"
                  value={otherReason}
                  onChange={(event) => {
                    setOtherReason(
                      event.target.value.slice(
                        0,
                        300
                      )
                    );
                    setError("");
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
                  setAcknowledged(
                    event.target.checked
                  );

                  setError("");
                }}
              />

              <span>
                I understand that my seller account
                will be deactivated and I will be
                signed out.
              </span>
            </label>

            {error && (
              <p
                className="seller-profile-form-error"
                role="alert"
              >
                {error}
              </p>
            )}

            <div className="seller-profile-modal-actions">
              <button
                type="button"
                className="seller-profile-secondary-button"
                onClick={closeDeactivate}
              >
                Cancel
              </button>

              <button
                type="button"
                className="seller-profile-deactivate-button"
                disabled={
                  !validReason ||
                  !acknowledged
                }
                onClick={confirmDeactivate}
              >
                Confirm Deactivation
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default SellerStoreProfilePage;
