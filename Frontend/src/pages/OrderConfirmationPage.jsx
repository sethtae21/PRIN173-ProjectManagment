import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import "./css/OrderConfirmationPage.css";

const LAST_ORDER_STORAGE_KEY =
  "fitfusion-last-order";

const fallbackOrder = {
  id: "FF-07865527",
  placedAt: "October 9, 2026",
  status: "Processing",

  customer: {
    fullName: "Karol Dein Tamo",
    email: "shopper@example.com",
    contactNumber: "09123456789",

    address: {
      street: "123 Sample Street",
      city: "Makati City",
      province: "Metro Manila",
      postalCode: "1200",
    },
  },

  paymentMethod: "Cash on Delivery",
  shippingFee: 0,
  productDiscount: 200,
  originalSubtotal: 1699,
  total: 1499,

  items: [
    {
      id: "001-M-Beige",
      productId: "001",
      name: "Classic Beige Blazer",
      sellerName: "FitFusion Seller",
      price: 1499,
      originalPrice: 1699,
      quantity: 1,
      size: "M",
      color: "Beige",
      image: "",
    },
  ],
};

function formatCurrency(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(Number(value || 0));
}

function loadLastOrder() {
  try {
    const storedOrder =
      localStorage.getItem(
        LAST_ORDER_STORAGE_KEY
      );

    if (!storedOrder) {
      return fallbackOrder;
    }

    const parsedOrder =
      JSON.parse(storedOrder);

    if (
      !parsedOrder ||
      typeof parsedOrder !== "object"
    ) {
      return fallbackOrder;
    }

    return {
      ...fallbackOrder,
      ...parsedOrder,

      customer: {
        ...fallbackOrder.customer,
        ...(parsedOrder.customer || {}),

        address: {
          ...fallbackOrder.customer.address,
          ...(parsedOrder.customer
            ?.address || {}),
        },
      },

      items:
        Array.isArray(parsedOrder.items) &&
        parsedOrder.items.length > 0
          ? parsedOrder.items
          : fallbackOrder.items,
    };
  } catch {
    return fallbackOrder;
  }
}

function formatAddress(address) {
  if (!address) {
    return "Delivery address unavailable";
  }

  if (typeof address === "string") {
    return address;
  }

  return [
    address.street,
    address.city,
    address.province,
    address.postalCode,
  ]
    .filter(Boolean)
    .join(", ");
}

function OrderConfirmationPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const storedOrder = loadLastOrder();

  const order = {
    ...storedOrder,

    id:
      location.state?.orderId ||
      storedOrder.id,

    total:
      location.state?.total ??
      storedOrder.total,
  };

  const items = Array.isArray(order.items)
    ? order.items
    : [];

  const productCount = items.length;

  const calculatedOriginalSubtotal =
    items.reduce(
      (total, item) =>
        total +
        Number(
          item.originalPrice ||
            item.price ||
            0
        ) *
          Number(item.quantity || 1),
      0
    );

  const calculatedSaleSubtotal =
    items.reduce(
      (total, item) =>
        total +
        Number(item.price || 0) *
          Number(item.quantity || 1),
      0
    );

  const originalSubtotal =
    Number(order.originalSubtotal) ||
    calculatedOriginalSubtotal;

  const productDiscount =
    order.productDiscount !== undefined
      ? Number(order.productDiscount)
      : Math.max(
          0,
          originalSubtotal -
            calculatedSaleSubtotal
        );

  const shippingFee = Number(
    order.shippingFee || 0
  );

  const total =
    order.total !== undefined
      ? Number(order.total)
      : calculatedSaleSubtotal +
        shippingFee;

  return (
    <main className="order-confirmation-page">
      <div className="order-confirmation-container">
        <section className="order-confirmation-success">
          <div
            className="order-confirmation-check"
            aria-hidden="true"
          >
            ✓
          </div>

          <p>ORDER SUCCESSFUL</p>

          <h1>
            Thank you for your order!
          </h1>

          <span>
            Your simulated order has been
            successfully recorded. No real
            payment was charged.
          </span>
        </section>

        <section className="order-confirmation-summary-card">
          <div className="order-confirmation-summary-heading">
            <div>
              <p>ORDER SUMMARY</p>

              <h2>#{order.id}</h2>
            </div>

            <span className="order-confirmation-status">
              {order.status || "Processing"}
            </span>
          </div>

          <div className="order-confirmation-details">
            <div>
              <span>Order date</span>

              <strong>
                {order.placedAt ||
                  new Date().toLocaleDateString(
                    "en-PH",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }
                  )}
              </strong>
            </div>

            <div>
              <span>Recipient</span>

              <strong>
                {order.customer?.fullName ||
                  order.customer?.name ||
                  "Shopper"}
              </strong>
            </div>

            <div>
              <span>Contact number</span>

              <strong>
                {order.customer
                  ?.contactNumber ||
                  order.customer?.mobile ||
                  "Not provided"}
              </strong>
            </div>

            <div>
              <span>Delivery address</span>

              <strong>
                {formatAddress(
                  order.customer?.address
                )}
              </strong>
            </div>

            <div>
              <span>Payment method</span>

              <strong>
                {order.paymentMethod ||
                  "Cash on Delivery"}
              </strong>
            </div>
          </div>
        </section>

        <section className="order-confirmation-products-card">
          <div className="order-confirmation-products-heading">
            <div>
              <p>ORDERED PRODUCTS</p>

              <h2>
                {productCount}{" "}
                {productCount === 1
                  ? "product"
                  : "products"}
              </h2>
            </div>
          </div>

          <div className="order-confirmation-products">
            {items.map((item, index) => (
              <article
                className="order-confirmation-product"
                key={
                  item.id ||
                  `${item.productId}-${index}`
                }
              >
                <button
                  type="button"
                  className="order-confirmation-product-image"
                  onClick={() =>
                    navigate(
                      `/shopper/products/${
                        item.productId ||
                        item.id
                      }`
                    )
                  }
                  aria-label={`View ${item.name}`}
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                    />
                  ) : (
                    <strong>
                      {(
                        item.name || "Product"
                      ).charAt(0)}
                    </strong>
                  )}

                  <small>
                    ×
                    {Number(
                      item.quantity || 1
                    )}
                  </small>
                </button>

                <div className="order-confirmation-product-copy">
                  <span>
                    {item.sellerName ||
                      "FitFusion Seller"}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/shopper/products/${
                          item.productId ||
                          item.id
                        }`
                      )
                    }
                  >
                    {item.name}
                  </button>

                  <small>
                    Size: {item.size || "M"}
                  </small>

                  <small>
                    Color:{" "}
                    {item.color || "Default"}
                  </small>
                </div>

                <div className="order-confirmation-product-price">
                  <span>Item total</span>

                  <strong>
                    {formatCurrency(
                      Number(
                        item.price || 0
                      ) *
                        Number(
                          item.quantity || 1
                        )
                    )}
                  </strong>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="order-confirmation-bottom-grid">
          <article className="order-confirmation-payment-card">
            <div className="order-confirmation-payment-row">
              <span>Subtotal</span>

              <strong>
                {formatCurrency(
                  originalSubtotal
                )}
              </strong>
            </div>

            <div className="order-confirmation-payment-row discount">
              <span>Product discount</span>

              <strong>
                −
                {formatCurrency(
                  productDiscount
                )}
              </strong>
            </div>

            <div className="order-confirmation-payment-row">
              <span>Shipping fee</span>

              <strong>
                {shippingFee === 0
                  ? "FREE"
                  : formatCurrency(
                      shippingFee
                    )}
              </strong>
            </div>

            <div className="order-confirmation-total">
              <span>Total</span>

              <strong>
                {formatCurrency(total)}
              </strong>
            </div>
          </article>

          <article className="order-confirmation-actions-card">
            <p>NEXT STEPS</p>

            <button
              type="button"
              className="order-confirmation-primary-button"
              onClick={() =>
                navigate(
                  `/shopper/orders/${order.id}`
                )
              }
            >
              View Order Details
            </button>

            <button
              type="button"
              className="order-confirmation-secondary-button"
              onClick={() =>
                navigate("/shopper/orders")
              }
            >
              View Order History
            </button>

            <button
              type="button"
              className="order-confirmation-text-button"
              onClick={() =>
                navigate("/shopper/catalog")
              }
            >
              Continue Shopping
            </button>
          </article>
        </section>

        <p className="order-confirmation-note">
          Keep your order number for reference:
          <strong> #{order.id}</strong>
        </p>
      </div>
    </main>
  );
}

export default OrderConfirmationPage;