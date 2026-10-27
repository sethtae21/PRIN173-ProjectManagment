
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AvatarCanvas from "./Shopper/AvatarCanvas";
import "./css/EditSavedOutfitPage.css";

const OUTFITS_KEY = "fitfusion-saved-outfits";
const CART_KEY = "fitfusion-cart";
const EDITING_KEY = "fitfusion-editing-outfit";

const VIEWS = ["front", "side", "rear"];

const OCCASIONS = [
  "Casual",
  "Formal",
  "Business",
  "Party",
  "School",
  "Travel",
  "Sports",
  "Other",
];

const SIZES = [
  "XXS",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "2XL",
];

const DEFAULT_AVATAR = {
  gender: "Female",
  height: 165,
  weight: 58,
  skinTone: "#d9aa82",
  undertone: "Neutral",
  shoulder: "Average",
  waist: "Average",
  hip: "Average",
  thigh: "Average",
  cupSize: "B",
};

function readArray(key) {
  try {
    const value = JSON.parse(
      localStorage.getItem(key) || "[]"
    );

    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function normalizeProduct(item, index) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const selectedSize =
    item.selectedSize || item.size || "M";

  return {
    ...item,

    id: String(
      item.id ||
        item.productId ||
        `garment-${index}`
    ),

    name: String(
      item.name ||
        item.productName ||
        item.title ||
        `Garment ${index + 1}`
    ),

    seller: String(
      item.seller ||
        item.store ||
        item.sellerName ||
        "Seller unavailable"
    ),

    category: String(
      item.category ||
        item.type ||
        "Clothing"
    ),

    selectedSize,
    size: selectedSize,

    color: String(
      item.color ||
        item.selectedColor ||
        "Default"
    ),

    quantity: Math.max(
      1,
      Math.floor(Number(item.quantity) || 1)
    ),

    price: Math.max(
      0,
      Number(item.price) || 0
    ),

    image:
      item.image ||
      item.imageUrl ||
      item.thumbnail ||
      "",
  };
}

function normalizeOutfit(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const items = Array.isArray(raw.products)
    ? raw.products
    : Array.isArray(raw.items)
      ? raw.items
      : [];

  const savedAvatar =
    raw.avatar &&
    typeof raw.avatar === "object"
      ? raw.avatar
      : {};

  const requestedView = String(
    raw.avatarView || raw.view || "front"
  ).toLowerCase();

  return {
    ...raw,

    id: String(
      raw.id ||
        raw.outfitId ||
        ""
    ),

    name: String(
      raw.name ||
        raw.outfitName ||
        "Saved Outfit"
    ),

    occasion: String(
      raw.occasion || "Casual"
    ),

    description: String(
      raw.description ||
        raw.notes ||
        ""
    ),

    avatarView: VIEWS.includes(requestedView)
      ? requestedView
      : "front",

    avatar: {
      ...DEFAULT_AVATAR,
      ...savedAvatar,

      gender:
        savedAvatar.gender ||
        raw.gender ||
        DEFAULT_AVATAR.gender,

      skinTone:
        savedAvatar.skinTone ||
        raw.skinTone ||
        DEFAULT_AVATAR.skinTone,
    },

    products: items
      .map(normalizeProduct)
      .filter(Boolean),
  };
}

function getCartCount() {
  return readArray(CART_KEY).reduce(
    (sum, item) =>
      sum +
      Math.max(
        1,
        Number(item.quantity) || 1
      ),
    0
  );
}

function getSlot(item) {
  const text = `${
    item.category || ""
  } ${item.name || ""}`.toLowerCase();

  if (/dress|gown|jumpsuit/.test(text)) {
    return "dress";
  }

  if (
    /outer|jacket|coat|blazer|cardigan/.test(
      text
    )
  ) {
    return "outerwear";
  }

  if (
    /shoe|footwear|sneaker|boot|sandal/.test(
      text
    )
  ) {
    return "shoes";
  }

  if (
    /bottom|pant|trouser|jean|skirt|short/.test(
      text
    )
  ) {
    return "bottom";
  }

  if (
    /top|shirt|blouse|sweater|hoodie|polo/.test(
      text
    )
  ) {
    return "top";
  }

  return null;
}

function makeEquippedItems(products) {
  const result = {};

  products.forEach((product) => {
    const slot = getSlot(product);

    if (slot) {
      result[slot] = product;
    }
  });

  return result;
}

function money(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function CartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 7H6" />
      <circle cx="10" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
    </svg>
  );
}

