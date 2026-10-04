import {
  useEffect,
  useState,
} from "react";

import "./ProductReviewSection.css";

function readStoredObject(key, fallback) {
  try {
    const value =
      localStorage.getItem(key) ||
      sessionStorage.getItem(key);

    return value
      ? JSON.parse(value)
      : fallback;
  } catch {
    return fallback;
  }
}

function getCurrentUser() {
  const registeredAccount =
    readStoredObject(
      "registeredAccount",
      {}
    );

  const currentUser =
    readStoredObject(
      "fitfusion-current-user",
      {}
    );

  return {
    ...registeredAccount,
    ...currentUser,
  };
}

function getProductId(item) {
  return String(
    item.productId ||
      item.id ||
      item.product?.id ||
      ""
  );
}

function formatReviewDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value || "";
  }

  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function calculateProductRating(
  product,
  storedReviews
) {
  const productReviews = storedReviews.filter(
    (review) =>
      String(review.productId) ===
      String(product.id)
  );

  const originalRating =
    Number(product.rating) || 0;

  const originalCount =
    Number(product.reviews) || 0;

  const submittedTotal =
    productReviews.reduce(
      (total, review) =>
        total + Number(review.rating || 0),
      0
    );

  const totalCount =
    originalCount + productReviews.length;

  const average =
    totalCount > 0
      ? (originalRating * originalCount +
          submittedTotal) /
        totalCount
      : 0;

  return {
    average: Number(average.toFixed(1)),
    count: totalCount,
  };
}

