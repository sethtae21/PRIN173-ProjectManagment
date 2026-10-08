import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useOutletContext,
} from "react-router-dom";

import "./css/CatalogPage.css";

const PRODUCTS = [
  {
    id: "product-001",
    name: "Classic Linen Blouse",
    category: "Tops",
    gender: "Women",
    price: 899,
    originalPrice: 1099,
    rating: 4.8,
    reviews: 128,
    sellerId: "seller-001",
    sellerName: "Aurelia Studio",
    location: "Makati City",
    symbol: "👚",
    color: "Ivory",
    sizes: ["S", "M", "L", "XL"],
    stock: 24,
    matchScore: "6/7",
    featured: true,
  },
  {
    id: "product-002",
    name: "Tailored Wide-Leg Trousers",
    category: "Bottoms",
    gender: "Women",
    price: 1299,
    originalPrice: 1499,
    rating: 4.7,
    reviews: 96,
    sellerId: "seller-001",
    sellerName: "Aurelia Studio",
    location: "Makati City",
    symbol: "👖",
    color: "Black",
    sizes: ["S", "M", "L", "XL"],
    stock: 18,
    matchScore: "6/7",
    featured: false,
  },
  {
    id: "product-003",
    name: "Modern Structured Blazer",
    category: "Outerwear",
    gender: "Unisex",
    price: 1899,
    originalPrice: 2299,
    rating: 4.9,
    reviews: 212,
    sellerId: "seller-002",
    sellerName: "Maison Moderne",
    location: "Quezon City",
    symbol: "🧥",
    color: "Beige",
    sizes: [
      "S",
      "M",
      "L",
      "XL",
      "2XL",
    ],
    stock: 12,
    matchScore: "7/7",
    featured: true,
  },
  {
    id: "product-004",
    name: "Premium Cotton Polo",
    category: "Tops",
    gender: "Men",
    price: 799,
    originalPrice: 999,
    rating: 4.6,
    reviews: 75,
    sellerId: "seller-003",
    sellerName: "North & Thread",
    location: "Pasig City",
    symbol: "👕",
    color: "Navy Blue",
    sizes: [
      "S",
      "M",
      "L",
      "XL",
      "2XL",
    ],
    stock: 31,
    matchScore: "6/7",
    featured: false,
  },
  {
    id: "product-005",
    name: "Pleated Midi Dress",
    category: "Dresses",
    gender: "Women",
    price: 1499,
    originalPrice: 1799,
    rating: 4.8,
    reviews: 164,
    sellerId: "seller-004",
    sellerName: "Élan Collective",
    location: "Taguig City",
    symbol: "👗",
    color: "Champagne",
    sizes: [
      "XS",
      "S",
      "M",
      "L",
      "XL",
    ],
    stock: 16,
    matchScore: "7/7",
    featured: true,
  },
  {
    id: "product-006",
    name: "Relaxed Utility Jacket",
    category: "Outerwear",
    gender: "Unisex",
    price: 1599,
    originalPrice: 1899,
    rating: 4.5,
    reviews: 68,
    sellerId: "seller-003",
    sellerName: "North & Thread",
    location: "Pasig City",
    symbol: "🥼",
    color: "Olive",
    sizes: ["M", "L", "XL", "2XL"],
    stock: 20,
    matchScore: "5/7",
    featured: false,
  },
  {
    id: "product-007",
    name: "High-Waist A-Line Skirt",
    category: "Bottoms",
    gender: "Women",
    price: 999,
    originalPrice: 1199,
    rating: 4.7,
    reviews: 84,
    sellerId: "seller-004",
    sellerName: "Élan Collective",
    location: "Taguig City",
    symbol: "👗",
    color: "Mocha",
    sizes: ["XS", "S", "M", "L"],
    stock: 14,
    matchScore: "6/7",
    featured: false,
  },
  {
    id: "product-008",
    name: "Straight-Cut Denim Jeans",
    category: "Bottoms",
    gender: "Unisex",
    price: 1199,
    originalPrice: 1399,
    rating: 4.6,
    reviews: 143,
    sellerId: "seller-005",
    sellerName: "Streetform Manila",
    location: "Manila",
    symbol: "👖",
    color: "Dark Blue",
    sizes: [
      "S",
      "M",
      "L",
      "XL",
      "2XL",
    ],
    stock: 27,
    matchScore: "6/7",
    featured: false,
  },
];

const CATEGORIES = [
  "All",
  "Tops",
  "Bottoms",
  "Dresses",
  "Outerwear",
];

const GENDERS = [
  "All",
  "Women",
  "Men",
  "Unisex",
];

const SIZES = [
  "All",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "2XL",
];

function formatPrice(price) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(price);
}

