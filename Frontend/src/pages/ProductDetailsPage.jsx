import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import "./css/ProductDetailsPage.css";

const PRODUCTS = [
  {
    id: "product-001",
    name: "Classic Linen Blouse",
    description:
      "A refined linen-blend blouse designed for comfortable everyday styling.",
    category: "Tops",
    gender: "Women",
    price: 899,
    originalPrice: 1099,
    rating: 4.8,
    reviews: 128,
    sellerId: "seller-001",
    sellerName: "Aurelia Studio",
    sellerRating: 4.9,
    sellerFollowers: 12500,
    sellerProducts: 84,
    sellerLocation: "Makati City",
    symbol: "👚",
    colors: [
      "Ivory",
      "Beige",
      "Black",
    ],
    sizes: ["S", "M", "L", "XL"],
    stock: 24,
    sold: 416,
    matchScore: "6/7",
    material: "Linen and cotton blend",
    fit: "Relaxed fit",
    care: "Hand wash or gentle machine wash",
  },
  {
    id: "product-002",
    name: "Tailored Wide-Leg Trousers",
    description:
      "Tailored wide-leg trousers with a structured waistband and flowing silhouette.",
    category: "Bottoms",
    gender: "Women",
    price: 1299,
    originalPrice: 1499,
    rating: 4.7,
    reviews: 96,
    sellerId: "seller-001",
    sellerName: "Aurelia Studio",
    sellerRating: 4.9,
    sellerFollowers: 12500,
    sellerProducts: 84,
    sellerLocation: "Makati City",
    symbol: "👖",
    colors: [
      "Black",
      "Mocha",
      "Cream",
    ],
    sizes: ["S", "M", "L", "XL"],
    stock: 18,
    sold: 263,
    matchScore: "6/7",
    material: "Premium polyester blend",
    fit: "High-waist wide-leg fit",
    care: "Machine wash cold",
  },
  {
    id: "product-003",
    name: "Modern Structured Blazer",
    description:
      "A modern structured blazer with clean lines and a polished silhouette.",
    category: "Outerwear",
    gender: "Unisex",
    price: 1899,
    originalPrice: 2299,
    rating: 4.9,
    reviews: 212,
    sellerId: "seller-002",
    sellerName: "Maison Moderne",
    sellerRating: 4.9,
    sellerFollowers: 18200,
    sellerProducts: 112,
    sellerLocation: "Quezon City",
    symbol: "🧥",
    colors: [
      "Beige",
      "Black",
      "Charcoal",
    ],
    sizes: [
      "S",
      "M",
      "L",
      "XL",
      "2XL",
    ],
    stock: 12,
    sold: 571,
    matchScore: "7/7",
    material: "Structured woven fabric",
    fit: "Regular structured fit",
    care: "Dry clean recommended",
  },
  {
    id: "product-004",
    name: "Premium Cotton Polo",
    description:
      "A breathable premium cotton polo designed with a clean collar and classic silhouette.",
    category: "Tops",
    gender: "Men",
    price: 799,
    originalPrice: 999,
    rating: 4.6,
    reviews: 75,
    sellerId: "seller-003",
    sellerName: "North & Thread",
    sellerRating: 4.7,
    sellerFollowers: 8900,
    sellerProducts: 67,
    sellerLocation: "Pasig City",
    symbol: "👕",
    colors: [
      "Navy Blue",
      "White",
      "Black",
    ],
    sizes: [
      "S",
      "M",
      "L",
      "XL",
      "2XL",
    ],
    stock: 31,
    sold: 355,
    matchScore: "6/7",
    material: "100% premium cotton",
    fit: "Regular fit",
    care: "Machine wash cold",
  },
  {
    id: "product-005",
    name: "Pleated Midi Dress",
    description:
      "An elegant pleated midi dress with a softly defined waist and flowing skirt.",
    category: "Dresses",
    gender: "Women",
    price: 1499,
    originalPrice: 1799,
    rating: 4.8,
    reviews: 164,
    sellerId: "seller-004",
    sellerName: "Élan Collective",
    sellerRating: 4.8,
    sellerFollowers: 15400,
    sellerProducts: 93,
    sellerLocation: "Taguig City",
    symbol: "👗",
    colors: [
      "Champagne",
      "Rose",
      "Black",
    ],
    sizes: [
      "XS",
      "S",
      "M",
      "L",
      "XL",
    ],
    stock: 16,
    sold: 438,
    matchScore: "7/7",
    material: "Pleated chiffon blend",
    fit: "Defined waist, flowy skirt",
    care: "Hand wash recommended",
  },
  {
    id: "product-006",
    name: "Relaxed Utility Jacket",
    description:
      "A lightweight utility jacket featuring practical pockets and a relaxed silhouette.",
    category: "Outerwear",
    gender: "Unisex",
    price: 1599,
    originalPrice: 1899,
    rating: 4.5,
    reviews: 68,
    sellerId: "seller-003",
    sellerName: "North & Thread",
    sellerRating: 4.7,
    sellerFollowers: 8900,
    sellerProducts: 67,
    sellerLocation: "Pasig City",
    symbol: "🥼",
    colors: [
      "Olive",
      "Black",
      "Khaki",
    ],
    sizes: ["M", "L", "XL", "2XL"],
    stock: 20,
    sold: 186,
    matchScore: "5/7",
    material: "Cotton twill",
    fit: "Relaxed utility fit",
    care: "Machine wash cold",
  },
  {
    id: "product-007",
    name: "High-Waist A-Line Skirt",
    description:
      "A flattering high-waist A-line skirt with a clean waistband and versatile midi length.",
    category: "Bottoms",
    gender: "Women",
    price: 999,
    originalPrice: 1199,
    rating: 4.7,
    reviews: 84,
    sellerId: "seller-004",
    sellerName: "Élan Collective",
    sellerRating: 4.8,
    sellerFollowers: 15400,
    sellerProducts: 93,
    sellerLocation: "Taguig City",
    symbol: "👗",
    colors: [
      "Mocha",
      "Black",
      "Cream",
    ],
    sizes: ["XS", "S", "M", "L"],
    stock: 14,
    sold: 229,
    matchScore: "6/7",
    material: "Textured woven fabric",
    fit: "High-waist A-line fit",
    care: "Gentle machine wash",
  },
  {
    id: "product-008",
    name: "Straight-Cut Denim Jeans",
    description:
      "Classic straight-cut denim jeans with a comfortable waistband and timeless finish.",
    category: "Bottoms",
    gender: "Unisex",
    price: 1199,
    originalPrice: 1399,
    rating: 4.6,
    reviews: 143,
    sellerId: "seller-005",
    sellerName: "Streetform Manila",
    sellerRating: 4.6,
    sellerFollowers: 10300,
    sellerProducts: 76,
    sellerLocation: "Manila",
    symbol: "👖",
    colors: [
      "Dark Blue",
      "Light Blue",
      "Black",
    ],
    sizes: [
      "S",
      "M",
      "L",
      "XL",
      "2XL",
    ],
    stock: 27,
    sold: 502,
    matchScore: "6/7",
    material: "Denim cotton blend",
    fit: "Straight-cut fit",
    care: "Machine wash inside out",
  },
];

