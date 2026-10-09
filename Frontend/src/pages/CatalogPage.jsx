import {
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useOutletContext,
} from "react-router-dom";

import "./css/CatalogPage.css";

const PRODUCTS = [
  {
    id: "product-001",
    name: "Classic Linen Blouse",
    category: "Tops",
    gender: "Women",
    price: 899,
    originalPrice: 1099,
    rating: 4.8,
    ratingsCount: 128,
    sellerId: "seller-001",
    sellerName: "Aurelia Studio",
    symbol: "👚",
    matchScore: "6/7",
    featured: true,
    sizes: ["S", "M", "L", "XL"],
    colors: ["Ivory", "Beige", "Black"],
  },
  {
    id: "product-002",
    name: "Tailored Wide-Leg Trousers",
    category: "Bottoms",
    gender: "Women",
    price: 1299,
    originalPrice: 1499,
    rating: 4.7,
    ratingsCount: 94,
    sellerId: "seller-001",
    sellerName: "Aurelia Studio",
    symbol: "👖",
    matchScore: "5/7",
    featured: true,
    sizes: ["S", "M", "L", "XL"],
    colors: ["Sand", "Brown", "Black"],
  },
  {
    id: "product-003",
    name: "Modern Structured Blazer",
    category: "Outerwear",
    gender: "Women",
    price: 1899,
    originalPrice: 2299,
    rating: 4.9,
    ratingsCount: 76,
    sellerId: "seller-002",
    sellerName: "Maison Moderne",
    symbol: "🧥",
    matchScore: "7/7",
    featured: true,
    sizes: ["S", "M", "L", "XL", "2XL"],
    colors: ["Cream", "Brown", "Black"],
  },
  {
    id: "product-004",
    name: "Premium Cotton Polo",
    category: "Tops",
    gender: "Men",
    price: 799,
    originalPrice: 999,
    rating: 4.6,
    ratingsCount: 82,
    sellerId: "seller-003",
    sellerName: "North & Thread",
    symbol: "👕",
    matchScore: "6/7",
    featured: false,
    sizes: ["S", "M", "L", "XL"],
    colors: ["White", "Navy", "Olive"],
  },
  {
    id: "product-005",
    name: "Pleated Midi Dress",
    category: "Dresses",
    gender: "Women",
    price: 1599,
    originalPrice: 1899,
    rating: 4.8,
    ratingsCount: 110,
    sellerId: "seller-002",
    sellerName: "Maison Moderne",
    symbol: "👗",
    matchScore: "6/7",
    featured: true,
    sizes: ["XS", "S", "M", "L"],
    colors: ["Rose", "Cream", "Black"],
  },
  {
    id: "product-006",
    name: "Relaxed Fit Shirt",
    category: "Tops",
    gender: "Men",
    price: 949,
    originalPrice: 1199,
    rating: 4.7,
    ratingsCount: 64,
    sellerId: "seller-003",
    sellerName: "North & Thread",
    symbol: "👔",
    matchScore: "5/7",
    featured: false,
    sizes: ["S", "M", "L", "XL"],
    colors: ["Blue", "White", "Gray"],
  },
];

const CATEGORIES = [
  "All",
  "Tops",
  "Bottoms",
  "Dresses",
  "Outerwear",
];

function readStorage(key, fallback) {
  try {
    const value =
      localStorage.getItem(key);

    return value
      ? JSON.parse(value)
      : fallback;
  } catch {
    return fallback;
  }
}

