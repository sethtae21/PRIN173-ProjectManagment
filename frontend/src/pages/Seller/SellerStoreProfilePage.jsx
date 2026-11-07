import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
// EDIT 1: dropped catalogAPI (no longer used after removing the stats card)
import { authAPI } from "../../services/api";
// CHANGED: Import AccountManagement CSS to share the exact same UI design
import "../css/AccountManagementPage.css";
import "../css/SellerStoreProfilePage.css"; // Keeps your modal/form styles

const PROVINCES = [
  "Abra", "Agusan del Norte", "Agusan del Sur", "Aklan", "Albay", "Antique", "Apayao", "Aurora", "Basilan",
  "Bataan", "Batanes", "Batangas", "Benguet", "Biliran", "Bohol", "Bukidnon", "Bulacan", "Cagayan",
  "Camarines Norte", "Camarines Sur", "Camiguin", "Capiz", "Catanduanes", "Cavite", "Cebu", "Cotabato",
  "Davao de Oro", "Davao del Norte", "Davao del Sur", "Davao Occidental", "Davao Oriental", "Dinagat Islands",
  "Eastern Samar", "Guimaras", "Ifugao", "Ilocos Norte", "Ilocos Sur", "Iloilo", "Isabela", "Kalinga",
  "La Union", "Laguna", "Lanao del Norte", "Lanao del Sur", "Leyte", "Maguindanao del Norte", "Maguindanao del Sur",
  "Marinduque", "Masbate", "Metro Manila", "Misamis Occidental", "Misamis Oriental", "Mountain Province", "Negros Occidental",
  "Negros Oriental", "Northern Samar", "Nueva Ecija", "Nueva Vizcaya", "Occidental Mindoro", "Oriental Mindoro",
  "Palawan", "Pampanga", "Pangasinan", "Quezon", "Quirino", "Rizal", "Romblon", "Samar", "Sarangani",
  "Siquijor", "Sorsogon", "South Cotabato", "Southern Leyte", "Sultan Kudarat", "Sulu", "Surigao del Norte",
  "Surigao del Sur", "Tarlac", "Tawi-Tawi", "Zambales", "Zamboanga del Norte", "Zamboanga del Sur", "Zamboanga Sibugay",
];

