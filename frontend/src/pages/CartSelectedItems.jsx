import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import logo from "../assets/fitfusion-logo.svg";
import { cartAPI, getCachedCart, API_URL } from "../services/api";
import { useAlphaCrop } from "../hooks/useAlphaCrop";
import "./css/CartSelectedItems.css";

// Visual-only fallback shown when no equipped selection exists in storage. Size is a
// fixed per-variant attribute (SRS FR-3.2/FR-4.1); there is no availableSizes list
// because the cart cannot store a different size than the variant's (commerce/views.py:
// CartItem = cart/item/quantity only). The card renders size read-only, matching the
// studio equipped card and the catalog's fixed-variant add.
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
    id: "equipped-sneakers",
    name: "Everyday Sneakers",
    category: "Footwear",
    seller: "Maison Sol",
    color: "White",
    colorCode: "#fffdf9",
    size: "7",
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
    price: 900,
  },
];

// FIX (Defect B): carry the garment image through. The studio's continueToCart spreads
// the normalized item (which includes `image`, stored root-relative by the studio's own
// mediaUrl); we also accept the catalog detail aliases so a hydrated record works. The
// mediaUrl() below re-prefixes a root-relative /media/... to the API origin, exactly as
// the catalog page does (the proven pattern), so no studio change is required.
function readEquippedItems() {
  try {
    const storedValue = localStorage.getItem("fitfusion-selected-items");

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

// Prefixes API_URL so a root-relative /media/... stored by the studio resolves against
// the backend origin (same helper shape as CatalogPage.jsx, which is proven to render).
function mediaUrl(path) {
  if (!path) return null;
  if (String(path).startsWith("http")) return path;
  return `${API_URL}${String(path).startsWith("/") ? "" : "/"}${path}`;
}

// Server cart is the single source of truth (FR-6.1/6.2, KAN-69). The badge is the sum
// of line quantities -- identical formula to SavedOutfitsPage / EditSavedOutfitPage, and
// justified by commerce/views.py (CartItem stores cart/item/quantity; quantity is the unit).
function computeCartCount(cart) {
  const items = Array.isArray(cart?.items) ? cart.items : [];
  return items.reduce(
    (sum, item) => sum + Math.max(1, Number(item.quantity) || 1),
    0,
  );
}

// A cart line is keyed by a CatalogItem ObjectId (commerce/views.py add_item ->
// AddToCartSerializer.PrimaryKeyRelatedField). The select-items ids arrive via
// /api/recommendations/ -> normalizeStudioItem, which may surface the pk under a
// different key/shape than /catalog/ does. We validate SYNCHRONOUSLY (24-hex) before
// any fetch, so a contract mismatch fails with a clear, reload-proof message instead of
// a silent 400 that a refresh would wipe.
function isCatalogObjectId(value) {
  return /^[0-9a-fA-F]{24}$/.test(String(value ?? ""));
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

// Read the server cart with a FORCED fresh fetch (bypasses the in-memory GET cache) and
// up to `attempts` tries. Two reasons this is the badge's correctness backbone:
//   (1) CACHE: the mount effect memoizes a 'cart' snapshot; a plain cartAPI.get() after
//       an add can return that stale pre-add value, which is exactly how the badge sticks
//       BELOW the true total. getCachedCart(true) deletes the key first, so the read is
//       always post-write truth -- the server number wins, never a cached floor.
//   (2) TRANSIENCE: the local stack intermittently 503s on GridFS/Atlas hiccups (seen
//       verbatim in the Django log: "GridFS unreachable while serving ... Service
//       Unavailable"). Three attempts with backoff absorb those blips; if all fail the
//       CALLER keeps the add-response floor rather than reverting to a stale 0, so a
//       transient read can never silently zero-out a confirmed write (FR-6.2 / KAN-69).
async function fetchCartFresh(attempts = 3) {
  let lastError = null;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await getCachedCart(true);
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) await sleep(300 * (i + 1));
    }
  }
  throw lastError;
}

/* FIX (Defect B): port the catalog's image pipeline (useAlphaCrop hole-repair + union
   crop, mediaUrl origin-prefix, onError fallback) so each unique garment shows its real,
   centred, transparent photo. The CSS glyph remains only as a no-image / load-failure
   fallback -- exactly like CatalogPreview. */