function CatalogPage({
  isGuest = false,
}) {
  const navigate = useNavigate();
  const outletContext = useOutletContext();

  const guestMode =
    isGuest ||
    outletContext?.isGuest === true;

  const basePath = guestMode
    ? "/guest"
    : "/shopper";

  const storage = guestMode
    ? sessionStorage
    : localStorage;

  const [searchTerm, setSearchTerm] =
    useState("");

  const [category, setCategory] =
    useState("All");

  const [gender, setGender] =
    useState("All");

  const [size, setSize] =
    useState("All");

  const [seller, setSeller] =
    useState("All");

  const [
    maximumPrice,
    setMaximumPrice,
  ] = useState(2500);

  const [sortBy, setSortBy] =
    useState("recommended");

  const [showFilters, setShowFilters] =
    useState(false);

  const [
    toastMessage,
    setToastMessage,
  ] = useState("");

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, []);

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setToastMessage("");
    }, 2500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toastMessage]);

  const sellerNames = useMemo(
    () => [
      "All",
      ...new Set(
        PRODUCTS.map(
          (product) =>
            product.sellerName
        )
      ),
    ],
    []
  );

  const filteredProducts = useMemo(() => {
    const normalizedSearch =
      searchTerm.trim().toLowerCase();

    const results = PRODUCTS.filter(
      (product) => {
        const matchesSearch =
          !normalizedSearch ||
          product.name
            .toLowerCase()
            .includes(normalizedSearch) ||
          product.sellerName
            .toLowerCase()
            .includes(normalizedSearch) ||
          product.category
            .toLowerCase()
            .includes(normalizedSearch) ||
          product.color
            .toLowerCase()
            .includes(normalizedSearch);

        const matchesCategory =
          category === "All" ||
          product.category === category;

        const matchesGender =
          gender === "All" ||
          product.gender === gender;

        const matchesSize =
          size === "All" ||
          product.sizes.includes(size);

        const matchesSeller =
          seller === "All" ||
          product.sellerName === seller;

        const matchesPrice =
          product.price <= maximumPrice;

        return (
          matchesSearch &&
          matchesCategory &&
          matchesGender &&
          matchesSize &&
          matchesSeller &&
          matchesPrice
        );
      }
    );

    return [...results].sort(
      (firstProduct, secondProduct) => {
        if (sortBy === "price-low") {
          return (
            firstProduct.price -
            secondProduct.price
          );
        }

        if (sortBy === "price-high") {
          return (
            secondProduct.price -
            firstProduct.price
          );
        }

        if (sortBy === "rating") {
          return (
            secondProduct.rating -
            firstProduct.rating
          );
        }

        if (sortBy === "newest") {
          return secondProduct.id.localeCompare(
            firstProduct.id
          );
        }

        return (
          Number(
            secondProduct.featured
          ) -
            Number(
              firstProduct.featured
            ) ||
          secondProduct.rating -
            firstProduct.rating
        );
      }
    );
  }, [
    category,
    gender,
    maximumPrice,
    searchTerm,
    seller,
    size,
    sortBy,
  ]);

  const activeFilterCount = [
    category !== "All",
    gender !== "All",
    size !== "All",
    seller !== "All",
    maximumPrice < 2500,
  ].filter(Boolean).length;

  function viewProduct(product) {
    storage.setItem(
      "fitfusion-selected-product",
      JSON.stringify(product)
    );

    navigate(
      `${basePath}/products/${product.id}`
    );
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

    navigate(
      `${basePath}/sellers/${product.sellerId}`
    );
  }

  function tryProduct(product) {
    const selectedItem = {
      ...product,
      quantity: 1,
      selectedSize: null,
      selectedAt:
        new Date().toISOString(),
    };

    storage.setItem(
      "fitfusion-selected-product",
      JSON.stringify(product)
    );

    storage.setItem(
      "fitfusion-selected-items",
      JSON.stringify([selectedItem])
    );

    setToastMessage(
      `${product.name} was sent to the Fitting Studio.`
    );

    window.setTimeout(() => {
      navigate(
        `${basePath}/fitting-studio/customize`
      );
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

  return (
    <main className="catalog-page">
      <div className="catalog-body">
        <section className="catalog-introduction">
          <div>
            <p>EXPLORE YOUR STYLE</p>

            <h1>
              Find your next favorite outfit
            </h1>

            <span>
              Open a product to view its
              seller, ratings, available
              sizes, and purchasing options.
            </span>
          </div>

          <div className="catalog-result-summary">
            <strong>
              {filteredProducts.length}
            </strong>

            <span>
              {filteredProducts.length === 1
                ? "product"
                : "products"}
            </span>
          </div>
        </section>

        <section className="catalog-search-section">
          <div className="catalog-search-box">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                cx="11"
                cy="11"
                r="7"
              />

              <path d="m20 20-4-4" />
            </svg>

            <input
              type="search"
              value={searchTerm}
              placeholder="Search products, stores, colors, or categories..."
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
            />

            {searchTerm && (
              <button
                type="button"
                onClick={() =>
                  setSearchTerm("")
                }
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <button
            type="button"
            className={
              showFilters
                ? "catalog-filter-toggle active"
                : "catalog-filter-toggle"
            }
            onClick={() =>
              setShowFilters(
                (currentValue) =>
                  !currentValue
              )
            }
          >
            Filters

            {activeFilterCount > 0 && (
              <span>
                {activeFilterCount}
              </span>
            )}
          </button>

          <select
            className="catalog-sort-select"
            value={sortBy}
            onChange={(event) =>
              setSortBy(
                event.target.value
              )
            }
            aria-label="Sort products"
          >
            <option value="recommended">
              Recommended
            </option>

            <option value="price-low">
              Price: Low to High
            </option>

            <option value="price-high">
              Price: High to Low
            </option>

            <option value="rating">
              Highest Rated
            </option>

            <option value="newest">
              Newest
            </option>
          </select>
        </section>

        <div className="catalog-category-tabs">
          {CATEGORIES.map(
            (categoryOption) => (
              <button
                key={categoryOption}
                type="button"
                className={
                  category ===
                  categoryOption
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setCategory(
                    categoryOption
                  )
                }
              >
                {categoryOption}
              </button>
            )
          )}
        </div>

        {showFilters && (
          <section className="catalog-filter-panel">
            <div className="catalog-filter-heading">
              <div>
                <p>REFINE RESULTS</p>
                <h2>Product filters</h2>
              </div>

              <button
                type="button"
                onClick={resetFilters}
              >
                Reset all
              </button>
            </div>

            <div className="catalog-filter-grid">
              <FilterSelect
                label="Gender"
                value={gender}
                options={GENDERS}
                onChange={setGender}
              />

              <FilterSelect
                label="Size"
                value={size}
                options={SIZES}
                onChange={setSize}
              />

              <FilterSelect
                label="Seller"
                value={seller}
                options={sellerNames}
                onChange={setSeller}
              />

              <div className="catalog-price-filter">
                <div>
                  <label htmlFor="maximum-price">
                    Maximum price
                  </label>

                  <strong>
                    {formatPrice(
                      maximumPrice
                    )}
                  </strong>
                </div>

                <input
                  id="maximum-price"
                  type="range"
                  min="500"
                  max="2500"
                  step="100"
                  value={maximumPrice}
                  onChange={(event) =>
                    setMaximumPrice(
                      Number(
                        event.target.value
                      )
                    )
                  }
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
            {filteredProducts.map(
              (product) => (
                <article
                  key={product.id}
                  className="catalog-product-card"
                >
                  <button
                    type="button"
                    className="catalog-product-image"
                    onClick={() =>
                      viewProduct(product)
                    }
                  >
                    {product.featured && (
                      <span className="catalog-featured-label">
                        FEATURED
                      </span>
                    )}

                    <div className="catalog-product-symbol">
                      {product.symbol}
                    </div>

                    <span className="catalog-match-score">
                      Match score:{" "}
                      {product.matchScore}
                    </span>
                  </button>

                  <div className="catalog-product-information">
                    <button
                      type="button"
                      className="catalog-seller-link"
                      onClick={() =>
                        viewSeller(product)
                      }
                    >
                      {product.sellerName}
                    </button>

                    <button
                      type="button"
                      className="catalog-product-name"
                      onClick={() =>
                        viewProduct(product)
                      }
                    >
                      {product.name}
                    </button>

                    <div className="catalog-product-details">
                      <span>
                        {product.category}
                      </span>

                      <span>•</span>

                      <span>
                        {product.color}
                      </span>
                    </div>

                    <div className="catalog-rating">
                      <span>★</span>

                      <strong>
                        {product.rating}
                      </strong>

                      <small>
                        ({product.reviews})
                      </small>
                    </div>

                    <div className="catalog-product-price">
                      <strong>
                        {formatPrice(
                          product.price
                        )}
                      </strong>

                      <del>
                        {formatPrice(
                          product.originalPrice
                        )}
                      </del>
                    </div>

                    <div className="catalog-product-sizes">
                      <span>
                        Available sizes:
                      </span>

                      <strong>
                        {product.sizes.join(
                          ", "
                        )}
                      </strong>
                    </div>

                    <div className="catalog-product-actions">
                      <button
                        type="button"
                        className="catalog-view-button"
                        onClick={() =>
                          viewProduct(product)
                        }
                      >
                        View Details
                      </button>

                      <button
                        type="button"
                        className="catalog-try-button"
                        onClick={() =>
                          tryProduct(product)
                        }
                      >
                        Try On
                      </button>
                    </div>
                  </div>
                </article>
              )
            )}
          </section>
        ) : (
          <section className="catalog-empty-state">
            <div>⌕</div>

            <h2>No products found</h2>

            <p>
              No products match your current
              search and filters. Try changing
              the category, size, seller, or
              maximum price.
            </p>

            <button
              type="button"
              onClick={resetFilters}
            >
              Clear All Filters
            </button>
          </section>
        )}
      </div>

      {toastMessage && (
        <div
          className="catalog-toast"
          role="status"
        >
          {toastMessage}
        </div>
      )}
    </main>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}) {
  return (
    <label className="catalog-filter-field">
      <span>{label}</span>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
      >
        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default CatalogPage;