const PASSWORD_RULES = [
  { label: "at least 8 characters", test: (v) => v.length >= 8 },
  { label: "an uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { label: "a lowercase letter", test: (v) => /[a-z]/.test(v) },
  { label: "a number", test: (v) => /\d/.test(v) },
  { label: "a special character", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

function clearAuthStorage() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("fitfusion-current-user");
  sessionStorage.removeItem("userRole");
  sessionStorage.removeItem("userEmail");
  sessionStorage.removeItem("sellerAccount");
}

function formatJoinDate(value) {
  if (!value) return "Not available";
  try {
    return new Date(value).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
  } catch { return "Not available"; }
}

// CHANGED: Using AccountManagement's InformationRow structure
function InformationRow({ label, value }) {
  return (
    <div className="account-information-row">
      <span>{label}</span>
      <strong>{value || "Not provided"}</strong>
    </div>
  );
}

// ADDED: AccountManagement UI Components
function AccountAction({ icon, title, description, buttonLabel, danger = false, onClick }) {
  return (
    <div className={`account-action-item ${danger ? "danger" : ""}`}>
      <div className="account-action-icon">{icon}</div>
      <div className="account-action-text">
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <button type="button" className={`account-action-button ${danger ? "danger" : ""}`} onClick={onClick}>
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
      <path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" /><path d="M14 11v6" />
    </svg>
  );
}

function SellerStoreProfilePage() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  // EDIT 2: removed the `stats` state declaration (stats card deleted)
  const [notice, setNotice] = useState("");

  /* Edit profile modal (PRESERVED) */
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: "", store_name: "", mobile: "", street: "", barangay: "", city: "", province: "", postal_code: "" });
  const [editErrors, setEditErrors] = useState({});
  const [editSaving, setEditSaving] = useState(false);

  /* Change password modal (PRESERVED) */
  const [showPassword, setShowPassword] = useState(false);
  const [pwForm, setPwForm] = useState({ old_password: "", new_password: "", new_password_confirm: "" });
  const [visiblePasswords, setVisiblePasswords] = useState({ old_password: false, new_password: false, new_password_confirm: false });
  const [pwError, setPwError] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  /* CHANGED: Delete (Archive) modal replaces Deactivate */
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setLoadError("");
      try {
        const res = await authAPI.getProfile();
        const user = res?.user || res || {};
        if (!cancelled) setProfile(user);
      } catch (err) {
        if (!cancelled) setLoadError("Could not load your profile.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }

      // EDIT 3: removed the entire listings/stats fetch try/catch block
      // (it only fed the now-deleted Store Statistics card).
    }
    load();
    return () => { cancelled = true; };
  }, []);

  function showNotice(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 4000);
  }

  /* ---------- Edit profile (PRESERVED) ---------- */
  function openEdit() {
    if (!profile) return;
    setEditForm({
      full_name: profile.full_name || "", store_name: profile.store_name || "", mobile: profile.mobile || "",
      street: profile.street || "", barangay: profile.barangay || "", city: profile.city || "",
      province: profile.province || "", postal_code: profile.postal_code || "",
    });
    setEditErrors({});
    setShowEdit(true);
  }

  function handleEditChange(event) {
    const { name, value } = event.target;
    setEditForm((current) => ({ ...current, [name]: value }));
    setEditErrors((current) => ({ ...current, [name]: "", form: "" }));
  }

  function validateEdit() {
    const nextErrors = {};
    if (!editForm.full_name.trim()) nextErrors.full_name = "Full name is required.";
    if (!editForm.store_name.trim()) nextErrors.store_name = "Store name is required.";
    if (!/^\d{11}$/.test(editForm.mobile)) nextErrors.mobile = "Mobile number must contain exactly 11 digits.";
    else if (!editForm.mobile.startsWith("09")) nextErrors.mobile = "Philippine mobile number must start with 09.";
    if (!editForm.street.trim()) nextErrors.street = "Store address is required.";
    if (!editForm.barangay.trim()) nextErrors.barangay = "Barangay is required.";
    if (!editForm.city.trim()) nextErrors.city = "City or municipality is required.";
    if (!editForm.province) nextErrors.province = "Please select your province.";
    if (!/^\d{4}$/.test(editForm.postal_code)) nextErrors.postal_code = "Postal code must contain exactly 4 digits.";
    setEditErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function submitEdit(event) {
    event.preventDefault();
    if (!validateEdit()) return;
    setEditSaving(true);
    try {
      const res = await authAPI.updateProfile(editForm);
      const updated = res?.user || res;
      setProfile(updated);
      setShowEdit(false);
      showNotice("Profile updated successfully.");
    } catch (err) {
      setEditErrors({ form: "Update failed. Please try again." });
    } finally {
      setEditSaving(false);
    }
  }

  /* ---------- Change password (PRESERVED) ---------- */
  function openPassword() { setShowEdit(false); setPwForm({ old_password: "", new_password: "", new_password_confirm: "" }); setPwError(""); setShowPassword(true); }
  function closePassword() { setShowPassword(false); setShowEdit(true); }
  function togglePasswordVisibility(name) { setVisiblePasswords((current) => ({ ...current, [name]: !current[name] })); }
  function handlePwChange(event) { const { name, value } = event.target; setPwForm((current) => ({ ...current, [name]: value })); setPwError(""); }

  async function submitPassword(event) {
    event.preventDefault();
    const failedRules = PASSWORD_RULES.filter((rule) => !rule.test(pwForm.new_password));
    if (failedRules.length > 0) { setPwError(`New password must include ${failedRules.map((rule) => rule.label).join(", ")}.`); return; }
    if (pwForm.new_password !== pwForm.new_password_confirm) { setPwError("Passwords do not match."); return; }
    setPwSaving(true);
    try {
      await authAPI.changePassword(pwForm);
      clearAuthStorage();
      window.location.href = "/login";
    } catch (err) {
      setPwError("Password change failed. Please try again.");
    } finally {
      setPwSaving(false);
    }
  }

  /* ---------- CHANGED: Delete (Archive) Account ---------- */
  function openDeleteModal() { setDeleteConfirmed(false); setDeleteError(""); setShowDeleteModal(true); }
  function closeDeleteModal() { if (isDeleting) return; setShowDeleteModal(false); setDeleteConfirmed(false); setDeleteError(""); }

  async function handleDeleteAccount() {
    if (!deleteConfirmed) { setDeleteError("Please confirm that you want to archive your account."); return; }
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const refresh = localStorage.getItem("refresh_token") || sessionStorage.getItem("refresh_token") || "";
      await authAPI.deleteAccount(refresh);
      clearAuthStorage();
      window.location.href = "/login";
    } catch (err) {
      setDeleteError("Unable to archive your account. Please try again.");
      setIsDeleting(false);
    }
  }

  /* ---------- Render states ---------- */
  if (isLoading) return <main className="account-page"><section className="account-page-introduction"><p className="account-page-eyebrow">SELLER STORE PROFILE</p><h1>Loading…</h1></section></main>;
  if (loadError || !profile) return <main className="account-page"><section className="account-page-introduction"><p className="account-page-eyebrow">SELLER STORE PROFILE</p><h1>Unavailable</h1><p>{loadError}</p><button className="account-primary-button" onClick={() => window.location.reload()}>Retry</button></section></main>;

  const completeAddress = [profile.street, profile.barangay, profile.city, profile.province, profile.postal_code].filter(Boolean).join(", ");

  return (
    <main className="account-page">
      <section className="account-page-introduction">
        <p className="account-page-eyebrow">SELLER STORE PROFILE</p>
        <h1>{profile.store_name || "My Store"}</h1>
        <p className="account-page-description">View and manage your personal information, business address, store details, and account security.</p>
      </section>

      {notice && <p className="seller-profile-notice" role="status">{notice}</p>}

      {/* CHANGED: Using AccountManagementPage grid and card classes */}
      <section className="account-page-grid">

        {/* PROFILE DETAILS CARD */}
        <article className="account-card account-profile-card">
          <div className="account-card-heading">
            <div>
              <p className="account-card-label">PROFILE DETAILS</p>
              <h2>Store information</h2>
            </div>
            <button type="button" className="account-primary-button" onClick={openEdit}>Edit Store Profile</button>
          </div>
          <div className="account-information-list">
            <InformationRow label="Full Name" value={profile.full_name} />
            <InformationRow label="Member Since" value={formatJoinDate(profile.date_joined)} />
            <InformationRow label="Email Address" value={profile.email} />
            <InformationRow label="Mobile Number" value={profile.mobile} />
            <InformationRow label="Store Name" value={profile.store_name} />
          </div>
        </article>

        {/* ACCOUNT ACTIONS CARD (Archive Only) */}
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
              description="Archive your seller account and sign out. Your store information, product listings, and report records are retained and may be restored by support."
              buttonLabel="Archive Account"
              danger
              onClick={openDeleteModal}
            />
          </div>
        </article>

        {/* EDIT 4: the entire Store Statistics / "Listing overview" <article> block was deleted here. */}

        {/* STORE ADDRESS CARD */}
        <article className="account-card account-address-card">
          <div className="account-card-heading">
            <div>
              <p className="account-card-label">STORE ADDRESS</p>
              <h2>Business address</h2>
            </div>
          </div>
          <div className="account-address-content">
            <div className="account-address-icon"><LocationIcon /></div>
            <div>
              <strong>Business address</strong>
              <p>{completeAddress || "Not provided"}</p>
            </div>
          </div>
          <div className="account-address-details">
            <InformationRow label="Street Address" value={profile.street} />
            <InformationRow label="Barangay / City" value={`${profile.barangay || ""}, ${profile.city || ""}`} />
            <InformationRow label="Province" value={profile.province} />
            <InformationRow label="Postal Code" value={profile.postal_code} />
          </div>
        </article>
      </section>

      {/* PRESERVED: EDIT STORE PROFILE MODAL */}
      {showEdit && (
        <div className="seller-profile-edit-page-overlay">
          <form className="seller-profile-modal seller-profile-edit-modal" onSubmit={submitEdit} noValidate>
            <button type="button" className="seller-profile-edit-back" onClick={() => setShowEdit(false)}>← Back to Store Profile</button>
            <p className="seller-store-profile-label">PROFILE DETAILS</p>
            <h2>Edit Store Profile</h2>
            <p className="seller-profile-modal-description">Changes are saved directly to your seller account in the database.</p>
            <div className="seller-profile-form-grid">
              <p className="seller-profile-form-section">PERSONAL INFORMATION</p>
              <label className="seller-profile-field"><span className="seller-store-profile-label">Full Name</span><input className="seller-profile-deactivate-other" type="text" name="full_name" value={editForm.full_name} onChange={handleEditChange} />{editErrors.full_name && <small className="seller-profile-form-error">{editErrors.full_name}</small>}</label>
              <label className="seller-profile-field"><span className="seller-store-profile-label">Store Name</span><input className="seller-profile-deactivate-other" type="text" name="store_name" value={editForm.store_name} onChange={handleEditChange} />{editErrors.store_name && <small className="seller-profile-form-error">{editErrors.store_name}</small>}</label>
              <label className="seller-profile-field"><span className="seller-store-profile-label">Mobile Number</span><input className="seller-profile-deactivate-other" type="tel" name="mobile" value={editForm.mobile} onChange={handleEditChange} maxLength={11} />{editErrors.mobile && <small className="seller-profile-form-error">{editErrors.mobile}</small>}</label>
              <p className="seller-profile-form-section">STORE ADDRESS</p>
              <label className="seller-profile-field full"><span className="seller-store-profile-label">Store Address</span><input className="seller-profile-deactivate-other" type="text" name="street" value={editForm.street} onChange={handleEditChange} />{editErrors.street && <small className="seller-profile-form-error">{editErrors.street}</small>}</label>
              <label className="seller-profile-field"><span className="seller-store-profile-label">Barangay</span><input className="seller-profile-deactivate-other" type="text" name="barangay" value={editForm.barangay} onChange={handleEditChange} />{editErrors.barangay && <small className="seller-profile-form-error">{editErrors.barangay}</small>}</label>
              <label className="seller-profile-field"><span className="seller-store-profile-label">City / Municipality</span><input className="seller-profile-deactivate-other" type="text" name="city" value={editForm.city} onChange={handleEditChange} />{editErrors.city && <small className="seller-profile-form-error">{editErrors.city}</small>}</label>
              <label className="seller-profile-field"><span className="seller-store-profile-label">Province</span><select className="seller-profile-deactivate-other" name="province" value={editForm.province} onChange={handleEditChange}><option value="">Select your province</option>{PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}</select>{editErrors.province && <small className="seller-profile-form-error">{editErrors.province}</small>}</label>
              <label className="seller-profile-field"><span className="seller-store-profile-label">Postal Code</span><input className="seller-profile-deactivate-other" type="text" name="postal_code" value={editForm.postal_code} onChange={handleEditChange} maxLength={4} />{editErrors.postal_code && <small className="seller-profile-form-error">{editErrors.postal_code}</small>}</label>
            </div>
            {editErrors.form && <p className="seller-profile-form-error" role="alert">{editErrors.form}</p>}
            <div className="seller-profile-modal-actions seller-profile-edit-actions">
              <button type="button" className="seller-profile-secondary-button" onClick={() => setShowEdit(false)} disabled={editSaving}>Cancel</button>
              <button type="button" className="seller-profile-secondary-button" onClick={openPassword} disabled={editSaving}>Change Password</button>
              <button type="submit" className="seller-profile-primary-button" disabled={editSaving}>{editSaving ? "Saving…" : "Save Changes"}</button>
            </div>
          </form>
        </div>
      )}

      {/* PRESERVED: CHANGE PASSWORD MODAL */}
      {showPassword && (
        <div className="seller-profile-edit-page-overlay">
          <form className="seller-profile-modal seller-profile-edit-modal seller-profile-password-page" onSubmit={submitPassword} noValidate>
            <button type="button" className="seller-profile-edit-back" onClick={closePassword}>← Back to Edit Store Profile</button>
            <p className="seller-store-profile-label">ACCOUNT SECURITY</p>
            <h2>Change Password</h2>
            <p className="seller-profile-modal-description">Enter your current password and create a secure new password.</p>
            <div className="seller-profile-password-fields">
              {[["old_password", "Current Password", "current-password"], ["new_password", "New Password", "new-password"], ["new_password_confirm", "Confirm New Password", "new-password"]].map(([name, label, autoComplete]) => (
                <label className="seller-profile-field" key={name}>
                  <span className="seller-store-profile-label">{label}</span>
                  <div className="seller-profile-password-input">
                    <input type={visiblePasswords[name] ? "text" : "password"} name={name} value={pwForm[name]} onChange={handlePwChange} autoComplete={autoComplete} />
                    <button type="button" onClick={() => togglePasswordVisibility(name)}>{visiblePasswords[name] ? "Hide" : "Show"}</button>
                  </div>
                </label>
              ))}
            </div>
            <section className="seller-profile-password-rules">
              <strong>Password requirements</strong>
              {PASSWORD_RULES.map((rule) => { const passed = rule.test(pwForm.new_password); return (<p className={passed ? "passed" : ""} key={rule.label}><span>{passed ? "✓" : "○"}</span> Include {rule.label}.</p>); })}
            </section>
            {pwError && <p className="seller-profile-form-error" role="alert">{pwError}</p>}
            <div className="seller-profile-modal-actions">
              <button type="button" className="seller-profile-secondary-button" onClick={closePassword} disabled={pwSaving}>Cancel</button>
              <button type="submit" className="seller-profile-primary-button" disabled={pwSaving}>{pwSaving ? "Updating…" : "Update Password"}</button>
            </div>
          </form>
        </div>
      )}

      {/* CHANGED: DELETE (ARCHIVE) MODAL (Replaces Deactivate) */}
      {showDeleteModal && (
        <div className="account-deactivate-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) closeDeleteModal(); }}>
          <section className="account-deactivate-modal" role="dialog" aria-modal="true">
            <button type="button" className="account-deactivate-close" onClick={closeDeleteModal} disabled={isDeleting}>×</button>
            <div className="account-deactivate-icon"><DeleteIcon /></div>
            <p className="account-deactivate-eyebrow">DATA PRIVACY</p>
            <h2>Archive Your Seller Account?</h2>
            <p className="account-deactivate-description">This action signs you out and archives your seller account. Your store information, product listings, and report records are retained and may be restored by support.</p>
            <div className="account-deactivate-warning">
              <strong>What happens next</strong>
              <p>You will no longer be able to log in. Your store data is not erased — it is archived for compliance with RA 10173. Contact support to reactivate your account in the future.</p>
            </div>
            <label className="account-deactivate-confirmation">
              <input type="checkbox" checked={deleteConfirmed} onChange={(e) => { setDeleteConfirmed(e.target.checked); setDeleteError(""); }} />
              <span>I understand my seller account will be archived, I will be signed out, and I will not be able to log in until the account is restored.</span>
            </label>
            {deleteError && <div className="account-deactivate-error" role="alert">{deleteError}</div>}
            <div className="account-deactivate-actions">
              <button type="button" className="account-deactivate-cancel" onClick={closeDeleteModal} disabled={isDeleting}>Cancel</button>
              <button type="button" className="account-deactivate-submit" onClick={handleDeleteAccount} disabled={!deleteConfirmed || isDeleting}>{isDeleting ? "Archiving..." : "Confirm Archive"}</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default SellerStoreProfilePage;