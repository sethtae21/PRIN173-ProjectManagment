import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { catalogAPI } from "../../services/api";

import "../css/SellerValidationReportPage.css";

function SellerValidationReportPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const batchIdFromUrl = searchParams.get("batch");

  const [batchReport, setBatchReport] = useState(null);
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);
      setError("");

      try {
        // Fetch all listings first (to map item IDs to names)
        const listingsData = await catalogAPI.myListings();
        if (cancelled) return;
        setListings(Array.isArray(listingsData) ? listingsData : []);

        // If batch_id is in URL, fetch that specific batch
        if (batchIdFromUrl) {
          const report = await catalogAPI.batchReport(batchIdFromUrl);
          if (cancelled) return;
          setBatchReport(report);
        } else {
          // No batch_id: show latest batch from localStorage or all listings
          const uploads = JSON.parse(
            localStorage.getItem("fitfusion-seller-uploads") || "[]"
          );
          if (uploads.length > 0) {
            const latestBatch = uploads[0];
            if (latestBatch.batchId) {
              const report = await catalogAPI.batchReport(latestBatch.batchId);
              if (cancelled) return;
              setBatchReport(report);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load validation report:", err);
        if (!cancelled) {
          setError(
            "Could not load the validation report. Please try again or upload a new catalog."
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [batchIdFromUrl]);

  // Build validation items from real data
  const validationItems = useMemo(() => {
    if (!batchReport) return [];

    const nameById = {};
    listings.forEach((item) => {
      nameById[String(item.id)] = item.name;
    });

    const accepted = [];
    const rejected = [];

    listings.forEach((item) => {
      // Only show items from this batch if batchReport has items
      const itemId = String(item.id);
      const rejectionReasons = batchReport.rejection_report?.[itemId];

      if (item.status === "active" || (!rejectionReasons && item.status !== "rejected")) {
        accepted.push({
          id: itemId,
          name: item.name,
          status: "Accepted",
          reason: "All required fields, filenames, and images passed validation.",
        });
      } else if (item.status === "rejected" || rejectionReasons) {
        rejected.push({
          id: itemId,
          name: item.name,
          status: "Rejected",
          reason: Array.isArray(rejectionReasons)
            ? rejectionReasons.join("; ")
            : rejectionReasons || "Validation failed.",
        });
      }
    });

    return [...accepted, ...rejected];
  }, [batchReport, listings]);

  const acceptedItems = useMemo(
    () => validationItems.filter((item) => item.status === "Accepted"),
    [validationItems]
  );

  const rejectedItems = useMemo(
    () => validationItems.filter((item) => item.status === "Rejected"),
    [validationItems]
  );

  const totalItems = batchReport?.total_items || validationItems.length;
  const acceptedCount = batchReport?.accepted_count ?? acceptedItems.length;
  const rejectedCount = batchReport?.rejected_count ?? rejectedItems.length;

  const acceptanceRate = totalItems > 0
    ? Math.round((acceptedCount / totalItems) * 100)
    : 0;

  // Format batch ID for display (e.g., "Batch FF-014")
  const batchDisplayId = batchReport
    ? `Batch ${String(batchReport.id).slice(-6).toUpperCase()}`
    : "Validation Report";

  if (isLoading) {
    return (
      <section className="seller-validation-page">
        <div className="seller-validation-body">
          <p style={{ textAlign: "center", padding: "4rem" }}>
            Loading validation report…
          </p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="seller-validation-page">
        <div className="seller-validation-body">
          <div className="seller-validation-introduction">
            <div>
              <p className="seller-validation-label">VALIDATION REPORT</p>
              <h1>Error</h1>
              <p>{error}</p>
            </div>
            <button
              type="button"
              className="seller-validation-upload-button"
              onClick={() => navigate("/seller/upload-catalog")}
            >
              Upload Catalog
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (!batchReport && validationItems.length === 0) {
    return (
      <section className="seller-validation-page">
        <div className="seller-validation-body">
          <div className="seller-validation-introduction">
            <div>
              <p className="seller-validation-label">VALIDATION REPORT</p>
              <h1>No Batches Yet</h1>
              <p>
                Upload a catalog to see validation results here.
              </p>
            </div>
            <button
              type="button"
              className="seller-validation-upload-button"
              onClick={() => navigate("/seller/upload-catalog")}
            >
              Upload Catalog
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="seller-validation-page">
      <div className="seller-validation-body">
        <section className="seller-validation-introduction">
          <div>
            <p className="seller-validation-label">
              VALIDATION REPORT
            </p>

            <h1>{batchDisplayId}</h1>

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
            <strong>{totalItems}</strong>
          </article>

          <article>
            <span>Accepted</span>
            <strong>{acceptedCount}</strong>
          </article>

          <article className="rejected">
            <span>Rejected</span>
            <strong>{rejectedCount}</strong>
          </article>

          <article>
            <span>Acceptance Rate</span>
            <strong>{acceptanceRate}%</strong>
          </article>
        </section>

        <section className="seller-validation-results">
          <article className="seller-validation-panel">
            <div className="seller-validation-panel-heading">
              <div>
                <h2>
                  Accepted — {acceptedCount} items
                </h2>

                <p>
                  These products passed every
                  validation rule.
                </p>
              </div>

              <span className="seller-validation-count accepted">
                {acceptedCount}
              </span>
            </div>

            <div className="seller-validation-list">
              {acceptedItems.length === 0 ? (
                <p style={{ padding: "1rem", color: "#666" }}>
                  No accepted items in this batch.
                </p>
              ) : (
                acceptedItems.map((item) => (
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
                ))
              )}
            </div>
          </article>

          <article className="seller-validation-panel">
            <div className="seller-validation-panel-heading">
              <div>
                <h2>
                  Rejected — {rejectedCount} items
                </h2>

                <p>
                  Correct these products before
                  publishing.
                </p>
              </div>

              <span className="seller-validation-count rejected">
                {rejectedCount}
              </span>
            </div>

            <div className="seller-validation-list">
              {rejectedItems.length === 0 ? (
                <p style={{ padding: "1rem", color: "#666" }}>
                  No rejected items in this batch.
                </p>
              ) : (
                rejectedItems.map((item) => (
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
                ))
              )}
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