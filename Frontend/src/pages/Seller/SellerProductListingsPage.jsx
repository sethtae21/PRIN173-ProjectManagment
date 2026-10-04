import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/SellerProductListingsPage.css";

const defaultProducts = [
  {
    id: "product-001",
    name: "Camel Linen Shirt",
    description: "Relaxed linen tailoring",
    category: "Tops",
    size: "M",
    color: "Camel",
    price: 750,
    uploadDate: "02 Sep 2026",
    status: "Active",
    rejectionReason: "",
  },
  {
    id: "product-002",
    name: "Ivory Coat",
    description: "Structured ivory outerwear",
    category: "Outerwear",
    size: "L",
    color: "Ivory",
    price: 1850,
    uploadDate: "01 Sep 2026",
    status: "Active",
    rejectionReason: "",
  },
  {
    id: "product-003",
    name: "Gold Dress",
    description: "Elegant gold evening dress",
    category: "Dresses",
    size: "S",
    color: "Gold",
    price: 1450,
    uploadDate: "31 Aug 2026",
    status: "Rejected",
    rejectionReason:
      "The rear-view image does not clearly show the complete garment.",
  },
  {
    id: "product-004",
    name: "Black Sneakers",
    description: "Minimal everyday sneakers",
    category: "Footwear",
    size: "39",
    color: "Black",
    price: 1100,
    uploadDate: "30 Aug 2026",
    status: "Active",
    rejectionReason: "",
  },
];

