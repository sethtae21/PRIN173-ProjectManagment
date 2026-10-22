import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  API_URL,
  cartAPI,
  catalogAPI,
  checkoutAPI,
  getCachedOrder,
} from "../services/api";
import "./css/OrderDetailsPage.css";

const ORDERS_STORAGE_KEY = "fitfusion-orders";
const CART_STORAGE_KEY = "fitfusion-cart";
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
    customer: {
      name: data.recipient_name || "",
      email: data.recipient_email || "",
      mobile: data.contact_number || "",
      address: data.shipping_address || "",
    },
    paymentMethod: data.payment_method || "Cash on Delivery",
    shippingMethod: "Standard Delivery",
    shippingFee: Number(data.shipping_fee || 0),
    total: Number(data.total_amount || 0),
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
  const address = data.customer ? data.customer.address : null;
  const addressText =
    typeof address === "string"
      ? address
      : [address?.street, address?.city, address?.province, address?.postalCode]
          .filter(Boolean)
          .join(", ");
  return {
    id: String(data.id),
    orderNumber: data.orderNumber || data.order_number || String(data.id),
    timestamp: data.timestamp || data.placedAt || "",
    placedAt: data.placedAt || formatOrderDate(data.timestamp),
    status: mapStatus(data.status),
    customer: {
      name: data.customer?.fullName || data.customer?.name || "",
      email: data.customer?.email || "",
      mobile: data.customer?.contactNumber || data.customer?.mobile || "",
      address: addressText || data.shipping_address || "",
    },
    paymentMethod: data.paymentMethod || "Cash on Delivery",
    shippingMethod: "Standard Delivery",
    shippingFee: Number(data.shippingFee || 0),
    total: Number(data.total || 0),
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

function mergeStoredIntoBackend(backendOrder, storedOrder) {
  const merged = { ...backendOrder };
  if (storedOrder) {
    merged.orderNumber = merged.orderNumber || storedOrder.orderNumber;
    merged.customer = {
      name: merged.customer.name || storedOrder.customer.name,
      email: merged.customer.email || storedOrder.customer.email,
      mobile: merged.customer.mobile || storedOrder.customer.mobile,
      address: merged.customer.address || storedOrder.customer.address,
    };
    if (!merged.total) merged.total = storedOrder.total;
    merged.items = merged.items.map((item) => {
      const match = storedOrder.items.find(
        (entry) =>
          (entry.productId && entry.productId === item.productId) ||
          (entry.name === item.name && entry.size === item.size && entry.color === item.color)
      );
      return {
        ...item,
        image: item.image || match?.image || "",
        category: item.category || match?.category || "",
        sellerName: item.sellerName || match?.sellerName || "FitFusion Seller",
      };
    });
  }
  return merged;
}

async function enrichOrderImages(order) {
  const imageCache = readObject(IMAGE_CACHE_KEY);
  let enriched = {
    ...order,
    items: order.items.map((item) => ({
      ...item,
      image: item.image || imageCache[item.productId] || "",
    })),
  };
  const missing = enriched.items.some((item) => !item.image && item.productId);
  if (missing) {
    try {
      const catalog = await catalogAPI.getAll();
      const catalogImages = {};
      (Array.isArray(catalog) ? catalog : []).forEach((entry) => {
        catalogImages[String(entry.id)] = mediaUrl(entry.front_image);
      });
      enriched = {
        ...enriched,
        items: enriched.items.map((item) =>
          !item.image && item.productId && catalogImages[item.productId]
            ? { ...item, image: catalogImages[item.productId] }
            : item
        ),
      };
    } catch (error) {
      console.warn("Order details: catalog image sync skipped →", error?.message || error);
    }
  }
  enriched.items.forEach((item) => {
    if (item.productId && item.image) imageCache[item.productId] = item.image;
  });
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
      width="34"
      height="34"
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
      className="order-details-product-image"
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
      <small>×{item.quantity}</small>
    </button>
  );
}

