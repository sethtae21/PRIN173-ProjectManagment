import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import "../css/SellerValidationReportPage.css";

const validationItems = [
  {
    id: "camel-linen-shirt",
    name: "Camel Linen Shirt",
    status: "Accepted",
    reason:
      "All required fields, filenames, and images passed validation.",
  },
  {
    id: "black-straight-pants",
    name: "Black Straight Pants",
    status: "Accepted",
    reason:
      "All required fields, filenames, and images passed validation.",
  },
  {
    id: "white-cotton-blouse",
    name: "White Cotton Blouse",
    status: "Accepted",
    reason:
      "All required fields, filenames, and images passed validation.",
  },
  {
    id: "brown-midi-skirt",
    name: "Brown Midi Skirt",
    status: "Accepted",
    reason:
      "All required fields, filenames, and images passed validation.",
  },
  {
    id: "cream-cardigan",
    name: "Cream Cardigan",
    status: "Accepted",
    reason:
      "All required fields, filenames, and images passed validation.",
  },
  {
    id: "beige-trousers",
    name: "Beige Trousers",
    status: "Accepted",
    reason:
      "All required fields, filenames, and images passed validation.",
  },
  {
    id: "gold-dress",
    name: "Gold Evening Dress",
    status: "Accepted",
    reason:
      "All required fields, filenames, and images passed validation.",
  },
  {
    id: "black-blazer",
    name: "Black Blazer",
    status: "Accepted",
    reason:
      "All required fields, filenames, and images passed validation.",
  },
  {
    id: "blue-dress",
    name: "Blue Dress",
    status: "Rejected",
    reason:
      "Dominant color does not match the CSV color value.",
  },
  {
    id: "denim-jacket",
    name: "Denim Jacket",
    status: "Rejected",
    reason:
      "Rear-view image is missing or does not meet the minimum dimensions.",
  },
];

function SellerValidationReportPage() {
  const navigate = useNavigate();

  const acceptedItems = useMemo(
    () =>
      validationItems.filter(
        (item) =>
          item.status === "Accepted"
      ),
    []
  );

  const rejectedItems = useMemo(
    () =>
      validationItems.filter(
        (item) =>
          item.status === "Rejected"
      ),
    []
  );

  const acceptanceRate = Math.round(
    (acceptedItems.length /
      validationItems.length) *
      100
  );

  return (
    <section className="seller-validation-page">
      {/* The large page header was removed. */}

      <div className="seller-validation-body">
        <section className="seller-validation-introduction">
          <div>
            <p className="seller-validation-label">
              VALIDATION REPORT
            </p>

            <h1>Batch FF-014</h1>

            <p>
              Accepted and rejected products with
              their validation results.
            </p>
          </div>

          <button
            type="button"
            className="seller-validation-upload-button"
            onClick={() =>
              navigate("/seller/upload-catalog")
            }
          >
            Upload Another File
          </button>
        </section>

        <section className="seller-validation-summary">
          <article>
            <span>Total Items</span>
            <strong>
              {validationItems.length}
            </strong>
          </article>

          <article>
            <span>Accepted</span>
            <strong>
              {acceptedItems.length}
            </strong>
          </article>

          <article className="rejected">
            <span>Rejected</span>
            <strong>
              {rejectedItems.length}
            </strong>
          </article>

          <article>
            <span>Acceptance Rate</span>
            <strong>
              {acceptanceRate}%
            </strong>
          </article>
        </section>

        <section className="seller-validation-results">
          <article className="seller-validation-panel">
            <div className="seller-validation-panel-heading">
              <div>
                <h2>
                  Accepted —{" "}
                  {acceptedItems.length} items
                </h2>

                <p>
                  These products passed every
                  validation rule.
                </p>
              </div>

              <span className="seller-validation-count accepted">
                {acceptedItems.length}
              </span>
            </div>

            <div className="seller-validation-list">
              {acceptedItems.map((item) => (
                <div
                  className="seller-validation-item"
                  key={item.id}
                >
                  <span
                    className="seller-validation-icon accepted"
                    aria-hidden="true"
                  >
                    ✓
                  </span>

                  <div>
                    <strong>{item.name}</strong>
                    <p>{item.reason}</p>
                  </div>

                  <span className="seller-validation-result accepted">
                    Valid
                  </span>
                </div>
              ))}
            </div>
          </article>

          <article className="seller-validation-panel">
            <div className="seller-validation-panel-heading">
              <div>
                <h2>
                  Rejected —{" "}
                  {rejectedItems.length} items
                </h2>

                <p>
                  Correct these products before
                  publishing.
                </p>
              </div>

              <span className="seller-validation-count rejected">
                {rejectedItems.length}
              </span>
            </div>

            <div className="seller-validation-list">
              {rejectedItems.map((item) => (
                <div
                  className="seller-validation-item rejected"
                  key={item.id}
                >
                  <span
                    className="seller-validation-icon rejected"
                    aria-hidden="true"
                  >
                    ×
                  </span>

                  <div>
                    <strong>{item.name}</strong>
                    <p>{item.reason}</p>
                  </div>

                  <button
                    type="button"
                    className="seller-validation-fix-button"
                    onClick={() =>
                      navigate(
                        `/seller/listings/${item.id}/edit`
                      )
                    }
                  >
                    Fix
                  </button>
                </div>
              ))}
            </div>
          </article>
        </section>

        <div className="seller-validation-footer-actions">
          <button
            type="button"
            className="seller-validation-secondary-button"
            onClick={() =>
              navigate("/seller/listings")
            }
          >
            View All Listings
          </button>

          <button
            type="button"
            className="seller-validation-primary-button"
            onClick={() =>
              navigate("/seller/upload-catalog")
            }
          >
            Upload or Re-upload
          </button>
        </div>
      </div>
    </section>
  );
}

export default SellerValidationReportPage;