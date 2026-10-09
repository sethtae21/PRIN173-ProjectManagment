import { useState } from "react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import "./css/OrderDetailsPage.css";

const CART_STORAGE_KEY = "fitfusion-cart";
const MAX_CART_QUANTITY = 10;

const sampleOrder = {
  id: "FF-38252027",
  placedAt: "October 8, 2026",
  status: "Processing",

  customer: {
    name: "Karol Shopper",
    mobile: "+63 912 345 6789",
    address: "Makati City, Metro Manila",
  },

  paymentMethod: "Cash on Delivery",
  shippingMethod: "Standard Delivery",
  shippingFee: 0,

  items: [
    {
      id: "001",
      productId: "001",
      name: "Modern Structured Blazer",
      category: "Outerwear",
      sellerId: "maison-moderne",
      sellerName: "Maison Moderne",
      price: 1899,
      originalPrice: 2299,
      quantity: 8,
      size: "2XL",
      color: "Beige",
      sizes: ["S", "M", "L", "XL", "2XL"],
      colors: ["Beige", "Black", "Brown"],
      image: "",
    },
    {
      id: "002",
      productId: "002",
      name: "Classic Linen Blouse",
      category: "Tops",
      sellerId: "aurelia-studio",
      sellerName: "Aurelia Studio",
      price: 899,
      originalPrice: 1099,
      quantity: 1,
      size: "S",
      color: "Ivory",
      sizes: ["XS", "S", "M", "L"],
      colors: ["Ivory", "White", "Beige"],
      image: "",
    },
  ],
};

function formatCurrency(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(value);
}

