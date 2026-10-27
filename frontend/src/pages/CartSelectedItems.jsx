import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import logo from "../assets/fitfusion-logo.svg";
import "./css/CartSelectedItems.css";

const DEFAULT_ITEMS = [
  {
    id: "equipped-linen-shirt",
    name: "Linen Shirt",
    category: "Tops",
    seller: "Aurelia Studio",
    color: "Beige",
    colorCode: "#e5d1aa",
    size: "M",
    availableSizes: ["S", "M", "L", "XL"],
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
    availableSizes: ["S", "M", "L", "XL"],
    price: 1100,
  },
  {
    id: "equipped-sneakers",
    name: "Everyday Sneakers",
    category: "Footwear",
    seller: "Maison Sol",
    color: "White",
    colorCode: "#fffdf9",
    size: "7",
    availableSizes: ["6", "7", "8", "9"],
    price: 1500,
  },
  {
    id: "equipped-outerwear",
    name: "Lightweight Outerwear",
    category: "Outerwear",
    seller: "Atelier Four",
    color: "Taupe",
    colorCode: "#8d8173",
    size: "M",
    availableSizes: ["S", "M", "L", "XL"],
    price: 900,
  },
];

function readEquippedItems() {
  try {
    const storedValue = localStorage.getItem(
      "fitfusion-selected-items",
    );

    if (!storedValue) {
      return DEFAULT_ITEMS;
    }

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
        "FitFusion Seller",
      color: item.color || "Default",
      colorCode: item.colorCode || "#c89a43",
      size: item.size || "M",
      availableSizes:
        item.availableSizes ||
        (item.category === "Footwear"
          ? ["6", "7", "8", "9"]
          : ["S", "M", "L", "XL"]),
      price: Number(item.price) || 0,
    }));
  } catch {
    return DEFAULT_ITEMS;
  }
}

function readCartItems() {
  try {
    const parsedCart = JSON.parse(
      localStorage.getItem("fitfusion-cart-items") || "[]",
    );

    return Array.isArray(parsedCart) ? parsedCart : [];
  } catch {
    return [];
  }
}

function formatPrice(price) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(price) || 0);
}

