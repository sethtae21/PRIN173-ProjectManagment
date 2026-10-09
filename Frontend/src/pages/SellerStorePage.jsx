import {
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router-dom";

import "./css/SellerStorePage.css";

const SELLERS = [
  {
    id: "seller-001",
    name: "Aurelia Studio",
    username: "@aureliastudio",
    initials: "AS",
    phone: "+63 917 555 0101",
    phoneLink: "+639175550101",
    location: "Makati City",
    joined: "December 2024",
    description:
      "Elegant and timeless clothing designed for modern everyday fashion.",
    rating: 4.8,
    ratingsCount: 980,
    followers: 13200,
    responseRate: "97%",
    responseTime: "Within an hour",
    verified: true,
  },
  {
    id: "seller-002",
    name: "Maison Moderne",
    username: "@lunaclothing",
    initials: "LC",
    phone: "+63 912 888 4455",
    phoneLink: "+639128884455",
    location: "Makati City",
    joined: "January 2025",
    description:
      "Modern, feminine, and comfortable clothing designed for everyday confidence.",
    rating: 4.9,
    ratingsCount: 1260,
    followers: 18400,
    responseRate: "98%",
    responseTime: "Within an hour",
    verified: true,
  },
  {
    id: "seller-003",
    name: "North & Thread",
    username: "@northandthread",
    initials: "NT",
    phone: "+63 917 555 0303",
    phoneLink: "+639175550303",
    location: "Quezon City",
    joined: "February 2025",
    description:
      "Premium casual clothing with clean lines, durable materials, and comfortable fits.",
    rating: 4.7,
    ratingsCount: 745,
    followers: 8900,
    responseRate: "96%",
    responseTime: "Within two hours",
    verified: true,
  },
];

const PRODUCTS = [
  {
    id: "product-001",
    sellerId: "seller-001",
    name: "Classic Linen Blouse",
    category: "Women • Tops",
    price: 899,
    originalPrice: 1099,
    rating: 4.8,
    ratingsCount: 128,
    symbol: "👚",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Ivory", "Beige", "Black"],
    stock: 24,
    featured: true,
  },
  {
    id: "product-002",
    sellerId: "seller-001",
    name: "Tailored Wide-Leg Trousers",
    category: "Women • Bottoms",
    price: 1299,
    originalPrice: 1499,
    rating: 4.7,
    ratingsCount: 94,
    symbol: "👖",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Sand", "Brown", "Black"],
    stock: 18,
    featured: false,
  },
  {
    id: "product-003",
    sellerId: "seller-002",
    name: "Modern Structured Blazer",
    category: "Women • Outerwear",
    price: 1899,
    originalPrice: 2299,
    rating: 4.9,
    ratingsCount: 76,
    symbol: "🧥",
    sizes: ["S", "M", "L"],
    colors: ["Cream", "Brown", "Black"],
    stock: 12,
    featured: true,
  },
  {
    id: "product-004",
    sellerId: "seller-002",
    name: "Pleated Midi Dress",
    category: "Women • Dresses",
    price: 1599,
    originalPrice: 1899,
    rating: 4.8,
    ratingsCount: 110,
    symbol: "👗",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Rose", "Cream", "Black"],
    stock: 15,
    featured: true,
  },
  {
    id: "product-005",
    sellerId: "seller-002",
    name: "Soft Knit Cardigan",
    category: "Women • Knitwear",
    price: 1099,
    originalPrice: 1299,
    rating: 4.7,
    ratingsCount: 89,
    symbol: "🧥",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Beige", "White", "Brown"],
    stock: 20,
    featured: false,
  },
  {
    id: "product-006",
    sellerId: "seller-003",
    name: "Premium Cotton Polo",
    category: "Men • Tops",
    price: 799,
    originalPrice: 999,
    rating: 4.6,
    ratingsCount: 82,
    symbol: "👕",
    sizes: ["S", "M", "L", "XL"],
    colors: ["White", "Navy", "Olive"],
    stock: 30,
    featured: false,
  },
];

function readStorage(key, fallback) {
  try {
    const storedValue =
      localStorage.getItem(key);

    return storedValue
      ? JSON.parse(storedValue)
      : fallback;
  } catch {
    return fallback;
  }
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function SellerStorePage({
  isGuest = false,
}) {
  const navigate = useNavigate();
  const { sellerId } = useParams();
  const outletContext = useOutletContext();

  const guestMode =
    isGuest ||
    outletContext?.isGuest === true;

  const basePath = guestMode
    ? "/guest"
    : "/shopper";

  const seller = useMemo(() => {
    const savedSeller = readStorage(
      "fitfusion-selected-seller",
      null
    );

    const defaultSeller =
      SELLERS.find(
        (item) => item.id === sellerId
      ) || SELLERS[0];

    if (
      savedSeller &&
      savedSeller.id === sellerId
    ) {
      return {
        ...defaultSeller,
        ...savedSeller,
        phone:
          savedSeller.phone ||
          defaultSeller.phone,
        phoneLink:
          savedSeller.phoneLink ||
          defaultSeller.phoneLink,
      };
    }

    return defaultSeller;
  }, [sellerId]);

  const sellerProducts = useMemo(() => {
    const matchingProducts =
      PRODUCTS.filter(
        (product) =>
          product.sellerId === seller.id
      );

    return matchingProducts.length > 0
      ? matchingProducts
      : PRODUCTS.slice(0, 3);
  }, [seller.id]);

  const [isFollowing, setIsFollowing] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [
    showRegistrationModal,
    setShowRegistrationModal,
  ] = useState(false);

  const [
    restrictedFeature,
    setRestrictedFeature,
  ] = useState("");

  const cartItems = readStorage(
    "fitfusion-cart-items",
    []
  );

  const cartCount = cartItems.reduce(
    (total, item) =>
      total + Number(item.quantity || 1),
    0
  );

  function showGuestRestriction(feature) {
    if (
      outletContext?.openGuestRestriction
    ) {
      outletContext.openGuestRestriction(
        feature
      );

      return;
    }

    setRestrictedFeature(feature);
    setShowRegistrationModal(true);
  }

  function handleFollowStore() {
    if (guestMode) {
      showGuestRestriction(
        "follow this seller store"
      );

      return;
    }

    const nextFollowingState =
      !isFollowing;

    setIsFollowing(nextFollowingState);

    setMessage(
      nextFollowingState
        ? `You are now following ${seller.name}.`
        : `You unfollowed ${seller.name}.`
    );
  }

  function handleViewProduct(product) {
    const selectedProduct = {
      ...product,
      sellerName: seller.name,
      sellerLocation: seller.location,
      description:
        "A quality fashion item uploaded by this seller. Select an available size and color before trying it in the Fitting Studio.",
      matchScore: "6/7",
    };

    localStorage.setItem(
      "fitfusion-selected-product",
      JSON.stringify(selectedProduct)
    );

    localStorage.setItem(
      "fitfusion-selected-seller",
      JSON.stringify(seller)
    );

    navigate(
      `${basePath}/products/${product.id}`
    );
  }

  return (
    <main className="seller-store-page">
      <div className="seller-store-toolbar">
        <button
          type="button"
          className="seller-store-back-button"
          onClick={() =>
            navigate(`${basePath}/catalog`)
          }
        >
          ← Back to Catalog
        </button>

        {!guestMode && (
          <div className="seller-store-toolbar-actions">
            <button
              type="button"
              className="seller-store-cart-button"
              onClick={() =>
                navigate("/shopper/cart")
              }
              aria-label={
                `Open cart with ${cartCount} items`
              }
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

            <div className="seller-store-role-badge">
              REGISTERED SHOPPER
            </div>
          </div>
        )}
      </div>

      <div className="seller-store-content">
        <section className="seller-profile-card">
          <div className="seller-profile-avatar">
            {seller.initials}
          </div>

          <div className="seller-profile-information">
            <div className="seller-profile-label">
              <span>
                OFFICIAL SELLER STORE
              </span>

              {seller.verified && (
                <strong>
                  ✓ Verified Seller
                </strong>
              )}
            </div>

            <h1>{seller.name}</h1>

            <p className="seller-profile-username">
              {seller.username}
            </p>

            <p className="seller-profile-description">
              {seller.description}
            </p>

            <div className="seller-profile-meta">
              <span>
                Location: {seller.location}
              </span>

              <span>
                Joined: {seller.joined}
              </span>
            </div>
          </div>

          <div className="seller-profile-actions">
            <button
              type="button"
              className="seller-follow-button"
              onClick={handleFollowStore}
            >
              {isFollowing
                ? "✓ Following"
                : "+ Follow Store"}
            </button>

            <div className="seller-contact-information">
              <span>CONTACT NUMBER</span>

              <a
                href={`tel:${seller.phoneLink}`}
              >
                {seller.phone}
              </a>
            </div>
          </div>
        </section>

        {message && (
          <div
            className="seller-store-message"
            role="status"
          >
            {message}

            <button
              type="button"
              onClick={() =>
                setMessage("")
              }
              aria-label="Close message"
            >
              ×
            </button>
          </div>
        )}

        <section className="seller-statistics">
          <article>
            <strong>{seller.rating}</strong>
            <span>★ Store Rating</span>
          </article>

          <article>
            <strong>
              {formatNumber(
                seller.ratingsCount
              )}
            </strong>
            <span>Product Ratings</span>
          </article>

          <article>
            <strong>
              {formatNumber(
                seller.followers
              )}
            </strong>
            <span>Followers</span>
          </article>

          <article>
            <strong>
              {seller.responseRate}
            </strong>
            <span>Response Rate</span>
          </article>

          <article>
            <strong>
              {sellerProducts.length}
            </strong>
            <span>Active Products</span>
          </article>
        </section>

        <section className="seller-products-section">
          <div className="seller-products-heading">
            <div>
              <p>STORE COLLECTION</p>

              <h2>
                Products from {seller.name}
              </h2>

              <span>
                Sizes and availability are
                provided by the seller.
              </span>
            </div>

            <div className="seller-response-card">
              <span>Seller response</span>

              <strong>
                {seller.responseTime}
              </strong>
            </div>
          </div>

          <div className="seller-products-grid">
            {sellerProducts.map(
              (product) => (
                <article
                  key={product.id}
                  className="seller-product-card"
                >
                  <div className="seller-product-image">
                    {product.featured && (
                      <span className="seller-featured-badge">
                        FEATURED
                      </span>
                    )}

                    <span
                      className="seller-product-symbol"
                      role="img"
                      aria-label={
                        product.name
                      }
                    >
                      {product.symbol}
                    </span>
                  </div>

                  <div className="seller-product-details">
                    <p>
                      {product.category}
                    </p>

                    <h3>{product.name}</h3>

                    <div className="seller-product-rating">
                      <span>★★★★★</span>

                      <strong>
                        {product.rating}
                      </strong>

                      <small>
                        (
                        {
                          product.ratingsCount
                        }
                        )
                      </small>
                    </div>

                    <div className="seller-product-price">
                      <strong>
                        ₱
                        {formatNumber(
                          product.price
                        )}
                      </strong>

                      {product.originalPrice && (
                        <del>
                          ₱
                          {formatNumber(
                            product.originalPrice
                          )}
                        </del>
                      )}
                    </div>

                    <p className="seller-product-stock">
                      {product.stock} pieces
                      available
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        handleViewProduct(
                          product
                        )
                      }
                    >
                      View Product Details
                    </button>
                  </div>
                </article>
              )
            )}
          </div>
        </section>
      </div>

      {showRegistrationModal && (
        <div
          className="seller-guest-modal-backdrop"
          role="presentation"
          onMouseDown={() =>
            setShowRegistrationModal(false)
          }
        >
          <section
            className="seller-guest-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-guest-title"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="seller-modal-close"
              onClick={() =>
                setShowRegistrationModal(
                  false
                )
              }
              aria-label="Close"
            >
              ×
            </button>

            <p>REGISTRATION REQUIRED</p>

            <h2 id="seller-guest-title">
              Create an account to continue
            </h2>

            <span>
              You need a registered shopper
              account to {restrictedFeature}.
            </span>

            <div className="seller-modal-actions">
              <button
                type="button"
                onClick={() =>
                  navigate("/signup")
                }
              >
                Create Account
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate("/login")
                }
              >
                Log In
              </button>
            </div>

            <button
              type="button"
              className="seller-modal-cancel"
              onClick={() =>
                setShowRegistrationModal(
                  false
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

export default SellerStorePage;