function readCart() {
  try {
    const storedCart = localStorage.getItem(
      CART_STORAGE_KEY
    );

    if (!storedCart) {
      return [];
    }

    const parsedCart = JSON.parse(storedCart);

    return Array.isArray(parsedCart)
      ? parsedCart
      : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(
    CART_STORAGE_KEY,
    JSON.stringify(cart)
  );

  window.dispatchEvent(
    new CustomEvent(
      "fitfusion-cart-updated",
      {
        detail: {
          cart,
          quantity: cart.length,
        },
      }
    )
  );
}

function addItemsToCart(items) {
  const currentCart = readCart();
  const nextCart = [...currentCart];

  items.forEach((orderItem) => {
    const existingIndex =
      nextCart.findIndex(
        (cartItem) =>
          String(
            cartItem.productId ??
              cartItem.id
          ) ===
            String(
              orderItem.productId ??
                orderItem.id
            ) &&
          cartItem.size ===
            orderItem.size &&
          cartItem.color ===
            orderItem.color
      );

    if (existingIndex >= 0) {
      const existingItem =
        nextCart[existingIndex];

      nextCart[existingIndex] = {
        ...existingItem,
        quantity: Math.min(
          MAX_CART_QUANTITY,
          Number(
            existingItem.quantity || 1
          ) +
            Number(
              orderItem.quantity || 1
            )
        ),
        selected: true,
      };

      return;
    }

    nextCart.push({
      id: `${orderItem.productId}-${orderItem.size}-${orderItem.color}`,
      productId: orderItem.productId,
      name: orderItem.name,
      category: orderItem.category,
      sellerId: orderItem.sellerId,
      sellerName: orderItem.sellerName,
      price: Number(orderItem.price),
      originalPrice: Number(
        orderItem.originalPrice ||
          orderItem.price
      ),
      quantity: Math.min(
        MAX_CART_QUANTITY,
        Number(orderItem.quantity || 1)
      ),
      size: orderItem.size,
      color: orderItem.color,
      sizes: orderItem.sizes,
      colors: orderItem.colors,
      image: orderItem.image || "",
      selected: true,
    });
  });

  saveCart(nextCart);
}

function OrderDetailsPage() {
  const navigate = useNavigate();
  const { orderId } = useParams();

  const [orderStatus, setOrderStatus] =
    useState(sampleOrder.status);

  const [notice, setNotice] = useState("");

  const [showCancelModal, setShowCancelModal] =
    useState(false);

  const order = {
    ...sampleOrder,
    id: orderId || sampleOrder.id,
    status: orderStatus,
  };

  const originalSubtotal =
    order.items.reduce(
      (total, item) =>
        total +
        Number(item.originalPrice) *
          Number(item.quantity),
      0
    );

  const discountedSubtotal =
    order.items.reduce(
      (total, item) =>
        total +
        Number(item.price) *
          Number(item.quantity),
      0
    );

  const productDiscount =
    originalSubtotal - discountedSubtotal;

  const total =
    discountedSubtotal +
    Number(order.shippingFee || 0);

  const canCancelOrder =
    orderStatus === "Processing" ||
    orderStatus === "To Ship";

  function showNotice(message) {
    setNotice(message);

    window.setTimeout(() => {
      setNotice("");
    }, 2500);
  }

  function handleBuyAgain(item) {
    addItemsToCart([item]);

    showNotice(
      `${item.name} was added to your cart.`
    );

    window.setTimeout(() => {
      navigate("/shopper/cart");
    }, 500);
  }

  function handleBuyAllAgain() {
    addItemsToCart(order.items);

    showNotice(
      "All products were added to your cart."
    );

    window.setTimeout(() => {
      navigate("/shopper/cart");
    }, 500);
  }

  function handleCancelOrder() {
    setOrderStatus("Cancelled");
    setShowCancelModal(false);

    showNotice(
      "Your order has been cancelled."
    );
  }

  return (
    <main className="order-details-page">
      {notice && (
        <div
          className="order-details-toast"
          role="status"
        >
          {notice}
        </div>
      )}

      <div className="order-details-container">
        <div className="order-details-back-row">
          <Link
            to="/shopper/orders"
            className="order-details-back-link"
          >
            ← Return to Order History
          </Link>
        </div>

        <section className="order-details-heading">
          <div>
            <p className="order-details-eyebrow">
              ORDER DETAILS
            </p>

            <h1>Order #{order.id}</h1>

            <p>
              Placed on {order.placedAt}
            </p>
          </div>

          <span
            className={`order-details-status ${orderStatus
              .toLowerCase()
              .replaceAll(" ", "-")}`}
          >
            {orderStatus}
          </span>
        </section>

        <section className="order-details-information">
          <article>
            <span>DELIVERY INFORMATION</span>

            <strong>
              {order.customer.name}
            </strong>

            <p>{order.customer.mobile}</p>

            <p>{order.customer.address}</p>
          </article>

          <article>
            <span>PAYMENT METHOD</span>

            <strong>
              {order.paymentMethod}
            </strong>

            <p>
              No real payment is processed in
              this prototype.
            </p>
          </article>

          <article>
            <span>SHIPPING METHOD</span>

            <strong>
              {order.shippingMethod}
            </strong>

            <p>
              Your order will be prepared by
              the seller.
            </p>
          </article>
        </section>

        <section className="order-details-products-card">
          <div className="order-details-products-heading">
            <div>
              <p>ORDERED PRODUCTS</p>

              <h2>
                {order.items.length}{" "}
                {order.items.length === 1
                  ? "product"
                  : "products"}
              </h2>
            </div>

            <button
              type="button"
              className="order-details-outline-button"
              onClick={handleBuyAllAgain}
            >
              Buy All Again
            </button>
          </div>

          <div className="order-details-products-list">
            {order.items.map((item) => (
              <article
                className="order-details-product-row"
                key={`${item.productId}-${item.size}-${item.color}`}
              >
                <button
                  type="button"
                  className="order-details-product-image"
                  onClick={() =>
                    navigate(
                      `/shopper/products/${item.productId}`
                    )
                  }
                  aria-label={`View ${item.name}`}
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                    />
                  ) : (
                    <span aria-hidden="true">
                      {item.name.charAt(0)}
                    </span>
                  )}

                  <small>
                    ×{item.quantity}
                  </small>
                </button>

                <div className="order-details-product-information">
                  <Link
                    to={`/shopper/sellers/${item.sellerId}`}
                    className="order-details-seller-link"
                  >
                    {item.sellerName} →
                  </Link>

                  <button
                    type="button"
                    className="order-details-product-name"
                    onClick={() =>
                      navigate(
                        `/shopper/products/${item.productId}`
                      )
                    }
                  >
                    {item.name}
                  </button>

                  <p>{item.category}</p>

                  <div className="order-details-product-options">
                    <span>
                      Size: {item.size}
                    </span>

                    <span>
                      Color: {item.color}
                    </span>

                    <span>
                      Quantity: {item.quantity}
                    </span>
                  </div>
                </div>

                <div className="order-details-product-price">
                  <span>Price</span>

                  <strong>
                    {formatCurrency(
                      item.price
                    )}
                  </strong>

                  <small>
                    Item total:{" "}
                    {formatCurrency(
                      item.price *
                        item.quantity
                    )}
                  </small>
                </div>

                <div className="order-details-product-actions">
                  <button
                    type="button"
                    className="order-details-outline-button"
                    onClick={() =>
                      navigate(
                        `/shopper/products/${item.productId}`
                      )
                    }
                  >
                    View Product
                  </button>

                  <button
                    type="button"
                    className="order-details-dark-button"
                    onClick={() =>
                      handleBuyAgain(item)
                    }
                  >
                    Buy Again
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="order-details-bottom-grid">
          <article className="order-details-payment-card">
            <div className="order-details-payment-row">
              <span>Subtotal</span>

              <strong>
                {formatCurrency(
                  originalSubtotal
                )}
              </strong>
            </div>

            <div className="order-details-payment-row discount">
              <span>Product Discount</span>

              <strong>
                −
                {formatCurrency(
                  productDiscount
                )}
              </strong>
            </div>

            <div className="order-details-payment-row">
              <span>Shipping Fee</span>

              <strong>
                {order.shippingFee === 0
                  ? "FREE"
                  : formatCurrency(
                      order.shippingFee
                    )}
              </strong>
            </div>

            <div className="order-details-payment-total">
              <span>Total</span>

              <strong>
                {formatCurrency(total)}
              </strong>
            </div>
          </article>

          <article className="order-details-actions-card">
            <p>ORDER ACTIONS</p>

            {canCancelOrder && (
              <button
                type="button"
                className="order-details-cancel-button"
                onClick={() =>
                  setShowCancelModal(true)
                }
              >
                Cancel Order
              </button>
            )}

            <button
              type="button"
              className="order-details-buy-all-button"
              onClick={handleBuyAllAgain}
            >
              Buy Again
            </button>

            <Link
              to="/shopper/orders"
              className="order-details-history-button"
            >
              Return to Order History
            </Link>
          </article>
        </section>
      </div>

      {showCancelModal && (
        <div
          className="order-details-modal-backdrop"
          role="presentation"
          onMouseDown={() =>
            setShowCancelModal(false)
          }
        >
          <section
            className="order-details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-order-title"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <p>CONFIRM ORDER CANCELLATION</p>

            <h2 id="cancel-order-title">
              Cancel this order?
            </h2>

            <span>
              This will cancel order #
              {order.id}. You may purchase the
              products again later.
            </span>

            <div className="order-details-modal-actions">
              <button
                type="button"
                className="order-details-outline-button"
                onClick={() =>
                  setShowCancelModal(false)
                }
              >
                Keep Order
              </button>

              <button
                type="button"
                className="order-details-cancel-button"
                onClick={handleCancelOrder}
              >
                Confirm Cancellation
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default OrderDetailsPage;