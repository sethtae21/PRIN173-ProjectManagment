import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import "../css/SellerValidationReportPage.css";

const defaultReport = {
  batchId: "FF-014",
  createdAt: new Date().toISOString(),

  accepted: [
    {
      id: "product-1",
      name: "Camel Linen Shirt",
      result: "Valid",
    },
    {
      id: "product-2",
      name: "Black Straight Pants",
      result: "Valid",
    },
    {
      id: "product-3",
      name: "Ivory Coat",
      result: "Valid",
    },
    {
      id: "product-4",
      name: "Black Sneakers",
      result: "Valid",
    },
    {
      id: "product-5",
      name: "Classic White Blouse",
      result: "Valid",
    },
    {
      id: "product-6",
      name: "Beige Pleated Skirt",
      result: "Valid",
    },
    {
      id: "product-7",
      name: "Brown Leather Loafers",
      result: "Valid",
    },
    {
      id: "product-8",
      name: "Neutral Knit Cardigan",
      result: "Valid",
    },
  ],

  rejected: [
    {
      id: "product-9",
      name: "Blue Dress",
      reason:
        "Dominant color does not match CSV value red.",
    },
    {
      id: "product-10",
      name: "Denim Jacket",
      reason:
        "Rear filename missing; minimum dimensions failed.",
    },
  ],
};

function readValidationReport() {
  try {
    const savedReport = sessionStorage.getItem(
      "fitfusion-validation-report"
    );

    if (!savedReport) {
      return defaultReport;
    }

    const parsedReport = JSON.parse(savedReport);

    return {
      batchId:
        parsedReport.batchId ||
        parsedReport.batch ||
        defaultReport.batchId,

      createdAt:
        parsedReport.createdAt ||
        parsedReport.submittedAt ||
        defaultReport.createdAt,

      accepted: Array.isArray(parsedReport.accepted)
        ? parsedReport.accepted
        : defaultReport.accepted,

      rejected: Array.isArray(parsedReport.rejected)
        ? parsedReport.rejected
        : defaultReport.rejected,
    };
  } catch {
    return defaultReport;
  }
}

function escapeCsvValue(value) {
  const text = String(value ?? "");

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n")
  ) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

