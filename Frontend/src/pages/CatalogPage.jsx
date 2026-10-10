import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import "./css/CatalogPage.css";

const products = [
  {
    id: "classic-beige-blazer",
    name: "Classic Beige Blazer",
    category: "Outerwear",
    gender: "Women",
    price: 2499,
    rating: 4.8,
    sellerId: "maison-aurelia",
    storeName: "Maison Aurelia",
    sizes: ["S", "M", "L"],
    color: "#c5a36d",
    garment: "blazer",
    gradient:
      "linear-gradient(145deg, #ead8b8, #c9aa78)",
  },
  {
    id: "black-tailored-trousers",
    name: "Black Tailored Trousers",
    category: "Bottoms",
    gender: "Women",
    price: 1699,
    rating: 4.7,
    sellerId: "maison-aurelia",
    storeName: "Maison Aurelia",
    sizes: ["S", "M", "L", "XL"],
    color: "#282522",
    garment: "pants",
    gradient:
      "linear-gradient(145deg, #57514c, #27231f)",
  },
  {
    id: "ivory-satin-blouse",
    name: "Ivory Satin Blouse",
    category: "Tops",
    gender: "Women",
    price: 1399,
    rating: 4.6,
    sellerId: "luna-fashion",
    storeName: "Luna Fashion",
    sizes: ["XS", "S", "M", "L"],
    color: "#eee4d1",
    garment: "blouse",
    gradient:
      "linear-gradient(145deg, #f8f3e9, #ddd0ba)",
  },
  {
    id: "modern-oxford-shirt",
    name: "Modern Oxford Shirt",
    category: "Tops",
    gender: "Men",
    price: 1499,
    rating: 4.7,
    sellerId: "north-style",
    storeName: "North Style",
    sizes: ["S", "M", "L", "XL"],
    color: "#e9edf0",
    garment: "shirt",
    gradient:
      "linear-gradient(145deg, #eff1f1, #c8cccd)",
  },
  {
    id: "golden-midi-dress",
    name: "Golden Midi Dress",
    category: "Dresses",
    gender: "Women",
    price: 2199,
    rating: 4.9,
    sellerId: "luna-fashion",
    storeName: "Luna Fashion",
    sizes: ["XS", "S", "M", "L"],
    color: "#c6922d",
    garment: "dress",
    gradient:
      "linear-gradient(145deg, #f0d28c, #c18a22)",
  },
  {
    id: "cream-knit-sweater",
    name: "Cream Knit Sweater",
    category: "Tops",
    gender: "Unisex",
    price: 1599,
    rating: 4.5,
    sellerId: "urban-thread",
    storeName: "Urban Thread",
    sizes: ["S", "M", "L", "XL"],
    color: "#d8c6a2",
    garment: "sweater",
    gradient:
      "linear-gradient(145deg, #eee2cb, #c9b58c)",
  },
  {
    id: "pleated-midi-skirt",
    name: "Pleated Midi Skirt",
    category: "Bottoms",
    gender: "Women",
    price: 1299,
    rating: 4.6,
    sellerId: "maison-aurelia",
    storeName: "Maison Aurelia",
    sizes: ["XS", "S", "M", "L"],
    color: "#9b7448",
    garment: "skirt",
    gradient:
      "linear-gradient(145deg, #d1b38d, #957047)",
  },
  {
    id: "classic-denim-jacket",
    name: "Classic Denim Jacket",
    category: "Outerwear",
    gender: "Unisex",
    price: 2299,
    rating: 4.8,
    sellerId: "urban-thread",
    storeName: "Urban Thread",
    sizes: ["S", "M", "L", "XL"],
    color: "#526e86",
    garment: "jacket",
    gradient:
      "linear-gradient(145deg, #91a5b7, #526c83)",
  },
];

const categoryOptions = [
  "All",
  "Tops",
  "Bottoms",
  "Dresses",
  "Outerwear",
];

const genderOptions = [
  "All",
  "Women",
  "Men",
  "Unisex",
];

function getCartCount() {
  try {
    const savedCart =
      localStorage.getItem(
        "fitfusion-cart",
      );

    const cart = savedCart
      ? JSON.parse(savedCart)
      : [];

    if (!Array.isArray(cart)) {
      return 0;
    }

    return cart.reduce(
      (total, item) =>
        total +
        Number(item.quantity || 1),
      0,
    );
  } catch {
    return 0;
  }
}

