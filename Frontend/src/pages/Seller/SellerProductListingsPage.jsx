import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const defaultProducts = [
  {
    id: "ivory-coat",
    name: "Ivory Coat",
    category: "Outerwear",
    price: 1850,
    color: "Ivory",
    status: "Active",
  },
  {
    id: "gold-dress",
    name: "Gold Dress",
    category: "Dresses",
    price: 1450,
    color: "Gold",
    status: "Rejected",
  },
  {
    id: "black-sneakers",
    name: "Black Sneakers",
    category: "Footwear",
    price: 1100,
    color: "Black",
    status: "Active",
  },
];

function normalizeProduct(product, index) {
  return {
    id:
      product.id ||
      product.productId ||
      `seller-product-${index + 1}`,

    name:
      product.name ||
      product.productName ||
      "Unnamed Product",

    category:
      product.category ||
      "Uncategorized",

    price:
      Number(product.price) || 0,

    color:
      product.color ||
      product.dominantColor ||
      "Not specified",

    status:
      product.status ||
      product.validationStatus ||
      "Active",
  };
}

function getInitialProducts() {
  const savedProducts = localStorage.getItem(
    "fitfusion-seller-products"
  );

  if (!savedProducts) {
    return defaultProducts;
  }

  try {
    const parsedProducts =
      JSON.parse(savedProducts);

    if (
      !Array.isArray(parsedProducts) ||
      parsedProducts.length === 0
    ) {
      return defaultProducts;
    }

    return parsedProducts.map(normalizeProduct);
  } catch {
    return defaultProducts;
  }
}

function formatPrice(price) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(price);
}