function ProductReviewSection({
  product,
  sampleReviews = [],
  storedReviews,
  onReviewsChange,
  ratingSummary,
}) {
  const currentUser = getCurrentUser();

  const userKey =
    currentUser.email ||
    currentUser.username ||
    "registered-shopper";

  const reviewerName =
    currentUser.fullName ||
    [
      currentUser.firstName,
      currentUser.lastName,
    ]
      .filter(Boolean)
      .join(" ") ||
    currentUser.username ||
    "Registered Shopper";

  const productReviews =
    storedReviews.filter(
      (review) =>
        String(review.productId) ===
        String(product.id)
    );

  const existingReview =
    productReviews.find(
      (review) =>
        String(review.userKey) ===
        String(userKey)
    );

  const orders = readStoredObject(
    "fitfusion-orders",
    []
  );

  let purchasedItem = null;

  if (Array.isArray(orders)) {
    for (const order of orders) {
      const foundItem = (
        Array.isArray(order.items)
          ? order.items
          : []
      ).find(
        (item) =>
          getProductId(item) ===
          String(product.id)
      );

      if (foundItem) {
        purchasedItem = foundItem;
        break;
      }
    }
  }

  const canReview = Boolean(purchasedItem);

  const [selectedRating, setSelectedRating] =
    useState(existingReview?.rating || 0);

  const [hoveredRating, setHoveredRating] =
    useState(0);

  const [comment, setComment] = useState(
    existingReview?.comment || ""
  );

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setSelectedRating(
      existingReview?.rating || 0
    );

    setComment(
      existingReview?.comment || ""
    );
  }, [existingReview?.id, product.id]);

  function submitReview(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!canReview) {
      setError(
        "You can only rate this product after purchasing it."
      );
      return;
    }

    if (selectedRating < 1) {
      setError(
        "Please select a rating from 1 to 5 stars."
      );
      return;
    }

    if (comment.trim().length < 10) {
      setError(
        "Please write at least 10 characters describing your experience."
      );
      return;
    }

    const review = {
      id:
        existingReview?.id ||
        `review-${Date.now()}`,

      productId: String(product.id),
      userKey,
      name: reviewerName,
      rating: selectedRating,
      comment: comment.trim(),

      size:
        purchasedItem.selectedSize ||
        purchasedItem.size ||
        "Default",

      verifiedPurchase: true,

      createdAt:
        existingReview?.createdAt ||
        new Date().toISOString(),

      updatedAt: new Date().toISOString(),
    };

    const updatedReviews = existingReview
      ? storedReviews.map((item) =>
          item.id === existingReview.id
            ? review
            : item
        )
      : [review, ...storedReviews];

    localStorage.setItem(
      "fitfusion-product-reviews",
      JSON.stringify(updatedReviews)
    );

    onReviewsChange(updatedReviews);

    setMessage(
      existingReview
        ? "Your review was updated successfully."
        : "Your rating and review were submitted successfully."
    );
  }

  const displayedReviews = [
    ...productReviews,
    ...sampleReviews,
  ];

  return (
    <section className="product-review-section">
      <div className="product-review-heading">
        <div>
          <p>CUSTOMER FEEDBACK</p>
          <h2>Product ratings and reviews</h2>
        </div>

        <div className="product-review-summary">
          <strong>
            {ratingSummary.average.toFixed(1)}
          </strong>

          <div>
            <span>
              {"★".repeat(
                Math.round(
                  ratingSummary.average
                )
              )}

              {"☆".repeat(
                5 -
                  Math.round(
                    ratingSummary.average
                  )
              )}
            </span>

            <small>
              Based on {ratingSummary.count} review
              {ratingSummary.count === 1
                ? ""
                : "s"}
            </small>
          </div>
        </div>
      </div>

      <div className="product-review-layout">
        <div className="product-review-list">
          {displayedReviews.length > 0 ? (
            displayedReviews.map(
              (review) => (
                <article key={review.id}>
                  <div className="product-review-avatar">
                    {review.name
                      ?.charAt(0)
                      .toUpperCase() || "S"}
                  </div>

                  <div className="product-review-content">
                    <div className="product-review-meta">
                      <div>
                        <strong>
                          {review.name}
                        </strong>

                        {review.verifiedPurchase && (
                          <small>
                            Verified purchase
                          </small>
                        )}
                      </div>

                      <span>
                        {formatReviewDate(
                          review.updatedAt ||
                            review.createdAt ||
                            review.date
                        )}
                      </span>
                    </div>

                    <p className="product-review-stars">
                      {"★".repeat(
                        Number(review.rating)
                      )}

                      {"☆".repeat(
                        5 -
                          Number(
                            review.rating
                          )
                      )}
                    </p>

                    <small className="product-review-size">
                      Purchased size:{" "}
                      {review.size || "Default"}
                    </small>

                    <p className="product-review-comment">
                      {review.comment}
                    </p>
                  </div>
                </article>
              )
            )
          ) : (
            <div className="product-review-empty">
              No reviews have been submitted yet.
            </div>
          )}
        </div>

        <aside className="product-review-form-card">
          <p>
            {existingReview
              ? "EDIT YOUR REVIEW"
              : "RATE THIS PRODUCT"}
          </p>

          <h3>
            {existingReview
              ? "Update your experience"
              : "Share your experience"}
          </h3>

          {canReview || existingReview ? (
            <form onSubmit={submitReview}>
              <label>Your rating</label>

              <div className="product-review-star-input">
                {[1, 2, 3, 4, 5].map(
                  (star) => (
                    <button
                      key={star}
                      type="button"
                      className={
                        star <=
                        (hoveredRating ||
                          selectedRating)
                          ? "selected"
                          : ""
                      }
                      onMouseEnter={() =>
                        setHoveredRating(star)
                      }
                      onMouseLeave={() =>
                        setHoveredRating(0)
                      }
                      onClick={() => {
                        setSelectedRating(star);
                        setError("");
                      }}
                      aria-label={`${star} star rating`}
                    >
                      ★
                    </button>
                  )
                )}
              </div>

              <label htmlFor="product-review-comment">
                Your review
              </label>

              <textarea
                id="product-review-comment"
                value={comment}
                onChange={(event) => {
                  setComment(
                    event.target.value
                  );
                  setError("");
                }}
                maxLength={500}
                placeholder="Tell other shoppers about the quality, fit, and overall experience."
              />

              <div className="product-review-character-count">
                {comment.length}/500
              </div>

              {error && (
                <div className="product-review-message error">
                  {error}
                </div>
              )}

              {message && (
                <div className="product-review-message success">
                  {message}
                </div>
              )}

              <button
                type="submit"
                className="product-review-submit"
              >
                {existingReview
                  ? "Update Review"
                  : "Submit Review"}
              </button>
            </form>
          ) : (
            <div className="product-review-locked">
              <span>★</span>

              <p>
                Only shoppers who purchased this
                product can submit a rating and
                review.
              </p>

              <button
                type="button"
                onClick={() =>
                  window.location.assign(
                    "/shopper/orders"
                  )
                }
              >
                View Order History
              </button>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

export default ProductReviewSection;