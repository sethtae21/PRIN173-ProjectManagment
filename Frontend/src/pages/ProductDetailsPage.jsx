import {
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router-dom";

import "./css/ProductDetailsPage.css";

const PRODUCTS = [
  {
    id: "product-001",
    name: "Classic Linen Blouse",
    category: "Women • Tops",
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
    ratingBreakdown: {
      5: 78,
      4: 16,
      3: 4,
      2: 1,
      1: 1,
    },
  },
  {
    id: "product-002",
    name: "Tailored Wide-Leg Trousers",
    category: "Women • Bottoms",
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
    ratingBreakdown: {
      5: 72,
      4: 20,
      3: 5,
      2: 2,
      1: 1,
    },
  },
  {
    id: "product-003",
    name: "Modern Structured Blazer",
    category: "Women • Outerwear",
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
    ratingBreakdown: {
      5: 87,
      4: 10,
      3: 2,
      2: 1,
      1: 0,
    },
  },
  {
    id: "product-004",
    name: "Premium Cotton Polo",
    category: "Men • Tops",
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
    ratingBreakdown: {
      5: 67,
      4: 23,
      3: 7,
      2: 2,
      1: 1,
    },
  },
];

function readStorage(key, fallback) {
  try {
    const value =
      localStorage.getItem(key);

    return value
      ? JSON.parse(value)
      : fallback;
  } catch {
    return fallback;
  }
}

function ProductDetailsPage({
  isGuest = false,
}) {
  const navigate = useNavigate();
  const { productId } = useParams();
  const outletContext = useOutletContext();

  const guestMode =
    isGuest ||
    outletContext?.isGuest === true;

  const basePath = guestMode
    ? "/guest"
    : "/shopper";

  const product = useMemo(() => {
    const savedProduct = readStorage(
      "fitfusion-selected-product",
      null
    );

    const fallbackProduct =
      PRODUCTS.find(
        (item) => item.id === productId
      ) || PRODUCTS[0];

    if (
      savedProduct &&
      savedProduct.id === productId
    ) {
      return {
        ...fallbackProduct,
        ...savedProduct,
        ratingsCount:
          savedProduct.ratingsCount ??
          savedProduct.reviews ??
          fallbackProduct.ratingsCount,
        ratingBreakdown:
          savedProduct.ratingBreakdown ??
          fallbackProduct.ratingBreakdown,
      };
    }

    return fallbackProduct;
  }, [productId]);

  const sizes =
    product.sizes?.length > 0
      ? product.sizes
      : ["S", "M", "L", "XL"];

  const colors =
    product.colors?.length > 0
      ? product.colors
      : ["Default"];

  const ratingsCount =
    product.ratingsCount ??
    product.reviews ??
    0;

  const ratingBreakdown =
    product.ratingBreakdown || {
      5: 78,
      4: 16,
      3: 4,
      2: 1,
      1: 1,
    };

  const [selectedSize, setSelectedSize] =
    useState(sizes[0]);

  const [selectedColor, setSelectedColor] =
    useState(colors[0]);

  const [selectedView, setSelectedView] =
    useState("front");

  const [quantity, setQuantity] =
    useState(1);

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

  function handleSellerNavigation() {
    localStorage.setItem(
      "fitfusion-selected-seller",
      JSON.stringify({
        id: product.sellerId,
        name: product.sellerName,
        location: product.sellerLocation,
      })
    );

    navigate(
      `${basePath}/sellers/${product.sellerId}`
    );
  }

  function handleTryOn() {
    const selectedItem = {
      ...product,
      selectedSize,
      selectedColor,
      quantity,
    };

    if (guestMode) {
      sessionStorage.setItem(
        "fitfusion-selected-items",
        JSON.stringify([selectedItem])
      );
    } else {
      localStorage.setItem(
        "fitfusion-selected-items",
        JSON.stringify([selectedItem])
      );
    }

    navigate(
      `${basePath}/fitting-studio/customize`
    );
  }

  function handleAddToCart() {
    if (guestMode) {
      showGuestRestriction(
        "add products to your shopping cart"
      );

      return;
    }

    const currentCart = readStorage(
      "fitfusion-cart-items",
      []
    );

    const existingIndex =
      currentCart.findIndex(
        (item) =>
          item.id === product.id &&
          item.selectedSize ===
            selectedSize &&
          item.selectedColor ===
            selectedColor
      );

    let updatedCart;

    if (existingIndex >= 0) {
      updatedCart = currentCart.map(
        (item, index) =>
          index === existingIndex
            ? {
                ...item,
                quantity:
                  Number(
                    item.quantity || 1
                  ) + quantity,
              }
            : item
      );
    } else {
      updatedCart = [
        ...currentCart,
        {
          ...product,
          selectedSize,
          selectedColor,
          quantity,
        },
      ];
    }

    localStorage.setItem(
      "fitfusion-cart-items",
      JSON.stringify(updatedCart)
    );

    setMessage(
      `${product.name} was added to your cart.`
    );
  }

  function handleSaveProduct() {
    if (guestMode) {
      showGuestRestriction(
        "save products and outfits"
      );

      return;
    }

    const savedProducts = readStorage(
      "fitfusion-saved-products",
      []
    );

    const alreadySaved =
      savedProducts.some(
        (item) => item.id === product.id
      );

    if (!alreadySaved) {
      localStorage.setItem(
        "fitfusion-saved-products",
        JSON.stringify([
          ...savedProducts,
          product,
        ])
      );
    }

    setMessage(
      alreadySaved
        ? "This product is already saved."
        : "Product saved successfully."
    );
  }

  function decreaseQuantity() {
    setQuantity((current) =>
      Math.max(1, current - 1)
    );
  }

  function increaseQuantity() {
    setQuantity((current) =>
      Math.min(
        Number(product.stock || 99),
        current + 1
      )
    );
  }

  return (
    <main className="product-details-page">
      {!guestMode && (
        <div className="product-details-actions">
          <button
            type="button"
            className="product-details-cart"
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
        </div>
      )}

      <div className="product-details-body">
        <nav className="product-details-breadcrumb">
          <Link to={`${basePath}/catalog`}>
            Catalog
          </Link>

          <span>/</span>

          <button
            type="button"
            onClick={handleSellerNavigation}
          >
            {product.sellerName}
          </button>

          <span>/</span>

          <strong>{product.name}</strong>
        </nav>

        <section className="product-details-grid">
          <div className="product-details-gallery">
            <div
              className={
                `product-details-image ${selectedView}`
              }
            >
              <span
                role="img"
                aria-label={product.name}
              >
                {product.symbol || "👕"}
              </span>
            </div>

            <div className="product-view-buttons">
              {[
                "front",
                "side",
                "rear",
              ].map((view) => (
                <button
                  key={view}
                  type="button"
                  className={
                    selectedView === view
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setSelectedView(view)
                  }
                >
                  {view}
                </button>
              ))}
            </div>

            <p className="product-image-note">
              Select a view to preview the
              garment.
            </p>
          </div>

          <article className="product-information">
            <p className="product-category">
              {product.category}
            </p>

            <h1>{product.name}</h1>

            <div className="product-rating-row">
              <span className="product-stars">
                ★★★★★
              </span>

              <strong>
                {product.rating}
              </strong>

              <span>
                ({ratingsCount} ratings)
              </span>
            </div>

            <div className="product-price-row">
              <strong>
                ₱
                {Number(
                  product.price
                ).toLocaleString()}
              </strong>

              {product.originalPrice && (
                <del>
                  ₱
                  {Number(
                    product.originalPrice
                  ).toLocaleString()}
                </del>
              )}
            </div>

            <p className="product-description">
              {product.description}
            </p>

            <div className="product-match-card">
              <span>FIT MATCH SCORE</span>

              <strong>
                {product.matchScore}
              </strong>

              <p>
                Based on the selected avatar
                measurements.
              </p>
            </div>

            <section className="product-option-group">
              <div className="product-option-heading">
                <h2>Color</h2>
                <span>{selectedColor}</span>
              </div>

              <div className="product-color-options">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={
                      selectedColor === color
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setSelectedColor(color)
                    }
                  >
                    {color}
                  </button>
                ))}
              </div>
            </section>

            <section className="product-option-group">
              <div className="product-option-heading">
                <h2>Select size</h2>

                <button
                  type="button"
                  className="product-size-guide"
                  onClick={() =>
                    setMessage(
                      "Select the size that best matches your avatar measurements."
                    )
                  }
                >
                  Size guide
                </button>
              </div>

              <div className="product-size-options">
                {sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={
                      selectedSize === size
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setSelectedSize(size)
                    }
                  >
                    {size}
                  </button>
                ))}
              </div>
            </section>

            <section className="product-quantity-section">
              <h2>Quantity</h2>

              <div className="product-quantity-control">
                <button
                  type="button"
                  onClick={decreaseQuantity}
                >
                  −
                </button>

                <span>{quantity}</span>

                <button
                  type="button"
                  onClick={increaseQuantity}
                >
                  +
                </button>
              </div>
            </section>

            <div className="product-main-actions">
              <button
                type="button"
                className="product-try-button"
                onClick={handleTryOn}
              >
                Try in Fitting Studio
              </button>

              <button
                type="button"
                className="product-cart-button"
                onClick={handleAddToCart}
              >
                Add to Cart
              </button>
            </div>

            <button
              type="button"
              className="product-save-button"
              onClick={handleSaveProduct}
            >
              Save Product
            </button>

            {message && (
              <div
                className="product-success-message"
                role="status"
              >
                {message}

                <button
                  type="button"
                  onClick={() =>
                    setMessage("")
                  }
                >
                  ×
                </button>
              </div>
            )}
          </article>
        </section>

        <section className="product-seller-card">
          <div>
            <p>SELLER</p>
            <h2>{product.sellerName}</h2>
            <span>
              {product.sellerLocation}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSellerNavigation}
          >
            View Seller Store
          </button>
        </section>

        <section className="product-information-card">
          <h2>Product information</h2>

          <div className="product-information-list">
            <div>
              <span>Category</span>
              <strong>
                {product.category}
              </strong>
            </div>

            <div>
              <span>Available sizes</span>
              <strong>
                {sizes.join(", ")}
              </strong>
            </div>

            <div>
              <span>Available colors</span>
              <strong>
                {colors.join(", ")}
              </strong>
            </div>
          </div>
        </section>

        <section className="product-ratings-section">
          <div className="product-ratings-header">
            <div>
              <p>CUSTOMER FEEDBACK</p>
              <h2>Product Rating</h2>
            </div>

            <div className="product-average-rating">
              <strong>
                {product.rating}
              </strong>

              <div>
                <span className="product-rating-stars">
                  ★★★★★
                </span>

                <small>
                  Based on {ratingsCount} ratings
                </small>
              </div>
            </div>
          </div>

          <div className="product-rating-content">
            <div className="product-rating-score">
              <strong>
                {product.rating}
              </strong>

              <span>out of 5</span>

              <div className="product-rating-large-stars">
                ★★★★★
              </div>

              <p>
                {ratingsCount} verified ratings
              </p>
            </div>

            <div className="product-rating-breakdown">
              {[5, 4, 3, 2, 1].map(
                (stars) => (
                  <RatingBar
                    key={stars}
                    stars={stars}
                    percentage={
                      ratingBreakdown[
                        stars
                      ] || 0
                    }
                  />
                )
              )}
            </div>
          </div>

          <p className="product-rating-notice">
            Only shoppers with delivered orders
            can submit a star rating.
          </p>
        </section>
      </div>

      {showRegistrationModal && (
        <div
          className="guest-product-modal-backdrop"
          onMouseDown={() =>
            setShowRegistrationModal(false)
          }
        >
          <section
            className="guest-product-modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="guest-product-close"
              onClick={() =>
                setShowRegistrationModal(
                  false
                )
              }
            >
              ×
            </button>

            <p>REGISTRATION REQUIRED</p>

            <h2>
              Create an account to continue
            </h2>

            <span>
              You need a registered shopper
              account to {restrictedFeature}.
            </span>

            <div className="guest-product-modal-actions">
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
              className="guest-product-cancel"
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

function RatingBar({
  stars,
  percentage,
}) {
  return (
    <div className="product-rating-bar-row">
      <span>
        {stars} {stars === 1 ? "star" : "stars"}
      </span>

      <div className="product-rating-track">
        <div
          className="product-rating-fill"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>

      <strong>{percentage}%</strong>
    </div>
  );
}

export default ProductDetailsPage;