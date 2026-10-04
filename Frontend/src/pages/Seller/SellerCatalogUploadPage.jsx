import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/SellerCatalogUploadPage.css";

const MAX_PRODUCTS = 10;
const MAX_IMAGES_PER_VIEW = 10;

const requiredColumns = [
  "product_name",
  "description",
  "category",
  "price",
  "stock",
  "size",
  "front_image",
  "side_image",
  "rear_image",
];

function SellerCatalogUploadPage() {
  const navigate = useNavigate();

  const csvInputRef = useRef(null);
  const frontInputRef = useRef(null);
  const sideInputRef = useRef(null);
  const rearInputRef = useRef(null);

  const [csvFile, setCsvFile] = useState(null);
  const [productCount, setProductCount] = useState(0);

  const [images, setImages] = useState({
    front: [],
    side: [],
    rear: [],
  });

  const [errors, setErrors] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");

  const totalImageCount = useMemo(
    () =>
      images.front.length +
      images.side.length +
      images.rear.length,
    [images]
  );

  const storeName = useMemo(() => {
    const storedSeller =
      localStorage.getItem("fitfusion-current-user") ||
      sessionStorage.getItem("registeredAccount");

    if (!storedSeller) {
      return "Your FitFusion Store";
    }

    try {
      const seller = JSON.parse(storedSeller);

      return (
        seller.storeName ||
        seller.businessName ||
        seller.username ||
        "Your FitFusion Store"
      );
    } catch {
      return "Your FitFusion Store";
    }
  }, []);

  function downloadTemplate() {
    const header = requiredColumns.join(",");

    const exampleRow = [
      "Classic White Shirt",
      "Comfortable cotton shirt",
      "Tops",
      "799",
      "10",
      "Medium",
      "classic-white-shirt-front.png",
      "classic-white-shirt-side.png",
      "classic-white-shirt-rear.png",
    ].join(",");

    const csvContent = `${header}\n${exampleRow}`;
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = downloadUrl;
    link.download = "fitfusion-catalog-template.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(downloadUrl);
  }

  function handleCsvSelection(event) {
    const selectedFile = event.target.files?.[0];

    setErrors([]);
    setSuccessMessage("");

    if (!selectedFile) {
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setCsvFile(null);
      setProductCount(0);
      setErrors(["Please select a valid CSV file."]);
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = (loadEvent) => {
      const text = String(loadEvent.target?.result || "");
      const rows = text
        .split(/\r?\n/)
        .map((row) => row.trim())
        .filter(Boolean);

      if (rows.length === 0) {
        setCsvFile(null);
        setProductCount(0);
        setErrors(["The selected CSV file is empty."]);
        return;
      }

      const headers = rows[0]
        .split(",")
        .map((header) =>
          header.trim().toLowerCase()
        );

      const missingColumns = requiredColumns.filter(
        (column) => !headers.includes(column)
      );

      const numberOfProducts = Math.max(
        rows.length - 1,
        0
      );

      const csvErrors = [];

      if (missingColumns.length > 0) {
        csvErrors.push(
          `Missing required columns: ${missingColumns.join(
            ", "
          )}.`
        );
      }

      if (numberOfProducts === 0) {
        csvErrors.push(
          "The CSV file must contain at least one product."
        );
      }

      if (numberOfProducts > MAX_PRODUCTS) {
        csvErrors.push(
          `Only ${MAX_PRODUCTS} products are allowed per upload batch. Your file contains ${numberOfProducts}.`
        );
      }

      if (csvErrors.length > 0) {
        setCsvFile(null);
        setProductCount(numberOfProducts);
        setErrors(csvErrors);
        return;
      }

      setCsvFile(selectedFile);
      setProductCount(numberOfProducts);
    };

    reader.onerror = () => {
      setCsvFile(null);
      setProductCount(0);
      setErrors([
        "The CSV file could not be read. Please try again.",
      ]);
    };

    reader.readAsText(selectedFile);
  }

  function handleImageSelection(view, event) {
    const selectedFiles = Array.from(
      event.target.files || []
    );

    setErrors([]);
    setSuccessMessage("");

    const validImages = selectedFiles.filter((file) =>
      file.type.startsWith("image/")
    );

    if (validImages.length !== selectedFiles.length) {
      setErrors([
        "Only PNG, JPG, JPEG, or other valid image files are allowed.",
      ]);
    }

    if (validImages.length > MAX_IMAGES_PER_VIEW) {
      setErrors([
        `Only ${MAX_IMAGES_PER_VIEW} ${view} images are allowed.`,
      ]);

      event.target.value = "";
      return;
    }

    setImages((currentImages) => ({
      ...currentImages,
      [view]: validImages,
    }));
  }

  function removeImage(view, fileName) {
    setImages((currentImages) => ({
      ...currentImages,
      [view]: currentImages[view].filter(
        (file) => file.name !== fileName
      ),
    }));

    setSuccessMessage("");
  }

  function validateUpload() {
    const validationErrors = [];

    if (!csvFile) {
      validationErrors.push(
        "Upload a valid completed CSV file."
      );
    }

    if (productCount < 1) {
      validationErrors.push(
        "The CSV file must contain at least one product."
      );
    }

    if (productCount > MAX_PRODUCTS) {
      validationErrors.push(
        `The upload cannot contain more than ${MAX_PRODUCTS} products.`
      );
    }

    if (images.front.length !== productCount) {
      validationErrors.push(
        `Upload exactly ${productCount} front-view image${
          productCount === 1 ? "" : "s"
        }.`
      );
    }

    if (images.side.length !== productCount) {
      validationErrors.push(
        `Upload exactly ${productCount} side-view image${
          productCount === 1 ? "" : "s"
        }.`
      );
    }

    if (images.rear.length !== productCount) {
      validationErrors.push(
        `Upload exactly ${productCount} rear-view image${
          productCount === 1 ? "" : "s"
        }.`
      );
    }

    if (totalImageCount > 30) {
      validationErrors.push(
        "A maximum of 30 images is allowed per upload batch."
      );
    }

    return validationErrors;
  }

  function handleValidateAndContinue() {
    setSuccessMessage("");

    const validationErrors = validateUpload();

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
      return;
    }

    const validationData = {
      storeName,
      csvFileName: csvFile.name,
      productCount,
      frontImages: images.front.map(
        (file) => file.name
      ),
      sideImages: images.side.map(
        (file) => file.name
      ),
      rearImages: images.rear.map(
        (file) => file.name
      ),
      totalImageCount,
      validatedAt: new Date().toISOString(),
      status: "Valid",
    };

    sessionStorage.setItem(
      "fitfusion-catalog-validation",
      JSON.stringify(validationData)
    );

    setErrors([]);
    setSuccessMessage(
      "Catalog files passed the initial validation."
    );

    setTimeout(() => {
      navigate("/seller/validation-report");
    }, 600);
  }

  return (
    <main className="seller-upload-page">
      <header className="seller-upload-header">
        <div>
          <h1>21 — SELLER CATALOG UPLOAD</h1>

          <p>
            CSV, Front/Side/Rear images, automatic
            validation, and automatic Store Name assignment
          </p>
        </div>

        <span className="seller-upload-role">
          SELLER
        </span>
      </header>

      <div className="seller-upload-content">
        <section className="seller-upload-introduction">
          <p className="seller-upload-eyebrow">
            SELLER CATALOG UPLOAD
          </p>

          <h2>CSV plus three-view image files</h2>

          <p>
            Upload a maximum of {MAX_PRODUCTS} products and
            30 images per batch. Each product requires one
            front, one side, and one rear image.
          </p>
        </section>

        {errors.length > 0 && (
          <section
            className="seller-upload-alert seller-upload-alert-error"
            role="alert"
          >
            <strong>
              Please correct the following:
            </strong>

            <ul>
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </section>
        )}

        {successMessage && (
          <section
            className="seller-upload-alert seller-upload-alert-success"
            role="status"
          >
            <strong>{successMessage}</strong>
          </section>
        )}

        <section className="seller-upload-section">
          <div className="seller-upload-section-heading">
            <div>
              <span>1 — CSV FILE</span>
              <h3>Upload the completed catalog template</h3>
            </div>

            <button
              type="button"
              className="seller-template-button"
              onClick={downloadTemplate}
            >
              Download Required Template
            </button>
          </div>

          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            className="seller-hidden-file-input"
            onChange={handleCsvSelection}
          />

          <button
            type="button"
            className={
              csvFile
                ? "seller-file-drop-zone file-selected"
                : "seller-file-drop-zone"
            }
            onClick={() =>
              csvInputRef.current?.click()
            }
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 16V4" />
              <path d="m7 9 5-5 5 5" />
              <path d="M5 14v5h14v-5" />
            </svg>

            {csvFile ? (
              <>
                <strong>{csvFile.name}</strong>

                <span>
                  {productCount} product row
                  {productCount === 1 ? "" : "s"} detected
                </span>
              </>
            ) : (
              <>
                <strong>
                  Drop completed CSV here
                </strong>

                <span>or choose file</span>
              </>
            )}
          </button>

          <div className="seller-upload-requirements">
            <span>✓ Store Name assigned automatically</span>
            <span>✓ Up to 10 product rows</span>
            <span>✓ Exact filenames must match images</span>
          </div>

          <div className="seller-assigned-store">
            <span>Assigned Store</span>
            <strong>{storeName}</strong>
          </div>
        </section>

        <section className="seller-upload-section">
          <div className="seller-upload-section-heading">
            <div>
              <span>2 — THREE-VIEW IMAGE UPLOAD</span>
              <h3>Upload the product images</h3>
            </div>

            <div className="seller-image-total">
              {totalImageCount}/30 images selected
            </div>
          </div>

          <div className="seller-image-upload-grid">
            <ImageUploadCard
              title="FRONT VIEW"
              view="front"
              files={images.front}
              inputRef={frontInputRef}
              onSelect={handleImageSelection}
              onRemove={removeImage}
            />

            <ImageUploadCard
              title="SIDE VIEW"
              view="side"
              files={images.side}
              inputRef={sideInputRef}
              onSelect={handleImageSelection}
              onRemove={removeImage}
            />

            <ImageUploadCard
              title="REAR VIEW"
              view="rear"
              files={images.rear}
              inputRef={rearInputRef}
              onSelect={handleImageSelection}
              onRemove={removeImage}
            />
          </div>
        </section>

        <section className="seller-upload-summary">
          <div>
            <span>CSV File</span>
            <strong>
              {csvFile ? csvFile.name : "Not selected"}
            </strong>
          </div>

          <div>
            <span>Products</span>
            <strong>
              {productCount}/{MAX_PRODUCTS}
            </strong>
          </div>

          <div>
            <span>Images</span>
            <strong>{totalImageCount}/30</strong>
          </div>

          <div>
            <span>Store</span>
            <strong>{storeName}</strong>
          </div>
        </section>

        <div className="seller-upload-actions">
          <button
            type="button"
            className="seller-upload-reset-button"
            onClick={() => {
              setCsvFile(null);
              setProductCount(0);

              setImages({
                front: [],
                side: [],
                rear: [],
              });

              setErrors([]);
              setSuccessMessage("");

              if (csvInputRef.current) {
                csvInputRef.current.value = "";
              }

              if (frontInputRef.current) {
                frontInputRef.current.value = "";
              }

              if (sideInputRef.current) {
                sideInputRef.current.value = "";
              }

              if (rearInputRef.current) {
                rearInputRef.current.value = "";
              }
            }}
          >
            Clear Upload
          </button>

          <button
            type="button"
            className="seller-upload-validate-button"
            onClick={handleValidateAndContinue}
          >
            Validate and Continue
          </button>
        </div>
      </div>
    </main>
  );
}

