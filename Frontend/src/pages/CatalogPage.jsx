
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./css/CatalogPage.css";

/* ==========================================
   PRODUCT DATA
   Matches ProductDetailsPage
========================================== */

const products = [
  {
    id: "product-001",
    name: "Classic Linen Blouse",
    category: "Tops",
    gender: "Women",
    price: 899,
    originalPrice: 1099,
    rating: 4.8,
    ratingsCount: 128,
    sellerId: "seller-001",
    sellerName: "Aurelia Studio",
    sellerLocation: "Makati City",
    symbol: "👚",
    colors: ["Ivory", "Beige", "Black"],
    sizes: ["S", "M", "L", "XL"],
    stock: 24,
    matchScore: "6/7",
    description:
      "A lightweight linen blouse designed for everyday comfort. It features breathable fabric, a relaxed silhouette, and a clean classic finish.",
  },
  {
    id: "product-002",
    name: "Tailored Wide-Leg Trousers",
    category: "Bottoms",
    gender: "Women",
    price: 1299,
    originalPrice: 1499,
    rating: 4.7,
    ratingsCount: 94,
    sellerId: "seller-001",
    sellerName: "Aurelia Studio",
    sellerLocation: "Makati City",
    symbol: "👖",
    colors: ["Sand", "Brown", "Black"],
    sizes: ["S", "M", "L", "XL"],
    stock: 18,
    matchScore: "5/7",
    description:
      "Elegant wide-leg trousers with a structured waist and comfortable fit for casual or professional styling.",
  },
  {
    id: "product-003",
    name: "Modern Structured Blazer",
    category: "Outerwear",
    gender: "Women",
    price: 1899,
    originalPrice: 2299,
    rating: 4.9,
    ratingsCount: 76,
    sellerId: "seller-002",
    sellerName: "Maison Moderne",
    sellerLocation: "Makati City",
    symbol: "🧥",
    colors: ["Cream", "Brown", "Black"],
    sizes: ["S", "M", "L", "XL", "2XL"],
    stock: 12,
    matchScore: "7/7",
    description:
      "A polished structured blazer with a modern silhouette, suitable for smart-casual and formal outfits.",
  },
  {
    id: "product-004",
    name: "Premium Cotton Polo",
    category: "Tops",
    gender: "Men",
    price: 799,
    originalPrice: 999,
    rating: 4.6,
    ratingsCount: 82,
    sellerId: "seller-003",
    sellerName: "North & Thread",
    sellerLocation: "Quezon City",
    symbol: "👕",
    colors: ["White", "Navy", "Olive"],
    sizes: ["S", "M", "L", "XL"],
    stock: 30,
    matchScore: "6/7",
    description:
      "A soft premium cotton polo with a clean collar and comfortable everyday fit.",
  },
  {
    id: "golden-midi-dress",
    name: "Golden Midi Dress",
    category: "Dresses",
    gender: "Women",
    price: 2199,
    rating: 4.9,
    sellerId: "luna-fashion",
    sellerName: "Luna Fashion",
    sellerLocation: "Makati City",
    symbol: "👗",
    colors: ["Gold"],
    sizes: ["XS", "S", "M", "L"],
    stock: 15,
    description: "A graceful midi dress for elegant everyday styling.",
  },
  {
    id: "cream-knit-sweater",
    name: "Cream Knit Sweater",
    category: "Tops",
    gender: "Unisex",
    price: 1599,
    rating: 4.5,
    sellerId: "urban-thread",
    sellerName: "Urban Thread",
    sellerLocation: "Makati City",
    symbol: "🧶",
    colors: ["Cream"],
    sizes: ["S", "M", "L", "XL"],
    stock: 20,
    description: "A comfortable knit sweater for everyday outfits.",
  },
  {
    id: "pleated-midi-skirt",
    name: "Pleated Midi Skirt",
    category: "Bottoms",
    gender: "Women",
    price: 1299,
    rating: 4.6,
    sellerId: "maison-aurelia",
    sellerName: "Maison Aurelia",
    sellerLocation: "Makati City",
    symbol: "👗",
    colors: ["Brown"],
    sizes: ["XS", "S", "M", "L"],
    stock: 18,
    description: "A classic pleated skirt for versatile styling.",
  },
  {
    id: "classic-denim-jacket",
    name: "Classic Denim Jacket",
    category: "Outerwear",
    gender: "Unisex",
    price: 2299,
    rating: 4.8,
    sellerId: "urban-thread",
    sellerName: "Urban Thread",
    sellerLocation: "Makati City",
    symbol: "🧥",
    colors: ["Blue"],
    sizes: ["S", "M", "L", "XL"],
    stock: 16,
    description: "A classic denim jacket for casual layering.",
  },
];

