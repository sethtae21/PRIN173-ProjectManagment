import { useMemo } from "react";
import {
  NavLink,
  useNavigate,
} from "react-router-dom";

import fitFusionLogo from "../assets/fitfusion-logo.svg";
import "./css/OrderConfirmationPage.css";

function readStoredValue(key, fallback) {
  try {
    const value =
      localStorage.getItem(key);

    if (!value) {
      return fallback;
    }

    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function formatPrice(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatPaymentMethod(method) {
  if (method === "cash-on-delivery") {
    return "Cash on Delivery";
  }

  if (method === "card") {
    return "Mock Card Payment";
  }

  if (method === "e-wallet") {
    return "Mock E-Wallet Payment";
  }

  return method || "Not available";
}

function OrderConfirmationPage() {
  const navigate = useNavigate();

  const order = useMemo(
    () =>
      readStoredValue(
        "fitfusion-latest-order",
        null
      ),
    []
  );

  function handleLogout() {
    const confirmed = window.confirm(
      "Are you sure you want to log out?"
    );

    if (!confirmed) {
      return;
    }

    sessionStorage.removeItem("userRole");
    sessionStorage.removeItem("userEmail");

    navigate("/login");
  }

  if (!order) {
    return (
      <main className="confirmation-empty-page">
        <section>
          <div className="confirmation-empty-icon">
            !
          </div>

          <p>ORDER NOT FOUND</p>

          <h1>
            No recent order is available
          </h1>

          <span>
            Complete the checkout process before
            opening the order confirmation page.
          </span>

          <button
            type="button"
            onClick={() =>
              navigate("/shopper/catalog")
            }
          >
            Return to Catalog
          </button>
        </section>
      </main>
    );
  }

  const orderId =
    order.orderId ||
    order.orderNumber ||
    order.id;

  const delivery = order.deliveryDetails || {};

  const deliveryAddress = [
    delivery.street,
    delivery.barangay,
    delivery.province,
    delivery.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="confirmation-page">
      <aside className="confirmation-sidebar">
        <div className="confirmation-sidebar-logo">
          <img
            src={fitFusionLogo}
            alt="FitFusion AI"
          />
        </div>

        <nav className="confirmation-navigation">
          <NavLink
            to="/shopper/dashboard"
            className="confirmation-nav-link"
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/shopper/fitting-studio"
            className="confirmation-nav-link"
          >
            Fitting Studio
          </NavLink>

          <NavLink
            to="/shopper/avatar-presets"
            className="confirmation-nav-link"
          >
            Avatar Presets
          </NavLink>

          <NavLink
            to="/shopper/catalog"
            className="confirmation-nav-link"
          >
            Catalog
          </NavLink>

          <NavLink
            to="/shopper/saved-outfits"
            className="confirmation-nav-link"
          >
            Saved Outfits
          </NavLink>

          <NavLink
            to="/shopper/orders"
            className="confirmation-nav-link active"
          >
            Order History
          </NavLink>

          <NavLink
            to="/shopper/account"
            className="confirmation-nav-link"
          >
            Account
          </NavLink>
        </nav>

        <button
          type="button"
          className="confirmation-logout"
          onClick={handleLogout}
        >
          Logout
        </button>
      </aside>

      <section className="confirmation-content">
        <header className="confirmation-header">
          <div>
            <p>17B — ORDER CONFIRMATION</p>

            <span>
              Mock payment approved and order
              successfully recorded
            </span>
          </div>

          <div className="confirmation-role">
            REGISTERED SHOPPER
          </div>
        </header>

        <div className="confirmation-body">
          <section className="confirmation-success">
            <div className="confirmation-check">
              ✓
            </div>

            <p>ORDER SUCCESSFUL</p>

            <h1>Thank you for your order!</h1>

            <span>
              Your simulated order has been
              successfully recorded. No real payment
              was charged.
            </span>
          </section>

          <section className="confirmation-card">
            <div className="confirmation-card-heading">
              <div>
                <p>ORDER SUMMARY</p>
                <h2>{orderId}</h2>
              </div>

              <span className="confirmation-status">
                {order.status || "Processing"}
              </span>
            </div>

            <div className="confirmation-details">
              <DetailRow
                label="Order date"
                value={formatDate(
                  order.createdAt || order.date
                )}
              />

              <DetailRow
                label="Recipient"
                value={
                  delivery.fullName ||
                  "Not provided"
                }
              />

              <DetailRow
                label="Delivery address"
                value={
                  deliveryAddress ||
                  "Not provided"
                }
              />

              <DetailRow
                label="Payment method"
                value={formatPaymentMethod(
                  order.paymentMethod
                )}
              />

              <DetailRow
                label="Payment status"
                value={
                  order.paymentStatus ||
                  "Recorded"
                }
              />

              <DetailRow
                label="Order total"
                value={formatPrice(order.total)}
                emphasized
              />
            </div>
          </section>

          <section className="confirmation-products">
            <div className="confirmation-section-heading">
              <p>ORDERED PRODUCTS</p>
              <h2>
                {order.items?.length || 0} product
                {order.items?.length === 1
                  ? ""
                  : "s"}
              </h2>
            </div>

            <div className="confirmation-product-list">
              {(order.items || []).map(
                (item, index) => (
                  <article
                    key={
                      item.cartItemId ||
                      `${item.id}-${index}`
                    }
                  >
                    <div className="confirmation-product-image">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                        />
                      ) : (
                        <span>
                          {item.name
                            ?.charAt(0)
                            .toUpperCase() || "P"}
                        </span>
                      )}
                    </div>

                    <div className="confirmation-product-info">
                      <strong>
                        {item.name ||
                          "FitFusion Product"}
                      </strong>

                      <span>
                        Size:{" "}
                        {item.selectedSize ||
                          item.size ||
                          "Default"}
                      </span>

                      <span>
                        Color:{" "}
                        {item.selectedColor ||
                          item.color ||
                          "Default"}
                      </span>

                      <span>
                        Quantity:{" "}
                        {Number(item.quantity) || 1}
                      </span>
                    </div>

                    <strong className="confirmation-product-price">
                      {formatPrice(
                        Number(item.price || 0) *
                          Number(
                            item.quantity || 1
                          )
                      )}
                    </strong>
                  </article>
                )
              )}
            </div>
          </section>

          <div className="confirmation-actions">
            <button
              type="button"
              className="confirmation-secondary"
              onClick={() =>
                navigate("/shopper/catalog")
              }
            >
              Continue Shopping
            </button>

            <button
              type="button"
              className="confirmation-outline"
              onClick={() =>
                navigate("/shopper/orders")
              }
            >
              View Order History
            </button>

            <button
              type="button"
              className="confirmation-primary"
              onClick={() => {
                localStorage.setItem(
                  "fitfusion-selected-order",
                  JSON.stringify(order)
                );

                navigate(
                  `/shopper/orders/${orderId}`
                );
              }}
            >
              View Order Details
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function DetailRow({
  label,
  value,
  emphasized = false,
}) {
  return (
    <div className="confirmation-detail-row">
      <span>{label}</span>

      <strong
        className={
          emphasized
            ? "confirmation-emphasized"
            : ""
        }
      >
        {value}
      </strong>
    </div>
  );
}

export default OrderConfirmationPage;