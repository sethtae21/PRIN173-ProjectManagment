import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  NavLink,
  useNavigate,
  useParams,
} from "react-router-dom";

import fitFusionLogo from "../assets/fitfusion-logo.svg";
import "./css/OrderDetailsPage.css";

const fallbackOrder = {
  id: "FF-10261001",
  orderId: "FF-10261001",
  orderNumber: "FF-10261001",
  createdAt: "2026-10-01T08:30:00.000Z",
  status: "Processing",
  paymentStatus: "To Pay",
  paymentMethod: "cash-on-delivery",
  subtotal: 1598,
  discount: 200,
  shippingFee: 0,
  total: 1598,
  deliveryNotes:
    "Please contact me when the rider arrives.",
  deliveryDetails: {
    fullName: "Karol Dein Tamo",
    email: "karol@example.com",
    phone: "09123456789",
    street: "123 Rizal Street",
    barangay:
      "Barangay San Antonio, Makati City",
    province: "Metro Manila",
    postalCode: "1203",
  },
  items: [
    {
      id: "luna-1",
      name: "Classic Beige Top",
      sellerId: "luna-clothing",
      sellerName: "Luna Clothing",
      category: "Tops",
      price: 699,
      originalPrice: 799,
      quantity: 1,
      size: "M",
      color: "Beige",
      colorClass: "beige",
    },
    {
      id: "urban-1",
      name: "High-Waist Denim Pants",
      sellerId: "urban-threads",
      sellerName: "Urban Threads",
      category: "Bottoms",
      price: 899,
      originalPrice: 1099,
      quantity: 1,
      size: "M",
      color: "Blue",
      colorClass: "denim",
    },
  ],
};

const trackingSteps = [
  {
    id: "Processing",
    title: "Order Confirmed",
    description:
      "The seller is preparing your products.",
  },
  {
    id: "Shipped",
    title: "Order Shipped",
    description:
      "Your order has been handed to the courier.",
  },
  {
    id: "Out for Delivery",
    title: "Out for Delivery",
    description:
      "Your order is on the way to your address.",
  },
  {
    id: "Delivered",
    title: "Order Delivered",
    description:
      "The order was delivered successfully.",
  },
];

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

function normalizeOrder(order, orderId) {
  const products = Array.isArray(order?.items)
    ? order.items
    : Array.isArray(order?.products)
      ? order.products
      : [];

  return {
    id:
      order?.id ||
      order?.orderId ||
      orderId ||
      fallbackOrder.id,
    orderId:
      order?.orderId ||
      order?.id ||
      orderId ||
      fallbackOrder.orderId,
    orderNumber:
      order?.orderNumber ||
      order?.orderId ||
      order?.id ||
      orderId ||
      fallbackOrder.orderNumber,
    createdAt:
      order?.createdAt ||
      order?.date ||
      new Date().toISOString(),
    status: order?.status || "Processing",
    paymentStatus:
      order?.paymentStatus || "To Pay",
    paymentMethod:
      order?.paymentMethod ||
      "cash-on-delivery",
    subtotal:
      Number(order?.subtotal) || 0,
    discount:
      Number(order?.discount) || 0,
    shippingFee:
      Number(order?.shippingFee) || 0,
    total: Number(order?.total) || 0,
    deliveryDetails:
      order?.deliveryDetails || {},
    deliveryNotes:
      order?.deliveryNotes || "",
    items: products.map((item, index) => ({
      id:
        item?.id ||
        item?.productId ||
        `order-item-${index + 1}`,
      name:
        item?.name ||
        item?.productName ||
        `Product ${index + 1}`,
      sellerId:
        item?.sellerId ||
        item?.storeId ||
        "luna-clothing",
      sellerName:
        item?.sellerName ||
        item?.storeName ||
        "FitFusion Seller",
      category:
        item?.category || "Clothing",
      price: Number(item?.price) || 0,
      originalPrice:
        Number(item?.originalPrice) ||
        Number(item?.price) ||
        0,
      quantity:
        Number(item?.quantity) || 1,
      size:
        item?.size ||
        item?.selectedSize ||
        "",
      color:
        item?.color ||
        item?.selectedColor ||
        "Default",
      image:
        item?.image ||
        item?.imageUrl ||
        "",
      colorClass:
        item?.colorClass || "beige",
    })),
  };
}

