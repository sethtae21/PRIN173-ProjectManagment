import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL, catalogAPI } from "../../services/api";
import { useAlphaCrop } from "../../hooks/useAlphaCrop";
import "../css/SellerProductListingsPage.css";

function normalizeStatus(status) {
  const v = String(status || "").trim().toLowerCase();
  if (v === "active" || v === "approved" || v === "accepted") return "Approved";
  if (v === "rejected") return "Rejected";
  return "Pending";
}
function formatPrice(p) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(p) || 0);
}
function mediaUrl(path) {
  if (!path) return "";
  if (String(path).startsWith("http")) return path;
  return `${API_URL}${String(path).startsWith("/") ? "" : "/"}${path}`;
}

const TILE_MIN = 0.4, TILE_MAX = 1.6, GUARD_ALPHA = 8;

function sampleHasVisiblePixels(img) {
  try {
    const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    if (!w || !h) return false;
    const probe = document.createElement("canvas");
    const s = Math.min(1, 48 / Math.max(w, h));
    probe.width = Math.max(1, Math.round(w * s)); probe.height = Math.max(1, Math.round(h * s));
    const ctx = probe.getContext("2d", { willReadFrequently: true });
    if (!ctx) return true;
    ctx.drawImage(img, 0, 0, probe.width, probe.height);
    const { data } = ctx.getImageData(0, 0, probe.width, probe.height);
    for (let i = 3; i < data.length; i += 4) if (data[i] > GUARD_ALPHA) return true;
    return false;
  } catch { return true; }
}

