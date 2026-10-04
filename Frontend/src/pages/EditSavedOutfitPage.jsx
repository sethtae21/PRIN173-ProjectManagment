import { useEffect, useMemo, useState } from "react";
import {
  NavLink,
  useNavigate,
  useParams,
} from "react-router-dom";

import fitFusionLogo from "../assets/fitfusion-logo.svg";
import "./css/EditSavedOutfitPage.css";

const defaultOutfit = {
  id: "outfit-1",
  name: "Weekend Casual",
  occasion: "Casual",
  description:
    "A comfortable outfit prepared for casual events and weekend activities.",
  avatarView: "front",
  createdAt: new Date().toISOString(),
  products: [
    {
      id: "product-1",
      name: "Classic Beige Top",
      seller: "Luna Clothing",
      category: "Top",
      size: "M",
      color: "Beige",
      quantity: 1,
      price: 699,
      image: "",
    },
    {
      id: "product-2",
      name: "High-Waist Denim Pants",
      seller: "Urban Threads",
      category: "Bottom",
      size: "M",
      color: "Blue",
      quantity: 1,
      price: 899,
      image: "",
    },
  ],
};

const avatarViews = [
  {
    id: "front",
    label: "Front",
  },
  {
    id: "side",
    label: "Side",
  },
  {
    id: "rear",
    label: "Rear",
  },
];

const occasionOptions = [
  "Casual",
  "Formal",
  "Business",
  "Party",
  "School",
  "Travel",
  "Sports",
  "Other",
];

const sizeOptions = [
  "XXS",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "2XL",
];

function getStoredItems(key) {
  try {
    const storedValue = localStorage.getItem(key);

    if (!storedValue) {
      return [];
    }

    const parsedValue = JSON.parse(storedValue);

    return Array.isArray(parsedValue)
      ? parsedValue
      : [];
  } catch {
    return [];
  }
}

function normalizeProduct(product, index) {
  return {
    id:
      product?.id ||
      product?.productId ||
      `outfit-product-${index + 1}`,
    name:
      product?.name ||
      product?.productName ||
      product?.title ||
      `Garment ${index + 1}`,
    seller:
      product?.seller ||
      product?.sellerName ||
      product?.storeName ||
      "FitFusion Seller",
    category:
      product?.category ||
      product?.type ||
      "Clothing",
    size:
      product?.size ||
      product?.selectedSize ||
      "M",
    color:
      product?.color ||
      product?.selectedColor ||
      "Default",
    quantity: Number(product?.quantity) || 1,
    price: Number(product?.price) || 0,
    image:
      product?.image ||
      product?.imageUrl ||
      product?.thumbnail ||
      "",
  };
}

function normalizeOutfit(outfit) {
  const products =
    outfit?.products ||
    outfit?.items ||
    outfit?.garments ||
    [];

  return {
    id:
      outfit?.id ||
      outfit?.outfitId ||
      `outfit-${Date.now()}`,
    name:
      outfit?.name ||
      outfit?.outfitName ||
      "Saved Outfit",
    occasion:
      outfit?.occasion ||
      outfit?.style ||
      "Casual",
    description:
      outfit?.description ||
      outfit?.notes ||
      "",
    avatarView:
      outfit?.avatarView ||
      outfit?.view ||
      "front",
    createdAt:
      outfit?.createdAt ||
      new Date().toISOString(),
    products: Array.isArray(products)
      ? products.map(normalizeProduct)
      : [],
  };
}

