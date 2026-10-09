import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import "./css/OrderHistoryPage.css";

const ORDERS_STORAGE_KEY =
  "fitfusion-orders";

const CART_STORAGE_KEY =
  "fitfusion-cart";

const RATINGS_STORAGE_KEY =
  "fitfusion-product-ratings";

const MAX_CART_QUANTITY = 10;

const fallbackOrders = [
  {
    id: "FF-38252027",
    placedAt: "October 8, 2026",
    timestamp: "2026-10-08T13:30:00",
    status: "Processing",
    total: 5697,

    items: [
      {
        id: "001-M-Beige",
        productId: "001",
        name: "Modern Structured Blazer",
        category: "Outerwear",
        sellerId: "maison-moderne",
        sellerName: "Maison Moderne",
        price: 1899,
        originalPrice: 2299,
        quantity: 3,
        size: "M",
        color: "Beige",
        image: "",
      },
    ],
  },
  {
    id: "FF-07865527",
    placedAt: "October 3, 2026",
    timestamp: "2026-10-03T14:11:00",
    status: "Delivered",
    total: 1499,

    items: [
      {
        id: "003-M-Beige",
        productId: "003",
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
    ],
  },
  {
    id: "FF-01928374",
    placedAt: "September 28, 2026",
    timestamp: "2026-09-28T10:30:00",
    status: "Cancelled",
    total: 899,

    items: [
      {
        id: "002-S-Ivory",
        productId: "002",
        name: "Classic Linen Blouse",
        category: "Tops",
        sellerId: "aurelia-studio",
        sellerName: "Aurelia Studio",
        price: 899,
        originalPrice: 1099,
        quantity: 1,
        size: "S",
        color: "Ivory",
        image: "",
      },
    ],
  },
];

function formatCurrency(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(Number(value || 0));
}

function readArray(key) {
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

function loadOrders() {
  const storedOrders = readArray(
    ORDERS_STORAGE_KEY
  );

  if (storedOrders.length === 0) {
    return fallbackOrders;
  }

  const combinedOrders = [
    ...storedOrders,
    ...fallbackOrders,
  ];

  const uniqueOrders = new Map();

  combinedOrders.forEach((order) => {
    if (!order?.id) {
      return;
    }

    if (!uniqueOrders.has(order.id)) {
      uniqueOrders.set(order.id, order);
    }
  });

  return Array.from(uniqueOrders.values());
}

function loadRatings() {
  try {
    const storedRatings =
      localStorage.getItem(
        RATINGS_STORAGE_KEY
      );

    if (!storedRatings) {
      return {};
    }

    const parsedRatings =
      JSON.parse(storedRatings);

    return parsedRatings &&
      typeof parsedRatings === "object"
      ? parsedRatings
      : {};
  } catch {
    return {};
  }
}

function addItemsToCart(items) {
  const currentCart = readArray(
    CART_STORAGE_KEY
  );

  const nextCart = [...currentCart];

  items.forEach((orderItem) => {
    const existingIndex =
      nextCart.findIndex(
        (cartItem) =>
          String(
            cartItem.productId ??
              cartItem.id
          ) ===
            String(
              orderItem.productId ??
                orderItem.id
            ) &&
          cartItem.size ===
            orderItem.size &&
          cartItem.color ===
            orderItem.color
      );

    if (existingIndex >= 0) {
      const existingItem =
        nextCart[existingIndex];

      nextCart[existingIndex] = {
        ...existingItem,
        quantity: Math.min(
          MAX_CART_QUANTITY,
          Number(
            existingItem.quantity || 1
          ) +
            Number(
              orderItem.quantity || 1
            )
        ),
        selected: true,
      };

      return;
    }

    nextCart.push({
      id: `${orderItem.productId}-${orderItem.size}-${orderItem.color}`,
      productId: orderItem.productId,
      name: orderItem.name,
      category:
        orderItem.category || "Clothing",
      sellerId:
        orderItem.sellerId ||
        "fitfusion-seller",
      sellerName:
        orderItem.sellerName ||
        "FitFusion Seller",
      price: Number(
        orderItem.price || 0
      ),
      originalPrice: Number(
        orderItem.originalPrice ||
          orderItem.price ||
          0
      ),
      quantity: Math.min(
        MAX_CART_QUANTITY,
        Math.max(
          1,
          Number(
            orderItem.quantity || 1
          )
        )
      ),
      size: orderItem.size || "M",
      color:
        orderItem.color || "Default",
      image: orderItem.image || "",
      selected: true,
    });
  });

  localStorage.setItem(
    CART_STORAGE_KEY,
    JSON.stringify(nextCart)
  );

  window.dispatchEvent(
    new CustomEvent(
      "fitfusion-cart-updated",
      {
        detail: {
          cart: nextCart,
          quantity: nextCart.length,
        },
      }
    )
  );
}

function OrderHistoryPage() {
  const navigate = useNavigate();

  const [orders, setOrders] =
    useState(loadOrders);

  const [ratings, setRatings] =
    useState(loadRatings);

  const [activeFilter, setActiveFilter] =
    useState("All");

  const [sortOrder, setSortOrder] =
    useState("newest");

  const [notice, setNotice] =
    useState("");

  useEffect(() => {
    localStorage.setItem(
      ORDERS_STORAGE_KEY,
      JSON.stringify(orders)
    );
  }, [orders]);

  useEffect(() => {
    localStorage.setItem(
      RATINGS_STORAGE_KEY,
      JSON.stringify(ratings)
    );
  }, [ratings]);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setNotice("");
    }, 2500);

    return () =>
      window.clearTimeout(timeout);
  }, [notice]);

  const filteredOrders = useMemo(() => {
    const filtered =
      activeFilter === "All"
        ? orders
        : orders.filter(
            (order) =>
              order.status ===
              activeFilter
          );

    return [...filtered].sort(
      (firstOrder, secondOrder) => {
        const firstDate = new Date(
          firstOrder.timestamp ||
            firstOrder.placedAt
        ).getTime();

        const secondDate = new Date(
          secondOrder.timestamp ||
            secondOrder.placedAt
        ).getTime();

        if (sortOrder === "oldest") {
          return firstDate - secondDate;
        }

        return secondDate - firstDate;
      }
    );
  }, [
    orders,
    activeFilter,
    sortOrder,
  ]);

  const cartProductCount =
    readArray(CART_STORAGE_KEY).length;

  function handleBuyAgain(order) {
    const items = Array.isArray(
      order.items
    )
      ? order.items
      : [];

    if (items.length === 0) {
      setNotice(
        "This order has no products to add."
      );

      return;
    }

    addItemsToCart(items);

    setNotice(
      "Products were added to your cart."
    );

    window.setTimeout(() => {
      navigate("/shopper/cart");
    }, 500);
  }

  function handleRating(
    orderId,
    productId,
    rating
  ) {
    const ratingKey =
      `${orderId}-${productId}`;

    setRatings((currentRatings) => ({
      ...currentRatings,
      [ratingKey]: rating,
    }));

    setNotice(
      `Your ${rating}-star rating was saved.`
    );
  }

  return (
    <main className="order-history-page">
      {notice && (
        <div
          className="order-history-toast"
          role="status"
        >
          {notice}
        </div>
      )}

      <div className="order-history-toolbar">
        <div />

        <button
          type="button"
          className="order-history-cart-button"
          onClick={() =>
            navigate("/shopper/cart")
          }
          aria-label={`Open cart with ${cartProductCount} products`}
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 7H6" />
            <circle cx="10" cy="20" r="1" />
            <circle cx="18" cy="20" r="1" />
          </svg>

          <strong>
            {cartProductCount}
          </strong>
        </button>
      </div>

      <div className="order-history-content">
        <section className="order-history-intro">
          <div>
            <p>YOUR PURCHASES</p>

            <h1>Order History</h1>

            <span>
              Track your orders, view details,
              purchase products again, and rate
              delivered products.
            </span>
          </div>

          <div className="order-history-total-badge">
            <strong>{orders.length}</strong>

            <span>
              {orders.length === 1
                ? "order"
                : "orders"}
            </span>
          </div>
        </section>

        <section className="order-history-controls">
          <div className="order-history-filters">
            {[
              "All",
              "Processing",
              "To Ship",
              "Delivered",
              "Cancelled",
            ].map((filter) => (
              <button
                type="button"
                key={filter}
                className={
                  activeFilter === filter
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveFilter(filter)
                }
              >
                {filter}
              </button>
            ))}
          </div>

          <label className="order-history-sort">
            <span>Sort by</span>

            <select
              value={sortOrder}
              onChange={(event) =>
                setSortOrder(
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
            </select>
          </label>
        </section>

        {filteredOrders.length === 0 ? (
          <section className="order-history-empty">
            <div>!</div>

            <h2>No orders found</h2>

            <p>
              There are no orders matching the
              selected status.
            </p>

            <button
              type="button"
              onClick={() =>
                setActiveFilter("All")
              }
            >
              View All Orders
            </button>
          </section>
        ) : (
          <section className="order-history-list">
            {filteredOrders.map(
              (order) => {
                const items =
                  Array.isArray(
                    order.items
                  )
                    ? order.items
                    : [];

                return (
                  <article
                    className="order-history-card"
                    key={order.id}
                  >
                    <div className="order-history-card-header">
                      <div>
                        <span>
                          ORDER NUMBER
                        </span>

                        <h2>
                          #{order.id}
                        </h2>
                      </div>

                      <div className="order-history-card-header-right">
                        <div>
                          <span>
                            ORDER DATE
                          </span>

                          <strong>
                            {order.placedAt ||
                              "Date unavailable"}
                          </strong>
                        </div>

                        <span
                          className={`order-history-status ${String(
                            order.status ||
                              "Processing"
                          )
                            .toLowerCase()
                            .replaceAll(
                              " ",
                              "-"
                            )}`}
                        >
                          {order.status ||
                            "Processing"}
                        </span>
                      </div>
                    </div>

                    <div className="order-history-products">
                      {items.map(
                        (
                          item,
                          index
                        ) => {
                          const ratingKey =
                            `${order.id}-${
                              item.productId ||
                              item.id
                            }`;

                          const currentRating =
                            Number(
                              ratings[
                                ratingKey
                              ] || 0
                            );

                          return (
                            <div
                              className="order-history-product"
                              key={
                                item.id ||
                                `${item.productId}-${index}`
                              }
                            >
                              <button
                                type="button"
                                className="order-history-product-image"
                                onClick={() =>
                                  navigate(
                                    `/shopper/products/${
                                      item.productId ||
                                      item.id
                                    }`
                                  )
                                }
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
                                  <strong>
                                    {(
                                      item.name ||
                                      "Product"
                                    ).charAt(
                                      0
                                    )}
                                  </strong>
                                )}

                                <small>
                                  ×
                                  {Number(
                                    item.quantity ||
                                      1
                                  )}
                                </small>
                              </button>

                              <div className="order-history-product-copy">
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
                                  {item.name ||
                                    "Fashion Item"}
                                </button>

                                <small>
                                  Size:{" "}
                                  {item.size ||
                                    "M"}
                                </small>

                                <small>
                                  Color:{" "}
                                  {item.color ||
                                    "Default"}
                                </small>
                              </div>

                              <div className="order-history-product-price">
                                <span>
                                  Item total
                                </span>

                                <strong>
                                  {formatCurrency(
                                    Number(
                                      item.price ||
                                        0
                                    ) *
                                      Number(
                                        item.quantity ||
                                          1
                                      )
                                  )}
                                </strong>
                              </div>

                              {order.status ===
                                "Delivered" && (
                                <div className="order-history-rating">
                                  <span>
                                    Rate product
                                  </span>

                                  <div
                                    role="group"
                                    aria-label={`Rate ${item.name}`}
                                  >
                                    {[
                                      1, 2, 3, 4,
                                      5,
                                    ].map(
                                      (
                                        star
                                      ) => (
                                        <button
                                          type="button"
                                          key={
                                            star
                                          }
                                          className={
                                            star <=
                                            currentRating
                                              ? "selected"
                                              : ""
                                          }
                                          onClick={() =>
                                            handleRating(
                                              order.id,
                                              item.productId ||
                                                item.id,
                                              star
                                            )
                                          }
                                          aria-label={`${star} star rating`}
                                        >
                                          ★
                                        </button>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>

                    <div className="order-history-card-footer">
                      <div>
                        <span>
                          Order total
                        </span>

                        <strong>
                          {formatCurrency(
                            order.total ||
                              items.reduce(
                                (
                                  total,
                                  item
                                ) =>
                                  total +
                                  Number(
                                    item.price ||
                                      0
                                  ) *
                                    Number(
                                      item.quantity ||
                                        1
                                    ),
                                0
                              )
                          )}
                        </strong>
                      </div>

                      <div className="order-history-actions">
                        <button
                          type="button"
                          className="order-history-secondary-button"
                          onClick={() =>
                            navigate(
                              `/shopper/orders/${order.id}`
                            )
                          }
                        >
                          View Details
                        </button>

                        <button
                          type="button"
                          className="order-history-primary-button"
                          onClick={() =>
                            handleBuyAgain(
                              order
                            )
                          }
                        >
                          Buy Again
                        </button>
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </section>
        )}
      </div>
    </main>
  );
}

export default OrderHistoryPage;