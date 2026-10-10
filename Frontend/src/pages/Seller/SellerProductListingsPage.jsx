
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/SellerProductListingsPage.css";

const STORAGE_KEY = "fitfusion-seller-products";

const defaultProducts = [
  {
    id: "ivory-coat",
    name: "Ivory Coat",
    category: "Outerwear",
    price: 1850,
    color: "Ivory",
    status: "Approved",
  },
  {
    id: "gold-dress",
    name: "Gold Dress",
    category: "Dresses",
    price: 1450,
    color: "Gold",
    status: "Rejected",
  },
  {
    id: "black-sneakers",
    name: "Black Sneakers",
    category: "Footwear",
    price: 1100,
    color: "Black",
    status: "Approved",
  },
];

function normalizeStatus(status) {
  const value = String(status || "")
    .trim()
    .toLowerCase();

  if (
    value === "active" ||
    value === "approved" ||
    value === "accepted"
  ) {
    return "Approved";
  }

  if (value === "rejected") {
    return "Rejected";
  }

  if (
    value === "pending" ||
    value === "under review" ||
    value === "for review"
  ) {
    return "Pending";
  }

  return "Pending";
}

function normalizeProduct(product, index) {
  return {
    ...product,

    id:
      product.id ||
      product.productId ||
      `seller-product-${index + 1}`,

    name:
      product.name ||
      product.productName ||
      "Unnamed Product",

    category:
      product.category ||
      "Uncategorized",

    price: Number(product.price) || 0,

    color:
      product.color ||
      product.dominantColor ||
      "Not specified",

    status: normalizeStatus(
      product.reportStatus ??
      product.status ??
      product.validationStatus
    ),
  };
}

function getInitialProducts() {
  try {
    const savedProducts =
      localStorage.getItem(STORAGE_KEY);

    if (savedProducts === null) {
      return defaultProducts.map(normalizeProduct);
    }

    const parsedProducts = JSON.parse(savedProducts);

    if (!Array.isArray(parsedProducts)) {
      return defaultProducts.map(normalizeProduct);
    }

    return parsedProducts.map(normalizeProduct);
  } catch {
    return defaultProducts.map(normalizeProduct);
  }
}

function formatPrice(price) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(price);
}

