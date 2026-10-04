import { useNavigate } from "react-router-dom";
import "../css/SellerDashboardPage.css";

const recentProducts = [
  {
    id: 1,
    name: "Classic Beige Blazer",
    category: "Outerwear",
    price: 1899,
    stock: 12,
    status: "Active",
  },
  {
    id: 2,
    name: "Black Formal Trousers",
    category: "Bottoms",
    price: 1299,
    stock: 8,
    status: "Active",
  },
  {
    id: 3,
    name: "Gold Satin Blouse",
    category: "Tops",
    price: 999,
    stock: 0,
    status: "Out of Stock",
  },
];

const recentOrders = [
  {
    id: "FF-2026-0018",
    customer: "Maria Santos",
    total: 1899,
    status: "Processing",
  },
  {
    id: "FF-2026-0017",
    customer: "Angela Reyes",
    total: 2298,
    status: "Shipped",
  },
  {
    id: "FF-2026-0016",
    customer: "Nicole Cruz",
    total: 999,
    status: "Delivered",
  },
];

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
}

function SellerDashboardPage() {
  const navigate = useNavigate();

  const savedSeller = localStorage.getItem(
    "fitfusion-current-user"
  );

  let storeName = "Your Store";

  if (savedSeller) {
    try {
      const seller = JSON.parse(savedSeller);

      storeName =
        seller.storeName ||
        seller.businessName ||
        seller.username ||
        "Your Store";
    } catch {
      storeName = "Your Store";
    }
  }

  return (
    <main className="seller-dashboard-page">
      <section className="seller-dashboard-welcome">
        <div>
          <p className="seller-dashboard-label">
            WELCOME BACK
          </p>

          <h2>{storeName}</h2>

          <p className="seller-dashboard-description">
            Review your store activity, manage product
            listings, and process customer orders.
          </p>
        </div>

        <button
          type="button"
          className="seller-add-product-button"
          onClick={() =>
            navigate("/seller/products/new")
          }
        >
          + Add New Product
        </button>
      </section>

      <section
        className="seller-statistics-grid"
        aria-label="Store overview"
      >
        <article className="seller-statistic-card">
          <span className="seller-statistic-icon">
            01
          </span>

          <div>
            <p>Total Products</p>
            <strong>24</strong>
            <small>21 active listings</small>
          </div>
        </article>

        <article className="seller-statistic-card">
          <span className="seller-statistic-icon">
            02
          </span>

          <div>
            <p>Pending Orders</p>
            <strong>6</strong>
            <small>Require seller action</small>
          </div>
        </article>

        <article className="seller-statistic-card">
          <span className="seller-statistic-icon">
            03
          </span>

          <div>
            <p>Completed Orders</p>
            <strong>38</strong>
            <small>Successfully delivered</small>
          </div>
        </article>

        <article className="seller-statistic-card">
          <span className="seller-statistic-icon">
            04
          </span>

          <div>
            <p>Store Rating</p>
            <strong>4.8</strong>
            <small>Based on product ratings</small>
          </div>
        </article>
      </section>

      <section className="seller-dashboard-actions">
        <article className="seller-dashboard-action-card">
          <p className="seller-card-eyebrow">
            PRODUCT MANAGEMENT
          </p>

          <h3>Manage your product catalog</h3>

          <p>
            Add products individually, edit existing
            listings, or upload multiple product records.
          </p>

          <div className="seller-action-buttons">
            <button
              type="button"
              className="seller-primary-action"
              onClick={() =>
                navigate("/seller/products")
              }
            >
              View Products
            </button>

            <button
              type="button"
              className="seller-secondary-action"
              onClick={() =>
                navigate("/seller/products/upload")
              }
            >
              Upload Products
            </button>
          </div>
        </article>

        <article className="seller-dashboard-action-card dark">
          <p className="seller-card-eyebrow">
            ORDER MANAGEMENT
          </p>

          <h3>6 orders need attention</h3>

          <p>
            Review new customer orders and update their
            processing and delivery status.
          </p>

          <button
            type="button"
            className="seller-gold-action"
            onClick={() =>
              navigate("/seller/orders")
            }
          >
            Manage Orders
          </button>
        </article>
      </section>

      <section className="seller-dashboard-panel">
        <div className="seller-panel-heading">
          <div>
            <p className="seller-card-eyebrow">
              INVENTORY
            </p>

            <h3>Recent Product Listings</h3>
          </div>

          <button
            type="button"
            className="seller-text-button"
            onClick={() =>
              navigate("/seller/products")
            }
          >
            View All Products
          </button>
        </div>

        <div className="seller-table-container">
          <table className="seller-dashboard-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>
                  <span className="sr-only">
                    Actions
                  </span>
                </th>
              </tr>
            </thead>

            <tbody>
              {recentProducts.map((product) => (
                <tr key={product.id}>
                  <td>
                    <strong>{product.name}</strong>
                  </td>

                  <td>{product.category}</td>

                  <td>
                    {formatCurrency(product.price)}
                  </td>

                  <td>{product.stock}</td>

                  <td>
                    <span
                      className={
                        product.status === "Active"
                          ? "seller-status active"
                          : "seller-status warning"
                      }
                    >
                      {product.status}
                    </span>
                  </td>

                  <td>
                    <button
                      type="button"
                      className="seller-row-button"
                      onClick={() =>
                        navigate(
                          `/seller/products/${product.id}/edit`
                        )
                      }
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="seller-dashboard-panel">
        <div className="seller-panel-heading">
          <div>
            <p className="seller-card-eyebrow">
              CUSTOMER ORDERS
            </p>

            <h3>Recent Orders</h3>
          </div>

          <button
            type="button"
            className="seller-text-button"
            onClick={() =>
              navigate("/seller/orders")
            }
          >
            View All Orders
          </button>
        </div>

        <div className="seller-order-list">
          {recentOrders.map((order) => (
            <article
              className="seller-order-row"
              key={order.id}
            >
              <div>
                <strong>{order.id}</strong>
                <span>{order.customer}</span>
              </div>

              <div>
                <strong>
                  {formatCurrency(order.total)}
                </strong>

                <span
                  className={`seller-order-status ${order.status
                    .toLowerCase()
                    .replaceAll(" ", "-")}`}
                >
                  {order.status}
                </span>
              </div>

              <button
                type="button"
                className="seller-row-button"
                onClick={() =>
                  navigate(
                    `/seller/orders/${order.id}`
                  )
                }
              >
                View
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default SellerDashboardPage;