const SAMPLE_REVIEWS = [
  {
    id: "review-001",
    name: "Angela M.",
    rating: 5,
    date: "September 28, 2026",
    size: "M",
    comment:
      "The fabric feels comfortable and the item looks exactly like the product display.",
  },
  {
    id: "review-002",
    name: "Marielle S.",
    rating: 5,
    date: "September 22, 2026",
    size: "L",
    comment:
      "The fit was accurate based on the seller's size information.",
  },
  {
    id: "review-003",
    name: "Jamie R.",
    rating: 4,
    date: "September 17, 2026",
    size: "S",
    comment:
      "Good quality and color. The overall item is very nice.",
  },
];

function readStorageArray(key) {
  try {
    const value = JSON.parse(
      localStorage.getItem(key) || "[]"
    );

    return Array.isArray(value)
      ? value
      : [];
  } catch {
    return [];
  }
}

function formatPrice(price) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(Number(price) || 0);
}

function normalizeProduct(
  selectedProduct
) {
  const normalizedColors =
    Array.isArray(
      selectedProduct.colors
    ) &&
    selectedProduct.colors.length > 0
      ? selectedProduct.colors
      : [
          selectedProduct.color ||
            "Beige",
        ];

  const normalizedSizes =
    Array.isArray(
      selectedProduct.sizes
    ) &&
    selectedProduct.sizes.length > 0
      ? selectedProduct.sizes
      : ["S", "M", "L"];

  return {
    description:
      "A carefully selected fashion item from a verified FitFusion seller.",

    category: "Clothing",
    gender: "Unisex",

    price: 0,
    originalPrice: 0,

    rating: 0,
    reviews: 0,

    sellerId: "luna-clothing",
    sellerName: "Luna Clothing",
    sellerRating: 4.8,
    sellerFollowers: 10000,
    sellerProducts: 50,
    sellerLocation: "Metro Manila",

    symbol: "👕",
    stock: 25,
    sold: 0,
    matchScore: "6/7",

    material:
      "Seller-provided material",

    fit:
      "Seller-provided fit",

    care:
      "Follow the product care label",

    ...selectedProduct,

    colors: normalizedColors,
    sizes: normalizedSizes,

    stock: Number(
      selectedProduct.stock ?? 25
    ),

    sold: Number(
      selectedProduct.sold ?? 0
    ),

    rating: Number(
      selectedProduct.rating ?? 0
    ),

    reviews: Number(
      selectedProduct.reviews ?? 0
    ),

    price: Number(
      selectedProduct.price ?? 0
    ),

    originalPrice: Number(
      selectedProduct.originalPrice ??
        selectedProduct.price ??
        0
    ),
  };
}