function EquippedPreview({ src, alt, colorCode }) {
  const [failed, setFailed] = useState(false);
  const cropped = useAlphaCrop(failed ? null : src);

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
    })),
  );

  const [notification, setNotification] = useState("");
  const [pageError, setPageError] = useState("");
  const [itemsAdded, setItemsAdded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [isLoadingCart, setIsLoadingCart] = useState(true);

  // Guard async state updates so navigating away mid-request never logs a
  // set-state-on-unmounted warning (console hygiene).
  const aliveRef = useRef(true);
  useEffect(() => () => { aliveRef.current = false; }, []);

  // FIX (Defect A + the stuck-0/stale-on-load): read the badge from the real endpoint,
  // FORCED fresh with retry, not the non-existent cartAPI.getCart and not a cached
  // snapshot. A transient or stale mount read no longer leaves a misleading number on a
  // non-empty cart. `active` guard prevents a StrictMode double-mount setting state after
  // unmount.
  useEffect(() => {
    let active = true;

    async function fetchCartCount() {
      try {
        const cart = await fetchCartFresh();
        if (active) setCartCount(computeCartCount(cart));
      } catch (error) {
        console.error("Failed to load cart count:", error);
      } finally {
        if (active) setIsLoadingCart(false);
      }
    }

    fetchCartCount();

    return () => {
      active = false;
    };
  }, []);

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

  // FIX (the stuck badge): the badge is now driven by (a) the add responses as a
  // confirmed-write floor and (b) a FORCED-fresh, retried server read that refines
  // UPWARD. The previous revision's settle read could return a cached pre-add snapshot
  // (the mount effect memoizes 'cart'), which is how the badge stuck below the true
  // total; getCachedCart(true) eliminates that. add_item is incremental and
  // non-transactional across lines, so Promise.allSettled keeps every committed line
  // reflected even if one line fails, and partial/full failures speak (FR-6.2 / KAN-115 /
  // SRS 4.4) instead of going silent. The cart line is keyed by the catalog variant
  // (views.py), so size is NOT sent -- it is intrinsic to the variant and shown read-only.
  async function addSelectedItemsToCart() {
    if (isAdding) return; // double-submit guard
    setPageError("");

    if (selectedItems.length === 0) {
      setPageError(
        "Select at least one equipped product before adding items to your cart.",
      );
      return;
    }

    // Synchronous contract check (see isCatalogObjectId). Runs before any network call,
    // so its error survives a reload -- unlike an async 400 that a refresh would wipe.
    const badItems = selectedItems.filter((item) => !isCatalogObjectId(item.id));
    if (badItems.length > 0) {
      const detail = badItems
        .map((item) => `${item.name} (id: ${String(item.id)})`)
        .join(", ");
      setPageError(
        `Cannot add to cart: these items don't carry a valid catalog item id yet — ${detail}. ` +
          `The cart keys each line by the catalog ObjectId, so the recommendation list ` +
          `isn't returning the catalog id in the expected field.`,
      );
      return;
    }

    setIsAdding(true);

    try {
      const results = await Promise.allSettled(
        selectedItems.map((selectedItem) =>
          cartAPI.add(selectedItem.id, selectedItem.quantity),
        ),
      );

      if (!aliveRef.current) return;

      const okCarts = results
        .filter((r) => r.status === "fulfilled")
        .map((r) => r.value);
      const failures = results
        .map((r, i) =>
          r.status === "rejected"
            ? { item: selectedItems[i], reason: r.reason }
            : null,
        )
        .filter(Boolean);

      // Confirmed-write floor from the add responses themselves (no extra GET needed).
      const fromAdds = okCarts.reduce(
        (maxCount, cart) => Math.max(maxCount, computeCartCount(cart)),
        0,
      );

      if (fromAdds > 0) {
        setCartCount(fromAdds);
        window.dispatchEvent(new Event("fitfusion-cart-updated"));
      }

      if (failures.length === 0) {
        setItemsAdded(true);
        setNotification(
          `${totalQuantity} ${
            totalQuantity === 1 ? "item was" : "items were"
          } added to your cart.`,
        );
      } else {
        const names = failures.map((f) => f.item.name).join(", ");
        const reasonMsg = failures[0]?.reason?.message || "the request failed";
        if (fromAdds > 0) {
          setPageError(
            `${fromAdds} of ${selectedItems.length} item(s) added. Could not add: ${names} (${reasonMsg}). Open the cart to confirm what landed.`,
          );
        } else {
          setPageError(
            `Could not add to cart: ${names} (${reasonMsg}).`,
          );
        }
      }

      // Authoritative refine: FORCED-fresh (never a cached pre-add snapshot), retried to
      // absorb transient 503s, and applied UPWARD only so a confirmed write is never
      // under-reported. On total failure we keep fromAdds (the real-response floor), not 0.
      let settle = null;
      try {
        const settledCart = await fetchCartFresh();
        const n = computeCartCount(settledCart);
        if (Number.isFinite(n)) settle = n;
      } catch {
        settle = null;
      }
      if (aliveRef.current && settle !== null) {
        setCartCount(Math.max(fromAdds, settle));
      }
    } catch (error) {
      // Safety net for anything outside the per-line adds (allSettled itself never
      // rejects, so this is rare); surface it rather than leaving the badge stale.
      console.error("Failed to add items to cart:", error);
      if (aliveRef.current) {
        setPageError(
          `${error?.message || "We couldn't add items to your cart."} Open the cart to confirm before retrying.`,
        );
      }
    } finally {
      setIsAdding(false);
    }
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
              disabled={isLoadingCart}
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

                  {/* FIX (Defect B): real garment photo via the catalog pipeline,
                      glyph retained only as the no-image / load-failure fallback. */}
                  <EquippedPreview
                    src={mediaUrl(item.image)}
                    alt={item.name}
                    colorCode={item.colorCode}
                  />

                  <div className="equipped-product-information">
                    <h3>{item.name}</h3>

                    <p>{item.seller}</p>

                    {/* Read-only size, matching the studio equipped card and the
                        catalog's fixed-variant add. The cart stores no size column
                        (views.py), so a dropdown here could only misrepresent what
                        is purchased. */}
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
                disabled={isAdding}
                onClick={
                  isAdding
                    ? undefined
                    : itemsAdded
                      ? openCart
                      : addSelectedItemsToCart
                }
              >
                {isAdding
                  ? "Adding…"
                  : itemsAdded
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
              Every selected product is added at its listed size and the
              quantity you set. Uncheck any garment you do not want to
              purchase.
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