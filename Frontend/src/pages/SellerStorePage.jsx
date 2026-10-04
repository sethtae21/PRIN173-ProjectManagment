import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  NavLink,
  useNavigate,
  useParams,
} from "react-router-dom";

import fitFusionLogo from "../assets/fitfusion-logo.svg";
import "./css/SellerStorePage.css";

const sellerStores = {
  "luna-clothing": {
    id: "luna-clothing",
    name: "Luna Clothing",
    username: "@lunaclothing",
    initials: "LC",
    description:
      "Modern, feminine, and comfortable clothing designed for everyday confidence.",
    location: "Makati City, Metro Manila",
    joined: "January 2025",
    rating: 4.9,
    reviewCount: 1260,
    followers: 18400,
    responseRate: 98,
    responseTime: "Within an hour",
    totalProducts: 28,
    categories: [
      "All",
      "Tops",
      "Dresses",
      "Bottoms",
      "Outerwear",
    ],
    products: [
      {
        id: "luna-1",
        name: "Classic Beige Top",
        category: "Tops",
        price: 699,
        originalPrice: 799,
        rating: 4.9,
        sold: 240,
        colors: 4,
        sizes: ["XS", "S", "M", "L", "XL"],
        badge: "BESTSELLER",
        colorClass: "beige",
      },
      {
        id: "luna-2",
        name: "Floral Summer Dress",
        category: "Dresses",
        price: 999,
        originalPrice: 1199,
        rating: 4.8,
        sold: 187,
        colors: 3,
        sizes: ["S", "M", "L", "XL"],
        badge: "POPULAR",
        colorClass: "floral",
      },
      {
        id: "luna-3",
        name: "Elegant Satin Blouse",
        category: "Tops",
        price: 849,
        originalPrice: 999,
        rating: 4.9,
        sold: 145,
        colors: 5,
        sizes: ["XS", "S", "M", "L"],
        badge: "NEW",
        colorClass: "gold",
      },
      {
        id: "luna-4",
        name: "Pleated Midi Skirt",
        category: "Bottoms",
        price: 779,
        originalPrice: 899,
        rating: 4.7,
        sold: 98,
        colors: 3,
        sizes: ["S", "M", "L", "XL"],
        badge: "",
        colorClass: "brown",
      },
      {
        id: "luna-5",
        name: "Cropped Knit Cardigan",
        category: "Outerwear",
        price: 899,
        originalPrice: 1099,
        rating: 4.8,
        sold: 163,
        colors: 4,
        sizes: ["S", "M", "L", "XL"],
        badge: "TRENDING",
        colorClass: "cream",
      },
      {
        id: "luna-6",
        name: "Ruched Evening Dress",
        category: "Dresses",
        price: 1299,
        originalPrice: 1499,
        rating: 4.9,
        sold: 76,
        colors: 2,
        sizes: ["XS", "S", "M", "L"],
        badge: "LIMITED",
        colorClass: "black",
      },
    ],
  },

  "urban-threads": {
    id: "urban-threads",
    name: "Urban Threads",
    username: "@urbanthreads",
    initials: "UT",
    description:
      "Streetwear and wardrobe essentials made for comfort, movement, and modern city style.",
    location: "Quezon City, Metro Manila",
    joined: "March 2025",
    rating: 4.8,
    reviewCount: 846,
    followers: 12300,
    responseRate: 96,
    responseTime: "Within a few hours",
    totalProducts: 22,
    categories: [
      "All",
      "Tops",
      "Bottoms",
      "Outerwear",
    ],
    products: [
      {
        id: "urban-1",
        name: "High-Waist Denim Pants",
        category: "Bottoms",
        price: 899,
        originalPrice: 1099,
        rating: 4.8,
        sold: 310,
        colors: 3,
        sizes: ["XS", "S", "M", "L", "XL"],
        badge: "BESTSELLER",
        colorClass: "denim",
      },
      {
        id: "urban-2",
        name: "Oversized Graphic Shirt",
        category: "Tops",
        price: 549,
        originalPrice: 649,
        rating: 4.7,
        sold: 216,
        colors: 5,
        sizes: ["S", "M", "L", "XL", "2XL"],
        badge: "TRENDING",
        colorClass: "gray",
      },
      {
        id: "urban-3",
        name: "Utility Cargo Pants",
        category: "Bottoms",
        price: 949,
        originalPrice: 1199,
        rating: 4.8,
        sold: 173,
        colors: 4,
        sizes: ["S", "M", "L", "XL"],
        badge: "POPULAR",
        colorClass: "olive",
      },
      {
        id: "urban-4",
        name: "Streetwear Bomber Jacket",
        category: "Outerwear",
        price: 1399,
        originalPrice: 1699,
        rating: 4.9,
        sold: 87,
        colors: 3,
        sizes: ["M", "L", "XL", "2XL"],
        badge: "LIMITED",
        colorClass: "black",
      },
    ],
  },
};

