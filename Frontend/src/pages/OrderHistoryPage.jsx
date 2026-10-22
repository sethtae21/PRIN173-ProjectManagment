import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  API_URL,
  cartAPI,
  catalogAPI,
  checkoutAPI,
  getCachedOrders,
} from "../services/api";
import "./css/OrderHistoryPage.css";

const ORDERS_STORAGE_KEY = "fitfusion-orders";
const CART_STORAGE_KEY = "fitfusion-cart";
const RATINGS_STORAGE_KEY = "fitfusion-product-ratings";
const IMAGE_CACHE_KEY = "fitfusion-order-image-map";
const MAX_CART_QUANTITY = 10;

function formatCurrency(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(Number(value || 0));
}

function mediaUrl(path) {
  if (!path) return "";
  const value = String(path);
  if (value.startsWith("http")) return value;
  return `${API_URL}${value.startsWith("/") ? "" : "/"}${value}`;
}

function readArray(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readObject(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function isRealOrderId(id) {
  return /^[0-9a-fA-F]{24}$/.test(String(id || ""));
}

function mapStatus(status) {
  const value = String(status || "").toLowerCase();
  if (value === "cancelled") return "Cancelled";
  if (value === "delivered") return "Delivered";
  if (value === "to_ship" || value === "to ship") return "To Ship";
  return "Processing";
}

function formatOrderDate(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}

function normalizeBackendOrder(data) {
  return {
    id: String(data.id),
    orderNumber: data.order_number || String(data.id),
    timestamp: data.created_at || "",
    placedAt: formatOrderDate(data.created_at),
    status: mapStatus(data.status),
    total: Number(data.total_amount || 0),
    shippingFee: Number(data.shipping_fee || 0),
    items: (Array.isArray(data.items) ? data.items : []).map((item, index) => ({
      id: String(item.id || `${item.catalog_item}-${index}`),
      productId: item.catalog_item ? String(item.catalog_item) : "",
      name: item.item_name || "Fashion Item",
      category: "",
      sellerName: item.store_name || "FitFusion Seller",
      price: Number(item.unit_price || 0),
      originalPrice: Number(item.unit_price || 0),
      quantity: Number(item.quantity || 1),
      size: item.size || "M",
      color: item.color || "Default",
      image: "",
    })),
  };
}

function normalizeStoredOrder(data) {
  return {
    id: String(data.id),
    orderNumber: data.orderNumber || data.order_number || String(data.id),
    timestamp: data.timestamp || data.placedAt || "",
    placedAt: data.placedAt || formatOrderDate(data.timestamp),
    status: mapStatus(data.status),
    total: Number(data.total || 0),
    shippingFee: Number(data.shippingFee || 0),
    customer: data.customer || null,
    paymentMethod: data.paymentMethod || "Cash on Delivery",
    items: (Array.isArray(data.items) ? data.items : []).map((item, index) => ({
      id: String(item.id || `${item.productId}-${index}`),
      productId: item.productId ? String(item.productId) : "",
      name: item.name || item.item_name || "Fashion Item",
      category: item.category || "",
      sellerName: item.sellerName || item.store_name || "FitFusion Seller",
      price: Number(item.price || 0),
      originalPrice: Number(item.originalPrice || item.price || 0),
      quantity: Number(item.quantity || 1),
      size: item.size || "M",
      color: item.color || "Default",
      image: item.image || item.imageUrl || "",
    })),
  };
}

function mergeOrderLists(primary, secondary) {
  const merged = [...primary];
  secondary.forEach((order) => {
    if (!merged.some((entry) => entry.id === order.id)) merged.push(order);
  });
  return merged;
}

/* Instant first paint: memory cache (this session) + localStorage (last visit) */
function initialOrders() {
  const cached = getCachedOrders().map(normalizeBackendOrder);
  const stored = readArray(ORDERS_STORAGE_KEY)
    .filter((entry) => isRealOrderId(entry?.id))
    .map(normalizeStoredOrder);
  return mergeOrderLists(cached, stored);
}

async function enrichImages(orderList) {
  const imageCache = readObject(IMAGE_CACHE_KEY);
  let enriched = orderList.map((order) => ({
    ...order,
    items: order.items.map((item) => ({
      ...item,
      image: item.image || imageCache[item.productId] || "",
    })),
  }));
  const missing = enriched.some((order) =>
    order.items.some((item) => !item.image && item.productId)
  );
  if (missing) {
    try {
      const catalog = await catalogAPI.getAll();
      const catalogImages = {};
      (Array.isArray(catalog) ? catalog : []).forEach((entry) => {
        catalogImages[String(entry.id)] = mediaUrl(entry.front_image);
      });
      enriched = enriched.map((order) => ({
        ...order,
        items: order.items.map((item) =>
          !item.image && item.productId && catalogImages[item.productId]
            ? { ...item, image: catalogImages[item.productId] }
            : item
        ),
      }));
    } catch (error) {
      console.warn("Order history: catalog image sync skipped →", error?.message || error);
    }
  }
  enriched.forEach((order) =>
    order.items.forEach((item) => {
      if (item.productId && item.image) imageCache[item.productId] = item.image;
    })
  );
  try {
    localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(imageCache));
  } catch {
    /* non-critical */
  }
  return enriched;
}

function HangerIcon() {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      width="30"
      height="30"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13.5 8.5a3 3 0 1 1 4.7 2.5L17 12v2l11 8H4l11-8" />
    </svg>
  );
}

