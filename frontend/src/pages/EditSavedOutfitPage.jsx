import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AvatarCanvas from "./Shopper/AvatarCanvas";
import { outfitsApi, cartApi, API_URL } from "../services/api";
import "./css/EditSavedOutfitPage.css";

const EDITING_KEY = "fitfusion-editing-outfit";
const STUDIO_SESSION_PREFIX = "fitfusion-fitting-studio-session-";

// === add-from-catalog picker handshake (must match CatalogPage.jsx) ========
const EDIT_MODE_KEY = "fitfusion-edit-outfit-mode";
const RETURN_KEY_PREFIX = "fitfusion-edit-outfit-return-";

// FIX: Side view removed. Legacy "side" values normalize to "front".
const VIEWS = ["front", "rear"];

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

function readSessionJSON(key) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function removeSession(key) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

// Drop any leftover picker transport for an outfit (called on save / delete /
// leave so an abandoned catalog session can never leak into a later edit).
function clearPickerKeys(outfitId) {
  if (outfitId === undefined || outfitId === null) return;
  removeSession(RETURN_KEY_PREFIX + String(outfitId));
  removeSession(EDIT_MODE_KEY);
}

function mediaUrl(path) {
  if (!path) return "";
  const raw = String(path);
  if (raw.startsWith("http")) return raw;
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function normalizeProduct(item, index) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const selectedSize = item.selectedSize || item.size || "M";

  return {
    ...item,

    id: String(item.id || item.productId || `garment-${index}`),

    name: String(
      item.name || item.productName || item.title || `Garment ${index + 1}`
    ),

    seller: String(
      item.seller ||
        item.store ||
        item.store_name ||
        item.sellerName ||
        "Seller unavailable"
    ),

    category: String(item.category || item.type || "Clothing"),

    selectedSize,
    size: selectedSize,

    color: String(item.color || item.selectedColor || "Default"),

    quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),

    price: Math.max(0, Number(item.price) || 0),

    image: mediaUrl(
      item.image || item.front_image || item.imageUrl || item.thumbnail || ""
    ),
  };
}

// Resolve stored CatalogItem IDs into real garments via the guest-readable
// /catalog/{id}/ endpoint (the serializer's documented design). Id-preserving:
// a failed fetch yields a placeholder with id:"" so the dead reference is
// dropped on the next save instead of 400-ing the whole edit.
async function hydrateProducts(ids) {
  const list = Array.isArray(ids) ? ids.filter(Boolean) : [];
  if (!list.length) return [];

  const settled = await Promise.allSettled(
    list.map(async (id) => {
      const res = await fetch(`${API_URL}/catalog/${encodeURIComponent(id)}/`);
      if (!res.ok) throw new Error(`catalog ${res.status}`);
      const data = await res.json();
      return normalizeProduct({ ...data, id: String(id) }, 0);
    })
  );

  return settled.map((result, i) =>
    result.status === "fulfilled" && result.value
      ? result.value
      : {
          id: "", // dropped on save (self-heals hard-deleted refs)
          name: "Item unavailable",
          seller: "Seller unavailable",
          category: "",
          selectedSize: "",
          size: "",
          color: "",
          quantity: 1,
          price: 0,
          image: "",
          _requestedId: String(list[i]),
        }
  );
}

function composeOutfit(raw, products) {
  if (!raw || typeof raw !== "object") return null;

  const storedAvatar =
    raw.avatar && typeof raw.avatar === "object" ? raw.avatar : {};

  const requestedView = String(
    raw.avatar_view || raw.avatarView || raw.view || "front"
  ).toLowerCase();

  return {
    ...raw,

    id: String(raw.id || raw.outfitId || ""),

    name: String(raw.name || raw.outfitName || "Saved Outfit"),

    occasion: String(raw.occasion || "Casual"),

    description: String(raw.description || raw.notes || ""),

    createdAt: raw.created_at || raw.createdAt || "",

    // Legacy "side" outfits safely fall back to "front"
    avatarView: VIEWS.includes(requestedView) ? requestedView : "front",

    avatar: {
      ...DEFAULT_AVATAR,
      ...storedAvatar,

      gender: storedAvatar.gender || raw.gender || DEFAULT_AVATAR.gender,

      skinTone: storedAvatar.skinTone || raw.skinTone || DEFAULT_AVATAR.skinTone,
    },

    products,
  };
}