function ProductThumb({ product }) {
  const [failed, setFailed] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [aspect, setAspect] = useState(null);
  const raw = product.front_image ? mediaUrl(product.front_image) : "";
  const cropped = useAlphaCrop(failed || empty ? null : raw);
  const source = cropped || raw;
  const initial = (product.name || "P").charAt(0).toUpperCase();

  useEffect(() => { setFailed(false); setEmpty(false); setAspect(null); }, [raw]);
  useEffect(() => { if (cropped) setEmpty(false); }, [cropped]);

  function onLoad(e) {
    const img = e.currentTarget;
    const nw = img.naturalWidth || img.width, nh = img.naturalHeight || img.height;
    if (nw && nh) setAspect(Math.min(TILE_MAX, Math.max(TILE_MIN, nw / nh)));
    if (!sampleHasVisiblePixels(img)) setEmpty(true);
  }

  if (!raw || failed || empty) return <div className="spl-product-image" aria-hidden="true">{initial}</div>;
  return (
    <div className="spl-product-image" style={{ aspectRatio: aspect != null ? String(aspect) : "3 / 4" }}>
      <img src={source} alt={product.name || "Product"} loading="lazy" crossOrigin="anonymous" onLoad={onLoad} onError={() => setFailed(true)} />
    </div>
  );
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

  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsLoading(true); setError("");
      try {
        const data = await catalogAPI.myListings();
        if (mounted) setProducts(Array.isArray(data) ? data : []);
      } catch (err) {
        if (mounted) {
          let msg = "Failed to load product listings. Please try again.";
          try {
            const d = JSON.parse(err.message);
            if (d.detail?.includes("permission") || d.detail?.includes("Seller")) msg = "Access denied. Please log out and log back in with a Seller account.";
            else if (d.detail?.includes("Authentication")) msg = "Your session expired. Please log in again.";
          } catch {}
          setError(msg);
        }
      } finally { if (mounted) setIsLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const s = searchTerm.trim().toLowerCase();
    return products.filter((p) => {
      const st = normalizeStatus(p.status);
      const ms = !s || String(p.name || "").toLowerCase().includes(s) || String(p.category || "").toLowerCase().includes(s) || String(p.color || "").toLowerCase().includes(s);
      return ms && (statusFilter === "All" || st === statusFilter);
    });
  }, [products, searchTerm, statusFilter]);

  const summary = useMemo(() => ({
    total: products.length,
    approved: products.filter((p) => normalizeStatus(p.status) === "Approved").length,
    rejected: products.filter((p) => normalizeStatus(p.status) === "Rejected").length,
    pending: products.filter((p) => normalizeStatus(p.status) === "Pending").length,
  }), [products]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await catalogAPI.deleteListing(deleteTarget.id);
      setProducts((prev) => prev.filter((p) => String(p.id) !== String(deleteTarget.id)));
      setNotice(`"${deleteTarget.name}" was deleted successfully.`);
      setDeleteTarget(null);
    } catch (err) {
      setError(`Failed to delete "${deleteTarget.name}". Please try again.`);
    } finally { setIsDeleting(false); }
  }

  return (
    <main className="spl-page">
      <div className="spl-container">
        <section className="spl-introduction">
          <div className="spl-introduction-text">
            <p className="spl-eyebrow">PRODUCT MANAGEMENT</p>
            <h1>Your product listings</h1>
            <p className="spl-description">Review, edit, and manage the products uploaded to your store.</p>
          </div>
          <button type="button" className="spl-upload-button" onClick={() => navigate("/seller/upload-catalog")}>+ Upload Products</button>
        </section>

        {notice && <div className="spl-success" role="status">{notice}</div>}
        {error && !deleteTarget && (
          <div className="spl-error" role="alert">{error}
            {error.includes("Access denied") && (
              <button type="button" className="spl-clear-button" style={{ marginLeft: 12, marginTop: 0 }} onClick={() => { localStorage.clear(); navigate("/login"); }}>Go to Login</button>
            )}
          </div>
        )}

        <section className="spl-summary" aria-label="Product listing summary">
          <article><span>Total Listings</span><strong>{summary.total}</strong></article>
          <article><span>Approved</span><strong>{summary.approved}</strong></article>
          <article><span>Rejected</span><strong>{summary.rejected}</strong></article>
          <article><span>Pending</span><strong>{summary.pending}</strong></article>
        </section>

        <section className="spl-toolbar">
          <label className="spl-field"><span>Search listings</span>
            <input type="search" value={searchTerm} placeholder="Search product, category, or color" onChange={(e) => setSearchTerm(e.target.value)} />
          </label>
          <label className="spl-field"><span>Report Status</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All statuses</option><option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option><option value="Pending">Pending</option>
            </select>
          </label>
        </section>

        <section className="spl-table-card">
          {isLoading ? (
            <div className="spl-empty-state"><p>Loading listings...</p></div>
          ) : (
            <div className="spl-table-wrapper">
              <table className="spl-table">
                <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Report Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.map((product) => {
                    const st = normalizeStatus(product.status);
                    return (
                      <tr key={product.id}>
                        <td>
                          <div className="spl-product">
                            <ProductThumb product={product} />
                            <div className="spl-product-information">
                              <strong>{product.name || "Unnamed Product"}</strong>
                              <span>{product.color || "No color"}</span>
                            </div>
                          </div>
                        </td>
                        <td>{product.category || "Uncategorized"}</td>
                        <td>{formatPrice(product.price)}</td>
                        <td><span className={`spl-status spl-status-${st.toLowerCase()}`}>{st}</span></td>
                        <td>
                          <div className="spl-actions">
                            <button type="button" className="spl-action-button" onClick={() => navigate(`/seller/listings/${encodeURIComponent(product.id)}`)}>View</button>
                            <button type="button" className="spl-action-button" onClick={() => navigate(`/seller/listings/${encodeURIComponent(product.id)}/edit`)}>Edit</button>
                            <button type="button" className="spl-delete-button" onClick={() => { setDeleteTarget(product); setNotice(""); setError(""); }}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="spl-empty-state">
              <div className="spl-empty-icon"><span aria-hidden="true">▤</span></div>
              <h2>{products.length === 0 ? "No product listings yet" : "No products found"}</h2>
              <p>{products.length === 0 ? "Upload products to start building your store catalog." : "Try a different search term or report status."}</p>
              {products.length === 0 ? (
                <button type="button" className="spl-clear-button" onClick={() => navigate("/seller/upload-catalog")}>Upload First Product</button>
              ) : (
                <button type="button" className="spl-clear-button" onClick={() => { setSearchTerm(""); setStatusFilter("All"); }}>Clear Filters</button>
              )}
            </div>
          )}
        </section>
      </div>

      {deleteTarget && (
        <div className="spl-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !isDeleting) setDeleteTarget(null); }}>
          <section className="spl-delete-modal" role="dialog" aria-modal="true" aria-labelledby="spl-delete-title">
            <div className="spl-delete-icon">!</div>
            <h2 id="spl-delete-title">Delete Product?</h2>
            <p>Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This action cannot be undone.</p>
            <div className="spl-modal-actions">
              <button type="button" className="spl-cancel-button" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Cancel</button>
              <button type="button" className="spl-confirm-delete" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? "Deleting..." : "Delete Product"}</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default SellerProductListingsPage;