function ProductImage({ item, onOpen }) {
  return (
    <button
      type="button"
      className="order-history-product-image"
      onClick={onOpen}
      aria-label={`View ${item.name}`}
    >
      {item.image ? (
        <>
          <img
            src={item.image}
            alt={item.name}
            onError={(event) => {
              event.currentTarget.style.display = "none";
              const fallback = event.currentTarget.nextElementSibling;
              if (fallback) fallback.style.display = "grid";
            }}
          />
          <strong aria-hidden="true" style={{ display: "none" }}>
            {(item.name || "P").charAt(0)}
          </strong>
        </>
      ) : (
        <HangerIcon />
      )}
      <small>×{Number(item.quantity || 1)}</small>
    </button>
  );
}

function OrderHistoryPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState(initialOrders);
  const [syncInFlight, setSyncInFlight] = useState(true);
  const [syncNotice, setSyncNotice] = useState("");
  const [syncAttempt, setSyncAttempt] = useState(0);
  const [ratings, setRatings] = useState(() => readObject(RATINGS_STORAGE_KEY));
  const [activeFilter, setActiveFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState("newest");
  const [notice, setNotice] = useState("");
  const [isBuying, setIsBuying] = useState(false);
  const [cartProductCount, setCartProductCount] = useState(
    () => readArray(CART_STORAGE_KEY).length
  );
  const ordersRef = useRef(orders);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(""), 2500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    localStorage.setItem(RATINGS_STORAGE_KEY, JSON.stringify(ratings));
  }, [ratings]);

  useEffect(() => {
    function updateCartCount() {
      setCartProductCount(readArray(CART_STORAGE_KEY).length);
    }
    window.addEventListener("fitfusion-cart-updated", updateCartCount);
    window.addEventListener("storage", updateCartCount);
    return () => {
      window.removeEventListener("fitfusion-cart-updated", updateCartCount);
      window.removeEventListener("storage", updateCartCount);
    };
  }, []);

  /* Background sync: never blocks the first paint */
  useEffect(() => {
    let cancelled = false;
    async function syncFromServer() {
      setSyncInFlight(true);
      try {
        const data = await checkoutAPI.getOrders();
        const backendOrders = (Array.isArray(data) ? data : []).map(normalizeBackendOrder);
        if (cancelled) return;
        const merged = mergeOrderLists(backendOrders, ordersRef.current);
        const enriched = await enrichImages(merged);
        if (cancelled) return;
        ordersRef.current = enriched;
        setOrders(enriched);
        setSyncNotice("");
        try {
          localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(enriched));
        } catch {
          /* non-critical */
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Order history: server sync skipped →", error?.message || error);
          setSyncNotice("Showing your saved orders (server unreachable right now).");
        }
      } finally {
        if (!cancelled) setSyncInFlight(false);
      }
    }
    syncFromServer();
    return () => {
      cancelled = true;
    };
  }, [syncAttempt]);

  const filteredOrders = useMemo(() => {
    const filtered =
      activeFilter === "All" ? orders : orders.filter((order) => order.status === activeFilter);
    return [...filtered].sort((firstOrder, secondOrder) => {
      const firstDate = new Date(firstOrder.timestamp || firstOrder.placedAt).getTime();
      const secondDate = new Date(secondOrder.timestamp || secondOrder.placedAt).getTime();
      if (sortOrder === "oldest") return firstDate - secondDate;
      return secondDate - firstDate;
    });
  }, [orders, activeFilter, sortOrder]);

  function openProduct(item) {
    if (item.productId) navigate(`/shopper/products/${item.productId}`);
    else navigate("/shopper/catalog");
  }

  function addLocalCart(items) {
    const cart = readArray(CART_STORAGE_KEY);
    const nextCart = [...cart];
    items.forEach((orderItem) => {
      const existingIndex = nextCart.findIndex(
        (cartItem) =>
          String(cartItem.productId ?? cartItem.id) === String(orderItem.productId) &&
          cartItem.size === orderItem.size &&
          cartItem.color === orderItem.color
      );
      if (existingIndex >= 0) {
        nextCart[existingIndex] = {
          ...nextCart[existingIndex],
          quantity: Math.min(
            MAX_CART_QUANTITY,
            Number(nextCart[existingIndex].quantity || 1) + Number(orderItem.quantity || 1)
          ),
          selected: true,
        };
        return;
      }
      nextCart.push({
        id: `${orderItem.productId}-${orderItem.size}-${orderItem.color}`,
        productId: orderItem.productId,
        name: orderItem.name,
        category: orderItem.category || "Clothing",
        sellerId: orderItem.sellerId || "fitfusion-seller",
        sellerName: orderItem.sellerName || "FitFusion Seller",
        price: Number(orderItem.price || 0),
        originalPrice: Number(orderItem.originalPrice || orderItem.price || 0),
        quantity: Math.min(MAX_CART_QUANTITY, Math.max(1, Number(orderItem.quantity || 1))),
        size: orderItem.size || "M",
        color: orderItem.color || "Default",
        image: orderItem.image || "",
        selected: true,
      });
    });
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextCart));
    window.dispatchEvent(
      new CustomEvent("fitfusion-cart-updated", {
        detail: { cart: nextCart, quantity: nextCart.length },
      })
    );
  }

  async function handleBuyAgain(order) {
    const purchasable = (order.items || []).filter((item) => item.productId);
    if (purchasable.length === 0) {
      setNotice("This order has no products that can be added.");
      return;
    }
    setIsBuying(true);
    try {
      for (const item of purchasable) {
        await cartAPI.addItem(item.productId, item.quantity);
      }
      window.dispatchEvent(new Event("fitfusion-cart-updated"));
      setNotice("Products were added to your cart.");
      window.setTimeout(() => navigate("/shopper/cart"), 500);
    } catch (error) {
      console.warn("Buy again: server unavailable, using local cart →", error?.message || error);
      addLocalCart(purchasable);
      setNotice("Products were added to your cart.");
      window.setTimeout(() => navigate("/shopper/cart"), 500);
    } finally {
      setIsBuying(false);
    }
  }

  function handleRating(orderId, productId, rating) {
    const ratingKey = `${orderId}-${productId}`;
    setRatings((currentRatings) => ({ ...currentRatings, [ratingKey]: rating }));
    setNotice(`Your ${rating}-star rating was saved.`);
  }

  const showLoadingCard = orders.length === 0 && syncInFlight;

  return (
    <main className="order-history-page">
      {notice && (
        <div className="order-history-toast" role="status">
          {notice}
        </div>
      )}
      {syncNotice && (
        <div
          className="order-history-toast"
          role="status"
          style={{ display: "flex", alignItems: "center", gap: 12 }}
        >
          <span>{syncNotice}</span>
          <button
            type="button"
            onClick={() => setSyncAttempt((value) => value + 1)}
            style={{
              background: "#fffdf9",
              border: "1px solid #b57e20",
              borderRadius: 6,
              padding: "4px 10px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}
      <div className="order-history-toolbar">
        <div />
        <button
          type="button"
          className="order-history-cart-button"
          onClick={() => navigate("/shopper/cart")}
          aria-label={`Open cart with ${cartProductCount} products`}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 7H6" />
            <circle cx="10" cy="20" r="1" />
            <circle cx="18" cy="20" r="1" />
          </svg>
          <strong>{cartProductCount}</strong>
        </button>
      </div>
      <div className="order-history-content">
        <section className="order-history-intro">
          <div>
            <p>YOUR PURCHASES</p>
            <h1>Order History</h1>
            <span>
              Track your orders, view details, purchase products again, and rate delivered
              products.
            </span>
          </div>
          <div className="order-history-total-badge">
            <strong>{orders.length}</strong>
            <span>{orders.length === 1 ? "order" : "orders"}</span>
          </div>
        </section>
        <section className="order-history-controls">
          <div className="order-history-filters">
            {["All", "Processing", "To Ship", "Delivered", "Cancelled"].map((filter) => (
              <button
                type="button"
                key={filter}
                className={activeFilter === filter ? "active" : ""}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
          <label className="order-history-sort">
            <span>Sort by</span>
            <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </label>
        </section>
        {showLoadingCard ? (
          <section className="order-history-empty">
            <div>…</div>
            <h2>Loading your orders</h2>
            <p>Fetching your purchase history from the server.</p>
          </section>
        ) : filteredOrders.length === 0 ? (
          <section className="order-history-empty">
            <div>!</div>
            <h2>{orders.length === 0 ? "No orders yet" : "No orders found"}</h2>
            <p>
              {orders.length === 0
                ? "Complete a checkout to see your orders here."
                : "There are no orders matching the selected status."}
            </p>
            <button
              type="button"
              onClick={() =>
                orders.length === 0 ? navigate("/shopper/catalog") : setActiveFilter("All")
              }
            >
              {orders.length === 0 ? "Browse Catalog" : "View All Orders"}
            </button>
          </section>
        ) : (
          <section className="order-history-list">
            {filteredOrders.map((order) => {
              const items = Array.isArray(order.items) ? order.items : [];
              const orderTotal =
                order.total ||
                items.reduce(
                  (total, item) => total + Number(item.price || 0) * Number(item.quantity || 1),
                  0
                );
              return (
                <article className="order-history-card" key={order.id}>
                  <div className="order-history-card-header">
                    <div>
                      <span>ORDER NUMBER</span>
                      <h2>#{order.orderNumber || order.id}</h2>
                    </div>
                    <div className="order-history-card-header-right">
                      <div>
                        <span>ORDER DATE</span>
                        <strong>{order.placedAt || "Date unavailable"}</strong>
                      </div>
                      <span
                        className={`order-history-status ${String(order.status || "Processing")
                          .toLowerCase()
                          .replaceAll(" ", "-")}`}
                      >
                        {order.status || "Processing"}
                      </span>
                    </div>
                  </div>
                  <div className="order-history-products">
                    {items.map((item, index) => {
                      const ratingKey = `${order.id}-${item.productId || item.id}`;
                      const currentRating = Number(ratings[ratingKey] || 0);
                      return (
                        <div
                          className="order-history-product"
                          key={item.id || `${item.productId}-${index}`}
                        >
                          <ProductImage item={item} onOpen={() => openProduct(item)} />
                          <div className="order-history-product-copy">
                            <span>{item.sellerName || "FitFusion Seller"}</span>
                            <button type="button" onClick={() => openProduct(item)}>
                              {item.name || "Fashion Item"}
                            </button>
                            <small>Size: {item.size || "M"}</small>
                            <small>Color: {item.color || "Default"}</small>
                          </div>
                          <div className="order-history-product-price">
                            <span>Item total</span>
                            <strong>
                              {formatCurrency(Number(item.price || 0) * Number(item.quantity || 1))}
                            </strong>
                          </div>
                          {order.status !== "Cancelled" && item.productId && (
                            <div className="order-history-rating">
                              <span>Rate product</span>
                              <div role="group" aria-label={`Rate ${item.name}`}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    type="button"
                                    key={star}
                                    className={star <= currentRating ? "selected" : ""}
                                    onClick={() => handleRating(order.id, item.productId, star)}
                                    aria-label={`${star} star rating`}
                                  >
                                    ★
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="order-history-card-footer">
                    <div>
                      <span>Order total</span>
                      <strong>{formatCurrency(orderTotal)}</strong>
                    </div>
                    <div className="order-history-actions">
                      <button
                        type="button"
                        className="order-history-secondary-button"
                        onClick={() => navigate(`/shopper/orders/${order.id}`)}
                      >
                        View Details
                      </button>
                      <button
                        type="button"
                        className="order-history-primary-button"
                        onClick={() => handleBuyAgain(order)}
                        disabled={isBuying}
                      >
                        Buy Again
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

export default OrderHistoryPage;