import {
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import "../css/EditSellerListingPage.css";

const fallbackProduct = {
  id: "product-003",
  name: "Gold Dress",
  description: "Elegant gold evening dress",
  category: "Dresses",
  size: "S",
  color: "Gold",
  price: 1450,
  status: "Rejected",
  rejectionReason:
    "The rear-view image does not clearly show the complete garment.",
  images: {
    front: "",
    side: "",
    rear: "",
  },
  imageNames: {
    front: "gold-dress-front.jpg",
    side: "gold-dress-side.jpg",
    rear: "gold-dress-rear.jpg",
  },
};

const categories = [
  "Tops",
  "Bottoms",
  "Dresses",
  "Outerwear",
  "Footwear",
  "Accessories",
];

const sizes = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
];

function readSellerProducts() {
  try {
    const storedProducts = JSON.parse(
      localStorage.getItem(
        "fitfusion-seller-products"
      )
    );

    return Array.isArray(storedProducts)
      ? storedProducts
      : [];
  } catch {
    return [];
  }
}

function EditSellerListingPage() {
  const navigate = useNavigate();
  const { productId } = useParams();

  const storedProducts = useMemo(
    () => readSellerProducts(),
    []
  );

  const selectedProduct = useMemo(() => {
    const matchingProduct =
      storedProducts.find(
        (product) =>
          String(product.id) ===
          String(productId)
      );

    if (!matchingProduct) {
      return {
        ...fallbackProduct,
        id:
          productId ||
          fallbackProduct.id,
      };
    }

    return {
      ...fallbackProduct,
      ...matchingProduct,
      images: {
        ...fallbackProduct.images,
        ...(matchingProduct.images || {}),
      },
      imageNames: {
        ...fallbackProduct.imageNames,
        ...(matchingProduct.imageNames ||
          {}),
      },
    };
  }, [productId, storedProducts]);

  const [formData, setFormData] = useState({
    name:
      selectedProduct.name ||
      selectedProduct.productName ||
      "",
    description:
      selectedProduct.description || "",
    category:
      selectedProduct.category || "",
    size: selectedProduct.size || "",
    color: selectedProduct.color || "",
    price: selectedProduct.price || "",
  });

  const [images, setImages] = useState(
    selectedProduct.images
  );

  const [imageNames, setImageNames] =
    useState(selectedProduct.imageNames);

  const [replacementImages, setReplacementImages] =
    useState({
      front: false,
      side: false,
      rear: false,
    });

  const [errors, setErrors] = useState({});
  const [fileError, setFileError] =
    useState("");
  const [showSuccess, setShowSuccess] =
    useState(false);

  function handleInputChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: "",
    }));
  }

  function handleImageChange(view, event) {
    const file = event.target.files?.[0];

    setFileError("");

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setFileError(
        "Only JPG, PNG, and WEBP images are allowed."
      );

      event.target.value = "";
      return;
    }

    const maximumFileSize = 1024 * 1024;

    if (file.size > maximumFileSize) {
      setFileError(
        "Each image must be 1 MB or smaller."
      );

      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setImages((currentImages) => ({
        ...currentImages,
        [view]: reader.result,
      }));

      setImageNames((currentNames) => ({
        ...currentNames,
        [view]: file.name,
      }));

      setReplacementImages(
        (currentReplacements) => ({
          ...currentReplacements,
          [view]: true,
        })
      );
    };

    reader.onerror = () => {
      setFileError(
        "The selected image could not be read. Please try another file."
      );
    };

    reader.readAsDataURL(file);
  }

  function removeReplacement(view) {
    setImages((currentImages) => ({
      ...currentImages,
      [view]:
        selectedProduct.images?.[view] || "",
    }));

    setImageNames((currentNames) => ({
      ...currentNames,
      [view]:
        selectedProduct.imageNames?.[view] ||
        "",
    }));

    setReplacementImages(
      (currentReplacements) => ({
        ...currentReplacements,
        [view]: false,
      })
    );
  }

  function validateForm() {
    const nextErrors = {};

    if (!formData.name.trim()) {
      nextErrors.name =
        "Product name is required.";
    }

    if (!formData.description.trim()) {
      nextErrors.description =
        "Product description is required.";
    }

    if (!formData.category) {
      nextErrors.category =
        "Please select a category.";
    }

    if (!formData.size) {
      nextErrors.size =
        "Please select a size.";
    }

    if (!formData.color.trim()) {
      nextErrors.color =
        "Product color is required.";
    }

    const numericPrice = Number(
      formData.price
    );

    if (
      !formData.price ||
      Number.isNaN(numericPrice) ||
      numericPrice <= 0
    ) {
      nextErrors.price =
        "Enter a valid price greater than zero.";
    }

    if (
      selectedProduct.status ===
        "Rejected" &&
      !replacementImages.rear
    ) {
      nextErrors.rearImage =
        "Please re-upload the corrected rear-view image identified in the rejection reason.";
    }

    setErrors(nextErrors);

    return (
      Object.keys(nextErrors).length === 0
    );
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    const updatedProduct = {
      ...selectedProduct,
      id:
        selectedProduct.id ||
        productId,
      name: formData.name.trim(),
      productName:
        formData.name.trim(),
      description:
        formData.description.trim(),
      category: formData.category,
      size: formData.size,
      color: formData.color.trim(),
      price: Number(formData.price),

      /*
       * The listing remains rejected until
       * it passes validation again.
       */
      status: "Rejected",

      images,
      imageNames,

      correctedAt:
        new Date().toISOString(),
      resubmittedForValidation: true,
    };

    const existingIndex =
      storedProducts.findIndex(
        (product) =>
          String(product.id) ===
          String(updatedProduct.id)
      );

    let updatedProducts;

    if (existingIndex >= 0) {
      updatedProducts =
        storedProducts.map((product) =>
          String(product.id) ===
          String(updatedProduct.id)
            ? updatedProduct
            : product
        );
    } else {
      updatedProducts = [
        ...storedProducts,
        updatedProduct,
      ];
    }

    try {
      localStorage.setItem(
        "fitfusion-seller-products",
        JSON.stringify(updatedProducts)
      );

      setShowSuccess(true);
    } catch {
      setFileError(
        "The images could not be saved because they are too large. Try using smaller files."
      );
    }
  }

  function handleClose() {
    navigate("/seller/listings");
  }

  function handleSuccessClose() {
    setShowSuccess(false);
    navigate("/seller/validation");
  }

  return (
    <main className="edit-seller-listing-page">
      <section className="edit-listing-panel">
        <header className="edit-listing-header">
          <div>
            <p>EDIT LISTING</p>
            <h1>{formData.name}</h1>
          </div>

          <button
            type="button"
            className="edit-listing-close"
            onClick={handleClose}
            aria-label="Close edit listing"
          >
            ×
          </button>
        </header>

        {selectedProduct.status ===
          "Rejected" && (
          <section className="listing-rejection-box">
            <strong>
              Reason for rejection
            </strong>

            <p>
              {
                selectedProduct.rejectionReason
              }
            </p>

            <span>
              Correct the listed information
              and re-upload the affected image
              before submitting it for
              validation again.
            </span>
          </section>
        )}

        <form
          className="edit-listing-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <label className="edit-listing-field edit-listing-full">
            <span>Product Name</span>

            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter product name"
            />

            {errors.name && (
              <small className="edit-field-error">
                {errors.name}
              </small>
            )}
          </label>

          <label className="edit-listing-field edit-listing-full">
            <span>Description</span>

            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe the product"
              rows="4"
            />

            {errors.description && (
              <small className="edit-field-error">
                {errors.description}
              </small>
            )}
          </label>

          <div className="edit-listing-row">
            <label className="edit-listing-field">
              <span>Category</span>

              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
              >
                <option value="">
                  Select category
                </option>

                {categories.map(
                  (category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>
                  )
                )}
              </select>

              {errors.category && (
                <small className="edit-field-error">
                  {errors.category}
                </small>
              )}
            </label>

            <label className="edit-listing-field">
              <span>Size</span>

              <select
                name="size"
                value={formData.size}
                onChange={handleInputChange}
              >
                <option value="">
                  Select size
                </option>

                {sizes.map((size) => (
                  <option
                    key={size}
                    value={size}
                  >
                    {size}
                  </option>
                ))}
              </select>

              {errors.size && (
                <small className="edit-field-error">
                  {errors.size}
                </small>
              )}
            </label>
          </div>

          <div className="edit-listing-row">
            <label className="edit-listing-field">
              <span>Color</span>

              <input
                type="text"
                name="color"
                value={formData.color}
                onChange={handleInputChange}
                placeholder="Enter color"
              />

              {errors.color && (
                <small className="edit-field-error">
                  {errors.color}
                </small>
              )}
            </label>

            <label className="edit-listing-field">
              <span>Price</span>

              <div className="edit-price-input">
                <span>₱</span>

                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  min="1"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>

              {errors.price && (
                <small className="edit-field-error">
                  {errors.price}
                </small>
              )}
            </label>
          </div>

          <section className="listing-image-section">
            <div className="listing-image-heading">
              <div>
                <h2>Product Images</h2>

                <p>
                  Upload or re-upload the
                  Front, Side, and Rear views
                  of the garment.
                </p>
              </div>

              <span>
                JPG, PNG or WEBP · Maximum
                1 MB each
              </span>
            </div>

            {fileError && (
              <div className="listing-file-error">
                {fileError}
              </div>
            )}

            <div className="listing-image-grid">
              <ProductImageUpload
                view="front"
                label="Front View"
                image={images.front}
                fileName={
                  imageNames.front
                }
                replaced={
                  replacementImages.front
                }
                onChange={(event) =>
                  handleImageChange(
                    "front",
                    event
                  )
                }
                onRemove={() =>
                  removeReplacement("front")
                }
              />

              <ProductImageUpload
                view="side"
                label="Side View"
                image={images.side}
                fileName={
                  imageNames.side
                }
                replaced={
                  replacementImages.side
                }
                onChange={(event) =>
                  handleImageChange(
                    "side",
                    event
                  )
                }
                onRemove={() =>
                  removeReplacement("side")
                }
              />

              <ProductImageUpload
                view="rear"
                label="Rear View"
                image={images.rear}
                fileName={
                  imageNames.rear
                }
                replaced={
                  replacementImages.rear
                }
                error={errors.rearImage}
                onChange={(event) => {
                  handleImageChange(
                    "rear",
                    event
                  );

                  setErrors(
                    (currentErrors) => ({
                      ...currentErrors,
                      rearImage: "",
                    })
                  );
                }}
                onRemove={() =>
                  removeReplacement("rear")
                }
              />
            </div>
          </section>

          <footer className="edit-listing-actions">
            <button
              type="button"
              className="edit-listing-cancel"
              onClick={handleClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="edit-listing-save"
            >
              Save and Re-submit
            </button>
          </footer>
        </form>
      </section>

      {showSuccess && (
        <div
          className="edit-success-overlay"
          role="presentation"
        >
          <section
            className="edit-success-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-success-title"
          >
            <div className="edit-success-icon">
              ✓
            </div>

            <p>LISTING UPDATED</p>

            <h2 id="edit-success-title">
              Changes saved successfully
            </h2>

            <span>
              The corrected listing and
              replacement images were saved
              and submitted for validation.
            </span>

            <button
              type="button"
              onClick={handleSuccessClose}
            >
              View Validation Report
            </button>
          </section>
        </div>
      )}
    </main>
  );
}

