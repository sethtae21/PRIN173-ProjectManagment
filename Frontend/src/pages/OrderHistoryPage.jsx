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
import "./css/OrderHistoryPage.css";

const sampleOrders = [
  {
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
    deliveryDetails: {
      fullName: "Karol Dein Tamo",
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
        quantity: 1,
        size: "M",
        color: "Blue",
        colorClass: "denim",
      },
    ],
  },
  {
    id: "FF-09262026",
    orderId: "FF-09262026",
    orderNumber: "FF-09262026",
    createdAt: "2026-09-26T05:15:00.000Z",
    status: "Shipped",
    paymentStatus: "Mock Paid",
    paymentMethod: "e-wallet",
    subtotal: 999,
    discount: 200,
    shippingFee: 80,
    total: 1079,
    deliveryDetails: {
      fullName: "Karol Dein Tamo",
      street: "123 Rizal Street",
      barangay:
        "Barangay San Antonio, Makati City",
      province: "Metro Manila",
      postalCode: "1203",
    },
    items: [
      {
        id: "luna-2",
        name: "Floral Summer Dress",
        sellerId: "luna-clothing",
        sellerName: "Luna Clothing",
        category: "Dresses",
        price: 999,
        quantity: 1,
        size: "L",
        color: "Rose Floral",
        colorClass: "floral",
      },
    ],
  },
  {
    id: "FF-09152026",
    orderId: "FF-09152026",
    orderNumber: "FF-09152026",
    createdAt: "2026-09-15T03:45:00.000Z",
    status: "Delivered",
    paymentStatus: "Paid",
    paymentMethod: "cash-on-delivery",
    subtotal: 1399,
    discount: 300,
    shippingFee: 0,
    total: 1399,
    deliveryDetails: {
      fullName: "Karol Dein Tamo",
      street: "123 Rizal Street",
      barangay:
        "Barangay San Antonio, Makati City",
      province: "Metro Manila",
      postalCode: "1203",
    },
    items: [
      {
        id: "urban-4",
        name: "Streetwear Bomber Jacket",
        sellerId: "urban-threads",
        sellerName: "Urban Threads",
        category: "Outerwear",
        price: 1399,
        quantity: 1,
        size: "L",
        color: "Black",
        colorClass: "black",
      },
    ],
  },
];

const statusFilters = [
  "All",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
];

function readStoredArray(key) {
  try {
    const value = localStorage.getItem(key);

    if (value === null) {
      return null;
    }

    const parsedValue = JSON.parse(value);

    return Array.isArray(parsedValue)
      ? parsedValue
      : [];
  } catch {
    return [];
  }
}