function CartSelectedItems() {
  const navigate = useNavigate();

  const [items, setItems] = useState(() =>
    readEquippedItems().map((item) => ({
      ...item,
      selected: true,
      quantity: 1,
      selectedSize:
        item.size ||
        item.availableSizes?.[0] ||
        "",
    })),
  );

  const [notification, setNotification] = useState("");
  const [pageError, setPageError] = useState("");
  const [itemsAdded, setItemsAdded] = useState(false);
  const [cartCount, setCartCount] = useState(() =>
    readCartItems().reduce(
      (total, item) =>
        total + (Number(item.quantity) || 0),
      0,
    ),
  );

  useEffect(() => {
    if (!notification) return undefined;

    const timer = window.setTimeout(() => {
      setNotification("");
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [notification]);

  const selectedItems = useMemo(
    () => items.filter((item) => item.selected),
    [items],
  );

  const allSelected =
    items.length > 0 &&
    selectedItems.length === items.length;

  const selectedProductCount = selectedItems.length;

  const totalQuantity = selectedItems.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  const subtotal = selectedItems.reduce(
    (total, item) =>
      total + item.price * item.quantity,
    0,
  );

  function toggleItem(itemId) {
    setPageError("");
    setItemsAdded(false);

    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              selected: !item.selected,
            }
          : item,
      ),
    );
  }

  function toggleSelectAll() {
    setPageError("");
    setItemsAdded(false);

    const nextSelectedValue = !allSelected;

    setItems((currentItems) =>
      currentItems.map((item) => ({
        ...item,
        selected: nextSelectedValue,
      })),
    );
  }

  function updateSize(itemId, selectedSize) {
    setPageError("");
    setItemsAdded(false);

    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              selectedSize,
            }
          : item,
      ),
    );
  }

  function decreaseQuantity(itemId) {
    setPageError("");
    setItemsAdded(false);

    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity: Math.max(
                1,
                item.quantity - 1,
              ),
            }
          : item,
      ),
    );
  }

  function increaseQuantity(itemId) {
    setPageError("");
    setItemsAdded(false);

    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity: Math.min(
                10,
                item.quantity + 1,
              ),
            }
          : item,
      ),
    );
  }

  function addSelectedItemsToCart() {
    setPageError("");

    if (selectedItems.length === 0) {
      setPageError(
        "Select at least one equipped product before adding items to your cart.",
      );
      return;
    }

    const invalidSizeItem = selectedItems.find(
      (item) => !item.selectedSize,
    );

    if (invalidSizeItem) {
      setPageError(
        `Select a valid size for ${invalidSizeItem.name}.`,
      );
      return;
    }

    const invalidQuantityItem = selectedItems.find(
      (item) => item.quantity < 1,
    );

    if (invalidQuantityItem) {
      setPageError(
        `${invalidQuantityItem.name} must have a quantity of at least one.`,
      );
      return;
    }

    const existingCart = readCartItems();
    const updatedCart = [...existingCart];

    selectedItems.forEach((selectedItem) => {
      const existingIndex = updatedCart.findIndex(
        (cartItem) =>
          cartItem.id === selectedItem.id &&
          cartItem.selectedSize ===
            selectedItem.selectedSize,
      );

      if (existingIndex >= 0) {
        updatedCart[existingIndex] = {
          ...updatedCart[existingIndex],
          quantity:
            Number(
              updatedCart[existingIndex].quantity,
            ) + selectedItem.quantity,
        };
      } else {
        updatedCart.push({
          id: selectedItem.id,
          name: selectedItem.name,
          category: selectedItem.category,
          seller: selectedItem.seller,
          color: selectedItem.color,
          colorCode: selectedItem.colorCode,
          selectedSize: selectedItem.selectedSize,
          quantity: selectedItem.quantity,
          price: selectedItem.price,
          addedAt: new Date().toISOString(),
        });
      }
    });

    localStorage.setItem(
      "fitfusion-cart-items",
      JSON.stringify(updatedCart),
    );

    const updatedCount = updatedCart.reduce(
      (total, item) =>
        total + (Number(item.quantity) || 0),
      0,
    );

    setCartCount(updatedCount);
    setItemsAdded(true);

    setNotification(
      `${totalQuantity} ${
        totalQuantity === 1 ? "item was" : "items were"
      } added to your cart.`,
    );
  }

  function openCart() {
    navigate("/shopper/cart");
  }

  return (
    <div className="select-items-page">
      <aside className="select-items-sidebar">
        <img
          className="select-items-logo"
          src={logo}
          alt="FitFusion AI"
        />

        <nav className="select-items-navigation">
          <NavLink to="/shopper/dashboard">
            Dashboard
          </NavLink>

          <NavLink to="/shopper/fitting-studio">
            Fitting Studio
          </NavLink>

          <NavLink to="/shopper/avatar-presets">
            Avatar Presets
          </NavLink>

          <NavLink to="/shopper/catalog">
            Catalog
          </NavLink>

          <NavLink to="/shopper/saved-outfits">
            Saved Outfits
          </NavLink>

          <NavLink to="/shopper/orders">
            Order History
          </NavLink>

          <NavLink to="/shopper/account">
            Account
          </NavLink>
        </nav>

        <button
          className="select-items-logout"
          type="button"
          onClick={() => navigate("/login")}
        >
          Logout
        </button>
      </aside>

      <div className="select-items-content">
        <header className="select-items-header">
          <div>
            <h1>15 — SELECT ITEMS FOR CART</h1>

            <p>
              Review each equipped product, size, and quantity
              before adding it to your cart.
            </p>
          </div>

          <div className="select-header-actions">
            <button
              className="select-header-cart"
              type="button"
              onClick={openCart}
            >
              <span aria-hidden="true">🛒</span>
              Cart
              <strong>{cartCount}</strong>
            </button>

            <span className="select-shopper-role">
              REGISTERED SHOPPER
            </span>
          </div>
        </header>

        <main className="select-items-main">
          <section className="select-items-introduction">
            <div>
              <span>OUTFIT TO CART</span>

              <h2>Select equipped products</h2>

              <p>
                Each selected product will be added as an
                individual cart item from its respective seller.
              </p>
            </div>

            <button
              className="select-all-button"
              type="button"
              onClick={toggleSelectAll}
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
            <section className="equipped-products-list">
              {items.map((item) => (
                <article
                  className={`equipped-product-card ${
                    item.selected
                      ? "product-selected"
                      : ""
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
                  >
                    {item.selected ? "✓" : ""}
                  </button>

                  <div
                    className="equipped-product-image"
                    style={{
                      "--product-color":
                        item.colorCode,
                    }}
                    aria-hidden="true"
                  >
                    <div className="product-shape" />
                  </div>

                  <div className="equipped-product-information">
                    <h3>{item.name}</h3>

                    <p>
                      {item.seller} • {item.color}
                    </p>

                    <div className="product-controls">
                      <label>
                        <span>SIZE</span>

                        <select
                          value={item.selectedSize}
                          disabled={!item.selected}
                          onChange={(event) =>
                            updateSize(
                              item.id,
                              event.target.value,
                            )
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
                            ),
                          )}
                        </select>
                      </label>

                      <div className="quantity-field">
                        <span>QTY</span>

                        <div className="quantity-control">
                          <button
                            type="button"
                            disabled={
                              !item.selected ||
                              item.quantity <= 1
                            }
                            aria-label={`Decrease quantity for ${item.name}`}
                            onClick={() =>
                              decreaseQuantity(item.id)
                            }
                          >
                            −
                          </button>

                          <strong>{item.quantity}</strong>

                          <button
                            type="button"
                            disabled={
                              !item.selected ||
                              item.quantity >= 10
                            }
                            aria-label={`Increase quantity for ${item.name}`}
                            onClick={() =>
                              increaseQuantity(item.id)
                            }
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <strong className="equipped-product-price">
                    {formatPrice(
                      item.price * item.quantity,
                    )}
                  </strong>
                </article>
              ))}
            </section>

            <aside className="selection-summary">
              <span className="summary-label">
                SELECTION SUMMARY
              </span>

              <div className="summary-row">
                <span>Selected products</span>

                <strong>
                  {selectedProductCount} of {items.length}
                </strong>
              </div>

              <div className="summary-row">
                <span>Total quantity</span>

                <strong>
                  {totalQuantity}{" "}
                  {totalQuantity === 1
                    ? "item"
                    : "items"}
                </strong>
              </div>

              <div className="summary-divider" />

              <div className="summary-subtotal">
                <span>Subtotal</span>

                <strong>
                  {formatPrice(subtotal)}
                </strong>
              </div>

              <div className="separate-items-notice">
                <div aria-hidden="true">i</div>

                <p>
                  <strong>Separate cart items</strong>
                  <span>
                    Seller, size, and quantity stay attached.
                  </span>
                </p>
              </div>

              {pageError && (
                <div
                  className="select-items-error"
                  role="alert"
                >
                  {pageError}
                </div>
              )}

              <button
                className={`add-items-cart-button ${
                  itemsAdded ? "items-added" : ""
                }`}
                type="button"
                onClick={
                  itemsAdded
                    ? openCart
                    : addSelectedItemsToCart
                }
              >
                {itemsAdded
                  ? "View Shopping Cart"
                  : `Add ${totalQuantity} ${
                      totalQuantity === 1
                        ? "Item"
                        : "Items"
                    } to Cart`}
              </button>

              <button
                className="back-studio-button"
                type="button"
                onClick={() =>
                  navigate(
                    "/shopper/fitting-studio/customize",
                  )
                }
              >
                Back to Fitting Studio
              </button>
            </aside>
          </div>

          <section className="before-adding-notice">
            <strong>Before adding your outfit</strong>

            <p>
              Every selected product must have a valid size and a
              quantity of at least one. Uncheck any garment you do
              not want to purchase.
            </p>
          </section>
        </main>
      </div>

      {notification && (
        <div
          className="select-items-notification"
          role="status"
        >
          {notification}
        </div>
      )}
    </div>
  );
}

export default CartSelectedItems;