function EditSavedOutfitPage() {
  const navigate = useNavigate();
  const { outfitId } = useParams();

  const [outfit, setOutfit] =
    useState(defaultOutfit);

  const [originalOutfit, setOriginalOutfit] =
    useState(defaultOutfit);

  const [selectedView, setSelectedView] =
    useState("front");

  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState(null);

  useEffect(() => {
    const savedOutfits = getStoredItems(
      "fitfusion-saved-outfits"
    );

    const selectedOutfit = savedOutfits.find(
      (savedOutfit) =>
        String(
          savedOutfit.id ||
            savedOutfit.outfitId
        ) === String(outfitId)
    );

    let editingOutfit = null;

    try {
      const storedEditingOutfit =
        localStorage.getItem(
          "fitfusion-editing-outfit"
        );

      if (storedEditingOutfit) {
        editingOutfit = JSON.parse(
          storedEditingOutfit
        );
      }
    } catch {
      editingOutfit = null;
    }

    const resolvedOutfit = normalizeOutfit(
      selectedOutfit ||
        editingOutfit ||
        {
          ...defaultOutfit,
          id:
            outfitId ||
            defaultOutfit.id,
        }
    );

    setOutfit(resolvedOutfit);
    setOriginalOutfit(resolvedOutfit);
    setSelectedView(
      resolvedOutfit.avatarView || "front"
    );

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, [outfitId]);

  const cartCount = useMemo(() => {
    const cartItems = getStoredItems(
      "fitfusion-cart-items"
    );

    return cartItems.reduce(
      (total, item) =>
        total +
        (Number(item.quantity) || 1),
      0
    );
  }, []);

  const outfitTotal = useMemo(() => {
    return outfit.products.reduce(
      (total, product) =>
        total +
        product.price * product.quantity,
      0
    );
  }, [outfit.products]);

  const hasChanges = useMemo(() => {
    return (
      JSON.stringify(outfit) !==
        JSON.stringify(originalOutfit) ||
      selectedView !==
        originalOutfit.avatarView
    );
  }, [
    outfit,
    originalOutfit,
    selectedView,
  ]);

  function updateOutfitField(event) {
    const { name, value } = event.target;

    setOutfit((currentOutfit) => ({
      ...currentOutfit,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        [name]: "",
      }));
    }

    setNotice("");
  }

  function updateProduct(
    productId,
    field,
    value
  ) {
    setOutfit((currentOutfit) => ({
      ...currentOutfit,
      products:
        currentOutfit.products.map(
          (product) =>
            product.id === productId
              ? {
                  ...product,
                  [field]:
                    field === "quantity"
                      ? Math.max(
                          1,
                          Number(value) || 1
                        )
                      : value,
                }
              : product
        ),
    }));

    setNotice("");
  }

  function removeProduct(productId) {
    setOutfit((currentOutfit) => ({
      ...currentOutfit,
      products:
        currentOutfit.products.filter(
          (product) =>
            product.id !== productId
        ),
    }));

    setNotice(
      "The garment was removed from this outfit."
    );
  }

  function validateOutfit() {
    const validationErrors = {};

    if (!outfit.name.trim()) {
      validationErrors.name =
        "Please enter an outfit name.";
    }

    if (!outfit.occasion) {
      validationErrors.occasion =
        "Please select an occasion.";
    }

    if (outfit.products.length === 0) {
      validationErrors.products =
        "Add at least one garment before saving.";
    }

    setErrors(validationErrors);

    return (
      Object.keys(validationErrors).length ===
      0
    );
  }

  function saveOutfit() {
    if (!validateOutfit()) {
      setNotice(
        "Please correct the highlighted fields."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    const updatedOutfit = {
      ...outfit,
      avatarView: selectedView,
      updatedAt: new Date().toISOString(),
    };

    const savedOutfits = getStoredItems(
      "fitfusion-saved-outfits"
    );

    const existingIndex =
      savedOutfits.findIndex(
        (savedOutfit) =>
          String(
            savedOutfit.id ||
              savedOutfit.outfitId
          ) === String(updatedOutfit.id)
      );

    let updatedOutfits;

    if (existingIndex >= 0) {
      updatedOutfits = savedOutfits.map(
        (savedOutfit, index) =>
          index === existingIndex
            ? updatedOutfit
            : savedOutfit
      );
    } else {
      updatedOutfits = [
        ...savedOutfits,
        updatedOutfit,
      ];
    }

    localStorage.setItem(
      "fitfusion-saved-outfits",
      JSON.stringify(updatedOutfits)
    );

    localStorage.setItem(
      "fitfusion-editing-outfit",
      JSON.stringify(updatedOutfit)
    );

    setOriginalOutfit(updatedOutfit);
    setOutfit(updatedOutfit);
    setNotice("Outfit changes saved.");

    setTimeout(() => {
      navigate("/shopper/saved-outfits");
    }, 700);
  }

  function confirmDiscard() {
    setOutfit(originalOutfit);
    setSelectedView(
      originalOutfit.avatarView || "front"
    );
    setErrors({});
    setNotice(
      "Your unsaved changes were discarded."
    );
    setModal(null);
  }

  function deleteOutfit() {
    const savedOutfits = getStoredItems(
      "fitfusion-saved-outfits"
    );

    const remainingOutfits =
      savedOutfits.filter(
        (savedOutfit) =>
          String(
            savedOutfit.id ||
              savedOutfit.outfitId
          ) !== String(outfit.id)
      );

    localStorage.setItem(
      "fitfusion-saved-outfits",
      JSON.stringify(remainingOutfits)
    );

    localStorage.removeItem(
      "fitfusion-editing-outfit"
    );

    navigate("/shopper/saved-outfits");
  }

  function leavePage() {
    if (hasChanges) {
      setModal("discard");
      return;
    }

    navigate("/shopper/saved-outfits");
  }

  function handleLogout() {
    setModal("logout");
  }

  function confirmLogout() {
    sessionStorage.removeItem("userRole");
    sessionStorage.removeItem("userEmail");
    localStorage.removeItem(
      "fitfusion-current-user"
    );

    navigate("/login");
  }

  return (
    <main className="edit-outfit-page">
      <aside className="shopper-sidebar">
        <div className="shopper-sidebar-logo">
          <img
            src={fitFusionLogo}
            alt="FitFusion AI"
          />
        </div>

        <nav className="shopper-navigation">
          <NavLink
            to="/shopper/dashboard"
            className="shopper-nav-link"
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/shopper/fitting-studio"
            className="shopper-nav-link"
          >
            Fitting Studio
          </NavLink>

          <NavLink
            to="/shopper/avatar-presets"
            className="shopper-nav-link"
          >
            Avatar Presets
          </NavLink>

          <NavLink
            to="/shopper/catalog"
            className="shopper-nav-link"
          >
            Catalog
          </NavLink>

          <NavLink
            to="/shopper/saved-outfits"
            className={() =>
              "shopper-nav-link active"
            }
          >
            Saved Outfits
          </NavLink>

          <NavLink
            to="/shopper/orders"
            className="shopper-nav-link"
          >
            Order History
          </NavLink>

          <NavLink
            to="/shopper/account"
            className="shopper-nav-link"
          >
            Account
          </NavLink>
        </nav>

        <button
          type="button"
          className="shopper-logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>
      </aside>

      <section className="edit-outfit-content">
        <header className="edit-outfit-header">
          <div>
            <button
              type="button"
              className="edit-outfit-back-button"
              onClick={leavePage}
            >
              ← Back to Saved Outfits
            </button>

            <h1>Edit Saved Outfit</h1>

            <p>
              Update your outfit details and
              selected garments.
            </p>
          </div>

          <div className="edit-outfit-header-actions">
            <button
              type="button"
              className="edit-outfit-cart-button"
              onClick={() =>
                navigate("/shopper/cart")
              }
              aria-label={`Open shopping cart with ${cartCount} items`}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 7H6" />

                <circle
                  cx="10"
                  cy="20"
                  r="1"
                />

                <circle
                  cx="18"
                  cy="20"
                  r="1"
                />
              </svg>

              <span>{cartCount}</span>
            </button>

            <div className="edit-outfit-role">
              REGISTERED SHOPPER
            </div>
          </div>
        </header>

        <div className="edit-outfit-body">
          {notice && (
            <div
              className="edit-outfit-notice"
              role="status"
            >
              {notice}
            </div>
          )}

          <section className="edit-outfit-introduction">
            <div>
              <p>OUTFIT EDITOR</p>

              <h2>
                Refine your saved look
              </h2>

              <span>
                Change the outfit details,
                garments, sizes, colors, and
                quantities before saving.
              </span>
            </div>

            <div className="edit-outfit-unsaved-status">
              <span
                className={
                  hasChanges
                    ? "status-dot changed"
                    : "status-dot"
                }
              />

              {hasChanges
                ? "Unsaved changes"
                : "All changes saved"}
            </div>
          </section>

          <div className="edit-outfit-layout">
            <section className="edit-outfit-preview-card">
              <div className="edit-outfit-card-heading">
                <div>
                  <p>2D AVATAR PREVIEW</p>
                  <h2>{outfit.name}</h2>
                </div>

                <span>
                  {selectedView.toUpperCase()}
                </span>
              </div>

              <div
                className={`edit-outfit-avatar-preview ${selectedView}`}
              >
                <div className="edit-avatar-head" />
                <div className="edit-avatar-neck" />

                <div className="edit-avatar-body">
                  <div className="edit-avatar-top">
                    {outfit.products[0]?.name ||
                      "No top selected"}
                  </div>

                  <div className="edit-avatar-bottom">
                    {outfit.products[1]?.name ||
                      outfit.products[0]
                        ?.name ||
                      "No bottom selected"}
                  </div>
                </div>

                <div className="edit-avatar-legs">
                  <span />
                  <span />
                </div>
              </div>

              <div className="edit-outfit-view-buttons">
                {avatarViews.map((view) => (
                  <button
                    key={view.id}
                    type="button"
                    className={
                      selectedView === view.id
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setSelectedView(view.id)
                    }
                  >
                    {view.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="edit-outfit-studio-button"
                onClick={() => {
                  localStorage.setItem(
                    "fitfusion-active-outfit",
                    JSON.stringify(outfit)
                  );

                  navigate(
                    "/shopper/fitting-studio/customize"
                  );
                }}
              >
                Open in Fitting Studio
              </button>
            </section>

            <div className="edit-outfit-editor-column">
              <section className="edit-outfit-form-card">
                <div className="edit-outfit-section-heading">
                  <div>
                    <p>OUTFIT INFORMATION</p>
                    <h2>Basic details</h2>
                  </div>

                  <span>
                    Fields marked * are required
                  </span>
                </div>

                <div className="edit-outfit-form-grid">
                  <label className="edit-outfit-field">
                    <span>Outfit Name *</span>

                    <input
                      type="text"
                      name="name"
                      value={outfit.name}
                      onChange={
                        updateOutfitField
                      }
                      className={
                        errors.name
                          ? "input-error"
                          : ""
                      }
                      placeholder="Enter an outfit name"
                      maxLength={50}
                    />

                    <small>
                      {outfit.name.length}/50
                    </small>

                    {errors.name && (
                      <em>{errors.name}</em>
                    )}
                  </label>

                  <label className="edit-outfit-field">
                    <span>Occasion *</span>

                    <select
                      name="occasion"
                      value={outfit.occasion}
                      onChange={
                        updateOutfitField
                      }
                      className={
                        errors.occasion
                          ? "input-error"
                          : ""
                      }
                    >
                      <option value="">
                        Select occasion
                      </option>

                      {occasionOptions.map(
                        (occasion) => (
                          <option
                            key={occasion}
                            value={occasion}
                          >
                            {occasion}
                          </option>
                        )
                      )}
                    </select>

                    {errors.occasion && (
                      <em>
                        {errors.occasion}
                      </em>
                    )}
                  </label>

                  <label className="edit-outfit-field full-width">
                    <span>
                      Description or Notes
                    </span>

                    <textarea
                      name="description"
                      value={
                        outfit.description
                      }
                      onChange={
                        updateOutfitField
                      }
                      placeholder="Describe the outfit, styling choices, or where you plan to wear it."
                      maxLength={250}
                      rows={4}
                    />

                    <small>
                      {
                        outfit.description
                          .length
                      }
                      /250
                    </small>
                  </label>
                </div>
              </section>

              <section className="edit-outfit-products-card">
                <div className="edit-outfit-section-heading">
                  <div>
                    <p>SELECTED GARMENTS</p>

                    <h2>
                      {outfit.products.length}{" "}
                      {outfit.products.length ===
                      1
                        ? "item"
                        : "items"}
                    </h2>
                  </div>

                  <button
                    type="button"
                    className="edit-outfit-add-product"
                    onClick={() => {
                      localStorage.setItem(
                        "fitfusion-editing-outfit",
                        JSON.stringify({
                          ...outfit,
                          avatarView:
                            selectedView,
                        })
                      );

                      navigate(
                        "/shopper/catalog"
                      );
                    }}
                  >
                    + Add Garment
                  </button>
                </div>

                {errors.products && (
                  <p className="edit-outfit-products-error">
                    {errors.products}
                  </p>
                )}

                {outfit.products.length > 0 ? (
                  <div className="edit-outfit-products-list">
                    {outfit.products.map(
                      (product, index) => (
                        <article
                          key={product.id}
                          className="edit-outfit-product"
                        >
                          <div className="edit-outfit-product-image">
                            {product.image ? (
                              <img
                                src={
                                  product.image
                                }
                                alt={
                                  product.name
                                }
                              />
                            ) : (
                              <span>
                                {product.category
                                  .slice(0, 1)
                                  .toUpperCase()}
                              </span>
                            )}

                            <small>
                              {index + 1}
                            </small>
                          </div>

                          <div className="edit-outfit-product-information">
                            <span>
                              {product.seller}
                            </span>

                            <h3>
                              {product.name}
                            </h3>

                            <p>
                              {product.category}
                            </p>

                            <strong>
                              ₱
                              {product.price.toLocaleString(
                                "en-PH"
                              )}
                            </strong>
                          </div>

                          <div className="edit-outfit-product-options">
                            <label>
                              <span>Size</span>

                              <select
                                value={
                                  product.size
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateProduct(
                                    product.id,
                                    "size",
                                    event.target
                                      .value
                                  )
                                }
                              >
                                {sizeOptions.map(
                                  (size) => (
                                    <option
                                      key={size}
                                      value={size}
                                    >
                                      {size}
                                    </option>
                                  )
                                )}
                              </select>
                            </label>

                            <label>
                              <span>Color</span>

                              <input
                                type="text"
                                value={
                                  product.color
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateProduct(
                                    product.id,
                                    "color",
                                    event.target
                                      .value
                                  )
                                }
                                maxLength={25}
                              />
                            </label>

                            <label>
                              <span>
                                Quantity
                              </span>

                              <div className="edit-outfit-quantity">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateProduct(
                                      product.id,
                                      "quantity",
                                      product.quantity -
                                        1
                                    )
                                  }
                                  disabled={
                                    product.quantity <=
                                    1
                                  }
                                >
                                  −
                                </button>

                                <strong>
                                  {
                                    product.quantity
                                  }
                                </strong>

                                <button
                                  type="button"
                                  onClick={() =>
                                    updateProduct(
                                      product.id,
                                      "quantity",
                                      product.quantity +
                                        1
                                    )
                                  }
                                >
                                  +
                                </button>
                              </div>
                            </label>
                          </div>

                          <button
                            type="button"
                            className="edit-outfit-remove-product"
                            onClick={() =>
                              removeProduct(
                                product.id
                              )
                            }
                            aria-label={`Remove ${product.name}`}
                          >
                            Remove
                          </button>
                        </article>
                      )
                    )}
                  </div>
                ) : (
                  <div className="edit-outfit-empty-products">
                    <div>＋</div>

                    <h3>
                      No garments in this outfit
                    </h3>

                    <p>
                      Browse the catalog and add
                      at least one garment.
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          "/shopper/catalog"
                        )
                      }
                    >
                      Browse Catalog
                    </button>
                  </div>
                )}
              </section>

              <section className="edit-outfit-summary">
                <div>
                  <span>
                    Estimated outfit total
                  </span>

                  <strong>
                    ₱
                    {outfitTotal.toLocaleString(
                      "en-PH"
                    )}
                  </strong>
                </div>

                <p>
                  Product availability, prices,
                  and sizes are supplied by each
                  seller.
                </p>
              </section>

              <div className="edit-outfit-actions">
                <button
                  type="button"
                  className="edit-outfit-delete-button"
                  onClick={() =>
                    setModal("delete")
                  }
                >
                  Delete Outfit
                </button>

                <div>
                  <button
                    type="button"
                    className="edit-outfit-cancel-button"
                    onClick={leavePage}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="edit-outfit-save-button"
                    onClick={saveOutfit}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {modal && (
        <div
          className="edit-outfit-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setModal(null);
            }
          }}
        >
          <section
            className="edit-outfit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-outfit-modal-title"
          >
            {modal === "discard" && (
              <>
                <div className="edit-outfit-modal-icon">
                  !
                </div>

                <h2 id="edit-outfit-modal-title">
                  Discard changes?
                </h2>

                <p>
                  Your latest outfit changes
                  have not been saved.
                </p>

                <div className="edit-outfit-modal-actions">
                  <button
                    type="button"
                    className="modal-secondary-button"
                    onClick={() =>
                      setModal(null)
                    }
                  >
                    Continue Editing
                  </button>

                  <button
                    type="button"
                    className="modal-primary-button"
                    onClick={confirmDiscard}
                  >
                    Discard Changes
                  </button>
                </div>
              </>
            )}

            {modal === "delete" && (
              <>
                <div className="edit-outfit-modal-icon danger">
                  ×
                </div>

                <h2 id="edit-outfit-modal-title">
                  Delete this outfit?
                </h2>

                <p>
                  “{outfit.name}” will be
                  permanently removed from your
                  saved outfits.
                </p>

                <div className="edit-outfit-modal-actions">
                  <button
                    type="button"
                    className="modal-secondary-button"
                    onClick={() =>
                      setModal(null)
                    }
                  >
                    Keep Outfit
                  </button>

                  <button
                    type="button"
                    className="modal-danger-button"
                    onClick={deleteOutfit}
                  >
                    Delete Outfit
                  </button>
                </div>
              </>
            )}

            {modal === "logout" && (
              <>
                <div className="edit-outfit-modal-icon">
                  ↪
                </div>

                <h2 id="edit-outfit-modal-title">
                  Log out?
                </h2>

                <p>
                  Unsaved changes may be lost
                  when you leave your account.
                </p>

                <div className="edit-outfit-modal-actions">
                  <button
                    type="button"
                    className="modal-secondary-button"
                    onClick={() =>
                      setModal(null)
                    }
                  >
                    Stay
                  </button>

                  <button
                    type="button"
                    className="modal-primary-button"
                    onClick={confirmLogout}
                  >
                    Logout
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

export default EditSavedOutfitPage;