import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import "./RatingControl.css";

function RatingControl({ itemId, isEquipped, authState, onGuestRate }) {
  const [rating, setRating] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!notice) return undefined;

    const timeout = window.setTimeout(() => setNotice(""), 2500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  if (!isEquipped || itemId == null) {
    return null;
  }

  async function submitRating(score) {
    if (!authState) {
      onGuestRate?.();
      return;
    }

    setIsSaving(true);
    setError("");
    setNotice("");

    try {
      await apiFetch("/ratings/", {
        method: "POST",
        body: JSON.stringify({
          target_type: "item",
          target_id: String(itemId),
          score,
        }),
      });
      setRating(score);
      setNotice("Thanks for rating this fit.");
    } catch (requestError) {
      console.error("Unable to save fit rating:", requestError);
      setError("Failed to save rating");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="studio-rating-control">
      <span className="studio-rating-label">Rate this fit</span>
      <div className="studio-rating-stars" role="group" aria-label="Rate this fit from 1 to 5 stars">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            className={score <= rating ? "active" : ""}
            aria-label={`${score} out of 5 stars`}
            aria-pressed={rating === score}
            title={`${score} star${score === 1 ? "" : "s"}`}
            disabled={isSaving || rating > 0}
            onClick={() => submitRating(score)}
          >
            ★
          </button>
        ))}
      </div>
      {isSaving && <small role="status">Saving rating…</small>}
      {notice && <small className="studio-rating-success" role="status">{notice}</small>}
      {error && <small className="studio-rating-error" role="alert">{error}</small>}
    </div>
  );
}

export default RatingControl;
