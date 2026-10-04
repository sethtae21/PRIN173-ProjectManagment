import { useEffect, useMemo, useState } from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";
import "../css/SellerItemDetailsPage.css";

const fallbackProducts = [
  {
    id: "product-001",
    storeName: "Maison Aurelia",
    name: "Camel Linen Shirt",
    description: "Relaxed linen tailoring",
    category: "Tops",
    sizes: ["S", "M", "L", "XL"],
    color: "Camel",
    colorDescription: "Warm golden brown",
    colorFamily: "Warm Neutrals",
    price: 750,
    styleTags: ["Classic", "Minimal"],
    occasionTags: ["Work", "Casual"],
    status: "Active",
    rating: 4.8,
    reviewCount: 24,
    uploadDate: "02 Sep 2026",
    frontImage: "linen_shirt_01_front.jpg",
    sideImage: "linen_shirt_01_side.jpg",
    rearImage: "linen_shirt_01_rear.jpg",
    rejectionReason: "",
  },
  {
    id: "product-002",
    storeName: "Maison Aurelia",
    name: "Ivory Coat",
    description: "Structured ivory outerwear",
    category: "Outerwear",
    sizes: ["M", "L", "XL"],
    color: "Ivory",
    colorDescription: "Soft warm ivory",
    colorFamily: "Warm Neutrals",
    price: 1850,
    styleTags: ["Elegant", "Classic"],
    occasionTags: ["Work", "Formal"],
    status: "Active",
    rating: 4.7,
    reviewCount: 18,
    uploadDate: "01 Sep 2026",
    frontImage: "ivory_coat_01_front.jpg",
    sideImage: "ivory_coat_01_side.jpg",
    rearImage: "ivory_coat_01_rear.jpg",
    rejectionReason: "",
  },
  {
    id: "product-003",
    storeName: "Maison Aurelia",
    name: "Gold Dress",
    description: "Elegant gold evening dress",
    category: "Dresses",
    sizes: ["S", "M", "L"],
    color: "Gold",
    colorDescription: "Metallic warm gold",
    colorFamily: "Warm Metallics",
    price: 1450,
    styleTags: ["Elegant", "Statement"],
    occasionTags: ["Formal", "Evening"],
    status: "Rejected",
    rating: 0,
    reviewCount: 0,
    uploadDate: "31 Aug 2026",
    frontImage: "gold_dress_01_front.jpg",
    sideImage: "gold_dress_01_side.jpg",
    rearImage: "gold_dress_01_rear.jpg",
    rejectionReason:
      "The rear-view image does not clearly show the complete garment.",
  },
  {
    id: "product-004",
    storeName: "Maison Aurelia",
    name: "Black Sneakers",
    description: "Minimal everyday sneakers",
    category: "Footwear",
    sizes: ["37", "38", "39", "40", "41"],
    color: "Black",
    colorDescription: "Deep neutral black",
    colorFamily: "Dark Neutrals",
    price: 1100,
    styleTags: ["Minimal", "Streetwear"],
    occasionTags: ["Casual", "Everyday"],
    status: "Active",
    rating: 4.6,
    reviewCount: 31,
    uploadDate: "30 Aug 2026",
    frontImage: "black_sneakers_01_front.jpg",
    sideImage: "black_sneakers_01_side.jpg",
    rearImage: "black_sneakers_01_rear.jpg",
    rejectionReason: "",
  },
];

function normalizeProduct(product) {
  return {
    id: product.id,
    storeName:
      product.storeName || "Your FitFusion Store",
    name: product.name || "Untitled Product",
    description:
      product.description || "No description provided.",
    category: product.category || "Uncategorized",
    sizes:
      product.sizes ||
      (product.size ? [product.size] : ["M"]),
    color: product.color || "Not specified",
    colorDescription:
      product.colorDescription || product.color || "",
    colorFamily:
      product.colorFamily || "Not specified",
    price: Number(product.price) || 0,
    styleTags: product.styleTags || ["Classic"],
    occasionTags:
      product.occasionTags || ["Casual"],
    status: product.status || "Pending",
    rating: Number(product.rating) || 0,
    reviewCount: Number(product.reviewCount) || 0,
    uploadDate: product.uploadDate || "Not available",
    frontImage:
      product.frontImage ||
      `${product.id || "product"}_front.jpg`,
    sideImage:
      product.sideImage ||
      `${product.id || "product"}_side.jpg`,
    rearImage:
      product.rearImage ||
      `${product.id || "product"}_rear.jpg`,
    rejectionReason: product.rejectionReason || "",
  };
}