const defaultStore = sellerStores["luna-clothing"];

function getStoredArray(key) {
  try {
    const value = localStorage.getItem(key);

    if (!value) {
      return [];
    }

    const parsedValue = JSON.parse(value);

    return Array.isArray(parsedValue)
      ? parsedValue
      : [];
  } catch {
    return [];
  }
}

function SellerStorePage() {
  const navigate = useNavigate();
  const { sellerId } = useParams();

  const store =
    sellerStores[sellerId] || defaultStore;

  const [searchTerm, setSearchTerm] =
    useState("");

  const [selectedCategory, setSelectedCategory] =
    useState("All");

  const [sortOption, setSortOption] =
    useState("recommended");

  const [favorites, setFavorites] = useState(
    () =>
      getStoredArray(
        "fitfusion-favorite-products"
      )
  );

  const [isFollowing, setIsFollowing] =
    useState(false);

  const [notice, setNotice] = useState("");
  const [showLogoutModal, setShowLogoutModal] =
    useState(false);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });

    try {
      const followedStores =
        getStoredArray(
          "fitfusion-followed-stores"
        );

      setIsFollowing(
        followedStores.includes(store.id)
      );
    } catch {
      setIsFollowing(false);
    }
  }, [store.id]);

  const cartCount = useMemo(() => {
    const cartItems = getStoredArray(
      "fitfusion-cart-items"
    );

    return cartItems.reduce(
      (total, product) =>
        total +
        (Number(product.quantity) || 1),
      0
    );
  }, []);

  const filteredProducts = useMemo(() => {
    const normalizedSearch =
      searchTerm.trim().toLowerCase();

    const matchingProducts =
      store.products.filter((product) => {
        const matchesSearch =
          !normalizedSearch ||
          product.name
            .toLowerCase()
            .includes(normalizedSearch) ||
          product.category
            .toLowerCase()
            .includes(normalizedSearch);

        const matchesCategory =
          selectedCategory === "All" ||
          product.category ===
            selectedCategory;

        return (
          matchesSearch &&
          matchesCategory
        );
      });

    return [...matchingProducts].sort(
      (firstProduct, secondProduct) => {
        switch (sortOption) {
          case "price-low":
            return (
              firstProduct.price -
              secondProduct.price
            );

          case "price-high":
            return (
              secondProduct.price -
              firstProduct.price
            );

          case "rating":
            return (
              secondProduct.rating -
              firstProduct.rating
            );

          case "sold":
            return (
              secondProduct.sold -
              firstProduct.sold
            );

          default:
            return 0;
        }
      }
    );
  }, [
    searchTerm,
    selectedCategory,
    sortOption,
    store.products,
  ]);

  function viewProduct(product) {
    localStorage.setItem(
      "fitfusion-selected-product",
      JSON.stringify({
        ...product,
        sellerId: store.id,
        sellerName: store.name,
        sellerRating: store.rating,
      })
    );

    navigate(
      `/shopper/products/${product.id}`
    );
  }

  function tryProduct(product) {
    localStorage.setItem(
      "fitfusion-selected-product",
      JSON.stringify({
        ...product,
        sellerId: store.id,
        sellerName: store.name,
      })
    );

    navigate(
      "/shopper/fitting-studio/customize"
    );
  }

  function toggleFavorite(product) {
    const alreadyFavorite =
      favorites.some(
        (favorite) =>
          String(
            favorite.id ||
              favorite.productId
          ) === String(product.id)
      );

    let updatedFavorites;

    if (alreadyFavorite) {
      updatedFavorites = favorites.filter(
        (favorite) =>
          String(
            favorite.id ||
              favorite.productId
          ) !== String(product.id)
      );

      setNotice(
        `${product.name} was removed from your favorites.`
      );
    } else {
      updatedFavorites = [
        ...favorites,
        {
          ...product,
          sellerId: store.id,
          sellerName: store.name,
        },
      ];

      setNotice(
        `${product.name} was added to your favorites.`
      );
    }

    setFavorites(updatedFavorites);

    localStorage.setItem(
      "fitfusion-favorite-products",
      JSON.stringify(updatedFavorites)
    );

    setTimeout(() => {
      setNotice("");
    }, 2500);
  }

  function toggleFollowStore() {
    const followedStores = getStoredArray(
      "fitfusion-followed-stores"
    );

    let updatedStores;

    if (isFollowing) {
      updatedStores = followedStores.filter(
        (storeId) => storeId !== store.id
      );

      setNotice(
        `You unfollowed ${store.name}.`
      );
    } else {
      updatedStores = Array.from(
        new Set([
          ...followedStores,
          store.id,
        ])
      );

      setNotice(
        `You are now following ${store.name}.`
      );
    }

    localStorage.setItem(
      "fitfusion-followed-stores",
      JSON.stringify(updatedStores)
    );

    setIsFollowing(!isFollowing);

    setTimeout(() => {
      setNotice("");
    }, 2500);
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
    <main className="seller-store-page">
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
            className={() =>
              "shopper-nav-link active"
            }
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

      <section className="seller-store-content">
        <header className="seller-store-header">
          <div>
            <button
              type="button"
              className="seller-store-back"
              onClick={() =>
                navigate("/shopper/catalog")
              }
            >
              ← Back to Catalog
            </button>

            <h1>Seller Store</h1>

            <p>
              Browse products uploaded by this
              seller.
            </p>
          </div>

          <div className="seller-store-header-actions">
            <button
              type="button"
              className="seller-store-cart-button"
              onClick={() =>
                navigate("/shopper/cart")
              }
              aria-label={`Open cart with ${cartCount} items`}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 7H6" />
                <circle cx="10" cy="20" r="1" />
                <circle cx="18" cy="20" r="1" />
              </svg>

              <span>{cartCount}</span>
            </button>

            <div className="seller-store-role">
              REGISTERED SHOPPER
            </div>
          </div>
        </header>

        <div className="seller-store-body">
          {notice && (
            <div
              className="seller-store-notice"
              role="status"
            >
              {notice}
            </div>
          )}

          <section className="seller-profile-card">
            <div className="seller-profile-main">
              <div className="seller-profile-logo">
                {store.initials}
              </div>

              <div className="seller-profile-information">
                <div className="seller-profile-title">
                  <div>
                    <p>OFFICIAL SELLER STORE</p>
                    <h2>{store.name}</h2>
                    <span>{store.username}</span>
                  </div>

                  <div className="seller-verified">
                    ✓ Verified Seller
                  </div>
                </div>

                <p className="seller-description">
                  {store.description}
                </p>

                <div className="seller-location">
                  <span>
                    Location: {store.location}
                  </span>

                  <span>
                    Joined: {store.joined}
                  </span>
                </div>
              </div>
            </div>

            <div className="seller-profile-actions">
              <button
                type="button"
                className={
                  isFollowing
                    ? "seller-follow-button following"
                    : "seller-follow-button"
                }
                onClick={toggleFollowStore}
              >
                {isFollowing
                  ? "Following"
                  : "+ Follow Store"}
              </button>

              <button
                type="button"
                className="seller-message-button"
                onClick={() =>
                  setNotice(
                    "Seller messaging will be connected to the backend later."
                  )
                }
              >
                Contact Seller
              </button>
            </div>
          </section>

          <section className="seller-statistics">
            <article>
              <strong>{store.rating}</strong>
              <span>★ Store Rating</span>
            </article>

            <article>
              <strong>
                {store.reviewCount.toLocaleString(
                  "en-PH"
                )}
              </strong>
              <span>Product Reviews</span>
            </article>

            <article>
              <strong>
                {store.followers.toLocaleString(
                  "en-PH"
                )}
              </strong>
              <span>Followers</span>
            </article>

            <article>
              <strong>
                {store.responseRate}%
              </strong>
              <span>Response Rate</span>
            </article>

            <article>
              <strong>
                {store.totalProducts}
              </strong>
              <span>Active Products</span>
            </article>
          </section>

          <section className="seller-store-shopping">
            <div className="seller-products-heading">
              <div>
                <p>STORE COLLECTION</p>
                <h2>
                  Products from {store.name}
                </h2>
                <span>
                  Sizes and availability are
                  provided by the seller.
                </span>
              </div>

              <div className="seller-response">
                <span>Seller response</span>
                <strong>
                  {store.responseTime}
                </strong>
              </div>
            </div>

            <div className="seller-product-controls">
              <label className="seller-search-box">
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
                  onChange={(event) =>
                    setSearchTerm(
                      event.target.value
                    )
                  }
                  placeholder={`Search in ${store.name}`}
                />
              </label>

              <label className="seller-sort-control">
                <span>Sort by</span>

                <select
                  value={sortOption}
                  onChange={(event) =>
                    setSortOption(
                      event.target.value
                    )
                  }
                >
                  <option value="recommended">
                    Recommended
                  </option>

                  <option value="sold">
                    Best Selling
                  </option>

                  <option value="rating">
                    Highest Rated
                  </option>

                  <option value="price-low">
                    Price: Low to High
                  </option>

                  <option value="price-high">
                    Price: High to Low
                  </option>
                </select>
              </label>
            </div>

            <div className="seller-category-tabs">
              {store.categories.map(
                (category) => (
                  <button
                    key={category}
                    type="button"
                    className={
                      selectedCategory ===
                      category
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setSelectedCategory(
                        category
                      )
                    }
                  >
                    {category}
                  </button>
                )
              )}
            </div>

            <div className="seller-result-information">
              <strong>
                {filteredProducts.length}{" "}
                {filteredProducts.length === 1
                  ? "product"
                  : "products"}
              </strong>

              {(searchTerm ||
                selectedCategory !== "All") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCategory("All");
                    setSortOption(
                      "recommended"
                    );
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>

            {filteredProducts.length > 0 ? (
              <div className="seller-products-grid">
                {filteredProducts.map(
                  (product) => {
                    const isFavorite =
                      favorites.some(
                        (favorite) =>
                          String(
                            favorite.id ||
                              favorite.productId
                          ) ===
                          String(product.id)
                      );

                    const discount =
                      product.originalPrice >
                      product.price
                        ? Math.round(
                            ((product.originalPrice -
                              product.price) /
                              product.originalPrice) *
                              100
                          )
                        : 0;

                    return (
                      <article
                        key={product.id}
                        className="seller-product-card"
                      >
                        <div
                          className={`seller-product-image ${product.colorClass}`}
                        >
                          {product.badge && (
                            <span className="seller-product-badge">
                              {product.badge}
                            </span>
                          )}

                          {discount > 0 && (
                            <span className="seller-product-discount">
                              -{discount}%
                            </span>
                          )}

                          <div className="seller-product-clothing">
                            <span />
                            <span />
                            <span />
                          </div>

                          <button
                            type="button"
                            className={
                              isFavorite
                                ? "seller-favorite-button active"
                                : "seller-favorite-button"
                            }
                            onClick={() =>
                              toggleFavorite(
                                product
                              )
                            }
                            aria-label={
                              isFavorite
                                ? `Remove ${product.name} from favorites`
                                : `Add ${product.name} to favorites`
                            }
                          >
                            {isFavorite
                              ? "♥"
                              : "♡"}
                          </button>
                        </div>

                        <div className="seller-product-details">
                          <span className="seller-product-store-name">
                            {store.name}
                          </span>

                          <h3>{product.name}</h3>

                          <div className="seller-product-rating">
                            <span>
                              ★ {product.rating}
                            </span>

                            <span>
                              {product.sold} sold
                            </span>
                          </div>

                          <div className="seller-product-price">
                            <strong>
                              ₱
                              {product.price.toLocaleString(
                                "en-PH"
                              )}
                            </strong>

                            {product.originalPrice >
                              product.price && (
                              <del>
                                ₱
                                {product.originalPrice.toLocaleString(
                                  "en-PH"
                                )}
                              </del>
                            )}
                          </div>

                          <p className="seller-product-options">
                            {product.colors} colors
                            •{" "}
                            {product.sizes.length}{" "}
                            sizes
                          </p>

                          <div className="seller-product-actions">
                            <button
                              type="button"
                              className="seller-view-product"
                              onClick={() =>
                                viewProduct(
                                  product
                                )
                              }
                            >
                              View Details
                            </button>

                            <button
                              type="button"
                              className="seller-try-product"
                              onClick={() =>
                                tryProduct(
                                  product
                                )
                              }
                            >
                              Try On
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            ) : (
              <div className="seller-products-empty">
                <div>⌕</div>

                <h3>No products found</h3>

                <p>
                  Try another search term or
                  product category.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCategory("All");
                  }}
                >
                  Show All Products
                </button>
              </div>
            )}
          </section>

          <section className="seller-assurance">
            <article>
              <div>✓</div>

              <div>
                <strong>
                  Verified products
                </strong>

                <span>
                  Product information comes
                  directly from the seller.
                </span>
              </div>
            </article>

            <article>
              <div>☆</div>

              <div>
                <strong>
                  Shopper reviews
                </strong>

                <span>
                  Ratings help shoppers make
                  informed decisions.
                </span>
              </div>
            </article>

            <article>
              <div>↺</div>

              <div>
                <strong>
                  Seller-managed inventory
                </strong>

                <span>
                  Prices, sizes and stocks are
                  updated by the seller.
                </span>
              </div>
            </article>
          </section>
        </div>
      </section>

      {showLogoutModal && (
        <div
          className="seller-logout-backdrop"
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
            className="seller-logout-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-logout-title"
          >
            <div>↪</div>

            <h2 id="seller-logout-title">
              Log out?
            </h2>

            <p>
              You will need to log in again to
              continue shopping and using your
              saved fitting profile.
            </p>

            <div className="seller-logout-actions">
              <button
                type="button"
                onClick={() =>
                  setShowLogoutModal(false)
                }
              >
                Cancel
              </button>

              <button
                type="button"
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

export default SellerStorePage;