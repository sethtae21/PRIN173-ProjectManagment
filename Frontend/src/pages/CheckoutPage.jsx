import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  NavLink,
  useNavigate,
} from "react-router-dom";

import fitFusionLogo from "../assets/fitfusion-logo.svg";
import "./css/CheckoutPage.css";

function readStoredValue(key, fallback) {
  try {
    const storedValue =
      localStorage.getItem(key);

    if (!storedValue) {
      return fallback;
    }

    return JSON.parse(storedValue);
  } catch {
    return fallback;
  }
}

function normalizeCheckoutData(value) {
  if (Array.isArray(value)) {
    return {
      items: value,
      subtotal: value.reduce(
        (total, item) =>
          total +
          Number(item.price || 0) *
            Number(item.quantity || 1),
        0
      ),
      discount: 0,
      shippingFee: 0,
      total: 0,
    };
  }

  if (
    value &&
    Array.isArray(value.items)
  ) {
    return {
      items: value.items,
      subtotal:
        Number(value.subtotal) || 0,
      discount:
        Number(value.discount) || 0,
      shippingFee:
        Number(value.shippingFee) || 0,
      total: Number(value.total) || 0,
    };
  }

  return {
    items: [],
    subtotal: 0,
    discount: 0,
    shippingFee: 0,
    total: 0,
  };
}

function loadAccountInformation() {
  const registeredAccount =
    readStoredValue(
      "registeredAccount",
      {}
    );

  const currentUser = readStoredValue(
    "fitfusion-current-user",
    {}
  );

  const account = {
    ...registeredAccount,
    ...currentUser,
  };

  return {
    fullName:
      account.fullName ||
      account.name ||
      account.username ||
      "",
    email: account.email || "",
    phone:
      account.phone ||
      account.contactNumber ||
      "",
    street:
      account.street ||
      account.streetAddress ||
      "",
    barangay:
      account.barangay ||
      account.city ||
      "",
    province:
      account.province || "",
    postalCode:
      account.postalCode ||
      account.zipCode ||
      "",
  };
}

