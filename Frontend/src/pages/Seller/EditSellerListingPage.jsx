import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { catalogAPI } from "../../services/api";
import "../css/EditSellerListingPage.css";

const categories = ["Tops", "Bottoms", "Dresses", "Outerwear", "Footwear", "Accessories"];
const sizes = ["XS", "S", "M", "L", "XL", "XXL"];

function EditSellerListingPage() {
  const navigate = useNavigate();
  // FIX: Check all possible parameter names from App.jsx routes
  const params = useParams();
  const productId = params.listingId || params.itemId || params.productId;

  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    size: "",
    color: "",
    price: "",
  });

  const [images, setImages] = useState({ front: null, side: null, rear: null });
  const [imageFiles, setImageFiles] = useState({ front: null, side: null, rear: null });
  const [imageNames, setImageNames] = useState({ front: "", side: "", rear: "" });
  const [replacementImages, setReplacementImages] = useState({ front: false, side: false, rear: false });

  const [errors, setErrors] = useState({});
  const [fileError, setFileError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch product from backend with timeout
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
        console.log("Fetching product for edit:", productId);
        const data = await catalogAPI.getListing(productId);
        console.log("Product data for edit:", data);

        if (isMounted) {
          setProduct(data);
          setFormData({
            name: data.name || "",
            description: data.description || "",
            category: data.category || "",
            size: data.size || "",
            color: data.color || "",
            price: String(data.price || ""),
          });
          setImageNames({
            front: data.front_image || "",
            side: data.side_image || "",
            rear: data.rear_image || "",
          });
        }
      } catch (err) {
        console.error("Error fetching product for edit:", err);
        if (isMounted) {
          let errorMsg = "Failed to load product details.";
          try {
            const errData = JSON.parse(err.message);
            if (errData.detail) errorMsg = errData.detail;
            else if (errData.error) errorMsg = errData.error;
          } catch {
            // Use default error message
          }
          setError(errorMsg);
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchProduct();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [productId]);

  function handleInputChange(event) {
    const { name, value } = event.target;
    setFormData((currentData) => ({ ...currentData, [name]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [name]: "" }));
  }

  function handleImageChange(view, event) {
    const file = event.target.files?.[0];
    setFileError("");
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setFileError("Only JPG, PNG, and WEBP images are allowed.");
      event.target.value = "";
      return;
    }

    const maximumFileSize = 5 * 1024 * 1024; // 5 MB
    if (file.size > maximumFileSize) {
      setFileError("Each image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    // Store the actual File object for upload
    setImageFiles((prev) => ({ ...prev, [view]: file }));

    // Create preview URL
    const reader = new FileReader();
    reader.onload = () => {
      setImages((prev) => ({ ...prev, [view]: reader.result }));
      setImageNames((prev) => ({ ...prev, [view]: file.name }));
      setReplacementImages((prev) => ({ ...prev, [view]: true }));
    };
    reader.onerror = () => {
      setFileError("The selected image could not be read. Please try another file.");
    };
    reader.readAsDataURL(file);
  }

  function removeReplacement(view) {
    setImages((prev) => ({ ...prev, [view]: null }));
    setImageFiles((prev) => ({ ...prev, [view]: null }));
    setReplacementImages((prev) => ({ ...prev, [view]: false }));
    const input = document.getElementById(`${view}-image-upload`);
    if (input) input.value = "";
  }

  function validateForm() {
    const nextErrors = {};
    if (!formData.name.trim()) nextErrors.name = "Product name is required.";
    if (!formData.description.trim()) nextErrors.description = "Product description is required.";
    if (!formData.category) nextErrors.category = "Please select a category.";
    if (!formData.size) nextErrors.size = "Please select a size.";
    if (!formData.color.trim()) nextErrors.color = "Product color is required.";
    const numericPrice = Number(formData.price);
    if (!formData.price || Number.isNaN(numericPrice) || numericPrice <= 0) {
      nextErrors.price = "Enter a valid price greater than zero.";
    }
    if (product?.status === "Rejected" && !replacementImages.rear) {
      nextErrors.rearImage = "Please re-upload the corrected rear-view image identified in the rejection reason.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  // Submit to backend (FormData for image uploads)
  async function handleSubmit(event) {
    event.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setFileError("");

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name.trim());
      formDataToSend.append("description", formData.description.trim());
      formDataToSend.append("category", formData.category);
      formDataToSend.append("size", formData.size);
      formDataToSend.append("color", formData.color.trim());
      formDataToSend.append("price", formData.price);

      // Append images only if they were replaced
      if (imageFiles.front) formDataToSend.append("front_image", imageFiles.front);
      if (imageFiles.side) formDataToSend.append("side_image", imageFiles.side);
      if (imageFiles.rear) formDataToSend.append("rear_image", imageFiles.rear);

      console.log("Submitting update for product:", productId);
      await catalogAPI.updateListing(productId, formDataToSend);
      console.log("Product updated successfully");

      setShowSuccess(true);
    } catch (err) {
      console.error("Error updating product:", err);
      let errorMsg = "Failed to save listing. Please check your inputs and try again.";
      try {
        const errData = JSON.parse(err.message);
        if (errData.detail) errorMsg = errData.detail;
        else if (errData.error) errorMsg = errData.error;
      } catch {
        // Use default error message
      }
      setFileError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    navigate("/seller/listings");
  }

  function handleSuccessClose() {
    setShowSuccess(false);
    navigate("/seller/validation");
  }

  if (isLoading) {
    return (
      <main className="edit-seller-listing-page">
        <section className="edit-listing-panel">
          <header className="edit-listing-header">
            <div>
              <p>EDIT LISTING</p>
              <h1>Loading...</h1>
            </div>
            <button type="button" className="edit-listing-close" onClick={handleClose} aria-label="Close edit listing">
              ×
            </button>
          </header>
          <p style={{ textAlign: "center", padding: "4rem" }}>Fetching product details...</p>
        </section>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="edit-seller-listing-page">
        <section className="edit-listing-panel">
          <header className="edit-listing-header">
            <div>
              <p>EDIT LISTING</p>
              <h1>Error</h1>
            </div>
            <button type="button" className="edit-listing-close" onClick={handleClose} aria-label="Close edit listing">
              ×
            </button>
          </header>
          <p style={{ textAlign: "center", padding: "4rem" }}>{error || "Product not found."}</p>
          <div style={{ textAlign: "center" }}>
            <button type="button" onClick={handleClose} style={{ padding: "0.5rem 1rem", cursor: "pointer" }}>
              Return to Listings
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="edit-seller-listing-page">
      <section className="edit-listing-panel">
        <header className="edit-listing-header">
          <div>
            <p>EDIT LISTING</p>
            <h1>{formData.name}</h1>
          </div>
          <button type="button" className="edit-listing-close" onClick={handleClose} aria-label="Close edit listing">
            ×
          </button>
        </header>

        {product.status === "Rejected" && (
          <section className="listing-rejection-box">
            <strong>Reason for rejection</strong>
            <p>{Array.isArray(product.rejection_reasons) ? product.rejection_reasons.join("; ") : product.rejection_reasons}</p>
            <span>Correct the listed information and re-upload the affected image before submitting it for validation again.</span>
          </section>
        )}

        <form className="edit-listing-form" onSubmit={handleSubmit} noValidate>
          <label className="edit-listing-field edit-listing-full">
            <span>Product Name</span>
            <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Enter product name" />
            {errors.name && <small className="edit-field-error">{errors.name}</small>}
          </label>

          <label className="edit-listing-field edit-listing-full">
            <span>Description</span>
            <textarea name="description" value={formData.description} onChange={handleInputChange} placeholder="Describe the product" rows="4" />
            {errors.description && <small className="edit-field-error">{errors.description}</small>}
          </label>

          <div className="edit-listing-row">
            <label className="edit-listing-field">
              <span>Category</span>
              <select name="category" value={formData.category} onChange={handleInputChange}>
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.category && <small className="edit-field-error">{errors.category}</small>}
            </label>

            <label className="edit-listing-field">
              <span>Size</span>
              <select name="size" value={formData.size} onChange={handleInputChange}>
                <option value="">Select size</option>
                {sizes.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              {errors.size && <small className="edit-field-error">{errors.size}</small>}
            </label>
          </div>

          <div className="edit-listing-row">
            <label className="edit-listing-field">
              <span>Color</span>
              <input type="text" name="color" value={formData.color} onChange={handleInputChange} placeholder="Enter color" />
              {errors.color && <small className="edit-field-error">{errors.color}</small>}
            </label>

            <label className="edit-listing-field">
              <span>Price</span>
              <div className="edit-price-input">
                <span>₱</span>
                <input type="number" name="price" value={formData.price} onChange={handleInputChange} min="1" step="0.01" placeholder="0.00" />
              </div>
              {errors.price && <small className="edit-field-error">{errors.price}</small>}
            </label>
          </div>

          <section className="listing-image-section">
            <div className="listing-image-heading">
              <div>
                <h2>Product Images</h2>
                <p>Upload or re-upload the Front, Side, and Rear views of the garment.</p>
              </div>
              <span>JPG, PNG or WEBP · Maximum 5 MB each</span>
            </div>

            {fileError && <div className="listing-file-error">{fileError}</div>}

            <div className="listing-image-grid">
              <ProductImageUpload
                view="front"
                label="Front View"
                image={images.front}
                fileName={imageNames.front}
                replaced={replacementImages.front}
                onChange={(event) => handleImageChange("front", event)}
                onRemove={() => removeReplacement("front")}
              />
              <ProductImageUpload
                view="side"
                label="Side View"
                image={images.side}
                fileName={imageNames.side}
                replaced={replacementImages.side}
                onChange={(event) => handleImageChange("side", event)}
                onRemove={() => removeReplacement("side")}
              />
              <ProductImageUpload
                view="rear"
                label="Rear View"
                image={images.rear}
                fileName={imageNames.rear}
                replaced={replacementImages.rear}
                error={errors.rearImage}
                onChange={(event) => {
                  handleImageChange("rear", event);
                  setErrors((currentErrors) => ({ ...currentErrors, rearImage: "" }));
                }}
                onRemove={() => removeReplacement("rear")}
              />
            </div>
          </section>

          <footer className="edit-listing-actions">
            <button type="button" className="edit-listing-cancel" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="edit-listing-save" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save and Re-submit"}
            </button>
          </footer>
        </form>
      </section>

      {showSuccess && (
        <div className="edit-success-overlay" role="presentation">
          <section className="edit-success-modal" role="dialog" aria-modal="true" aria-labelledby="edit-success-title">
            <div className="edit-success-icon">✓</div>
            <p>LISTING UPDATED</p>
            <h2 id="edit-success-title">Changes saved successfully</h2>
            <span>The corrected listing and replacement images were saved and submitted for validation.</span>
            <button type="button" onClick={handleSuccessClose}>
              View Validation Report
            </button>
          </section>
        </div>
      )}
    </main>
  );
}

function ProductImageUpload({ view, label, image, fileName, replaced, error, onChange, onRemove }) {
  const inputId = `${view}-image-upload`;

  return (
    <article className={`product-image-upload ${error ? "has-error" : ""}`}>
      <div className="product-image-preview">
        {image ? (
          <img src={image} alt={`${label} preview`} />
        ) : (
          <div className="product-image-placeholder">
            <span>◇</span>
            <p>{label}</p>
          </div>
        )}
        {replaced && <span className="replacement-badge">New Image</span>}
      </div>

      <div className="product-image-information">
        <strong>{label}</strong>
        <small>{fileName || "No image selected"}</small>
      </div>

      <input id={inputId} type="file" accept=".jpg,.jpeg,.png,.webp" onChange={onChange} hidden />

      <div className="product-image-buttons">
        <label htmlFor={inputId} className="product-upload-button">
          {image ? "Re-upload Image" : "Upload Image"}
        </label>
        {replaced && (
          <button type="button" className="product-undo-button" onClick={onRemove}>
            Undo
          </button>
        )}
      </div>

      {error && <small className="product-image-error">{error}</small>}
    </article>
  );
}

export default EditSellerListingPage;