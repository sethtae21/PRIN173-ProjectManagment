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
import "./css/ShoppingCartPage.css";

const sampleCartItems = [
  {
    id: "luna-1",
    name: "Classic Beige Top",
    sellerId: "luna-clothing",
    sellerName: "Luna Clothing",
    category: "Tops",
    price: 699,
    originalPrice: 799,
    size: "M",
    color: "Beige",
    quantity: 1,
    stock: 12,
    availableSizes: [
      "XS",
      "S",
      "M",
      "L",
      "XL",
    ],
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
    size: "M",
    color: "Blue",
    quantity: 1,
    stock: 8,
    availableSizes: [
      "XS",
      "S",
      "M",
      "L",
      "XL",
    ],
    colorClass: "denim",
  },
  {
    id: "luna-2",
    name: "Floral Summer Dress",
    sellerId: "luna-clothing",
    sellerName: "Luna Clothing",
    category: "Dresses",
    price: 999,
    originalPrice: 1199,
    size: "L",
    color: "Rose Floral",
    quantity: 1,
    stock: 5,
    availableSizes: [
      "S",
      "M",
      "L",
      "XL",
    ],
    colorClass: "floral",
  },
];

function normalizeCartItem(item, index) {
  return {
    id:
      item?.id ||
      item?.productId ||
      `cart-item-${index + 1}`,
    name:
      item?.name ||
      item?.productName ||
      item?.title ||
      `Product ${index + 1}`,
    sellerId:
      item?.sellerId ||
      item?.storeId ||
      "luna-clothing",
    sellerName:
      item?.sellerName ||
      item?.storeName ||
      item?.seller ||
      "FitFusion Seller",
    category:
      item?.category ||
      item?.type ||
      "Clothing",
    price: Number(item?.price) || 0,
    originalPrice:
      Number(item?.originalPrice) ||
      Number(item?.price) ||
      0,
    size:
      item?.size ||
      item?.selectedSize ||
      "",
    color:
      item?.color ||
      item?.selectedColor ||
      "Default",
    quantity:
      Math.max(
        1,
        Number(item?.quantity) || 1
      ),
    stock:
      Math.max(
        0,
        Number(item?.stock) || 10
      ),
    availableSizes:
      Array.isArray(item?.availableSizes) &&
      item.availableSizes.length > 0
        ? item.availableSizes
        : Array.isArray(item?.sizes) &&
            item.sizes.length > 0
          ? item.sizes
          : ["XS", "S", "M", "L", "XL"],
    image:
      item?.image ||
      item?.imageUrl ||
      item?.thumbnail ||
      "",
    colorClass:
      item?.colorClass || "beige",
  };
}

function loadCartItems() {
  try {
    const storedCart = localStorage.getItem(
      "fitfusion-cart-items"
    );

    /*
      If the key does not exist yet, sample items
      are displayed for prototype demonstration.
    */
    if (storedCart === null) {
      return sampleCartItems;
    }

    const parsedCart = JSON.parse(storedCart);

    if (!Array.isArray(parsedCart)) {
      return [];
    }

    return parsedCart.map(normalizeCartItem);
  } catch {
    return sampleCartItems;
  }
}

