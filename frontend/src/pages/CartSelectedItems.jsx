import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cartAPI, getCachedCart, API_URL } from "../services/api";
import { useAlphaCrop } from "../hooks/useAlphaCrop";
import "./css/CartSelectedItems.css";

// Footwear permanently removed: the "Everyday Sneakers" demo entry is gone.
const DEFAULT_ITEMS = [
  {
    id: "equipped-linen-shirt",
    name: "Linen Shirt",
    category: "Tops",
    seller: "Aurelia Studio",
    color: "Beige",
    colorCode: "#e5d1aa",
    size: "M",
    price: 750,
  },
  {
    id: "equipped-straight-pants",
    name: "Straight Pants",
    category: "Bottoms",
    seller: "Noir & Thread",
    color: "Charcoal",
    colorCode: "#c9c0b4",
    size: "M",
    price: 1100,
  },
  {
    id: "equipped-outerwear",
    name: "Lightweight Outerwear",
    category: "Outerwear",
    seller: "Atelier Four",
    color: "Taupe",
    colorCode: "#8d8173",
    size: "M",
    price: 900,
  },
];

function readEquippedItems() {
  try {
    const storedValue = localStorage.getItem("fitfusion-selected-items");

    if (!storedValue) return DEFAULT_ITEMS;

    const parsedValue = JSON.parse(storedValue);

    if (!Array.isArray(parsedValue) || parsedValue.length === 0) {
      return DEFAULT_ITEMS;
    }

    return parsedValue.map((item, index) => ({
      id: item.id || `equipped-item-${index}`,
      name: item.name || "Clothing Item",
      category: item.category || "Clothing",
      seller:
        item.seller ||
        item.store ||
        item.store_name ||
        "FitFusion Seller",
      color: item.color || item.selectedColor || "Default",
      colorCode: item.colorCode || "#c89a43",
      size: item.size || "",
      price: Number(item.price) || 0,
      image:
        item.image ||
        item.front_image ||
        item.imageUrl ||
        item.frontImageUrl ||
        "",
    }));
  } catch {
    return DEFAULT_ITEMS;
  }
}

function formatPrice(price) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(price) || 0);
}

function mediaUrl(path) {
  if (!path) return null;

  const value = String(path);

  if (/^(https?:|blob:|data:)/i.test(value)) return value;

  return `${API_URL}${value.startsWith("/") ? "" : "/"}${value}`;
}

function computeCartCount(cart) {
  if (Array.isArray(cart?.items)) {
    return cart.items.reduce(
      (sum, item) => sum + Math.max(0, Number(item.quantity) || 0),
      0
    );
  }

  const count = Number(cart?.item_count);
  return Number.isFinite(count) ? Math.max(0, count) : null;
}