function normalizeOrder(order, index) {
  const items = Array.isArray(order?.items)
    ? order.items
    : Array.isArray(order?.products)
      ? order.products
      : [];

  return {
    id:
      order?.id ||
      order?.orderId ||
      `FF-ORDER-${index + 1}`,
    orderId:
      order?.orderId ||
      order?.id ||
      `FF-ORDER-${index + 1}`,
    orderNumber:
      order?.orderNumber ||
      order?.orderId ||
      order?.id ||
      `FF-ORDER-${index + 1}`,
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
    total:
      Number(order?.total) || 0,
    deliveryDetails:
      order?.deliveryDetails || {},
    deliveryNotes:
      order?.deliveryNotes || "",
    items: items.map((item, itemIndex) => ({
      id:
        item?.id ||
        item?.productId ||
        `order-item-${itemIndex + 1}`,
      name:
        item?.name ||
        item?.productName ||
        `Product ${itemIndex + 1}`,
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

function loadOrders() {
  const storedOrders = readStoredArray(
    "fitfusion-orders"
  );

  /*
    Show sample orders when no order key
    exists yet. If the stored array is empty,
    the actual empty state is displayed.
  */
  const orderSource =
    storedOrders === null
      ? sampleOrders
      : storedOrders;

  return orderSource.map(normalizeOrder);
}

function formatOrderDate(dateValue) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  ).format(date);
}

function formatPaymentMethod(method) {
  if (method === "cash-on-delivery") {
    return "Cash on Delivery";
  }

  if (method === "e-wallet") {
    return "E-Wallet";
  }

  if (method === "card") {
    return "Debit or Credit Card";
  }

  return method || "Not specified";
}

function OrderHistoryPage() {
  const navigate = useNavigate();

  const [orders, setOrders] =
    useState(loadOrders);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [selectedStatus, setSelectedStatus] =
    useState("All");

  const [sortOption, setSortOption] =
    useState("newest");

  const [notice, setNotice] = useState("");
  const [orderToCancel, setOrderToCancel] =
    useState(null);

  const [showLogoutModal, setShowLogoutModal] =
    useState(false);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, []);

  const cartCount = useMemo(() => {
    const cartItems =
      readStoredArray(
        "fitfusion-cart-items"
      ) || [];

    return cartItems.reduce(
      (total, item) =>
        total +
        (Number(item.quantity) || 1),
      0
    );
  }, [notice]);

  const orderStatistics = useMemo(() => {
    return {
      total: orders.length,
      processing: orders.filter(
        (order) =>
          order.status === "Processing"
      ).length,
      shipped: orders.filter(
        (order) =>
          order.status === "Shipped"
      ).length,
      delivered: orders.filter(
        (order) =>
          order.status === "Delivered"
      ).length,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch =
      searchTerm.trim().toLowerCase();

    const matches = orders.filter(
      (order) => {
        const matchesStatus =
          selectedStatus === "All" ||
          order.status === selectedStatus;

        const matchesSearch =
          !normalizedSearch ||
          order.orderNumber
            .toLowerCase()
            .includes(normalizedSearch) ||
          order.items.some(
            (item) =>
              item.name
                .toLowerCase()
                .includes(
                  normalizedSearch
                ) ||
              item.sellerName
                .toLowerCase()
                .includes(
                  normalizedSearch
                )
          );

        return (
          matchesStatus && matchesSearch
        );
      }
    );

    return [...matches].sort(
      (firstOrder, secondOrder) => {
        const firstDate = new Date(
          firstOrder.createdAt
        ).getTime();

        const secondDate = new Date(
          secondOrder.createdAt
        ).getTime();

        if (sortOption === "oldest") {
          return firstDate - secondDate;
        }

        if (sortOption === "highest") {
          return (
            secondOrder.total -
            firstOrder.total
          );
        }

        if (sortOption === "lowest") {
          return (
            firstOrder.total -
            secondOrder.total
          );
        }

        return secondDate - firstDate;
      }
    );
  }, [
    orders,
    searchTerm,
    selectedStatus,
    sortOption,
  ]);

  function displayNotice(message) {
    setNotice(message);

    setTimeout(() => {
      setNotice("");
    }, 2800);
  }

  function viewOrder(order) {
    localStorage.setItem(
      "fitfusion-selected-order",
      JSON.stringify(order)
    );

    navigate(
      `/shopper/orders/${order.orderId}`
    );
  }

  function buyAgain(order) {
    const existingCart =
      readStoredArray(
        "fitfusion-cart-items"
      ) || [];

    const updatedCart = [
      ...existingCart,
    ];

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

  function confirmCancelOrder() {
    if (!orderToCancel) {
      return;
    }

    const updatedOrders = orders.map(
      (order) =>
        order.orderId ===
        orderToCancel.orderId
          ? {
              ...order,
              status: "Cancelled",
              paymentStatus:
                order.paymentStatus ===
                "Mock Paid"
                  ? "Mock Refund Pending"
                  : "Cancelled",
              cancelledAt:
                new Date().toISOString(),
            }
          : order
    );

    setOrders(updatedOrders);

    localStorage.setItem(
      "fitfusion-orders",
      JSON.stringify(updatedOrders)
    );

    displayNotice(
      `Order ${orderToCancel.orderNumber} was cancelled.`
    );

    setOrderToCancel(null);
  }

  function clearFilters() {
    setSearchTerm("");
    setSelectedStatus("All");
    setSortOption("newest");
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
    <main className="order-history-page">
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

      <section className="order-history-content">
        <header className="order-history-header">
          <div>
            <p className="order-history-page-code">
              SHOPPER ORDERS
            </p>

            <h1>Order History</h1>

            <span>
              Review and manage your previous
              orders.
            </span>
          </div>

          <div className="order-history-header-actions">
            <button
              type="button"
              className="order-history-cart-button"
              onClick={() =>
                navigate("/shopper/cart")
              }
              aria-label={`Open cart with ${cartCount} items`}
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

            <div className="order-history-role">
              REGISTERED SHOPPER
            </div>
          </div>
        </header>

        <div className="order-history-body">
          {notice && (
            <div
              className="order-history-notice"
              role="status"
            >
              {notice}
            </div>
          )}

          <section className="order-history-introduction">
            <div>
              <p>YOUR PURCHASES</p>

              <h2>
                Track every order in one place
              </h2>

              <span>
                Open an order to view its full
                products, payment and delivery
                information.
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate("/shopper/catalog")
              }
            >
              Continue Shopping
            </button>
          </section>

          <section className="order-history-statistics">
            <article>
              <span>Total Orders</span>
              <strong>
                {orderStatistics.total}
              </strong>
            </article>

            <article>
              <span>Processing</span>
              <strong>
                {orderStatistics.processing}
              </strong>
            </article>

            <article>
              <span>Shipped</span>
              <strong>
                {orderStatistics.shipped}
              </strong>
            </article>

            <article>
              <span>Delivered</span>
              <strong>
                {orderStatistics.delivered}
              </strong>
            </article>
          </section>

          <section className="order-history-orders-card">
            <div className="order-history-controls">
              <label className="order-history-search">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="7"
                  />

                  <path d="m20 20-4-4" />
                </svg>

                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(
                      event.target.value
                    )
                  }
                  placeholder="Search order number, product or seller"
                />
              </label>

              <label className="order-history-sort">
                <span>Sort by</span>

                <select
                  value={sortOption}
                  onChange={(event) =>
                    setSortOption(
                      event.target.value
                    )
                  }
                >
                  <option value="newest">
                    Newest First
                  </option>

                  <option value="oldest">
                    Oldest First
                  </option>

                  <option value="highest">
                    Highest Total
                  </option>

                  <option value="lowest">
                    Lowest Total
                  </option>
                </select>
              </label>
            </div>

            <div className="order-history-filter-tabs">
              {statusFilters.map(
                (status) => (
                  <button
                    key={status}
                    type="button"
                    className={
                      selectedStatus ===
                      status
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setSelectedStatus(
                        status
                      )
                    }
                  >
                    {status}

                    {status !== "All" && (
                      <span>
                        {
                          orders.filter(
                            (order) =>
                              order.status ===
                              status
                          ).length
                        }
                      </span>
                    )}
                  </button>
                )
              )}
            </div>

            <div className="order-history-result-row">
              <strong>
                {filteredOrders.length}{" "}
                {filteredOrders.length === 1
                  ? "order"
                  : "orders"}
              </strong>

              {(searchTerm ||
                selectedStatus !== "All" ||
                sortOption !== "newest") && (
                <button
                  type="button"
                  onClick={clearFilters}
                >
                  Clear Filters
                </button>
              )}
            </div>

            {filteredOrders.length > 0 ? (
              <div className="order-history-list">
                {filteredOrders.map(
                  (order) => (
                    <article
                      key={order.orderId}
                      className="order-history-order"
                    >
                      <header className="order-history-order-header">
                        <div>
                          <p>ORDER NUMBER</p>

                          <button
                            type="button"
                            onClick={() =>
                              viewOrder(order)
                            }
                          >
                            {order.orderNumber}
                          </button>
                        </div>

                        <div>
                          <p>ORDER DATE</p>

                          <strong>
                            {formatOrderDate(
                              order.createdAt
                            )}
                          </strong>
                        </div>

                        <div>
                          <p>PAYMENT</p>

                          <strong>
                            {formatPaymentMethod(
                              order.paymentMethod
                            )}
                          </strong>
                        </div>

                        <span
                          className={`order-status status-${order.status
                            .toLowerCase()
                            .replace(
                              /\s+/g,
                              "-"
                            )}`}
                        >
                          {order.status}
                        </span>
                      </header>

                      <div className="order-history-order-body">
                        <div className="order-history-products">
                          {order.items
                            .slice(0, 3)
                            .map((item) => (
                              <div
                                key={
                                  item.id
                                }
                                className="order-history-product"
                              >
                                <button
                                  type="button"
                                  className={`order-history-product-image ${item.colorClass}`}
                                  onClick={() => {
                                    localStorage.setItem(
                                      "fitfusion-selected-product",
                                      JSON.stringify(
                                        item
                                      )
                                    );

                                    navigate(
                                      `/shopper/products/${item.id}`
                                    );
                                  }}
                                >
                                  {item.image ? (
                                    <img
                                      src={
                                        item.image
                                      }
                                      alt={
                                        item.name
                                      }
                                    />
                                  ) : (
                                    <span>
                                      {item.category
                                        .slice(
                                          0,
                                          1
                                        )
                                        .toUpperCase()}
                                    </span>
                                  )}

                                  <small>
                                    ×
                                    {
                                      item.quantity
                                    }
                                  </small>
                                </button>

                                <div>
                                  <span>
                                    {
                                      item.sellerName
                                    }
                                  </span>

                                  <strong>
                                    {item.name}
                                  </strong>

                                  <p>
                                    Size:{" "}
                                    {item.size ||
                                      "N/A"}{" "}
                                    • Color:{" "}
                                    {
                                      item.color
                                    }
                                  </p>

                                  <b>
                                    ₱
                                  {(
                                       item.price *
                                       item.quantity
                                   ).toLocaleString("en-PH")}
                                  </b>

                                  {order.status === "Delivered" && (
                                   <ProductStarRating
                                    orderId={order.orderId}
                                    product={item}
                                    onRated={displayNotice}
                                   />
                                  )}
                                </div>
                              </div>
                            ))}

                          {order.items.length >
                            3 && (
                            <div className="order-history-more-items">
                              +
                              {order.items
                                .length - 3}{" "}
                              more
                            </div>
                          )}
                        </div>

                        <aside className="order-history-order-summary">
                          <div>
                            <span>
                              Payment Status
                            </span>

                            <strong>
                              {
                                order.paymentStatus
                              }
                            </strong>
                          </div>

                          <div>
                            <span>
                              Order Total
                            </span>

                            <strong className="order-history-total">
                              ₱
                              {order.total.toLocaleString(
                                "en-PH"
                              )}
                            </strong>
                          </div>

                          <button
                            type="button"
                            className="order-history-details-button"
                            onClick={() =>
                              viewOrder(order)
                            }
                          >
                            View Order Details
                          </button>

                          {order.status ===
                            "Delivered" ||
                          order.status ===
                            "Cancelled" ? (
                            <button
                              type="button"
                              className="order-history-secondary-button"
                              onClick={() =>
                                buyAgain(order)
                              }
                            >
                              Buy Again
                            </button>
                          ) : order.status ===
                            "Processing" ? (
                            <button
                              type="button"
                              className="order-history-cancel-button"
                              onClick={() =>
                                setOrderToCancel(
                                  order
                                )
                              }
                            >
                              Cancel Order
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="order-history-secondary-button"
                              onClick={() =>
                                viewOrder(order)
                              }
                            >
                              Track Order
                            </button>
                          )}
                        </aside>
                      </div>
                    </article>
                  )
                )}
              </div>
            ) : (
              <section className="order-history-empty">
                <div>⌕</div>

                <p>NO ORDERS FOUND</p>

                <h3>
                  No orders match your filters
                </h3>

                <span>
                  Try another search term or
                  clear the selected status.
                </span>

                <button
                  type="button"
                  onClick={clearFilters}
                >
                  Show All Orders
                </button>
              </section>
            )}
          </section>
        </div>
      </section>

      {orderToCancel && (
        <div
          className="order-history-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setOrderToCancel(null);
            }
          }}
        >
          <section
            className="order-history-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-order-title"
          >
            <div className="order-history-modal-icon danger">
              !
            </div>

            <h2 id="cancel-order-title">
              Cancel this order?
            </h2>

            <p>
              Order{" "}
              <strong>
                {orderToCancel.orderNumber}
              </strong>{" "}
              will be marked as cancelled. This
              action cannot be undone in the
              prototype.
            </p>

            <div className="order-history-modal-actions">
              <button
                type="button"
                className="order-modal-secondary"
                onClick={() =>
                  setOrderToCancel(null)
                }
              >
                Keep Order
              </button>

              <button
                type="button"
                className="order-modal-danger"
                onClick={confirmCancelOrder}
              >
                Cancel Order
              </button>
            </div>
          </section>
        </div>
      )}

      {showLogoutModal && (
        <div
          className="order-history-modal-backdrop"
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
            className="order-history-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-logout-title"
          >
            <div className="order-history-modal-icon">
              ↪
            </div>

            <h2 id="order-logout-title">
              Log out?
            </h2>

            <p>
              You will need to log in again to
              access your order history.
            </p>

            <div className="order-history-modal-actions">
              <button
                type="button"
                className="order-modal-secondary"
                onClick={() =>
                  setShowLogoutModal(false)
                }
              >
                Stay
              </button>

              <button
                type="button"
                className="order-modal-primary"
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

export default OrderHistoryPage;