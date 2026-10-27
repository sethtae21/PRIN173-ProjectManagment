import { useMemo, useState } from "react";
import "./ProductStarRating.css";

function readStoredRatings() {
  try {
    const savedRatings = localStorage.getItem(
      "fitfusion-product-ratings"
    );

    const parsedRatings = savedRatings
      ? JSON.parse(savedRatings)
      : [];

    return Array.isArray(parsedRatings)
      ? parsedRatings
      : [];
  } catch {
    return [];
  }
}

function getCurrentUserKey() {
  try {
    const savedUser =
      localStorage.getItem(
        "fitfusion-current-user"
      ) ||
      sessionStorage.getItem(
        "registeredAccount"
      );

    const user = savedUser
      ? JSON.parse(savedUser)
      : {};

    return (
      user.email ||
      user.username ||
      "registered-shopper"
    );
  } catch {
    return "registered-shopper";
  }
}

function ProductStarRating({
  orderId,
  product,
  onRated,
}) {
  const userKey = useMemo(
    () => getCurrentUserKey(),
    []
  );

  function findSavedRating() {
    const ratings = readStoredRatings();

    const savedRating = ratings.find(
      (item) =>
        String(item.orderId) ===
          String(orderId) &&
        String(item.productId) ===
          String(product.id) &&
        String(item.userKey) ===
          String(userKey)
    );

    return Number(savedRating?.rating) || 0;
  }

  const [rating, setRating] = useState(
    findSavedRating
  );

  const [
    hoveredRating,
    setHoveredRating,
  ] = useState(0);

  function saveRating(selectedRating) {
    const ratings = readStoredRatings();

    const existingIndex =
      ratings.findIndex(
        (item) =>
          String(item.orderId) ===
            String(orderId) &&
          String(item.productId) ===
            String(product.id) &&
          String(item.userKey) ===
            String(userKey)
      );

    const ratingRecord = {
      id:
        existingIndex >= 0
          ? ratings[existingIndex].id
          : `rating-${Date.now()}`,

      orderId: String(orderId),
      productId: String(product.id),
      productName: product.name,
      userKey,
      rating: selectedRating,
      size: product.size || "Default",
      verifiedPurchase: true,

      createdAt:
        existingIndex >= 0
          ? ratings[existingIndex]
              .createdAt
          : new Date().toISOString(),

      updatedAt:
        new Date().toISOString(),
    };

    const updatedRatings = [...ratings];

    if (existingIndex >= 0) {
      updatedRatings[existingIndex] =
        ratingRecord;
    } else {
      updatedRatings.unshift(
        ratingRecord
      );
    }

    localStorage.setItem(
      "fitfusion-product-ratings",
      JSON.stringify(updatedRatings)
    );

    setRating(selectedRating);
    setHoveredRating(0);

    if (onRated) {
      onRated(
        `${product.name} was rated ${selectedRating}/5 stars.`
      );
    }
  }

  const visibleRating =
    hoveredRating || rating;

  return (
    <div className="order-product-star-rating">
      <span className="order-product-rating-label">
        {rating > 0
          ? "Your rating"
          : "Rate this product"}
      </span>

      <div
        className="order-product-rating-stars"
        role="group"
        aria-label={`Rate ${product.name}`}
      >
        {[1, 2, 3, 4, 5].map(
          (star) => (
            <button
              key={star}
              type="button"
              className={
                star <= visibleRating
                  ? "active"
                  : ""
              }
              onMouseEnter={() =>
                setHoveredRating(star)
              }
              onMouseLeave={() =>
                setHoveredRating(0)
              }
              onFocus={() =>
                setHoveredRating(star)
              }
              onBlur={() =>
                setHoveredRating(0)
              }
              onClick={() =>
                saveRating(star)
              }
              aria-label={`${star} out of 5 stars`}
              aria-pressed={
                rating === star
              }
              title={`${star} star${
                star === 1 ? "" : "s"
              }`}
            >
              ★
            </button>
          )
        )}
      </div>

      <small>
        {rating > 0
          ? `${rating}/5 — click another star to update`
          : "Select 1 to 5 stars"}
      </small>
    </div>
  );
}

export default ProductStarRating;