function isCatalogObjectId(value) {
  return /^[0-9a-fA-F]{24}$/.test(String(value ?? ""));
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function fetchCartFresh(attempts = 3) {
  let lastError;

  for (let index = 0; index < attempts; index += 1) {
    try {
      return await getCachedCart(true);
    } catch (error) {
      lastError = error;

      if (index < attempts - 1) {
        await sleep(300 * (index + 1));
      }
    }
  }

  throw lastError;
}

function EquippedPreview({ src, alt, colorCode }) {
  const [failed, setFailed] = useState(false);
  const cropped = useAlphaCrop(failed ? null : src);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className="equipped-product-image"
        style={{ "--product-color": colorCode }}
        aria-hidden="true"
      >
        <div className="product-shape" />
      </div>
    );
  }

  return (
    <div className="equipped-product-image equipped-product-image--photo">
      <img
        src={cropped || src}
        alt={alt}
        className="equipped-product-photo"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function CartSelectedItems() {
  const navigate = useNavigate();

  const [items, setItems] = useState(() =>
    readEquippedItems().map((item) => ({
      ...item,
      selected: true,
      quantity: 1,
    }))
  );

  const [notification, setNotification] = useState("");
  const [pageError, setPageError] = useState("");
  const [itemsAdded, setItemsAdded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [cartCount, setCartCount] = useState(null);
  const [isLoadingCart, setIsLoadingCart] = useState(true);

  const aliveRef = useRef(false);
  const addingRef = useRef(false);
  const cartRevisionRef = useRef(0);

  useEffect(() => {
    aliveRef.current = true;

    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const revision = cartRevisionRef.current;

    async function loadCart() {
      try {
        const cart = await fetchCartFresh();

        if (active && cartRevisionRef.current === revision) {
          setCartCount(computeCartCount(cart));
        }
      } catch (error) {
        console.error("Failed to load cart count:", error);
      } finally {
        if (active) setIsLoadingCart(false);
      }
    }

    loadCart();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!notification) return undefined;

    const timer = window.setTimeout(() => setNotification(""), 3000);

    return () => window.clearTimeout(timer);
  }, [notification]);

  const selectedItems = useMemo(
    () => items.filter((item) => item.selected),
    [items]
  );

  const allSelected =
    items.length > 0 && selectedItems.length === items.length;

  const totalQuantity = selectedItems.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const subtotal = selectedItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  function resetFeedback() {
    setPageError("");
    setNotification("");
    setItemsAdded(false);
  }

  function toggleItem(itemId) {
    if (addingRef.current) return;

    resetFeedback();

    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId
          ? { ...item, selected: !item.selected }
          : item
      )
    );
  }

  function toggleSelectAll() {
    if (addingRef.current) return;

    resetFeedback();

    setItems((currentItems) =>
      currentItems.map((item) => ({
        ...item,
        selected: !allSelected,
      }))
    );
  }

  function changeQuantity(itemId, difference) {
    if (addingRef.current) return;

    resetFeedback();

    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity: Math.min(
                10,
                Math.max(1, item.quantity + difference)
              ),
            }
          : item
      )
    );
  }

  async function addSelectedItemsToCart() {
    if (addingRef.current) return;

    setPageError("");
    setNotification("");
    setItemsAdded(false);

    if (selectedItems.length === 0) {
      setPageError(
        "Select at least one equipped product before adding items to your cart."
      );
      return;
    }

    const invalidItems = selectedItems.filter(
      (item) => !isCatalogObjectId(item.id)
    );

    if (invalidItems.length > 0) {
      setPageError(
        `These products do not have valid catalog IDs: ${invalidItems
          .map((item) => item.name)
          .join(", ")}. Return to the Fitting Studio and select catalog products.`
      );
      return;
    }

    const invalidQuantity = selectedItems.some(
      (item) =>
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 10
    );

    if (invalidQuantity) {
      setPageError("Each quantity must be a whole number from 1 to 10.");
      return;
    }

    addingRef.current = true;
    cartRevisionRef.current += 1;
    setIsAdding(true);

    try {
      const results = await Promise.allSettled(
        selectedItems.map((item) =>
          cartAPI.add(item.id, item.quantity)
        )
      );

      if (!aliveRef.current) return;

      const successes = [];
      const failures = [];

      results.forEach((result, index) => {
        const item = selectedItems[index];

        if (result.status === "fulfilled") {
          successes.push({ item, cart: result.value });
        } else {
          failures.push({ item, error: result.reason });
        }
      });

      const responseCounts = successes
        .map(({ cart }) => computeCartCount(cart))
        .filter((count) => count !== null);

      if (responseCounts.length > 0) {
        setCartCount(Math.max(...responseCounts));
      }

      if (successes.length > 0) {
        window.dispatchEvent(new Event("fitfusion-cart-updated"));
      }

      if (failures.length === 0) {
        setItemsAdded(true);
        setNotification(
          `${totalQuantity} ${
            totalQuantity === 1 ? "item was" : "items were"
          } added to your cart.`
        );
      } else {
        const failedNames = failures
          .map(({ item }) => item.name)
          .join(", ");

        const reason =
          failures[0]?.error?.message || "The request failed.";

        setPageError(
          `${successes.length} of ${selectedItems.length} selected products added. ` +
            `Could not confirm adding: ${failedNames}. ${reason} ` +
            "Check your cart before retrying."
        );

        // Keep confirmed additions out of the next retry.
        const successfulIds = new Set(
          successes.map(({ item }) => item.id)
        );

        setItems((currentItems) =>
          currentItems.map((item) =>
            successfulIds.has(item.id)
              ? { ...item, selected: false }
              : item
          )
        );
      }

      try {
        const freshCart = await fetchCartFresh();
        const freshCount = computeCartCount(freshCart);

        if (aliveRef.current && freshCount !== null) {
          setCartCount(freshCount);
        }
      } catch (error) {
        console.error("Failed to refresh cart count:", error);
        // Preserve the count from confirmed add responses.
      }
    } catch (error) {
      console.error("Failed to add items to cart:", error);

      if (aliveRef.current) {
        setPageError(
          "We couldn't confirm the cart update. Open your cart before retrying."
        );
      }
    } finally {
      addingRef.current = false;

      if (aliveRef.current) {
        setIsAdding(false);
      }
    }
  }

  function openCart() {
    navigate("/shopper/cart");
  }

  return (
    <div className="select-items-page">
      <div className="select-items-content">
        <header className="select-items-header">
          <div>
            <p className="select-items-eyebrow">OUTFIT TO CART</p>
            <h1>Select items for cart</h1>
            <p className="select-items-header-description">
              Review each equipped product, size, and quantity before
              adding it to your cart.
            </p>
          </div>

          <div className="select-header-actions">
            <button
              className="select-header-cart"
              type="button"
              onClick={openCart}
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 3h2l2.4 12h11.2L21 7H6" />
                <circle cx="9" cy="20" r="1" />
                <circle cx="18" cy="20" r="1" />
              </svg>

              <span>Cart</span>
              <strong>
                {isLoadingCart ? "…" : cartCount ?? "—"}
              </strong>
            </button>
          </div>
        </header>

        <main className="select-items-main">
          <section className="select-items-introduction">
            <div>
              <h2>Select equipped products</h2>
              <p>
                Each selected product will be added as an individual
                cart item from its respective seller.
              </p>
            </div>

            <button
              className="select-all-button"
              type="button"
              onClick={toggleSelectAll}
              aria-pressed={allSelected}
              disabled={isAdding}
            >
              <span
                className={`custom-checkbox ${
                  allSelected ? "checked" : ""
                }`}
                aria-hidden="true"
              >
                {allSelected ? "✓" : ""}
              </span>

              {allSelected
                ? `Unselect All (${items.length})`
                : `Select All (${items.length})`}
            </button>
          </section>

          <div className="select-items-layout">
            <section
              className="equipped-products-list"
              aria-label="Equipped products"
            >
              {items.map((item) => (
                <article
                  className={`equipped-product-card ${
                    item.selected ? "product-selected" : ""
                  }`}
                  key={item.id}
                >
                  <button
                    className={`product-checkbox ${
                      item.selected ? "checked" : ""
                    }`}
                    type="button"
                    aria-label={
                      item.selected
                        ? `Unselect ${item.name}`
                        : `Select ${item.name}`
                    }
                    aria-pressed={item.selected}
                    onClick={() => toggleItem(item.id)}
                    disabled={isAdding}
                  >
                    {item.selected ? "✓" : ""}
                  </button>

                  <EquippedPreview
                    key={`${item.id}-${item.image || ""}`}
                    src={mediaUrl(item.image)}
                    alt={item.name}
                    colorCode={item.colorCode}
                  />

                  <div className="equipped-product-information">
                    <h3>{item.name}</h3>
                    <p>{item.seller}</p>

                    {(item.size || item.color) && (
                      <small className="equipped-product-size">
                        {item.size ? `Size ${item.size}` : ""}
                        {item.size && item.color ? " • " : ""}
                        {item.color || ""}
                      </small>
                    )}

                    <div className="product-controls">
                      <div className="quantity-field">
                        <span>QTY</span>

                        <div className="quantity-control">
                          <button
                            type="button"
                            disabled={
                              isAdding ||
                              !item.selected ||
                              item.quantity <= 1
                            }
                            aria-label={`Decrease quantity for ${item.name}`}
                            onClick={() => changeQuantity(item.id, -1)}
                          >
                            −
                          </button>

                          <strong>{item.quantity}</strong>

                          <button
                            type="button"
                            disabled={
                              isAdding ||
                              !item.selected ||
                              item.quantity >= 10
                            }
                            aria-label={`Increase quantity for ${item.name}`}
                            onClick={() => changeQuantity(item.id, 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <strong className="equipped-product-price">
                    {formatPrice(item.price * item.quantity)}
                  </strong>
                </article>
              ))}
            </section>

            <aside
              className="selection-summary"
              aria-label="Selection summary"
            >
              <span className="summary-label">SELECTION SUMMARY</span>

              <div className="summary-row">
                <span>Selected products</span>
                <strong>
                  {selectedItems.length} of {items.length}
                </strong>
              </div>

              <div className="summary-row">
                <span>Total quantity</span>
                <strong>
                  {totalQuantity}{" "}
                  {totalQuantity === 1 ? "item" : "items"}
                </strong>
              </div>

              <div className="summary-divider" />

              <div className="summary-subtotal">
                <span>Subtotal</span>
                <strong>{formatPrice(subtotal)}</strong>
              </div>

              <div className="separate-items-notice">
                <div aria-hidden="true">i</div>
                <p>
                  <strong>Separate cart items</strong>
                  <span>
                    Selected products are added individually.
                  </span>
                </p>
              </div>

              {pageError && (
                <div className="select-items-error" role="alert">
                  {pageError}
                </div>
              )}

              <button
                className={`add-items-cart-button ${
                  itemsAdded ? "items-added" : ""
                }`}
                type="button"
                disabled={isAdding}
                onClick={
                  itemsAdded ? openCart : addSelectedItemsToCart
                }
              >
                {isAdding
                  ? "Adding…"
                  : itemsAdded
                    ? "View Shopping Cart"
                    : `Add ${totalQuantity} ${
                        totalQuantity === 1 ? "Item" : "Items"
                      } to Cart`}
              </button>

              <button
                className="back-studio-button"
                type="button"
                onClick={() =>
                  navigate("/shopper/fitting-studio/customize")
                }
              >
                Back to Fitting Studio
              </button>
            </aside>
          </div>

          <section className="before-adding-notice">
            <strong>Before adding your outfit</strong>
            <p>
              Every selected product is added at its listed size and
              the quantity you set. Uncheck any garment you do not
              want to purchase.
            </p>
          </section>
        </main>
      </div>

      {notification && (
        <div className="select-items-notification" role="status">
          {notification}
        </div>
      )}
    </div>
  );
}

export default CartSelectedItems;