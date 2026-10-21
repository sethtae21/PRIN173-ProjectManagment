import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { API_URL, cartAPI } from "../services/api";
import "./css/ShoppingCartPage.css";

const CART_STORAGE_KEY = "fitfusion-cart";
const CHECKOUT_STORAGE_KEY = "fitfusion-checkout-items";
const MAX_QUANTITY = 10;

// REMOVED defaultCartItems to prevent fake data from appearing

function formatCurrency(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(value);
}

function normalizeCartItem(item, index) {
  const productId = String(
    item.productId ?? item.id ?? index + 1
  );

  const size = item.size || item.selectedSize || "M";
  const color = item.color || item.selectedColor || "Default";

  return {
    id:
      item.id ||
      `${productId}-${size}-${color}`,
    productId,
    name: item.name || "Fashion Item",
    category: item.category || item.displayCategory || "Clothing",
    sellerId:
      item.sellerId || item.seller_id || "fitfusion-seller",
    sellerName:
      item.sellerName || item.store_name || "FitFusion Seller",
    price: Number(item.price || 0),
    originalPrice: Number(
      item.originalPrice || item.price || 0
    ),
    quantity: Math.min(
      MAX_QUANTITY,
      Math.max(
        1,
        Number(item.quantity || 1)
      )
    ),
    size,
    color,
    sizes:
      Array.isArray(item.sizes) &&
      item.sizes.length > 0
        ? item.sizes
        : [size], // Fallback to current size if no array
    colors:
      Array.isArray(item.colors) &&
      item.colors.length > 0
        ? item.colors
        : [color],
    selected: item.selected !== false,
    // FIX: Map imageUrl (from CatalogPage) to image (for Cart display)
    image: item.imageUrl || item.image || item.frontImageUrl || "",
  };
}

function mergeDuplicateItems(items) {
  const mergedItems = new Map();

  items.forEach((item, index) => {
    const normalizedItem =
      normalizeCartItem(item, index);

    const key = [
      normalizedItem.productId,
      normalizedItem.size,
      normalizedItem.color,
    ].join("-");

    if (!mergedItems.has(key)) {
      mergedItems.set(key, {
        ...normalizedItem,
        id: key,
      });

      return;
    }

    const existingItem =
      mergedItems.get(key);

    mergedItems.set(key, {
      ...existingItem,
      quantity: Math.min(
        MAX_QUANTITY,
        existingItem.quantity +
          normalizedItem.quantity
      ),
      selected:
        existingItem.selected ||
        normalizedItem.selected,
    });
  });

  return Array.from(mergedItems.values());
}

function loadCartItems() {
  try {
    const storedCart = localStorage.getItem(
      CART_STORAGE_KEY
    );

    if (!storedCart) {
      return []; // Return empty array instead of mock data
    }

    const parsedCart = JSON.parse(storedCart);

    if (!Array.isArray(parsedCart)) {
      return [];
    }

    return mergeDuplicateItems(parsedCart);
  } catch {
    return [];
  }
}

