import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { catalogAPI } from "../../services/api";
import "../css/SellerCatalogUploadPage.css";

const requiredColumns = [
  "name",
  "description",
  "category",
  "size",
  "color",
  "color_description",
  "color_family",
  "price",
  "style_tags",
  "occasion_tags",
  "front_image_filename",
  "side_image_filename",
  "rear_image_filename",
];

const initialImages = {
  front: [],
  side: [],
  rear: [],
};

const MAX_PRODUCTS = 10;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const TAG_OPTIONS = {
  style_tags: [
    "casual",
    "minimalist",
    "resort",
    "classic",
    "work",
    "streetwear",
    "elegant",
    "romantic",
    "formal",
    "sporty",
  ],
  occasion_tags: [
    "everyday",
    "summer",
    "office",
    "weekend",
    "evening",
    "formal",
    "winter",
    "vacation",
    "outdoor",
  ],
};

// KAN-FIX: Extended polling to handle long batches (~150s for 3 items)
const POLL_INTERVAL_MS = 2500;
const MAX_POLL_ATTEMPTS = 240; // 240 * 2.5s = 10 minutes

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

/* ==========================================
   QUOTE-AWARE CSV PARSER
========================================== */
function parseCsvRows(text) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(current);
      current = "";
    } else if (char === "\n") {
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
    } else if (char !== "\r") {
      current += char;
    }
  }

  if (current !== "" || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function cleanCell(value) {
  return String(value || "").replace(/^\uFEFF/, "").trim();
}

function fileStem(fileName) {
  return fileName.split(".").slice(0, -1).join(".").toLowerCase();
}

function getInvalidCsvTags(productRows) {
  const errors = [];

  productRows.forEach((row, index) => {
    Object.entries(TAG_OPTIONS).forEach(([field, options]) => {
      const allowedTags = new Set(options.map((tag) => tag.toLowerCase()));
      const invalidTags = String(row[field] || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag && !allowedTags.has(tag.toLowerCase()));

      if (invalidTags.length > 0) {
        errors.push(
          `Product ${index + 1} (${row.name}): invalid ${field} value(s) "${invalidTags.join(", ")}". Choose from: ${options.join(", ")}.`
        );
      }
    });
  });

  return errors;
}

/* ==========================================
   CSV ANALYZER (FIXED FOR item_name / name)
========================================== */
function analyzeCsvText(text) {
  const rows = parseCsvRows(text);

  const headerIndex = rows.findIndex((row) => {
    const first = cleanCell(row[0]).toLowerCase();
    return first === "name" || first === "item_name";
  });

  if (headerIndex < 0) {
    throw new Error(
      "The CSV file is missing its required header row (expected 'name' or 'item_name' as the first column)."
    );
  }

  const header = rows[headerIndex].map((cell) =>
    cleanCell(cell).toLowerCase()
  );

  const normalizedHeader = header.map((h) =>
    h === "item_name" ? "name" : h
  );

  const missingColumns = requiredColumns.filter(
    (column) => !normalizedHeader.includes(column)
  );

  if (missingColumns.length > 0) {
    throw new Error(
      `The CSV header is missing required columns: ${missingColumns.join(", ")}.`
    );
  }

  const productRows = rows
    .slice(headerIndex + 1)
    .map((row) => {
      const record = {};
      normalizedHeader.forEach((column, index) => {
        record[column] = cleanCell(row[index]);
      });
      return record;
    })
    .filter((record) => record.name !== "");

  return { productRows, missingColumns, header: normalizedHeader };
}

// KAN-FIX: Helper to detect hex color in rejection reason
function extractHexFromReason(reason) {
  const match = String(reason || "").match(/#[0-9a-fA-F]{6}/);
  return match ? match[0] : null;
}

// KAN-FIX: Convert hex to color family
function hexToColorFamily(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;

  if (max < 70) return "Black";
  if (min > 195) return "White";

  const delta = max - min;
  if (delta < 30) return "Neutral";

  let hue = 0;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;

  hue = (hue * 60 + 360) % 360;

  if (lightness < 120 && hue >= 15 && hue < 45) return "Brown";
  if (hue < 15 || hue >= 345) return "Red";
  if (hue < 45) return "Orange";
  if (hue < 70) return "Yellow";
  if (hue < 165) return "Green";
  if (hue < 255) return "Blue";
  if (hue < 285) return "Purple";
  return "Pink";
}

/* ==========================================
   PAGE COMPONENT
========================================== */
function SellerCatalogUploadPage() {
  const navigate = useNavigate();

  const [storeName] = useState(getSellerStoreName);
  const [csvFile, setCsvFile] = useState(null);
  const [csvData, setCsvData] = useState(null); // KAN-FIX: Store parsed CSV for correction
  const [images, setImages] = useState(initialImages);
  const [errors, setErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [corrections, setCorrections] = useState({}); // KAN-FIX: Store edits for rejected items

  const [isDownloadingTemplate, setIsDownloadingTemplate] =
    useState(false);
  const [templateError, setTemplateError] = useState("");

  const pollTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

  /* ---------- Template download (FR-4.1) ---------- */
  function handleDownloadTemplate() {
    setIsDownloadingTemplate(true);
    setTemplateError("");

    try {
      // FIX: catalogAPI.downloadTemplate() simply returns the URL string.
      // We must trigger the actual browser download using a temporary anchor tag.
      const downloadUrl = catalogAPI.downloadTemplate();
      
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "fitfusion_catalog_template.csv"; // Fallback filename
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Template download failed:", error);
      setTemplateError(
        "Could not download the template from the server. Make sure the backend is running and try again."
      );
    } finally {
      setIsDownloadingTemplate(false);
    }
  }

  /* ---------- CSV selection ---------- */
  function handleCsvChange(event) {
    const file = event.target.files?.[0];
    setValidationResult(null);

    if (!file) {
      setCsvFile(null);
      setCsvData(null);
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension !== "csv") {
      setCsvFile(null);
      setCsvData(null);
      setErrors((current) => ({
        ...current,
        csv: "Please upload a valid CSV file.",
      }));
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setCsvFile(null);
      setCsvData(null);
      setErrors((current) => ({
        ...current,
        csv: "The CSV file must not exceed 5 MB.",
      }));
      event.target.value = "";
      return;
    }

    setCsvFile(file);
    setErrors((current) => ({ ...current, csv: "" }));

    // KAN-FIX: Parse and store CSV data immediately
    file.text().then((text) => {
      try {
        const { productRows, header } = analyzeCsvText(text);
        setCsvData({ rows: productRows, header });
      } catch (err) {
        console.error("CSV parse error:", err);
      }
    });
  }

  /* ---------- Multi-file image drop zones (FR-4.2) ---------- */
  function handleImageAdd(view, event) {
    const addedFiles = Array.from(event.target.files || []);
    event.target.value = "";
    setValidationResult(null);

    if (addedFiles.length === 0) return;

    const allNames = [
      ...images.front,
      ...images.side,
      ...images.rear,
    ].map((item) => item.file.name.toLowerCase());

    const accepted = [];
    const problems = [];

    for (const file of addedFiles) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        problems.push(`${file.name}: only JPG, PNG, or WEBP allowed.`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        problems.push(`${file.name}: exceeds 5 MB.`);
        continue;
      }
      if (allNames.includes(file.name.toLowerCase())) {
        problems.push(
          `${file.name}: duplicate filename. Each view file must have a unique name.`
        );
        continue;
      }
      allNames.push(file.name.toLowerCase());
      accepted.push({ file });
    }

    if (accepted.length > 0) {
      setImages((current) => ({
        ...current,
        [view]: [...current[view], ...accepted],
      }));
    }

    setErrors((current) => ({
      ...current,
      [view]: problems.length > 0 ? problems.join(" ") : "",
    }));
  }

  function handleImageRemove(view, index) {
    setImages((current) => ({
      ...current,
      [view]: current[view].filter((_, i) => i !== index),
    }));
    setValidationResult(null);
  }

  /* ---------- Submit → backend /catalog/upload/ ---------- */
  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};

    if (!csvFile) nextErrors.csv = "Please upload your catalog CSV file.";
    if (images.front.length === 0) nextErrors.front = "At least one Front View image is required.";
    if (images.side.length === 0) nextErrors.side = "At least one Side View image is required.";
    if (images.rear.length === 0) nextErrors.rear = "At least one Rear View image is required.";

    setErrors(nextErrors);
    setValidationResult(null);

    if (Object.keys(nextErrors).length > 0) return;

    setIsProcessing(true);

    try {
      const csvText = await csvFile.text();
      const { productRows, header } = analyzeCsvText(csvText);

      if (productRows.length === 0) {
        setErrors({ csv: "The CSV file does not contain any product records." });
        setIsProcessing(false);
        return;
      }

      if (productRows.length > MAX_PRODUCTS) {
        setErrors({
          csv: `The CSV contains ${productRows.length} products. Only ${MAX_PRODUCTS} products can be uploaded at one time.`,
        });
        setIsProcessing(false);
        return;
      }

      const invalidTags = getInvalidCsvTags(productRows);
      if (invalidTags.length > 0) {
        setValidationResult({
          type: "error",
          title: "Invalid style or occasion tags",
          message:
            "Update the CSV to use only the approved tags below. Separate multiple tags with commas.",
          details: invalidTags,
        });
        setIsProcessing(false);
        return;
      }

      const uploaded = [
        ...images.front.map((i) => i.file.name),
        ...images.side.map((i) => i.file.name),
        ...images.rear.map((i) => i.file.name),
      ];
      const uploadedExact = new Set(uploaded.map((n) => n.toLowerCase()));
      const uploadedStems = new Set(uploaded.map((n) => fileStem(n)));

      const missingFiles = [];
      productRows.forEach((row, index) => {
        const rowLabel = `Row ${index + 2} (${row.name || "unnamed"})`;
        [
          ["front_image_filename", "Front"],
          ["side_image_filename", "Side"],
          ["rear_image_filename", "Rear"],
        ].forEach(([column, label]) => {
          const csvName = (row[column] || "").trim();
          if (!csvName) {
            missingFiles.push(`${rowLabel}: ${label} filename column is empty.`);
            return;
          }
          const ok =
            uploadedExact.has(csvName.toLowerCase()) ||
            uploadedStems.has(fileStem(csvName));
          if (!ok) {
            missingFiles.push(
              `${rowLabel}: ${label} file "${csvName}" was not uploaded.`
            );
          }
        });
      });

      if (missingFiles.length > 0) {
        setValidationResult({
          type: "error",
          title: "Filename mapping failed",
          message: missingFiles.slice(0, 6).join(" "),
          details: missingFiles.slice(0, 6),
        });
        setIsProcessing(false);
        return;
      }

      // KAN-FIX: Store CSV data for potential correction
      setCsvData({ rows: productRows, header });

      const formData = new FormData();
      formData.append("csv_file", csvFile);
      [...images.front, ...images.side, ...images.rear].forEach((item) => {
        formData.append("images", item.file);
      });

      setValidationResult({
        type: "processing",
        title: "Upload accepted — validating…",
        message:
          "The backend is removing backgrounds (rembg) and validating your items. This can take up to 60 seconds.",
      });

      const response = await catalogAPI.upload(formData);

      if (!response || !response.batch_id) {
        setValidationResult({
          type: "error",
          title: "Upload failed",
          message: response?.error || "The backend did not return a batch ID.",
        });
        setIsProcessing(false);
        return;
      }

      pollBatchReport(response.batch_id, 0);
    } catch (error) {
      console.error("Upload failed:", error);

      let message =
        "The catalog could not be uploaded. Please check your files and try again.";
      try {
        const errorData = JSON.parse(error.message);
        message = errorData.error || errorData.detail || message;
      } catch {
        if (error.message && error.message !== "null") message = error.message;
      }

      setValidationResult({
        type: "error",
        title: "Upload rejected",
        message,
      });
      setIsProcessing(false);
    }
  }

  /* ---------- Batch report polling (KAN-FIX: Extended timeout) ---------- */
  function pollBatchReport(batchId, attempts) {
    pollTimer.current = setTimeout(async () => {
      try {
        const report = await catalogAPI.batchReport(batchId);

        if (report.status === "completed" || report.status === "failed") {
          await finishWithReport(batchId, report);
          return;
        }

        // KAN-FIX: Increased max attempts from 30 to MAX_POLL_ATTEMPTS (10 minutes)
        if (attempts >= MAX_POLL_ATTEMPTS) {
          setValidationResult({
            type: "processing",
            title: "Still processing",
            message:
              "Validation is taking longer than expected. Check the Product Validation page in a moment.",
          });
          setIsProcessing(false);
          return;
        }

        pollBatchReport(batchId, attempts + 1);
      } catch (error) {
        if (attempts >= 5) {
          setValidationResult({
            type: "error",
            title: "Could not fetch validation report",
            message: "The upload was accepted, but the report could not be loaded.",
          });
          setIsProcessing(false);
          return;
        }
        pollBatchReport(batchId, attempts + 1);
      }
    }, POLL_INTERVAL_MS);
  }

  async function finishWithReport(batchId, report) {
    let details = [];
    const reportEntries = Object.entries(report.rejection_report || {});

    if (reportEntries.length > 0) {
      try {
        const listings = await catalogAPI.myListings();
        const nameById = {};
        (Array.isArray(listings) ? listings : []).forEach((item) => {
          nameById[String(item.id)] = item.name;
        });

        details = reportEntries.map(([itemId, reasons]) => ({
          id: itemId,
          name: nameById[itemId] || `Item ${itemId.slice(0, 8)}`,
          reasons: Array.isArray(reasons) ? reasons : [reasons],
        }));
      } catch {
        details = reportEntries.map(([itemId, reasons]) => ({
          id: itemId,
          name: `Item ${itemId.slice(0, 8)}`,
          reasons: Array.isArray(reasons) ? reasons : [reasons],
        }));
      }
    }

    try {
      const record = {
        id: batchId,
        batchId,
        storeName,
        csvName: csvFile?.name || "",
        productCount: report.total_items,
        accepted: report.accepted_count,
        rejected: report.rejected_count,
        status: report.status,
        uploadedAt: new Date().toISOString(),
      };
      const previous = JSON.parse(
        localStorage.getItem("fitfusion-seller-uploads") || "[]"
      );
      localStorage.setItem(
        "fitfusion-seller-uploads",
        JSON.stringify([record, ...previous])
      );
    } catch {
      // Non-critical
    }

    if (report.status === "failed") {
      setValidationResult({
        type: "error",
        title: "Batch processing failed",
        message:
          report.rejection_report?.error ||
          "The backend could not process this batch.",
        batchId,
      });
    } else if (report.rejected_count > 0) {
      setValidationResult({
        type: "success",
        title: `Processing complete — ${report.accepted_count} accepted, ${report.rejected_count} rejected`,
        message: `${report.total_items} item(s) processed for ${storeName}. Rejected items are listed below and on the Product Validation page.`,
        details,
        batchId,
      });
    } else {
      setValidationResult({
        type: "success",
        title: "Catalog validated successfully",
        message: `${report.accepted_count} product(s) published to ${storeName}.`,
        batchId,
      });
    }

    setIsProcessing(false);
  }

  /* ---------- KAN-FIX: Re-upload corrected rows ---------- */
  async function handleReuploadCorrected() {
    if (!csvData || !csvFile) return;

    const rejectedNames = new Set(
      (validationResult?.details || []).map((d) => d.name)
    );

    // Filter to only rejected rows
    const rejectedRows = csvData.rows.filter((row) =>
      rejectedNames.has(row.name)
    );

    if (rejectedRows.length === 0) return;

    // Apply corrections
    const correctedRows = rejectedRows.map((row) => ({
      ...row,
      ...(corrections[row.name] || {}),
    }));

    // Build corrected CSV
    const csvLines = [csvData.header.join(",")];
    correctedRows.forEach((row) => {
      const line = csvData.header
        .map((col) => {
          const value = String(row[col] || "");
          // Quote if contains comma, quote, or newline
          return /[,"\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(",");
      csvLines.push(line);
    });

    const csvBlob = new Blob([csvLines.join("\n")], { type: "text/csv" });
    const correctedFile = new File([csvBlob], "corrected_catalog.csv", {
      type: "text/csv",
    });

    // Collect only images for rejected rows
    const rejectedImages = [];
    correctedRows.forEach((row) => {
      ["front", "side", "rear"].forEach((view) => {
        const filename = row[`${view}_image_filename`];
        const imageItem = images[view].find(
          (img) =>
            img.file.name.toLowerCase() === filename.toLowerCase() ||
            fileStem(img.file.name) === fileStem(filename)
        );
        if (imageItem) rejectedImages.push(imageItem.file);
      });
    });

    // Build form data
    const formData = new FormData();
    formData.append("csv_file", correctedFile);
    rejectedImages.forEach((file) => formData.append("images", file));

    setIsProcessing(true);
    setValidationResult({
      type: "processing",
      title: "Re-uploading corrected items…",
      message: `Processing ${correctedRows.length} corrected product(s).`,
    });
    setCorrections({});

    try {
      const response = await catalogAPI.upload(formData);

      if (!response || !response.batch_id) {
        setValidationResult({
          type: "error",
          title: "Re-upload failed",
          message: response?.error || "The backend did not return a batch ID.",
        });
        setIsProcessing(false);
        return;
      }

      pollBatchReport(response.batch_id, 0);
    } catch (error) {
      console.error("Re-upload failed:", error);
      setValidationResult({
        type: "error",
        title: "Re-upload rejected",
        message: error?.message || "The corrected catalog could not be uploaded.",
      });
      setIsProcessing(false);
    }
  }

  /* ---------- KAN-FIX: Handle correction input change ---------- */
  function handleCorrectionChange(itemName, field, value) {
    setCorrections((prev) => ({
      ...prev,
      [itemName]: {
        ...(prev[itemName] || {}),
        [field]: value,
      },
    }));
  }

  /* ---------- KAN-FIX: Apply detected color from rejection reason ---------- */
  function applyDetectedColor(itemName, hex) {
    const family = hexToColorFamily(hex);
    setCorrections((prev) => ({
      ...prev,
      [itemName]: {
        ...(prev[itemName] || {}),
        color: family,
        color_description: `${family} (${hex}) as photographed`,
        color_family: family,
      },
    }));
  }

  /* ---------- Reset ---------- */
  function handleReset() {
    if (pollTimer.current) clearTimeout(pollTimer.current);

    setCsvFile(null);
    setCsvData(null);
    setImages(initialImages);
    setErrors({});
    setValidationResult(null);
    setCorrections({});
    setTemplateError("");
    setIsProcessing(false);

    const csvInput = document.getElementById("catalog-csv");
    if (csvInput) csvInput.value = "";
  }

  // KAN-FIX: Check if any corrections have been made
  const hasCorrections = Object.keys(corrections).length > 0 &&
    Object.values(corrections).some((c) => Object.keys(c).length > 0);

  // KAN-FIX: Check if any items were accepted
  const hasAcceptedItems = validationResult?.type === "success" &&
    (validationResult.title.includes("accepted") || !validationResult.title.includes("rejected"));

  // KAN-FIX: batch reached a terminal status (completed/failed) — only then
  // may the report / navigation / re-upload actions be shown.
  const batchFinished =
    !!validationResult && validationResult.type !== "processing";

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
            Upload your CSV product list and provide the
            Front, Side, and Rear images for every product
            row. Filenames must match the CSV columns.
          </p>
        </section>

        <section className="seller-upload-store">
          <div>
            <span>ASSIGNED STORE NAME</span>
            <strong>{storeName}</strong>
          </div>

          <p>
            Products from this upload will automatically be
            assigned to your authenticated seller store.
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
                Use the required CSV template and upload up
                to 10 products.
              </p>

              <ul>
                <li>Accepted format: CSV</li>
                <li>Maximum file size: 5 MB</li>
                <li>Maximum records: 10 products</li>
              </ul>

              <div className="seller-tag-options">
                <div>
                  <strong>Choose style_tags from:</strong>
                  <p>{TAG_OPTIONS.style_tags.join(", ")}</p>
                </div>
                <div>
                  <strong>Choose occasion_tags from:</strong>
                  <p>{TAG_OPTIONS.occasion_tags.join(", ")}</p>
                </div>
                <small>
                  Enter one or more approved values in the matching CSV
                  column, separated by commas. Values are case-insensitive.
                </small>
              </div>
            </div>

            <button
              type="button"
              className="seller-template-button"
              onClick={handleDownloadTemplate}
              disabled={isDownloadingTemplate}
            >
              {isDownloadingTemplate
                ? "Downloading…"
                : "Download Required Template"}
            </button>

            {templateError && (
              <p className="seller-upload-error">
                {templateError}
              </p>
            )}

            <label
              className={
                errors.csv
                  ? "seller-file-dropzone error"
                  : "seller-file-dropzone"
              }
              htmlFor="catalog-csv"
            >
              <span className="seller-upload-icon">↑</span>

              <strong>
                {csvFile ? csvFile.name : "Select your CSV file"}
              </strong>

              <small>Click here to browse your files</small>

              <input
                id="catalog-csv"
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvChange}
              />
            </label>

            {errors.csv && (
              <p className="seller-upload-error">{errors.csv}</p>
            )}

            {csvFile && (
              <div className="seller-selected-file">
                <div>
                  <strong>{csvFile.name}</strong>
                  <span>{(csvFile.size / 1024).toFixed(1)}{" KB"}</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCsvFile(null);
                    setCsvData(null);
                    setValidationResult(null);
                    const input =
                      document.getElementById("catalog-csv");
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
              Each drop zone accepts multiple files — one per
              CSV row. Filenames must match the CSV
              front/side/rear filename columns.
            </p>

            <div className="seller-image-grid">
              <ImageUploader
                view="front"
                title="Front View"
                files={images.front}
                error={errors.front}
                onAdd={handleImageAdd}
                onRemove={handleImageRemove}
              />

              <ImageUploader
                view="side"
                title="Side View"
                files={images.side}
                error={errors.side}
                onAdd={handleImageAdd}
                onRemove={handleImageRemove}
              />

              <ImageUploader
                view="rear"
                title="Rear View"
                files={images.rear}
                error={errors.rear}
                onAdd={handleImageAdd}
                onRemove={handleImageRemove}
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
              <strong>{validationResult.title}</strong>
              <p>{validationResult.message}</p>

              {validationResult.details &&
                validationResult.details.length > 0 && (
                  <ul>
                    {validationResult.details.map((entry, index) => (
                      <li key={index}>
                        {typeof entry === "string" ? (
                          entry
                        ) : (
                          <>
                            <strong>{entry.name}:</strong>{" "}
                            {entry.reasons.join(" • ")}

                            {/* KAN-FIX: Show correction UI for rejected items with color issues */}
                            {entry.reasons.some((r) => extractHexFromReason(r)) && (
                              <div className="seller-correction-controls" style={{ marginTop: "12px", padding: "12px", background: "#f9f9f9", borderRadius: "6px" }}>
                                {(() => {
                                  const hex = extractHexFromReason(entry.reasons.join(" "));
                                  const family = hexToColorFamily(hex);
                                  const currentCorrections = corrections[entry.name] || {};
                                  const originalRow = csvData?.rows.find((r) => r.name === entry.name);

                                  return (
                                    <>
                                      <button
                                        type="button"
                                        className="seller-correction-apply"
                                        onClick={() => applyDetectedColor(entry.name, hex)}
                                        style={{
                                          marginBottom: "12px",
                                          padding: "8px 14px",
                                          fontSize: "13px",
                                          background: "#8a6d1f",
                                          color: "white",
                                          border: "none",
                                          borderRadius: "4px",
                                          cursor: "pointer",
                                        }}
                                      >
                                        Use detected color {hex} → {family}
                                      </button>

                                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                                        <div>
                                          <label style={{ fontSize: "11px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>Color</label>
                                          <input
                                            type="text"
                                            value={currentCorrections.color ?? originalRow?.color ?? ""}
                                            onChange={(e) => handleCorrectionChange(entry.name, "color", e.target.value)}
                                            style={{ width: "100%", padding: "8px", fontSize: "13px", border: "1px solid #ccc", borderRadius: "4px" }}
                                          />
                                        </div>
                                        <div>
                                          <label style={{ fontSize: "11px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>Color Description</label>
                                          <input
                                            type="text"
                                            value={currentCorrections.color_description ?? originalRow?.color_description ?? ""}
                                            onChange={(e) => handleCorrectionChange(entry.name, "color_description", e.target.value)}
                                            style={{ width: "100%", padding: "8px", fontSize: "13px", border: "1px solid #ccc", borderRadius: "4px" }}
                                          />
                                        </div>
                                        <div>
                                          <label style={{ fontSize: "11px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>Color Family</label>
                                          <input
                                            type="text"
                                            value={currentCorrections.color_family ?? originalRow?.color_family ?? ""}
                                            onChange={(e) => handleCorrectionChange(entry.name, "color_family", e.target.value)}
                                            style={{ width: "100%", padding: "8px", fontSize: "13px", border: "1px solid #ccc", borderRadius: "4px" }}
                                          />
                                        </div>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
            </div>

            {/* KAN-FIX: Action buttons appear ONLY after the batch finishes
                (completed/failed). Hidden while status is "processing". */}
            {batchFinished && (
              <div className="seller-validation-actions" style={{ marginTop: "16px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {/* ✅ FIX: Changed from /seller/product-listings to /seller/listings */}
                {validationResult.type === "success" && hasAcceptedItems && (
                  <button
                    type="button"
                    className="seller-validation-nav"
                    onClick={() => navigate("/seller/listings")}
                    style={{
                      padding: "10px 20px",
                      background: "#8a6d1f",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    Go to Product Listings
                  </button>
                )}

                {validationResult.type === "success" && hasCorrections && (
                  <button
                    type="button"
                    className="seller-validation-reupload"
                    onClick={handleReuploadCorrected}
                    disabled={isProcessing}
                    style={{
                      padding: "10px 20px",
                      background: hasCorrections ? "#28a745" : "#ccc",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: hasCorrections && !isProcessing ? "pointer" : "not-allowed",
                      fontWeight: "bold",
                    }}
                  >
                    {isProcessing ? "Re-uploading…" : "Re-upload corrected rows"}
                  </button>
                )}

                <button
                  type="button"
                  className="seller-validation-view"
                  onClick={() => {
                    const batchId = validationResult.batchId || "";
                    navigate(
                      `/seller/validation${batchId ? `?batch=${batchId}` : ""}`
                    );
                  }}
                  style={{
                    padding: "10px 20px",
                    background: "white",
                    color: "#8a6d1f",
                    border: "2px solid #8a6d1f",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  View Full Validation Report
                </button>
              </div>
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
            {isProcessing ? "Processing…" : "Process and Validate"}
          </button>
        </div>
      </form>
    </main>
  );
}

/* ==========================================
   MULTI-FILE IMAGE DROP ZONE
========================================== */
function ImageUploader({ view, title, files, error, onAdd, onRemove }) {
  const inputId = `${view}-product-image`;

  return (
    <article className="seller-image-uploader">
      <div className="seller-image-title">
        <strong>{title}</strong>
        <span>JPG, PNG or WEBP • {files.length} file(s)</span>
      </div>

      <label
        className={
          error ? "seller-image-dropzone error" : "seller-image-dropzone"
        }
        htmlFor={inputId}
      >
        <span>+</span>
        <strong>Upload {title}</strong>
        <small>Max 5 MB each • multiple files allowed</small>

        <input
          id={inputId}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => onAdd(view, event)}
        />
      </label>

      {files.length > 0 && (
        <div className="seller-image-file-list">
          {files.map((item, index) => (
            <div
              className="seller-selected-file"
              key={`${item.file.name}-${index}`}
            >
              <div>
                <strong>{item.file.name}</strong>
                <span>{(item.file.size / 1024).toFixed(1)}{" KB"}</span>
              </div>

              <button
                type="button"
                onClick={() => onRemove(view, index)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="seller-upload-error">{error}</p>}
    </article>
  );
}

export default SellerCatalogUploadPage;