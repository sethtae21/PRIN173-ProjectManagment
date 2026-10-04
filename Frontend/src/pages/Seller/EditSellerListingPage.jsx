import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import "../css/EditSellerListingPage.css";

const fallbackProduct = {
  id: "product-1",
  name: "Camel Linen Shirt",
  title: "Camel Linen Shirt",
  description: "Relaxed linen tailoring",
  category: "Tops",
  sizes: ["S", "M", "L", "XL"],
  price: 750,
  color: "Camel",
  colorFamily: "Warm Neutrals",
  styleTags: ["Classic", "Minimal"],
  occasionTags: ["Work", "Casual"],
  status: "Active",
  images: {
    front: "",
    side: "",
    rear: "",
  },
  imageNames: {
    front: "camel-shirt-front.png",
    side: "camel-shirt-side.png",
    rear: "camel-shirt-rear.png",
  },
};

function listToText(value) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return value || "";
}

function textToList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readStoredProducts() {
  try {
    const storedValue = localStorage.getItem(
      "fitfusion-seller-products"
    );

    if (!storedValue) {
      return [];
    }

    const parsedValue = JSON.parse(storedValue);

    if (Array.isArray(parsedValue)) {
      return parsedValue;
    }

    if (Array.isArray(parsedValue.products)) {
      return parsedValue.products;
    }

    return [];
  } catch {
    return [];
  }
}

function normalizeProduct(product, productId) {
  return {
    ...fallbackProduct,
    ...product,
    id: product?.id || productId || fallbackProduct.id,
    name:
      product?.name ||
      product?.title ||
      fallbackProduct.name,
    title:
      product?.title ||
      product?.name ||
      fallbackProduct.title,
    sizes:
      product?.sizes ||
      product?.size ||
      fallbackProduct.sizes,
    styleTags:
      product?.styleTags ||
      product?.style_tags ||
      fallbackProduct.styleTags,
    occasionTags:
      product?.occasionTags ||
      product?.occasion_tags ||
      fallbackProduct.occasionTags,
    colorFamily:
      product?.colorFamily ||
      product?.color_family ||
      fallbackProduct.colorFamily,
    images: {
      ...fallbackProduct.images,
      ...(product?.images || {}),
      front:
        product?.images?.front ||
        product?.frontImage ||
        product?.front_image ||
        "",
      side:
        product?.images?.side ||
        product?.sideImage ||
        product?.side_image ||
        "",
      rear:
        product?.images?.rear ||
        product?.rearImage ||
        product?.rear_image ||
        "",
    },
    imageNames: {
      ...fallbackProduct.imageNames,
      ...(product?.imageNames || {}),
    },
  };
}