function CatalogPage({ isGuest = false }) {
  const navigate = useNavigate();
  const location = useLocation();

  const guestMode =
    isGuest ||
    location.pathname.startsWith("/guest");

  const [searchText, setSearchText] =
    useState("");

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState("All");

  const [
    selectedGender,
    setSelectedGender,
  ] = useState("All");

  const [sortOption, setSortOption] =
    useState("featured");

  const [
    showRegistrationModal,
    setShowRegistrationModal,
  ] = useState(false);

  const [modalAction, setModalAction] =
    useState("continue");

  const [cartCount, setCartCount] =
    useState(getCartCount);

  useEffect(() => {
    function updateCartCount() {
      setCartCount(getCartCount());
    }

    updateCartCount();

    window.addEventListener(
      "fitfusion-cart-updated",
      updateCartCount,
    );

    window.addEventListener(
      "storage",
      updateCartCount,
    );

    return () => {
      window.removeEventListener(
        "fitfusion-cart-updated",
        updateCartCount,
      );

      window.removeEventListener(
        "storage",
        updateCartCount,
      );
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchText
      .trim()
      .toLowerCase();

    const result = products.filter(
      (product) => {
        const matchesSearch =
          normalizedSearch.length === 0 ||
          product.name
            .toLowerCase()
            .includes(normalizedSearch) ||
          product.category
            .toLowerCase()
            .includes(normalizedSearch) ||
          product.storeName
            .toLowerCase()
            .includes(normalizedSearch);

        const matchesCategory =
          selectedCategory === "All" ||
          product.category ===
            selectedCategory;

        const matchesGender =
          selectedGender === "All" ||
          product.gender === selectedGender;

        return (
          matchesSearch &&
          matchesCategory &&
          matchesGender
        );
      },
    );

    return [...result].sort((a, b) => {
      if (sortOption === "price-low") {
        return a.price - b.price;
      }

      if (sortOption === "price-high") {
        return b.price - a.price;
      }

      if (sortOption === "rating") {
        return b.rating - a.rating;
      }

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

  function openProductDetails(productId) {
    const path = guestMode
      ? `/guest/products/${productId}`
      : `/shopper/products/${productId}`;

    navigate(path);
  }

  function openSellerStore(sellerId) {
    if (guestMode) {
      showGuestRestriction(
        "view the seller’s complete store",
      );

      return;
    }

    navigate(
      `/shopper/sellers/${sellerId}`,
    );
  }

  function addToCart(product) {
    if (guestMode) {
      showGuestRestriction(
        "add products to your cart",
      );

      return;
    }

    let cart = [];

    try {
      const savedCart =
        localStorage.getItem(
          "fitfusion-cart",
        );

      cart = savedCart
        ? JSON.parse(savedCart)
        : [];

      if (!Array.isArray(cart)) {
        cart = [];
      }
    } catch {
      cart = [];
    }

    const existingProduct = cart.find(
      (item) => item.id === product.id,
    );

    if (existingProduct) {
      cart = cart.map((item) =>
        item.id === product.id
          ? {
              ...item,
              quantity:
                Number(
                  item.quantity || 1,
                ) + 1,
            }
          : item,
      );
    } else {
      cart.push({
        ...product,
        quantity: 1,
        selectedSize:
          product.sizes[0],
      });
    }

    localStorage.setItem(
      "fitfusion-cart",
      JSON.stringify(cart),
    );

    setCartCount(getCartCount());

    window.dispatchEvent(
      new Event(
        "fitfusion-cart-updated",
      ),
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
      {!guestMode && (
        <header className="catalog-top-header">
          <button
            type="button"
            className="catalog-header-cart"
            onClick={() =>
              navigate("/shopper/cart")
            }
            aria-label={`Open shopping cart with ${cartCount} items`}
          >
            <CartIcon />

            <span>{cartCount}</span>
          </button>
        </header>
      )}

      <div className="catalog-main-content">
        <section
          className="catalog-toolbar"
          aria-label="Catalog filters"
        >
          <label className="catalog-search">
            <SearchIcon />

            <input
              type="search"
              value={searchText}
              placeholder="Search product, category, or store"
              onChange={(event) =>
                setSearchText(
                  event.target.value,
                )
              }
            />
          </label>

          <label className="catalog-filter-field">
            <span>Category</span>

            <select
              value={selectedCategory}
              onChange={(event) =>
                setSelectedCategory(
                  event.target.value,
                )
              }
            >
              {categoryOptions.map(
                (category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category === "All"
                      ? "All Categories"
                      : category}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="catalog-filter-field">
            <span>Gender</span>

            <select
              value={selectedGender}
              onChange={(event) =>
                setSelectedGender(
                  event.target.value,
                )
              }
            >
              {genderOptions.map(
                (genderOption) => (
                  <option
                    key={genderOption}
                    value={genderOption}
                  >
                    {genderOption === "All"
                      ? "All Genders"
                      : genderOption}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="catalog-filter-field">
            <span>Sort By</span>

            <select
              value={sortOption}
              onChange={(event) =>
                setSortOption(
                  event.target.value,
                )
              }
            >
              <option value="featured">
                Featured
              </option>

              <option value="rating">
                Highest Rating
              </option>

              <option value="price-low">
                Price: Low to High
              </option>

              <option value="price-high">
                Price: High to Low
              </option>
            </select>
          </label>
        </section>

        <div className="catalog-result-row">
          <p>
            Showing{" "}
            <strong>
              {filteredProducts.length}
            </strong>{" "}
            {filteredProducts.length ===
            1
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
                    className="catalog-product-preview"
                    style={{
                      background:
                        product.gradient,
                    }}
                    onClick={() =>
                      openProductDetails(
                        product.id,
                      )
                    }
                    aria-label={`View ${product.name}`}
                  >
                    <GarmentIllustration
                      type={
                        product.garment
                      }
                      color={product.color}
                    />
                  </button>

                  <div className="catalog-product-content">
                    <div className="catalog-product-tags">
                      <span>
                        {product.category}
                      </span>

                      <span>
                        {product.gender}
                      </span>
                    </div>

                    <h2>{product.name}</h2>

                    <button
                      type="button"
                      className="catalog-store-link"
                      onClick={() =>
                        openSellerStore(
                          product.sellerId,
                        )
                      }
                    >
                      {product.storeName}
                    </button>

                    <div className="catalog-rating">
                      <StarIcon />

                      <strong>
                        {product.rating.toFixed(
                          1,
                        )}
                      </strong>
                    </div>

                    <div className="catalog-product-footer">
                      <strong className="catalog-price">
                        {formatCurrency(
                          product.price,
                        )}
                      </strong>

                      <button
                        type="button"
                        className="catalog-details-button"
                        onClick={() =>
                          openProductDetails(
                            product.id,
                          )
                        }
                      >
                        View Details
                      </button>
                    </div>

                    <button
                      type="button"
                      className="catalog-cart-action"
                      onClick={() =>
                        addToCart(product)
                      }
                    >
                      {guestMode
                        ? "Register to Add to Cart"
                        : "Add to Cart"}
                    </button>
                  </div>
                </article>
              ),
            )}
          </section>
        ) : (
          <section className="catalog-empty-state">
            <div className="catalog-empty-icon">
              <SearchIcon />
            </div>

            <h2>No products found</h2>

            <p>
              Try using a different search
              term or clearing your
              filters.
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

      {showRegistrationModal && (
        <div
          className="catalog-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowRegistrationModal(
                false,
              );
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
                setShowRegistrationModal(
                  false,
                )
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
              Guest users may browse the
              catalog. Please create an
              account or log in to{" "}
              {modalAction}.
            </p>

            <div className="catalog-modal-actions">
              <button
                type="button"
                className="catalog-modal-primary"
                onClick={() =>
                  navigate("/signup")
                }
              >
                Create Account
              </button>

              <button
                type="button"
                className="catalog-modal-secondary"
                onClick={() =>
                  navigate("/login")
                }
              >
                Log In
              </button>
            </div>

            <button
              type="button"
              className="catalog-modal-cancel"
              onClick={() =>
                setShowRegistrationModal(
                  false,
                )
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

function GarmentIllustration({
  type,
  color,
}) {
  const garmentProps = {
    fill: color,
    stroke: "#302920",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  if (type === "pants") {
    return (
      <svg
        className="catalog-garment"
        viewBox="0 0 220 250"
        role="img"
        aria-label="Trousers"
      >
        <path
          {...garmentProps}
          d="M72 28h76l9 196h-37l-10-112-10 112H63L72 28Z"
        />

        <path
          d="M72 55h76M110 30v82"
          fill="none"
          stroke="#302920"
          strokeWidth="2"
        />

        <path
          d="M84 70c7 7 15 10 26 10M136 70c-7 7-15 10-26 10"
          fill="none"
          stroke="rgba(255,255,255,.35)"
          strokeWidth="2"
        />
      </svg>
    );
  }

  if (type === "dress") {
    return (
      <svg
        className="catalog-garment"
        viewBox="0 0 220 250"
        role="img"
        aria-label="Dress"
      >
        <path
          {...garmentProps}
          d="M87 26c6 10 14 15 23 15s17-5 23-15l18 20-21 38 38 136H52L90 84 69 46l18-20Z"
        />

        <path
          d="M90 84h40M110 41v43"
          fill="none"
          stroke="#302920"
          strokeWidth="2"
        />

        <path
          d="M74 198c24-12 48-12 72 0"
          fill="none"
          stroke="rgba(255,255,255,.45)"
          strokeWidth="3"
        />
      </svg>
    );
  }

  if (type === "skirt") {
    return (
      <svg
        className="catalog-garment"
        viewBox="0 0 220 250"
        role="img"
        aria-label="Skirt"
      >
        <path
          {...garmentProps}
          d="M76 42h68l30 178H46L76 42Z"
        />

        <path
          d="M75 67h70M91 69 76 210M110 69v141M129 69l15 141"
          fill="none"
          stroke="rgba(255,255,255,.45)"
          strokeWidth="3"
        />
      </svg>
    );
  }

  if (
    type === "blazer" ||
    type === "jacket"
  ) {
    return (
      <svg
        className="catalog-garment"
        viewBox="0 0 220 250"
        role="img"
        aria-label={
          type === "blazer"
            ? "Blazer"
            : "Jacket"
        }
      >
        <path
          {...garmentProps}
          d="M78 35 47 54 23 131l30 10 18-47-4 126h86l-4-126 18 47 30-10-24-77-31-19-32 14-32-14Z"
        />

        <path
          d="m78 35 32 75 32-75M110 49v171"
          fill="none"
          stroke="#302920"
          strokeWidth="2"
        />

        <path
          d="m78 35 5 50 27 25M142 35l-5 50-27 25"
          fill="none"
          stroke="rgba(255,255,255,.5)"
          strokeWidth="3"
        />

        <path
          d="M80 151h19v13H80ZM121 151h19v13h-19Z"
          fill="rgba(255,255,255,.2)"
          stroke="#302920"
          strokeWidth="1.5"
        />

        <circle
          cx="110"
          cy="132"
          r="3"
          fill="#302920"
        />

        <circle
          cx="110"
          cy="151"
          r="3"
          fill="#302920"
        />
      </svg>
    );
  }

  if (type === "sweater") {
    return (
      <svg
        className="catalog-garment"
        viewBox="0 0 220 250"
        role="img"
        aria-label="Sweater"
      >
        <path
          {...garmentProps}
          d="M79 35 48 51 17 124l31 14 23-47-6 129h90l-6-129 23 47 31-14-31-73-31-16c-5 13-15 20-31 20S84 48 79 35Z"
        />

        <path
          d="M86 39c3 20 45 20 48 0M68 189h84M48 138l18 8M172 138l-18 8"
          fill="none"
          stroke="rgba(255,255,255,.5)"
          strokeWidth="3"
        />
      </svg>
    );
  }

  return (
    <svg
      className="catalog-garment"
      viewBox="0 0 220 250"
      role="img"
      aria-label={
        type === "blouse"
          ? "Blouse"
          : "Shirt"
      }
    >
      <path
        {...garmentProps}
        d="M80 34 49 51 18 116l31 15 21-41-5 130h90l-5-130 21 41 31-15-31-65-31-17c-4 13-14 20-30 20S84 47 80 34Z"
      />

      <path
        d="m80 34 30 33 30-33M110 67v153"
        fill="none"
        stroke="#302920"
        strokeWidth="2"
      />

      <path
        d="M78 34c4 14 15 22 32 22s28-8 32-22"
        fill="none"
        stroke="rgba(255,255,255,.6)"
        strokeWidth="3"
      />

      <circle
        cx="110"
        cy="91"
        r="3"
        fill="#302920"
      />

      <circle
        cx="110"
        cy="117"
        r="3"
        fill="#302920"
      />

      <circle
        cx="110"
        cy="143"
        r="3"
        fill="#302920"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        cx="11"
        cy="11"
        r="7"
      />

      <path d="m16 16 5 5" />
    </svg>
  );
}

function CartIcon() {
  return (
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
  );
}

function StarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="m12 2.8 2.8 5.7 6.3.9-4.5 4.4 1 6.2-5.6-3-5.6 3 1-6.2-4.5-4.4 6.3-.9L12 2.8Z" />
    </svg>
  );
}

function formatCurrency(value) {
  return new Intl.NumberFormat(
    "en-PH",
    {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    },
  ).format(value);
}

export default CatalogPage;