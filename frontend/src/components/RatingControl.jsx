import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import { RATING_TARGET_TYPES } from "../services/uat";
import "./RatingControl.css";

/* Star rating control (FR-7.5 / OBJ-05) — REGISTERED USERS ONLY.
   GUESTS HAVE NO RATING RIGHTS: a guest click never touches the network; it
   only opens the sign-up/login prompt via onGuestRate (FR-7.5), and the
   backend additionally refuses unauthenticated POST /ratings/ with 403.
   - Registered users: POST /ratings/ persists (upsert per user+target+source).
   Props:
     itemId        catalog item id (null hides the control)
     targetType    "item" (recommendation/product) or "fit" (fit visualization)
     isEquipped    legacy gate used by the equipped-items list
     alwaysVisible render even when not equipped (recommendation rows)
     allowUpdate   keep stars clickable after rating (backend upserts)
     label         control caption
     successNotice toast text after a persisted rating
     initialRating pre-fill from /ratings/mine/
     source        UI surface tag (recommendation_panel | fit_visualization |
                   product_page | order_history | '')
     authState     null for guests
     onGuestRate   callback that opens the registration prompt */
function RatingControl({
  itemId,
  targetType = RATING_TARGET_TYPES.ITEM,
  isEquipped,
  alwaysVisible = false,
  allowUpdate = false,
  label = "Rate this fit",
  successNotice = "Thanks for rating this fit.",
  initialRating = 0,
  source = "",
  authState,
  onGuestRate,
}) {
  const [rating, setRating] = useState(Number(initialRating) || 0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isGuest = !authState;

  useEffect(() => {
    setRating(Number(initialRating) || 0);
  }, [initialRating, itemId]);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(""), 2500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  if (itemId == null || (!alwaysVisible && !isEquipped)) {
    return null;
  }

  async function submitRating(score) {
    // FIX (guests have no rating rights): never POST as a guest — show the
    // sign-up/login prompt only. The backend also refuses guest POSTs (403).
    if (isGuest) {
      onGuestRate?.();
      return;
    }

    setIsSaving(true);
    setError("");
    setNotice("");
    try {
      // CHANGED (charter-aligned UAT): send target_type AND source so the
      // backend KPI export can join ratings to the correct charter objective.
      // Untagged ratings can no longer leak across objectives.
      const payload = {
        target_type: targetType,
        target_id: String(itemId),
        score,
        source,
      };
      const data = await apiFetch("/ratings/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      // Defensive: if the server ever answers "not persisted", treat it as a
      // guest/permission refusal and prompt instead of faking success.
      if (data && data.persisted === false) {
        onGuestRate?.();
        return;
      }
      setRating(score);
      setNotice(successNotice);
      // Let product pages / summaries refresh immediately.
      window.dispatchEvent(new Event("fitfusion-rating-updated"));
    } catch (requestError) {
      console.error("Unable to save rating:", requestError);
      setError("Failed to save rating");
    } finally {
      setIsSaving(false);
    }
  }

  const locked = !allowUpdate && rating > 0;

  return (
    <div className="studio-rating-control">
      <span className="studio-rating-label">{label}</span>
      <div
        className="studio-rating-stars"
        role="group"
        aria-label={`${label} from 1 to 5 stars`}
      >
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            className={score <= rating ? "active" : ""}
            aria-label={`${score} out of 5 stars`}
            aria-pressed={rating === score}
            title={
              isGuest
                ? "Sign up or log in to rate"
                : `${score} star${score === 1 ? "" : "s"}`
            }
            disabled={isSaving || locked}
            onClick={() => submitRating(score)}
          >
            ★
          </button>
        ))}
      </div>
      {isSaving && <small role="status">Saving rating…</small>}
      {notice && (
        <small className="studio-rating-success" role="status">
          {notice}
        </small>
      )}
      {error && (
        <small className="studio-rating-error" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}

export default RatingControl;