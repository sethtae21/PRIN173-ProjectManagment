import { useEffect } from "react";
import "./RatingControl.css";

/* ============================================================================
   Star-only rating modal (SRS FR-7.5 / Scope Criteria 9 & 10).
   CHANGED (rating redesign): the old inline per-item star row is GONE. Ratings
   are now BUTTON-TRIGGERED modals with a 1-5 star scale (4-5 = approval) and
   explicit per-star meanings. One shared modal serves all four surfaces:
     A. Recommendation Panel  -> overall recommendation set
     B. Fit Visualization     -> on-avatar look (needs >= 1 equipped garment)
     C. Pre-Try-On Check      -> confidence + return intent (before)
     D. Post-Try-On Check     -> confidence + return intent (after)
   The component is presentational: the page owns values, validation, guest
   session-hold and persistence. Guests never reach the network from here.
   Props:
     config       { eyebrow, title, helperNote, submitLabel, questions[] }
     values       { [questionKey]: 1..5 }
     onChange     (key, score) => void
     onPrimary    () => void   (submit OR guest hold+prompt, decided by page)
     onClose      () => void
     primaryLabel string       (submit label, or the guest sign-up CTA)
     saving       bool
     error        string
============================================================================ */
function RatingModal({
  config,
  values,
  onChange,
  onPrimary,
  onClose,
  primaryLabel,
  saving = false,
  error = "",
}) {
  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  if (!config) return null;

  return (
    <div
      className="studio-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <section
        className="studio-rating-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="studio-rating-modal-title"
      >
        <button
          type="button"
          className="studio-modal-close"
          onClick={onClose}
          aria-label="Close rating popup"
        >
          ×
        </button>

        <p className="studio-modal-label">{config.eyebrow}</p>
        <h2 id="studio-rating-modal-title">{config.title}</h2>

        {config.questions.map((question, index) => (
          <div key={question.key} className="studio-rating-question">
            <span>
              {config.questions.length > 1 ? `${index + 1}. ` : ""}
              {question.prompt}
            </span>

            <div
              className="studio-rating-stars"
              role="group"
              aria-label={`${question.prompt} (1 to 5 stars)`}
            >
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  type="button"
                  className={values?.[question.key] === score ? "active" : ""}
                  aria-pressed={values?.[question.key] === score}
                  aria-label={`${score} star${score === 1 ? "" : "s"} — ${question.labels[score - 1]}`}
                  title={question.labels[score - 1]}
                  disabled={saving}
                  onClick={() => onChange?.(question.key, score)}
                >
                  ★
                </button>
              ))}
            </div>

            <div className="studio-rating-legend">
              {question.labels.map((label, i) => (
                <span
                  key={label}
                  className={values?.[question.key] === i + 1 ? "active" : ""}
                >
                  {i + 1} ★ — {label}
                </span>
              ))}
            </div>
          </div>
        ))}

        {config.helperNote && (
          <p className="studio-rating-helper">{config.helperNote}</p>
        )}

        {error && (
          <p className="studio-rating-error" role="alert">
            {error}
          </p>
        )}

        <div className="studio-save-outfit-actions">
          <button
            type="button"
            className="studio-save-cancel-button"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="studio-save-confirm-button"
            onClick={onPrimary}
            disabled={saving}
          >
            {saving ? "Saving…" : primaryLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export default RatingModal;