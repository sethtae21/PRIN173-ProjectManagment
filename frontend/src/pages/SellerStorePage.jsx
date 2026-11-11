import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useOutletContext, useLocation } from "react-router-dom";
import { API_URL, cartAPI, catalogAPI } from "../services/api";
import { useAlphaCrop } from "../hooks/useAlphaCrop";
import "./css/SellerStorePage.css";

/* ---------------------------------------------------------------------------
   LIVE-ONLY SELLER STORE (placeholder purge)
   - The hardcoded SELLERS / PRODUCTS arrays are GONE.
   - Every rendered value derives from the live catalog payload:
       * store name        -> CatalogItem.store_name
       * seller identity   -> CatalogItem.seller (ObjectId string)
       * header stats      -> computed from the store's active listings
       * product cards     -> name / price / category / size / color / image
   - The backend exposes no seller-profile metrics endpoint, so followers /
     response-time / store rating are NOT shown at all (never faked).
   - Graceful fallbacks remain ONLY for missing assets (image chip) and for
     unreachable API (error + retry), never invented product data.
--------------------------------------------------------------------------- */

// Footwear permanently removed from the catalog.
const CATEGORIES = ["All", "Tops", "Bottoms", "Dresses", "Outerwear"];

/* ==========================================
   FIX (grid no longer looks weird):
   The previous "semi-box" gave pants/dresses a TALLER tile than tops, so
   every row ended at a different height and left big white voids (ragged,
   misaligned grid). Now EVERY card uses ONE uniform tile box, so all image
   areas are the same height and the rows line up cleanly like a normal
   catalog. The garment is drawn with object-fit: contain, so pants and
   dresses are STILL fully visible end-to-end (they just get a small, even
   side margin inside the frame instead of being cropped). Tops/outerwear are
   unchanged.
========================================== */
const CARD_BOX_ASPECT = 0.8; // one uniform tile width/height for every card
const CARD_TILE_PADDING = "8px"; // even breathing margin; never crops the cloth

function mediaUrl(path) {
  if (!path) return null;
  const value = String(path);
  if (/^(https?:|blob:|data:)/i.test(value)) return value;
  return `${API_URL}${value.startsWith("/") ? "" : "/"}${value}`;
}

function capitalize(label) {
  const text = String(label || "").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "Uncategorized";
}