function CheckoutPage() {
  const navigate = useNavigate();

  const storedCheckout =
    normalizeCheckoutData(
      readStoredValue(
        "fitfusion-checkout-items",
        null
      )
    );

  const [checkoutData] =
    useState(storedCheckout);

  const [deliveryDetails, setDeliveryDetails] =
    useState(loadAccountInformation);

  const [paymentMethod, setPaymentMethod] =
    useState("cash-on-delivery");

  const [cardDetails, setCardDetails] =
    useState({
      cardholderName: "",
      cardNumber: "",
      expiryDate: "",
      securityCode: "",
    });

  const [walletDetails, setWalletDetails] =
    useState({
      walletType: "GCash",
      mobileNumber: "",
    });

  const [deliveryNotes, setDeliveryNotes] =
    useState("");

  const [acceptedTerms, setAcceptedTerms] =
    useState(false);

  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] =
    useState("");

  const [showOrderModal, setShowOrderModal] =
    useState(false);

  const [showLogoutModal, setShowLogoutModal] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, []);

  const subtotal = useMemo(() => {
    if (checkoutData.subtotal > 0) {
      return checkoutData.subtotal;
    }

    return checkoutData.items.reduce(
      (total, item) =>
        total +
        Number(item.price || 0) *
          Number(item.quantity || 1),
      0
    );
  }, [checkoutData]);

  const discount = Math.max(
    0,
    checkoutData.discount
  );

  const shippingFee =
    checkoutData.items.length === 0
      ? 0
      : Number(
          checkoutData.shippingFee
        ) || 0;

  const total =
    checkoutData.total > 0
      ? checkoutData.total
      : subtotal + shippingFee;

  const cartCount = useMemo(() => {
    const cartItems = readStoredValue(
      "fitfusion-cart-items",
      []
    );

    if (!Array.isArray(cartItems)) {
      return 0;
    }

    return cartItems.reduce(
      (count, item) =>
        count +
        (Number(item.quantity) || 1),
      0
    );
  }, []);

  function updateDeliveryField(event) {
    const { name, value } = event.target;

    setDeliveryDetails(
      (currentDetails) => ({
        ...currentDetails,
        [name]: value,
      })
    );

    if (errors[name]) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        [name]: "",
      }));
    }

    setGeneralError("");
  }

  function updateCardField(event) {
    const { name, value } = event.target;

    let formattedValue = value;

    if (name === "cardNumber") {
      formattedValue = value
        .replace(/\D/g, "")
        .slice(0, 16)
        .replace(/(.{4})/g, "$1 ")
        .trim();
    }

    if (name === "securityCode") {
      formattedValue = value
        .replace(/\D/g, "")
        .slice(0, 4);
    }

    if (name === "expiryDate") {
      const numbers = value
        .replace(/\D/g, "")
        .slice(0, 4);

      formattedValue =
        numbers.length > 2
          ? `${numbers.slice(
              0,
              2
            )}/${numbers.slice(2)}`
          : numbers;
    }

    setCardDetails(
      (currentDetails) => ({
        ...currentDetails,
        [name]: formattedValue,
      })
    );

    if (errors[name]) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        [name]: "",
      }));
    }
  }

  function updateWalletField(event) {
    const { name, value } = event.target;

    const formattedValue =
      name === "mobileNumber"
        ? value
            .replace(/\D/g, "")
            .slice(0, 11)
        : value;

    setWalletDetails(
      (currentDetails) => ({
        ...currentDetails,
        [name]: formattedValue,
      })
    );

    if (errors.mobileNumber) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        mobileNumber: "",
      }));
    }
  }

  function selectPaymentMethod(method) {
    setPaymentMethod(method);
    setGeneralError("");

    setErrors((currentErrors) => {
      const updatedErrors = {
        ...currentErrors,
      };

      delete updatedErrors.cardholderName;
      delete updatedErrors.cardNumber;
      delete updatedErrors.expiryDate;
      delete updatedErrors.securityCode;
      delete updatedErrors.mobileNumber;

      return updatedErrors;
    });
  }

  function validateCheckout() {
    const validationErrors = {};

    if (
      !deliveryDetails.fullName.trim()
    ) {
      validationErrors.fullName =
        "Please enter the recipient's full name.";
    }

    if (
      !deliveryDetails.email.trim()
    ) {
      validationErrors.email =
        "Please enter your email address.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        deliveryDetails.email
      )
    ) {
      validationErrors.email =
        "Please enter a valid email address.";
    }

    if (
      !deliveryDetails.phone.trim()
    ) {
      validationErrors.phone =
        "Please enter a contact number.";
    } else if (
      !/^(09|\+639)\d{9}$/.test(
        deliveryDetails.phone.replace(
          /\s/g,
          ""
        )
      )
    ) {
      validationErrors.phone =
        "Use a valid Philippine mobile number.";
    }

    if (
      !deliveryDetails.street.trim()
    ) {
      validationErrors.street =
        "Please enter the house number and street.";
    }

    if (
      !deliveryDetails.barangay.trim()
    ) {
      validationErrors.barangay =
        "Please enter the barangay or city.";
    }

    if (
      !deliveryDetails.province.trim()
    ) {
      validationErrors.province =
        "Please enter the province.";
    }

    if (
      !deliveryDetails.postalCode.trim()
    ) {
      validationErrors.postalCode =
        "Please enter the postal code.";
    } else if (
      !/^\d{4}$/.test(
        deliveryDetails.postalCode
      )
    ) {
      validationErrors.postalCode =
        "The postal code must contain four digits.";
    }

    if (paymentMethod === "card") {
      if (
        !cardDetails.cardholderName.trim()
      ) {
        validationErrors.cardholderName =
          "Please enter the cardholder name.";
      }

      const cardNumbers =
        cardDetails.cardNumber.replace(
          /\s/g,
          ""
        );

      if (!cardNumbers) {
        validationErrors.cardNumber =
          "Please enter a card number.";
      } else if (
        !/^\d{16}$/.test(cardNumbers)
      ) {
        validationErrors.cardNumber =
          "The card number must contain 16 digits.";
      }

      if (
        !/^(0[1-9]|1[0-2])\/\d{2}$/.test(
          cardDetails.expiryDate
        )
      ) {
        validationErrors.expiryDate =
          "Use the MM/YY format.";
      }

      if (
        !/^\d{3,4}$/.test(
          cardDetails.securityCode
        )
      ) {
        validationErrors.securityCode =
          "Enter a valid 3 or 4-digit security code.";
      }
    }

    if (paymentMethod === "e-wallet") {
      if (
        !/^09\d{9}$/.test(
          walletDetails.mobileNumber
        )
      ) {
        validationErrors.mobileNumber =
          "Enter a valid 11-digit mobile number.";
      }
    }

    if (!acceptedTerms) {
      validationErrors.terms =
        "Please confirm that the order information is correct.";
    }

    if (
      checkoutData.items.length === 0
    ) {
      validationErrors.items =
        "Your checkout does not contain any products.";
    }

    setErrors(validationErrors);

    return (
      Object.keys(validationErrors)
        .length === 0
    );
  }

  function prepareOrder(event) {
    event.preventDefault();
    setGeneralError("");

    if (!validateCheckout()) {
      setGeneralError(
        "Please correct the highlighted checkout information."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    setShowOrderModal(true);
  }

  function placeOrder() {
    setIsSubmitting(true);

    const orderNumber = `FF-${Date.now()
      .toString()
      .slice(-8)}`;

    const newOrder = {
      id: orderNumber,
      orderId: orderNumber,
      orderNumber,
      date: new Date().toISOString(),
      createdAt:
        new Date().toISOString(),
      status: "Processing",
      paymentStatus:
        paymentMethod ===
        "cash-on-delivery"
          ? "To Pay"
          : "Mock Paid",
      paymentMethod,
      deliveryDetails,
      deliveryNotes,
      items: checkoutData.items,
      subtotal,
      discount,
      shippingFee,
      total,
    };

    const existingOrders =
      readStoredValue(
        "fitfusion-orders",
        []
      );

    const updatedOrders =
      Array.isArray(existingOrders)
        ? [newOrder, ...existingOrders]
        : [newOrder];

    localStorage.setItem(
      "fitfusion-orders",
      JSON.stringify(updatedOrders)
    );

    localStorage.setItem(
      "fitfusion-latest-order",
      JSON.stringify(newOrder)
    );

    /*
      Remove purchased items from the
      shopping cart.
    */
    const existingCart =
      readStoredValue(
        "fitfusion-cart-items",
        []
      );

    if (Array.isArray(existingCart)) {
      const purchasedIds = new Set(
        checkoutData.items.map((item) =>
          String(
            item.id || item.productId
          )
        )
      );

      const remainingCart =
        existingCart.filter(
          (item) =>
            !purchasedIds.has(
              String(
                item.id ||
                  item.productId
              )
            )
        );

      localStorage.setItem(
        "fitfusion-cart-items",
        JSON.stringify(remainingCart)
      );
    }

    localStorage.removeItem(
      "fitfusion-checkout-items"
    );

    setTimeout(() => {
      setIsSubmitting(false);
      setShowOrderModal(false);

      navigate(
        "/shopper/order-confirmation"
      );
    }, 700);
  }

  function confirmLogout() {
    sessionStorage.removeItem("userRole");
    sessionStorage.removeItem("userEmail");

    localStorage.removeItem(
      "fitfusion-current-user"
    );

    navigate("/login");
  }

  return (
    <main className="checkout-page">
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
            className="shopper-nav-link"
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/shopper/fitting-studio"
            className="shopper-nav-link"
          >
            Fitting Studio
          </NavLink>

          <NavLink
            to="/shopper/avatar-presets"
            className="shopper-nav-link"
          >
            Avatar Presets
          </NavLink>

          <NavLink
            to="/shopper/catalog"
            className={() =>
              "shopper-nav-link active"
            }
          >
            Catalog
          </NavLink>

          <NavLink
            to="/shopper/saved-outfits"
            className="shopper-nav-link"
          >
            Saved Outfits
          </NavLink>

          <NavLink
            to="/shopper/orders"
            className="shopper-nav-link"
          >
            Order History
          </NavLink>

          <NavLink
            to="/shopper/account"
            className="shopper-nav-link"
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

      <section className="checkout-content">
        <header className="checkout-header">
          <div>
            <button
              type="button"
              className="checkout-back-button"
              onClick={() =>
                navigate("/shopper/cart")
              }
            >
              ← Return to Shopping Cart
            </button>

            <h1>Checkout</h1>

            <p>
              Confirm your delivery and payment
              information.
            </p>
          </div>

          <div className="checkout-header-actions">
            <button
              type="button"
              className="checkout-cart-button"
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

              <span>{cartCount}</span>
            </button>

            <div className="checkout-role">
              REGISTERED SHOPPER
            </div>
          </div>
        </header>

        <div className="checkout-body">
          <section className="checkout-introduction">
            <div>
              <p>SECURE MOCK CHECKOUT</p>

              <h2>
                Complete your order
              </h2>

              <span>
                Review your information before
                submitting the simulated order.
              </span>
            </div>

            <div className="checkout-steps">
              <div className="completed">
                <strong>1</strong>
                <span>Cart</span>
              </div>

              <div className="active">
                <strong>2</strong>
                <span>Checkout</span>
              </div>

              <div>
                <strong>3</strong>
                <span>Confirmed</span>
              </div>
            </div>
          </section>

          {generalError && (
            <div
              className="checkout-general-error"
              role="alert"
            >
              {generalError}
            </div>
          )}

          {checkoutData.items.length > 0 ? (
            <form
              className="checkout-layout"
              onSubmit={prepareOrder}
              noValidate
            >
              <div className="checkout-form-column">
                <section className="checkout-section-card">
                  <div className="checkout-section-heading">
                    <div className="checkout-section-number">
                      1
                    </div>

                    <div>
                      <p>DELIVERY INFORMATION</p>
                      <h3>
                        Recipient and contact
                      </h3>
                    </div>
                  </div>

                  <div className="checkout-form-grid">
                    <label className="checkout-field full-width">
                      <span>Full Name *</span>

                      <input
                        type="text"
                        name="fullName"
                        value={
                          deliveryDetails.fullName
                        }
                        onChange={
                          updateDeliveryField
                        }
                        className={
                          errors.fullName
                            ? "field-error"
                            : ""
                        }
                        placeholder="Juan Dela Cruz"
                      />

                      {errors.fullName && (
                        <small>
                          {errors.fullName}
                        </small>
                      )}
                    </label>

                    <label className="checkout-field">
                      <span>
                        Email Address *
                      </span>

                      <input
                        type="email"
                        name="email"
                        value={
                          deliveryDetails.email
                        }
                        onChange={
                          updateDeliveryField
                        }
                        className={
                          errors.email
                            ? "field-error"
                            : ""
                        }
                        placeholder="name@example.com"
                      />

                      {errors.email && (
                        <small>
                          {errors.email}
                        </small>
                      )}
                    </label>

                    <label className="checkout-field">
                      <span>
                        Contact Number *
                      </span>

                      <input
                        type="tel"
                        name="phone"
                        value={
                          deliveryDetails.phone
                        }
                        onChange={
                          updateDeliveryField
                        }
                        className={
                          errors.phone
                            ? "field-error"
                            : ""
                        }
                        placeholder="09123456789"
                      />

                      {errors.phone && (
                        <small>
                          {errors.phone}
                        </small>
                      )}
                    </label>
                  </div>
                </section>

                <section className="checkout-section-card">
                  <div className="checkout-section-heading">
                    <div className="checkout-section-number">
                      2
                    </div>

                    <div>
                      <p>DELIVERY ADDRESS</p>
                      <h3>
                        Where should we deliver?
                      </h3>
                    </div>
                  </div>

                  <div className="checkout-form-grid">
                    <label className="checkout-field full-width">
                      <span>
                        House Number and Street *
                      </span>

                      <input
                        type="text"
                        name="street"
                        value={
                          deliveryDetails.street
                        }
                        onChange={
                          updateDeliveryField
                        }
                        className={
                          errors.street
                            ? "field-error"
                            : ""
                        }
                        placeholder="123 Rizal Street"
                      />

                      {errors.street && (
                        <small>
                          {errors.street}
                        </small>
                      )}
                    </label>

                    <label className="checkout-field">
                      <span>
                        Barangay / City *
                      </span>

                      <input
                        type="text"
                        name="barangay"
                        value={
                          deliveryDetails.barangay
                        }
                        onChange={
                          updateDeliveryField
                        }
                        className={
                          errors.barangay
                            ? "field-error"
                            : ""
                        }
                        placeholder="Barangay San Antonio, Makati"
                      />

                      {errors.barangay && (
                        <small>
                          {errors.barangay}
                        </small>
                      )}
                    </label>

                    <label className="checkout-field">
                      <span>Province *</span>

                      <input
                        type="text"
                        name="province"
                        value={
                          deliveryDetails.province
                        }
                        onChange={
                          updateDeliveryField
                        }
                        className={
                          errors.province
                            ? "field-error"
                            : ""
                        }
                        placeholder="Metro Manila"
                      />

                      {errors.province && (
                        <small>
                          {errors.province}
                        </small>
                      )}
                    </label>

                    <label className="checkout-field">
                      <span>Postal Code *</span>

                      <input
                        type="text"
                        name="postalCode"
                        value={
                          deliveryDetails.postalCode
                        }
                        onChange={
                          updateDeliveryField
                        }
                        className={
                          errors.postalCode
                            ? "field-error"
                            : ""
                        }
                        placeholder="1203"
                        maxLength={4}
                      />

                      {errors.postalCode && (
                        <small>
                          {errors.postalCode}
                        </small>
                      )}
                    </label>

                    <label className="checkout-field full-width">
                      <span>
                        Delivery Notes
                      </span>

                      <textarea
                        value={deliveryNotes}
                        onChange={(event) =>
                          setDeliveryNotes(
                            event.target.value
                          )
                        }
                        rows={3}
                        maxLength={180}
                        placeholder="Add landmarks or delivery instructions."
                      />

                      <em>
                        {deliveryNotes.length}
                        /180
                      </em>
                    </label>
                  </div>
                </section>

                <section className="checkout-section-card">
                  <div className="checkout-section-heading">
                    <div className="checkout-section-number">
                      3
                    </div>

                    <div>
                      <p>PAYMENT METHOD</p>
                      <h3>
                        Select a mock payment
                        option
                      </h3>
                    </div>
                  </div>

                  <div className="checkout-payment-options">
                    <label
                      className={
                        paymentMethod ===
                        "cash-on-delivery"
                          ? "checkout-payment-option active"
                          : "checkout-payment-option"
                      }
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={
                          paymentMethod ===
                          "cash-on-delivery"
                        }
                        onChange={() =>
                          selectPaymentMethod(
                            "cash-on-delivery"
                          )
                        }
                      />

                      <div className="checkout-payment-icon">
                        ₱
                      </div>

                      <div>
                        <strong>
                          Cash on Delivery
                        </strong>

                        <span>
                          Pay when the order is
                          delivered.
                        </span>
                      </div>
                    </label>

                    <label
                      className={
                        paymentMethod === "card"
                          ? "checkout-payment-option active"
                          : "checkout-payment-option"
                      }
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={
                          paymentMethod === "card"
                        }
                        onChange={() =>
                          selectPaymentMethod(
                            "card"
                          )
                        }
                      />

                      <div className="checkout-payment-icon">
                        ▣
                      </div>

                      <div>
                        <strong>
                          Debit or Credit Card
                        </strong>

                        <span>
                          Prototype payment only.
                        </span>
                      </div>
                    </label>

                    <label
                      className={
                        paymentMethod ===
                        "e-wallet"
                          ? "checkout-payment-option active"
                          : "checkout-payment-option"
                      }
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={
                          paymentMethod ===
                          "e-wallet"
                        }
                        onChange={() =>
                          selectPaymentMethod(
                            "e-wallet"
                          )
                        }
                      />

                      <div className="checkout-payment-icon">
                        ◈
                      </div>

                      <div>
                        <strong>
                          E-Wallet
                        </strong>

                        <span>
                          Simulated GCash or Maya.
                        </span>
                      </div>
                    </label>
                  </div>

                  {paymentMethod === "card" && (
                    <div className="checkout-conditional-fields">
                      <p>
                        MOCK CARD INFORMATION
                      </p>

                      <div className="checkout-form-grid">
                        <label className="checkout-field full-width">
                          <span>
                            Cardholder Name *
                          </span>

                          <input
                            type="text"
                            name="cardholderName"
                            value={
                              cardDetails.cardholderName
                            }
                            onChange={
                              updateCardField
                            }
                            className={
                              errors.cardholderName
                                ? "field-error"
                                : ""
                            }
                            placeholder="JUAN DELA CRUZ"
                          />

                          {errors.cardholderName && (
                            <small>
                              {
                                errors.cardholderName
                              }
                            </small>
                          )}
                        </label>

                        <label className="checkout-field full-width">
                          <span>
                            Card Number *
                          </span>

                          <input
                            type="text"
                            name="cardNumber"
                            value={
                              cardDetails.cardNumber
                            }
                            onChange={
                              updateCardField
                            }
                            className={
                              errors.cardNumber
                                ? "field-error"
                                : ""
                            }
                            placeholder="1234 5678 9012 3456"
                            inputMode="numeric"
                          />

                          {errors.cardNumber && (
                            <small>
                              {
                                errors.cardNumber
                              }
                            </small>
                          )}
                        </label>

                        <label className="checkout-field">
                          <span>
                            Expiration *
                          </span>

                          <input
                            type="text"
                            name="expiryDate"
                            value={
                              cardDetails.expiryDate
                            }
                            onChange={
                              updateCardField
                            }
                            className={
                              errors.expiryDate
                                ? "field-error"
                                : ""
                            }
                            placeholder="MM/YY"
                            inputMode="numeric"
                          />

                          {errors.expiryDate && (
                            <small>
                              {
                                errors.expiryDate
                              }
                            </small>
                          )}
                        </label>

                        <label className="checkout-field">
                          <span>
                            Security Code *
                          </span>

                          <input
                            type="password"
                            name="securityCode"
                            value={
                              cardDetails.securityCode
                            }
                            onChange={
                              updateCardField
                            }
                            className={
                              errors.securityCode
                                ? "field-error"
                                : ""
                            }
                            placeholder="123"
                            inputMode="numeric"
                          />

                          {errors.securityCode && (
                            <small>
                              {
                                errors.securityCode
                              }
                            </small>
                          )}
                        </label>
                      </div>
                    </div>
                  )}

                  {paymentMethod ===
                    "e-wallet" && (
                    <div className="checkout-conditional-fields">
                      <p>
                        MOCK E-WALLET INFORMATION
                      </p>

                      <div className="checkout-form-grid">
                        <label className="checkout-field">
                          <span>E-Wallet *</span>

                          <select
                            name="walletType"
                            value={
                              walletDetails.walletType
                            }
                            onChange={
                              updateWalletField
                            }
                          >
                            <option value="GCash">
                              GCash
                            </option>

                            <option value="Maya">
                              Maya
                            </option>
                          </select>
                        </label>

                        <label className="checkout-field">
                          <span>
                            Mobile Number *
                          </span>

                          <input
                            type="tel"
                            name="mobileNumber"
                            value={
                              walletDetails.mobileNumber
                            }
                            onChange={
                              updateWalletField
                            }
                            className={
                              errors.mobileNumber
                                ? "field-error"
                                : ""
                            }
                            placeholder="09123456789"
                            inputMode="numeric"
                          />

                          {errors.mobileNumber && (
                            <small>
                              {
                                errors.mobileNumber
                              }
                            </small>
                          )}
                        </label>
                      </div>
                    </div>
                  )}
                </section>
              </div>

              <aside className="checkout-summary-card">
                <div className="checkout-summary-heading">
                  <p>ORDER REVIEW</p>

                  <h3>Your products</h3>

                  <span>
                    {
                      checkoutData.items
                        .length
                    }{" "}
                    {checkoutData.items
                      .length === 1
                      ? "product"
                      : "products"}
                  </span>
                </div>

                <div className="checkout-products">
                  {checkoutData.items.map(
                    (item, index) => (
                      <article
                        key={
                          item.id ||
                          item.productId ||
                          index
                        }
                      >
                        <div
                          className={`checkout-product-image ${
                            item.colorClass ||
                            "beige"
                          }`}
                        >
                          {item.image ||
                          item.imageUrl ? (
                            <img
                              src={
                                item.image ||
                                item.imageUrl
                              }
                              alt={
                                item.name ||
                                item.productName
                              }
                            />
                          ) : (
                            <span>
                              {(item.category ||
                                "C")
                                .slice(0, 1)
                                .toUpperCase()}
                            </span>
                          )}

                          <small>
                            ×
                            {Number(
                              item.quantity
                            ) || 1}
                          </small>
                        </div>

                        <div>
                          <span>
                            {item.sellerName ||
                              item.storeName ||
                              "FitFusion Seller"}
                          </span>

                          <strong>
                            {item.name ||
                              item.productName}
                          </strong>

                          <p>
                            Size:{" "}
                            {item.size ||
                              item.selectedSize ||
                              "Not selected"}
                            <br />
                            Color:{" "}
                            {item.color ||
                              item.selectedColor ||
                              "Default"}
                          </p>
                        </div>

                        <b>
                          ₱
                          {(
                            Number(
                              item.price
                            ) *
                            (Number(
                              item.quantity
                            ) || 1)
                          ).toLocaleString(
                            "en-PH"
                          )}
                        </b>
                      </article>
                    )
                  )}
                </div>

                <div className="checkout-price-breakdown">
                  <div>
                    <span>Subtotal</span>

                    <strong>
                      ₱
                      {subtotal.toLocaleString(
                        "en-PH"
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Product discount
                    </span>

                    <strong className="checkout-discount">
                      -₱
                      {discount.toLocaleString(
                        "en-PH"
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Shipping fee</span>

                    <strong>
                      {shippingFee === 0
                        ? "FREE"
                        : `₱${shippingFee.toLocaleString(
                            "en-PH"
                          )}`}
                    </strong>
                  </div>
                </div>

                <div className="checkout-total">
                  <span>Total</span>

                  <strong>
                    ₱
                    {total.toLocaleString(
                      "en-PH"
                    )}
                  </strong>
                </div>

                <label
                  className={
                    errors.terms
                      ? "checkout-terms error"
                      : "checkout-terms"
                  }
                >
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(event) => {
                      setAcceptedTerms(
                        event.target.checked
                      );

                      if (errors.terms) {
                        setErrors(
                          (currentErrors) => ({
                            ...currentErrors,
                            terms: "",
                          })
                        );
                      }
                    }}
                  />

                  <span>
                    I confirm that the order,
                    delivery address and payment
                    information are correct.
                  </span>
                </label>

                {errors.terms && (
                  <p className="checkout-terms-error">
                    {errors.terms}
                  </p>
                )}

                <button
                  type="submit"
                  className="checkout-place-order-button"
                >
                  Review and Place Order
                </button>

                <button
                  type="button"
                  className="checkout-return-cart-button"
                  onClick={() =>
                    navigate("/shopper/cart")
                  }
                >
                  Return to Cart
                </button>

                <p className="checkout-prototype-warning">
                  Prototype only. No real payment
                  or delivery will be processed.
                </p>
              </aside>
            </form>
          ) : (
            <section className="checkout-empty">
              <div>!</div>

              <p>NO CHECKOUT PRODUCTS</p>

              <h2>
                Your checkout is currently empty
              </h2>

              <span>
                Return to your shopping cart and
                select at least one product
                before proceeding.
              </span>

              <button
                type="button"
                onClick={() =>
                  navigate("/shopper/cart")
                }
              >
                Return to Shopping Cart
              </button>
            </section>
          )}
        </div>
      </section>

      {showOrderModal && (
        <div
          className="checkout-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !isSubmitting
            ) {
              setShowOrderModal(false);
            }
          }}
        >
          <section
            className="checkout-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-confirm-title"
          >
            <div className="checkout-modal-icon">
              ✓
            </div>

            <h2 id="checkout-confirm-title">
              Confirm mock order
            </h2>

            <p>
              You are about to submit an order
              worth{" "}
              <strong>
                ₱
                {total.toLocaleString(
                  "en-PH"
                )}
              </strong>
              . No real payment will be charged.
            </p>

            <div className="checkout-modal-review">
              <span>Recipient</span>
              <strong>
                {deliveryDetails.fullName}
              </strong>

              <span>Payment</span>
              <strong>
                {paymentMethod ===
                "cash-on-delivery"
                  ? "Cash on Delivery"
                  : paymentMethod ===
                      "card"
                    ? "Mock Card Payment"
                    : `${walletDetails.walletType} Mock Payment`}
              </strong>

              <span>Products</span>
              <strong>
                {
                  checkoutData.items
                    .length
                }
              </strong>
            </div>

            <div className="checkout-modal-actions">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() =>
                  setShowOrderModal(false)
                }
              >
                Review Again
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={placeOrder}
              >
                {isSubmitting
                  ? "Submitting..."
                  : "Confirm Order"}
              </button>
            </div>
          </section>
        </div>
      )}

      {showLogoutModal && (
        <div
          className="checkout-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowLogoutModal(false);
            }
          }}
        >
          <section
            className="checkout-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-logout-title"
          >
            <div className="checkout-modal-icon">
              ↪
            </div>

            <h2 id="checkout-logout-title">
              Log out?
            </h2>

            <p>
              Your unfinished checkout
              information may be lost.
            </p>

            <div className="checkout-modal-actions">
              <button
                type="button"
                onClick={() =>
                  setShowLogoutModal(false)
                }
              >
                Stay
              </button>

              <button
                type="button"
                onClick={confirmLogout}
              >
                Logout
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default CheckoutPage;