function loadOrder(orderId) {
  const storedOrders =
    readStoredValue(
      "fitfusion-orders",
      []
    );

  if (Array.isArray(storedOrders)) {
    const matchingOrder =
      storedOrders.find(
        (order) =>
          String(
            order.id ||
              order.orderId ||
              order.orderNumber
          ) === String(orderId)
      );

    if (matchingOrder) {
      return normalizeOrder(
        matchingOrder,
        orderId
      );
    }
  }

  const selectedOrder =
    readStoredValue(
      "fitfusion-selected-order",
      null
    );

  if (selectedOrder) {
    return normalizeOrder(
      selectedOrder,
      orderId
    );
  }

  const latestOrder =
    readStoredValue(
      "fitfusion-latest-order",
      null
    );

  if (latestOrder) {
    return normalizeOrder(
      latestOrder,
      orderId
    );
  }

  return normalizeOrder(
    {
      ...fallbackOrder,
      id:
        orderId ||
        fallbackOrder.id,
      orderId:
        orderId ||
        fallbackOrder.orderId,
      orderNumber:
        orderId ||
        fallbackOrder.orderNumber,
    },
    orderId
  );
}

function formatDate(dateValue, includeTime = false) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  const options = {
    month: "long",
    day: "numeric",
    year: "numeric",
  };

  if (includeTime) {
    options.hour = "numeric";
    options.minute = "2-digit";
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    options
  ).format(date);
}

function formatPaymentMethod(method) {
  if (method === "cash-on-delivery") {
    return "Cash on Delivery";
  }

  if (method === "card") {
    return "Debit or Credit Card";
  }

  if (method === "e-wallet") {
    return "E-Wallet";
  }

  return method || "Not specified";
}

