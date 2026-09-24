import { useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import logo from "../assets/fitfusion-logo.svg";
import "./CatalogPage.css";

const products = [
  {
    id: 1,
    name: "Camel Linen Shirt",
    store: "Maison Aurelia",
    price: 750,
    rating: 4.8,
    reviews: 124,
    category: "Tops",
    sizes: ["S", "M", "L", "XL", "2XL"],
    colors: ["Camel", "Cream"],
    style: "Classic",
    art: "shirt",
    productColor: "#c59758",
  },
  {
    id: 2,
    name: "Straight Pants",
    store: "Northline",
    price: 1100,
    rating: 4.7,
    reviews: 89,
    category: "Bottoms",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Black", "Brown"],
    style: "Minimal",
    art: "pants",
    productColor: "#332f2c",
  },
  {
    id: 3,
    name: "Soft Gold Dress",
    store: "Atelier Sol",
    price: 1400,
    rating: 4.9,
    reviews: 156,
    category: "Dresses",
    sizes: ["S", "M", "L", "XL", "2XL"],
    colors: ["Gold", "Cream"],
    style: "Elegant",
    art: "dress",
    productColor: "#c7952b",
  },
  {
    id: 4,
    name: "Ivory Coat",
    store: "Maison Aurelia",
    price: 900,
    rating: 4.6,
    reviews: 67,
    category: "Outerwear",
    sizes: ["M", "L", "XL", "2XL"],
    colors: ["Cream", "White"],
    style: "Classic",
    art: "coat",
    productColor: "#e6dbc6",
  },
  {
    id: 5,
    name: "Black Sneakers",
    store: "Urban Form",
    price: 1500,
    rating: 4.8,
    reviews: 211,
    category: "Footwear",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Black", "White"],
    style: "Casual",
    art: "shoes",
    productColor: "#292522",
  },
  {
    id: 6,
    name: "Cream Top",
    store: "Atelier Sol",
    price: 680,
    rating: 4.5,
    reviews: 42,
    category: "Tops",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Cream", "White"],
    style: "Minimal",
    art: "shirt",
    productColor: "#eee1c9",
  },
];

const emptyFilters = {
  category: "",
  size: "",
  color: "",
  style: "",
};

function CatalogPage() {
  const navigate = useNavigate();

  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [activeFilters, setActiveFilters] = useState(emptyFilters);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory =
        !activeFilters.category ||
        product.category === activeFilters.category;

      const matchesSize =
        !activeFilters.size ||
        product.sizes.includes(activeFilters.size);

      const matchesColor =
        !activeFilters.color ||
        product.colors.includes(activeFilters.color);

      const matchesStyle =
        !activeFilters.style ||
        product.style === activeFilters.style;

      return (
        matchesCategory &&
        matchesSize &&
        matchesColor &&
        matchesStyle
      );
    });
  }, [activeFilters]);

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setDraftFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }));
  }

  function applyFilters(event) {
    event.preventDefault();
    setActiveFilters(draftFilters);
  }

  function resetFilters() {
    setDraftFilters(emptyFilters);
    setActiveFilters(emptyFilters);
  }

  function handleLogout() {
    const shouldLogout = window.confirm(
      "Are you sure you want to log out?"
    );

    if (shouldLogout) {
      navigate("/login");
    }
  }

  return (
    <div className="catalog-shell">
      <aside className="catalog-sidebar">
        <div className="catalog-logo-container">
          <img
            src={logo}
            alt="FitFusion AI"
            className="catalog-logo"
          />
        </div>

        <nav className="catalog-navigation" aria-label="Shopper navigation">
          <NavLink
            to="/shopper/dashboard"
            className={({ isActive }) =>
              `catalog-nav-link ${isActive ? "active" : ""}`
            }
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/shopper/fitting-studio"
            className={({ isActive }) =>
              `catalog-nav-link ${isActive ? "active" : ""}`
            }
          >
            Fitting Studio
          </NavLink>

          <NavLink
            to="/shopper/avatar-presets"
            className={({ isActive }) =>
              `catalog-nav-link ${isActive ? "active" : ""}`
            }
          >
            Avatar Presets
          </NavLink>

          <NavLink
            to="/shopper/catalog"
            className={({ isActive }) =>
              `catalog-nav-link ${isActive ? "active" : ""}`
            }
          >
            Catalog
          </NavLink>

          <NavLink
            to="/shopper/saved-outfits"
            className={({ isActive }) =>
              `catalog-nav-link ${isActive ? "active" : ""}`
            }
          >
            Saved Outfits
          </NavLink>

          <NavLink
            to="/shopper/account"
            className={({ isActive }) =>
              `catalog-nav-link ${isActive ? "active" : ""}`
            }
          >
            Account
          </NavLink>
        </nav>

        <button
          type="button"
          className="catalog-logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>
      </aside>

      <main className="catalog-main">
        <header className="catalog-header">
          <div>
            <p className="catalog-page-number">12 — CATALOG</p>

            <p className="catalog-header-description">
              Seller-managed products with category, size, color, and
              style filters
            </p>
          </div>

          <div className="catalog-header-actions">
            <button
              type="button"
              className="catalog-cart-button"
              onClick={() => navigate("/shopper/cart")}
            >
              <span aria-hidden="true">🛒</span>
              Cart
              <span className="catalog-cart-count">4</span>
            </button>

            <div className="catalog-account-badge">
              <div className="catalog-avatar">KS</div>

              <div>
                <span>REGISTERED SHOPPER</span>
                <strong>Karol Shopper</strong>
              </div>
            </div>
          </div>
        </header>

        <section className="catalog-content">
          <div className="catalog-title-row">
            <div>
              <p className="catalog-eyebrow">DISCOVER YOUR STYLE</p>
              <h1>Browse the catalog</h1>
              <p className="catalog-introduction">
                Explore products uploaded by verified FitFusion sellers.
                Open a product to view its seller, rating, reviews, and
                available sizes.
              </p>
            </div>

            <p className="catalog-result-count">
              {filteredProducts.length}{" "}
              {filteredProducts.length === 1 ? "product" : "products"}
            </p>
          </div>

          <div className="catalog-workspace">
            <form
              className="catalog-filter-panel"
              onSubmit={applyFilters}
            >
              <div className="catalog-filter-heading">
                <div>
                  <p>FILTER CATALOG</p>
                  <span>Refine the products shown</span>
                </div>
              </div>

              <label className="catalog-filter-field">
                <span>Category</span>

                <select
                  name="category"
                  value={draftFilters.category}
                  onChange={handleFilterChange}
                >
                  <option value="">All categories</option>
                  <option value="Tops">Tops</option>
                  <option value="Bottoms">Bottoms</option>
                  <option value="Dresses">Dresses</option>
                  <option value="Outerwear">Outerwear</option>
                  <option value="Footwear">Footwear</option>
                </select>
              </label>

              <label className="catalog-filter-field">
                <span>Size</span>

                <select
                  name="size"
                  value={draftFilters.size}
                  onChange={handleFilterChange}
                >
                  <option value="">All sizes</option>
                  <option value="S">S</option>
                  <option value="M">M</option>
                  <option value="L">L</option>
                  <option value="XL">XL</option>
                  <option value="2XL">2XL</option>
                </select>
              </label>

              <label className="catalog-filter-field">
                <span>Color</span>

                <select
                  name="color"
                  value={draftFilters.color}
                  onChange={handleFilterChange}
                >
                  <option value="">All colors</option>
                  <option value="Black">Black</option>
                  <option value="Brown">Brown</option>
                  <option value="Camel">Camel</option>
                  <option value="Cream">Cream</option>
                  <option value="Gold">Gold</option>
                  <option value="White">White</option>
                </select>
              </label>

              <label className="catalog-filter-field">
                <span>Style</span>

                <select
                  name="style"
                  value={draftFilters.style}
                  onChange={handleFilterChange}
                >
                  <option value="">All styles</option>
                  <option value="Casual">Casual</option>
                  <option value="Classic">Classic</option>
                  <option value="Elegant">Elegant</option>
                  <option value="Minimal">Minimal</option>
                </select>
              </label>

              <button
                type="submit"
                className="catalog-apply-button"
              >
                Apply Filters
              </button>

              <button
                type="button"
                className="catalog-reset-button"
                onClick={resetFilters}
              >
                Reset
              </button>

              <div className="catalog-category-note">
                <strong>Categories</strong>
                <span>Tops • Bottoms • Dresses</span>
                <span>Outerwear • Footwear</span>
              </div>
            </form>

            <section className="catalog-products-section">
              {filteredProducts.length > 0 ? (
                <div className="catalog-product-grid">
                  {filteredProducts.map((product) => (
                    <article
                      className="catalog-product-card"
                      key={product.id}
                    >
                      <button
                        type="button"
                        className="catalog-product-image-button"
                        onClick={() =>
                          navigate(`/shopper/products/${product.id}`)
                        }
                        aria-label={`View ${product.name}`}
                      >
                        <div
                          className="catalog-product-art"
                          style={{
                            "--product-color": product.productColor,
                          }}
                        >
                          <div
                            className={`catalog-garment catalog-garment-${product.art}`}
                          />

                          <span>{product.category}</span>
                        </div>
                      </button>

                      <div className="catalog-product-information">
                        <p className="catalog-store-name">
                          {product.store}
                        </p>

                        <h2>{product.name}</h2>

                        <div className="catalog-rating-row">
                          <span className="catalog-stars">
                            ★★★★★
                          </span>

                          <span>
                            {product.rating} ({product.reviews})
                          </span>
                        </div>

                        <p className="catalog-product-price">
                          ₱{product.price.toLocaleString()}
                        </p>

                        <p className="catalog-product-options">
                          {product.colors.join(" • ")} · {product.style}
                        </p>

                        <div className="catalog-product-buttons">
                          <button
                            type="button"
                            className="catalog-details-button"
                            onClick={() =>
                              navigate(
                                `/shopper/products/${product.id}`
                              )
                            }
                          >
                            View Details
                          </button>

                          <button
                            type="button"
                            className="catalog-try-button"
                            onClick={() =>
                              navigate("/shopper/fitting-studio", {
                                state: {
                                  selectedProductId: product.id,
                                  selectedProduct: product.name,
                                },
                              })
                            }
                          >
                            Try On
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="catalog-empty-state">
                  <div aria-hidden="true">◇</div>
                  <h2>No products found</h2>
                  <p>
                    Try changing or resetting your catalog filters.
                  </p>

                  <button type="button" onClick={resetFilters}>
                    Reset Filters
                  </button>
                </div>
              )}
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}

export default CatalogPage;