const categories = [
  "All",
  "Tops",
  "Bottoms",
  "Dresses",
  "Outerwear",
];

const genders = [
  "All",
  "Women",
  "Men",
  "Unisex",
];

/* ==========================================
   HELPERS
========================================== */

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
    (total, item) =>
      total + Number(item.quantity || 1),
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

function productDetailsData(product) {
  return {
    ...product,
    category: `${product.gender} • ${product.category}`,
    storeName: product.sellerName,
    colors: product.colors,
    sizes: product.sizes,
  };
}

/* ==========================================
   CATALOG
========================================== */

function CatalogPage({ isGuest = false }) {
  const navigate = useNavigate();
  const location = useLocation();

  const guestMode =
    isGuest || location.pathname.startsWith("/guest");

  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedGender, setSelectedGender] = useState("All");
  const [sortOption, setSortOption] = useState("featured");
  const [cartCount, setCartCount] = useState(getCartCount);
  const [showRegistrationModal, setShowRegistrationModal] =
    useState(false);
  const [modalAction, setModalAction] = useState("");

  useEffect(() => {
    const updateCount = () => setCartCount(getCartCount());

    window.addEventListener(
      "fitfusion-cart-updated",
      updateCount
    );
    window.addEventListener("storage", updateCount);

    return () => {
      window.removeEventListener(
        "fitfusion-cart-updated",
        updateCount
      );
      window.removeEventListener("storage", updateCount);
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    const filtered = products.filter((product) => {
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        product.sellerName.toLowerCase().includes(query);

      const matchesCategory =
        selectedCategory === "All" ||
        product.category === selectedCategory;

      const matchesGender =
        selectedGender === "All" ||
        product.gender === selectedGender;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesGender
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortOption === "price-low")
        return a.price - b.price;

      if (sortOption === "price-high")
        return b.price - a.price;

      if (sortOption === "rating")
        return b.rating - a.rating;

      return 0;
    });
  }, [
    searchText,
    selectedCategory,
    selectedGender,
    sortOption,
  ]);

  function showGuestRestriction(action) {
    setModalAction(action);
    setShowRegistrationModal(true);
  }

  function openProductDetails(product) {
    localStorage.setItem(
      "fitfusion-selected-product",
      JSON.stringify(productDetailsData(product))
    );

    navigate(
      guestMode
        ? `/guest/products/${product.id}`
        : `/shopper/products/${product.id}`
    );
  }

  function openSellerStore(product) {
    if (guestMode) {
      showGuestRestriction(
        "view the seller's complete store"
      );
      return;
    }

    localStorage.setItem(
      "fitfusion-selected-seller",
      JSON.stringify({
        id: product.sellerId,
        name: product.sellerName,
        location: product.sellerLocation,
      })
    );

    navigate(`/shopper/sellers/${product.sellerId}`);
  }

  function addToCart(product) {
    if (guestMode) {
      showGuestRestriction("add products to your cart");
      return;
    }

    const cart = readCart();
    const existingIndex = cart.findIndex(
      (item) => item.id === product.id
    );

    const nextCart = [...cart];

    if (existingIndex >= 0) {
      nextCart[existingIndex] = {
        ...nextCart[existingIndex],
        quantity:
          Number(nextCart[existingIndex].quantity || 1) + 1,
      };
    } else {
      nextCart.push({
        ...product,
        productId: product.id,
        storeName: product.sellerName,
        quantity: 1,
        selectedSize: product.sizes[0],
        selectedColor: product.colors[0],
        selected: true,
      });
    }

    localStorage.setItem(
      "fitfusion-cart",
      JSON.stringify(nextCart)
    );

    setCartCount(getCartCount());

    window.dispatchEvent(
      new Event("fitfusion-cart-updated")
    );
  }

  function clearFilters() {
    setSearchText("");
    setSelectedCategory("All");
    setSelectedGender("All");
    setSortOption("featured");
  }

  return (
    <main className="catalog-page">
      {/* HEADER - SAME AS ORDER HISTORY */}

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
        {/* SEARCH AND FILTERS */}

        <section className="catalog-toolbar">
          <label className="catalog-search">
            <SearchIcon />
            <input
              type="search"
              value={searchText}
              placeholder="Search product, category, or store"
              onChange={(event) =>
                setSearchText(event.target.value)
              }
            />
          </label>

          <label className="catalog-filter-field">
            <span>Category</span>
            <select
              value={selectedCategory}
              onChange={(event) =>
                setSelectedCategory(event.target.value)
              }
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === "All"
                    ? "All Categories"
                    : category}
                </option>
              ))}
            </select>
          </label>

          <label className="catalog-filter-field">
            <span>Gender</span>
            <select
              value={selectedGender}
              onChange={(event) =>
                setSelectedGender(event.target.value)
              }
            >
              {genders.map((gender) => (
                <option key={gender} value={gender}>
                  {gender === "All"
                    ? "All Genders"
                    : gender}
                </option>
              ))}
            </select>
          </label>

          <label className="catalog-filter-field">
            <span>Sort By</span>
            <select
              value={sortOption}
              onChange={(event) =>
                setSortOption(event.target.value)
              }
            >
              <option value="featured">Featured</option>
              <option value="rating">Highest Rating</option>
              <option value="price-low">
                Price: Low to High
              </option>
              <option value="price-high">
                Price: High to Low
              </option>
            </select>
          </label>
        </section>

        {/* RESULT COUNT */}

        <div className="catalog-result-row">
          <p>
            Showing <strong>{filteredProducts.length}</strong>{" "}
            {filteredProducts.length === 1
              ? "product"
              : "products"}
          </p>

          {(searchText ||
            selectedCategory !== "All" ||
            selectedGender !== "All") && (
            <button
              type="button"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          )}
        </div>

        {/* PRODUCTS */}

        {filteredProducts.length > 0 ? (
          <section className="catalog-product-grid">
            {filteredProducts.map((product) => (
              <article
                key={product.id}
                className="catalog-product-card"
              >
                <button
                  type="button"
                  className="catalog-product-preview"
                  onClick={() =>
                    openProductDetails(product)
                  }
                  aria-label={`View ${product.name}`}
                >
                  <span
                    className="catalog-product-emoji"
                    role="img"
                    aria-label={product.name}
                  >
                    {product.symbol}
                  </span>
                </button>

                <div className="catalog-product-content">
                  <div className="catalog-product-tags">
                    <span>{product.category}</span>
                    <span>{product.gender}</span>
                  </div>

                  <h2>{product.name}</h2>

                  <button
                    type="button"
                    className="catalog-store-link"
                    onClick={() =>
                      openSellerStore(product)
                    }
                  >
                    {product.sellerName}
                  </button>

                  <div className="catalog-rating">
                    <StarIcon />
                    <strong>
                      {product.rating.toFixed(1)}
                    </strong>
                    {product.ratingsCount && (
                      <small>
                        ({product.ratingsCount})
                      </small>
                    )}
                  </div>

                  <div className="catalog-product-footer">
                    <div className="catalog-price-group">
                      <strong className="catalog-price">
                        {formatCurrency(product.price)}
                      </strong>

                      {product.originalPrice && (
                        <del>
                          {formatCurrency(
                            product.originalPrice
                          )}
                        </del>
                      )}
                    </div>

                    <button
                      type="button"
                      className="catalog-details-button"
                      onClick={() =>
                        openProductDetails(product)
                      }
                    >
                      View Details
                    </button>
                  </div>

                  <button
                    type="button"
                    className="catalog-cart-action"
                    onClick={() => addToCart(product)}
                  >
                    {guestMode
                      ? "Register to Add to Cart"
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

            <p>
              Try another search term or clear your filters.
            </p>

            <button
              type="button"
              onClick={clearFilters}
            >
              Clear All Filters
            </button>
          </section>
        )}
      </div>

      {/* GUEST RESTRICTION MODAL */}

      {showRegistrationModal && (
        <div
          className="catalog-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setShowRegistrationModal(false);
            }
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
              onClick={() =>
                setShowRegistrationModal(false)
              }
              aria-label="Close"
            >
              ×
            </button>

            <p className="catalog-modal-label">
              REGISTRATION REQUIRED
            </p>

            <h2 id="catalog-modal-title">
              Create an account to continue
            </h2>

            <p>
              Guest users may browse the catalog.
              Please create an account or log in
              to {modalAction}.
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
              onClick={() =>
                setShowRegistrationModal(false)
              }
            >
              Continue Browsing
            </button>
          </section>
        </div>
      )}
    </main>
  );
}

/* ==========================================
   ICONS
========================================== */

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

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 2.8 2.8 5.7 6.3.9-4.5 4.4 1 6.2-5.6-3-5.6 3 1-6.2-4.5-4.4 6.3-.9L12 2.8Z" />
    </svg>
  );
}

export default CatalogPage;
