import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_URL, catalogAPI } from "../../services/api";
import "../css/SellerItemDetailsPage.css";

function normalizeStatus(status) {
  const value = String(status || "").trim().toLowerCase();
  if (value === "active" || value === "approved" || value === "accepted") return "Active";
  if (value === "rejected") return "Rejected";
  return "Pending";
}

/* Build an absolute backend URL from the serialized image path (/media/…) */
function mediaUrl(path) {
  if (!path) return "";
  if (String(path).startsWith("http")) return path;
  return `${API_URL}${String(path).startsWith("/") ? "" : "/"}${path}`;
}

/* Checkerboard backdrop so the rembg alpha channel is visible */
const CHECKER = {
  backgroundImage: "repeating-conic-gradient(#efe8d8 0% 25%, #fbf7ec 0% 50%)",
  backgroundSize: "16px 16px",
};

/* Renders the real transparent PNG; falls back to the silhouette only on load failure */
function AssetImage({
  src,
  alt,
  style,
  fallbackClass = "seller-item-garment",
  neckClass = "seller-item-garment-neck",
  bodyClass = "seller-item-garment-body",
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={fallbackClass}>
        <div className={neckClass} />
        <div className={bodyClass} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        padding: "8px",
        ...style,
      }}
    />
  );
}

function SellerItemDetailsPage() {
  const navigate = useNavigate();
  const params = useParams();
  const productId = params.listingId || params.itemId || params.productId;

  const [viewMode, setViewMode] = useState("seller");
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedView, setSelectedView] = useState("front");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    category: "",
    sizes: "",
    color: "",
    colorDescription: "",
    colorFamily: "",
    price: "",
    styleTags: "",
    occasionTags: "",
  });

  useEffect(() => {
    let isMounted = true;
    let timeoutId = null;

    async function fetchProduct() {
      if (!productId) {
        if (isMounted) {
          setIsLoading(false);
          setError("No product ID provided in URL.");
        }
        return;
      }

      setIsLoading(true);
      setError("");

      timeoutId = setTimeout(() => {
        if (isMounted) {
          setIsLoading(false);
          setError("Request timed out. Please check your connection and try again.");
        }
      }, 10000);

      try {
        console.log("Fetching product:", productId);
        const data = await catalogAPI.getListing(productId);
        console.log("Product data received:", data);

        if (isMounted) {
          setProduct(data);
          setEditForm({
            name: data.name || "",
            description: data.description || "",
            category: data.category || "",
            sizes: data.size || "",
            color: data.color || "",
            colorDescription: data.color_description || "",
            colorFamily: data.color_family || "",
            price: String(data.price || ""),
            styleTags: Array.isArray(data.style_tags) ? data.style_tags.join(", ") : (data.style_tags || ""),
            occasionTags: Array.isArray(data.occasion_tags) ? data.occasion_tags.join(", ") : (data.occasion_tags || ""),
          });
        }
      } catch (err) {
        console.error("Error fetching product:", err);
        if (isMounted) {
          let errorMsg = "Product not found or access denied.";
          try {
            const errData = JSON.parse(err.message);
            if (errData.detail) errorMsg = errData.detail;
            else if (errData.error) errorMsg = errData.error;
          } catch {}
          setError(errorMsg);
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        if (isMounted) setIsLoading(false);
      }
    }

    fetchProduct();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [productId]);

  const viewInformation = useMemo(() => {
    if (!product) return null;
    const views = {
      front: { label: "FRONT PNG", fileName: product.front_image || "front_image.png" },
      side: { label: "SIDE PNG", fileName: product.side_image || "side_image.png" },
      rear: { label: "REAR PNG", fileName: product.rear_image || "rear_image.png" },
    };
    return views[selectedView];
  }, [product, selectedView]);

  /* Derived three-value size display for the UI.
     size_inches / size_cm come from the backend serializer (computed from
     SIZE_RANGE_TABLE in knowledge_table.py). Footwear / unknown sizes have
     both fields null, so we fall back to the raw size label only. */
  const sizeDisplay = useMemo(() => {
    if (!product) return null;
    const label = product.size || "";
    const inches = product.size_inches;
    const cm = product.size_cm;
    if (inches && cm) {
      return `${label} · ${inches} · ${cm}`;
    }
    return label;
  }, [product]);

  function formatPrice(price) {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(price);
  }

  function openEditModal() {
    if (!product) return;
    setEditForm({
      name: product.name || "",
      description: product.description || "",
      category: product.category || "",
      sizes: product.size || "",
      color: product.color || "",
      colorDescription: product.color_description || "",
      colorFamily: product.color_family || "",
      price: String(product.price || ""),
      styleTags: Array.isArray(product.style_tags) ? product.style_tags.join(", ") : (product.style_tags || ""),
      occasionTags: Array.isArray(product.occasion_tags) ? product.occasion_tags.join(", ") : (product.occasion_tags || ""),
    });
    setShowEditModal(true);
  }

  function handleEditChange(event) {
    const { name, value } = event.target;
    setEditForm((currentForm) => ({ ...currentForm, [name]: value }));
  }

  async function handleSaveChanges(event) {
    event.preventDefault();
    try {
      const payload = {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        category: (editForm.category || "").toLowerCase(),
        size: editForm.sizes.trim(),
        color: editForm.color.trim(),
        color_description: editForm.colorDescription.trim(),
        color_family: editForm.colorFamily.trim(),
        price: Number(editForm.price) || 0,
        style_tags: (editForm.styleTags || "").split(",").map((tag) => tag.trim()).filter(Boolean),
        occasion_tags: (editForm.occasionTags || "").split(",").map((tag) => tag.trim()).filter(Boolean),
      };

      console.log("Saving changes with payload:", payload);
      const result = await catalogAPI.updateListing(productId, payload);
      console.log("Save successful:", result);

      setProduct(result);
      setShowEditModal(false);
      setSuccessMessage("Product listing updated successfully.");
      window.setTimeout(() => setSuccessMessage(""), 3500);
    } catch (err) {
      console.error("Error saving changes:", err);
      let errorMsg = "Failed to save changes. Please try again.";
      try {
        const errData = JSON.parse(err.message);
        console.error("Backend error details:", errData);
        if (errData.detail) errorMsg = errData.detail;
        else if (errData.error) errorMsg = errData.error;
        else {
          const firstKey = Object.keys(errData)[0];
          if (firstKey) {
            const firstError = Array.isArray(errData[firstKey]) ? errData[firstKey][0] : errData[firstKey];
            errorMsg = `${firstKey}: ${firstError}`;
          }
        }
      } catch {
        if (err.message && err.message !== "undefined") errorMsg = err.message;
      }
      alert(errorMsg);
    }
  }

  async function handleDeleteProduct() {
    try {
      console.log("Deleting product:", productId);
      await catalogAPI.deleteListing(productId);
      console.log("Product deleted successfully");
      navigate("/seller/listings", { replace: true });
    } catch (err) {
      console.error("Error deleting product:", err);
      alert("Failed to delete product. Please try again.");
    }
  }

  if (isLoading) {
    return (
      <main className="seller-item-page">
        <header className="seller-item-header">
          <div>
            <h1>22A — SELLER ITEM DETAILS</h1>
            <p>Complete owned-product metadata</p>
          </div>
          <span className="seller-item-role">SELLER</span>
        </header>
        <section className="seller-item-not-found">
          <h2>Loading...</h2>
          <p>Fetching product details from the server.</p>
        </section>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="seller-item-page">
        <header className="seller-item-header">
          <div>
            <h1>22A — SELLER ITEM DETAILS</h1>
            <p>Complete owned-product metadata</p>
          </div>
          <span className="seller-item-role">SELLER</span>
        </header>
        <section className="seller-item-not-found">
          <h2>{error ? "Error" : "Product not found"}</h2>
          <p>{error || "This product may have been removed or does not belong to the current seller."}</p>
          <button type="button" onClick={() => navigate("/seller/listings")}>
            Return to Listings
          </button>
        </section>
      </main>
    );
  }

  const normStatus = normalizeStatus(product.status);
  const displayProduct = { ...product, status: normStatus };

  return (
    <main className="seller-item-page">
      <header className="seller-item-header">
        <div>
          <h1>22A — SELLER ITEM DETAILS</h1>
          <p>Complete owned-product metadata and processed Front/Side/Rear assets</p>
        </div>
        <span className="seller-item-role">SELLER</span>
      </header>

      <div className="seller-item-content">
        <div className="seller-item-toolbar">
          <button type="button" className="seller-item-back-button" onClick={() => navigate("/seller/listings")}>
            ← Back to Listings
          </button>
          <div className="seller-preview-mode-selector" aria-label="Product viewing mode">
            <button type="button" className={viewMode === "seller" ? "active" : ""} onClick={() => setViewMode("seller")}>
              Seller Mode
            </button>
            <button type="button" className={viewMode === "shopper" ? "active" : ""} onClick={() => setViewMode("shopper")}>
              Shopper Preview
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="seller-item-success" role="status">
            {successMessage}
          </div>
        )}

        {viewMode === "seller" ? (
          <SellerMode
            product={displayProduct}
            sizeDisplay={sizeDisplay}
            formatPrice={formatPrice}
            onEdit={openEditModal}
            onDelete={() => setShowDeleteModal(true)}
          />
        ) : (
          <ShopperPreview
            product={displayProduct}
            sizeDisplay={sizeDisplay}
            selectedView={selectedView}
            setSelectedView={setSelectedView}
            viewInformation={viewInformation}
            formatPrice={formatPrice}
          />
        )}
      </div>

      {showEditModal && (
        <div
          className="seller-item-modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowEditModal(false);
            }
          }}
        >
          <form className="seller-item-modal" onSubmit={handleSaveChanges}>
            <div className="seller-item-modal-header">
              <div>
                <p>EDIT LISTING</p>
                <h2>{product.name}</h2>
              </div>
              <button type="button" onClick={() => setShowEditModal(false)} aria-label="Close edit product form">
                ×
              </button>
            </div>

            {product.status === "Rejected" && (
              <div className="seller-item-rejection">
                <strong>Rejection reason</strong>
                <p>{Array.isArray(product.rejection_reasons) ? product.rejection_reasons.join("; ") : product.rejection_reasons}</p>
                <span>Saving the corrected product returns it to Pending status for validation.</span>
              </div>
            )}

            <div className="seller-item-edit-grid">
              <EditField label="Product Name" name="name" value={editForm.name} onChange={handleEditChange} fullWidth required />
              <label className="seller-item-edit-field seller-item-edit-full">
                <span>Description</span>
                <textarea name="description" value={editForm.description} onChange={handleEditChange} rows="3" required />
              </label>
              <label className="seller-item-edit-field">
                <span>Category</span>
                <select name="category" value={editForm.category} onChange={handleEditChange} required>
                  <option value="">Select category</option>
                  <option value="tops">Tops</option>
                  <option value="bottoms">Bottoms</option>
                  <option value="dresses">Dresses</option>
                  <option value="outerwear">Outerwear</option>
                  <option value="footwear">Footwear</option>
                </select>
              </label>
              <label className="seller-item-edit-field">
                <span>Size</span>
                <input
                  name="sizes"
                  value={editForm.sizes}
                  onChange={handleEditChange}
                  placeholder="XS, S, M, L, XL, XXL (or US 9, EU 40 for footwear)"
                  required
                />
                <small className="seller-item-edit-hint">
                  Clothing: standard labels only (XS, S, M, L, XL, XXL). Inch/cm measurements are rejected automatically.
                  Footwear: regional codes (e.g., US 9, EU 40). The product page shows the inch and cm ranges automatically.
                </small>
              </label>
              <EditField label="Color" name="color" value={editForm.color} onChange={handleEditChange} required />
              <EditField label="Color Description" name="colorDescription" value={editForm.colorDescription} onChange={handleEditChange} required />
              <EditField label="Color Family" name="colorFamily" value={editForm.colorFamily} onChange={handleEditChange} required />
              <EditField label="Price" name="price" type="number" value={editForm.price} onChange={handleEditChange} min="1" step="0.01" required />
              <EditField label="Style Tags" name="styleTags" value={editForm.styleTags} onChange={handleEditChange} placeholder="Classic, Minimal" fullWidth required />
              <EditField label="Occasion Tags" name="occasionTags" value={editForm.occasionTags} onChange={handleEditChange} placeholder="Work, Casual" fullWidth required />
            </div>

            <div className="seller-item-modal-actions">
              <button type="button" className="seller-item-secondary-button" onClick={() => setShowEditModal(false)}>
                Cancel
              </button>
              <button type="submit" className="seller-item-primary-button">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {showDeleteModal && (
        <div
          className="seller-item-modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowDeleteModal(false);
            }
          }}
        >
          <section className="seller-item-delete-modal">
            <div className="seller-item-delete-icon">!</div>
            <h2>Delete this listing?</h2>
            <p>
              <strong>{product.name}</strong> will be permanently removed from your seller listings and the shopper catalog.
            </p>
            <div className="seller-item-modal-actions">
              <button type="button" className="seller-item-secondary-button" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button type="button" className="seller-item-delete-button" onClick={handleDeleteProduct}>
                Delete Listing
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