export default function EditSavedOutfitPage() {
  const navigate = useNavigate();

  const { outfitId } = useParams();

  const [outfit, setOutfit] = useState(null);

  const [original, setOriginal] =
    useState(null);

  const [view, setView] =
    useState("front");

  const [cartCount, setCartCount] =
    useState(getCartCount);

  const [errors, setErrors] =
    useState({});

  const [modal, setModal] =
    useState(null);

  const [notice, setNotice] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  // ============================================
  // LOAD SAVED OUTFIT
  // ============================================

  useEffect(() => {
    const stored = readArray(OUTFITS_KEY);

    const found = stored.find(
      (item) =>
        String(
          item.id || item.outfitId
        ) === String(outfitId)
    );

    const resolved = found
      ? normalizeOutfit(found)
      : null;

    setOutfit(resolved);

    setOriginal(
      resolved
        ? structuredClone(resolved)
        : null
    );

    setView(
      resolved?.avatarView || "front"
    );

    setErrors({});
    setNotice("");
    setLoading(false);

    window.scrollTo(0, 0);
  }, [outfitId]);

  // ============================================
  // CART COUNT
  // ============================================

  useEffect(() => {
    const update = () => {
      setCartCount(getCartCount());
    };

    window.addEventListener(
      "storage",
      update
    );

    window.addEventListener(
      "fitfusion-cart-updated",
      update
    );

    return () => {
      window.removeEventListener(
        "storage",
        update
      );

      window.removeEventListener(
        "fitfusion-cart-updated",
        update
      );
    };
  }, []);

  // ============================================
  // NOTIFICATION
  // ============================================

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timer = window.setTimeout(
      () => setNotice(""),
      3500
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [notice]);

  // ============================================
  // LIVE AVATAR LAYERS
  // ============================================

  const layers = useMemo(
    () =>
      makeEquippedItems(
        outfit?.products || []
      ),
    [outfit?.products]
  );

  // ============================================
  // TOTAL
  // ============================================

  const total = useMemo(
    () =>
      (outfit?.products || []).reduce(
        (sum, product) =>
          sum +
          product.price *
            product.quantity,
        0
      ),
    [outfit?.products]
  );

  // ============================================
  // UNSAVED CHANGES
  // ============================================

  const hasChanges = Boolean(
    outfit &&
      original &&
      (
        JSON.stringify(outfit) !==
          JSON.stringify(original) ||
        view !== original.avatarView
      )
  );

  // ============================================
  // UPDATE BASIC INFORMATION
  // ============================================

  function updateField(event) {
    const { name, value } = event.target;

    setOutfit((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: "",
    }));
  }

  // ============================================
  // UPDATE CLOTHING
  // ============================================

  function updateProduct(index, changes) {
    setOutfit((current) => ({
      ...current,

      products: current.products.map(
        (product, i) =>
          i === index
            ? {
                ...product,
                ...changes,
              }
            : product
      ),
    }));

    setErrors((current) => ({
      ...current,
      products: "",
    }));
  }

  // ============================================
  // REMOVE CLOTHING
  // ============================================

  function removeProduct(index) {
    setOutfit((current) => ({
      ...current,

      products: current.products.filter(
        (_, i) => i !== index
      ),
    }));
  }

  // ============================================
  // VALIDATION
  // ============================================

  function validate() {
    const next = {};

    const trimmedName =
      outfit.name.trim();

    if (!trimmedName) {
      next.name =
        "Please enter an outfit name.";
    } else if (
      trimmedName.length < 3
    ) {
      next.name =
        "Use at least 3 characters.";
    } else if (
      trimmedName.length > 50
    ) {
      next.name =
        "Use 50 characters or fewer.";
    }

    if (!outfit.occasion) {
      next.occasion =
        "Please select an occasion.";
    }

    if (!outfit.products.length) {
      next.products =
        "Add at least one garment before saving.";
    }

    const duplicate = readArray(
      OUTFITS_KEY
    ).some(
      (item) =>
        String(
          item.id || item.outfitId
        ) !== outfit.id &&
        String(
          item.name ||
            item.outfitName ||
            ""
        )
          .trim()
          .toLowerCase() ===
          trimmedName.toLowerCase()
    );

    if (duplicate) {
      next.name =
        "An outfit with this name already exists.";
    }

    setErrors(next);

    return (
      Object.keys(next).length === 0
    );
  }

  // ============================================
  // SAVE CHANGES
  // ============================================

  function saveOutfit() {
    if (!outfit || !validate()) {
      setNotice(
        "Please correct the highlighted fields."
      );

      return;
    }

    const updatedProducts =
      outfit.products.map((item) => ({
        ...item,
        selectedSize: item.size,
      }));

    const nextOutfit = {
      ...outfit,

      name: outfit.name.trim(),

      description:
        outfit.description.trim(),

      avatarView: view,

      products: updatedProducts,

      items: updatedProducts.map(
        (item) => ({ ...item })
      ),

      updatedAt:
        new Date().toISOString(),
    };

    try {
      const all = readArray(
        OUTFITS_KEY
      );

      const index = all.findIndex(
        (item) =>
          String(
            item.id || item.outfitId
          ) === outfit.id
      );

      if (index === -1) {
        setNotice(
          "This outfit no longer exists in your saved collection."
        );

        return;
      }

      all[index] = nextOutfit;

      localStorage.setItem(
        OUTFITS_KEY,
        JSON.stringify(all)
      );

      localStorage.removeItem(
        EDITING_KEY
      );

      window.dispatchEvent(
        new Event(
          "fitfusion-outfits-updated"
        )
      );

      navigate(
        "/shopper/saved-outfits"
      );
    } catch {
      setNotice(
        "Unable to save your changes. Please try again."
      );
    }
  }

  // ============================================
  // DELETE OUTFIT
  // ============================================

  function deleteOutfit() {
    if (!outfit) {
      return;
    }

    try {
      const remaining = readArray(
        OUTFITS_KEY
      ).filter(
        (item) =>
          String(
            item.id || item.outfitId
          ) !== outfit.id
      );

      localStorage.setItem(
        OUTFITS_KEY,
        JSON.stringify(remaining)
      );

      localStorage.removeItem(
        EDITING_KEY
      );

      window.dispatchEvent(
        new Event(
          "fitfusion-outfits-updated"
        )
      );

      navigate(
        "/shopper/saved-outfits"
      );
    } catch {
      setModal(null);

      setNotice(
        "Unable to delete this outfit. Please try again."
      );
    }
  }

  // ============================================
  // LEAVE PAGE
  // ============================================

  function leavePage() {
    if (hasChanges) {
      setModal("discard");
    } else {
      navigate(
        "/shopper/saved-outfits"
      );
    }
  }

  // ============================================
  // OPEN FITTING STUDIO
  // ============================================

  function openFittingStudio() {
    if (hasChanges) {
      setNotice(
        "Save your changes before opening Fitting Studio."
      );

      return;
    }

    localStorage.setItem(
      "fitfusion-active-outfit",
      JSON.stringify(outfit)
    );

    navigate(
      "/shopper/fitting-studio/customize"
    );
  }

  // ============================================
  // OPEN CATALOG
  // ============================================

  function openCatalog() {
    if (hasChanges) {
      setNotice(
        "Save your changes before browsing the catalog."
      );

      return;
    }

    localStorage.setItem(
      EDITING_KEY,
      JSON.stringify(outfit)
    );

    navigate(
      "/shopper/catalog"
    );
  }

  // ============================================
  // LOADING
  // ============================================

  if (loading) {
    return (
      <main className="edit-outfit-page">
        <p className="edit-outfit-message">
          Loading saved outfit...
        </p>
      </main>
    );
  }

  // ============================================
  // OUTFIT NOT FOUND
  // ============================================

  if (!outfit) {
    return (
      <main className="edit-outfit-page">
        <div className="edit-outfit-not-found">
          <h1>Outfit not found</h1>

          <p>
            This outfit may have been
            deleted or is no longer in
            your saved collection.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/shopper/saved-outfits"
              )
            }
          >
            Back to Saved Outfits
          </button>
        </div>
      </main>
    );
  }

  // ============================================
  // MAIN PAGE
  // ============================================

  return (
    <main className="edit-outfit-page">

      {/* HEADER */}

      <header className="edit-outfit-header">
        <button
          type="button"
          className="edit-outfit-back-button"
          onClick={leavePage}
        >
          ← Back to Saved Outfits
        </button>

        <button
          type="button"
          className="edit-outfit-cart-button"
          onClick={() =>
            navigate("/shopper/cart")
          }
          aria-label={`Open shopping cart with ${cartCount} items`}
        >
          <CartIcon />

          <span>{cartCount}</span>
        </button>
      </header>

      {/* MAIN CONTENT */}

      <div className="edit-outfit-body">

        {notice && (
          <p
            className="edit-outfit-notice"
            role="status"
          >
            {notice}
          </p>
        )}

        {/* INTRODUCTION */}

        <div className="edit-outfit-introduction">
          <div>
            <p className="edit-outfit-eyebrow">
              OUTFIT EDITOR
            </p>

            <h1>
              Refine your saved look
            </h1>

            <p className="edit-outfit-intro-description">
              Update your outfit details and
              clothing items while previewing
              your saved 2D avatar.
            </p>
          </div>

          <span
            className={`edit-outfit-unsaved-status${
              hasChanges ? " changed" : ""
            }`}
          >
            <i aria-hidden="true" />

            {hasChanges
              ? "Unsaved changes"
              : "All changes saved"}
          </span>
        </div>

        {/* EDITOR LAYOUT */}

        <div className="edit-outfit-layout">

          {/* LEFT: AVATAR PREVIEW */}

          <section className="edit-outfit-preview-card">

            <div className="edit-outfit-card-heading">
              <div>
                <p>2D AVATAR PREVIEW</p>

                <h2>{outfit.name}</h2>
              </div>

              <span>
                {view.toUpperCase()}
              </span>
            </div>

            {/* REAL CANVAS 2D AVATAR */}

            <div className="edit-outfit-avatar-preview">
              <AvatarCanvas
                avatar={outfit.avatar}
                view={view}
                equippedItems={layers}
              />
            </div>

            {/* FRONT / SIDE / REAR */}

            <div
              className="edit-outfit-view-buttons"
              role="group"
              aria-label="Avatar viewing angle"
            >
              {VIEWS.map((angle) => (
                <button
                  key={angle}
                  type="button"
                  className={
                    view === angle
                      ? "active"
                      : ""
                  }
                  aria-pressed={
                    view === angle
                  }
                  onClick={() =>
                    setView(angle)
                  }
                >
                  {angle
                    .charAt(0)
                    .toUpperCase() +
                    angle.slice(1)}
                </button>
              ))}
            </div>

            {/* AVATAR DETAILS */}

            <div className="edit-outfit-avatar-metadata">
              <span>
                {outfit.avatar.gender}
              </span>

              <span>
                {outfit.avatar.height} cm
              </span>

              <span>
                {outfit.avatar.weight} kg
              </span>
            </div>

            <button
              type="button"
              className="edit-outfit-studio-button"
              onClick={openFittingStudio}
            >
              Open Fitting Studio
            </button>
          </section>

          {/* RIGHT: OUTFIT EDITOR */}

          <div className="edit-outfit-editor-column">

            {/* BASIC INFORMATION */}

            <section className="edit-outfit-form-card">

              <div className="edit-outfit-section-heading">
                <div>
                  <p>
                    OUTFIT INFORMATION
                  </p>

                  <h2>
                    Basic details
                  </h2>
                </div>

                <span>* Required</span>
              </div>

              <div className="edit-outfit-form-grid">

                {/* OUTFIT NAME */}

                <label className="edit-outfit-field">
                  <span>
                    Outfit Name *
                  </span>

                  <input
                    type="text"
                    name="name"
                    maxLength={50}
                    value={outfit.name}
                    className={
                      errors.name
                        ? "input-error"
                        : ""
                    }
                    onChange={updateField}
                  />

                  <small>
                    {outfit.name.length}/50
                  </small>

                  {errors.name && (
                    <em>{errors.name}</em>
                  )}
                </label>

                {/* OCCASION */}

                <label className="edit-outfit-field">
                  <span>
                    Occasion *
                  </span>

                  <select
                    name="occasion"
                    value={outfit.occasion}
                    onChange={updateField}
                  >
                    {!OCCASIONS.includes(
                      outfit.occasion
                    ) && (
                      <option
                        value={
                          outfit.occasion
                        }
                      >
                        {outfit.occasion}
                      </option>
                    )}

                    {OCCASIONS.map(
                      (option) => (
                        <option
                          key={option}
                          value={option}
                        >
                          {option}
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

                {/* DESCRIPTION */}

                <label className="edit-outfit-field full-width">
                  <span>
                    Description or Notes
                  </span>

                  <textarea
                    name="description"
                    maxLength={250}
                    rows={4}
                    value={
                      outfit.description
                    }
                    onChange={updateField}
                    placeholder="Describe your saved look..."
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

            {/* SELECTED GARMENTS */}

            <section className="edit-outfit-products-card">

              <div className="edit-outfit-section-heading">
                <div>
                  <p>
                    SELECTED GARMENTS
                  </p>

                  <h2>
                    {
                      outfit.products
                        .length
                    }{" "}
                    {
                      outfit.products
                        .length === 1
                        ? "item"
                        : "items"
                    }
                  </h2>
                </div>

                <button
                  type="button"
                  className="edit-outfit-add-product"
                  onClick={openCatalog}
                >
                  + Browse Catalog
                </button>
              </div>

              {errors.products && (
                <p className="edit-outfit-products-error">
                  {errors.products}
                </p>
              )}

              {outfit.products.length ? (
                <div className="edit-outfit-products-list">

                  {outfit.products.map(
                    (product, index) => (
                      <article
                        className="edit-outfit-product"
                        key={`${product.id}-${index}`}
                      >

                        {/* GARMENT IMAGE */}

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
                            <span aria-hidden="true">
                              ♧
                            </span>
                          )}
                        </div>

                        {/* PRODUCT DETAILS */}

                        <div className="edit-outfit-product-information">
                          <span>
                            {
                              product.seller
                            }
                          </span>

                          <h3>
                            {
                              product.name
                            }
                          </h3>

                          <p>
                            {
                              product.category
                            }
                          </p>

                          <strong>
                            {money(
                              product.price
                            )}
                          </strong>
                        </div>

                        {/* OPTIONS */}

                        <div className="edit-outfit-product-options">

                          {/* SIZE */}

                          <label>
                            <span>
                              Size
                            </span>

                            <select
                              value={
                                product.size
                              }
                              onChange={(
                                event
                              ) =>
                                updateProduct(
                                  index,
                                  {
                                    size:
                                      event
                                        .target
                                        .value,

                                    selectedSize:
                                      event
                                        .target
                                        .value,
                                  }
                                )
                              }
                            >
                              {!SIZES.includes(
                                product.size
                              ) && (
                                <option
                                  value={
                                    product.size
                                  }
                                >
                                  {
                                    product.size
                                  }
                                </option>
                              )}

                              {SIZES.map(
                                (size) => (
                                  <option
                                    key={
                                      size
                                    }
                                    value={
                                      size
                                    }
                                  >
                                    {
                                      size
                                    }
                                  </option>
                                )
                              )}
                            </select>
                          </label>

                          {/* COLOR */}

                          <label>
                            <span>
                              Color
                            </span>

                            <input
                              value={
                                product.color
                              }
                              maxLength={
                                25
                              }
                              onChange={(
                                event
                              ) =>
                                updateProduct(
                                  index,
                                  {
                                    color:
                                      event
                                        .target
                                        .value,
                                  }
                                )
                              }
                            />
                          </label>

                          {/* QUANTITY */}

                          <div className="edit-outfit-quantity-group">
                            <span>
                              Quantity
                            </span>

                            <div className="edit-outfit-quantity">
                              <button
                                type="button"
                                disabled={
                                  product.quantity <=
                                  1
                                }
                                aria-label={`Decrease ${product.name} quantity`}
                                onClick={() =>
                                  updateProduct(
                                    index,
                                    {
                                      quantity:
                                        product.quantity -
                                        1,
                                    }
                                  )
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
                                disabled={
                                  product.quantity >=
                                  99
                                }
                                aria-label={`Increase ${product.name} quantity`}
                                onClick={() =>
                                  updateProduct(
                                    index,
                                    {
                                      quantity:
                                        product.quantity +
                                        1,
                                    }
                                  )
                                }
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* REMOVE GARMENT */}

                        <button
                          type="button"
                          className="edit-outfit-remove-product"
                          onClick={() =>
                            removeProduct(
                              index
                            )
                          }
                        >
                          Remove Garment
                        </button>
                      </article>
                    )
                  )}
                </div>
              ) : (
                <div className="edit-outfit-empty-products">
                  <h3>
                    No garments in this outfit
                  </h3>

                  <p>
                    Save a look with clothing
                    from Fitting Studio to
                    display it here.
                  </p>

                  <button
                    type="button"
                    onClick={
                      openFittingStudio
                    }
                  >
                    Open Fitting Studio
                  </button>
                </div>
              )}
            </section>

            {/* OUTFIT TOTAL */}

            <section className="edit-outfit-summary">
              <div>
                <span>
                  Estimated outfit total
                </span>

                <strong>
                  {money(total)}
                </strong>
              </div>

              <p>
                Prices, stock, and available
                sizes will be confirmed by
                sellers during checkout.
              </p>
            </section>

            {/* BOTTOM ACTIONS */}

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
                  disabled={!hasChanges}
                  onClick={saveOutfit}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}

      {modal && (
        <div
          className="edit-outfit-modal-backdrop"
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
            <div
              className={`edit-outfit-modal-icon${
                modal === "delete"
                  ? " danger"
                  : ""
              }`}
            >
              {modal === "delete"
                ? "×"
                : "!"}
            </div>

            <h2 id="edit-outfit-modal-title">
              {modal === "delete"
                ? "Delete this outfit?"
                : "Discard changes?"}
            </h2>

            <p>
              {modal === "delete"
                ? `“${outfit.name}” will be permanently removed from your saved outfits.`
                : "Your unsaved changes will be lost."}
            </p>

            <div className="edit-outfit-modal-actions">

              <button
                type="button"
                className="modal-secondary-button"
                onClick={() =>
                  setModal(null)
                }
              >
                {modal === "delete"
                  ? "Keep Outfit"
                  : "Continue Editing"}
              </button>

              <button
                type="button"
                className={
                  modal === "delete"
                    ? "modal-danger-button"
                    : "modal-primary-button"
                }
                onClick={
                  modal === "delete"
                    ? deleteOutfit
                    : () =>
                        navigate(
                          "/shopper/saved-outfits"
                        )
                }
              >
                {modal === "delete"
                  ? "Delete Outfit"
                  : "Discard Changes"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
