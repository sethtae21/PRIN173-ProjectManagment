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

// Helper to construct image URLs exactly like the Seller page does
function mediaUrl(path) {
  if (!path) return null;
  if (String(path).startsWith("http")) return path;
  return `${API_URL}${String(path).startsWith("/") ? "" : "/"}${path}`;
}

function readCart() {
  try {
    const saved = localStorage.getItem("fitfusion-cart");
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getCartCount() {
  return readCart().reduce(
    (total, item) => total + Number(item.quantity || 1),
    0
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
  const [sortOption, setSortOption] = useState("featured");
  const [cartCount, setCartCount] = useState(getCartCount());
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartError, setCartError] = useState("");
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [modalAction, setModalAction] = useState("");

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

  useEffect(() => {
    const updateCount = () => setCartCount(getCartCount());
    window.addEventListener("fitfusion-cart-updated", updateCount);
    window.addEventListener("storage", updateCount);
    return () => {
      window.removeEventListener("fitfusion-cart-updated", updateCount);
      window.removeEventListener("storage", updateCount);
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    const filtered = products.filter((product) => {
      const matchesSearch =
        !query ||
        String(product.name || "").toLowerCase().includes(query) ||
        String(product.displayCategory || "").toLowerCase().includes(query) ||
        String(product.store_name || "").toLowerCase().includes(query);

      const matchesCategory =
        selectedCategory === "All" ||
        product.displayCategory === selectedCategory;

      return matchesSearch && matchesCategory;
    });

    return [...filtered].sort((a, b) => {
      if (sortOption === "price-low") return a.price - b.price;
      if (sortOption === "price-high") return b.price - a.price;
      return 0;
    });
  }, [products, searchText, selectedCategory, sortOption]);

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

  async function addToCart(product) {
    if (guestMode) {
      showGuestRestriction("add products to your cart");
      return;
    }

    setAddingToCart(true);
    setCartError("");

    try {
      // ✅ FIX: api.js exposes cartAPI.add(catalog_item, quantity) — there is
      // no "addItem" method. The old call threw TypeError, so the server-side
      // cart (POST /cart/add_item/, FR-6.2) was never updated and the badge
      // stayed at 0.
      await cartAPI.add(product.id, 1);

      const cart = readCart();
      const existingIndex = cart.findIndex((item) => item.id === product.id);
      const nextCart = [...cart];

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
          selectedSize: "M",
          selectedColor: product.color || "Default",
          selected: true,
        });
      }

      localStorage.setItem("fitfusion-cart", JSON.stringify(nextCart));
      setCartCount(getCartCount());
      window.dispatchEvent(new Event("fitfusion-cart-updated"));
    } catch (error) {
      console.error("Failed to save cart item:", error);
      setCartError("We couldn't add this item to your cart. Please try again.");
    } finally {
      setAddingToCart(false);
    }
  }

  function clearFilters() {
    setSearchText("");
    setSelectedCategory("All");
    setSortOption("featured");
  }

  return (
    <main className="catalog-page">
      {!guestMode && (
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
            <span>Sort By</span>
            <select
              value={sortOption}
              onChange={(event) => setSortOption(event.target.value)}
            >
              <option value="featured">Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
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
            sortOption !== "featured") && (
            <button type="button" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>

        {cartError && (
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
            {filteredProducts.map((product) => (
              <article key={product.id} className="catalog-product-card">
                <button
                  type="button"
                  className="catalog-product-preview"
                  onClick={() => openProductDetails(product)}
                  aria-label={`View ${product.name}`}
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

                  <button
                    type="button"
                    className="catalog-store-link"
                    onClick={() => openSellerStore(product)}
                  >
                    {product.store_name || "FitFusion Store"}
                  </button>

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
                </div>
              </article>
            ))}
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

      {showRegistrationModal && (
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