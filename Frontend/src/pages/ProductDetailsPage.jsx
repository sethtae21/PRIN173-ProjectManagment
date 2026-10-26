import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { API_URL, cartAPI } from "../services/api";
import "./css/ProductDetailsPage.css";

// Helper to construct image URLs
function mediaUrl(path) {
  if (!path) return null;
  if (String(path).startsWith("http")) return path;
  return `${API_URL}${String(path).startsWith("/") ? "" : "/"}${path}`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
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

function ProductDetailsPage({ isGuest = false }) {
  const navigate = useNavigate();
  const { productId } = useParams();
  const outletContext = useOutletContext();
  const guestMode = isGuest || outletContext?.isGuest === true;
  const basePath = guestMode ? "/guest" : "/shopper";
  
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  
  // UI State
  const [selectedView, setSelectedView] = useState("front");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [restrictedFeature, setRestrictedFeature] = useState("");
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [cartError, setCartError] = useState("");
  const [cartCount, setCartCount] = useState(getCartCount());

  // 1. Fetch Product Data
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError("");
    
    async function fetchProduct() {
      try {
        const response = await fetch(`${API_URL}/catalog/${productId}/`);
        if (!response.ok) {
          throw new Error("Product not found");
        }
        const data = await response.json();
        if (isMounted) {
          setProduct({
            ...data,
            // FIX: Side view removed — the backend pipeline only stores
            // Front and Rear assets, so the Side button was dead UI.
            frontImageUrl: mediaUrl(data.front_image),
            rearImageUrl: mediaUrl(data.rear_image),
            displayCategory: data.category ? data.category.charAt(0).toUpperCase() + data.category.slice(1) : "Item",
            sellerName: data.store_name || "FitFusion Store",
            availableSize: data.size || "M",
            sizeDisplay: `${data.size || "M"} ${data.size_cm ? data.size_cm : ""}`,
          });
        }
      } catch (err) {
        console.error("Failed to load product:", err);
        if (isMounted) {
          setError("Could not load product details.");
          setProduct({ id: productId, name: "Unknown Product", price: 0, store_name: "Unknown Store" });
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    
    if (productId) fetchProduct();
    return () => { isMounted = false; };
  }, [productId]);

  // Update cart count when cart changes
  useEffect(() => {
    const updateCount = () => setCartCount(getCartCount());
    window.addEventListener("fitfusion-cart-updated", updateCount);
    window.addEventListener("storage", updateCount);
    return () => {
      window.removeEventListener("fitfusion-cart-updated", updateCount);
      window.removeEventListener("storage", updateCount);
    };
  }, []);

  // 2. Actions
  function handleSellerNavigation() {
    console.log("Viewing store for:", product?.store_name);
  }

  function handleTryOn() {
    if (!product) return;
    const selectedItem = {
      ...product,
      selectedSize: product.availableSize,
      selectedColor: product.color,
      quantity,
    };
    if (guestMode) {
      sessionStorage.setItem("fitfusion-selected-items", JSON.stringify([selectedItem]));
    } else {
      localStorage.setItem("fitfusion-selected-items", JSON.stringify([selectedItem]));
    }
    navigate(`${basePath}/fitting-studio/customize`);
  }

  async function handleAddToCart() {
    if (guestMode) {
      setRestrictedFeature("add products to your shopping cart");
      setShowRegistrationModal(true);
      return;
    }
    if (!product || isAddingToCart) return;
    
    setIsAddingToCart(true);
    setCartError("");
    setMessage("");
    
    try {
      // Call backend API to add item to cart
      await cartAPI.addItem(product.id, quantity);
      
      // Update localStorage cart for immediate UI feedback
      const cart = readCart();
      const existingIndex = cart.findIndex((item) => item.id === product.id);
      const nextCart = [...cart];
      
      if (existingIndex >= 0) {
        nextCart[existingIndex] = {
          ...nextCart[existingIndex],
          quantity: Number(nextCart[existingIndex].quantity || 1) + quantity,
        };
      } else {
        nextCart.push({
          id: product.id,
          name: product.name,
          price: product.price,
          storeName: product.store_name,
          imageUrl: product.frontImageUrl,
          quantity: quantity,
          selectedSize: product.availableSize,
          selectedColor: product.color,
          selected: true,
        });
      }
      
      localStorage.setItem("fitfusion-cart", JSON.stringify(nextCart));
      setCartCount(getCartCount());
      window.dispatchEvent(new Event("fitfusion-cart-updated"));
      setMessage(`${product.name} was added to your cart.`);
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Failed to add item to cart:", error);
      setCartError("We couldn't add this item to your cart. Please try again.");
    } finally {
      setIsAddingToCart(false);
    }
  }

  if (isLoading) {
    return (
      <main className="product-details-page">
        <div className="product-details-body" style={{ padding: "4rem", textAlign: "center" }}>
          <p>Loading product details...</p>
        </div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="product-details-page">
        <div className="product-details-body" style={{ padding: "4rem", textAlign: "center" }}>
          <h2>Product Not Found</h2>
          <p>{error || "This product may have been removed."}</p>
          <Link to={`${basePath}/catalog`} className="product-try-button" style={{ textDecoration: "none", display: "inline-block", marginTop: "1rem" }}>
            Return to Catalog
          </Link>
        </div>
      </main>
    );
  }

  // FIX: Side view removed — only Front / Rear assets exist.
  const currentImage =
    selectedView === "front" ? product.frontImageUrl : product.rearImageUrl;

  return (
    <main className="product-details-page">
      {!guestMode && (
        <div className="product-details-actions">
          <button
            type="button"
            className="product-details-cart"
            onClick={() => navigate("/shopper/cart")}
            aria-label={`Open cart with ${cartCount} items`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
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
          <Link to={`${basePath}/catalog`}>Catalog</Link>
          <span>/</span>
          <button type="button" onClick={handleSellerNavigation} className="breadcrumb-link">
            {product.sellerName}
          </button>
          <span>/</span>
          <strong>{product.name}</strong>
        </nav>
        <section className="product-details-grid">
          {/* LEFT: Gallery */}
          <div className="product-details-gallery">
            <div className="product-details-image-container">
              {currentImage ? (
                <img
                  src={currentImage}
                  alt={`${product.name} - ${selectedView} view`}
                  className="product-details-main-image"
                />
              ) : (
                <div className="product-details-placeholder">
                  <span>{product.displayCategory}</span>
                </div>
              )}
            </div>
            {/* FIX: Side button removed — only Front / Rear remain */}
            <div className="product-view-buttons">
              {["front", "rear"].map((view) => {
                const hasImage =
                  view === "front" ? product.frontImageUrl : product.rearImageUrl;
                return (
                  <button
                    key={view}
                    type="button"
                    className={selectedView === view ? "active" : ""}
                    onClick={() => hasImage && setSelectedView(view)}
                    disabled={!hasImage}
                  >
                    {view}
                  </button>
                );
              })}
            </div>
          </div>
          {/* RIGHT: Information */}
          <article className="product-information">
            <p className="product-category">{product.displayCategory}</p>
            <h1>{product.name}</h1>
            <div className="product-price-row">
              <strong>{formatCurrency(product.price)}</strong>
            </div>
            <p className="product-description">{product.description}</p>
            {/* Size Info Card */}
            <div className="product-match-card">
              <span>AVAILABLE SIZE</span>
              <strong>{product.sizeDisplay}</strong>
              <p>Standard size chart reference.</p>
            </div>
            {/* Color Selection */}
            <section className="product-option-group">
              <div className="product-option-heading">
                <h2>Color</h2>
                <span>{product.color}</span>
              </div>
              <div className="product-color-options">
                <button type="button" className="active" disabled>
                  {product.color}
                </button>
              </div>
            </section>
            {/* Size Selection */}
            <section className="product-option-group">
              <div className="product-option-heading">
                <h2>Size</h2>
                <span>{product.availableSize}</span>
              </div>
              <div className="product-size-options">
                <button type="button" className="active" disabled>
                  {product.availableSize}
                </button>
              </div>
              <p style={{ fontSize: "11px", color: "#756b60", marginTop: "8px" }}>
                This listing is for size {product.availableSize}.
              </p>
            </section>
            <section className="product-quantity-section">
              <h2>Quantity</h2>
              <div className="product-quantity-control">
                <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
                <span>{quantity}</span>
                <button type="button" onClick={() => setQuantity(quantity + 1)}>+</button>
              </div>
            </section>
            <div className="product-main-actions">
              <button type="button" className="product-try-button" onClick={handleTryOn}>
                Try in Fitting Studio
              </button>
              <button 
                type="button" 
                className="product-cart-button" 
                onClick={handleAddToCart}
                disabled={isAddingToCart}
              >
                {isAddingToCart ? "Adding..." : "Add to Cart"}
              </button>
            </div>
            {message && (
              <div className="product-success-message" role="status">
                {message}
                <button type="button" onClick={() => setMessage("")}>×</button>
              </div>
            )}
            {cartError && (
              <div className="product-error-message" role="alert" style={{ marginTop: "10px", padding: "10px", background: "#fff0ed", border: "1px solid #d78d7e", borderRadius: "8px", color: "#842c1f", fontSize: "12px" }}>
                {cartError}
              </div>
            )}
          </article>
        </section>
        {/* Seller Card */}
        <section className="product-seller-card">
          <div>
            <p>SELLER</p>
            <h2>{product.sellerName}</h2>
            <span>FitFusion Partner</span>
          </div>
          <button type="button" onClick={handleSellerNavigation}>
            View Seller Store
          </button>
        </section>
        {/* Product Information Table */}
        <section className="product-information-card">
          <h2>Product information</h2>
          <div className="product-information-list">
            <div>
              <span>Category</span>
              <strong>{product.displayCategory}</strong>
            </div>
            <div>
              <span>Color Family</span>
              <strong>{product.color_family || product.color}</strong>
            </div>
            <div>
              <span>Style Tags</span>
              <strong>{Array.isArray(product.style_tags) ? product.style_tags.join(", ") : "Casual"}</strong>
            </div>
          </div>
        </section>
        {/* RATINGS SECTION (RESTORED) */}
        <section className="product-ratings-section">
          <div className="product-ratings-header">
            <div>
              <p>CUSTOMER FEEDBACK</p>
              <h2>Product Rating</h2>
            </div>
            <div className="product-average-rating">
              <strong>4.8</strong>
              <div>
                <span className="product-rating-stars">★★★★★</span>
                <small>Based on 128 ratings</small>
              </div>
            </div>
          </div>
          <div className="product-rating-content">
            <div className="product-rating-score">
              <strong>4.8</strong>
              <span>out of 5</span>
              <div className="product-rating-large-stars">★★★★★</div>
              <p>128 verified ratings</p>
            </div>
            <div className="product-rating-breakdown">
              {[5, 4, 3, 2, 1].map((stars) => (
                <RatingBar
                  key={stars}
                  stars={stars}
                  percentage={
                    stars === 5 ? 78 :
                    stars === 4 ? 16 :
                    stars === 3 ? 4 :
                    stars === 2 ? 1 : 1
                  }
                />
              ))}
            </div>
          </div>
          <p className="product-rating-notice">
            Try this item in the Fitting Studio to rate how it looks on your avatar.
          </p>
        </section>
      </div>
      {/* Guest Modal */}
      {showRegistrationModal && (
        <div className="guest-product-modal-backdrop" onMouseDown={() => setShowRegistrationModal(false)}>
          <section className="guest-product-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <button type="button" className="guest-product-close" onClick={() => setShowRegistrationModal(false)}>×</button>
            <p>REGISTRATION REQUIRED</p>
            <h2>Create an account to continue</h2>
            <span>You need a registered shopper account to {restrictedFeature}.</span>
            <div className="guest-product-modal-actions">
              <button type="button" onClick={() => navigate("/signup")}>Create Account</button>
              <button type="button" onClick={() => navigate("/login")}>Log In</button>
            </div>
            <button type="button" className="guest-product-cancel" onClick={() => setShowRegistrationModal(false)}>Continue Browsing</button>
          </section>
        </div>
      )}
    </main>
  );
}

// Helper component for the rating bars
function RatingBar({ stars, percentage }) {
  return (
    <div className="product-rating-bar-row">
      <span>{stars} {stars === 1 ? "star" : "stars"}</span>
      <div className="product-rating-track">
        <div className="product-rating-fill" style={{ width: `${percentage}%` }} />
      </div>
      <strong>{percentage}%</strong>
    </div>
  );
}

export default ProductDetailsPage;