function SellerProductListingsPage() {
  const navigate = useNavigate();

  const [products, setProducts] = useState(
    getInitialProducts
  );

  const [searchTerm, setSearchTerm] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const filteredProducts = useMemo(() => {
    const search =
      searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !search ||
        product.name
          .toLowerCase()
          .includes(search) ||
        product.category
          .toLowerCase()
          .includes(search) ||
        product.color
          .toLowerCase()
          .includes(search);

      const matchesStatus =
        statusFilter === "All" ||
        product.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [products, searchTerm, statusFilter]);

  function handleDelete(product) {
    const confirmed = window.confirm(
      `Delete ${product.name}? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    const updatedProducts = products.filter(
      (currentProduct) =>
        currentProduct.id !== product.id
    );

    setProducts(updatedProducts);

    localStorage.setItem(
      "fitfusion-seller-products",
      JSON.stringify(updatedProducts)
    );
  }

  return (
    <>
      <style>{`
        .spl-page,
        .spl-page * {
          box-sizing: border-box;
        }

        .spl-page {
          width: 100%;
          min-height: 100vh;
          padding: 46px 40px 70px;
          background:
            radial-gradient(
              circle at right center,
              rgba(181, 126, 32, 0.18),
              transparent 43%
            ),
            linear-gradient(
              135deg,
              #f2efe8,
              #fffdf9 52%,
              #eee8de
            );
          color: #17130f;
        }

        .spl-container {
          width: min(1160px, 100%);
          margin: 0 auto;
        }

        .spl-introduction {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 30px;
          width: 100%;
          margin-bottom: 28px;
        }

        .spl-introduction-text {
          min-width: 0;
        }

        .spl-eyebrow {
          margin: 0 0 11px;
          color: #9a6a1d;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .spl-introduction h1 {
          margin: 0 0 12px;
          color: #17130f;
          font-size: clamp(32px, 4vw, 42px);
          line-height: 1.15;
        }

        .spl-description {
          margin: 0;
          color: #5c554c;
          font-size: 14px;
          line-height: 1.6;
        }

        .spl-upload-button {
          flex: 0 0 auto;
          min-width: 190px;
          min-height: 50px;
          padding: 12px 24px;
          background: linear-gradient(
            135deg,
            #17130f,
            #8e641f 55%,
            #d7af4b
          );
          border: 1px solid #b57e20;
          border-radius: 10px;
          color: #fffdf9;
          font: inherit;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .spl-upload-button:hover {
          box-shadow: 0 8px 20px
            rgba(142, 100, 31, 0.22);
          transform: translateY(-1px);
        }

        .spl-toolbar {
          display: grid;
          grid-template-columns:
            minmax(260px, 1fr)
            minmax(210px, 280px);
          gap: 20px;
          width: 100%;
          margin-bottom: 20px;
          padding: 22px;
          background: #fffdf9;
          border: 1px solid #e2d8c7;
          border-radius: 14px;
          box-shadow: 0 10px 25px
            rgba(74, 48, 12, 0.05);
        }

        .spl-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
        }

        .spl-field span {
          color: #29251f;
          font-size: 11px;
          font-weight: 700;
        }

        .spl-field input,
        .spl-field select {
          position: static;
          display: block;
          width: 100%;
          min-height: 46px;
          margin: 0;
          padding: 10px 13px;
          background: #f8f5ef;
          border: 1px solid #ccb990;
          border-radius: 8px;
          color: #29251f;
          font: inherit;
          font-size: 13px;
          outline: none;
        }

        .spl-field input:focus,
        .spl-field select:focus {
          border-color: #8e641f;
          box-shadow: 0 0 0 3px
            rgba(181, 126, 32, 0.13);
        }

        .spl-table-card {
          width: 100%;
          overflow: hidden;
          background: #fffdf9;
          border: 1px solid #e2d8c7;
          border-radius: 16px;
          box-shadow: 0 16px 38px
            rgba(74, 48, 12, 0.08);
        }

        .spl-table-wrapper {
          width: 100%;
          overflow-x: auto;
        }

        .spl-table {
          width: 100%;
          min-width: 850px;
          border-collapse: collapse;
        }

        .spl-table th {
          padding: 18px 20px;
          background: #f8f5ef;
          border-bottom: 1px solid #e2d8c7;
          color: #5c554c;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-align: left;
          text-transform: uppercase;
        }

        .spl-table td {
          padding: 20px;
          border-bottom: 1px solid #e9dfcf;
          color: #29251f;
          font-size: 13px;
          vertical-align: middle;
        }

        .spl-table tbody tr:last-child td {
          border-bottom: 0;
        }

        .spl-table tbody tr:hover {
          background: #fffbf1;
        }

        .spl-product {
          display: flex;
          min-width: 230px;
          align-items: center;
          gap: 14px;
        }

        .spl-product-image {
          display: grid;
          flex: 0 0 58px;
          width: 58px;
          height: 58px;
          place-items: center;
          background: linear-gradient(
            145deg,
            #f6e7b7,
            #d7af4b
          );
          border: 1px solid #d2be91;
          border-radius: 10px;
          color: #17130f;
          font-size: 21px;
          font-weight: 800;
        }

        .spl-product-information {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 5px;
        }

        .spl-product-information strong {
          color: #17130f;
          font-size: 13px;
        }

        .spl-product-information span {
          color: #5c554c;
          font-size: 11px;
        }

        .spl-status {
          display: inline-flex;
          min-width: 84px;
          min-height: 31px;
          align-items: center;
          justify-content: center;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .spl-status-active {
          background: #f6e7b7;
          color: #704b11;
        }

        .spl-status-rejected {
          background: #f4ded9;
          color: #8b3b31;
        }

        .spl-actions {
          display: flex;
          min-width: 245px;
          flex-wrap: wrap;
          gap: 8px;
        }

        .spl-action-button,
        .spl-delete-button {
          position: static;
          min-width: 70px;
          min-height: 38px;
          margin: 0;
          padding: 8px 15px;
          border-radius: 8px;
          font: inherit;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .spl-action-button {
          background: #fffdf9;
          border: 1px solid #b57e20;
          color: #8e641f;
        }

        .spl-action-button:hover {
          background: #17130f;
          color: #fffdf9;
        }

        .spl-delete-button {
          background: #fffdf9;
          border: 1px solid #8b3b31;
          color: #8b3b31;
        }

        .spl-delete-button:hover {
          background: #8b3b31;
          color: #fffdf9;
        }

        .spl-empty-state {
          padding: 60px 24px;
          text-align: center;
        }

        .spl-empty-state h2 {
          margin: 0 0 10px;
          color: #17130f;
        }

        .spl-empty-state p {
          margin: 0 0 20px;
          color: #5c554c;
        }

        .spl-clear-button {
          min-height: 42px;
          padding: 9px 18px;
          background: #fffdf9;
          border: 1px solid #b57e20;
          border-radius: 8px;
          color: #8e641f;
          font: inherit;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        @media (max-width: 800px) {
          .spl-page {
            padding: 30px 20px 55px;
          }

          .spl-introduction {
            align-items: flex-start;
            flex-direction: column;
          }

          .spl-upload-button {
            width: 100%;
          }

          .spl-toolbar {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <section className="spl-page">
        <div className="spl-container">
          <section className="spl-introduction">
            <div className="spl-introduction-text">
              <p className="spl-eyebrow">
                Product Management
              </p>

              <h1>Your product listings</h1>

              <p className="spl-description">
                Review, edit, and manage the products
                uploaded to your store.
              </p>
            </div>

            <button
              type="button"
              className="spl-upload-button"
              onClick={() =>
                navigate("/seller/upload-catalog")
              }
            >
              Upload Products
            </button>
          </section>

          <section className="spl-toolbar">
            <label className="spl-field">
              <span>Search listings</span>

              <input
                type="search"
                value={searchTerm}
                placeholder="Search product, category, or color"
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
              />
            </label>

            <label className="spl-field">
              <span>Validation status</span>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
              >
                <option value="All">
                  All statuses
                </option>

                <option value="Active">
                  Active
                </option>

                <option value="Rejected">
                  Rejected
                </option>
              </select>
            </label>
          </section>

          <section className="spl-table-card">
            <div className="spl-table-wrapper">
              <table className="spl-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredProducts.map(
                    (product) => (
                      <tr key={product.id}>
                        <td>
                          <div className="spl-product">
                            <div
                              className="spl-product-image"
                              aria-hidden="true"
                            >
                              {product.name
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div className="spl-product-information">
                              <strong>
                                {product.name}
                              </strong>

                              <span>
                                {product.color}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          {product.category}
                        </td>

                        <td>
                          {formatPrice(
                            product.price
                          )}
                        </td>

                        <td>
                          <span
                            className={
                              product.status ===
                              "Rejected"
                                ? "spl-status spl-status-rejected"
                                : "spl-status spl-status-active"
                            }
                          >
                            {product.status}
                          </span>
                        </td>

                        <td>
                          <div className="spl-actions">
                            <button
                              type="button"
                              className="spl-action-button"
                              onClick={() =>
                                navigate(
                                  `/seller/listings/${product.id}`
                                )
                              }
                            >
                              View
                            </button>

                            <button
                              type="button"
                              className="spl-action-button"
                              onClick={() =>
                                navigate(
                                  `/seller/listings/${product.id}/edit`
                                )
                              }
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className="spl-delete-button"
                              onClick={() =>
                                handleDelete(
                                  product
                                )
                              }
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            {filteredProducts.length === 0 && (
              <div className="spl-empty-state">
                <h2>No products found</h2>

                <p>
                  Try a different search term or
                  validation status.
                </p>

                <button
                  type="button"
                  className="spl-clear-button"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("All");
                  }}
                >
                  Clear Filters
                </button>
              </div>
            )}
          </section>
        </div>
      </section>
    </>
  );
}

export default SellerProductListingsPage;