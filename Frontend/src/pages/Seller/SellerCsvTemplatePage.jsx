import { useNavigate } from "react-router-dom";
import "../css/SellerCsvTemplatePage.css";

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

const exampleValues = [
  "Camel Linen Shirt",
  "Relaxed linen tailoring",
  "Tops",
  "M",
  "Camel",
  "Warm camel brown",
  "Warm Neutrals",
  "750",
  "Classic",
  "Work",
  "linen_shirt_01_front.jpg",
  "linen_shirt_01_side.jpg",
  "linen_shirt_01_rear.jpg",
];

function escapeCsvValue(value) {
  const textValue = String(value);

  if (
    textValue.includes(",") ||
    textValue.includes('"') ||
    textValue.includes("\n")
  ) {
    return `"${textValue.replaceAll('"', '""')}"`;
  }

  return textValue;
}

function downloadTextFile({
  content,
  fileName,
  type,
}) {
  const blob = new Blob([content], {
    type,
  });

  const fileUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = fileUrl;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(fileUrl);
}

function SellerCsvTemplatePage() {
  const navigate = useNavigate();

  function handleDownloadCsv() {
    const csvHeader = requiredColumns
      .map(escapeCsvValue)
      .join(",");

    const csvExample = exampleValues
      .map(escapeCsvValue)
      .join(",");

    const csvContent = `${csvHeader}\n${csvExample}`;

    downloadTextFile({
      content: csvContent,
      fileName: "fitfusion-catalog-template.csv",
      type: "text/csv;charset=utf-8;",
    });
  }

  function handleDownloadInstructions() {
    const instructions = `
FITFUSION AI
SELLER CATALOG UPLOAD INSTRUCTIONS

1. GENERAL RULES
- Use the provided CSV template.
- Do not rename, remove, or rearrange the required columns.
- A maximum of 10 products is allowed per upload batch.
- Every product must have a front, side, and rear image.
- A maximum of 30 images is allowed per upload batch.
- Store Name is assigned automatically by the system.

2. REQUIRED COLUMNS
${requiredColumns.map((column) => `- ${column}`).join("\n")}

3. IMAGE REQUIREMENTS
- Accepted formats: JPG, JPEG, PNG, and WEBP.
- Photograph every garment laid flat or on a mannequin.
- Provide one front-view image per product.
- Provide one side-view image per product.
- Provide one rear-view image per product.
- Do not remove image backgrounds manually.
- FitFusion AI will process uploaded backgrounds after validation.

4. FILE-NAMING CONVENTION
Use a consistent product identifier for all three images.

Example:
linen_shirt_01_front.jpg
linen_shirt_01_side.jpg
linen_shirt_01_rear.jpg

The image filenames inside the CSV must exactly match the uploaded files.

5. EXAMPLE PRODUCT
Name: Camel Linen Shirt
Description: Relaxed linen tailoring
Category: Tops
Size: M
Color: Camel
Color Description: Warm camel brown
Color Family: Warm Neutrals
Price: 750
Style Tags: Classic
Occasion Tags: Work

6. VALIDATION
The system checks:
- Required CSV columns
- Product-row limit
- Image count
- Missing images
- Filename matches
- Front, side, and rear image availability

No product will be published until its catalog data passes validation.
`.trim();

    downloadTextFile({
      content: instructions,
      fileName:
        "fitfusion-catalog-upload-instructions.txt",
      type: "text/plain;charset=utf-8;",
    });
  }

  return (
    <main className="seller-template-page">
      <header className="seller-template-header">
        <div>
          <h1>21A — CSV TEMPLATE</h1>

          <p>
            Exact required columns, example values, and
            three-view image instructions
          </p>
        </div>

        <span className="seller-template-role">
          SELLER
        </span>
      </header>

      <div className="seller-template-content">
        <section className="seller-template-introduction">
          <p className="seller-template-eyebrow">
            CSV TEMPLATE &amp; INSTRUCTIONS
          </p>

          <h2>
            Required columns and filename convention
          </h2>

          <p>
            The download includes a CSV template and a
            separate instruction guide.
          </p>
        </section>

        <section className="seller-template-card">
          <div className="seller-template-card-header">
            <div>
              <p>REQUIRED CSV STRUCTURE</p>
              <h3>Do not rename these columns</h3>
            </div>

            <span>
              {requiredColumns.length} required columns
            </span>
          </div>

          <div className="seller-column-grid">
            {requiredColumns.map((column, index) => (
              <article
                className="seller-column-item"
                key={column}
              >
                <span>
                  {String(index + 1).padStart(2, "0")}
                </span>

                <strong>{column}</strong>
              </article>
            ))}
          </div>

          <div className="seller-template-example">
            <p>EXAMPLE ROW</p>

            <strong>
              Camel Linen Shirt | Relaxed linen tailoring |
              Tops | M | Camel | Warm camel brown | Warm
              Neutrals | 750 | Classic | Work
            </strong>
          </div>

          <div className="seller-filename-example">
            <p>EXAMPLE FILENAMES</p>

            <div>
              <code>linen_shirt_01_front.jpg</code>
              <code>linen_shirt_01_side.jpg</code>
              <code>linen_shirt_01_rear.jpg</code>
            </div>
          </div>

          <div className="seller-template-instructions">
            <article>
              <div className="seller-instruction-number">
                1
              </div>

              <div>
                <h4>Photograph the garment</h4>

                <p>
                  Photograph every garment laid flat or on
                  a mannequin using clear and even lighting.
                </p>
              </div>
            </article>

            <article>
              <div className="seller-instruction-number">
                2
              </div>

              <div>
                <h4>Provide three viewing angles</h4>

                <p>
                  Every product requires one front, one
                  side, and one rear image.
                </p>
              </div>
            </article>

            <article>
              <div className="seller-instruction-number">
                3
              </div>

              <div>
                <h4>Match the exact filenames</h4>

                <p>
                  Filenames entered in the CSV must exactly
                  match the selected image files.
                </p>
              </div>
            </article>

            <article>
              <div className="seller-instruction-number">
                4
              </div>

              <div>
                <h4>Keep the original background</h4>

                <p>
                  Do not remove backgrounds manually.
                  FitFusion AI processes the images after
                  upload.
                </p>
              </div>
            </article>
          </div>
        </section>

        <section className="seller-template-reminder">
          <div>
            <strong>Maximum upload batch</strong>
            <span>10 products</span>
          </div>

          <div>
            <strong>Images per product</strong>
            <span>Front, Side, and Rear</span>
          </div>

          <div>
            <strong>Maximum images</strong>
            <span>30 images</span>
          </div>

          <div>
            <strong>Store assignment</strong>
            <span>Automatic</span>
          </div>
        </section>

        <div className="seller-template-actions">
          <button
            type="button"
            className="seller-template-back-button"
            onClick={() =>
              navigate("/seller/products/upload")
            }
          >
            Back to Catalog Upload
          </button>

          <button
            type="button"
            className="seller-download-instructions-button"
            onClick={handleDownloadInstructions}
          >
            Download Instructions
          </button>

          <button
            type="button"
            className="seller-download-csv-button"
            onClick={handleDownloadCsv}
          >
            Download CSV Template
          </button>
        </div>
      </div>
    </main>
  );
}

export default SellerCsvTemplatePage;