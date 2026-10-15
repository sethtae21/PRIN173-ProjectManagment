import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { catalogAPI } from "../../services/api";
import "../css/SellerProductListingsPage.css";

// Map backend status to UI status
function normalizeStatus(status) {
  const value = String(status || "").trim().toLowerCase();

  if (value === "active" || value === "approved" || value === "accepted") {
    return "Approved";
  }
  if (value === "rejected") {
    return "Rejected";
  }
  // 'processing' or anything else falls to Pending
  return "Pending";
}

function formatPrice(price) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(price) || 0);
}

function SellerProductListingsPage() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [notice, setNotice] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // 1. Fetch real data from backend on mount
  useEffect(() => {
    let isMounted = true;

    async function fetchListings() {
      setIsLoading(true);
      setError("");
      try {
        const data = await catalogAPI.myListings();
        if (isMounted) {
          // Ensure data is an array
          setProducts(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to fetch listings:", err);
        if (isMounted) {
          setError("Failed to load product listings. Please try again.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchListings();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Filter logic (Search & Status)
  const filteredProducts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const normStatus = normalizeStatus(product.status);
      
      const matchesSearch =
        !search ||
        String(product.name || "").toLowerCase().includes(search) ||
        String(product.category || "").toLowerCase().includes(search) ||
        String(product.color || "").toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "All" || normStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [products, searchTerm, statusFilter]);

  // 3. Summary stats
  const summary = useMemo(() => {
    return {
      total: products.length,
      approved: products.filter((p) => normalizeStatus(p.status) === "Approved").length,
      rejected: products.filter((p) => normalizeStatus(p.status) === "Rejected").length,
      pending: products.filter((p) => normalizeStatus(p.status) === "Pending").length,
    };
  }, [products]);

  function clearFilters() {
    setSearchTerm("");
    setStatusFilter("All");
  }

  function requestDelete(product) {
    setDeleteTarget(product);
    setNotice("");
    setError("");
  }

  // 4. Handle Delete via Backend API
  async function handleDelete() {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      // Call backend DELETE endpoint
      await catalogAPI.deleteListing(deleteTarget.id);
      
      // Update local state
      setProducts((prev) => prev.filter((p) => String(p.id) !== String(deleteTarget.id)));
      setNotice(`"${deleteTarget.name}" was deleted successfully.`);
      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete failed:", err);
      setError(`Failed to delete "${deleteTarget.name}". Please try again.`);
    } finally {
      setIsDeleting(false);
    }
  }

  function handleView(product) {
    navigate(`/seller/listings/${encodeURIComponent(product.id)}`);
  }

  function handleEdit(product) {
    navigate(`/seller/listings/${encodeURIComponent(product.id)}/edit`);
  }

  return (
    <main className="spl-page">
      <div className="spl-container">
        <section className="spl-introduction">
          <div className="spl-introduction-text">
            <p className="spl-eyebrow">PRODUCT MANAGEMENT</p>
            <h1>Your product listings</h1>
            <p className="spl-description">
              Review, edit, and manage the products uploaded to your store.
            </p>
          </div>

          <button
            type="button"
            className="spl-upload-button"
            onClick={() => navigate("/seller/upload-catalog")}
          >
            + Upload Products
          </button>
        </section>

        {notice && (
          <div className="spl-success" role="status">
            {notice}
          </div>
        )}

        {error && !deleteTarget && (
          <div className="spl-error" role="alert">
            {error}
          </div>
        )}

        <section className="spl-summary" aria-label="Product listing summary">
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
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>

          <label className="spl-field">
            <span>Report Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="All">All statuses</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Pending">Pending</option>
            </select>
          </label>
        </section>

        <section className="spl-table-card">
          {isLoading ? (
            <div className="spl-empty-state">
              <p>Loading listings...</p>
            </div>
          ) : (
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
                    const reportStatus = normalizeStatus(product.status);
                    // Get first letter for placeholder image
                    const initial = (product.name || "P").charAt(0).toUpperCase();

                    return (
                      <tr key={product.id}>
                        <td>
                          <div className="spl-product">
                            <div className="spl-product-image" aria-hidden="true">
                              {initial}
                            </div>
                            <div className="spl-product-information">
                              <strong>{product.name || "Unnamed Product"}</strong>
                              <span>{product.color || "No color"}</span>
                            </div>
                          </div>
                        </td>
                        <td>{product.category || "Uncategorized"}</td>
                        <td>{formatPrice(product.price)}</td>
                        <td>
                          <span className={`spl-status spl-status-${reportStatus.toLowerCase()}`}>
                            {reportStatus}
                          </span>
                        </td>
                        <td>
                          <div className="spl-actions">
                            <button type="button" className="spl-action-button" onClick={() => handleView(product)}>
                              View
                            </button>
                            <button type="button" className="spl-action-button" onClick={() => handleEdit(product)}>
                              Edit
                            </button>
                            <button type="button" className="spl-delete-button" onClick={() => requestDelete(product)}>
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
          )}

          {!isLoading && filteredProducts.length === 0 && (
            <div className="spl-empty-state">
              <div className="spl-empty-icon">
                <span aria-hidden="true">▤</span>
              </div>
              <h2>{products.length === 0 ? "No product listings yet" : "No products found"}</h2>
              <p>
                {products.length === 0
                  ? "Upload products to start building your store catalog."
                  : "Try a different search term or report status."}
              </p>
              {products.length === 0 ? (
                <button type="button" className="spl-clear-button" onClick={() => navigate("/seller/upload-catalog")}>
                  Upload First Product
                </button>
              ) : (
                <button type="button" className="spl-clear-button" onClick={clearFilters}>
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
            if (event.target === event.currentTarget && !isDeleting) {
              setDeleteTarget(null);
            }
          }}
        >
          <section className="spl-delete-modal" role="dialog" aria-modal="true" aria-labelledby="spl-delete-title">
            <div className="spl-delete-icon">!</div>
            <h2 id="spl-delete-title">Delete Product?</h2>
            <p>
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This action cannot be undone.
            </p>

            <div className="spl-modal-actions">
              <button type="button" className="spl-cancel-button" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                Cancel
              </button>
              <button type="button" className="spl-confirm-delete" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? "Deleting..." : "Delete Product"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default SellerProductListingsPage;