function EditSellerListingPage() {
  const navigate = useNavigate();
  const { productId } = useParams();

  const [originalProduct, setOriginalProduct] =
    useState(null);

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    description: "",
    sizes: "",
    price: "",
    color: "",
    colorFamily: "",
    styleTags: "",
    occasionTags: "",
  });

  const [replacementImages, setReplacementImages] =
    useState({
      front: null,
      side: null,
      rear: null,
    });

  const [fieldErrors, setFieldErrors] = useState({});
  const [pageError, setPageError] = useState("");
  const [showSuccessModal, setShowSuccessModal] =
    useState(false);

  useEffect(() => {
    const products = readStoredProducts();

    const matchingProduct = products.find(
      (product) =>
        String(product.id) === String(productId)
    );

    const selectedProduct = normalizeProduct(
      matchingProduct || fallbackProduct,
      productId
    );

    setOriginalProduct(selectedProduct);

    setFormData({
      name: selectedProduct.name,
      category: selectedProduct.category || "",
      description: selectedProduct.description || "",
      sizes: listToText(selectedProduct.sizes),
      price: String(selectedProduct.price || ""),
      color: selectedProduct.color || "",
      colorFamily: selectedProduct.colorFamily || "",
      styleTags: listToText(
        selectedProduct.styleTags
      ),
      occasionTags: listToText(
        selectedProduct.occasionTags
      ),
    });
  }, [productId]);

  const hasReplacementImage = useMemo(
    () =>
      Object.values(replacementImages).some(
        Boolean
      ),
    [replacementImages]
  );

  function handleInputChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));

    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [name]: "",
    }));

    setPageError("");
  }

  function handleImageChange(view, event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const acceptedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
    ];

    if (!acceptedTypes.includes(file.type)) {
      setPageError(
        "Only PNG, JPG, JPEG, and WEBP images are allowed."
      );

      event.target.value = "";
      return;
    }

    const maximumSize = 5 * 1024 * 1024;

    if (file.size > maximumSize) {
      setPageError(
        "Each replacement image must not exceed 5 MB."
      );

      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setReplacementImages((currentImages) => ({
        ...currentImages,
        [view]: {
          name: file.name,
          source: reader.result,
        },
      }));

      setPageError("");
    };

    reader.readAsDataURL(file);
  }

  function removeReplacement(view) {
    setReplacementImages((currentImages) => ({
      ...currentImages,
      [view]: null,
    }));
  }

  function validateForm() {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = "Item name is required.";
    }

    if (!formData.category.trim()) {
      errors.category = "Category is required.";
    }

    if (!formData.description.trim()) {
      errors.description =
        "Product description is required.";
    }

    if (!formData.sizes.trim()) {
      errors.sizes =
        "Enter at least one available size.";
    }

    if (
      !formData.price ||
      Number(formData.price) <= 0
    ) {
      errors.price =
        "Enter a valid price greater than zero.";
    }

    if (!formData.color.trim()) {
      errors.color = "Product color is required.";
    }

    if (!formData.colorFamily.trim()) {
      errors.colorFamily =
        "Color family is required.";
    }

    if (!formData.styleTags.trim()) {
      errors.styleTags =
        "Enter at least one style tag.";
    }

    if (!formData.occasionTags.trim()) {
      errors.occasionTags =
        "Enter at least one occasion tag.";
    }

    setFieldErrors(errors);

    return Object.keys(errors).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!validateForm()) {
      setPageError(
        "Please correct the highlighted fields before saving."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    const storedProducts = readStoredProducts();

    const updatedImages = {
      ...originalProduct.images,
    };

    const updatedImageNames = {
      ...originalProduct.imageNames,
    };

    Object.entries(replacementImages).forEach(
      ([view, replacement]) => {
        if (replacement) {
          updatedImages[view] = replacement.source;
          updatedImageNames[view] = replacement.name;
        }
      }
    );

    const updatedProduct = {
      ...originalProduct,
      id: productId,
      name: formData.name.trim(),
      title: formData.name.trim(),
      category: formData.category.trim(),
      description: formData.description.trim(),
      sizes: textToList(formData.sizes),
      size: formData.sizes.trim(),
      price: Number(formData.price),
      color: formData.color.trim(),
      colorFamily: formData.colorFamily.trim(),
      color_family:
        formData.colorFamily.trim(),
      styleTags: textToList(
        formData.styleTags
      ),
      style_tags: textToList(
        formData.styleTags
      ),
      occasionTags: textToList(
        formData.occasionTags
      ),
      occasion_tags: textToList(
        formData.occasionTags
      ),
      images: updatedImages,
      imageNames: updatedImageNames,

      /*
       * An edited product returns to Pending because
       * metadata and replacement images must be
       * validated again.
       */
      status: "Pending",
      updatedAt: new Date().toISOString(),
      hasReplacementImage,
    };

    const existingIndex = storedProducts.findIndex(
      (product) =>
        String(product.id) === String(productId)
    );

    let updatedProducts;

    if (existingIndex >= 0) {
      updatedProducts = [...storedProducts];
      updatedProducts[existingIndex] =
        updatedProduct;
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

      sessionStorage.setItem(
        "fitfusion-latest-validation",
        JSON.stringify({
          productId,
          productName: updatedProduct.name,
          status: "Pending",
          message:
            "The updated listing was submitted for validation.",
          submittedAt: new Date().toISOString(),
        })
      );

      setOriginalProduct(updatedProduct);
      setShowSuccessModal(true);
      setPageError("");
    } catch {
      setPageError(
        "The listing could not be saved. Replacement images may be too large for browser storage."
      );
    }
  }

  function handleCancel() {
    navigate(`/seller/products/${productId}`);
  }

  function handleViewListing() {
    setShowSuccessModal(false);
    navigate(`/seller/products/${productId}`);
  }

  if (!originalProduct) {
    return (
      <main className="edit-seller-loading">
        Loading seller listing...
      </main>
    );
  }

  return (
    <main className="edit-seller-page">
      <header className="edit-seller-header">
        <div>
          <h1>22B — EDIT SELLER LISTING</h1>

          <p>
            Update metadata and replace processed
            images
          </p>
        </div>

        <span className="edit-seller-role">
          SELLER
        </span>
      </header>

      <div className="edit-seller-body">
        <section className="edit-seller-introduction">
          <p>EDIT SELLER LISTING</p>

          <h2>{originalProduct.name}</h2>

          <span>
            Update metadata, tags, categories, or
            replace any processed view image.
          </span>
        </section>

        {pageError && (
          <div
            className="edit-seller-page-error"
            role="alert"
          >
            {pageError}
          </div>
        )}

        <form
          className="edit-seller-grid"
          onSubmit={handleSubmit}
          noValidate
        >
          <section className="edit-seller-form-card">
            <div className="edit-seller-form-grid">
              <FormField
                label="Item Name"
                name="name"
                value={formData.name}
                error={fieldErrors.name}
                onChange={handleInputChange}
              />

              <FormField
                label="Category"
                name="category"
                value={formData.category}
                error={fieldErrors.category}
                onChange={handleInputChange}
              />

              <FormField
                label="Description"
                name="description"
                value={formData.description}
                error={fieldErrors.description}
                onChange={handleInputChange}
                fullWidth
              />

              <FormField
                label="Size"
                name="sizes"
                value={formData.sizes}
                error={fieldErrors.sizes}
                onChange={handleInputChange}
                placeholder="S, M, L, XL"
              />

              <FormField
                label="Price"
                name="price"
                value={formData.price}
                error={fieldErrors.price}
                onChange={handleInputChange}
                type="number"
                min="1"
                step="0.01"
              />

              <FormField
                label="Color"
                name="color"
                value={formData.color}
                error={fieldErrors.color}
                onChange={handleInputChange}
              />

              <FormField
                label="Color Family"
                name="colorFamily"
                value={formData.colorFamily}
                error={fieldErrors.colorFamily}
                onChange={handleInputChange}
              />

              <FormField
                label="Style Tags"
                name="styleTags"
                value={formData.styleTags}
                error={fieldErrors.styleTags}
                onChange={handleInputChange}
                placeholder="Classic, Minimal"
              />

              <FormField
                label="Occasion Tags"
                name="occasionTags"
                value={formData.occasionTags}
                error={fieldErrors.occasionTags}
                onChange={handleInputChange}
                placeholder="Work, Casual"
              />
            </div>

            <div className="edit-seller-actions">
              <button
                type="submit"
                className="edit-seller-save-button"
              >
                Save Changes
              </button>

              <button
                type="button"
                className="edit-seller-cancel-button"
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          </section>

          <section className="edit-seller-images-card">
            <h3>REPLACE VIEW IMAGES</h3>

            <ImageReplacement
              view="front"
              label="Front View"
              currentSource={
                originalProduct.images.front
              }
              currentName={
                originalProduct.imageNames.front
              }
              replacement={
                replacementImages.front
              }
              onChange={handleImageChange}
              onRemove={removeReplacement}
            />

            <ImageReplacement
              view="side"
              label="Side View"
              currentSource={
                originalProduct.images.side
              }
              currentName={
                originalProduct.imageNames.side
              }
              replacement={
                replacementImages.side
              }
              onChange={handleImageChange}
              onRemove={removeReplacement}
            />

            <ImageReplacement
              view="rear"
              label="Rear View"
              currentSource={
                originalProduct.images.rear
              }
              currentName={
                originalProduct.imageNames.rear
              }
              replacement={
                replacementImages.rear
              }
              onChange={handleImageChange}
              onRemove={removeReplacement}
            />

            <p className="edit-seller-image-note">
              Replacement images run through
              background removal and validation again.
            </p>
          </section>
        </form>
      </div>

      {showSuccessModal && (
        <div
          className="edit-seller-modal-backdrop"
          role="presentation"
        >
          <section
            className="edit-seller-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="listing-update-title"
          >
            <div className="edit-seller-success-icon">
              ✓
            </div>

            <h2 id="listing-update-title">
              Listing Updated
            </h2>

            <p>
              Your changes were saved. The listing
              is now pending validation before it
              becomes visible to shoppers.
            </p>

            <div className="edit-seller-modal-actions">
              <button
                type="button"
                className="edit-seller-save-button"
                onClick={handleViewListing}
              >
                View Listing
              </button>

              <button
                type="button"
                className="edit-seller-cancel-button"
                onClick={() =>
                  navigate(
                    "/seller/validation-report"
                  )
                }
              >
                View Validation
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function FormField({
  label,
  error,
  fullWidth = false,
  ...inputProperties
}) {
  return (
    <label
      className={
        fullWidth
          ? "edit-seller-field edit-seller-field-full"
          : "edit-seller-field"
      }
    >
      <span>{label}</span>

      <input
        {...inputProperties}
        className={error ? "input-error" : ""}
      />

      {error && (
        <small role="alert">{error}</small>
      )}
    </label>
  );
}

function ImageReplacement({
  view,
  label,
  currentSource,
  currentName,
  replacement,
  onChange,
  onRemove,
}) {
  const displayedSource =
    replacement?.source || currentSource;

  const displayedName =
    replacement?.name ||
    currentName ||
    `${label} image`;

  return (
    <article className="edit-seller-image-row">
      <div className="edit-seller-thumbnail">
        {displayedSource ? (
          <img
            src={displayedSource}
            alt={`${label} preview`}
          />
        ) : (
          <span>{label.charAt(0)}</span>
        )}
      </div>

      <div className="edit-seller-image-information">
        <strong>{label}</strong>
        <span title={displayedName}>
          {displayedName}
        </span>

        {replacement && (
          <small>New replacement selected</small>
        )}
      </div>

      <div className="edit-seller-image-actions">
        <label className="edit-seller-replace-button">
          Replace

          <input
            type="file"
            accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
            onChange={(event) =>
              onChange(view, event)
            }
          />
        </label>

        {replacement && (
          <button
            type="button"
            onClick={() => onRemove(view)}
          >
            Undo
          </button>
        )}
      </div>
    </article>
  );
}

export default EditSellerListingPage;