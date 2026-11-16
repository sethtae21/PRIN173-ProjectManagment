import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ratingsApi } from "../services/api";
import { getAccessToken } from "../services/session";
import { RATING_SOURCES, RATING_TARGET_TYPES, GUEST_RATING_PROMPT } from "../services/uat";
import "./ProductStarRating.css";

/* Post-purchase star rating (order_history surface).
   CHANGED (audit fixes):
     * Rating state is hydrated from the SERVER (/ratings/mine/) so it survives
       reload / logout / login. The logout-purged localStorage mirror is GONE.
     * Guest click blocks immediately, writes NOTHING anywhere, and shows the
       exact sign-up/login prompt. */
function ProductStarRating({ product, onRated }) {
  const navigate = useNavigate();
  const isRegistered = Boolean(getAccessToken());

  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    if (!isRegistered) {
      setRating(0);
      return () => { active = false; };
    }
    async function hydrate() {
      try {
        const mine = await ratingsApi.mine();
        if (!active) return;
        const row = (Array.isArray(mine) ? mine : []).find(
          (entry) =>
            entry?.target_type === RATING_TARGET_TYPES.ITEM &&
            entry?.source === RATING_SOURCES.ORDER_HISTORY &&
            String(entry?.target_id) === String(product.id)
        );
        setRating(Number(row?.score) || 0);
      } catch (error) {
        console.warn("Order rating hydrate skipped →", error?.message || error);
      }
    }
    hydrate();
    window.addEventListener("fitfusion-rating-updated", hydrate);
    return () => {
      active = false;
      window.removeEventListener("fitfusion-rating-updated", hydrate);
    };
  }, [isRegistered, product.id]);

  async function saveRating(selectedRating) {
    if (!isRegistered) {
      setShowGuestPrompt(true);   // block + prompt; no cache, no network
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
      setRating(selectedRating);
      setHoveredRating(0);
      window.dispatchEvent(new Event("fitfusion-rating-updated"));
      if (onRated) onRated(`${product.name} was rated ${selectedRating}/5 stars.`);
    } catch (error) {
      if (onRated) onRated("We couldn't save your rating. Please try again.");
      console.warn("Order rating save failed →", error?.message || error);
    } finally {
      setSaving(false);
    }
  }

  const visibleRating = hoveredRating || rating;

  return (
    <div className="order-product-star-rating">
      <span className="order-product-rating-label">
        {rating > 0 ? "Your rating" : "Rate this product"}
      </span>

      <div className="order-product-rating-stars" role="group" aria-label={`Rate ${product.name}`}>
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
        {rating > 0 ? `${rating}/5 — click another star to update` : "Select 1 to 5 stars"}
      </small>

      {showGuestPrompt && (
        <div
          className="order-rating-auth-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowGuestPrompt(false);
          }}
        >
          <section className="order-rating-auth-prompt" role="dialog" aria-modal="true" aria-labelledby="order-rating-auth-title">
            <h3 id="order-rating-auth-title">{GUEST_RATING_PROMPT}</h3>
            <div className="order-rating-auth-actions">
              <button type="button" onClick={() => navigate("/signup")}>Sign Up</button>
              <button type="button" onClick={() => navigate("/login")}>Log In</button>
              <button type="button" onClick={() => setShowGuestPrompt(false)}>Cancel</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default ProductStarRating;