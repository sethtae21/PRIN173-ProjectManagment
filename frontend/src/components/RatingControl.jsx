import { useEffect } from "react";
import "./RatingControl.css";

/* ============================================================================
   Star-only rating modal (SRS FR-7.5 / Scope Criteria 9-11).
   Button-triggered (studio) or auto-triggered (mock-checkout success).
   1-5 stars; 4-5 = Approval. No like/dislike anywhere.
   Presentational: the page owns values, validation, guest blocking and
   persistence. Guests never reach the network from here.
   Props:
     config        { eyebrow, title, helperNote, submitLabel, questions[] }
     values        { [questionKey]: 1..5 }
     onChange      (key, score) => void   (page blocks guests here)
     onPrimary     () => void
     onClose       () => void
     primaryLabel  string
     secondaryLabel string  (default "Cancel"; checkout passes "Skip")
     saving        bool
     error         string
============================================================================ */
function RatingModal({
  config,
  values,
  onChange,
  onPrimary,
  onClose,
  primaryLabel,
  secondaryLabel = "Cancel",
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
            {secondaryLabel}
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