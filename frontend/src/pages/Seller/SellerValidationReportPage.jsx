import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { catalogAPI } from "../../services/api";

import "../css/SellerValidationReportPage.css";

/* Remove a dead batch id from the local upload mirror so future visits
   never re-request a batch that no longer exists (self-healing). */
function purgeStaleUploadRecord(batchId) {
  try {
    const uploads = JSON.parse(
      localStorage.getItem("fitfusion-seller-uploads") || "[]"
    );
    if (!Array.isArray(uploads)) return;
    const next = uploads.filter(
      (entry) => String(entry?.batchId) !== String(batchId)
    );
    if (next.length !== uploads.length) {
      localStorage.setItem("fitfusion-seller-uploads", JSON.stringify(next));
    }
  } catch {
    // ignore storage errors
  }
}

function SellerValidationReportPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const batchIdFromUrl = searchParams.get("batch");

  const [batchReport, setBatchReport] = useState(null);
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportMissing, setReportMissing] = useState(false);

  /* ---------- Fetch batch report + live listings ---------- */
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);
      setError("");
      setReportMissing(false);

      let targetBatchId = batchIdFromUrl;

      try {
        const listingsData = await catalogAPI.myListings();
        if (cancelled) return;
        setListings(Array.isArray(listingsData) ? listingsData : []);

        if (!targetBatchId) {
          try {
            const uploads = JSON.parse(
              localStorage.getItem("fitfusion-seller-uploads") || "[]"
            );
            if (
              Array.isArray(uploads) &&
              uploads.length > 0 &&
              uploads[0].batchId
            ) {
              targetBatchId = uploads[0].batchId;
            }
          } catch {
            // ignore storage errors
          }
        }

        if (targetBatchId) {
          const report = await catalogAPI.batchReport(targetBatchId);
          if (!cancelled) setBatchReport(report);
        }
      } catch (err) {
        const message = String(err?.message || "");
        const isBatchNotFound =
          message.includes("Batch not found") || message.includes("404");

        let isAuthError = false;
        try {
          const errData = JSON.parse(message);
          if (
            errData.detail &&
            (errData.detail.includes("permission") ||
              errData.detail.includes("Authentication"))
          ) {
            isAuthError = true;
          }
        } catch (e) {}

        if (isBatchNotFound && targetBatchId) {
          /* Expected when the stored upload mirror points at a batch whose
             record no longer exists (DB reset / cleanup sweep / other
             seller account). Not a crash: fall back to listings and
             self-heal the stale local record. */
          console.warn(
            `Validation report: batch ${targetBatchId} not found; stale local upload record cleared.`
          );
          if (!batchIdFromUrl) purgeStaleUploadRecord(targetBatchId);
          if (!cancelled) setReportMissing(true);
        } else if (isAuthError) {
          console.error("Failed to load validation report:", err);
          if (!cancelled) {
            setError(
              "Access denied. Please log out and log back in with a Seller account."
            );
          }
        } else {
          console.error("Failed to load validation report:", err);
          if (!cancelled) {
            setError(
              "No batches uploaded yet. Upload a catalog to see validation results here."
            );
          }
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

  /* ---------- Items for this batch; FALLBACK: all live listings ---------- */
  const batchItems = useMemo(() => {
    if (batchReport) {
      return listings.filter(
        (item) => String(item.batch || "") === String(batchReport.id)
      );
    }
    /* Report record gone (cleaned up) but the seller is NOT new:
       derive the summary from their current live listings. */
    return listings;
  }, [listings, batchReport]);

  const acceptedItems = useMemo(
    () =>
      batchItems
        .filter((item) => String(item.status).toLowerCase() === "active")
        .map((item) => ({
          id: String(item.id),
          name: item.name,
          status: "Accepted",
          reason:
            "All required fields, filenames, and images passed validation.",
        })),
    [batchItems]
  );

  const rejectedItems = useMemo(
    () =>
      batchItems
        .filter((item) => {
          const status = String(item.status).toLowerCase();

          // FIX: live status is authoritative. A fixed item (active) must never
          // appear here, and the frozen batchReport.rejection_report snapshot
          // is no longer used to pin items into this panel.
          if (status === "active") return false;

          const hasReasons =
            Array.isArray(item.rejection_reasons) &&
            item.rejection_reasons.length > 0;
          return status === "rejected" || hasReasons;
        })
        .map((item) => {
          // FIX: reasons come from the live item only; stale snapshot text
          // (e.g. the old "declared 'Blue'" message) can never resurface.
          const reasons =
            (Array.isArray(item.rejection_reasons) &&
              item.rejection_reasons.length > 0 &&
              item.rejection_reasons) ||
            ["Validation failed."];
          return {
            id: String(item.id),
            name: item.name,
            status: "Rejected",
            reason: Array.isArray(reasons) ? reasons.join("; ") : reasons,
          };
        }),
    [batchItems]
  );

  const pendingItems = useMemo(
    () =>
      batchItems.filter((item) => {
        const status = String(item.status).toLowerCase();
        return status !== "active" && status !== "rejected";
      }),
    [batchItems]
  );

  /* ---------- Counts derived from LIVE items, not stored counters ---------- */
  const totalItems = batchItems.length;
  const acceptedCount = acceptedItems.length;
  const rejectedCount = rejectedItems.length;
  const acceptanceRate =
    totalItems > 0 ? Math.round((acceptedCount / totalItems) * 100) : 0;

  const batchDisplayId = batchReport
    ? `Batch ${String(batchReport.id).slice(-6).toUpperCase()}`
    : listings.length > 0
    ? "Current Listings Summary"
    : "Validation Report";

  /* ---------- States ---------- */
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
              <h1>
                {error.includes("Access denied")
                  ? "Access Denied"
                  : "No Batches Yet"}
              </h1>
              <p>{error}</p>
            </div>
            <button
              type="button"
              className="seller-validation-upload-button"
              onClick={() =>
                navigate(
                  error.includes("Access denied")
                    ? "/login"
                    : "/seller/upload-catalog"
                )
              }
            >
              {error.includes("Access denied")
                ? "Go to Login"
                : "Upload Catalog"}
            </button>
          </div>
        </div>
      </section>
    );
  }

  /* Truly empty: no report AND no listings -> the only real "new seller" case */
  if (!batchReport && listings.length === 0) {
    return (
      <section className="seller-validation-page">
        <div className="seller-validation-body">
          <div className="seller-validation-introduction">
            <div>
              <p className="seller-validation-label">VALIDATION REPORT</p>
              <h1>No Batches Yet</h1>
              <p>
                No batches uploaded yet. Upload a catalog to see validation
                results here.
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
            <p className="seller-validation-label">VALIDATION REPORT</p>

            <h1>{batchDisplayId}</h1>

            <p>Accepted and rejected products with their validation results.</p>
          </div>

          <button
            type="button"
            className="seller-validation-upload-button"
            onClick={() => navigate("/seller/upload-catalog")}
          >
            Upload Another File
          </button>
        </section>

        {reportMissing && !batchReport && listings.length > 0 && (
          <p className="seller-validation-pending-note" role="status">
            The saved report for your last upload is no longer available (its
            batch record was cleaned up or belongs to another session). The
            results below are derived from your current live listings.
          </p>
        )}

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

        {pendingItems.length > 0 && (
          <p className="seller-validation-pending-note" role="status">
            {pendingItems.length} item(s) still processing — results will
            appear here once validation completes.
          </p>
        )}

        <section className="seller-validation-results">
          <article className="seller-validation-panel">
            <div className="seller-validation-panel-heading">
              <div>
                <h2>Accepted — {acceptedCount} items</h2>
                <p>These products passed every validation rule.</p>
              </div>

              <span className="seller-validation-count accepted">
                {acceptedCount}
              </span>
            </div>

            <div className="seller-validation-list">
              {acceptedItems.length === 0 ? (
                <p style={{ padding: "1rem", color: "#666" }}>
                  {totalItems === 0
                    ? "No items remaining in this batch (items may have been deleted)."
                    : "No accepted items in this batch."}
                </p>
              ) : (
                acceptedItems.map((item) => (
                  <div className="seller-validation-item" key={item.id}>
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
                <h2>Rejected — {rejectedCount} items</h2>
                <p>Correct these products before publishing.</p>
              </div>

              <span className="seller-validation-count rejected">
                {rejectedCount}
              </span>
            </div>

            <div className="seller-validation-list">
              {rejectedItems.length === 0 ? (
                <p style={{ padding: "1rem", color: "#666" }}>
                  {totalItems === 0
                    ? "No items remaining in this batch (items may have been deleted)."
                    : "No rejected items in this batch."}
                </p>
              ) : (
                rejectedItems.map((item) => (
                  <div className="seller-validation-item rejected" key={item.id}>
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
                        navigate(`/seller/listings/${item.id}/edit`)
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
            onClick={() => navigate("/seller/listings")}
          >
            View All Listings
          </button>

          <button
            type="button"
            className="seller-validation-primary-button"
            onClick={() => navigate("/seller/upload-catalog")}
          >
            Upload or Re-upload
          </button>
        </div>
      </div>
    </section>
  );
}

export default SellerValidationReportPage;