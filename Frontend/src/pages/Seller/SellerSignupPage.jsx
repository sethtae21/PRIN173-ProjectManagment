import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import fitFusionLogo from "../../assets/fitfusion-logo.svg";
import { authAPI } from "../../services/api"; // Fixed: ../../services/api
import "../css/SellerSignupPage.css";

const initialSellerForm = {
  ownerName: "", username: "", email: "", phone: "",
  storeName: "", storeAddress: "", storeDescription: "",
  password: "", confirmPassword: "",
};

function SellerSignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialSellerForm);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordRules = useMemo(() => ({
    length: form.password.length >= 8,
    uppercase: /[A-Z]/.test(form.password),
    lowercase: /[a-z]/.test(form.password),
    number: /\d/.test(form.password),
    special: /[^A-Za-z0-9]/.test(form.password),
  }), [form.password]);

  const validPassword = Object.values(passwordRules).every(Boolean);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "", general: "" }));
  }

  function validateStepOne() {
    const nextErrors = {};
    if (!form.ownerName.trim()) nextErrors.ownerName = "Please enter the account owner's name.";
    if (!form.username.trim()) nextErrors.username = "Please create a username.";
    if (!form.email.trim()) nextErrors.email = "Please enter your email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) nextErrors.email = "Please enter a valid email address.";
    if (!form.phone.trim()) nextErrors.phone = "Please enter your phone number.";
    else if (!/^(09|\+639)\d{9}$/.test(form.phone.replace(/\s/g, ""))) nextErrors.phone = "Enter a Philippine mobile number, such as 09171234567.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateStepTwo() {
    const nextErrors = {};
    if (!form.storeName.trim()) nextErrors.storeName = "Store Name is required for seller accounts.";
    if (!form.storeAddress.trim()) nextErrors.storeAddress = "Please enter your store or business address.";
    if (form.storeDescription.trim().length > 300) nextErrors.storeDescription = "The store description must not exceed 300 characters.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateStepThree() {
    const nextErrors = {};
    if (!validPassword) nextErrors.password = "Your password must satisfy all requirements.";
    if (!form.confirmPassword) nextErrors.confirmPassword = "Please confirm your password.";
    else if (form.password !== form.confirmPassword) nextErrors.confirmPassword = "The passwords do not match.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleNext() {
    if (step === 1 && validateStepOne()) setStep(2);
    if (step === 2 && validateStepTwo()) setStep(3);
  }

  function handleBack() {
    setErrors({});
    setStep((current) => Math.max(1, current - 1));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validateStepThree()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const payload = {
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: "seller",
        store_name: form.storeName.trim(),
        first_name: form.ownerName.trim(),
        phone: form.phone.trim(),
        store_address: form.storeAddress.trim(),
        store_description: form.storeDescription.trim(),
      };

      const response = await authAPI.register(payload);

      if (response.tokens?.access) {
        localStorage.setItem("access_token", response.tokens.access);
      }
      
      const currentUser = {
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        role: "seller",
        storeName: form.storeName.trim(),
      };
      localStorage.setItem("fitfusion-current-user", JSON.stringify(currentUser));
      sessionStorage.setItem("userRole", "seller");
      sessionStorage.setItem("userEmail", currentUser.email);

      navigate("/seller/dashboard", { replace: true });
    } catch (error) {
      console.error("Registration failed:", error);
      let generalError = "Registration failed. Please check your details.";
      
      try {
        const errorData = JSON.parse(error.message);
        if (errorData.username) generalError = `Username: ${errorData.username[0]}`;
        else if (errorData.email) generalError = `Email: ${errorData.email[0]}`;
        else if (errorData.detail) generalError = errorData.detail;
      } catch (e) {
        // Not JSON, keep generalError as is
      }

      setErrors({ general: generalError });
      setStep(1);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="seller-signup-page">
      <header className="seller-signup-header">
        <Link to="/"><img src={fitFusionLogo} alt="FitFusion AI" className="seller-signup-logo" /></Link>
        <Link to="/login" className="seller-signup-login">Already registered? Log in</Link>
      </header>

      <section className="seller-signup-container">
        <aside className="seller-signup-introduction">
          <div>
            <p className="seller-signup-eyebrow">SELLER REGISTRATION</p>
            <h1>Open your <span> FitFusion store.</span></h1>
            <p>Create a seller account to manage product listings, upload catalog items, review validation results, and process customer orders.</p>
          </div>
          <ol className="seller-signup-steps">
            <SellerStep number="1" title="Account & Contact" description="Owner information" active={step === 1} />
            <SellerStep number="2" title="Store Information" description="Required seller details" active={step === 2} />
            <SellerStep number="3" title="Account Security" description="Create a secure password" active={step === 3} />
          </ol>
        </aside>

        <section className="seller-signup-form-panel">
          <div className="seller-signup-progress">
            <span>Step {step} of 3</span>
            <div><span style={{ width: `${(step / 3) * 100}%` }} /></div>
          </div>

          <form className="seller-signup-form" onSubmit={handleSubmit}>
            {errors.general && <div className="seller-signup-general-error">{errors.general}</div>}

            {step === 1 && (
              <>
                <SellerHeading title="Account & Contact" description="Enter the seller account owner's information." />
                <SellerField label="Owner's Full Name" name="ownerName" value={form.ownerName} onChange={handleChange} placeholder="Enter your full name" error={errors.ownerName} autoComplete="name" />
                <SellerField label="Username" name="username" value={form.username} onChange={handleChange} placeholder="Create a username" error={errors.username} autoComplete="username" />
                <SellerField label="Email Address" name="email" type="email" value={form.email} onChange={handleChange} placeholder="seller@example.com" error={errors.email} autoComplete="email" />
                <SellerField label="Phone Number" name="phone" value={form.phone} onChange={handleChange} placeholder="09171234567" error={errors.phone} autoComplete="tel" />
              </>
            )}

            {step === 2 && (
              <>
                <SellerHeading title="Store Information" description="Store Name is required for every seller account." />
                <SellerField label="Store Name" name="storeName" value={form.storeName} onChange={handleChange} placeholder="Enter your store name" error={errors.storeName} />
                <SellerField label="Store or Business Address" name="storeAddress" value={form.storeAddress} onChange={handleChange} placeholder="Enter the complete address" error={errors.storeAddress} />
                <div className="seller-signup-field">
                  <label htmlFor="storeDescription">Store Description<span> Optional</span></label>
                  <textarea id="storeDescription" name="storeDescription" value={form.storeDescription} onChange={handleChange} placeholder="Briefly describe the products sold by your store." maxLength={300} />
                  <div className="seller-description-count">{form.storeDescription.length}/300</div>
                  {errors.storeDescription && <small>{errors.storeDescription}</small>}
                </div>
                <div className="seller-restriction-note">
                  <strong>Seller account reminder</strong>
                  <p>Products must pass catalog validation before appearing to shoppers.</p>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <SellerHeading title="Account Security" description="Create a password that satisfies all requirements." />
                <div className="seller-signup-field">
                  <label htmlFor="seller-password">Password</label>
                  <div className="seller-password-control">
                    <input id="seller-password" name="password" type={showPassword ? "text" : "password"} value={form.password} onChange={handleChange} placeholder="Create your password" autoComplete="new-password" />
                    <button type="button" onClick={() => setShowPassword((current) => !current)}>{showPassword ? "Hide" : "Show"}</button>
                  </div>
                  {errors.password && <small>{errors.password}</small>}
                </div>
                <ul className="seller-password-rules">
                  <SellerPasswordRule passed={passwordRules.length} text="At least 8 characters" />
                  <SellerPasswordRule passed={passwordRules.uppercase} text="One uppercase letter" />
                  <SellerPasswordRule passed={passwordRules.lowercase} text="One lowercase letter" />
                  <SellerPasswordRule passed={passwordRules.number} text="One number" />
                  <SellerPasswordRule passed={passwordRules.special} text="One special character" />
                </ul>
                <SellerField label="Confirm Password" name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} placeholder="Enter your password again" error={errors.confirmPassword} autoComplete="new-password" />
              </>
            )}

            <div className="seller-signup-actions">
              {step > 1 && <button type="button" className="seller-back-button" onClick={handleBack} disabled={isSubmitting}>Back</button>}
              {step < 3 ? (
                <button type="button" className="seller-primary-button" onClick={handleNext}>Save and Continue</button>
              ) : (
                <button type="submit" className="seller-primary-button" disabled={!validPassword || form.password !== form.confirmPassword || isSubmitting}>
                  {isSubmitting ? "Creating Account..." : "Create Seller Account"}
                </button>
              )}
            </div>
          </form>
        </section>
      </section>
    </main>
  );
}

function SellerStep({ number, title, description, active }) {
  return (<li className={active ? "active" : ""}><span>{number}</span><div><strong>{title}</strong><small>{description}</small></div></li>);
}

function SellerHeading({ title, description }) {
  return (<div className="seller-signup-form-heading"><h2>{title}</h2><p>{description}</p></div>);
}

function SellerField({ label, error, type = "text", ...inputProperties }) {
  return (<div className="seller-signup-field"><label htmlFor={inputProperties.name}>{label}</label><input id={inputProperties.name} type={type} {...inputProperties} />{error && <small>{error}</small>}</div>);
}

function SellerPasswordRule({ passed, text }) {
  return (<li className={passed ? "passed" : ""}><span>{passed ? "✓" : "○"}</span>{text}</li>);
}

export default SellerSignupPage;