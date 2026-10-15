import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI, catalogAPI } from "../../services/api";
import "../css/SellerDashboardPage.css";

function normalizeStatus(status) {
  const normalizedStatus = String(status || "")
    .trim()
    .toLowerCase();

  if (normalizedStatus === "rejected") {
    return "Rejected";
  }

  if (
    normalizedStatus === "approved" ||
    normalizedStatus === "active" ||
    normalizedStatus === "accepted"
  ) {
    return "Approved";
  }

  if (
    normalizedStatus === "pending" ||
    normalizedStatus === "for review" ||
    normalizedStatus === "under review" ||
    normalizedStatus === "processing"
  ) {
    return "Pending";
  }

  return "Pending";
}

function formatPrice(price) {
  const value = Number(price) || 0;
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function readWelcomeNameFromStorage() {
  try {
    const stored =
      localStorage.getItem("fitfusion-current-user") ||
      localStorage.getItem("sellerAccount") ||
      sessionStorage.getItem("sellerAccount");

    if (!stored) return "";

    const account = JSON.parse(stored);
    if (!account || typeof account !== "object") return "";

    return (
      account.store_name ||
      account.storeName ||
      account.full_name ||
      account.fullName ||
      account.username ||
      ""
    );
  } catch {
    return "";
  }
}

function SellerDashboardPage() {
  const navigate = useNavigate();

  const [welcomeName, setWelcomeName] = useState(
    () => readWelcomeNameFromStorage() || "Seller"
  );

  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // ---------- Fetch profile + listings on mount ----------
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setLoadError("");

      // 1. Real profile (store_name for greeting)
      try {
        const res = await authAPI.getProfile();
        const user = res?.user || {};
        if (!cancelled) {
          const name =
            user.store_name ||
            user.storeName ||
            user.full_name ||
            user.fullName ||
            "";
          if (name) setWelcomeName(name);
        }
      } catch (err) {
        console.error("Profile load failed:", err);
        // Fall back to whatever's in storage; do not block page render.
      }

      // 2. Real listings from MongoDB
      try {
        const data = await catalogAPI.myListings();
        if (!cancelled) {
          setListings(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Listings load failed:", err);
        if (!cancelled) {
          setLoadError(
            "Could not load your listings. Please try again."
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- Derived values from real listings ----------
  const normalizedProducts = useMemo(
    () =>
      listings.map((product, index) => ({
        ...product,
        id:
          product.id ||
          `seller-product-${index + 1}`,
        name:
          product.name ||
          product.productName ||
          "Unnamed Product",
        category:
          product.category ||
          "Uncategorized",
        price: Number(product.price) || 0,
        status: normalizeStatus(
          product.reportStatus ?? product.status
        ),
      })),
    [listings]
  );

  const recentProducts = useMemo(
    () => normalizedProducts.slice(0, 5),
    [normalizedProducts]
  );

  const approvedListings = useMemo(
    () =>
      normalizedProducts.filter(
        (product) => product.status === "Approved"
      ).length,
    [normalizedProducts]
  );

  const rejectedListings = useMemo(
    () =>
      normalizedProducts.filter(
        (product) => product.status === "Rejected"
      ).length,
    [normalizedProducts]
  );

  return (
    <main className="seller-dashboard-page">
      <section className="seller-dashboard-heading">
        <div>
          <p className="seller-dashboard-eyebrow">
            SELLER DASHBOARD
          </p>

          <h1>Welcome, {welcomeName}</h1>

          <p>
            Upload product records, manage your
            listings, and review product report statuses.
          </p>
        </div>

        <button
          type="button"
          className="seller-dashboard-add-button"
          onClick={() =>
            navigate("/seller/upload-catalog")
          }
        >
          + Add New Product
        </button>
      </section>

      <section className="seller-dashboard-summary">
        <SummaryCard
          number="01"
          label="Total Listings"
          value={isLoading ? "…" : normalizedProducts.length}
          description="Products uploaded by your store"
        />

        <SummaryCard
          number="02"
          label="Approved Listings"
          value={isLoading ? "…" : approvedListings}
          description="Products approved for listing"
        />

        <SummaryCard
          number="03"
          label="Rejected Listings"
          value={isLoading ? "…" : rejectedListings}
          description="Products that require correction"
        />
      </section>

      <section className="seller-dashboard-actions">
        <DashboardActionCard
          label="CSV TEMPLATE"
          title="Download the catalog template"
          description="Download the required CSV template from the catalog upload page."
          buttonLabel="Open Catalog Upload"
          buttonStyle="primary"
          onClick={() =>
            navigate("/seller/upload-catalog")
          }
        />

        <DashboardActionCard
          label="CATALOG UPLOAD"
          title="Upload product records"
          description="Upload a CSV file or add an individual product to your seller catalog."
          buttonLabel="Upload Catalog"
          buttonStyle="secondary"
          onClick={() =>
            navigate("/seller/upload-catalog")
          }
        />

        <DashboardActionCard
          label="LISTINGS MANAGEMENT"
          title="Manage your product listings"
          description="Review existing product information and update a selected listing."
          buttonLabel="View Listings"
          buttonStyle="secondary"
          onClick={() =>
            navigate("/seller/listings")
          }
        />

        <DashboardActionCard
          label="PRODUCT REPORTS"
          title="Review report statuses"
          description="View approved, rejected, and pending product records and correct rejected entries."
          buttonLabel="View Reports"
          buttonStyle="dark"
          onClick={() =>
            navigate("/seller/validation")
          }
        />
      </section>

      <section className="seller-recent-listings">
        <div className="seller-listings-heading">
          <div>
            <p>LISTINGS MANAGEMENT</p>
            <h2>Recent Product Listings</h2>
          </div>

          <button
            type="button"
            className="seller-view-all-button"
            onClick={() =>
              navigate("/seller/listings")
            }
          >
            View All Products
          </button>
        </div>

        {loadError && (
          <div className="seller-listings-error" role="alert">
            <p>{loadError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        )}

        {isLoading && !loadError ? (
          <div className="seller-listings-loading">
            <p>Loading your product listings…</p>
          </div>
        ) : recentProducts.length === 0 ? (
          <div className="seller-listings-empty">
            <h3>No product listings yet</h3>

            <p>
              Upload a product record to begin
              building your store catalog.
            </p>

            <button
              type="button"
              onClick={() =>
                navigate("/seller/upload-catalog")
              }
            >
              Upload First Product
            </button>
          </div>
        ) : (
          <div className="seller-listings-table-wrapper">
            <table className="seller-listings-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Report Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {recentProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.name}</strong>
                    </td>

                    <td>{product.category}</td>

                    <td>{formatPrice(product.price)}</td>

                    <td>
                      <span
                        className={`seller-report-status ${product.status.toLowerCase()}`}
                      >
                        {product.status}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="seller-edit-listing-button"
                        onClick={() =>
                          navigate(
                            `/seller/listings/${product.id}/edit`
                          )
                        }
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function SummaryCard({
  number,
  label,
  value,
  description,
}) {
  return (
    <article className="seller-summary-card">
      <span className="seller-summary-number">
        {number}
      </span>

      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{description}</small>
      </div>
    </article>
  );
}

function DashboardActionCard({
  label,
  title,
  description,
  buttonLabel,
  buttonStyle,
  onClick,
}) {
  return (
    <article
      className={`seller-dashboard-action-card ${buttonStyle}`}
    >
      <p className="seller-action-label">
        {label}
      </p>

      <h2>{title}</h2>
      <p>{description}</p>

      <button type="button" onClick={onClick}>
        {buttonLabel}
      </button>
    </article>
  );
}

export default SellerDashboardPage;