function ProductImageUpload({
  view,
  label,
  image,
  fileName,
  replaced,
  error,
  onChange,
  onRemove,
}) {
  const inputId = `${view}-image-upload`;

  return (
    <article
      className={`product-image-upload ${
        error ? "has-error" : ""
      }`}
    >
      <div className="product-image-preview">
        {image ? (
          <img
            src={image}
            alt={`${label} preview`}
          />
        ) : (
          <div className="product-image-placeholder">
            <span>◇</span>
            <p>{label}</p>
          </div>
        )}

        {replaced && (
          <span className="replacement-badge">
            New Image
          </span>
        )}
      </div>

      <div className="product-image-information">
        <strong>{label}</strong>

        <small>
          {fileName ||
            "No image selected"}
        </small>
      </div>

      <input
        id={inputId}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        onChange={onChange}
        hidden
      />

      <div className="product-image-buttons">
        <label
          htmlFor={inputId}
          className="product-upload-button"
        >
          {image
            ? "Re-upload Image"
            : "Upload Image"}
        </label>

        {replaced && (
          <button
            type="button"
            className="product-undo-button"
            onClick={onRemove}
          >
            Undo
          </button>
        )}
      </div>

      {error && (
        <small className="product-image-error">
          {error}
        </small>
      )}
    </article>
  );
}

export default EditSellerListingPage;