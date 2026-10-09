import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import "./css/ShoppingCartPage.css";

const CART_STORAGE_KEY = "fitfusion-cart";
const CHECKOUT_STORAGE_KEY =
  "fitfusion-checkout-items";
const MAX_QUANTITY = 10;

const defaultCartItems = [
  {
    id: "001-S-Beige",
    productId: "001",
    name: "Classic Beige Top",
    category: "Tops",
    sellerId: "luna-clothing",
    sellerName: "Luna Clothing",
    price: 699,
    originalPrice: 799,
    quantity: 2,
    size: "S",
    color: "Beige",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Beige", "White", "Black"],
    selected: true,
    image: "",
  },
  {
    id: "002-M-Black",
    productId: "002",
    name: "Elegant Black Trousers",
    category: "Bottoms",
    sellerId: "maison-moderne",
    sellerName: "Maison Moderne",
    price: 1099,
    originalPrice: 1299,
    quantity: 1,
    size: "M",
    color: "Black",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Black", "Brown"],
    selected: false,
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

function normalizeCartItem(item, index) {
  const productId = String(
    item.productId ?? item.id ?? index + 1
  );

  const size = item.size || "M";
  const color = item.color || "Default";

  return {
    id:
      item.id ||
      `${productId}-${size}-${color}`,
    productId,
    name: item.name || "Fashion Item",
    category: item.category || "Clothing",
    sellerId:
      item.sellerId || "fitfusion-seller",
    sellerName:
      item.sellerName || "FitFusion Seller",
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
        : ["S", "M", "L", "XL"],
    colors:
      Array.isArray(item.colors) &&
      item.colors.length > 0
        ? item.colors
        : ["Beige", "Black", "White"],
    selected: item.selected !== false,
    image: item.image || "",
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
      return defaultCartItems;
    }

    const parsedCart = JSON.parse(storedCart);

    if (!Array.isArray(parsedCart)) {
      return defaultCartItems;
    }

    return mergeDuplicateItems(parsedCart);
  } catch {
    return defaultCartItems;
  }
}

function ShoppingCartPage() {
  const navigate = useNavigate();

  const [cartItems, setCartItems] =
    useState(loadCartItems);

  const [notice, setNotice] = useState("");

  useEffect(() => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify(cartItems)
    );

    window.dispatchEvent(
      new CustomEvent(
        "fitfusion-cart-updated",
        {
          detail: {
            cart: cartItems,
            quantity: cartItems.length,
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

  const cartProductCount =
    cartItems.length;

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

  function handleQuantityChange(
    itemId,
    change
  ) {
    setCartItems((currentItems) =>
      currentItems.map((item) => {
        if (item.id !== itemId) {
          return item;
        }

        const nextQuantity =
          Number(item.quantity) + change;

        return {
          ...item,
          quantity: Math.min(
            MAX_QUANTITY,
            Math.max(1, nextQuantity)
          ),
        };
      })
    );
  }

  function handleRemoveItem(itemId) {
    setCartItems((currentItems) =>
      currentItems.filter(
        (item) => item.id !== itemId
      )
    );

    setNotice(
      "The product was removed from your cart."
    );
  }

  function handleRemoveSelected() {
    if (selectedItems.length === 0) {
      setNotice(
        "Please select a product to remove."
      );

      return;
    }

    setCartItems((currentItems) =>
      currentItems.filter(
        (item) => !item.selected
      )
    );

    setNotice(
      "Selected products were removed."
    );
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

        {cartItems.length === 0 ? (
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
                        />
                      ) : (
                        <span aria-hidden="true">
                          {item.name.charAt(0)}
                        </span>
                      )}

                      {item.originalPrice >
                        item.price && (
                        <small>
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
                            disabled={
                              item.quantity <= 1
                            }
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
                            disabled={
                              item.quantity >=
                              MAX_QUANTITY
                            }
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