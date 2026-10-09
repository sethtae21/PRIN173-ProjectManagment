import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import "./css/CheckoutPage.css";

const CART_STORAGE_KEY = "fitfusion-cart";
const CHECKOUT_STORAGE_KEY =
  "fitfusion-checkout-items";
const ORDERS_STORAGE_KEY =
  "fitfusion-orders";

const fallbackItems = [
  {
    id: "001-M-Beige",
    productId: "001",
    name: "Classic Beige Blazer",
    category: "Clothing",
    sellerId: "fitfusion-seller",
    sellerName: "FitFusion Seller",
    price: 1499,
    originalPrice: 1699,
    quantity: 1,
    size: "M",
    color: "Beige",
    image: "",
  },
];

function formatCurrency(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(value);
}

function readStoredArray(key) {
  try {
    const storedValue =
      localStorage.getItem(key);

    if (!storedValue) {
      return [];
    }

    const parsedValue =
      JSON.parse(storedValue);

    return Array.isArray(parsedValue)
      ? parsedValue
      : [];
  } catch {
    return [];
  }
}

function loadCheckoutItems() {
  const checkoutItems = readStoredArray(
    CHECKOUT_STORAGE_KEY
  );

  if (checkoutItems.length > 0) {
    return checkoutItems;
  }

  const selectedCartItems =
    readStoredArray(
      CART_STORAGE_KEY
    ).filter(
      (item) => item.selected !== false
    );

  if (selectedCartItems.length > 0) {
    return selectedCartItems;
  }

  return fallbackItems;
}

function createOrderNumber() {
  const randomPart = Math.floor(
    10000000 + Math.random() * 90000000
  );

  return `FF-${randomPart}`;
}

