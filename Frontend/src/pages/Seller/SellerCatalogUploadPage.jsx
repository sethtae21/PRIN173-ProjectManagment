import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/SellerCatalogUploadPage.css";

const initialImages = {
  front: null,
  side: null,
  rear: null,
};

function getSellerStoreName() {
  const storageKeys = [
    "fitfusion-current-user",
    "registeredAccount",
    "sellerAccount",
  ];

  for (const key of storageKeys) {
    const savedValue =
      localStorage.getItem(key) ||
      sessionStorage.getItem(key);

    if (!savedValue) continue;

    try {
      const account = JSON.parse(savedValue);

      const storeName =
        account.storeName ||
        account.store_name ||
        account.businessName;

      if (storeName) return storeName;
    } catch {
      // Continue checking the next saved account.
    }
  }

  return "Maison Aurelia";
}

function SellerCatalogUploadPage() {
  const navigate = useNavigate();

  const [storeName] = useState(getSellerStoreName);
  const [csvFile, setCsvFile] = useState(null);
  const [images, setImages] = useState(initialImages);
  const [errors, setErrors] = useState({});
  const [isProcessing, setIsProcessing] =
    useState(false);
  const [validationResult, setValidationResult] =
    useState(null);

  useEffect(() => {
    return () => {
      Object.values(images).forEach((image) => {
        if (image?.preview) {
          URL.revokeObjectURL(image.preview);
        }
      });
    };
  }, [images]);

  function handleCsvChange(event) {
    const file = event.target.files?.[0];

    setValidationResult(null);

    if (!file) {
      setCsvFile(null);
      return;
    }

    const extension = file.name
      .split(".")
      .pop()
      ?.toLowerCase();

    if (extension !== "csv") {
      setCsvFile(null);
      setErrors((current) => ({
        ...current,
        csv: "Please upload a valid CSV file.",
      }));
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setCsvFile(null);
      setErrors((current) => ({
        ...current,
        csv: "The CSV file must not exceed 5 MB.",
      }));
      event.target.value = "";
      return;
    }

    setCsvFile(file);

    setErrors((current) => ({
      ...current,
      csv: "",
    }));
  }

  function handleImageChange(view, event) {
    const file = event.target.files?.[0];

    setValidationResult(null);

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setErrors((current) => ({
        ...current,
        [view]:
          "Please upload a JPG, PNG, or WEBP image.",
      }));

      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrors((current) => ({
        ...current,
        [view]:
          "The image must not exceed 10 MB.",
      }));

      event.target.value = "";
      return;
    }

    setImages((current) => {
      if (current[view]?.preview) {
        URL.revokeObjectURL(
          current[view].preview
        );
      }

      return {
        ...current,
        [view]: {
          file,
          preview: URL.createObjectURL(file),
        },
      };
    });

    setErrors((current) => ({
      ...current,
      [view]: "",
    }));
  }

  function removeImage(view) {
    setImages((current) => {
      if (current[view]?.preview) {
        URL.revokeObjectURL(
          current[view].preview
        );
      }

      return {
        ...current,
        [view]: null,
      };
    });

    setValidationResult(null);
  }

  function countCsvProducts(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const text = String(reader.result || "");

        const rows = text
          .split(/\r?\n/)
          .filter((row) => row.trim() !== "");

        // The first row is treated as the heading.
        resolve(Math.max(rows.length - 1, 0));
      };

      reader.onerror = () => {
        reject(
          new Error("The CSV file could not be read.")
        );
      };

      reader.readAsText(file);
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};

    if (!csvFile) {
      nextErrors.csv =
        "Please upload your catalog CSV file.";
    }

    if (!images.front) {
      nextErrors.front =
        "A front-view image is required.";
    }

    if (!images.side) {
      nextErrors.side =
        "A side-view image is required.";
    }

    if (!images.rear) {
      nextErrors.rear =
        "A rear-view image is required.";
    }

    setErrors(nextErrors);
    setValidationResult(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsProcessing(true);

    try {
      const productCount =
        await countCsvProducts(csvFile);

      if (productCount === 0) {
        setErrors({
          csv: "The CSV file does not contain any product records.",
        });

        setIsProcessing(false);
        return;
      }

      if (productCount > 50) {
        setErrors({
          csv: `The CSV contains ${productCount} products. Only 50 products can be uploaded at one time.`,
        });

        setIsProcessing(false);
        return;
      }

      const uploadRecord = {
        id: `UPLOAD-${Date.now()}`,
        storeName,
        csvName: csvFile.name,
        productCount,
        imageNames: {
          front: images.front.file.name,
          side: images.side.file.name,
          rear: images.rear.file.name,
        },
        status: "Validated",
        uploadedAt: new Date().toISOString(),
      };

      const previousUploads = JSON.parse(
        localStorage.getItem(
          "fitfusion-seller-uploads"
        ) || "[]"
      );

      localStorage.setItem(
        "fitfusion-seller-uploads",
        JSON.stringify([
          uploadRecord,
          ...previousUploads,
        ])
      );

      setValidationResult({
        type: "success",
        title: "Catalog validated successfully",
        message: `${productCount} product${
          productCount === 1 ? "" : "s"
        } assigned to ${storeName}.`,
      });
    } catch {
      setValidationResult({
        type: "error",
        title: "Validation failed",
        message:
          "The CSV file could not be processed. Please check the file and try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  function handleReset() {
    Object.values(images).forEach((image) => {
      if (image?.preview) {
        URL.revokeObjectURL(image.preview);
      }
    });

    setCsvFile(null);
    setImages(initialImages);
    setErrors({});
    setValidationResult(null);

    const csvInput =
      document.getElementById("catalog-csv");

    if (csvInput) {
      csvInput.value = "";
    }
  }

  return (
    <main className="seller-upload-page">
      <form
        className="seller-upload-form"
        onSubmit={handleSubmit}
        noValidate
      >
        <section className="seller-upload-introduction">
          <p className="seller-upload-eyebrow">
            UPLOAD CATALOG
          </p>

          <h1>Add products to your store</h1>

          <p>
            Upload your CSV product list and provide
            the required Front, Side, and Rear product
            images.
          </p>
        </section>

        <section className="seller-upload-store">
          <div>
            <span>ASSIGNED STORE NAME</span>
            <strong>{storeName}</strong>
          </div>

          <p>
            Products from this upload will
            automatically be assigned to your
            authenticated seller store.
          </p>
        </section>

        <div className="seller-upload-grid">
          <section className="seller-upload-card">
            <div className="seller-upload-card-heading">
              <div>
                <p>STEP 1</p>
                <h2>Catalog CSV file</h2>
              </div>

              <span className="seller-upload-required">
                Required
              </span>
            </div>

            <div className="seller-upload-guidelines">
              <p>
                Use the required CSV template and
                upload up to 50 products.
              </p>

              <ul>
                <li>Accepted format: CSV</li>
                <li>Maximum file size: 5 MB</li>
                <li>Maximum records: 50 products</li>
              </ul>
            </div>

            <a
              className="seller-template-button"
              href="/templates/fitfusion-catalog-template.csv"
              download
            >
              Download CSV Template
            </a>

            <label
              className={
                errors.csv
                  ? "seller-file-dropzone error"
                  : "seller-file-dropzone"
              }
              htmlFor="catalog-csv"
            >
              <span className="seller-upload-icon">
                ↑
              </span>

              <strong>
                {csvFile
                  ? csvFile.name
                  : "Select your CSV file"}
              </strong>

              <small>
                Click here to browse your files
              </small>

              <input
                id="catalog-csv"
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvChange}
              />
            </label>

            {errors.csv && (
              <p className="seller-upload-error">
                {errors.csv}
              </p>
            )}

            {csvFile && (
              <div className="seller-selected-file">
                <div>
                  <strong>{csvFile.name}</strong>

                  <span>
                    {(csvFile.size / 1024).toFixed(1)}
                    {" KB"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCsvFile(null);
                    setValidationResult(null);

                    const input =
                      document.getElementById(
                        "catalog-csv"
                      );

                    if (input) input.value = "";
                  }}
                >
                  Remove
                </button>
              </div>
            )}
          </section>

          <section className="seller-upload-card">
            <div className="seller-upload-card-heading">
              <div>
                <p>STEP 2</p>
                <h2>Three-view product images</h2>
              </div>

              <span className="seller-upload-required">
                Required
              </span>
            </div>

            <p className="seller-upload-image-note">
              Upload a clear Front, Side, and Rear
              image. Each image must show the same
              product.
            </p>

            <div className="seller-image-grid">
              <ImageUploader
                view="front"
                title="Front View"
                image={images.front}
                error={errors.front}
                onChange={handleImageChange}
                onRemove={removeImage}
              />

              <ImageUploader
                view="side"
                title="Side View"
                image={images.side}
                error={errors.side}
                onChange={handleImageChange}
                onRemove={removeImage}
              />

              <ImageUploader
                view="rear"
                title="Rear View"
                image={images.rear}
                error={errors.rear}
                onChange={handleImageChange}
                onRemove={removeImage}
              />
            </div>
          </section>
        </div>

        {validationResult && (
          <section
            className={`seller-validation-result ${validationResult.type}`}
            role="status"
          >
            <div>
              <strong>
                {validationResult.title}
              </strong>

              <p>{validationResult.message}</p>
            </div>

            {validationResult.type ===
              "success" && (
              <button
                type="button"
                onClick={() =>
                  navigate("/seller/validation")
                }
              >
                View Validation
              </button>
            )}
          </section>
        )}

        <div className="seller-upload-actions">
          <button
            type="button"
            className="seller-upload-reset"
            onClick={handleReset}
            disabled={isProcessing}
          >
            Clear Upload
          </button>

          <button
            type="submit"
            className="seller-upload-submit"
            disabled={isProcessing}
          >
            {isProcessing
              ? "Processing…"
              : "Process and Validate"}
          </button>
        </div>
      </form>
    </main>
  );
}

function ImageUploader({
  view,
  title,
  image,
  error,
  onChange,
  onRemove,
}) {
  const inputId = `${view}-product-image`;

  return (
    <article className="seller-image-uploader">
      <div className="seller-image-title">
        <strong>{title}</strong>
        <span>JPG, PNG or WEBP</span>
      </div>

      {image ? (
        <div className="seller-image-preview">
          <img
            src={image.preview}
            alt={`${title} product preview`}
          />

          <div className="seller-image-overlay">
            <label htmlFor={inputId}>
              Replace
            </label>

            <button
              type="button"
              onClick={() => onRemove(view)}
            >
              Remove
            </button>
          </div>

          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) =>
              onChange(view, event)
            }
          />
        </div>
      ) : (
        <label
          className={
            error
              ? "seller-image-dropzone error"
              : "seller-image-dropzone"
          }
          htmlFor={inputId}
        >
          <span>+</span>
          <strong>Upload {title}</strong>
          <small>Maximum size: 10 MB</small>

          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) =>
              onChange(view, event)
            }
          />
        </label>
      )}

      {error && (
        <p className="seller-upload-error">
          {error}
        </p>
      )}
    </article>
  );
}

export default SellerCatalogUploadPage;