function SellerValidationReportPage() {
  const navigate = useNavigate();

  const report = useMemo(
    () => readValidationReport(),
    []
  );

  const totalItems =
    report.accepted.length +
    report.rejected.length;

  const acceptanceRate =
    totalItems > 0
      ? Math.round(
          (report.accepted.length / totalItems) *
            100
        )
      : 0;

  function downloadFullReport() {
    const rows = [
      [
        "Batch ID",
        "Product ID",
        "Product Name",
        "Status",
        "Validation Result",
      ],
    ];

    report.accepted.forEach((item) => {
      rows.push([
        report.batchId,
        item.id || "",
        item.name,
        "Accepted",
        item.result || "Valid",
      ]);
    });

    report.rejected.forEach((item) => {
      rows.push([
        report.batchId,
        item.id || "",
        item.name,
        "Rejected",
        item.reason,
      ]);
    });

    const csvContent = rows
      .map((row) =>
        row.map(escapeCsvValue).join(",")
      )
      .join("\n");

    const file = new Blob([csvContent], {
      type: "text/csv;charset=utf-8",
    });

    const downloadUrl =
      URL.createObjectURL(file);

    const downloadLink =
      document.createElement("a");

    downloadLink.href = downloadUrl;
    downloadLink.download = `${report.batchId}-validation-report.csv`;

    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();

    URL.revokeObjectURL(downloadUrl);
  }

  return (
    <main className="seller-validation-page">
      <header className="seller-validation-header">
        <div>
          <h1>
            23 — SELLER VALIDATION REPORT
          </h1>

          <p>
            No ML: deterministic file mapping,
            alpha, dimensions, and dominant color
          </p>
        </div>

        <span className="seller-validation-role">
          SELLER
        </span>
      </header>

      <div className="seller-validation-body">
        <section className="seller-validation-intro">
          <p>VALIDATION REPORT</p>

          <h2>Batch {report.batchId}</h2>

          <span>
            Accepted and rejected items with
            deterministic reasons.
          </span>
        </section>

        <section className="seller-validation-summary">
          <SummaryCard
            label="TOTAL ITEMS"
            value={totalItems}
          />

          <SummaryCard
            label="ACCEPTED"
            value={report.accepted.length}
          />

          <SummaryCard
            label="REJECTED"
            value={report.rejected.length}
            rejected
          />

          <SummaryCard
            label="ACCEPTANCE RATE"
            value={`${acceptanceRate}%`}
          />
        </section>

        <section className="seller-validation-grid">
          <article className="validation-card accepted-card">
            <div className="validation-card-heading">
              <div>
                <p>
                  ACCEPTED —{" "}
                  {report.accepted.length} ITEMS
                </p>

                <span>
                  These items passed every
                  validation rule.
                </span>
              </div>

              <div className="accepted-count">
                {report.accepted.length}
              </div>
            </div>

            <div className="validation-list">
              {report.accepted.length > 0 ? (
                report.accepted.map(
                  (item, index) => (
                    <div
                      className="validation-item accepted-item"
                      key={
                        item.id ||
                        `${item.name}-${index}`
                      }
                    >
                      <span className="validation-icon accepted-icon">
                        ✓
                      </span>

                      <div>
                        <strong>{item.name}</strong>

                        <small>
                          All required fields,
                          filenames, and images
                          passed validation.
                        </small>
                      </div>

                      <span className="validation-result">
                        {item.result || "Valid"}
                      </span>
                    </div>
                  )
                )
              ) : (
                <EmptyValidationList
                  message="No products were accepted in this batch."
                />
              )}
            </div>
          </article>

          <article className="validation-card rejected-card">
            <div className="validation-card-heading">
              <div>
                <p>
                  REJECTED —{" "}
                  {report.rejected.length} ITEMS
                </p>

                <span>
                  These items must be corrected
                  before publishing.
                </span>
              </div>

              <div className="rejected-count">
                {report.rejected.length}
              </div>
            </div>

            <div className="validation-list">
              {report.rejected.length > 0 ? (
                report.rejected.map(
                  (item, index) => (
                    <div
                      className="validation-item rejected-item"
                      key={
                        item.id ||
                        `${item.name}-${index}`
                      }
                    >
                      <span className="validation-icon rejected-icon">
                        ×
                      </span>

                      <div>
                        <strong>{item.name}</strong>

                        <small>{item.reason}</small>
                      </div>

                      {item.id && (
                        <button
                          type="button"
                          className="validation-fix-button"
                          onClick={() =>
                            navigate(
                              `/seller/products/${item.id}/edit`
                            )
                          }
                        >
                          Fix
                        </button>
                      )}
                    </div>
                  )
                )
              ) : (
                <EmptyValidationList
                  message="No products were rejected in this batch."
                />
              )}
            </div>

            <div className="validation-rules">
              <p>
                <strong>Validation rules:</strong>{" "}
                required fields • file existence •
                dimensions
              </p>

              <p>
                alpha channel • filename mapping •
                dominant-color check
              </p>
            </div>

            <button
              type="button"
              className="validation-download-button"
              onClick={downloadFullReport}
            >
              Download Full Report
            </button>
          </article>
        </section>

        <div className="validation-bottom-actions">
          <button
            type="button"
            className="validation-secondary-button"
            onClick={() =>
              navigate("/seller/products/upload")
            }
          >
            Upload Another Catalog
          </button>

          <button
            type="button"
            className="validation-primary-button"
            onClick={() =>
              navigate("/seller/products")
            }
          >
            View Product Listings
          </button>
        </div>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  rejected = false,
}) {
  return (
    <article
      className={
        rejected
          ? "validation-summary-card summary-rejected"
          : "validation-summary-card"
      }
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function EmptyValidationList({ message }) {
  return (
    <div className="validation-empty-state">
      <p>{message}</p>
    </div>
  );
}

export default SellerValidationReportPage;