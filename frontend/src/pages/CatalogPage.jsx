import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_URL, cartAPI, catalogAPI } from "../services/api";
import { useAlphaCrop } from "../hooks/useAlphaCrop";
import "./css/CatalogPage.css";

const categories = [
  "All",
  "Tops",
  "Bottoms",
  "Dresses",
  "Outerwear",
  "Footwear",
];

// Size filter entries rendered inside the "Filter By" dropdown.
// KAN-FIX: the store only stocks S, M, L — XS / XL / XXL removed.
const SIZE_FILTERS = [
  { value: "S", label: "Size: Small" },
  { value: "M", label: "Size: Medium" },
  { value: "L", label: "Size: Large" },
];

// === ADD-TO-OUTFIT PICKER HANDSHAKE (FR-5.7 edit / KAN-69-115) =============
// The outfit editor sets EDIT_MODE_KEY immediately before navigating here;
// we CONSUME it on mount (remove) so a refresh or a later normal visit is
// never accidentally in picker mode. Picks accumulate in a per-outfit queue
// key; the editor applies that queue only when arrived-at via router state
// from our "Back to Outfit" button (leak-proof commit). Mirrors the studio's
// pending-item discipline, hardened for multi-pick. Class names for the
// banner / picked states live in CatalogPage.css (appended picker block).
const EDIT_MODE_KEY = "fitfusion-edit-outfit-mode";
const RETURN_KEY_PREFIX = "fitfusion-edit-outfit-return-";

function readSessionJSON(key) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSessionJSON(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: picker degrades to in-memory only */
  }
}

function removeSession(key) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

// Helper to construct image URLs exactly like the Seller page does
function mediaUrl(path) {
  if (!path) return null;
  if (String(path).startsWith("http")) return path;
  return `${API_URL}${String(path).startsWith("/") ? "" : "/"}${path}`;
}