function getSlot(item) {
  const text = `${item.category || ""} ${item.name || ""}`.toLowerCase();

  if (/dress|gown|jumpsuit/.test(text)) return "dress";
  if (/outer|jacket|coat|blazer|cardigan/.test(text)) return "outerwear";
  if (/shoe|footwear|sneaker|boot|sandal/.test(text)) return "shoes";
  if (/bottom|pant|trouser|jean|skirt|short/.test(text)) return "bottom";
  if (/top|shirt|blouse|sweater|hoodie|polo/.test(text)) return "top";

  return null;
}

function makeEquippedItems(products) {
  const result = {};

  (products || []).forEach((product) => {
    const slot = getSlot(product);
    if (slot) result[slot] = product;
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

// Build the nested avatar object the additive serializer flattens into the
// snapshot columns (camelCase keys + view; numbers may be strings, the
// serializer rounds them).
function buildAvatarPayload(avatar, view) {
  const a = avatar || {};
  return {
    gender: a.gender,
    height: a.height,
    weight: a.weight,
    skinTone: a.skinTone,
    undertone: a.undertone,
    shoulder: a.shoulder,
    waist: a.waist,
    hip: a.hip,
    thigh: a.thigh,
    cupSize:
      a.gender && String(a.gender).toLowerCase() === "male"
        ? null
        : a.cupSize || "B",
    view: VIEWS.includes(String(view).toLowerCase())
      ? String(view).toLowerCase()
      : "front",
  };
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 7H6" />
      <circle cx="10" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
    </svg>
  );
}

export default function EditSavedOutfitPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const { outfitId } = useParams();

  const [outfit, setOutfit] = useState(null);
  const [original, setOriginal] = useState(null);
  const [view, setView] = useState("front");
  const [cartCount, setCartCount] = useState(0);
  const [errors, setErrors] = useState({});
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  // ============================================
  // LOAD SAVED OUTFIT FROM DATABASE + HYDRATE + APPLY PICKER RETURN
  // ============================================
  useEffect(() => {
    let active = true;

    async function loadOutfit() {
      setLoading(true);

      try {
        const found = await outfitsApi.get(outfitId);

        if (!found || typeof found !== "object") {
          if (active) {
            setOutfit(null);
            setOriginal(null);
          }
          return;
        }

        const ids = Array.isArray(found.items) ? found.items : [];
        const products = await hydrateProducts(ids);
        const resolved = composeOutfit(found, products);

        if (!active) return;

        setOutfit(resolved);
        setOriginal(resolved ? structuredClone(resolved) : null);
        setView(resolved?.avatarView || "front");

        // === apply the catalog picker queue ONLY when arrived via the
        // editor's "Back to Outfit" navigation (router state). A normal
        // mount discards any stale queue -> leak-proof. Wrapped so a
        // hydration hiccup can never null an already-loaded outfit.
        try {
          const returnKey = RETURN_KEY_PREFIX + String(outfitId);
          const viaPicker = Boolean(
            location.state &&
              location.state.returnedFromCatalog &&
              String(location.state.outfitId || "") === String(outfitId)
          );

          if (viaPicker) {
            const queued = readSessionJSON(returnKey);
            const queueIds = Array.isArray(queued)
              ? queued.map(String).filter(Boolean)
              : [];

            if (queueIds.length) {
              const extra = await hydrateProducts(queueIds);
              if (active) {
                setOutfit((prev) => {
                  if (!prev) return prev;
                  const existing = new Set(
                    prev.products.map((p) => String(p.id))
                  );
                  const add = extra.filter(
                    (p) => p && p.id && !existing.has(String(p.id))
                  );
                  return add.length
                    ? { ...prev, products: [...prev.products, ...add] }
                    : prev;
                });
              }
            }
          }

          // Consume the transport in both branches (apply or discard).
          removeSession(returnKey);
        } catch (returnErr) {
          console.warn("Picker return handling skipped:", returnErr);
        }

        // Defensive: a catalog visit that never mounted (e.g. immediate
        // back) could leave the mode key; clear it on every editor load.
        removeSession(EDIT_MODE_KEY);
      } catch (error) {
        console.error("Unable to load outfit:", error);
        if (active) {
          setOutfit(null);
          setOriginal(null);
        }
      } finally {
        if (active) {
          setErrors({});
          setNotice("");
          setLoading(false);
          window.scrollTo(0, 0);
        }
      }
    }

    loadOutfit();

    return () => {
      active = false;
    };
    // location.state is read on mount only (navigation remounts this route);
    // keeping deps to [outfitId] avoids reload loops on state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outfitId]);

  // ============================================
  // CART COUNT FROM DATABASE
  // ============================================
  useEffect(() => {
    let active = true;

    async function refreshCartCount() {
      try {
        const cart = await cartApi.get();
        const items = cart?.items || [];
        const count = items.reduce(
          (sum, item) => sum + Math.max(1, Number(item.quantity) || 1),
          0
        );
        if (active) setCartCount(count);
      } catch {
        if (active) setCartCount(0);
      }
    }

    refreshCartCount();

    window.addEventListener("fitfusion-cart-updated", refreshCartCount);

    return () => {
      active = false;
      window.removeEventListener("fitfusion-cart-updated", refreshCartCount);
    };
  }, []);

  // ============================================
  // NOTIFICATION
  // ============================================
  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  // ============================================
  // LIVE AVATAR LAYERS
  // ============================================
  const layers = useMemo(
    () => makeEquippedItems(outfit?.products || []),
    [outfit?.products]
  );

  // ============================================
  // TOTAL
  // ============================================
  const total = useMemo(
    () =>
      (outfit?.products || []).reduce(
        (sum, product) => sum + product.price * product.quantity,
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
      (JSON.stringify(outfit) !== JSON.stringify(original) ||
        view !== original.avatarView)
  );

  // ============================================
  // UPDATE BASIC INFORMATION
  // ============================================
  function updateField(event) {
    const { name, value } = event.target;

    setOutfit((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  }

  // ============================================
  // UPDATE CLOTHING
  // ============================================
  function updateProduct(index, changes) {
    setOutfit((current) => ({
      ...current,
      products: current.products.map((product, i) =>
        i === index ? { ...product, ...changes } : product
      ),
    }));
    setErrors((current) => ({ ...current, products: "" }));
  }

  // ============================================
  // REMOVE CLOTHING
  // ============================================
  function removeProduct(index) {
    setOutfit((current) => ({
      ...current,
      products: current.products.filter((_, i) => i !== index),
    }));
  }

  // ============================================
  // VALIDATION
  // ============================================
  function validate() {
    const next = {};

    const trimmedName = outfit.name.trim();

    if (!trimmedName) {
      next.name = "Please enter an outfit name.";
    } else if (trimmedName.length < 3) {
      next.name = "Use at least 3 characters.";
    } else if (trimmedName.length > 50) {
      next.name = "Use 50 characters or fewer.";
    }

    if (!outfit.occasion) {
      next.occasion = "Please select an occasion.";
    }

    if (!(outfit.products || []).length) {
      next.products = "Add at least one garment before saving.";
    }

    setErrors(next);

    return Object.keys(next).length === 0;
  }

  // ============================================
  // SAVE CHANGES TO DATABASE (ids-only items + rich fields)
  // ============================================
  async function saveOutfit() {
    if (!outfit || !validate()) {
      setNotice("Please correct the highlighted fields.");
      return;
    }

    const trimmedName = outfit.name.trim();

    try {
      const all = await outfitsApi.list();
      const list = Array.isArray(all) ? all : all.results || [];

      const duplicate = list.some(
        (item) =>
          String(item.id) !== outfit.id &&
          String(item.name || "").trim().toLowerCase() ===
            trimmedName.toLowerCase()
      );

      if (duplicate) {
        setErrors((current) => ({
          ...current,
          name: "An outfit with this name already exists.",
        }));
        setNotice("Please correct the highlighted fields.");
        return;
      }

      // FIX: items must be a list of CatalogItem ID STRINGS (the serializer's
      // PrimaryKeyRelatedField contract). Whole objects 400 every edit. Dead /
      // unresolvable refs carry id:"" and are filtered out here, self-healing
      // the outfit on save. Garments appended via the catalog picker carry real
      // hydrated ids, so they are included automatically.
      const itemIds = (outfit.products || [])
        .map((p) => String(p.id))
        .filter(Boolean);

      const nextOutfit = {
        name: trimmedName,
        items: itemIds,
        occasion: outfit.occasion,
        description: (outfit.description || "").trim(),
        avatar: buildAvatarPayload(outfit.avatar, view),
      };

      await outfitsApi.update(outfit.id, nextOutfit);

      localStorage.removeItem(EDITING_KEY);
      clearPickerKeys(outfit.id);

      window.dispatchEvent(new Event("fitfusion-outfits-updated"));

      navigate("/shopper/saved-outfits");
    } catch (error) {
      console.error("Unable to save outfit changes:", error);
      const serverMsg =
        error?.message ||
        (error?.data &&
          Object.entries(error.data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
            .join(" | "));
      setNotice(serverMsg || "Unable to save your changes. Please try again.");
    }
  }

  // ============================================
  // DELETE OUTFIT FROM DATABASE
  // ============================================
  async function deleteOutfit() {
    if (!outfit) return;

    try {
      await outfitsApi.remove(outfit.id);

      localStorage.removeItem(EDITING_KEY);
      clearPickerKeys(outfit.id);

      window.dispatchEvent(new Event("fitfusion-outfits-updated"));

      navigate("/shopper/saved-outfits");
    } catch {
      setModal(null);
      setNotice("Unable to delete this outfit. Please try again.");
    }
  }

  // ============================================
  // LEAVE PAGE
  // ============================================
  function leavePage() {
    if (outfit) clearPickerKeys(outfit.id);
    if (hasChanges) {
      setModal("discard");
    } else {
      navigate("/shopper/saved-outfits");
    }
  }

  // ============================================
  // OPEN FITTING STUDIO -- re-equip the saved look (FR-5.6)
  // ============================================
  function openFittingStudio() {
    if (hasChanges) {
      setNotice("Save your changes before opening Fitting Studio.");
      return;
    }

    try {
      const session = {
        avatar: { ...outfit.avatar },
        currentView: view === "rear" ? "Rear" : "Front",
        equippedItems: layers,
        originalDimensions: null,
      };
      sessionStorage.setItem(
        `${STUDIO_SESSION_PREFIX}shopper`,
        JSON.stringify(session)
      );
      localStorage.setItem(
        "fitfusion-avatar-gender",
        outfit.avatar.gender || "Female"
      );
      navigate("/shopper/fitting-studio/customize");
    } catch {
      setNotice("Unable to open this look in Fitting Studio.");
    }
  }

  // ============================================
  // OPEN CATALOG -- enter picker mode for THIS outfit
  // ============================================
  function openCatalog() {
    if (hasChanges) {
      setNotice("Save your changes before browsing the catalog.");
      return;
    }

    try {
      // Existing return buffer (kept for compatibility / other readers).
      localStorage.setItem(EDITING_KEY, JSON.stringify(outfit));
      // One-shot picker mode key; CatalogPage consumes (removes) it on mount.
      sessionStorage.setItem(
        EDIT_MODE_KEY,
        JSON.stringify({ id: String(outfit.id), name: String(outfit.name || "") })
      );
    } catch {
      /* storage unavailable: picker simply won't activate */
    }

    navigate("/shopper/catalog");
  }

  // ============================================
  // LOADING
  // ============================================
  if (loading) {
    return (
      <main className="edit-outfit-page">
        <p className="edit-outfit-message">Loading saved outfit...</p>
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
            This outfit may have been deleted or is no longer in your saved
            collection.
          </p>
          <button
            type="button"
            onClick={() => navigate("/shopper/saved-outfits")}
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
          onClick={() => navigate("/shopper/cart")}
          aria-label={`Open shopping cart with ${cartCount} items`}
        >
          <CartIcon />
          <span>{cartCount}</span>
        </button>
      </header>

      <div className="edit-outfit-body">
        {notice && (
          <p className="edit-outfit-notice" role="status">
            {notice}
          </p>
        )}

        <div className="edit-outfit-introduction">
          <div>
            <p className="edit-outfit-eyebrow">OUTFIT EDITOR</p>
            <h1>Refine your saved look</h1>
            <p className="edit-outfit-intro-description">
              Update your outfit details and clothing items while previewing
              your saved 2D avatar.
            </p>
          </div>

          <span
            className={`edit-outfit-unsaved-status${hasChanges ? " changed" : ""}`}
          >
            <i aria-hidden="true" />
            {hasChanges ? "Unsaved changes" : "All changes saved"}
          </span>
        </div>

        <div className="edit-outfit-layout">
          <section className="edit-outfit-preview-card">
            <div className="edit-outfit-card-heading">
              <div>
                <p>2D AVATAR PREVIEW</p>
                <h2>{outfit.name}</h2>
              </div>
              <span>{view.toUpperCase()}</span>
            </div>

            <div className="edit-outfit-avatar-preview">
              <AvatarCanvas
                avatar={outfit.avatar}
                view={view}
                equippedItems={layers}
              />
            </div>

            <div
              className="edit-outfit-view-buttons"
              role="group"
              aria-label="Avatar viewing angle"
            >
              {VIEWS.map((angle) => (
                <button
                  key={angle}
                  type="button"
                  className={view === angle ? "active" : ""}
                  aria-pressed={view === angle}
                  onClick={() => setView(angle)}
                >
                  {angle.charAt(0).toUpperCase() + angle.slice(1)}
                </button>
              ))}
            </div>

            <div className="edit-outfit-avatar-metadata">
              <span>{outfit.avatar.gender}</span>
              <span>{outfit.avatar.height} cm</span>
              <span>{outfit.avatar.weight} kg</span>
            </div>

            <button
              type="button"
              className="edit-outfit-studio-button"
              onClick={openFittingStudio}
            >
              Open Fitting Studio
            </button>
          </section>

          <div className="edit-outfit-editor-column">
            <section className="edit-outfit-form-card">
              <div className="edit-outfit-section-heading">
                <div>
                  <p>OUTFIT INFORMATION</p>
                  <h2>Basic details</h2>
                </div>
                <span>* Required</span>
              </div>

              <div className="edit-outfit-form-grid">
                <label className="edit-outfit-field">
                  <span>Outfit Name *</span>
                  <input
                    type="text"
                    name="name"
                    maxLength={50}
                    value={outfit.name}
                    className={errors.name ? "input-error" : ""}
                    onChange={updateField}
                  />
                  <small>{outfit.name.length}/50</small>
                  {errors.name && <em>{errors.name}</em>}
                </label>

                <label className="edit-outfit-field">
                  <span>Occasion *</span>
                  <select
                    name="occasion"
                    value={outfit.occasion}
                    onChange={updateField}
                  >
                    {!OCCASIONS.includes(outfit.occasion) && (
                      <option value={outfit.occasion}>{outfit.occasion}</option>
                    )}
                    {OCCASIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {errors.occasion && <em>{errors.occasion}</em>}
                </label>

                <label className="edit-outfit-field full-width">
                  <span>Description or Notes</span>
                  <textarea
                    name="description"
                    maxLength={250}
                    rows={4}
                    value={outfit.description}
                    onChange={updateField}
                    placeholder="Describe your saved look..."
                  />
                  <small>{(outfit.description || "").length}/250</small>
                </label>
              </div>
            </section>

            <section className="edit-outfit-products-card">
              <div className="edit-outfit-section-heading">
                <div>
                  <p>SELECTED GARMENTS</p>
                  <h2>
                    {(outfit.products || []).length}{" "}
                    {(outfit.products || []).length === 1 ? "item" : "items"}
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
                <p className="edit-outfit-products-error">{errors.products}</p>
              )}

              {(outfit.products || []).length ? (
                <div className="edit-outfit-products-list">
                  {outfit.products.map((product, index) => (
                    <article
                      className="edit-outfit-product"
                      key={`${product.id || product._requestedId}-${index}`}
                    >
                      <div className="edit-outfit-product-image">
                        {product.image ? (
                          <img src={product.image} alt={product.name} />
                        ) : (
                          <span aria-hidden="true">♧</span>
                        )}
                      </div>

                      <div className="edit-outfit-product-information">
                        <span>{product.seller}</span>
                        <h3>{product.name}</h3>
                        <p>{product.category}</p>
                        <strong>{money(product.price)}</strong>
                      </div>

                      <div className="edit-outfit-product-options">
                        <label>
                          <span>Size</span>
                          <select
                            value={product.size}
                            onChange={(event) =>
                              updateProduct(index, {
                                size: event.target.value,
                                selectedSize: event.target.value,
                              })
                            }
                          >
                            {!SIZES.includes(product.size) && product.size && (
                              <option value={product.size}>{product.size}</option>
                            )}
                            {SIZES.map((size) => (
                              <option key={size} value={size}>
                                {size}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          <span>Color</span>
                          <input
                            value={product.color}
                            maxLength={25}
                            onChange={(event) =>
                              updateProduct(index, { color: event.target.value })
                            }
                          />
                        </label>

                        <div className="edit-outfit-quantity-group">
                          <span>Quantity</span>
                          <div className="edit-outfit-quantity">
                            <button
                              type="button"
                              disabled={product.quantity <= 1}
                              aria-label={`Decrease ${product.name} quantity`}
                              onClick={() =>
                                updateProduct(index, {
                                  quantity: product.quantity - 1,
                                })
                              }
                            >
                              −
                            </button>
                            <strong>{product.quantity}</strong>
                            <button
                              type="button"
                              disabled={product.quantity >= 99}
                              aria-label={`Increase ${product.name} quantity`}
                              onClick={() =>
                                updateProduct(index, {
                                  quantity: product.quantity + 1,
                                })
                              }
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="edit-outfit-remove-product"
                        onClick={() => removeProduct(index)}
                      >
                        Remove Garment
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="edit-outfit-empty-products">
                  <h3>No garments in this outfit</h3>
                  <p>
                    Save a look with clothing from Fitting Studio to display it
                    here.
                  </p>
                  <button type="button" onClick={openFittingStudio}>
                    Open Fitting Studio
                  </button>
                </div>
              )}
            </section>

            <section className="edit-outfit-summary">
              <div>
                <span>Estimated outfit total</span>
                <strong>{money(total)}</strong>
              </div>
              <p>
                Prices, stock, and available sizes will be confirmed by sellers
                during checkout.
              </p>
            </section>

            <div className="edit-outfit-actions">
              <button
                type="button"
                className="edit-outfit-delete-button"
                onClick={() => setModal("delete")}
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

      {modal && (
        <div
          className="edit-outfit-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModal(null);
          }}
        >
          <section
            className="edit-outfit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-outfit-modal-title"
          >
            <div
              className={`edit-outfit-modal-icon${modal === "delete" ? " danger" : ""}`}
            >
              {modal === "delete" ? "×" : "!"}
            </div>

            <h2 id="edit-outfit-modal-title">
              {modal === "delete" ? "Delete this outfit?" : "Discard changes?"}
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
                onClick={() => setModal(null)}
              >
                {modal === "delete" ? "Keep Outfit" : "Continue Editing"}
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
                    : () => {
                        if (outfit) clearPickerKeys(outfit.id);
                        navigate("/shopper/saved-outfits");
                      }
                }
              >
                {modal === "delete" ? "Delete Outfit" : "Discard Changes"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}