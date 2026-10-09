import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../css/SellerDashboardPage.css";

const fallbackProducts = [
  {
    id: "product-001",
    name: "Classic Beige Blazer",
    category: "Outerwear",
    price: 1899,
    status: "Active",
  },
  {
    id: "product-002",
    name: "Black Formal Trousers",
    category: "Bottoms",
    price: 1299,
    status: "Active",
  },
  {
    id: "product-003",
    name: "Gold Satin Blouse",
    category: "Tops",
    price: 995,
    status: "Rejected",
  },
];

function getSellerProducts() {
  try {
    const savedProducts = localStorage.getItem(
      "fitfusion-seller-products"
    );

    if (!savedProducts) {
      return fallbackProducts;
    }

    const parsedProducts = JSON.parse(savedProducts);

    if (!Array.isArray(parsedProducts)) {
      return fallbackProducts;
    }

    return parsedProducts;
  } catch {
    return fallbackProducts;
  }
}

function getSellerAccount() {
  try {
    const storedAccount =
      localStorage.getItem(
        "fitfusion-current-user"
      ) ||
      sessionStorage.getItem(
        "registeredAccount"
      );

    if (!storedAccount) {
      return {
        username: "Seller",
        storeName: "Maison Aurelia",
      };
    }

    const account = JSON.parse(storedAccount);

    return {
      username:
        account.username ||
        account.storeName ||
        "Seller",
      storeName:
        account.storeName ||
        "Maison Aurelia",
    };
  } catch {
    return {
      username: "Seller",
      storeName: "Maison Aurelia",
    };
  }
}

function normalizeStatus(status) {
  const normalizedStatus = String(
    status || ""
  ).toLowerCase();

  if (normalizedStatus === "rejected") {
    return "Rejected";
  }

  return "Active";
}

function SellerDashboardPage() {
  const navigate = useNavigate();

  const sellerAccount = useMemo(
    () => getSellerAccount(),
    []
  );

  const products = useMemo(
    () => getSellerProducts(),
    []
  );

  const recentProducts = products
    .slice(0, 5)
    .map((product, index) => ({
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
      price: Number(product.price || 0),
      status: normalizeStatus(
        product.status
      ),
    }));

  const activeListings = products.filter(
    (product) =>
      normalizeStatus(product.status) ===
      "Active"
  ).length;

  const rejectedListings = products.filter(
    (product) =>
      normalizeStatus(product.status) ===
      "Rejected"
  ).length;

  return (
    <main className="seller-dashboard-page">
      <section className="seller-dashboard-heading">
        <div>
          <p className="seller-dashboard-eyebrow">
            SELLER DASHBOARD
          </p>

          <h1>
            Welcome, {sellerAccount.username}
          </h1>

          <p>
            Upload product records, manage your
            listings, and review validation results.
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
          value={products.length}
          description="Products uploaded by your store"
        />

        <SummaryCard
          number="02"
          label="Active Listings"
          value={activeListings}
          description="Products accepted after validation"
        />

        <SummaryCard
          number="03"
          label="Rejected Listings"
          value={rejectedListings}
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
          label="VALIDATION REPORTS"
          title="Review validation results"
          description="View accepted and rejected catalog records and correct rejected entries."
          buttonLabel="View Validation"
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

        {recentProducts.length === 0 ? (
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
                  <th>Validation Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {recentProducts.map(
                  (product) => (
                    <tr key={product.id}>
                      <td>
                        <strong>
                          {product.name}
                        </strong>
                      </td>

                      <td>
                        {product.category}
                      </td>

                      <td>
                        ₱
                        {product.price.toLocaleString(
                          "en-PH",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}
                      </td>

                      <td>
                        <span
                          className={`seller-validation-status ${product.status.toLowerCase()}`}
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
                  )
                )}
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

      <button
        type="button"
        onClick={onClick}
      >
        {buttonLabel}
      </button>
    </article>
  );
}

export default SellerDashboardPage;