function SellerItemDetailsPage() {
  const { productId } = useParams();
  const navigate = useNavigate();

  const [viewMode, setViewMode] =
    useState("seller");

  const [product, setProduct] = useState(null);
  const [selectedView, setSelectedView] =
    useState("front");

  const [showEditModal, setShowEditModal] =
    useState(false);

  const [showDeleteModal, setShowDeleteModal] =
    useState(false);

  const [successMessage, setSuccessMessage] =
    useState("");

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
    const storedProducts = localStorage.getItem(
      "fitfusion-seller-products"
    );

    let availableProducts = fallbackProducts;

    if (storedProducts) {
      try {
        const parsedProducts =
          JSON.parse(storedProducts);

        if (
          Array.isArray(parsedProducts) &&
          parsedProducts.length > 0
        ) {
          availableProducts = parsedProducts;
        }
      } catch {
        availableProducts = fallbackProducts;
      }
    }

    const matchingProduct =
      availableProducts.find(
        (item) => item.id === productId
      ) ||
      fallbackProducts.find(
        (item) => item.id === productId
      );

    if (matchingProduct) {
      setProduct(normalizeProduct(matchingProduct));
    }
  }, [productId]);

  const viewInformation = useMemo(() => {
    if (!product) {
      return null;
    }

    const views = {
      front: {
        label: "FRONT PNG",
        fileName: product.frontImage,
      },
      side: {
        label: "SIDE PNG",
        fileName: product.sideImage,
      },
      rear: {
        label: "REAR PNG",
        fileName: product.rearImage,
      },
    };

    return views[selectedView];
  }, [product, selectedView]);

  function formatPrice(price) {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(price);
  }

  function openEditModal() {
    if (!product) {
      return;
    }

    setEditForm({
      name: product.name,
      description: product.description,
      category: product.category,
      sizes: product.sizes.join(", "),
      color: product.color,
      colorDescription:
        product.colorDescription,
      colorFamily: product.colorFamily,
      price: String(product.price),
      styleTags: product.styleTags.join(", "),
      occasionTags:
        product.occasionTags.join(", "),
    });

    setShowEditModal(true);
  }

  function handleEditChange(event) {
    const { name, value } = event.target;

    setEditForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function handleSaveChanges(event) {
    event.preventDefault();

    const updatedProduct = {
      ...product,
      name: editForm.name.trim(),
      description: editForm.description.trim(),
      category: editForm.category,
      sizes: editForm.sizes
        .split(",")
        .map((size) => size.trim())
        .filter(Boolean),
      color: editForm.color.trim(),
      colorDescription:
        editForm.colorDescription.trim(),
      colorFamily: editForm.colorFamily.trim(),
      price: Number(editForm.price),
      styleTags: editForm.styleTags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      occasionTags: editForm.occasionTags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      status:
        product.status === "Rejected"
          ? "Pending"
          : product.status,
      rejectionReason:
        product.status === "Rejected"
          ? ""
          : product.rejectionReason,
    };

    setProduct(updatedProduct);

    const storedProducts = localStorage.getItem(
      "fitfusion-seller-products"
    );

    let currentProducts = fallbackProducts;

    if (storedProducts) {
      try {
        const parsedProducts =
          JSON.parse(storedProducts);

        if (Array.isArray(parsedProducts)) {
          currentProducts = parsedProducts;
        }
      } catch {
        currentProducts = fallbackProducts;
      }
    }

    const productExists = currentProducts.some(
      (item) => item.id === updatedProduct.id
    );

    const updatedProducts = productExists
      ? currentProducts.map((item) =>
          item.id === updatedProduct.id
            ? updatedProduct
            : item
        )
      : [...currentProducts, updatedProduct];

    localStorage.setItem(
      "fitfusion-seller-products",
      JSON.stringify(updatedProducts)
    );

    setShowEditModal(false);
    setSuccessMessage(
      "Product listing updated successfully."
    );

    window.setTimeout(() => {
      setSuccessMessage("");
    }, 3500);
  }

  function handleDeleteProduct() {
    const storedProducts = localStorage.getItem(
      "fitfusion-seller-products"
    );

    let currentProducts = fallbackProducts;

    if (storedProducts) {
      try {
        const parsedProducts =
          JSON.parse(storedProducts);

        if (Array.isArray(parsedProducts)) {
          currentProducts = parsedProducts;
        }
      } catch {
        currentProducts = fallbackProducts;
      }
    }

    const updatedProducts = currentProducts.filter(
      (item) => item.id !== product.id
    );

    localStorage.setItem(
      "fitfusion-seller-products",
      JSON.stringify(updatedProducts)
    );

    navigate("/seller/products", {
      replace: true,
    });
  }

  if (!product) {
    return (
      <main className="seller-item-page">
        <header className="seller-item-header">
          <div>
            <h1>22A — SELLER ITEM DETAILS</h1>
            <p>Complete owned-product metadata</p>
          </div>

          <span className="seller-item-role">
            SELLER
          </span>
        </header>

        <section className="seller-item-not-found">
          <h2>Product not found</h2>

          <p>
            This product may have been removed or does not
            belong to the current seller.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/seller/products")
            }
          >
            Return to Listings
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="seller-item-page">
      <header className="seller-item-header">
        <div>
          <h1>22A — SELLER ITEM DETAILS</h1>

          <p>
            Complete owned-product metadata and processed
            Front/Side/Rear assets
          </p>
        </div>

        <span className="seller-item-role">
          SELLER
        </span>
      </header>

      <div className="seller-item-content">
        <div className="seller-item-toolbar">
          <button
            type="button"
            className="seller-item-back-button"
            onClick={() =>
              navigate("/seller/products")
            }
          >
            ← Back to Listings
          </button>

          <div
            className="seller-preview-mode-selector"
            aria-label="Product viewing mode"
          >
            <button
              type="button"
              className={
                viewMode === "seller"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setViewMode("seller")
              }
            >
              Seller Mode
            </button>

            <button
              type="button"
              className={
                viewMode === "shopper"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setViewMode("shopper")
              }
            >
              Shopper Preview
            </button>
          </div>
        </div>

        {successMessage && (
          <div
            className="seller-item-success"
            role="status"
          >
            {successMessage}
          </div>
        )}

        {viewMode === "seller" ? (
          <SellerMode
            product={product}
            formatPrice={formatPrice}
            onEdit={openEditModal}
            onDelete={() =>
              setShowDeleteModal(true)
            }
          />
        ) : (
          <ShopperPreview
            product={product}
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
            if (
              event.target === event.currentTarget
            ) {
              setShowEditModal(false);
            }
          }}
        >
          <form
            className="seller-item-modal"
            onSubmit={handleSaveChanges}
          >
            <div className="seller-item-modal-header">
              <div>
                <p>EDIT LISTING</p>
                <h2>{product.name}</h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowEditModal(false)
                }
                aria-label="Close edit product form"
              >
                ×
              </button>
            </div>

            {product.status === "Rejected" && (
              <div className="seller-item-rejection">
                <strong>Rejection reason</strong>

                <p>{product.rejectionReason}</p>

                <span>
                  Saving the corrected product returns it
                  to Pending status for validation.
                </span>
              </div>
            )}

            <div className="seller-item-edit-grid">
              <EditField
                label="Product Name"
                name="name"
                value={editForm.name}
                onChange={handleEditChange}
                fullWidth
                required
              />

              <label className="seller-item-edit-field seller-item-edit-full">
                <span>Description</span>

                <textarea
                  name="description"
                  value={editForm.description}
                  onChange={handleEditChange}
                  rows="3"
                  required
                />
              </label>

              <label className="seller-item-edit-field">
                <span>Category</span>

                <select
                  name="category"
                  value={editForm.category}
                  onChange={handleEditChange}
                  required
                >
                  <option value="">Select category</option>
                  <option value="Tops">Tops</option>
                  <option value="Bottoms">Bottoms</option>
                  <option value="Dresses">Dresses</option>
                  <option value="Outerwear">
                    Outerwear
                  </option>
                  <option value="Footwear">
                    Footwear
                  </option>
                </select>
              </label>

              <EditField
                label="Sizes"
                name="sizes"
                value={editForm.sizes}
                onChange={handleEditChange}
                placeholder="S, M, L, XL"
                required
              />

              <EditField
                label="Color"
                name="color"
                value={editForm.color}
                onChange={handleEditChange}
                required
              />

              <EditField
                label="Color Description"
                name="colorDescription"
                value={editForm.colorDescription}
                onChange={handleEditChange}
                required
              />

              <EditField
                label="Color Family"
                name="colorFamily"
                value={editForm.colorFamily}
                onChange={handleEditChange}
                required
              />

              <EditField
                label="Price"
                name="price"
                type="number"
                value={editForm.price}
                onChange={handleEditChange}
                min="1"
                step="0.01"
                required
              />

              <EditField
                label="Style Tags"
                name="styleTags"
                value={editForm.styleTags}
                onChange={handleEditChange}
                placeholder="Classic, Minimal"
                fullWidth
                required
              />

              <EditField
                label="Occasion Tags"
                name="occasionTags"
                value={editForm.occasionTags}
                onChange={handleEditChange}
                placeholder="Work, Casual"
                fullWidth
                required
              />
            </div>

            <div className="seller-item-modal-actions">
              <button
                type="button"
                className="seller-item-secondary-button"
                onClick={() =>
                  setShowEditModal(false)
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="seller-item-primary-button"
              >
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
            if (
              event.target === event.currentTarget
            ) {
              setShowDeleteModal(false);
            }
          }}
        >
          <section className="seller-item-delete-modal">
            <div className="seller-item-delete-icon">
              !
            </div>

            <h2>Delete this listing?</h2>

            <p>
              <strong>{product.name}</strong> will be
              permanently removed from your seller listings
              and the shopper catalog.
            </p>

            <div className="seller-item-modal-actions">
              <button
                type="button"
                className="seller-item-secondary-button"
                onClick={() =>
                  setShowDeleteModal(false)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="seller-item-delete-button"
                onClick={handleDeleteProduct}
              >
                Delete Listing
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function SellerMode({
  product,
  formatPrice,
  onEdit,
  onDelete,
}) {
  const imageViews = [
    {
      label: "FRONT PNG",
      fileName: product.frontImage,
    },
    {
      label: "SIDE PNG",
      fileName: product.sideImage,
    },
    {
      label: "REAR PNG",
      fileName: product.rearImage,
    },
  ];

  return (
    <>
      <section className="seller-item-introduction">
        <div>
          <p>SELLER ITEM DETAILS</p>
          <h2>{product.name}</h2>

          <span>
            Full metadata and processed Front/Side/Rear
            transparent assets.
          </span>
        </div>

        <span
          className={`seller-item-status seller-item-status-${product.status.toLowerCase()}`}
        >
          {product.status}
        </span>
      </section>

      {product.status !== "Active" && (
        <div className="seller-item-status-notice">
          <strong>
            This product is not currently visible to
            shoppers.
          </strong>

          <p>
            {product.status === "Rejected"
              ? product.rejectionReason
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
              <div
                className="seller-item-asset"
                key={imageView.label}
              >
                <span>{imageView.label}</span>

                <div className="seller-item-garment">
                  <div className="seller-item-garment-neck" />
                  <div className="seller-item-garment-body" />
                </div>

                <small>{imageView.fileName}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="seller-item-metadata-card">
          <div className="seller-item-card-heading">
            <p>COMPLETE METADATA</p>
            <h3>Product information</h3>
          </div>

          <MetadataRow
            label="Store"
            value={product.storeName}
          />

          <MetadataRow
            label="Name"
            value={product.name}
          />

          <MetadataRow
            label="Description"
            value={product.description}
          />

          <MetadataRow
            label="Category"
            value={product.category}
          />

          <MetadataRow
            label="Sizes"
            value={product.sizes.join(", ")}
          />

          <MetadataRow
            label="Color"
            value={product.color}
          />

          <MetadataRow
            label="Color description"
            value={product.colorDescription}
          />

          <MetadataRow
            label="Color family"
            value={product.colorFamily}
          />

          <MetadataRow
            label="Price"
            value={formatPrice(product.price)}
          />

          <MetadataRow
            label="Style tags"
            value={product.styleTags.join(", ")}
          />

          <MetadataRow
            label="Occasion tags"
            value={product.occasionTags.join(", ")}
          />

          <MetadataRow
            label="Status"
            value={product.status}
          />

          <div className="seller-item-management-actions">
            <button
              type="button"
              className="seller-item-edit-button"
              onClick={onEdit}
            >
              Edit Listing
            </button>

            <button
              type="button"
              className="seller-item-delete-button"
              onClick={onDelete}
            >
              Delete
            </button>
          </div>
        </article>
      </section>
    </>
  );
}

function ShopperPreview({
  product,
  selectedView,
  setSelectedView,
  viewInformation,
  formatPrice,
}) {
  return (
    <section className="shopper-product-preview">
      <div className="shopper-preview-notice">
        <div>
          <strong>Shopper Preview</strong>

          <span>
            This is a read-only preview. No order or cart
            action will be created.
          </span>
        </div>

        <span
          className={`shopper-preview-publication shopper-preview-publication-${product.status.toLowerCase()}`}
        >
          {product.status === "Active"
            ? "Visible to shoppers"
            : "Not publicly visible"}
        </span>
      </div>

      <div className="shopper-preview-product">
        <div className="shopper-preview-gallery">
          <div className="shopper-preview-main-image">
            <span>{viewInformation.label}</span>

            <div className="shopper-preview-garment">
              <div className="shopper-preview-neck" />
              <div className="shopper-preview-body" />
            </div>

            <small>
              {viewInformation.fileName}
            </small>
          </div>

          <div className="shopper-preview-thumbnails">
            {["front", "side", "rear"].map(
              (view) => (
                <button
                  type="button"
                  key={view}
                  className={
                    selectedView === view
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setSelectedView(view)
                  }
                >
                  {view}
                </button>
              )
            )}
          </div>
        </div>

        <div className="shopper-preview-information">
          <button
            type="button"
            className="shopper-preview-store"
            disabled
          >
            {product.storeName}
          </button>

          <p className="shopper-preview-category">
            {product.category}
          </p>

          <h2>{product.name}</h2>

          <div className="shopper-preview-rating">
            <span>
              {product.rating > 0
                ? "★".repeat(
                    Math.round(product.rating)
                  )
                : "☆☆☆☆☆"}
            </span>

            <strong>
              {product.rating > 0
                ? product.rating.toFixed(1)
                : "No ratings"}
            </strong>

            <small>
              {product.reviewCount} review
              {product.reviewCount === 1 ? "" : "s"}
            </small>
          </div>

          <p className="shopper-preview-price">
            {formatPrice(product.price)}
          </p>

          <p className="shopper-preview-description">
            {product.description}
          </p>

          <div className="shopper-preview-selection">
            <strong>Available Sizes</strong>

            <div>
              {product.sizes.map((size) => (
                <button
                  type="button"
                  key={size}
                  disabled
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="shopper-preview-color">
            <strong>Color</strong>

            <div>
              <span />
              <p>
                {product.color}
                <small>
                  {product.colorDescription}
                </small>
              </p>
            </div>
          </div>

          <div className="shopper-preview-tags">
            {[...product.styleTags,
              ...product.occasionTags].map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>

          <div className="shopper-preview-actions">
            <button
              type="button"
              className="shopper-preview-try-button"
              disabled
            >
              Try in Fitting Studio
            </button>

            <button
              type="button"
              className="shopper-preview-cart-button"
              disabled
            >
              Add to Cart
            </button>
          </div>

          <p className="shopper-preview-disabled-note">
            Shopper actions are disabled while using seller
            preview mode.
          </p>
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

function EditField({
  label,
  fullWidth = false,
  ...inputProps
}) {
  return (
    <label
      className={
        fullWidth
          ? "seller-item-edit-field seller-item-edit-full"
          : "seller-item-edit-field"
      }
    >
      <span>{label}</span>
      <input {...inputProps} />
    </label>
  );
}

export default SellerItemDetailsPage;