function OrderDetailsPage() {
  const navigate = useNavigate();
  const { orderId } = useParams();

  /* Instant first paint from memory cache or localStorage */
  const [order, setOrder] = useState(() => {
    const cachedOrder = getCachedOrder(orderId);
    if (cachedOrder) return normalizeBackendOrder(cachedOrder);
    const stored = readArray(ORDERS_STORAGE_KEY).find(
      (entry) => String(entry.id) === String(orderId)
    );
    return stored && isRealOrderId(stored.id) ? normalizeStoredOrder(stored) : null;
  });
  const [isLoading, setIsLoading] = useState(order === null);
  const [loadError, setLoadError] = useState("");
  const [syncNotice, setSyncNotice] = useState("");
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [notice, setNotice] = useState("");
  const [isBuying, setIsBuying] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const orderRef = useRef(order);

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(""), 2500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  /* Background sync with the server */
  useEffect(() => {
    let cancelled = false;
    async function syncOrder() {
      if (!orderRef.current) setIsLoading(true);
      setLoadError("");
      try {
        const data = await checkoutAPI.getOrder(orderId);
        const backendOrder = normalizeBackendOrder(data);
        const stored = readArray(ORDERS_STORAGE_KEY).find(
          (entry) => String(entry.id) === String(orderId)
        );
        let merged = mergeStoredIntoBackend(
          backendOrder,
          stored && isRealOrderId(stored.id) ? normalizeStoredOrder(stored) : null
        );
        merged = await enrichOrderImages(merged);
        if (cancelled) return;
        orderRef.current = merged;
        setOrder(merged);
        setIsLoading(false);
        setSyncNotice("");
      } catch (error) {
        if (cancelled) return;
        console.warn("Order details: server sync skipped →", error?.message || error);
        setIsLoading(false);
        if (orderRef.current) {
          setSyncNotice("Showing your saved copy (server unreachable right now).");
        } else {
          setLoadError("We couldn't load this order from the server or from your saved orders.");
        }
      }
    }
    syncOrder();
    return () => {
      cancelled = true;
    };
  }, [orderId, retryAttempt]);

  const originalSubtotal = useMemo(
    () =>
      order
        ? order.items.reduce(
            (total, item) =>
              total + Number(item.originalPrice || item.price || 0) * Number(item.quantity || 1),
            0
          )
        : 0,
    [order]
  );
  const discountedSubtotal = useMemo(
    () =>
      order
        ? order.items.reduce(
            (total, item) => total + Number(item.price || 0) * Number(item.quantity || 1),
            0
          )
        : 0,
    [order]
  );
  const productDiscount = Math.max(0, originalSubtotal - discountedSubtotal);
  const shippingFee = order ? Number(order.shippingFee || 0) : 0;
  const total = order ? order.total || discountedSubtotal + shippingFee : 0;
  const canCancelOrder = order ? order.status === "Processing" || order.status === "To Ship" : false;

  function showNotice(message) {
    setNotice(message);
  }

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

  async function buyItems(items) {
    const purchasable = (items || []).filter((item) => item.productId);
    if (purchasable.length === 0) {
      showNotice("These products are no longer available in the catalog.");
      return;
    }
    setIsBuying(true);
    try {
      for (const item of purchasable) {
        await cartAPI.addItem(item.productId, item.quantity);
      }
      window.dispatchEvent(new Event("fitfusion-cart-updated"));
      showNotice(
        purchasable.length === 1
          ? `${purchasable[0].name} was added to your cart.`
          : "All products were added to your cart."
      );
      window.setTimeout(() => navigate("/shopper/cart"), 500);
    } catch (error) {
      console.warn("Buy again: server unavailable, using local cart →", error?.message || error);
      addLocalCart(purchasable);
      showNotice("All products were added to your cart.");
      window.setTimeout(() => navigate("/shopper/cart"), 500);
    } finally {
      setIsBuying(false);
    }
  }

  function handleCancelOrder() {
    setOrder((current) => (current ? { ...current, status: "Cancelled" } : current));
    const stored = readArray(ORDERS_STORAGE_KEY);
    const updated = stored.map((entry) =>
      String(entry.id) === String(orderId) ? { ...entry, status: "Cancelled" } : entry
    );
    try {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      /* non-critical */
    }
    setShowCancelModal(false);
    showNotice("Your order has been cancelled.");
  }

  if (isLoading) {
    return (
      <main className="order-details-page">
        <div className="order-details-container">
          <section className="order-details-heading">
            <div>
              <p className="order-details-eyebrow">ORDER DETAILS</p>
              <h1>Loading order…</h1>
              <p>Fetching your order from the server.</p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (loadError || !order) {
    return (
      <main className="order-details-page">
        <div className="order-details-container">
          <div className="order-details-back-row">
            <Link to="/shopper/orders" className="order-details-back-link">
              ← Return to Order History
            </Link>
          </div>
          <section className="order-details-heading">
            <div>
              <p className="order-details-eyebrow">ORDER DETAILS</p>
              <h1>Order unavailable</h1>
              <p>{loadError || "This order does not exist."}</p>
            </div>
          </section>
          <section className="order-details-products-card">
            <div className="order-details-products-heading">
              <div>
                <p>NEED HELP?</p>
                <h2>Try again</h2>
              </div>
              <button
                type="button"
                className="order-details-outline-button"
                onClick={() => setRetryAttempt((value) => value + 1)}
              >
                Retry
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="order-details-page">
      {notice && (
        <div className="order-details-toast" role="status">
          {notice}
        </div>
      )}
      {syncNotice && (
        <div
          className="order-details-toast"
          role="status"
          style={{ display: "flex", alignItems: "center", gap: 12, top: 70 }}
        >
          <span>{syncNotice}</span>
          <button
            type="button"
            onClick={() => setRetryAttempt((value) => value + 1)}
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
      <div className="order-details-container">
        <div className="order-details-back-row">
          <Link to="/shopper/orders" className="order-details-back-link">
            ← Return to Order History
          </Link>
        </div>
        <section className="order-details-heading">
          <div>
            <p className="order-details-eyebrow">ORDER DETAILS</p>
            <h1>Order #{order.orderNumber || order.id}</h1>
            <p>Placed on {order.placedAt}</p>
          </div>
          <span
            className={`order-details-status ${order.status.toLowerCase().replaceAll(" ", "-")}`}
          >
            {order.status}
          </span>
        </section>
        <section className="order-details-information">
          <article>
            <span>DELIVERY INFORMATION</span>
            <strong>{order.customer.name || "Registered Shopper"}</strong>
            <p>{order.customer.mobile || "No contact number"}</p>
            <p>{order.customer.address || "No delivery address"}</p>
          </article>
          <article>
            <span>PAYMENT METHOD</span>
            <strong>{order.paymentMethod}</strong>
            <p>No real payment is processed in this prototype.</p>
          </article>
          <article>
            <span>SHIPPING METHOD</span>
            <strong>{order.shippingMethod}</strong>
            <p>Your order will be prepared by the seller.</p>
          </article>
        </section>
        <section className="order-details-products-card">
          <div className="order-details-products-heading">
            <div>
              <p>ORDERED PRODUCTS</p>
              <h2>
                {order.items.length} {order.items.length === 1 ? "product" : "products"}
              </h2>
            </div>
            <button
              type="button"
              className="order-details-outline-button"
              onClick={() => buyItems(order.items)}
              disabled={isBuying}
            >
              Buy All Again
            </button>
          </div>
          <div className="order-details-products-list">
            {order.items.map((item) => (
              <article
                className="order-details-product-row"
                key={`${item.productId || item.id}-${item.size}-${item.color}`}
              >
                <ProductImage item={item} onOpen={() => openProduct(item)} />
                <div className="order-details-product-information">
                  <span className="order-details-seller-link">{item.sellerName}</span>
                  <button
                    type="button"
                    className="order-details-product-name"
                    onClick={() => openProduct(item)}
                  >
                    {item.name}
                  </button>
                  {item.category ? <p>{item.category}</p> : null}
                  <div className="order-details-product-options">
                    <span>Size: {item.size}</span>
                    <span>Color: {item.color}</span>
                    <span>Quantity: {item.quantity}</span>
                  </div>
                </div>
                <div className="order-details-product-price">
                  <span>Price</span>
                  <strong>{formatCurrency(item.price)}</strong>
                  <small>Item total: {formatCurrency(item.price * item.quantity)}</small>
                </div>
                <div className="order-details-product-actions">
                  {item.productId ? (
                    <button
                      type="button"
                      className="order-details-outline-button"
                      onClick={() => openProduct(item)}
                    >
                      View Product
                    </button>
                  ) : (
                    <button type="button" className="order-details-outline-button" disabled>
                      Unavailable
                    </button>
                  )}
                  <button
                    type="button"
                    className="order-details-dark-button"
                    onClick={() => buyItems([item])}
                    disabled={isBuying || !item.productId}
                  >
                    Buy Again
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="order-details-bottom-grid">
          <article className="order-details-payment-card">
            <div className="order-details-payment-row">
              <span>Subtotal</span>
              <strong>{formatCurrency(originalSubtotal)}</strong>
            </div>
            <div className="order-details-payment-row discount">
              <span>Product Discount</span>
              <strong>−{formatCurrency(productDiscount)}</strong>
            </div>
            <div className="order-details-payment-row">
              <span>Shipping Fee</span>
              <strong>{shippingFee === 0 ? "FREE" : formatCurrency(shippingFee)}</strong>
            </div>
            <div className="order-details-payment-total">
              <span>Total</span>
              <strong>{formatCurrency(total)}</strong>
            </div>
          </article>
          <article className="order-details-actions-card">
            <p>ORDER ACTIONS</p>
            {canCancelOrder && (
              <button
                type="button"
                className="order-details-cancel-button"
                onClick={() => setShowCancelModal(true)}
              >
                Cancel Order
              </button>
            )}
            <button
              type="button"
              className="order-details-buy-all-button"
              onClick={() => buyItems(order.items)}
              disabled={isBuying}
            >
              Buy Again
            </button>
            <Link to="/shopper/orders" className="order-details-history-button">
              Return to Order History
            </Link>
          </article>
        </section>
      </div>
      {showCancelModal && (
        <div
          className="order-details-modal-backdrop"
          role="presentation"
          onMouseDown={() => setShowCancelModal(false)}
        >
          <section
            className="order-details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-order-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <p>CONFIRM ORDER CANCELLATION</p>
            <h2 id="cancel-order-title">Cancel this order?</h2>
            <span>
              This will cancel order #{order.orderNumber || order.id}. You may purchase the
              products again later.
            </span>
            <div className="order-details-modal-actions">
              <button
                type="button"
                className="order-details-outline-button"
                onClick={() => setShowCancelModal(false)}
              >
                Keep Order
              </button>
              <button
                type="button"
                className="order-details-cancel-button"
                onClick={handleCancelOrder}
              >
                Confirm Cancellation
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default OrderDetailsPage;