function ShoppingCartPage() {
  const navigate = useNavigate();

  const [cartItems, setCartItems] =
    useState(loadCartItems);

  const [isCartLoading, setIsCartLoading] = useState(true);
  const [isCartBusy, setIsCartBusy] = useState(false);
  const [cartLoadError, setCartLoadError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDatabaseCart() {
      try {
        const cart = await cartAPI.get();
        if (!isMounted) return;

        const savedItems = loadCartItems();
        const items = cart.items.map((item, index) => {
          const previousItem = savedItems.find(
            (saved) =>
              String(saved.productId ?? saved.id) ===
              String(item.catalog_item)
          );
          const imageUrl = item.front_image_url
            ? item.front_image_url.startsWith("http")
              ? item.front_image_url
              : `${API_URL}${item.front_image_url.startsWith("/") ? "" : "/"}${item.front_image_url}`
            : "";

          return normalizeCartItem(
            {
              ...previousItem,
              id: previousItem?.id || item.catalog_item,
              productId: item.catalog_item,
              name: item.name,
              sellerName: item.store_name,
              price: item.price,
              quantity: item.quantity,
              imageUrl,
            },
            index
          );
        });

        setCartItems(items);
        setCartLoadError("");
      } catch (error) {
        console.error("Failed to load database cart:", error);
        if (isMounted) {
          setCartItems([]);
          setCartLoadError(
            "We couldn't load your saved cart. Please refresh the page to try again."
          );
        }
      } finally {
        if (isMounted) setIsCartLoading(false);
      }
    }

    loadDatabaseCart();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync cart to localStorage and dispatch event for header update
  useEffect(() => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify(cartItems)
    );

    // Dispatch event so the header cart icon updates immediately
    window.dispatchEvent(
      new CustomEvent(
        "fitfusion-cart-updated",
        {
          detail: {
            cart: cartItems,
            quantity: cartItems.reduce((sum, item) => sum + item.quantity, 0),
          },
        }
      )
    );
  }, [cartItems]);

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

  // Calculate total unique items
  const cartProductCount = cartItems.length;

  const selectedItems = useMemo(
    () =>
      cartItems.filter(
        (item) => item.selected
      ),
    [cartItems]
  );

  const selectedProductCount =
    selectedItems.length;

  const subtotal = useMemo(
    () =>
      selectedItems.reduce(
        (total, item) =>
          total +
          Number(item.price) *
            Number(item.quantity),
        0
      ),
    [selectedItems]
  );

  const originalSubtotal = useMemo(
    () =>
      selectedItems.reduce(
        (total, item) =>
          total +
          Number(item.originalPrice) *
            Number(item.quantity),
        0
      ),
    [selectedItems]
  );

  const productDiscount = Math.max(
    0,
    originalSubtotal - subtotal
  );

  const freeShippingThreshold = 1500;

  const shippingFee =
    selectedItems.length === 0
      ? 0
      : subtotal >= freeShippingThreshold
        ? 0
        : 80;

  const amountUntilFreeShipping =
    Math.max(
      0,
      freeShippingThreshold - subtotal
    );

  const total = subtotal + shippingFee;

  const allSelected =
    cartItems.length > 0 &&
    cartItems.every(
      (item) => item.selected
    );

  function updateItem(itemId, updates) {
    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              ...updates,
            }
          : item
      )
    );
  }

  function handleToggleItem(itemId) {
    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              selected: !item.selected,
            }
          : item
      )
    );
  }

  function handleSelectAll() {
    const shouldSelect = !allSelected;

    setCartItems((currentItems) =>
      currentItems.map((item) => ({
        ...item,
        selected: shouldSelect,
      }))
    );
  }

  async function handleQuantityChange(
    itemId,
    change
  ) {
    const item = cartItems.find((cartItem) => cartItem.id === itemId);
    if (!item || isCartBusy) return;

    const nextQuantity = Math.min(
      MAX_QUANTITY,
      Math.max(1, Number(item.quantity) + change)
    );
    if (nextQuantity === item.quantity) return;

    setIsCartBusy(true);
    try {
      await cartAPI.updateQuantity(item.productId, nextQuantity);
      setCartItems((currentItems) =>
        currentItems.map((cartItem) =>
          cartItem.id === itemId
            ? { ...cartItem, quantity: nextQuantity }
            : cartItem
        )
      );
      setNotice("Cart quantity updated.");
    } catch (error) {
      console.error("Failed to update cart quantity:", error);
      setNotice("We couldn't update the quantity. Please try again.");
    } finally {
      setIsCartBusy(false);
    }
  }

  async function handleRemoveItem(itemId) {
    const item = cartItems.find((cartItem) => cartItem.id === itemId);
    if (!item || isCartBusy) return;

    setIsCartBusy(true);
    try {
      await cartAPI.removeItem(item.productId);
      setCartItems((currentItems) =>
        currentItems.filter((cartItem) => cartItem.id !== itemId)
      );
      setNotice("The product was removed from your cart.");
    } catch (error) {
      console.error("Failed to remove cart item:", error);
      setNotice("We couldn't remove the product. Please try again.");
    } finally {
      setIsCartBusy(false);
    }
  }

  async function handleRemoveSelected() {
    if (selectedItems.length === 0) {
      setNotice(
        "Please select a product to remove."
      );

      return;
    }

    if (isCartBusy) return;

    const selectedIds = new Set(
      selectedItems.map((item) => item.id)
    );
    setIsCartBusy(true);
    try {
      await cartAPI.removeSelected(
        selectedItems.map((item) => item.productId)
      );
      setCartItems((currentItems) =>
        currentItems.filter((item) => !selectedIds.has(item.id))
      );
      setNotice("Selected products were removed.");
    } catch (error) {
      console.error("Failed to remove selected cart items:", error);
      setNotice("We couldn't remove the selected products. Please try again.");
    } finally {
      setIsCartBusy(false);
    }
  }

  function handleCheckout() {
    if (selectedItems.length === 0) {
      setNotice(
        "Please select at least one product before checkout."
      );

      return;
    }

    localStorage.setItem(
      CHECKOUT_STORAGE_KEY,
      JSON.stringify(selectedItems)
    );

    navigate("/shopper/checkout");
  }

  return (
    <main className="shopping-cart-page">
      {notice && (
        <div
          className="shopping-cart-toast"
          role="status"
        >
          {notice}
        </div>
      )}

      {cartLoadError && (
        <div className="shopping-cart-toast" role="alert">
          {cartLoadError}
        </div>
      )}

      <div className="shopping-cart-toolbar">
        <Link
          to="/shopper/catalog"
          className="shopping-cart-back"
        >
          ← Continue Shopping
        </Link>

        <div
          className="shopping-cart-count"
          aria-label={`${cartProductCount} products in cart`}
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 7H6" />
            <circle cx="10" cy="20" r="1" />
            <circle cx="18" cy="20" r="1" />
          </svg>

          <strong>{cartProductCount}</strong>
        </div>
      </div>

      <div className="shopping-cart-content">
        <section className="shopping-cart-intro">
          <div>
            <p>YOUR SELECTED PRODUCTS</p>

            <h1>
              Review your shopping bag
            </h1>

            <span>
              Select the products you want
              included in your checkout.
            </span>
          </div>

          <div className="shopping-cart-item-badge">
            <strong>{cartProductCount}</strong>

            <span>
              {cartProductCount === 1
                ? "item in cart"
                : "items in cart"}
            </span>
          </div>
        </section>

        {isCartLoading ? (
          <section className="shopping-cart-empty" aria-live="polite">
            <p>Loading your saved cart...</p>
          </section>
        ) : cartItems.length === 0 ? (
          <section className="shopping-cart-empty">
            <div className="shopping-cart-empty-icon">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 7H6" />
                <circle cx="10" cy="20" r="1" />
                <circle cx="18" cy="20" r="1" />
              </svg>
            </div>

            <h2>Your shopping cart is empty</h2>

            <p>
              Browse the catalog and add products
              you would like to purchase.
            </p>

            <button
              type="button"
              className="shopping-cart-primary-button"
              onClick={() =>
                navigate("/shopper/catalog")
              }
            >
              Browse Catalog
            </button>
          </section>
        ) : (
          <div className="shopping-cart-grid">
            <section className="shopping-cart-products-card">
              <div className="shopping-cart-selection-bar">
                <label className="shopping-cart-check-label">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                  />

                  <span>
                    Select all (
                    {cartItems.length})
                  </span>
                </label>

                <button
                  type="button"
                  className="shopping-cart-remove-selected"
                  onClick={
                    handleRemoveSelected
                  }
                  disabled={isCartBusy}
                >
                  Remove Selected
                </button>
              </div>

              <div className="shopping-cart-product-list">
                {cartItems.map((item) => (
                  <article
                    className="shopping-cart-product"
                    key={item.id}
                  >
                    <input
                      type="checkbox"
                      className="shopping-cart-product-checkbox"
                      checked={item.selected}
                      onChange={() =>
                        handleToggleItem(
                          item.id
                        )
                      }
                      aria-label={`Select ${item.name}`}
                    />

                    <button
                      type="button"
                      className="shopping-cart-product-image"
                      onClick={() =>
                        navigate(
                          `/shopper/products/${item.productId}`
                        )
                      }
                      aria-label={`View ${item.name}`}
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="cart-item-img"
                        />
                      ) : (
                        <span aria-hidden="true" className="cart-item-placeholder">
                          {item.name.charAt(0)}
                        </span>
                      )}

                      {item.originalPrice >
                        item.price && (
                        <small className="cart-discount-badge">
                          -
                          {Math.round(
                            (1 -
                              item.price /
                                item.originalPrice) *
                              100
                          )}
                          %
                        </small>
                      )}
                    </button>

                    <div className="shopping-cart-product-info">
                      <Link
                        to={`/shopper/sellers/${item.sellerId}`}
                        className="shopping-cart-seller"
                      >
                        {item.sellerName} →
                      </Link>

                      <button
                        type="button"
                        className="shopping-cart-product-name"
                        onClick={() =>
                          navigate(
                            `/shopper/products/${item.productId}`
                          )
                        }
                      >
                        {item.name}
                      </button>

                      <p>{item.category}</p>

                      <div className="shopping-cart-price">
                        <strong>
                          {formatCurrency(
                            item.price
                          )}
                        </strong>

                        {item.originalPrice >
                          item.price && (
                          <del>
                            {formatCurrency(
                              item.originalPrice
                            )}
                          </del>
                        )}
                      </div>

                      <div className="shopping-cart-product-total">
                        <span>Item total</span>

                        <strong>
                          {formatCurrency(
                            item.price *
                              item.quantity
                          )}
                        </strong>

                        <button
                          type="button"
                          className="shopping-cart-remove-btn"
                          onClick={() =>
                            handleRemoveItem(
                              item.id
                            )
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="shopping-cart-options">
                      <label>
                        <span>Size</span>

                        <select
                          value={item.size}
                          onChange={(event) =>
                            updateItem(
                              item.id,
                              {
                                size:
                                  event.target
                                    .value,
                              }
                            )
                          }
                        >
                          {item.sizes.map(
                            (size) => (
                              <option
                                key={size}
                                value={size}
                              >
                                {size}
                              </option>
                            )
                          )}
                        </select>
                      </label>

                      <label>
                        <span>Color</span>

                        <select
                          value={item.color}
                          onChange={(event) =>
                            updateItem(
                              item.id,
                              {
                                color:
                                  event.target
                                    .value,
                              }
                            )
                          }
                        >
                          {item.colors.map(
                            (color) => (
                              <option
                                key={color}
                                value={color}
                              >
                                {color}
                              </option>
                            )
                          )}
                        </select>
                      </label>

                      <div className="shopping-cart-quantity-section">
                        <span>Quantity</span>

                        <div className="shopping-cart-quantity">
                          <button
                            type="button"
                            onClick={() =>
                              handleQuantityChange(
                                item.id,
                                -1
                              )
                            }
                            disabled={isCartBusy || item.quantity <= 1}
                            aria-label={`Decrease quantity of ${item.name}`}
                          >
                            −
                          </button>

                          <strong>
                            {item.quantity}
                          </strong>

                          <button
                            type="button"
                            onClick={() =>
                              handleQuantityChange(
                                item.id,
                                1
                              )
                            }
                            disabled={isCartBusy || item.quantity >= MAX_QUANTITY}
                            aria-label={`Increase quantity of ${item.name}`}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <aside className="shopping-cart-summary-card">
              <p className="shopping-cart-summary-label">
                ORDER SUMMARY
              </p>

              <h2>Selected Products</h2>

              <p className="shopping-cart-selected-count">
                {selectedProductCount}{" "}
                {selectedProductCount === 1
                  ? "product"
                  : "products"}
              </p>

              <div className="shopping-cart-summary-divider" />

              <div className="shopping-cart-summary-row">
                <span>Subtotal</span>

                <strong>
                  {formatCurrency(
                    originalSubtotal
                  )}
                </strong>
              </div>

              <div className="shopping-cart-summary-row discount">
                <span>Product discount</span>

                <strong>
                  −
                  {formatCurrency(
                    productDiscount
                  )}
                </strong>
              </div>

              <div className="shopping-cart-summary-row">
                <span>Shipping fee</span>

                <strong>
                  {shippingFee === 0 &&
                  selectedItems.length > 0
                    ? "FREE"
                    : formatCurrency(
                        shippingFee
                      )}
                </strong>
              </div>

              <div className="shopping-cart-summary-divider" />

              {selectedItems.length > 0 &&
                amountUntilFreeShipping > 0 && (
                  <div className="shopping-cart-shipping-notice">
                    Add{" "}
                    <strong>
                      {formatCurrency(
                        amountUntilFreeShipping
                      )}
                    </strong>{" "}
                    more to receive free
                    shipping.
                  </div>
                )}

              {selectedItems.length > 0 &&
                amountUntilFreeShipping ===
                  0 && (
                  <div className="shopping-cart-shipping-notice qualified">
                    Your order qualifies for free
                    shipping.
                  </div>
                )}

              <div className="shopping-cart-summary-total">
                <span>Total</span>

                <strong>
                  {formatCurrency(total)}
                </strong>
              </div>

              <button
                type="button"
                className="shopping-cart-checkout-button"
                onClick={handleCheckout}
                disabled={
                  selectedItems.length === 0
                }
              >
                Proceed to Checkout
              </button>

              <Link
                to="/shopper/catalog"
                className="shopping-cart-continue-link"
              >
                Continue Shopping
              </Link>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

export default ShoppingCartPage;