function OrderDetailsPage() {
  const navigate = useNavigate();
  const { orderId } = useParams();

  const [order, setOrder] = useState(() =>
    loadOrder(orderId)
  );

  const [notice, setNotice] = useState("");
  const [showCancelModal, setShowCancelModal] =
    useState(false);

  const [showRatingModal, setShowRatingModal] =
    useState(false);

  const [showLogoutModal, setShowLogoutModal] =
    useState(false);

  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [ratingError, setRatingError] =
    useState("");

  useEffect(() => {
    const loadedOrder =
      loadOrder(orderId);

    setOrder(loadedOrder);

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, [orderId]);

  const cartCount = useMemo(() => {
    const cartItems =
      readStoredValue(
        "fitfusion-cart-items",
        []
      );

    if (!Array.isArray(cartItems)) {
      return 0;
    }

    return cartItems.reduce(
      (total, item) =>
        total +
        (Number(item.quantity) || 1),
      0
    );
  }, [notice]);

  const calculatedSubtotal = useMemo(() => {
    if (order.subtotal > 0) {
      return order.subtotal;
    }

    return order.items.reduce(
      (total, item) =>
        total +
        item.price * item.quantity,
      0
    );
  }, [order]);

  const calculatedTotal =
    order.total > 0
      ? order.total
      : calculatedSubtotal +
        order.shippingFee;

  const currentTrackingIndex =
    useMemo(() => {
      if (
        order.status === "Cancelled"
      ) {
        return -1;
      }

      return trackingSteps.findIndex(
        (step) =>
          step.id === order.status
      );
    }, [order.status]);

  function displayNotice(message) {
    setNotice(message);

    setTimeout(() => {
      setNotice("");
    }, 2700);
  }

  function updateStoredOrder(updatedOrder) {
    const storedOrders =
      readStoredValue(
        "fitfusion-orders",
        []
      );

    let updatedOrders = [];

    if (Array.isArray(storedOrders)) {
      const orderExists =
        storedOrders.some(
          (storedOrder) =>
            String(
              storedOrder.id ||
                storedOrder.orderId
            ) ===
            String(updatedOrder.orderId)
        );

      if (orderExists) {
        updatedOrders = storedOrders.map(
          (storedOrder) =>
            String(
              storedOrder.id ||
                storedOrder.orderId
            ) ===
            String(updatedOrder.orderId)
              ? updatedOrder
              : storedOrder
        );
      } else {
        updatedOrders = [
          updatedOrder,
          ...storedOrders,
        ];
      }
    } else {
      updatedOrders = [updatedOrder];
    }

    localStorage.setItem(
      "fitfusion-orders",
      JSON.stringify(updatedOrders)
    );

    localStorage.setItem(
      "fitfusion-selected-order",
      JSON.stringify(updatedOrder)
    );
  }

  function cancelOrder() {
    const updatedOrder = {
      ...order,
      status: "Cancelled",
      paymentStatus:
        order.paymentStatus ===
        "Mock Paid"
          ? "Mock Refund Pending"
          : "Cancelled",
      cancelledAt:
        new Date().toISOString(),
    };

    setOrder(updatedOrder);
    updateStoredOrder(updatedOrder);
    setShowCancelModal(false);

    displayNotice(
      `Order ${order.orderNumber} was cancelled.`
    );
  }

  function buyAgain() {
    const storedCart =
      readStoredValue(
        "fitfusion-cart-items",
        []
      );

    const updatedCart = Array.isArray(
      storedCart
    )
      ? [...storedCart]
      : [];

    order.items.forEach((orderItem) => {
      const existingIndex =
        updatedCart.findIndex(
          (cartItem) =>
            String(
              cartItem.id ||
                cartItem.productId
            ) === String(orderItem.id) &&
            (cartItem.size ||
              cartItem.selectedSize) ===
              orderItem.size &&
            (cartItem.color ||
              cartItem.selectedColor) ===
              orderItem.color
        );

      if (existingIndex >= 0) {
        updatedCart[existingIndex] = {
          ...updatedCart[existingIndex],
          quantity:
            (Number(
              updatedCart[existingIndex]
                .quantity
            ) || 1) +
            orderItem.quantity,
        };
      } else {
        updatedCart.push({
          ...orderItem,
        });
      }
    });

    localStorage.setItem(
      "fitfusion-cart-items",
      JSON.stringify(updatedCart)
    );

    displayNotice(
      `${order.items.length} ${
        order.items.length === 1
          ? "product was"
          : "products were"
      } added to your cart.`
    );
  }

  function openProduct(item) {
    localStorage.setItem(
      "fitfusion-selected-product",
      JSON.stringify(item)
    );

    navigate(
      `/shopper/products/${item.id}`
    );
  }

  function submitRating(event) {
    event.preventDefault();

    if (rating === 0) {
      setRatingError(
        "Please select a star rating."
      );

      return;
    }

    const storedReviews =
      readStoredValue(
        "fitfusion-product-reviews",
        []
      );

    const newReview = {
      id: `review-${Date.now()}`,
      orderId: order.orderId,
      rating,
      review: review.trim(),
      createdAt:
        new Date().toISOString(),
      products: order.items.map(
        (item) => ({
          id: item.id,
          name: item.name,
        })
      ),
    };

    const updatedReviews =
      Array.isArray(storedReviews)
        ? [newReview, ...storedReviews]
        : [newReview];

    localStorage.setItem(
      "fitfusion-product-reviews",
      JSON.stringify(updatedReviews)
    );

    const updatedOrder = {
      ...order,
      reviewed: true,
      rating,
    };

    setOrder(updatedOrder);
    updateStoredOrder(updatedOrder);

    setShowRatingModal(false);
    setRatingError("");
    setReview("");

    displayNotice(
      "Thank you! Your prototype review was submitted."
    );
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
    <main className="order-details-page">
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
            className="shopper-nav-link"
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
            className={() =>
              "shopper-nav-link active"
            }
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

      <section className="order-details-content">
        <header className="order-details-header">
          <div>
            <button
              type="button"
              className="order-details-back"
              onClick={() =>
                navigate("/shopper/orders")
              }
            >
              ← Back to Order History
            </button>

            <h1>Order Details</h1>

            <p>
              Review your products, payment and
              delivery information.
            </p>
          </div>

          <div className="order-details-header-actions">
            <button
              type="button"
              className="order-details-cart-button"
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

            <div className="order-details-role">
              REGISTERED SHOPPER
            </div>
          </div>
        </header>

        <div className="order-details-body">
          {notice && (
            <div
              className="order-details-notice"
              role="status"
            >
              {notice}
            </div>
          )}

          <section className="order-details-overview">
            <div>
              <p>ORDER NUMBER</p>

              <h2>{order.orderNumber}</h2>

              <span>
                Placed on{" "}
                {formatDate(
                  order.createdAt,
                  true
                )}
              </span>
            </div>

            <div className="order-details-overview-actions">
              <span
                className={`order-details-status status-${order.status
                  .toLowerCase()
                  .replace(/\s+/g, "-")}`}
              >
                {order.status}
              </span>

              <button
                type="button"
                onClick={() =>
                  window.print()
                }
              >
                Print Order
              </button>
            </div>
          </section>

          <section className="order-tracking-card">
            <div className="order-details-section-heading">
              <div>
                <p>ORDER PROGRESS</p>
                <h3>Delivery status</h3>
              </div>

              <span>
                Last updated today
              </span>
            </div>

            {order.status === "Cancelled" ? (
              <div className="order-cancelled-message">
                <div>×</div>

                <div>
                  <strong>
                    This order was cancelled
                  </strong>

                  <span>
                    No further delivery updates
                    will be provided.
                  </span>
                </div>
              </div>
            ) : (
              <div className="order-tracking-steps">
                {trackingSteps.map(
                  (step, index) => {
                    const isComplete =
                      index <
                      currentTrackingIndex;

                    const isActive =
                      index ===
                      currentTrackingIndex;

                    return (
                      <article
                        key={step.id}
                        className={
                          isComplete
                            ? "completed"
                            : isActive
                              ? "active"
                              : ""
                        }
                      >
                        <div className="order-tracking-marker">
                          {isComplete
                            ? "✓"
                            : index + 1}
                        </div>

                        <div>
                          <strong>
                            {step.title}
                          </strong>

                          <span>
                            {step.description}
                          </span>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            )}
          </section>

          <div className="order-details-information-grid">
            <section className="order-information-card">
              <div className="order-details-section-heading">
                <div>
                  <p>DELIVERY INFORMATION</p>
                  <h3>Delivery address</h3>
                </div>
              </div>

              <div className="order-information-content">
                <strong>
                  {order.deliveryDetails
                    .fullName ||
                    "Registered Shopper"}
                </strong>

                <p>
                  {order.deliveryDetails
                    .street ||
                    "Address unavailable"}
                  <br />

                  {order.deliveryDetails
                    .barangay || ""}
                  {order.deliveryDetails
                    .barangay &&
                  order.deliveryDetails
                    .province
                    ? ", "
                    : ""}

                  {order.deliveryDetails
                    .province || ""}

                  {order.deliveryDetails
                    .postalCode && (
                    <>
                      <br />
                      Postal Code:{" "}
                      {
                        order
                          .deliveryDetails
                          .postalCode
                      }
                    </>
                  )}
                </p>

                <span>
                  Contact:{" "}
                  {order.deliveryDetails
                    .phone ||
                    "Not provided"}
                </span>

                <span>
                  Email:{" "}
                  {order.deliveryDetails
                    .email ||
                    "Not provided"}
                </span>

                {order.deliveryNotes && (
                  <div className="order-delivery-notes">
                    <b>Delivery Notes</b>

                    <span>
                      {order.deliveryNotes}
                    </span>
                  </div>
                )}
              </div>
            </section>

            <section className="order-information-card">
              <div className="order-details-section-heading">
                <div>
                  <p>PAYMENT INFORMATION</p>
                  <h3>Payment summary</h3>
                </div>
              </div>

              <div className="order-payment-information">
                <div>
                  <span>Payment Method</span>

                  <strong>
                    {formatPaymentMethod(
                      order.paymentMethod
                    )}
                  </strong>
                </div>

                <div>
                  <span>Payment Status</span>

                  <strong>
                    {order.paymentStatus}
                  </strong>
                </div>

                <div>
                  <span>Order Total</span>

                  <strong>
                    ₱
                    {calculatedTotal.toLocaleString(
                      "en-PH"
                    )}
                  </strong>
                </div>
              </div>

              <p className="order-payment-warning">
                This is a simulated order. No
                actual payment transaction was
                processed.
              </p>
            </section>
          </div>

          <section className="order-products-card">
            <div className="order-details-section-heading">
              <div>
                <p>ORDERED PRODUCTS</p>

                <h3>
                  {order.items.length}{" "}
                  {order.items.length === 1
                    ? "product"
                    : "products"}
                </h3>
              </div>

              <button
                type="button"
                onClick={buyAgain}
              >
                Buy All Again
              </button>
            </div>

            <div className="order-products-list">
              {order.items.map((item) => (
                <article
                  key={item.id}
                  className="order-product"
                >
                  <button
                    type="button"
                    className={`order-product-image ${item.colorClass}`}
                    onClick={() =>
                      openProduct(item)
                    }
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                      />
                    ) : (
                      <span>
                        {item.category
                          .slice(0, 1)
                          .toUpperCase()}
                      </span>
                    )}

                    <small>
                      ×{item.quantity}
                    </small>
                  </button>

                  <div className="order-product-information">
                    <button
                      type="button"
                      className="order-product-seller"
                      onClick={() =>
                        navigate(
                          `/shopper/sellers/${item.sellerId}`
                        )
                      }
                    >
                      {item.sellerName} →
                    </button>

                    <button
                      type="button"
                      className="order-product-name"
                      onClick={() =>
                        openProduct(item)
                      }
                    >
                      {item.name}
                    </button>

                    <p>{item.category}</p>

                    <div className="order-product-variations">
                      <span>
                        Size:{" "}
                        {item.size || "N/A"}
                      </span>

                      <span>
                        Color: {item.color}
                      </span>

                      <span>
                        Quantity:{" "}
                        {item.quantity}
                      </span>
                    </div>
                  </div>

                  <div className="order-product-price">
                    <span>Price</span>

                    <strong>
                      ₱
                      {item.price.toLocaleString(
                        "en-PH"
                      )}
                    </strong>

                    <small>
                      Item total: ₱
                      {(
                        item.price *
                        item.quantity
                      ).toLocaleString(
                        "en-PH"
                      )}
                    </small>
                  </div>

                  <div className="order-product-actions">
                    <button
                      type="button"
                      onClick={() =>
                        openProduct(item)
                      }
                    >
                      View Product
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const productOrder = {
                          ...order,
                          items: [item],
                        };

                        const originalOrder =
                          order;

                        setOrder(
                          productOrder
                        );

                        setTimeout(() => {
                          buyAgain();
                          setOrder(
                            originalOrder
                          );
                        }, 0);
                      }}
                    >
                      Buy Again
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className="order-details-bottom-grid">
            <section className="order-total-card">
              <div>
                <span>Subtotal</span>

                <strong>
                  ₱
                  {calculatedSubtotal.toLocaleString(
                    "en-PH"
                  )}
                </strong>
              </div>

              <div>
                <span>Product Discount</span>

                <strong className="order-discount">
                  -₱
                  {order.discount.toLocaleString(
                    "en-PH"
                  )}
                </strong>
              </div>

              <div>
                <span>Shipping Fee</span>

                <strong>
                  {order.shippingFee === 0
                    ? "FREE"
                    : `₱${order.shippingFee.toLocaleString(
                        "en-PH"
                      )}`}
                </strong>
              </div>

              <div className="order-grand-total">
                <span>Total</span>

                <strong>
                  ₱
                  {calculatedTotal.toLocaleString(
                    "en-PH"
                  )}
                </strong>
              </div>
            </section>

            <section className="order-details-actions-card">
              <p>ORDER ACTIONS</p>

              {order.status ===
                "Processing" && (
                <button
                  type="button"
                  className="order-cancel-button"
                  onClick={() =>
                    setShowCancelModal(true)
                  }
                >
                  Cancel Order
                </button>
              )}

              {order.status ===
                "Delivered" && (
                <button
                  type="button"
                  className="order-rate-button"
                  onClick={() =>
                    setShowRatingModal(true)
                  }
                >
                  {order.reviewed
                    ? `Rated ${order.rating}/5`
                    : "Rate This Order"}
                </button>
              )}

              <button
                type="button"
                className="order-buy-again-button"
                onClick={buyAgain}
              >
                Buy Again
              </button>

              <button
                type="button"
                className="order-contact-button"
                onClick={() =>
                  displayNotice(
                    "Customer support messaging will be connected to the backend later."
                  )
                }
              >
                Contact Support
              </button>
            </section>
          </div>
        </div>
      </section>

      {showCancelModal && (
        <div
          className="order-details-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowCancelModal(false);
            }
          }}
        >
          <section
            className="order-details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-cancel-title"
          >
            <div className="order-details-modal-icon danger">
              !
            </div>

            <h2 id="order-cancel-title">
              Cancel this order?
            </h2>

            <p>
              Order{" "}
              <strong>
                {order.orderNumber}
              </strong>{" "}
              will be cancelled. This action
              cannot be undone in the prototype.
            </p>

            <div className="order-details-modal-actions">
              <button
                type="button"
                className="order-details-modal-secondary"
                onClick={() =>
                  setShowCancelModal(false)
                }
              >
                Keep Order
              </button>

              <button
                type="button"
                className="order-details-modal-danger"
                onClick={cancelOrder}
              >
                Cancel Order
              </button>
            </div>
          </section>
        </div>
      )}

      {showRatingModal && (
        <div
          className="order-details-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowRatingModal(false);
            }
          }}
        >
          <form
            className="order-details-modal"
            onSubmit={submitRating}
          >
            <div className="order-details-modal-icon">
              ★
            </div>

            <h2>Rate your order</h2>

            <p>
              Tell us about your experience with
              the products in this order.
            </p>

            <div className="order-rating-stars">
              {[1, 2, 3, 4, 5].map(
                (star) => (
                  <button
                    key={star}
                    type="button"
                    className={
                      star <= rating
                        ? "active"
                        : ""
                    }
                    onClick={() => {
                      setRating(star);
                      setRatingError("");
                    }}
                    aria-label={`${star} stars`}
                  >
                    ★
                  </button>
                )
              )}
            </div>

            {ratingError && (
              <span className="order-rating-error">
                {ratingError}
              </span>
            )}

            <label className="order-review-field">
              <span>
                Review (optional)
              </span>

              <textarea
                value={review}
                onChange={(event) =>
                  setReview(
                    event.target.value
                  )
                }
                placeholder="Share your experience with the products, sizes, and seller."
                maxLength={300}
                rows={4}
              />

              <small>
                {review.length}/300
              </small>
            </label>

            <div className="order-details-modal-actions">
              <button
                type="button"
                className="order-details-modal-secondary"
                onClick={() =>
                  setShowRatingModal(false)
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="order-details-modal-primary"
              >
                Submit Review
              </button>
            </div>
          </form>
        </div>
      )}

      {showLogoutModal && (
        <div
          className="order-details-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowLogoutModal(false);
            }
          }}
        >
          <section className="order-details-modal">
            <div className="order-details-modal-icon">
              ↪
            </div>

            <h2>Log out?</h2>

            <p>
              You will need to log in again to
              access your order information.
            </p>

            <div className="order-details-modal-actions">
              <button
                type="button"
                className="order-details-modal-secondary"
                onClick={() =>
                  setShowLogoutModal(false)
                }
              >
                Stay
              </button>

              <button
                type="button"
                className="order-details-modal-primary"
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

export default OrderDetailsPage;