function SellerProductListingsPage() {
  const navigate = useNavigate();

  const [products, setProducts] = useState(() => {
    const storedProducts = localStorage.getItem(
      "fitfusion-seller-products"
    );

    if (!storedProducts) {
      return defaultProducts;
    }

    try {
      const parsedProducts = JSON.parse(storedProducts);

      return Array.isArray(parsedProducts)
        ? parsedProducts
        : defaultProducts;
    } catch {
      return defaultProducts;
    }
  });

  const [selectedProduct, setSelectedProduct] =
    useState(null);

  const [modalType, setModalType] = useState(null);
  const [successMessage, setSuccessMessage] =
    useState("");

  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    category: "",
    size: "",
    color: "",
    price: "",
  });

  useEffect(() => {
    localStorage.setItem(
      "fitfusion-seller-products",
      JSON.stringify(products)
    );
  }, [products]);

  function openViewModal(product) {
    setSelectedProduct(product);
    setModalType("view");
  }

  function openEditModal(product) {
    setSelectedProduct(product);

    setEditForm({
      name: product.name,
      description: product.description,
      category: product.category,
      size: product.size,
      color: product.color,
      price: String(product.price),
    });

    setModalType("edit");
  }

  function openDeleteModal(product) {
    setSelectedProduct(product);
    setModalType("delete");
  }

  function closeModal() {
    setSelectedProduct(null);
    setModalType(null);
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

    if (!selectedProduct) {
      return;
    }

    const numericPrice = Number(editForm.price);

    if (
      !editForm.name.trim() ||
      !editForm.category.trim() ||
      !editForm.size.trim() ||
      !editForm.color.trim() ||
      !Number.isFinite(numericPrice) ||
      numericPrice <= 0
    ) {
      return;
    }

    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.id === selectedProduct.id
          ? {
              ...product,
              name: editForm.name.trim(),
              description: editForm.description.trim(),
              category: editForm.category.trim(),
              size: editForm.size.trim(),
              color: editForm.color.trim(),
              price: numericPrice,
              status:
                product.status === "Rejected"
                  ? "Pending"
                  : product.status,
              rejectionReason:
                product.status === "Rejected"
                  ? ""
                  : product.rejectionReason,
            }
          : product
      )
    );

    closeModal();

    setSuccessMessage(
      "Product information was updated successfully."
    );

    window.setTimeout(() => {
      setSuccessMessage("");
    }, 3500);
  }

  function handleDeleteProduct() {
    if (!selectedProduct) {
      return;
    }

    setProducts((currentProducts) =>
      currentProducts.filter(
        (product) =>
          product.id !== selectedProduct.id
      )
    );

    closeModal();

    setSuccessMessage(
      "The product listing was deleted."
    );

    window.setTimeout(() => {
      setSuccessMessage("");
    }, 3500);
  }

  function formatPrice(price) {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(price);
  }

  return (
    <main className="seller-listings-page">
      <header className="seller-listings-header">
        <div>
          <h1>22 — SELLER LISTINGS</h1>

          <p>
            List, view, edit, and delete owned catalog
            products
          </p>
        </div>

        <span className="seller-listings-role">
          SELLER
        </span>
      </header>

      <div className="seller-listings-content">
        <section className="seller-listings-introduction">
          <div>
            <p className="seller-listings-eyebrow">
              MY LISTINGS
            </p>

            <h2>Seller-owned products</h2>

            <p>
              Only the authenticated seller&apos;s items
              are displayed.
            </p>
          </div>

          <button
            type="button"
            className="seller-add-product-button"
            onClick={() =>
              navigate("/seller/products/upload")
            }
          >
            Upload New Catalog
          </button>
        </section>

        {successMessage && (
          <div
            className="seller-listings-success"
            role="status"
          >
            {successMessage}
          </div>
        )}

        <section className="seller-listings-summary">
          <article>
            <span>Total Listings</span>
            <strong>{products.length}</strong>
          </article>

          <article>
            <span>Active</span>
            <strong>
              {
                products.filter(
                  (product) =>
                    product.status === "Active"
                ).length
              }
            </strong>
          </article>

          <article>
            <span>Pending</span>
            <strong>
              {
                products.filter(
                  (product) =>
                    product.status === "Pending"
                ).length
              }
            </strong>
          </article>

          <article>
            <span>Rejected</span>
            <strong>
              {
                products.filter(
                  (product) =>
                    product.status === "Rejected"
                ).length
              }
            </strong>
          </article>
        </section>

        <section className="seller-listings-card">
          {products.length > 0 ? (
            <div className="seller-listings-table-wrapper">
              <table className="seller-listings-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Upload Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <div className="seller-listing-item">
                          <div className="seller-product-thumbnail">
                            <span>
                              {product.name
                                .charAt(0)
                                .toUpperCase()}
                            </span>
                          </div>

                          <div>
                            <strong>
                              {product.name}
                            </strong>

                            <span>
                              {formatPrice(
                                product.price
                              )}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>{product.category}</td>

                      <td>{product.uploadDate}</td>

                      <td>
                        <span
                          className={`seller-status-badge seller-status-${product.status.toLowerCase()}`}
                        >
                          {product.status}
                        </span>
                      </td>

                      <td>
                        <div className="seller-listing-actions">
                          <button
                            type="button"
                            className="seller-view-button"
                            onClick={() =>
                              openViewModal(product)
                            }
                          >
                            View
                          </button>

                          <button
                            type="button"
                            className="seller-edit-button"
                            onClick={() =>
                              openEditModal(product)
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="seller-delete-button"
                            onClick={() =>
                              openDeleteModal(product)
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="seller-listings-empty">
              <div className="seller-listings-empty-icon">
                +
              </div>

              <h3>No product listings yet</h3>

              <p>
                Upload a completed CSV catalog and product
                images to create your first listings.
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate("/seller/products/upload")
                }
              >
                Upload Catalog
              </button>
            </div>
          )}
        </section>
      </div>

      {modalType === "view" && selectedProduct && (
        <ModalOverlay onClose={closeModal}>
          <section className="seller-product-modal">
            <div className="seller-modal-header">
              <div>
                <p>PRODUCT DETAILS</p>
                <h2>{selectedProduct.name}</h2>
              </div>

              <button
                type="button"
                className="seller-modal-close"
                onClick={closeModal}
                aria-label="Close product details"
              >
                ×
              </button>
            </div>

            <div className="seller-product-preview">
              <div className="seller-product-preview-image">
                <span>
                  {selectedProduct.name
                    .charAt(0)
                    .toUpperCase()}
                </span>
              </div>

              <div className="seller-product-details">
                <DetailRow
                  label="Description"
                  value={selectedProduct.description}
                />

                <DetailRow
                  label="Category"
                  value={selectedProduct.category}
                />

                <DetailRow
                  label="Size"
                  value={selectedProduct.size}
                />

                <DetailRow
                  label="Color"
                  value={selectedProduct.color}
                />

                <DetailRow
                  label="Price"
                  value={formatPrice(
                    selectedProduct.price
                  )}
                />

                <DetailRow
                  label="Upload Date"
                  value={selectedProduct.uploadDate}
                />

                <DetailRow
                  label="Status"
                  value={selectedProduct.status}
                />
              </div>
            </div>

            {selectedProduct.status === "Rejected" && (
              <div className="seller-rejection-notice">
                <strong>Validation issue</strong>

                <p>
                  {selectedProduct.rejectionReason}
                </p>
              </div>
            )}

            <div className="seller-modal-actions">
              <button
                type="button"
                className="seller-modal-secondary"
                onClick={closeModal}
              >
                Close
              </button>

              <button
                type="button"
                className="seller-modal-primary"
                onClick={() =>
                  openEditModal(selectedProduct)
                }
              >
                Edit Product
              </button>
            </div>
          </section>
        </ModalOverlay>
      )}

      {modalType === "edit" && selectedProduct && (
        <ModalOverlay onClose={closeModal}>
          <form
            className="seller-product-modal"
            onSubmit={handleSaveChanges}
          >
            <div className="seller-modal-header">
              <div>
                <p>EDIT LISTING</p>
                <h2>{selectedProduct.name}</h2>
              </div>

              <button
                type="button"
                className="seller-modal-close"
                onClick={closeModal}
                aria-label="Close edit form"
              >
                ×
              </button>
            </div>

            {selectedProduct.status === "Rejected" && (
              <div className="seller-rejection-notice">
                <strong>Reason for rejection</strong>

                <p>
                  {selectedProduct.rejectionReason}
                </p>

                <span>
                  Saving corrected information will return
                  this listing to Pending status.
                </span>
              </div>
            )}

            <div className="seller-edit-grid">
              <label className="seller-edit-field seller-edit-field-full">
                <span>Product Name</span>

                <input
                  type="text"
                  name="name"
                  value={editForm.name}
                  onChange={handleEditChange}
                  required
                />
              </label>

              <label className="seller-edit-field seller-edit-field-full">
                <span>Description</span>

                <textarea
                  name="description"
                  value={editForm.description}
                  onChange={handleEditChange}
                  rows="3"
                />
              </label>

              <label className="seller-edit-field">
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

              <label className="seller-edit-field">
                <span>Size</span>

                <input
                  type="text"
                  name="size"
                  value={editForm.size}
                  onChange={handleEditChange}
                  required
                />
              </label>

              <label className="seller-edit-field">
                <span>Color</span>

                <input
                  type="text"
                  name="color"
                  value={editForm.color}
                  onChange={handleEditChange}
                  required
                />
              </label>

              <label className="seller-edit-field">
                <span>Price</span>

                <input
                  type="number"
                  name="price"
                  min="1"
                  step="0.01"
                  value={editForm.price}
                  onChange={handleEditChange}
                  required
                />
              </label>
            </div>

            <div className="seller-modal-actions">
              <button
                type="button"
                className="seller-modal-secondary"
                onClick={closeModal}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="seller-modal-primary"
              >
                Save Changes
              </button>
            </div>
          </form>
        </ModalOverlay>
      )}

      {modalType === "delete" &&
        selectedProduct && (
          <ModalOverlay onClose={closeModal}>
            <section className="seller-delete-modal">
              <div className="seller-delete-icon">
                !
              </div>

              <h2>Delete product listing?</h2>

              <p>
                You are about to permanently delete{" "}
                <strong>
                  {selectedProduct.name}
                </strong>
                . This action cannot be undone.
              </p>

              <div className="seller-modal-actions">
                <button
                  type="button"
                  className="seller-modal-secondary"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="seller-confirm-delete-button"
                  onClick={handleDeleteProduct}
                >
                  Delete Product
                </button>
              </div>
            </section>
          </ModalOverlay>
        )}
    </main>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="seller-detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ModalOverlay({ children, onClose }) {
  function handleOverlayClick(event) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      className="seller-modal-overlay"
      onMouseDown={handleOverlayClick}
      role="presentation"
    >
      {children}
    </div>
  );
}

export default SellerProductListingsPage;