function ImageUploadCard({
  title,
  view,
  files,
  inputRef,
  onSelect,
  onRemove,
}) {
  return (
    <article className="seller-image-card">
      <div className="seller-image-card-header">
        <strong>{title}</strong>

        <span>
          {files.length}/{MAX_IMAGES_PER_VIEW}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="seller-hidden-file-input"
        onChange={(event) =>
          onSelect(view, event)
        }
      />

      <button
        type="button"
        className="seller-image-drop-zone"
        onClick={() => inputRef.current?.click()}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <rect
            x="3"
            y="4"
            width="18"
            height="16"
            rx="2"
          />

          <circle cx="9" cy="10" r="2" />

          <path d="m4 17 4-4 3 3 3-3 6 6" />
        </svg>

        <strong>Choose {view} images</strong>
        <span>PNG, JPG, JPEG, or WEBP</span>
      </button>

      {files.length > 0 && (
        <div className="seller-selected-files">
          {files.map((file) => (
            <div
              className="seller-selected-file"
              key={`${view}-${file.name}`}
            >
              <span title={file.name}>
                {file.name}
              </span>

              <button
                type="button"
                onClick={() =>
                  onRemove(view, file.name)
                }
                aria-label={`Remove ${file.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

export default SellerCatalogUploadPage;