function formatPeso(amount) {
  return `₱${Number(amount || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/* Map one live CatalogItem row into the shape this page renders.
   No defaults that invent data: empty backend fields stay empty. */
function mapCatalogItem(item) {
  return {
    id: String(item.id),
    name: item.name || "Unnamed product",
    description: item.description || "",
    price: Number(item.price || 0),
    category: capitalize(item.category),
    sizes: String(item.size || "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
    colors: String(item.color || "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
    colorDescription: item.color_description || "",
    colorFamily: item.color_family || "",
    sellerId: String(item.seller || item.seller_id || ""),
    sellerName: item.store_name || "Independent Store",
    image: mediaUrl(item.front_image),
    styleTags: Array.isArray(item.style_tags) ? item.style_tags : [],
    occasionTags: Array.isArray(item.occasion_tags) ? item.occasion_tags : [],
    status: item.status || "active",
  };
}

function storeInitials(name) {
  const initials = String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
  return initials || "FF";
}

/* ==========================================
   Card image: alpha-cropped garment (same pipeline as catalog / cart) drawn
   inside a UNIFORM tile box. object-fit: contain guarantees the whole garment
   (waistband to hem, sleeve to sleeve) is visible with an even margin, while
   the identical box across all cards keeps the grid rows aligned. Category
   chip on load failure / missing image.
========================================== */
function StoreCardImage({ src, alt, category }) {
  const [failed, setFailed] = useState(false);
  const cropped = useAlphaCrop(failed ? null : src);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return <span className="seller-store-card-chip">{category}</span>;
  }

  return (
    <span
      className="seller-store-card-tile"
      style={{
        display: "grid",
        placeItems: "center",
        width: "100%",
        aspectRatio: String(CARD_BOX_ASPECT), // SAME for every card -> aligned rows
        background:
          "radial-gradient(circle at center, rgba(215,175,75,0.22), transparent 48%), linear-gradient(145deg, #f8f5ef, #eadfc9)",
        overflow: "hidden",
      }}
    >
      <img
        src={cropped || src}
        alt={alt}
        onError={() => setFailed(true)}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          objectFit: "contain", // full garment visible, never cropped / stretched
          padding: CARD_TILE_PADDING,
          boxSizing: "border-box",
        }}
      />
    </span>
  );
}

function SellerStorePage({ isGuest = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { sellerId } = useParams();
  const outletContext = useOutletContext();
  const guestMode = isGuest || outletContext?.isGuest === true;
  const basePath = guestMode ? "/guest" : "/shopper";

  /* Live catalog state (replaces the PRODUCTS array) */
  const [catalogItems, setCatalogItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cartNotice, setCartNotice] = useState("");

  /* Per-item add-to-cart loading: only the clicked button shows "Adding...". */
  const [addingIds, setAddingIds] = useState(() => new Set());

  /* Store-name hand-off (product-page breadcrumb or ?store= query). Used ONLY
     when the route param cannot be matched to a live seller ObjectId. */
  const fallbackStoreName =
    location.state?.storeName ||
    new URLSearchParams(location.search).get("store") ||
    "";

  useEffect(() => {
    let isMounted = true;

    async function loadLiveCatalog() {
      setIsLoading(true);
      setError("");
      try {
        // Guest-readable, memory-cached in api.js; returns active listings.
        const data = await catalogAPI.list();
        if (!isMounted) return;
        const rows = Array.isArray(data) ? data : data?.results || [];
        setCatalogItems(
          rows
            .filter((row) => (row.status || "active") === "active")
            .map(mapCatalogItem)
        );
      } catch (err) {
        console.error("Seller store: live catalog load failed:", err);
        if (isMounted) {
          setError("Could not reach the FitFusion catalog service.");
          setCatalogItems([]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadLiveCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  /* This store's live listings. Resolution order:
     1) seller ObjectId in the route param (normal case),
     2) the param itself used as a store NAME (legacy / name-only links),
     3) the handed-off store name from router state or ?store=.
     Only when none resolve do we show the (legitimate) empty-store state. */
  const storeProducts = useMemo(() => {
    const param = String(sellerId || "");
    const byId = catalogItems.filter(
      (item) => item.sellerId && item.sellerId === param
    );
    if (byId.length) return byId;

    const byParamName = catalogItems.filter(
      (item) => item.sellerName.toLowerCase() === param.toLowerCase()
    );
    if (byParamName.length) return byParamName;

    if (fallbackStoreName) {
      const byName = catalogItems.filter(
        (item) =>
          item.sellerName.toLowerCase() === String(fallbackStoreName).toLowerCase()
      );
      if (byName.length) return byName;
    }
    return [];
  }, [catalogItems, sellerId, fallbackStoreName]);

  /* Live-derived store identity + stats (no mock profile anywhere) */
  const storeName =
    storeProducts[0]?.sellerName || fallbackStoreName || "FitFusion Store";

  const storeStats = useMemo(() => {
    const categories = new Set(storeProducts.map((product) => product.category));
    const styles = new Set();
    storeProducts.forEach((product) =>
      product.styleTags.forEach((tag) => styles.add(String(tag)))
    );
    const lowest = storeProducts.length
      ? Math.min(...storeProducts.map((product) => product.price))
      : 0;
    return {
      listings: storeProducts.length,
      categories: categories.size,
      styles: Array.from(styles).slice(0, 3),
      lowest,
    };
  }, [storeProducts]);

  const filteredProducts = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return storeProducts.filter((product) => {
      const matchesCategory =
        selectedCategory === "All" || product.category === selectedCategory;
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [storeProducts, selectedCategory, searchText]);

  useEffect(() => {
    if (!cartNotice) return undefined;
    const timeout = window.setTimeout(() => setCartNotice(""), 2500);
    return () => window.clearTimeout(timeout);
  }, [cartNotice]);

  async function handleAddToCart(product) {
    if (guestMode) {
      setCartNotice("Please log in to add items to your cart.");
      return;
    }
    const id = String(product.id);
    if (addingIds.has(id)) return;

    setAddingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    try {
      // Real MongoDB ObjectId string -> POST /cart/add_item/
      await cartAPI.addItem(product.id, 1);
      setCartNotice(`${product.name} added to your cart.`);
    } catch (err) {
      console.error("Seller store: add-to-cart failed:", err);
      setCartNotice("Could not add this item to your cart.");
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  function handleViewDetails(product) {
    navigate(`${basePath}/products/${encodeURIComponent(product.id)}`);
  }

  return (
    <main className="seller-store-page">
      {cartNotice && (
        <div className="seller-store-toast" role="status">
          {cartNotice}
        </div>
      )}

      {/* STORE HEADER — identity + stats derived from live listings only */}
      <section className="seller-store-banner">
        <div className="seller-store-banner-overlay">
          <div className="seller-store-profile">
            <div className="seller-store-avatar" aria-hidden="true">
              {storeInitials(storeName)}
            </div>
            <div>
              <h1>{storeName}</h1>
              <p>
                {storeStats.styles.length
                  ? storeStats.styles.join(" · ")
                  : "Active FitFusion seller store"}
              </p>
              <div className="seller-store-stats">
                <span>
                  {storeStats.listings} active{" "}
                  {storeStats.listings === 1 ? "listing" : "listings"}
                </span>
                <span>
                  {storeStats.categories}{" "}
                  {storeStats.categories === 1 ? "category" : "categories"}
                </span>
                {storeStats.listings > 0 && (
                  <span>From {formatPeso(storeStats.lowest)}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STORE CATALOG — live rows from GET /catalog/ */}
      <section className="seller-store-catalog">
        <div className="seller-store-toolbar">
          <div className="seller-store-search">
            <input
              type="search"
              placeholder="Search this store..."
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              aria-label="Search this store"
            />
          </div>
          <div className="seller-store-categories">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                className={selectedCategory === category ? "active" : ""}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="seller-store-loading" role="status">
            <p>Loading live listings from the FitFusion catalog…</p>
          </div>
        ) : error ? (
          <div className="seller-store-error" role="alert">
            <p>{error}</p>
            <button type="button" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        ) : storeProducts.length === 0 ? (
          <div className="seller-store-empty">
            <h2>No active listings</h2>
            <p>
              This store has not published any active products to the catalog
              yet.
            </p>
            <button type="button" onClick={() => navigate(`${basePath}/catalog`)}>
              Browse the full catalog
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="seller-store-empty">
            <h2>No matches in this store</h2>
            <p>Nothing here matches your current search or category filter.</p>
            <button
              type="button"
              onClick={() => {
                setSearchText("");
                setSelectedCategory("All");
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="seller-store-grid">
            {filteredProducts.map((product) => {
              const isAdding = addingIds.has(product.id);
              return (
                <article
                  key={product.id}
                  className="seller-store-card"
                  /* Uniform tiles already align the image row; cards hug their
                     own (now near-equal) content so there are no white voids. */
                  style={{ alignSelf: "start" }}
                >
                  <button
                    type="button"
                    className="seller-store-card-image"
                    onClick={() => handleViewDetails(product)}
                    aria-label={`View ${product.name}`}
                    style={{ display: "block", height: "auto", aspectRatio: "auto", padding: 0 }}
                  >
                    <StoreCardImage
                      src={product.image}
                      alt={product.name}
                      category={product.category}
                    />
                  </button>
                  <div className="seller-store-card-body">
                    <span className="seller-store-card-category">
                      {product.category}
                    </span>
                    <h3>{product.name}</h3>
                    <p className="seller-store-card-meta">
                      {product.sizes.length > 0 && <span>Size {product.sizes.join(" / ")}</span>}
                      {product.colors.length > 0 && <span>{product.colors.join(" / ")}</span>}
                    </p>
                    <p className="seller-store-card-price">
                      {formatPeso(product.price)}
                    </p>
                    <div className="seller-store-card-actions">
                      <button
                        type="button"
                        className="seller-store-try-on"
                        onClick={() => handleViewDetails(product)}
                      >
                        View Details
                      </button>
                      <button
                        type="button"
                        className="seller-store-add-cart"
                        onClick={() => handleAddToCart(product)}
                        disabled={isAdding}
                        aria-busy={isAdding}
                      >
                        {isAdding ? "Adding..." : "Add to Cart"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
export default SellerStorePage;