function CatalogPage({
  isGuest = false,
}) {
  const navigate = useNavigate();
  const outletContext = useOutletContext();

  const guestMode =
    isGuest ||
    outletContext?.isGuest === true;

  const basePath = guestMode
    ? "/guest"
    : "/shopper";

  const [search, setSearch] =
    useState("");

  const [category, setCategory] =
    useState("All");

  const [sort, setSort] =
    useState("recommended");

  const filteredProducts = useMemo(() => {
    let products = PRODUCTS.filter(
      (product) => {
        const matchesSearch =
          product.name
            .toLowerCase()
            .includes(
              search.toLowerCase()
            ) ||
          product.sellerName
            .toLowerCase()
            .includes(
              search.toLowerCase()
            );

        const matchesCategory =
          category === "All" ||
          product.category === category;

        return (
          matchesSearch &&
          matchesCategory
        );
      }
    );

    if (sort === "price-low") {
      products = [...products].sort(
        (a, b) => a.price - b.price
      );
    }

    if (sort === "price-high") {
      products = [...products].sort(
        (a, b) => b.price - a.price
      );
    }

    if (sort === "rating") {
      products = [...products].sort(
        (a, b) => b.rating - a.rating
      );
    }

    return products;
  }, [search, category, sort]);

  const cartItems = readStorage(
    "fitfusion-cart-items",
    []
  );

  const cartCount = cartItems.reduce(
    (total, item) =>
      total + Number(item.quantity || 1),
    0
  );

  function openProduct(product) {
    localStorage.setItem(
      "fitfusion-selected-product",
      JSON.stringify(product)
    );

    navigate(
      `${basePath}/products/${product.id}`
    );
  }

  function openSeller(product) {
    localStorage.setItem(
      "fitfusion-selected-seller",
      JSON.stringify({
        id: product.sellerId,
        name: product.sellerName,
      })
    );

    navigate(
      `${basePath}/sellers/${product.sellerId}`
    );
  }

  return (
    <main className="catalog-page">
      <section className="catalog-header">
        <div>
          <h1>09 — PRODUCT CATALOG</h1>

          <p>
            Browse products from verified
            FitFusion sellers.
          </p>
        </div>

        {!guestMode && (
          <button
            type="button"
            className="catalog-cart-button"
            onClick={() =>
              navigate("/shopper/cart")
            }
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 7H6" />
              <circle cx="10" cy="20" r="1" />
              <circle cx="18" cy="20" r="1" />
            </svg>

            <span>{cartCount}</span>
          </button>
        )}
      </section>

      <div className="catalog-content">
        <section className="catalog-introduction">
          <div>
            <p>EXPLORE YOUR STYLE</p>

            <h2>
              Find your next favorite outfit
            </h2>

            <span>
              Open a product to view its seller,
              ratings, available sizes, and
              colors.
            </span>
          </div>

          <div className="catalog-result-count">
            <strong>
              {filteredProducts.length}
            </strong>

            <span>products</span>
          </div>
        </section>

        <section className="catalog-controls">
          <input
            type="search"
            value={search}
            placeholder="Search products, stores, or categories..."
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />

          <select
            value={sort}
            onChange={(event) =>
              setSort(event.target.value)
            }
          >
            <option value="recommended">
              Recommended
            </option>

            <option value="price-low">
              Price: Low to High
            </option>

            <option value="price-high">
              Price: High to Low
            </option>

            <option value="rating">
              Highest Rating
            </option>
          </select>
        </section>

        <div className="catalog-categories">
          {CATEGORIES.map((item) => (
            <button
              key={item}
              type="button"
              className={
                category === item
                  ? "active"
                  : ""
              }
              onClick={() =>
                setCategory(item)
              }
            >
              {item}
            </button>
          ))}
        </div>

        <section className="catalog-grid">
          {filteredProducts.map(
            (product) => (
              <article
                key={product.id}
                className="catalog-product-card"
              >
                <div className="catalog-product-image">
                  {product.featured && (
                    <span className="catalog-featured-label">
                      FEATURED
                    </span>
                  )}

                  <span
                    className="catalog-product-symbol"
                    role="img"
                    aria-label={product.name}
                  >
                    {product.symbol}
                  </span>

                  <span className="catalog-match-score">
                    Match score:{" "}
                    {product.matchScore}
                  </span>
                </div>

                <div className="catalog-product-information">
                  <button
                    type="button"
                    className="catalog-seller-name"
                    onClick={() =>
                      openSeller(product)
                    }
                  >
                    {product.sellerName}
                  </button>

                  <p>
                    {product.gender} •{" "}
                    {product.category}
                  </p>

                  <h3>{product.name}</h3>

                  <div className="catalog-product-rating">
                    <span>★★★★★</span>

                    <strong>
                      {product.rating}
                    </strong>

                    <small>
                      (
                      {
                        product.ratingsCount
                      }
                      )
                    </small>
                  </div>

                  <div className="catalog-product-price">
                    <strong>
                      ₱
                      {product.price.toLocaleString()}
                    </strong>

                    <del>
                      ₱
                      {product.originalPrice.toLocaleString()}
                    </del>
                  </div>

                  <button
                    type="button"
                    className="catalog-view-button"
                    onClick={() =>
                      openProduct(product)
                    }
                  >
                    View Product Details
                  </button>
                </div>
              </article>
            )
          )}
        </section>

        {filteredProducts.length === 0 && (
          <section className="catalog-empty-state">
            <h2>No products found</h2>

            <p>
              Try another search term or
              category.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}

export default CatalogPage;