function SellerProductListingsPage() {
  const navigate = useNavigate();

  const [products, setProducts] = useState(
    getInitialProducts
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [notice, setNotice] = useState("");
  const [storageError, setStorageError] = useState("");

  const filteredProducts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !search ||
        String(product.name).toLowerCase().includes(search) ||
        String(product.category).toLowerCase().includes(search) ||
        String(product.color).toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "All" ||
        normalizeStatus(product.status) === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [products, searchTerm, statusFilter]);

  const summary = useMemo(() => {
    return {
      total: products.length,
      approved: products.filter(
        (product) =>
          normalizeStatus(product.status) === "Approved"
      ).length,
      rejected: products.filter(
        (product) =>
          normalizeStatus(product.status) === "Rejected"
      ).length,
      pending: products.filter(
        (product) =>
          normalizeStatus(product.status) === "Pending"
      ).length,
    };
  }, [products]);

  function clearFilters() {
    setSearchTerm("");
    setStatusFilter("All");
  }

  function requestDelete(product) {
    setDeleteTarget(product);
    setNotice("");
    setStorageError("");
  }

  function handleDelete() {
    if (!deleteTarget) return;

    const updatedProducts = products.filter(
      (product) => product.id !== deleteTarget.id
    );

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(updatedProducts)
      );

      setProducts(updatedProducts);
      setNotice(
        `"${deleteTarget.name}" was deleted successfully.`
      );
      setStorageError("");
      setDeleteTarget(null);
    } catch {
      setStorageError(
        "Unable to delete the product. Please check browser storage and try again."
      );
    }
  }

  function handleView(product) {
    navigate(`/seller/listings/${encodeURIComponent(product.id)}`);
  }

  function handleEdit(product) {
    navigate(
      `/seller/listings/${encodeURIComponent(product.id)}/edit`
    );
  }

  return (
    <main className="spl-page">
      <div className="spl-container">
        <section className="spl-introduction">
          <div className="spl-introduction-text">
            <p className="spl-eyebrow">
              PRODUCT MANAGEMENT
            </p>

            <h1>Your product listings</h1>

            <p className="spl-description">
              Review, edit, and manage the products
              uploaded to your store.
            </p>
          </div>

          <button
            type="button"
            className="spl-upload-button"
            onClick={() =>
              navigate("/seller/upload-catalog")
            }
          >
            + Upload Products
          </button>
        </section>

        {notice && (
          <div className="spl-success" role="status">
            {notice}
          </div>
        )}

        {storageError && !deleteTarget && (
          <div className="spl-error" role="alert">
            {storageError}
          </div>
        )}

        <section
          className="spl-summary"
          aria-label="Product listing summary"
        >
          <article>
            <span>Total Listings</span>
            <strong>{summary.total}</strong>
          </article>

          <article>
            <span>Approved</span>
            <strong>{summary.approved}</strong>
          </article>

          <article>
            <span>Rejected</span>
            <strong>{summary.rejected}</strong>
          </article>

          <article>
            <span>Pending</span>
            <strong>{summary.pending}</strong>
          </article>
        </section>

        <section className="spl-toolbar">
          <label className="spl-field">
            <span>Search listings</span>

            <input
              type="search"
              value={searchTerm}
              placeholder="Search product, category, or color"
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
            />
          </label>

          <label className="spl-field">
            <span>Report Status</span>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
            >
              <option value="All">
                All statuses
              </option>

              <option value="Approved">
                Approved
              </option>

              <option value="Rejected">
                Rejected
              </option>

              <option value="Pending">
                Pending
              </option>
            </select>
          </label>
        </section>

        <section className="spl-table-card">
          <div className="spl-table-wrapper">
            <table className="spl-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Report Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map((product) => {
                  const reportStatus =
                    normalizeStatus(product.status);

                  return (
                    <tr key={product.id}>
                      <td>
                        <div className="spl-product">
                          <div
                            className="spl-product-image"
                            aria-hidden="true"
                          >
                            {product.name
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div className="spl-product-information">
                            <strong>
                              {product.name}
                            </strong>

                            <span>
                              {product.color}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>{product.category}</td>

                      <td>
                        {formatPrice(product.price)}
                      </td>

                      <td>
                        <span
                          className={`spl-status spl-status-${reportStatus.toLowerCase()}`}
                        >
                          {reportStatus}
                        </span>
                      </td>

                      <td>
                        <div className="spl-actions">
                          <button
                            type="button"
                            className="spl-action-button"
                            onClick={() =>
                              handleView(product)
                            }
                          >
                            View
                          </button>

                          <button
                            type="button"
                            className="spl-action-button"
                            onClick={() =>
                              handleEdit(product)
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="spl-delete-button"
                            onClick={() =>
                              requestDelete(product)
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredProducts.length === 0 && (
            <div className="spl-empty-state">
              <div className="spl-empty-icon">
                <span aria-hidden="true">▤</span>
              </div>

              <h2>
                {products.length === 0
                  ? "No product listings yet"
                  : "No products found"}
              </h2>

              <p>
                {products.length === 0
                  ? "Upload products to start building your store catalog."
                  : "Try a different search term or report status."}
              </p>

              {products.length === 0 ? (
                <button
                  type="button"
                  className="spl-clear-button"
                  onClick={() =>
                    navigate("/seller/upload-catalog")
                  }
                >
                  Upload First Product
                </button>
              ) : (
                <button
                  type="button"
                  className="spl-clear-button"
                  onClick={clearFilters}
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      {deleteTarget && (
        <div
          className="spl-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setDeleteTarget(null);
              setStorageError("");
            }
          }}
        >
          <section
            className="spl-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="spl-delete-title"
          >
            <div className="spl-delete-icon">
              !
            </div>

            <h2 id="spl-delete-title">
              Delete Product?
            </h2>

            <p>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget.name}</strong>?
              This action cannot be undone.
            </p>

            {storageError && (
              <p className="spl-modal-error" role="alert">
                {storageError}
              </p>
            )}

            <div className="spl-modal-actions">
              <button
                type="button"
                className="spl-cancel-button"
                onClick={() => {
                  setDeleteTarget(null);
                  setStorageError("");
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="spl-confirm-delete"
                onClick={handleDelete}
              >
                Delete Product
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default SellerProductListingsPage;