function CheckoutPage() {
  const navigate = useNavigate();

  const [checkoutItems] = useState(
    loadCheckoutItems
  );

  const [showConfirmation, setShowConfirmation] =
    useState(false);

  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    fullName: "Karol Dein Tamo",
    email: "seth@gmail.com",
    contactNumber: "09123456789",
    street: "",
    city: "",
    province: "",
    postalCode: "",
    paymentMethod: "Cash on Delivery",
  });

  useEffect(() => {
    localStorage.setItem(
      CHECKOUT_STORAGE_KEY,
      JSON.stringify(checkoutItems)
    );
  }, [checkoutItems]);

  const productCount = checkoutItems.length;

  const originalSubtotal = useMemo(
    () =>
      checkoutItems.reduce(
        (total, item) =>
          total +
          Number(
            item.originalPrice ||
              item.price ||
              0
          ) *
            Number(item.quantity || 1),
        0
      ),
    [checkoutItems]
  );

  const discountedSubtotal = useMemo(
    () =>
      checkoutItems.reduce(
        (total, item) =>
          total +
          Number(item.price || 0) *
            Number(item.quantity || 1),
        0
      ),
    [checkoutItems]
  );

  const productDiscount = Math.max(
    0,
    originalSubtotal -
      discountedSubtotal
  );

  const shippingFee =
    discountedSubtotal >= 1500 ? 0 : 80;

  const total =
    discountedSubtotal + shippingFee;

  function handleInputChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        [name]: "",
      }));
    }
  }

  function validateForm() {
    const nextErrors = {};

    if (!form.fullName.trim()) {
      nextErrors.fullName =
        "Please enter the recipient's full name.";
    }

    if (!form.email.trim()) {
      nextErrors.email =
        "Please enter your email address.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.email
      )
    ) {
      nextErrors.email =
        "Please enter a valid email address.";
    }

    if (!form.contactNumber.trim()) {
      nextErrors.contactNumber =
        "Please enter your contact number.";
    } else if (
      !/^(09|\+639)\d{9}$/.test(
        form.contactNumber.replace(
          /\s/g,
          ""
        )
      )
    ) {
      nextErrors.contactNumber =
        "Use a valid Philippine mobile number.";
    }

    if (!form.street.trim()) {
      nextErrors.street =
        "Please enter your street or building address.";
    }

    if (!form.city.trim()) {
      nextErrors.city =
        "Please enter your barangay or city.";
    }

    if (!form.province.trim()) {
      nextErrors.province =
        "Please enter your province.";
    }

    if (!form.postalCode.trim()) {
      nextErrors.postalCode =
        "Please enter your postal code.";
    } else if (
      !/^\d{4}$/.test(form.postalCode)
    ) {
      nextErrors.postalCode =
        "Postal code must contain 4 digits.";
    }

    setErrors(nextErrors);

    return (
      Object.keys(nextErrors).length === 0
    );
  }

  function handleReviewOrder(event) {
    event.preventDefault();

    if (!validateForm()) {
      const firstError =
        document.querySelector(
          ".checkout-field-error"
        );

      firstError?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      return;
    }

    setShowConfirmation(true);
  }

  function removePurchasedItemsFromCart() {
    const currentCart = readStoredArray(
      CART_STORAGE_KEY
    );

    const remainingCart =
      currentCart.filter((cartItem) => {
        return !checkoutItems.some(
          (checkoutItem) =>
            String(
              checkoutItem.productId ??
                checkoutItem.id
            ) ===
              String(
                cartItem.productId ??
                  cartItem.id
              ) &&
            checkoutItem.size ===
              cartItem.size &&
            checkoutItem.color ===
              cartItem.color
        );
      });

    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify(remainingCart)
    );

    window.dispatchEvent(
      new CustomEvent(
        "fitfusion-cart-updated",
        {
          detail: {
            cart: remainingCart,
            quantity:
              remainingCart.length,
          },
        }
      )
    );
  }

  function handleConfirmOrder() {
    const orderNumber =
      createOrderNumber();

    const newOrder = {
      id: orderNumber,
      placedAt:
        new Date().toLocaleDateString(
          "en-PH",
          {
            year: "numeric",
            month: "long",
            day: "numeric",
          }
        ),
      status: "Processing",
      customer: {
        fullName: form.fullName,
        email: form.email,
        contactNumber:
          form.contactNumber,
        address: {
          street: form.street,
          city: form.city,
          province: form.province,
          postalCode: form.postalCode,
        },
      },
      paymentMethod:
        form.paymentMethod,
      items: checkoutItems,
      originalSubtotal,
      productDiscount,
      shippingFee,
      total,
    };

    const existingOrders =
      readStoredArray(
        ORDERS_STORAGE_KEY
      );

    localStorage.setItem(
      ORDERS_STORAGE_KEY,
      JSON.stringify([
        newOrder,
        ...existingOrders,
      ])
    );

    localStorage.setItem(
      "fitfusion-last-order",
      JSON.stringify(newOrder)
    );

    removePurchasedItemsFromCart();

    localStorage.removeItem(
      CHECKOUT_STORAGE_KEY
    );

    setShowConfirmation(false);

    navigate(
      "/shopper/order-confirmation",
      {
        replace: true,
        state: {
          orderId: orderNumber,
          total,
        },
      }
    );
  }

  return (
    <main className="checkout-page">
      <div className="checkout-toolbar">
        <Link
          to="/shopper/cart"
          className="checkout-return-link"
        >
          ← Return to Shopping Cart
        </Link>

        <button
          type="button"
          className="checkout-cart-count"
          onClick={() =>
            navigate("/shopper/cart")
          }
          aria-label={`Shopping cart with ${productCount} products`}
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 7H6" />
            <circle cx="10" cy="20" r="1" />
            <circle cx="18" cy="20" r="1" />
          </svg>

          <strong>{productCount}</strong>
        </button>
      </div>

      <div className="checkout-content">
        <section className="checkout-introduction">
          <div>
            <p>SECURE MOCK CHECKOUT</p>

            <h1>Complete your order</h1>

            <span>
              Review your information before
              submitting the simulated order.
            </span>
          </div>

          <div className="checkout-progress">
            <div className="complete">
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

        <form
          className="checkout-grid"
          onSubmit={handleReviewOrder}
          noValidate
        >
          <div className="checkout-form-column">
            <section className="checkout-form-card">
              <div className="checkout-card-heading">
                <strong>1</strong>

                <div>
                  <p>
                    DELIVERY INFORMATION
                  </p>

                  <h2>
                    Recipient and contact
                  </h2>
                </div>
              </div>

              <div className="checkout-fields-grid">
                <label className="checkout-full-field">
                  <span>Full Name *</span>

                  <input
                    type="text"
                    name="fullName"
                    value={form.fullName}
                    onChange={
                      handleInputChange
                    }
                    aria-invalid={
                      Boolean(
                        errors.fullName
                      )
                    }
                  />

                  {errors.fullName && (
                    <small className="checkout-field-error">
                      {errors.fullName}
                    </small>
                  )}
                </label>

                <label>
                  <span>Email Address *</span>

                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={
                      handleInputChange
                    }
                    aria-invalid={
                      Boolean(errors.email)
                    }
                  />

                  {errors.email && (
                    <small className="checkout-field-error">
                      {errors.email}
                    </small>
                  )}
                </label>

                <label>
                  <span>Contact Number *</span>

                  <input
                    type="tel"
                    name="contactNumber"
                    value={
                      form.contactNumber
                    }
                    onChange={
                      handleInputChange
                    }
                    placeholder="09XXXXXXXXX"
                    aria-invalid={Boolean(
                      errors.contactNumber
                    )}
                  />

                  {errors.contactNumber && (
                    <small className="checkout-field-error">
                      {
                        errors.contactNumber
                      }
                    </small>
                  )}
                </label>
              </div>
            </section>

            <section className="checkout-form-card">
              <div className="checkout-card-heading">
                <strong>2</strong>

                <div>
                  <p>DELIVERY ADDRESS</p>

                  <h2>
                    Where should we deliver?
                  </h2>
                </div>
              </div>

              <div className="checkout-fields-grid">
                <label className="checkout-full-field">
                  <span>
                    Street, Building, or Unit *
                  </span>

                  <input
                    type="text"
                    name="street"
                    value={form.street}
                    onChange={
                      handleInputChange
                    }
                    placeholder="Unit, building, street"
                    aria-invalid={
                      Boolean(errors.street)
                    }
                  />

                  {errors.street && (
                    <small className="checkout-field-error">
                      {errors.street}
                    </small>
                  )}
                </label>

                <label>
                  <span>
                    Barangay / City *
                  </span>

                  <input
                    type="text"
                    name="city"
                    value={form.city}
                    onChange={
                      handleInputChange
                    }
                    placeholder="Barangay or city"
                    aria-invalid={
                      Boolean(errors.city)
                    }
                  />

                  {errors.city && (
                    <small className="checkout-field-error">
                      {errors.city}
                    </small>
                  )}
                </label>

                <label>
                  <span>Province *</span>

                  <input
                    type="text"
                    name="province"
                    value={form.province}
                    onChange={
                      handleInputChange
                    }
                    placeholder="Province"
                    aria-invalid={Boolean(
                      errors.province
                    )}
                  />

                  {errors.province && (
                    <small className="checkout-field-error">
                      {errors.province}
                    </small>
                  )}
                </label>

                <label>
                  <span>Postal Code *</span>

                  <input
                    type="text"
                    name="postalCode"
                    value={form.postalCode}
                    onChange={
                      handleInputChange
                    }
                    maxLength="4"
                    inputMode="numeric"
                    placeholder="0000"
                    aria-invalid={Boolean(
                      errors.postalCode
                    )}
                  />

                  {errors.postalCode && (
                    <small className="checkout-field-error">
                      {errors.postalCode}
                    </small>
                  )}
                </label>
              </div>
            </section>

            <section className="checkout-form-card">
              <div className="checkout-card-heading">
                <strong>3</strong>

                <div>
                  <p>PAYMENT METHOD</p>

                  <h2>
                    Select your payment
                  </h2>
                </div>
              </div>

              <div className="checkout-payment-options">
                <label
                  className={
                    form.paymentMethod ===
                    "Cash on Delivery"
                      ? "selected"
                      : ""
                  }
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="Cash on Delivery"
                    checked={
                      form.paymentMethod ===
                      "Cash on Delivery"
                    }
                    onChange={
                      handleInputChange
                    }
                  />

                  <div>
                    <strong>
                      Cash on Delivery
                    </strong>

                    <span>
                      Pay when your products
                      arrive.
                    </span>
                  </div>
                </label>

                <label
                  className={
                    form.paymentMethod ===
                    "Mock E-Wallet"
                      ? "selected"
                      : ""
                  }
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="Mock E-Wallet"
                    checked={
                      form.paymentMethod ===
                      "Mock E-Wallet"
                    }
                    onChange={
                      handleInputChange
                    }
                  />

                  <div>
                    <strong>
                      Mock E-Wallet
                    </strong>

                    <span>
                      Simulation only. No real
                      payment is processed.
                    </span>
                  </div>
                </label>
              </div>
            </section>
          </div>

          <aside className="checkout-order-review">
            <p className="checkout-review-label">
              ORDER REVIEW
            </p>

            <h2>Your products</h2>

            <span>
              {productCount}{" "}
              {productCount === 1
                ? "product"
                : "products"}
            </span>

            <div className="checkout-divider" />

            <div className="checkout-products">
              {checkoutItems.map(
                (item, index) => (
                  <article
                    className="checkout-product"
                    key={
                      item.id ||
                      `${item.productId}-${index}`
                    }
                  >
                    <div className="checkout-product-image">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                        />
                      ) : (
                        <strong>
                          {(
                            item.name ||
                            "Product"
                          ).charAt(0)}
                        </strong>
                      )}

                      <small>
                        ×
                        {Number(
                          item.quantity || 1
                        )}
                      </small>
                    </div>

                    <div className="checkout-product-copy">
                      <span>
                        {item.sellerName ||
                          "FitFusion Seller"}
                      </span>

                      <strong>
                        {item.name}
                      </strong>

                      <small>
                        Size:{" "}
                        {item.size || "M"}
                      </small>

                      <small>
                        Color:{" "}
                        {item.color ||
                          "Default"}
                      </small>
                    </div>

                    <strong className="checkout-product-price">
                      {formatCurrency(
                        Number(
                          item.price || 0
                        ) *
                          Number(
                            item.quantity ||
                              1
                          )
                      )}
                    </strong>
                  </article>
                )
              )}
            </div>

            <div className="checkout-divider" />

            <div className="checkout-summary-row">
              <span>Subtotal</span>

              <strong>
                {formatCurrency(
                  originalSubtotal
                )}
              </strong>
            </div>

            <div className="checkout-summary-row discount">
              <span>Product discount</span>

              <strong>
                −
                {formatCurrency(
                  productDiscount
                )}
              </strong>
            </div>

            <div className="checkout-summary-row">
              <span>Shipping fee</span>

              <strong>
                {shippingFee === 0
                  ? "FREE"
                  : formatCurrency(
                      shippingFee
                    )}
              </strong>
            </div>

            <div className="checkout-divider" />

            <div className="checkout-total">
              <span>Total</span>

              <strong>
                {formatCurrency(total)}
              </strong>
            </div>

            <button
              type="submit"
              className="checkout-place-order-button"
            >
              Review and Place Order
            </button>

            <p className="checkout-prototype-note">
              This is a simulated checkout. No
              real payment will be charged.
            </p>
          </aside>
        </form>
      </div>

      {showConfirmation && (
        <div
          className="checkout-modal-backdrop"
          role="presentation"
          onMouseDown={() =>
            setShowConfirmation(false)
          }
        >
          <section
            className="checkout-confirmation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-order-title"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <p>CONFIRM ORDER</p>

            <h2 id="confirm-order-title">
              Place this mock order?
            </h2>

            <span>
              Please confirm that the delivery
              information and selected products
              are correct.
            </span>

            <div className="checkout-modal-summary">
              <div>
                <span>Products</span>

                <strong>
                  {productCount}
                </strong>
              </div>

              <div>
                <span>Payment</span>

                <strong>
                  {form.paymentMethod}
                </strong>
              </div>

              <div>
                <span>Total</span>

                <strong>
                  {formatCurrency(total)}
                </strong>
              </div>
            </div>

            <div className="checkout-modal-actions">
              <button
                type="button"
                className="checkout-cancel-button"
                onClick={() =>
                  setShowConfirmation(false)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="checkout-confirm-button"
                onClick={handleConfirmOrder}
              >
                Confirm Order
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default CheckoutPage;