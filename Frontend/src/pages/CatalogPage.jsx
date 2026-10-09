import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useOutletContext,
} from "react-router-dom";

// Import the API service we created
import { catalogAPI } from "../services/api";

import "./css/CatalogPage.css";

// Helper to map backend categories to frontend emojis
const getCategorySymbol = (category) => {
  const lower = category?.toLowerCase() || "";
  if (lower.includes("top")) return "👚";
  if (lower.includes("bottom")) return "👖";
  if (lower.includes("dress")) return "👗";
  if (lower.includes("outerwear")) return "🧥";
  if (lower.includes("footwear")) return "👟";
  return "👕";
};

const CATEGORIES = [
  "All",
  "Tops",
  "Bottoms",
  "Dresses",
  "Outerwear",
  "Footwear",
];

const GENDERS = ["All", "Women", "Men", "Unisex"];
const SIZES = ["All", "XS", "S", "M", "L", "XL", "2XL"];

function formatPrice(price) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(price);
}

function CatalogPage({ isGuest = false }) {
  const navigate = useNavigate();
  const outletContext = useOutletContext();

  const guestMode = isGuest || outletContext?.isGuest === true;
  const basePath = guestMode ? "/guest" : "/shopper";
  const storage = guestMode ? sessionStorage : localStorage;

  // --- NEW: State for Backend Data ---
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("All");
  const [gender, setGender] = useState("All");
  const [size, setSize] = useState("All");
  const [seller, setSeller] = useState("All");
  const [maximumPrice, setMaximumPrice] = useState(2500);
  const [sortBy, setSortBy] = useState("recommended");
  const [showFilters, setShowFilters] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // --- NEW: Fetch Data from Django Backend ---
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // This calls your Django backend: GET /catalog/
        const data = await catalogAPI.getAll();
        
        // Normalize backend data to match frontend UI expectations
        const normalized = data.map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category.charAt(0).toUpperCase() + item.category.slice(1),
          gender: "Unisex", // Backend doesn't strictly enforce gender per item yet
          price: Number(item.price),
          originalPrice: Number(item.price) * 1.2, // Mock original price for UI styling
          rating: 4.5, // Mock rating (can be replaced with real ratings later)
          reviews: Math.floor(Math.random() * 200) + 10,
          sellerId: item.seller || "unknown",
          sellerName: item.store_name || "Unknown Store",
          location: "Philippines",
          symbol: getCategorySymbol(item.category),
          color: item.color,
          sizes: [item.size], // Backend currently has single size per item
          stock: 20,
          matchScore: "6/7",
          featured: false,
          front_image: item.front_image, // Keep for future image rendering
        }));
        
        setProducts(normalized);
      } catch (err) {
        console.error("Failed to fetch catalog:", err);
        setError("Failed to load products. Please check if the backend is running.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    if (!toastMessage) return undefined;
    const timer = window.setTimeout(() => setToastMessage(""), 2500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const sellerNames = useMemo(
    () => ["All", ...new Set(products.map((product) => product.sellerName))],
    [products]
  );

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const results = products.filter((product) => {
      const matchesSearch =
        !normalizedSearch ||
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.sellerName.toLowerCase().includes(normalizedSearch) ||
        product.category.toLowerCase().includes(normalizedSearch) ||
        product.color.toLowerCase().includes(normalizedSearch);

      const matchesCategory = category === "All" || product.category === category;
      const matchesGender = gender === "All" || product.gender === gender;
      const matchesSize = size === "All" || product.sizes.includes(size);
      const matchesSeller = seller === "All" || product.sellerName === seller;
      const matchesPrice = product.price <= maximumPrice;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesGender &&
        matchesSize &&
        matchesSeller &&
        matchesPrice
      );
    });

    return [...results].sort((firstProduct, secondProduct) => {
      if (sortBy === "price-low") return firstProduct.price - secondProduct.price;
      if (sortBy === "price-high") return secondProduct.price - firstProduct.price;
      if (sortBy === "rating") return secondProduct.rating - firstProduct.rating;
      if (sortBy === "newest") return secondProduct.id.localeCompare(firstProduct.id);
      
      return (
        Number(secondProduct.featured) - Number(firstProduct.featured) ||
        secondProduct.rating - firstProduct.rating
      );
    });
  }, [category, gender, maximumPrice, products, searchTerm, seller, size, sortBy]);

  const activeFilterCount = [
    category !== "All",
    gender !== "All",
    size !== "All",
    seller !== "All",
    maximumPrice < 2500,
  ].filter(Boolean).length;

  function viewProduct(product) {
    storage.setItem("fitfusion-selected-product", JSON.stringify(product));
    navigate(`${basePath}/products/${product.id}`);
  }

  function viewSeller(product) {
    storage.setItem(
      "fitfusion-selected-seller",
      JSON.stringify({
        id: product.sellerId,
        name: product.sellerName,
        location: product.location,
      })
    );
    navigate(`${basePath}/sellers/${product.sellerId}`);
  }

  function tryProduct(product) {
    const selectedItem = {
      ...product,
      quantity: 1,
      selectedSize: product.sizes[0] || null,
      selectedAt: new Date().toISOString(),
    };

    storage.setItem("fitfusion-selected-product", JSON.stringify(product));
    storage.setItem("fitfusion-selected-items", JSON.stringify([selectedItem]));
    setToastMessage(`${product.name} was sent to the Fitting Studio.`);

    window.setTimeout(() => {
      navigate(`${basePath}/fitting-studio/customize`);
    }, 600);
  }

  function resetFilters() {
    setSearchTerm("");
    setCategory("All");
    setGender("All");
    setSize("All");
    setSeller("All");
    setMaximumPrice(2500);
    setSortBy("recommended");
  }

  // --- NEW: Loading and Error States ---
  if (isLoading) {
    return (
      <main className="catalog-page">
        <div className="catalog-body" style={{ textAlign: "center", padding: "4rem" }}>
          <h2>Loading catalog...</h2>
          <p>Connecting to FitFusion AI backend.</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="catalog-page">
        <div className="catalog-body" style={{ textAlign: "center", padding: "4rem", color: "red" }}>
          <h2>⚠️ Connection Error</h2>
          <p>{error}</p>
          <p style={{ fontSize: "0.9rem", color: "#666", marginTop: "1rem" }}>
            Make sure your Django server is running on http://127.0.0.1:8000
          </p>
          <button 
            onClick={() => window.location.reload()} 
            style={{ marginTop: "1rem", padding: "0.5rem 1rem", cursor: "pointer" }}
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="catalog-page">
      <div className="catalog-body">
        <section className="catalog-introduction">
          <div>
            <p>EXPLORE YOUR STYLE</p>
            <h1>Find your next favorite outfit</h1>
            <span>
              Open a product to view its seller, ratings, available sizes, and purchasing options.
            </span>
          </div>

          <div className="catalog-result-summary">
            <strong>{filteredProducts.length}</strong>
            <span>{filteredProducts.length === 1 ? "product" : "products"}</span>
          </div>
        </section>

        <section className="catalog-search-section">
          <div className="catalog-search-box">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
            <input
              type="search"
              value={searchTerm}
              placeholder="Search products, stores, colors, or categories..."
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <button
            type="button"
            className={showFilters ? "catalog-filter-toggle active" : "catalog-filter-toggle"}
            onClick={() => setShowFilters((currentValue) => !currentValue)}
          >
            Filters
            {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
          </button>

          <select
            className="catalog-sort-select"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            aria-label="Sort products"
          >
            <option value="recommended">Recommended</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
            <option value="newest">Newest</option>
          </select>
        </section>

        <div className="catalog-category-tabs">
          {CATEGORIES.map((categoryOption) => (
            <button
              key={categoryOption}
              type="button"
              className={category === categoryOption ? "active" : ""}
              onClick={() => setCategory(categoryOption)}
            >
              {categoryOption}
            </button>
          ))}
        </div>

        {showFilters && (
          <section className="catalog-filter-panel">
            <div className="catalog-filter-heading">
              <div>
                <p>REFINE RESULTS</p>
                <h2>Product filters</h2>
              </div>
              <button type="button" onClick={resetFilters}>
                Reset all
              </button>
            </div>

            <div className="catalog-filter-grid">
              <FilterSelect label="Gender" value={gender} options={GENDERS} onChange={setGender} />
              <FilterSelect label="Size" value={size} options={SIZES} onChange={setSize} />
              <FilterSelect label="Seller" value={seller} options={sellerNames} onChange={setSeller} />

              <div className="catalog-price-filter">
                <div>
                  <label htmlFor="maximum-price">Maximum price</label>
                  <strong>{formatPrice(maximumPrice)}</strong>
                </div>
                <input
                  id="maximum-price"
                  type="range"
                  min="500"
                  max="2500"
                  step="100"
                  value={maximumPrice}
                  onChange={(event) => setMaximumPrice(Number(event.target.value))}
                />
                <div className="catalog-price-limits">
                  <span>₱500</span>
                  <span>₱2,500</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {filteredProducts.length > 0 ? (
          <section className="catalog-product-grid">
            {filteredProducts.map((product) => (
              <article key={product.id} className="catalog-product-card">
                <button
                  type="button"
                  className="catalog-product-image"
                  onClick={() => viewProduct(product)}
                >
                  {product.featured && (
                    <span className="catalog-featured-label">FEATURED</span>
                  )}
                  <div className="catalog-product-symbol">{product.symbol}</div>
                  <span className="catalog-match-score">Match score: {product.matchScore}</span>
                </button>

                <div className="catalog-product-information">
                  <button
                    type="button"
                    className="catalog-seller-link"
                    onClick={() => viewSeller(product)}
                  >
                    {product.sellerName}
                  </button>

                  <button
                    type="button"
                    className="catalog-product-name"
                    onClick={() => viewProduct(product)}
                  >
                    {product.name}
                  </button>

                  <div className="catalog-product-details">
                    <span>{product.category}</span>
                    <span>•</span>
                    <span>{product.color}</span>
                  </div>

                  <div className="catalog-rating">
                    <span>★</span>
                    <strong>{product.rating}</strong>
                    <small>({product.reviews})</small>
                  </div>

                  <div className="catalog-product-price">
                    <strong>{formatPrice(product.price)}</strong>
                    <del>{formatPrice(product.originalPrice)}</del>
                  </div>

                  <div className="catalog-product-sizes">
                    <span>Available sizes:</span>
                    <strong>{product.sizes.join(", ")}</strong>
                  </div>

                  <div className="catalog-product-actions">
                    <button
                      type="button"
                      className="catalog-view-button"
                      onClick={() => viewProduct(product)}
                    >
                      View Details
                    </button>

                    <button
                      type="button"
                      className="catalog-try-button"
                      onClick={() => tryProduct(product)}
                    >
                      Try On
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="catalog-empty-state">
            <div>⌕</div>
            <h2>No products found</h2>
            <p>
              No products match your current search and filters. Try changing the category, size,
              seller, or maximum price.
            </p>
            <button type="button" onClick={resetFilters}>
              Clear All Filters
            </button>
          </section>
        )}
      </div>

      {toastMessage && (
        <div className="catalog-toast" role="status">
          {toastMessage}
        </div>
      )}
    </main>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="catalog-filter-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default CatalogPage;