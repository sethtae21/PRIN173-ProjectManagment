import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ratingsApi } from "../services/api";
import { getAccessToken } from "../services/session";
import { RATING_SOURCES, RATING_TARGET_TYPES, GUEST_RATING_PROMPT } from "../services/uat";
import "./ProductStarRating.css";

function readStoredRatings() {
  try {
    const savedRatings = localStorage.getItem("fitfusion-product-ratings");
    const parsedRatings = savedRatings ? JSON.parse(savedRatings) : [];
    return Array.isArray(parsedRatings) ? parsedRatings : [];
  } catch {
    return [];
  }
}

function getCurrentUserKey() {
  try {
    const savedUser =
      localStorage.getItem("fitfusion-current-user") ||
      sessionStorage.getItem("registeredAccount");
    const user = savedUser ? JSON.parse(savedUser) : {};
    return user.email || user.username || "registered-shopper";
  } catch {
    return "registered-shopper";
  }
}

/* Post-purchase star rating (order_history surface).
   CHANGED (guest-block rule): a Guest click blocks the action, saves/caches
   NOTHING, and opens the exact sign-up/login prompt. Registered users persist
   to accounts_rating (source=order_history) and keep a local mirror. */
function ProductStarRating({ orderId, product, onRated }) {
  const navigate = useNavigate();
  const userKey = useMemo(() => getCurrentUserKey(), []);
  const isRegistered = Boolean(getAccessToken());

  function findSavedRating() {
    if (!isRegistered) return 0;
    const ratings = readStoredRatings();
    const savedRating = ratings.find(
      (item) =>
        String(item.orderId) === String(orderId) &&
        String(item.productId) === String(product.id) &&
        String(item.userKey) === String(userKey)
    );
    return Number(savedRating?.rating) || 0;
  }

  const [rating, setRating] = useState(findSavedRating);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);
  const [saving, setSaving] = useState(false);

  async function saveRating(selectedRating) {
    // GUEST BLOCK: no cache, no network — prompt only (FR-7.5 / FR-1.9).
    if (!isRegistered) {
      setShowGuestPrompt(true);
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      await ratingsApi.submit({
        target_type: RATING_TARGET_TYPES.ITEM,
        target_id: String(product.id),
        score: selectedRating,
        source: RATING_SOURCES.ORDER_HISTORY,
      });
    } catch (error) {
      console.warn("Order rating: server sync skipped →", error?.message || error);
    }

    const ratings = readStoredRatings();
    const existingIndex = ratings.findIndex(
      (item) =>
        String(item.orderId) === String(orderId) &&
        String(item.productId) === String(product.id) &&
        String(item.userKey) === String(userKey)
    );
    const ratingRecord = {
      id: existingIndex >= 0 ? ratings[existingIndex].id : `rating-${Date.now()}`,
      orderId: String(orderId),
      productId: String(product.id),
      productName: product.name,
      userKey,
      rating: selectedRating,
      size: product.size || "Default",
      verifiedPurchase: true,
      createdAt:
        existingIndex >= 0 ? ratings[existingIndex].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updatedRatings = [...ratings];
    if (existingIndex >= 0) updatedRatings[existingIndex] = ratingRecord;
    else updatedRatings.unshift(ratingRecord);
    localStorage.setItem("fitfusion-product-ratings", JSON.stringify(updatedRatings));

    setRating(selectedRating);
    setHoveredRating(0);
    setSaving(false);
    if (onRated) onRated(`${product.name} was rated ${selectedRating}/5 stars.`);
  }

  const visibleRating = hoveredRating || rating;

  return (
    <div className="order-product-star-rating">
      <span className="order-product-rating-label">
        {rating > 0 ? "Your rating" : "Rate this product"}
      </span>

      <div
        className="order-product-rating-stars"
        role="group"
        aria-label={`Rate ${product.name}`}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={star <= visibleRating ? "active" : ""}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            onFocus={() => setHoveredRating(star)}
            onBlur={() => setHoveredRating(0)}
            onClick={() => saveRating(star)}
            aria-label={`${star} out of 5 stars`}
            aria-pressed={rating === star}
            title={`${star} star${star === 1 ? "" : "s"}`}
            disabled={saving}
          >
            ★
          </button>
        ))}
      </div>

      <small>
        {rating > 0
          ? `${rating}/5 — click another star to update`
          : "Select 1 to 5 stars"}
      </small>

      {showGuestPrompt && (
        <div
          className="order-rating-auth-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowGuestPrompt(false);
          }}
        >
          <section
            className="order-rating-auth-prompt"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-rating-auth-title"
          >
            <h3 id="order-rating-auth-title">{GUEST_RATING_PROMPT}</h3>
            <div className="order-rating-auth-actions">
              <button type="button" onClick={() => navigate("/signup")}>
                Sign Up
              </button>
              <button type="button" onClick={() => navigate("/login")}>
                Log In
              </button>
              <button type="button" onClick={() => setShowGuestPrompt(false)}>
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default ProductStarRating;