function ProductDetailsPage() {
  const navigate = useNavigate();
  const { productId } = useParams();

  const [product, setProduct] =
    useState(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    selectedColor,
    setSelectedColor,
  ] = useState("");

  const [
    selectedSize,
    setSelectedSize,
  ] = useState("");

  const [quantity, setQuantity] =
    useState(1);

  const [cartCount, setCartCount] =
    useState(0);

  const [sizeError, setSizeError] =
    useState("");

  const [
    toastMessage,
    setToastMessage,
  ] = useState("");

  const [
    showSizeGuide,
    setShowSizeGuide,
  ] = useState(false);

  const [
    isFavorite,
    setIsFavorite,
  ] = useState(false);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });

    setIsLoading(true);

    let selectedProduct = null;

    const storedProductText =
      localStorage.getItem(
        "fitfusion-selected-product"
      );

    if (storedProductText) {
      try {
        const storedProduct =
          JSON.parse(
            storedProductText
          );

        if (
          String(storedProduct.id) ===
          String(productId)
        ) {
          selectedProduct =
            storedProduct;
        }
      } catch {
        localStorage.removeItem(
          "fitfusion-selected-product"
        );
      }
    }

    if (!selectedProduct) {
      selectedProduct =
        PRODUCTS.find(
          (item) =>
            String(item.id) ===
            String(productId)
        ) || null;
    }

    if (selectedProduct) {
      const completedProduct =
        normalizeProduct(
          selectedProduct
        );

      setProduct(completedProduct);

      setSelectedColor(
        completedProduct.colors[0] ||
          ""
      );

      setSelectedSize("");
      setQuantity(1);
    } else {
      setProduct(null);
    }

    const cartItems =
      readStorageArray(
        "fitfusion-cart-items"
      );

    const count = cartItems.reduce(
      (total, item) =>
        total +
        (Number(item.quantity) || 1),
      0
    );

    setCartCount(count);

    const favorites =
      readStorageArray(
        "fitfusion-favorite-products"
      );

    setIsFavorite(
      favorites.some(
        (item) =>
          String(item.id) ===
          String(productId)
      )
    );

    setIsLoading(false);
  }, [productId]);

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }

    const timer =
      window.setTimeout(() => {
        setToastMessage("");
      }, 2600);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toastMessage]);

  const savings = useMemo(() => {
    if (!product) {
      return 0;
    }

    return Math.max(
      product.originalPrice -
        product.price,
      0
    );
  }, [product]);

  const discountPercentage =
    useMemo(() => {
      if (
        !product ||
        !product.originalPrice
      ) {
        return 0;
      }

      return Math.round(
        ((product.originalPrice -
          product.price) /
          product.originalPrice) *
          100
      );
    }, [product]);

  function updateCartCount() {
    const count = readStorageArray(
      "fitfusion-cart-items"
    ).reduce((total, item) => {
      return (
        total +
        (Number(item.quantity) ||
          1)
      );
    }, 0);

    setCartCount(count);
  }

  function validateSelection() {
    if (!selectedSize) {
      setSizeError(
        "Please select a size before adding this product. Available sizes are provided by the seller."
      );

      return false;
    }

    setSizeError("");
    return true;
  }

  function addProductToCart() {
    if (!validateSelection()) {
      return false;
    }

    const cartItems =
      readStorageArray(
        "fitfusion-cart-items"
      );

    const existingIndex =
      cartItems.findIndex(
        (item) =>
          String(item.id) ===
            String(product.id) &&
          item.selectedSize ===
            selectedSize &&
          item.selectedColor ===
            selectedColor
      );

    let nextCart;

    if (existingIndex >= 0) {
      nextCart = cartItems.map(
        (item, index) =>
          index === existingIndex
            ? {
                ...item,
                quantity:
                  (Number(
                    item.quantity
                  ) || 1) +
                  quantity,
              }
            : item
      );
    } else {
      nextCart = [
        ...cartItems,
        {
          ...product,
          selectedSize,
          selectedColor,
          quantity,
          addedAt:
            new Date().toISOString(),
        },
      ];
    }

    localStorage.setItem(
      "fitfusion-cart-items",
      JSON.stringify(nextCart)
    );

    updateCartCount();

    setToastMessage(
      `${product.name} was added to your cart.`
    );

    return true;
  }

  function handleBuyNow() {
    const wasAdded =
      addProductToCart();

    if (!wasAdded) {
      return;
    }

    window.setTimeout(() => {
      navigate("/shopper/cart");
    }, 500);
  }

  function handleTryOn() {
    const selectedItem = {
      ...product,
      selectedSize:
        selectedSize || null,
      selectedColor,
      quantity: 1,
      selectedAt:
        new Date().toISOString(),
    };

    localStorage.setItem(
      "fitfusion-selected-product",
      JSON.stringify(product)
    );

    localStorage.setItem(
      "fitfusion-selected-items",
      JSON.stringify([
        selectedItem,
      ])
    );

    setToastMessage(
      `${product.name} was sent to the Fitting Studio.`
    );

    window.setTimeout(() => {
      navigate(
        "/shopper/fitting-studio/customize"
      );
    }, 600);
  }

  function handleFavorite() {
    const favorites =
      readStorageArray(
        "fitfusion-favorite-products"
      );

    let nextFavorites;

    if (isFavorite) {
      nextFavorites =
        favorites.filter(
          (item) =>
            String(item.id) !==
            String(product.id)
        );

      setToastMessage(
        "Product removed from favorites."
      );
    } else {
      nextFavorites = [
        ...favorites,
        product,
      ];

      setToastMessage(
        "Product added to favorites."
      );
    }

    localStorage.setItem(
      "fitfusion-favorite-products",
      JSON.stringify(nextFavorites)
    );

    setIsFavorite(
      (current) => !current
    );
  }

  function openSellerStore() {
    localStorage.setItem(
      "fitfusion-selected-seller",
      JSON.stringify({
        id: product.sellerId,
        name: product.sellerName,
        rating:
          product.sellerRating,
        followers:
          product.sellerFollowers,
        products:
          product.sellerProducts,
        location:
          product.sellerLocation,
      })
    );

    navigate(
      `/shopper/sellers/${product.sellerId}`
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
        product.stock,
        current + 1
      )
    );
  }

  if (isLoading) {
    return (
      <main className="product-details-not-found">
        <section>
          <p>LOADING PRODUCT</p>

          <h1>
            Preparing product details
          </h1>
        </section>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="product-details-not-found">
        <section>
          <p>PRODUCT NOT FOUND</p>

          <h1>
            This product is unavailable
          </h1>

          <span>
            The product may have been
            removed or the selected link
            may be incorrect.
          </span>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/shopper/catalog"
              )
            }
          >
            Return to Catalog
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="product-details-page">
      <section className="product-details-content">
        <header className="product-details-header">
          <div>
            <p className="product-details-page-code">
              10 — PRODUCT DETAILS
            </p>

            <p className="product-details-description">
              Review the product, seller,
              sizes, and customer ratings
            </p>
          </div>

          <div className="product-details-header-actions">
            <button
              type="button"
              className="product-details-cart"
              onClick={() =>
                navigate(
                  "/shopper/cart"
                )
              }
              aria-label={`Open cart with ${cartCount} items`}
            >
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

              <span>
                {cartCount}
              </span>
            </button>

            <div className="product-details-role">
              REGISTERED SHOPPER
            </div>
          </div>
        </header>

        <div className="product-details-body">
          <div className="product-details-breadcrumb">
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/shopper/catalog"
                )
              }
            >
              Catalog
            </button>

            <span>›</span>

            <span>
              {product.category}
            </span>

            <span>›</span>

            <strong>
              {product.name}
            </strong>
          </div>

          <section className="product-details-main">
            <div className="product-details-gallery">
              <div className="product-details-main-image">
                {discountPercentage >
                  0 && (
                  <span className="product-details-discount">
                    -
                    {
                      discountPercentage
                    }
                    %
                  </span>
                )}

                <button
                  type="button"
                  className={
                    isFavorite
                      ? "product-details-favorite active"
                      : "product-details-favorite"
                  }
                  onClick={
                    handleFavorite
                  }
                  aria-label={
                    isFavorite
                      ? "Remove product from favorites"
                      : "Add product to favorites"
                  }
                >
                  {isFavorite
                    ? "♥"
                    : "♡"}
                </button>

                <div className="product-details-symbol">
                  {product.symbol}
                </div>

                <span className="product-details-match">
                  Match score:{" "}
                  {
                    product.matchScore
                  }
                </span>
              </div>

              <div className="product-details-thumbnail-row">
                {[
                  "Front",
                  "Side",
                  "Rear",
                ].map((view) => (
                  <button
                    key={view}
                    type="button"
                  >
                    <span>
                      {product.symbol}
                    </span>

                    <small>
                      {view}
                    </small>
                  </button>
                ))}
              </div>
            </div>

            <div className="product-details-information">
              <div className="product-details-product-labels">
                <span>
                  {product.category}
                </span>

                <span>
                  {product.gender}
                </span>

                {product.stock <=
                  15 && (
                  <span className="low-stock">
                    LOW STOCK
                  </span>
                )}
              </div>

              <h1>
                {product.name}
              </h1>

              <button
                type="button"
                className="product-details-seller-name"
                onClick={
                  openSellerStore
                }
              >
                Sold by{" "}

                <strong>
                  {
                    product.sellerName
                  }
                </strong>
              </button>

              <div className="product-details-rating-row">
                <div>
                  <span>★</span>

                  <strong>
                    {product.rating}
                  </strong>

                  <small>
                    {product.reviews}{" "}
                    reviews
                  </small>
                </div>

                <span />

                <p>
                  {product.sold} sold
                </p>
              </div>

              <div className="product-details-price-row">
                <strong>
                  {formatPrice(
                    product.price
                  )}
                </strong>

                {product.originalPrice >
                  product.price && (
                  <del>
                    {formatPrice(
                      product.originalPrice
                    )}
                  </del>
                )}

                {savings > 0 && (
                  <span>
                    Save{" "}
                    {formatPrice(
                      savings
                    )}
                  </span>
                )}
              </div>

              <p className="product-details-product-description">
                {
                  product.description
                }
              </p>

              <div className="product-details-option">
                <div className="product-details-option-heading">
                  <label>
                    Color
                  </label>

                  <strong>
                    {selectedColor}
                  </strong>
                </div>

                <div className="product-details-color-options">
                  {product.colors.map(
                    (color) => (
                      <button
                        key={color}
                        type="button"
                        className={
                          selectedColor ===
                          color
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          setSelectedColor(
                            color
                          )
                        }
                      >
                        {color}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div
                className={
                  sizeError
                    ? "product-details-option has-error"
                    : "product-details-option"
                }
              >
                <div className="product-details-option-heading">
                  <label>
                    Select size
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      setShowSizeGuide(
                        true
                      )
                    }
                  >
                    Size Guide
                  </button>
                </div>

                <div className="product-details-size-options">
                  {product.sizes.map(
                    (productSize) => (
                      <button
                        key={
                          productSize
                        }
                        type="button"
                        className={
                          selectedSize ===
                          productSize
                            ? "active"
                            : ""
                        }
                        onClick={() => {
                          setSelectedSize(
                            productSize
                          );

                          setSizeError(
                            ""
                          );
                        }}
                      >
                        {
                          productSize
                        }
                      </button>
                    )
                  )}
                </div>

                <p className="product-details-size-note">
                  Available sizes are
                  provided by the seller.
                  Measurements may differ
                  between brands.
                </p>

                {sizeError && (
                  <p className="product-details-size-error">
                    {sizeError}
                  </p>
                )}
              </div>

              <div className="product-details-quantity-section">
                <label>
                  Quantity
                </label>

                <div className="product-details-quantity">
                  <button
                    type="button"
                    onClick={
                      decreaseQuantity
                    }
                    disabled={
                      quantity <= 1
                    }
                  >
                    −
                  </button>

                  <span>
                    {quantity}
                  </span>

                  <button
                    type="button"
                    onClick={
                      increaseQuantity
                    }
                    disabled={
                      quantity >=
                      product.stock
                    }
                  >
                    +
                  </button>
                </div>

                <small>
                  {product.stock}{" "}
                  item
                  {product.stock === 1
                    ? ""
                    : "s"}{" "}
                  available
                </small>
              </div>

              <div className="product-details-action-grid">
                <button
                  type="button"
                  className="product-details-cart-button"
                  onClick={
                    addProductToCart
                  }
                >
                  Add to Cart
                </button>

                <button
                  type="button"
                  className="product-details-buy-button"
                  onClick={
                    handleBuyNow
                  }
                >
                  Buy Now
                </button>
              </div>

              <button
                type="button"
                className="product-details-try-button"
                onClick={
                  handleTryOn
                }
              >
                Try This Product in
                the Fitting Studio
              </button>
            </div>
          </section>

          <section className="product-details-seller-card">
            <div className="product-details-seller-logo">
              {product.sellerName
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="product-details-seller-information">
              <p>
                VERIFIED SELLER
              </p>

              <h2>
                {
                  product.sellerName
                }
              </h2>

              <span>
                {
                  product.sellerLocation
                }
              </span>
            </div>

            <div className="product-details-seller-statistics">
              <div>
                <strong>
                  {
                    product.sellerRating
                  }
                </strong>

                <span>
                  Store rating
                </span>
              </div>

              <div>
                <strong>
                  {Number(
                    product.sellerFollowers
                  ).toLocaleString()}
                </strong>

                <span>
                  Followers
                </span>
              </div>

              <div>
                <strong>
                  {
                    product.sellerProducts
                  }
                </strong>

                <span>
                  Products
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={
                openSellerStore
              }
            >
              Visit Seller Store
            </button>
          </section>

          <section className="product-details-information-grid">
            <article>
              <p>
                PRODUCT INFORMATION
              </p>

              <h2>
                Item details
              </h2>

              <dl>
                <div>
                  <dt>
                    Category
                  </dt>

                  <dd>
                    {
                      product.category
                    }
                  </dd>
                </div>

                <div>
                  <dt>
                    Gender
                  </dt>

                  <dd>
                    {product.gender}
                  </dd>
                </div>

                <div>
                  <dt>
                    Material
                  </dt>

                  <dd>
                    {
                      product.material
                    }
                  </dd>
                </div>

                <div>
                  <dt>Fit</dt>

                  <dd>
                    {product.fit}
                  </dd>
                </div>

                <div>
                  <dt>Care</dt>

                  <dd>
                    {product.care}
                  </dd>
                </div>
              </dl>
            </article>

            <article>
              <p>
                DELIVERY INFORMATION
              </p>

              <h2>
                Shipping and returns
              </h2>

              <ul>
                <li>
                  Ships from{" "}
                  {
                    product.sellerLocation
                  }
                </li>

                <li>
                  Estimated delivery:
                  3–7 business days
                </li>

                <li>
                  Cash on delivery may
                  be available
                </li>

                <li>
                  Return eligibility
                  depends on seller
                  policy
                </li>
              </ul>
            </article>
          </section>

          <section className="product-details-review-section">
            <div className="product-details-review-heading">
              <div>
                <p>
                  CUSTOMER FEEDBACK
                </p>

                <h2>
                  Product ratings and
                  reviews
                </h2>
              </div>

              <div className="product-details-review-summary">
                <strong>
                  {product.rating}
                </strong>

                <div>
                  <span>
                    ★★★★★
                  </span>

                  <small>
                    Based on{" "}
                    {product.reviews}{" "}
                    reviews
                  </small>
                </div>
              </div>
            </div>

            <div className="product-details-review-list">
              {SAMPLE_REVIEWS.map(
                (review) => (
                  <article
                    key={review.id}
                  >
                    <div className="product-details-review-user">
                      {review.name
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="product-details-review-content">
                      <div>
                        <strong>
                          {
                            review.name
                          }
                        </strong>

                        <span>
                          {
                            review.date
                          }
                        </span>
                      </div>

                      <p className="product-details-review-stars">
                        {"★".repeat(
                          review.rating
                        )}

                        {"☆".repeat(
                          5 -
                            review.rating
                        )}
                      </p>

                      <small>
                        Purchased size:{" "}
                        {review.size}
                      </small>

                      <p>
                        {
                          review.comment
                        }
                      </p>
                    </div>
                  </article>
                )
              )}
            </div>
          </section>
        </div>
      </section>

      {showSizeGuide && (
        <div
          className="product-details-modal-backdrop"
          role="presentation"
          onMouseDown={() =>
            setShowSizeGuide(false)
          }
        >
          <section
            className="product-details-size-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="size-guide-title"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="product-details-modal-heading">
              <div>
                <p>
                  SELLER SIZE GUIDE
                </p>

                <h2 id="size-guide-title">
                  Size information
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowSizeGuide(
                    false
                  )
                }
              >
                ×
              </button>
            </div>

            <div className="product-details-size-warning">
              <strong>
                Important:
              </strong>

              <span>
                These are sample
                measurements for the
                prototype. Final
                measurements will come
                from the seller's
                product data.
              </span>
            </div>

            <div className="product-details-size-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Size</th>
                    <th>
                      Bust/Chest
                    </th>
                    <th>Waist</th>
                    <th>Hip</th>
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td>XS</td>
                    <td>
                      30–32 in
                    </td>
                    <td>
                      24–26 in
                    </td>
                    <td>
                      33–35 in
                    </td>
                  </tr>

                  <tr>
                    <td>S</td>
                    <td>
                      32–34 in
                    </td>
                    <td>
                      26–28 in
                    </td>
                    <td>
                      35–37 in
                    </td>
                  </tr>

                  <tr>
                    <td>M</td>
                    <td>
                      34–36 in
                    </td>
                    <td>
                      28–30 in
                    </td>
                    <td>
                      37–39 in
                    </td>
                  </tr>

                  <tr>
                    <td>L</td>
                    <td>
                      36–39 in
                    </td>
                    <td>
                      30–33 in
                    </td>
                    <td>
                      39–42 in
                    </td>
                  </tr>

                  <tr>
                    <td>XL</td>
                    <td>
                      39–42 in
                    </td>
                    <td>
                      33–36 in
                    </td>
                    <td>
                      42–45 in
                    </td>
                  </tr>

                  <tr>
                    <td>2XL</td>
                    <td>
                      42–46 in
                    </td>
                    <td>
                      36–40 in
                    </td>
                    <td>
                      45–49 in
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <button
              type="button"
              className="product-details-close-guide"
              onClick={() =>
                setShowSizeGuide(false)
              }
            >
              Close Size Guide
            </button>
          </section>
        </div>
      )}

      {toastMessage && (
        <div
          className="product-details-toast"
          role="status"
        >
          {toastMessage}
        </div>
      )}
    </main>
  );
}

export default ProductDetailsPage;