function ShoppingCartPage() {
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState(
    loadCartItems
  );

  const [selectedItemIds, setSelectedItemIds] =
    useState(() =>
      loadCartItems().map((item) =>
        String(item.id)
      )
    );

  const [itemToRemove, setItemToRemove] =
    useState(null);

  const [showClearModal, setShowClearModal] =
    useState(false);

  const [showLogoutModal, setShowLogoutModal] =
    useState(false);

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "fitfusion-cart-items",
      JSON.stringify(cartItems)
    );
  }, [cartItems]);

  const selectedItems = useMemo(() => {
    return cartItems.filter((item) =>
      selectedItemIds.includes(
        String(item.id)
      )
    );
  }, [cartItems, selectedItemIds]);

  const totalCartQuantity = useMemo(() => {
    return cartItems.reduce(
      (total, item) =>
        total + item.quantity,
      0
    );
  }, [cartItems]);

  const subtotal = useMemo(() => {
    return selectedItems.reduce(
      (total, item) =>
        total +
        item.price * item.quantity,
      0
    );
  }, [selectedItems]);

  const totalOriginalPrice = useMemo(() => {
    return selectedItems.reduce(
      (total, item) =>
        total +
        item.originalPrice *
          item.quantity,
      0
    );
  }, [selectedItems]);

  const productDiscount = Math.max(
    0,
    totalOriginalPrice - subtotal
  );

  const shippingFee =
    selectedItems.length === 0
      ? 0
      : subtotal >= 1500
        ? 0
        : 80;

  const grandTotal =
    subtotal + shippingFee;

  const allItemsSelected =
    cartItems.length > 0 &&
    selectedItemIds.length ===
      cartItems.length;

  function displayNotice(message) {
    setNotice(message);

    setTimeout(() => {
      setNotice("");
    }, 2600);
  }

  function toggleItemSelection(itemId) {
    const normalizedId = String(itemId);

    setSelectedItemIds((currentIds) => {
      if (
        currentIds.includes(normalizedId)
      ) {
        return currentIds.filter(
          (id) => id !== normalizedId
        );
      }

      return [
        ...currentIds,
        normalizedId,
      ];
    });

    setError("");
  }

  function toggleSelectAll() {
    if (allItemsSelected) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(
        cartItems.map((item) =>
          String(item.id)
        )
      );
    }

    setError("");
  }

  function updateQuantity(
    itemId,
    nextQuantity
  ) {
    setCartItems((currentItems) =>
      currentItems.map((item) => {
        if (item.id !== itemId) {
          return item;
        }

        const safeQuantity = Math.min(
          item.stock,
          Math.max(
            1,
            Number(nextQuantity) || 1
          )
        );

        return {
          ...item,
          quantity: safeQuantity,
        };
      })
    );
  }

  function updateSize(itemId, size) {
    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              size,
            }
          : item
      )
    );

    setError("");
  }

  function removeItem() {
    if (!itemToRemove) {
      return;
    }

    const removedId = String(
      itemToRemove.id
    );

    setCartItems((currentItems) =>
      currentItems.filter(
        (item) =>
          String(item.id) !== removedId
      )
    );

    setSelectedItemIds((currentIds) =>
      currentIds.filter(
        (id) => id !== removedId
      )
    );

    displayNotice(
      `${itemToRemove.name} was removed from your cart.`
    );

    setItemToRemove(null);
  }

  function clearSelectedItems() {
    const selectedIds = new Set(
      selectedItemIds
    );

    setCartItems((currentItems) =>
      currentItems.filter(
        (item) =>
          !selectedIds.has(
            String(item.id)
          )
      )
    );

    setSelectedItemIds([]);
    setShowClearModal(false);

    displayNotice(
      "Selected products were removed from your cart."
    );
  }

  function viewProduct(item) {
    localStorage.setItem(
      "fitfusion-selected-product",
      JSON.stringify(item)
    );

    navigate(
      `/shopper/products/${item.id}`
    );
  }

  function viewSeller(item) {
    navigate(
      `/shopper/sellers/${item.sellerId}`
    );
  }

  function moveToSavedOutfit(item) {
    let savedOutfits = [];

    try {
      const storedOutfits =
        localStorage.getItem(
          "fitfusion-saved-outfits"
        );

      const parsedOutfits =
        storedOutfits
          ? JSON.parse(storedOutfits)
          : [];

      savedOutfits = Array.isArray(
        parsedOutfits
      )
        ? parsedOutfits
        : [];
    } catch {
      savedOutfits = [];
    }

    const newOutfit = {
      id: `outfit-${Date.now()}`,
      name: `${item.name} Outfit`,
      occasion: "Casual",
      description:
        "Created from a shopping cart product.",
      avatarView: "front",
      createdAt: new Date().toISOString(),
      products: [
        {
          ...item,
          quantity: 1,
        },
      ],
    };

    localStorage.setItem(
      "fitfusion-saved-outfits",
      JSON.stringify([
        ...savedOutfits,
        newOutfit,
      ])
    );

    displayNotice(
      `${item.name} was added to Saved Outfits.`
    );
  }

  function proceedToCheckout() {
    setError("");

    if (selectedItems.length === 0) {
      setError(
        "Please select at least one product before proceeding to checkout."
      );

      return;
    }

    const itemWithoutSize =
      selectedItems.find(
        (item) => !item.size
      );

    if (itemWithoutSize) {
      setError(
        `Please select a size for ${itemWithoutSize.name}.`
      );

      return;
    }

    const unavailableItem =
      selectedItems.find(
        (item) =>
          item.stock <= 0 ||
          item.quantity > item.stock
      );

    if (unavailableItem) {
      setError(
        `${unavailableItem.name} does not have enough available stock.`
      );

      return;
    }

    const checkoutData = {
      items: selectedItems,
      subtotal,
      discount: productDiscount,
      shippingFee,
      total: grandTotal,
      createdAt:
        new Date().toISOString(),
    };

    localStorage.setItem(
      "fitfusion-checkout-items",
      JSON.stringify(checkoutData)
    );

    navigate("/shopper/checkout");
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
    <main className="shopping-cart-page">
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
            className="shopper-nav-link"
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

      <section className="shopping-cart-content">
        <header className="shopping-cart-header">
          <div>
            <button
              type="button"
              className="shopping-cart-back-button"
              onClick={() =>
                navigate("/shopper/catalog")
              }
            >
              ← Continue Shopping
            </button>

            <h1>Shopping Cart</h1>

            <p>
              Review your products before
              proceeding to checkout.
            </p>
          </div>

          <div className="shopping-cart-header-actions">
            <div className="shopping-cart-count">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 7H6" />
                <circle cx="10" cy="20" r="1" />
                <circle cx="18" cy="20" r="1" />
              </svg>

              <span>
                {totalCartQuantity}
              </span>
            </div>

            <div className="shopping-cart-role">
              REGISTERED SHOPPER
            </div>
          </div>
        </header>

        <div className="shopping-cart-body">
          {notice && (
            <div
              className="shopping-cart-notice"
              role="status"
            >
              {notice}
            </div>
          )}

          <section className="shopping-cart-introduction">
            <div>
              <p>YOUR SELECTED PRODUCTS</p>

              <h2>
                Review your shopping bag
              </h2>

              <span>
                Select the products you want
                included in your checkout.
              </span>
            </div>

            <div className="shopping-cart-item-summary">
              <strong>
                {totalCartQuantity}
              </strong>

              <span>
                {totalCartQuantity === 1
                  ? "item"
                  : "items"}{" "}
                in cart
              </span>
            </div>
          </section>

          {cartItems.length > 0 ? (
            <div className="shopping-cart-layout">
              <section className="shopping-cart-items-card">
                <div className="shopping-cart-selection-bar">
                  <label>
                    <input
                      type="checkbox"
                      checked={
                        allItemsSelected
                      }
                      onChange={
                        toggleSelectAll
                      }
                    />

                    <span>
                      Select all (
                      {cartItems.length})
                    </span>
                  </label>

                  <button
                    type="button"
                    disabled={
                      selectedItemIds.length ===
                      0
                    }
                    onClick={() =>
                      setShowClearModal(true)
                    }
                  >
                    Remove Selected
                  </button>
                </div>

                <div className="shopping-cart-items-list">
                  {cartItems.map((item) => {
                    const isSelected =
                      selectedItemIds.includes(
                        String(item.id)
                      );

                    const lineTotal =
                      item.price *
                      item.quantity;

                    const discount =
                      item.originalPrice >
                      item.price
                        ? Math.round(
                            ((item.originalPrice -
                              item.price) /
                              item.originalPrice) *
                              100
                          )
                        : 0;

                    return (
                      <article
                        key={item.id}
                        className={
                          isSelected
                            ? "shopping-cart-item selected"
                            : "shopping-cart-item"
                        }
                      >
                        <label className="shopping-cart-checkbox">
                          <input
                            type="checkbox"
                            checked={
                              isSelected
                            }
                            onChange={() =>
                              toggleItemSelection(
                                item.id
                              )
                            }
                            aria-label={`Select ${item.name}`}
                          />
                        </label>

                        <button
                          type="button"
                          className={`shopping-cart-product-image ${item.colorClass}`}
                          onClick={() =>
                            viewProduct(item)
                          }
                          aria-label={`View ${item.name}`}
                        >
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                            />
                          ) : (
                            <div className="shopping-cart-garment">
                              <span />
                              <span />
                            </div>
                          )}

                          {discount > 0 && (
                            <small>
                              -{discount}%
                            </small>
                          )}
                        </button>

                        <div className="shopping-cart-product-information">
                          <button
                            type="button"
                            className="shopping-cart-seller"
                            onClick={() =>
                              viewSeller(item)
                            }
                          >
                            {item.sellerName} →
                          </button>

                          <button
                            type="button"
                            className="shopping-cart-product-name"
                            onClick={() =>
                              viewProduct(item)
                            }
                          >
                            {item.name}
                          </button>

                          <p>{item.category}</p>

                          <div className="shopping-cart-price">
                            <strong>
                              ₱
                              {item.price.toLocaleString(
                                "en-PH"
                              )}
                            </strong>

                            {item.originalPrice >
                              item.price && (
                              <del>
                                ₱
                                {item.originalPrice.toLocaleString(
                                  "en-PH"
                                )}
                              </del>
                            )}
                          </div>

                          <div className="shopping-cart-mobile-actions">
                            <button
                              type="button"
                              onClick={() =>
                                moveToSavedOutfit(
                                  item
                                )
                              }
                            >
                              Save as Outfit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setItemToRemove(
                                  item
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
                                updateSize(
                                  item.id,
                                  event.target
                                    .value
                                )
                              }
                              className={
                                !item.size
                                  ? "cart-field-error"
                                  : ""
                              }
                            >
                              <option value="">
                                Select
                              </option>

                              {item.availableSizes.map(
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

                          <div className="shopping-cart-color">
                            <span>Color</span>
                            <strong>
                              {item.color}
                            </strong>
                          </div>

                          <label>
                            <span>Quantity</span>

                            <div className="shopping-cart-quantity">
                              <button
                                type="button"
                                disabled={
                                  item.quantity <=
                                  1
                                }
                                onClick={() =>
                                  updateQuantity(
                                    item.id,
                                    item.quantity -
                                      1
                                  )
                                }
                              >
                                −
                              </button>

                              <strong>
                                {item.quantity}
                              </strong>

                              <button
                                type="button"
                                disabled={
                                  item.quantity >=
                                  item.stock
                                }
                                onClick={() =>
                                  updateQuantity(
                                    item.id,
                                    item.quantity +
                                      1
                                  )
                                }
                              >
                                +
                              </button>
                            </div>
                          </label>

                          <small>
                            {item.stock} available
                          </small>
                        </div>

                        <div className="shopping-cart-item-total">
                          <span>Item total</span>

                          <strong>
                            ₱
                            {lineTotal.toLocaleString(
                              "en-PH"
                            )}
                          </strong>

                          <button
                            type="button"
                            onClick={() =>
                              moveToSavedOutfit(
                                item
                              )
                            }
                          >
                            Save as Outfit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setItemToRemove(
                                item
                              )
                            }
                          >
                            Remove
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <aside className="shopping-cart-summary-card">
                <div className="shopping-cart-summary-heading">
                  <p>ORDER SUMMARY</p>

                  <h2>
                    Selected Products
                  </h2>

                  <span>
                    {selectedItems.length}{" "}
                    {selectedItems.length === 1
                      ? "product"
                      : "products"}
                  </span>
                </div>

                <div className="shopping-cart-summary-rows">
                  <div>
                    <span>Subtotal</span>

                    <strong>
                      ₱
                      {subtotal.toLocaleString(
                        "en-PH"
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Product discount
                    </span>

                    <strong className="cart-discount">
                      -₱
                      {productDiscount.toLocaleString(
                        "en-PH"
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Shipping fee</span>

                    <strong>
                      {shippingFee === 0 &&
                      selectedItems.length >
                        0
                        ? "FREE"
                        : `₱${shippingFee.toLocaleString(
                            "en-PH"
                          )}`}
                    </strong>
                  </div>
                </div>

                {selectedItems.length > 0 &&
                  shippingFee > 0 && (
                    <div className="shopping-cart-shipping-message">
                      Add ₱
                      {(
                        1500 - subtotal
                      ).toLocaleString(
                        "en-PH"
                      )}{" "}
                      more to receive free
                      shipping.
                    </div>
                  )}

                <div className="shopping-cart-grand-total">
                  <span>Total</span>

                  <strong>
                    ₱
                    {grandTotal.toLocaleString(
                      "en-PH"
                    )}
                  </strong>
                </div>

                {error && (
                  <div
                    className="shopping-cart-error"
                    role="alert"
                  >
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  className="shopping-cart-checkout-button"
                  onClick={
                    proceedToCheckout
                  }
                >
                  Proceed to Checkout
                </button>

                <button
                  type="button"
                  className="shopping-cart-continue-button"
                  onClick={() =>
                    navigate(
                      "/shopper/catalog"
                    )
                  }
                >
                  Continue Shopping
                </button>

                <p className="shopping-cart-disclaimer">
                  This prototype does not process
                  real payments. Product prices,
                  sizes and availability are
                  managed by sellers.
                </p>
              </aside>
            </div>
          ) : (
            <section className="shopping-cart-empty">
              <div className="shopping-cart-empty-icon">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 7H6" />
                  <circle
                    cx="10"
                    cy="20"
                    r="1"
                  />
                  <circle
                    cx="18"
                    cy="20"
                    r="1"
                  />
                </svg>
              </div>

              <p>YOUR CART IS EMPTY</p>

              <h2>
                Find something that fits your
                style
              </h2>

              <span>
                Browse clothing from registered
                sellers and try products on your
                2D avatar.
              </span>

              <div className="shopping-cart-empty-actions">
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/shopper/catalog"
                    )
                  }
                >
                  Browse Catalog
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/shopper/saved-outfits"
                    )
                  }
                >
                  View Saved Outfits
                </button>
              </div>
            </section>
          )}

          {cartItems.length > 0 && (
            <section className="shopping-cart-assurance">
              <article>
                <div>✓</div>

                <div>
                  <strong>
                    Seller-managed sizes
                  </strong>

                  <span>
                    Available sizes come from
                    each product listing.
                  </span>
                </div>
              </article>

              <article>
                <div>☆</div>

                <div>
                  <strong>
                    Try before checkout
                  </strong>

                  <span>
                    Preview clothing using your
                    2D avatar.
                  </span>
                </div>
              </article>

              <article>
                <div>₱</div>

                <div>
                  <strong>
                    Mock payment only
                  </strong>

                  <span>
                    No real payment will be
                    charged in this prototype.
                  </span>
                </div>
              </article>
            </section>
          )}
        </div>
      </section>

      {itemToRemove && (
        <div
          className="shopping-cart-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setItemToRemove(null);
            }
          }}
        >
          <section
            className="shopping-cart-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-cart-title"
          >
            <div className="shopping-cart-modal-icon danger">
              ×
            </div>

            <h2 id="remove-cart-title">
              Remove this product?
            </h2>

            <p>
              “{itemToRemove.name}” will be
              removed from your shopping cart.
            </p>

            <div className="shopping-cart-modal-actions">
              <button
                type="button"
                className="cart-modal-secondary"
                onClick={() =>
                  setItemToRemove(null)
                }
              >
                Keep Product
              </button>

              <button
                type="button"
                className="cart-modal-danger"
                onClick={removeItem}
              >
                Remove
              </button>
            </div>
          </section>
        </div>
      )}

      {showClearModal && (
        <div
          className="shopping-cart-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowClearModal(false);
            }
          }}
        >
          <section
            className="shopping-cart-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-cart-title"
          >
            <div className="shopping-cart-modal-icon danger">
              ×
            </div>

            <h2 id="clear-cart-title">
              Remove selected products?
            </h2>

            <p>
              {selectedItemIds.length} selected{" "}
              {selectedItemIds.length === 1
                ? "product"
                : "products"}{" "}
              will be removed from your cart.
            </p>

            <div className="shopping-cart-modal-actions">
              <button
                type="button"
                className="cart-modal-secondary"
                onClick={() =>
                  setShowClearModal(false)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="cart-modal-danger"
                onClick={
                  clearSelectedItems
                }
              >
                Remove Selected
              </button>
            </div>
          </section>
        </div>
      )}

      {showLogoutModal && (
        <div
          className="shopping-cart-modal-backdrop"
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
            className="shopping-cart-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-logout-title"
          >
            <div className="shopping-cart-modal-icon">
              ↪
            </div>

            <h2 id="cart-logout-title">
              Log out?
            </h2>

            <p>
              Your cart will remain saved on
              this browser, but you will need to
              log in again to continue.
            </p>

            <div className="shopping-cart-modal-actions">
              <button
                type="button"
                className="cart-modal-secondary"
                onClick={() =>
                  setShowLogoutModal(false)
                }
              >
                Stay
              </button>

              <button
                type="button"
                className="cart-modal-primary"
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

export default ShoppingCartPage;