// Legacy client mirror. RETAINED only for backward compatibility with any page that
// still reads localStorage 'fitfusion-cart'; the badge itself is now server-derived
// (KAN-69), so this no longer drives the UI count. A future pass that confirms every
// reader is server-based can delete this and the mirror write in addToCart.
function readCart() {
  try {
    const saved = localStorage.getItem("fitfusion-cart");
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Server cart is the source of truth (FR-6.1/6.2). Badge = sum of line quantities, the
// identical formula used by SavedOutfitsPage / EditSavedOutfitPage and justified by
// commerce/views.py (CartItem stores cart/item/quantity; quantity is the unit count).
function computeCartCount(cart) {
  const items = Array.isArray(cart?.items) ? cart.items : [];
  return items.reduce(
    (sum, item) => sum + Math.max(1, Number(item.quantity) || 1),
    0,
  );
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

/* ==========================================
   FIX (garment not centered in card):
   rembg PNGs carry uneven transparent margins, so centering the raw canvas
   leaves the garment sitting high/low inside the frame. CatalogPreview runs
   every asset through the shared useAlphaCrop pipeline (hole-repair + union
   crop of all garment components) so the GARMENT is what gets centered and
   maximized. Falls back to the category placeholder chip on load failure.
========================================== */
function CatalogPreview({ src, alt, category }) {
  const [failed, setFailed] = useState(false);
  const cropped = useAlphaCrop(failed ? null : src);

  if (!src || failed) {
    return (
      <div className="catalog-product-placeholder">
        <span className="catalog-placeholder-category">{category}</span>
      </div>
    );
  }

  return (
    <img
      src={cropped || src}
      alt={alt}
      className="catalog-product-image"
      onError={() => setFailed(true)}
    />
  );
}

function CatalogPage({ isGuest = false }) {
  const navigate = useNavigate();
  const location = useLocation();

  const guestMode = isGuest || location.pathname.startsWith("/guest");

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  // Single "Filter By" control: price options sort the grid,
  // size options filter the grid, "all" shows everything unsorted.
  const [filterOption, setFilterOption] = useState("all");
  const [cartCount, setCartCount] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartError, setCartError] = useState("");
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [modalAction, setModalAction] = useState("");

  // === picker-mode state (only populated when launched from the editor) ====
  const [editMode, setEditMode] = useState(false);
  const [editOutfit, setEditOutfit] = useState(null); // {id, name}
  const [pickedIds, setPickedIds] = useState([]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    async function fetchProducts() {
      try {
        const data = await catalogAPI.list();
        if (isMounted) {
          const normalized = Array.isArray(data)
            ? data.map((p) => ({
                ...p,
                displayCategory: p.category
                  ? p.category.charAt(0).toUpperCase() + p.category.slice(1)
                  : "Item",
                // FIX: Use the mediaUrl helper to ensure correct path
                imageUrl: mediaUrl(p.front_image),
                rating: 0,
                ratingsCount: 0,
              }))
            : [];
          setProducts(normalized);
        }
      } catch (err) {
        console.error("Failed to load catalog:", err);
        if (isMounted) setProducts([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  // === consume the editor's one-shot mode key on mount =====================
  // Removing it here guarantees a refresh / later normal visit is NOT in
  // picker mode. Any pre-existing queue for that outfit is restored into
  // local state so a mid-session reload of the catalog keeps the count.
  useEffect(() => {
    const mode = readSessionJSON(EDIT_MODE_KEY);
    if (!mode || !mode.id) return;

    removeSession(EDIT_MODE_KEY); // consume immediately

    const id = String(mode.id);
    setEditMode(true);
    setEditOutfit({ id, name: String(mode.name || "your outfit") });

    const queued = readSessionJSON(RETURN_KEY_PREFIX + id);
    setPickedIds(Array.isArray(queued) ? queued.map(String).filter(Boolean) : []);
  }, []);

  // === badge from the SERVER (KAN-69), guest-guarded =======================
  // FIX: the previous badge read a localStorage mirror, so it (a) disagreed with the
  // server-truth pages (Saved Outfits / Edit / Select-Items) and (b) never updated when
  // another page added to the cart. We now read /cart/ and re-read on the same event the
  // other pages dispatch. GUEST GUARD is mandatory: /cart/ is IsAuthenticated, and an
  // unguarded mount fetch by a guest would 401 -> silent-refresh fail -> clearSession +
  // redirect to /login, bouncing every guest off /guest/catalog. The storage listener is
  // kept so a cross-tab mirror write still triggers a server re-read (cross-tab sync),
  // but the VALUE always comes from the server, never from localStorage.
  useEffect(() => {
    if (guestMode) return undefined;

    let active = true;

    async function refreshCartCount() {
      try {
        const cart = await cartAPI.get();
        if (active) setCartCount(computeCartCount(cart));
      } catch {
        if (active) setCartCount(0);
      }
    }

    refreshCartCount();

    window.addEventListener("fitfusion-cart-updated", refreshCartCount);
    window.addEventListener("storage", refreshCartCount);

    return () => {
      active = false;
      window.removeEventListener("fitfusion-cart-updated", refreshCartCount);
      window.removeEventListener("storage", refreshCartCount);
    };
  }, [guestMode]);

  const filteredProducts = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    // If the chosen filter option is one of the size codes, apply size filtering.
    const selectedSize = SIZE_FILTERS.some((s) => s.value === filterOption)
      ? filterOption
      : null;

    const filtered = products.filter((product) => {
      const matchesSearch =
        !query ||
        String(product.name || "").toLowerCase().includes(query) ||
        String(product.displayCategory || "").toLowerCase().includes(query) ||
        String(product.store_name || "").toLowerCase().includes(query);

      const matchesCategory =
        selectedCategory === "All" ||
        product.displayCategory === selectedCategory;

      const matchesSize =
        !selectedSize ||
        String(product.size || "").toUpperCase() === selectedSize;

      return matchesSearch && matchesCategory && matchesSize;
    });

    // Price options restored: they sort the (already filtered) result set.
    return [...filtered].sort((a, b) => {
      if (filterOption === "price-low") return a.price - b.price;
      if (filterOption === "price-high") return b.price - a.price;
      return 0;
    });
  }, [products, searchText, selectedCategory, filterOption]);

  function showGuestRestriction(action) {
    setModalAction(action);
    setShowRegistrationModal(true);
  }

  function openProductDetails(product) {
    localStorage.setItem("fitfusion-selected-product-id", product.id);
    navigate(
      guestMode
        ? `/guest/products/${product.id}`
        : `/shopper/products/${product.id}`
    );
  }

  function openSellerStore(product) {
    if (guestMode) {
      showGuestRestriction("view the seller's complete store");
      return;
    }
    console.log("Viewing store for:", product.store_name);
  }

  // === picker actions (edit mode only) ====================================
  function pickForOutfit(product) {
    if (!editMode || !editOutfit) return;
    const id = String(product.id);
    if (!id) return;

    setPickedIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      writeSessionJSON(RETURN_KEY_PREFIX + editOutfit.id, next);
      return next;
    });
  }

  function clearSelection() {
    setPickedIds([]);
    if (editOutfit) removeSession(RETURN_KEY_PREFIX + editOutfit.id);
  }

  function backToOutfit() {
    if (!editOutfit) return;
    // Commit gesture: navigate WITH router state so the editor knows to apply
    // the queue (a normal mount would discard it -> leak-proof).
    navigate(
      `/shopper/saved-outfits/${encodeURIComponent(editOutfit.id)}/edit`,
      { state: { returnedFromCatalog: true, outfitId: editOutfit.id } }
    );
  }

  async function addToCart(product) {
    if (guestMode) {
      showGuestRestriction("add products to your cart");
      return;
    }

    setAddingToCart(true);
    setCartError("");

    try {
      // ✅ FIX: api.js exposes cartAPI.add(catalog_item, quantity) — there is
      // no "addItem"/"getCart" method. The add returns the serialized cart, so the
      // badge is set from server truth with no extra round-trip (single add, no
      // concurrency here). The catalog is per-variant (FR-3.2/FR-4.1) and the cart
      // line is keyed by the variant (views.py), so no size is sent -- the listing's
      // size is intrinsic to product.id.
      //
      // NOTE (parse fix): the server response is `cart`; the legacy localStorage
      // array is `mirror`. They MUST be distinct identifiers -- a prior draft
      // declared `const cart` twice in this scope, which is a SyntaxError that
      // broke the whole Vite build (App imports this module), not just the catalog.
      const cart = await cartAPI.add(product.id, 1);
      setCartCount(computeCartCount(cart));

      // Legacy mirror retained for backward compatibility only (see readCart note);
      // it no longer feeds the badge.
      const mirror = readCart();
      const existingIndex = mirror.findIndex((item) => item.id === product.id);
      const nextCart = [...mirror];

      if (existingIndex >= 0) {
        nextCart[existingIndex] = {
          ...nextCart[existingIndex],
          quantity: Number(nextCart[existingIndex].quantity || 1) + 1,
        };
      } else {
        nextCart.push({
          id: product.id,
          name: product.name,
          price: product.price,
          storeName: product.store_name,
          imageUrl: product.imageUrl,
          quantity: 1,
          // FIX: carry the listing's real size instead of hardcoding "M"
          selectedSize: product.size || "M",
          selectedColor: product.color || "Default",
          selected: true,
        });
      }

      localStorage.setItem("fitfusion-cart", JSON.stringify(nextCart));
      window.dispatchEvent(new Event("fitfusion-cart-updated"));
    } catch (error) {
      console.error("Failed to save cart item:", error);
      // ✅ FIX: Show the real server error reason instead of generic message.
      const reason = error?.fieldMessages?.()?.[0] || error?.message || "";
      setCartError(
        reason
          ? `We couldn't add this item to your cart. (${reason})`
          : "We couldn't add this item to your cart. Please try again."
      );
    } finally {
      setAddingToCart(false);
    }
  }

  function clearFilters() {
    setSearchText("");
    setSelectedCategory("All");
    setFilterOption("all");
  }

  return (
    <main className="catalog-page">
      {!guestMode && !editMode && (
        <header className="catalog-top-header">
          <button
            type="button"
            className="catalog-header-cart"
            onClick={() => navigate("/shopper/cart")}
            aria-label={`Open shopping cart with ${cartCount} items`}
          >
            <CartIcon />
            <strong>{cartCount}</strong>
          </button>
        </header>
      )}

      <div className="catalog-main-content">
        {/* === picker banner (edit mode only; styled via .catalog-edit-banner) == */}
        {editMode && editOutfit && (
          <div className="catalog-edit-banner" role="status">
            <div className="catalog-edit-banner-text">
              <strong>Picking garments for “{editOutfit.name}”</strong>
              <span>
                <span className="catalog-edit-count">{pickedIds.length}</span>
                selected · press Back to Outfit to apply, then Save Changes in
                the editor.
              </span>
            </div>
            <div className="catalog-edit-banner-actions">
              <button
                type="button"
                className="catalog-edit-clear"
                onClick={clearSelection}
                disabled={pickedIds.length === 0}
              >
                Clear selection
              </button>
              <button
                type="button"
                className="catalog-edit-commit"
                onClick={backToOutfit}
                disabled={pickedIds.length === 0}
              >
                Back to Outfit ({pickedIds.length})
              </button>
            </div>
          </div>
        )}

        <section className="catalog-toolbar">
          <label className="catalog-search">
            <SearchIcon />
            <input
              type="search"
              value={searchText}
              placeholder="Search product, category, or store"
              onChange={(event) => setSearchText(event.target.value)}
            />
          </label>

          <label className="catalog-filter-field">
            <span>Category</span>
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === "All" ? "All Categories" : category}
                </option>
              ))}
            </select>
          </label>

          <label className="catalog-filter-field">
            <span>Filter By</span>
            <select
              value={filterOption}
              onChange={(event) => setFilterOption(event.target.value)}
            >
              <option value="all">All Sizes</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              {SIZE_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </section>

        <div className="catalog-result-row">
          <p>
            {isLoading
              ? "Loading catalog..."
              : `Showing ${filteredProducts.length} products`}
          </p>
          {(searchText ||
            selectedCategory !== "All" ||
            filterOption !== "all") && (
            <button type="button" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>

        {cartError && !editMode && (
          <p className="catalog-cart-error" role="alert">
            {cartError}
          </p>
        )}

        {isLoading ? (
          <div className="catalog-loading-state">
            <p>Browsing the latest collections...</p>
          </div>
        ) : filteredProducts.length > 0 ? (
          <section className="catalog-product-grid">
            {filteredProducts.map((product) => {
              const isPicked =
                editMode && pickedIds.includes(String(product.id));
              const previewMode = editMode
                ? isPicked
                  ? "added"
                  : "add"
                : "view";

              return (
                <article
                  key={product.id}
                  className={
                    isPicked
                      ? "catalog-product-card is-picked"
                      : "catalog-product-card"
                  }
                >
                  <button
                    type="button"
                    className="catalog-product-preview"
                    data-mode={previewMode}
                    onClick={() =>
                      editMode
                        ? pickForOutfit(product)
                        : openProductDetails(product)
                    }
                    aria-label={
                      editMode
                        ? `Add ${product.name} to outfit`
                        : `View ${product.name}`
                    }
                  >
                    {/* Alpha-cropped, centered garment preview with a clean
                        placeholder fallback (no DOM sibling hacks). */}
                    <CatalogPreview
                      src={product.imageUrl}
                      alt={product.name}
                      category={product.displayCategory}
                    />
                  </button>

                  <div className="catalog-product-content">
                    <div className="catalog-product-tags">
                      <span>{product.displayCategory}</span>
                      {product.color_family && <span>{product.color_family}</span>}
                    </div>

                    <h2>{product.name}</h2>

                    {!editMode && (
                      <button
                        type="button"
                        className="catalog-store-link"
                        onClick={() => openSellerStore(product)}
                      >
                        {product.store_name || "FitFusion Store"}
                      </button>
                    )}

                    {editMode ? (
                      // === picker footer: compact Add/Added control ==========
                      <div className="catalog-product-footer">
                        <div className="catalog-price-group">
                          <strong className="catalog-price">
                            {formatCurrency(product.price)}
                          </strong>
                        </div>
                        <button
                          type="button"
                          className={
                            isPicked
                              ? "catalog-edit-add picked"
                              : "catalog-edit-add"
                          }
                          onClick={() => pickForOutfit(product)}
                          disabled={isPicked}
                        >
                          {isPicked ? "Added ✓" : "Add to Outfit"}
                        </button>
                      </div>
                    ) : (
                      <div className="catalog-product-footer">
                        <div className="catalog-price-group">
                          <strong className="catalog-price">
                            {formatCurrency(product.price)}
                          </strong>
                        </div>

                        <button
                          type="button"
                          className="catalog-details-button"
                          onClick={() => openProductDetails(product)}
                        >
                          View Details
                        </button>
                      </div>
                    )}

                    {!editMode && (
                      <button
                        type="button"
                        className="catalog-cart-action"
                        onClick={() => addToCart(product)}
                        disabled={addingToCart}
                      >
                        {guestMode
                          ? "Register to Add to Cart"
                          : addingToCart
                            ? "Adding..."
                            : "Add to Cart"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="catalog-empty-state">
            <div className="catalog-empty-icon">
              <SearchIcon />
            </div>
            <h2>No products found</h2>
            <p>Try another search term or clear your filters.</p>
            <button type="button" onClick={clearFilters}>
              Clear All Filters
            </button>
          </section>
        )}
      </div>

      {showRegistrationModal && !editMode && (
        <div
          className="catalog-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget)
              setShowRegistrationModal(false);
          }}
        >
          <section
            className="catalog-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="catalog-modal-title"
          >
            <button
              type="button"
              className="catalog-modal-close"
              onClick={() => setShowRegistrationModal(false)}
              aria-label="Close"
            >
              ×
            </button>
            <p className="catalog-modal-label">REGISTRATION REQUIRED</p>
            <h2 id="catalog-modal-title">Create an account to continue</h2>
            <p>
              Guest users may browse the catalog. Please create an account or
              log in to {modalAction}.
            </p>
            <div className="catalog-modal-actions">
              <button
                type="button"
                className="catalog-modal-primary"
                onClick={() => navigate("/signup")}
              >
                Create Account
              </button>
              <button
                type="button"
                className="catalog-modal-secondary"
                onClick={() => navigate("/login")}
              >
                Log In
              </button>
            </div>
            <button
              type="button"
              className="catalog-modal-cancel"
              onClick={() => setShowRegistrationModal(false)}
            >
              Continue Browsing
            </button>
          </section>
        </div>
      )}
    </main>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 7H6" />
      <circle cx="10" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m16 16 5 5" />
    </svg>
  );
}

export default CatalogPage;