/* ==========================================
   SELLER MODE — real rembg transparent PNGs
========================================== */
function SellerMode({ product, sizeDisplay, formatPrice, onEdit, onDelete }) {
  const imageViews = [
    { label: "FRONT PNG", path: product.front_image },
    { label: "SIDE PNG", path: product.side_image },
    { label: "REAR PNG", path: product.rear_image },
  ];

  const styleTags = Array.isArray(product.style_tags) ? product.style_tags : [];
  const occasionTags = Array.isArray(product.occasion_tags) ? product.occasion_tags : [];

  return (
    <>
      <section className="seller-item-introduction">
        <div>
          <p>SELLER ITEM DETAILS</p>
          <h2>{product.name}</h2>
          <span>Full metadata and processed Front/Side/Rear transparent assets.</span>
        </div>
        <span className={`seller-item-status seller-item-status-${product.status.toLowerCase()}`}>
          {product.status}
        </span>
      </section>

      {product.status !== "Active" && (
        <div className="seller-item-status-notice">
          <strong>This product is not currently visible to shoppers.</strong>
          <p>
            {product.status === "Rejected"
              ? (Array.isArray(product.rejection_reasons) ? product.rejection_reasons.join("; ") : product.rejection_reasons)
              : "The product is waiting for catalog validation."}
          </p>
        </div>
      )}

      <section className="seller-item-details-grid">
        <article className="seller-item-assets-card">
          <div className="seller-item-card-heading">
            <p>PROCESSED PRODUCT ASSETS</p>
            <h3>Three-view images</h3>
          </div>

          <div className="seller-item-assets">
            {imageViews.map((imageView) => (
              <div className="seller-item-asset" key={imageView.label}>
                <span>{imageView.label}</span>

                {/* REAL IMAGE: rembg-processed transparent PNG streamed from GridFS,
                    shown on a checkerboard so the alpha channel is visible */}
                <div
                  style={{
                    ...CHECKER,
                    width: "100%",
                    height: "220px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "8px",
                    overflow: "hidden",
                  }}
                >
                  <AssetImage
                    src={mediaUrl(imageView.path)}
                    alt={`${product.name} ${imageView.label.toLowerCase()} transparent view`}
                  />
                </div>

                <small>{imageView.path || "No image stored"}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="seller-item-metadata-card">
          <div className="seller-item-card-heading">
            <p>COMPLETE METADATA</p>
            <h3>Product information</h3>
          </div>
          <MetadataRow label="Store" value={product.store_name || "Your FitFusion Store"} />
          <MetadataRow label="Name" value={product.name} />
          <MetadataRow label="Description" value={product.description} />
          <MetadataRow label="Category" value={product.category} />

          {/* Three-value size display (SML label + inch range + cm range).
              For footwear / unknown sizes, falls back to the raw size label. */}
          <MetadataRow label="Size" value={sizeDisplay} />

          <MetadataRow label="Color" value={product.color} />
          <MetadataRow label="Color description" value={product.color_description} />
          <MetadataRow label="Color family" value={product.color_family} />
          <MetadataRow label="Price" value={formatPrice(product.price)} />
          <MetadataRow label="Style tags" value={styleTags.join(", ")} />
          <MetadataRow label="Occasion tags" value={occasionTags.join(", ")} />
          <MetadataRow label="Status" value={product.status} />

          <div className="seller-item-management-actions">
            <button type="button" className="seller-item-edit-button" onClick={onEdit}>
              Edit Listing
            </button>
            <button type="button" className="seller-item-delete-button" onClick={onDelete}>
              Delete
            </button>
          </div>
        </article>
      </section>
    </>
  );
}

/* ==========================================
   SHOPPER PREVIEW — same real image, shopper framing
========================================== */
function ShopperPreview({ product, sizeDisplay, selectedView, setSelectedView, viewInformation, formatPrice }) {
  const styleTags = Array.isArray(product.style_tags) ? product.style_tags : [];
  const occasionTags = Array.isArray(product.occasion_tags) ? product.occasion_tags : [];

  const viewPaths = {
    front: product.front_image,
    side: product.side_image,
    rear: product.rear_image,
  };
  const currentPath = viewPaths[selectedView] || "";

  return (
    <section className="shopper-product-preview">
      <div className="shopper-preview-notice">
        <div>
          <strong>Shopper Preview</strong>
          <span>This is a read-only preview. No order or cart action will be created.</span>
        </div>
        <span className={`shopper-preview-publication shopper-preview-publication-${product.status.toLowerCase()}`}>
          {product.status === "Active" ? "Visible to shoppers" : "Not publicly visible"}
        </span>
      </div>

      <div className="shopper-preview-product">
        <div className="shopper-preview-gallery">
          <div
            className="shopper-preview-main-image"
            style={{
              ...CHECKER,
              minHeight: "320px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <span>{viewInformation.label}</span>

            <AssetImage
              src={mediaUrl(currentPath)}
              alt={`${product.name} ${selectedView} view on preview canvas`}
              style={{ maxHeight: "300px", flex: "1 1 auto" }}
              fallbackClass="shopper-preview-garment"
              neckClass="shopper-preview-neck"
              bodyClass="shopper-preview-body"
            />

            <small>{viewInformation.fileName}</small>
          </div>

          <div className="shopper-preview-thumbnails">
            {["front", "side", "rear"].map((view) => (
              <button
                type="button"
                key={view}
                className={selectedView === view ? "active" : ""}
                onClick={() => setSelectedView(view)}
              >
                {view}
              </button>
            ))}
          </div>
        </div>

        <div className="shopper-preview-information">
          <button type="button" className="shopper-preview-store" disabled>
            {product.store_name || "Your FitFusion Store"}
          </button>
          <p className="shopper-preview-category">{product.category}</p>
          <h2>{product.name}</h2>
          <div className="shopper-preview-rating">
            <span>☆☆☆☆☆</span>
            <strong>No ratings</strong>
            <small>0 reviews</small>
          </div>
          <p className="shopper-preview-price">{formatPrice(product.price)}</p>
          <p className="shopper-preview-description">{product.description}</p>

          <div className="shopper-preview-selection">
            <strong>Available Sizes</strong>
            <div>
              {/* Three-value size display for shoppers */}
              <button type="button" disabled className="shopper-preview-size-chip">
                {sizeDisplay}
              </button>
            </div>
            {/* SRS §1.2 compliance disclaimer */}
            <small className="shopper-preview-size-disclaimer">
              Standard size chart for reference only. FitFusion AI does not predict your size and does not guarantee physical fit.
            </small>
          </div>

          <div className="shopper-preview-color">
            <strong>Color</strong>
            <div>
              <span />
              <p>
                {product.color}
                <small>{product.color_description}</small>
              </p>
            </div>
          </div>

          <div className="shopper-preview-tags">
            {[...styleTags, ...occasionTags].map((tag, i) => (
              <span key={i}>{tag}</span>
            ))}
          </div>

          <div className="shopper-preview-actions">
            <button type="button" className="shopper-preview-try-button" disabled>
              Try in Fitting Studio
            </button>
            <button type="button" className="shopper-preview-cart-button" disabled>
              Add to Cart
            </button>
          </div>
          <p className="shopper-preview-disabled-note">Shopper actions are disabled while using seller preview mode.</p>
        </div>
      </div>
    </section>
  );
}

function MetadataRow({ label, value }) {
  return (
    <div className="seller-item-metadata-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EditField({ label, fullWidth = false, ...inputProps }) {
  return (
    <label className={fullWidth ? "seller-item-edit-field seller-item-edit-full" : "seller-item-edit-field"}>
      <span>{label}</span>
      <input {...inputProps} />
    </label>
  );
}

export default SellerItemDetailsPage;