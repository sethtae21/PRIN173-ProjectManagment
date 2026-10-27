
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AvatarCanvas from "./Shopper/AvatarCanvas";
import "./css/SavedOutfitsPage.css";

const OUTFITS_KEY = "fitfusion-saved-outfits";
const CART_KEY = "fitfusion-cart";
const VIEWS = ["front", "side", "rear"];

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
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function normalizeProduct(product, index) {
  if (!product || typeof product !== "object") return null;

  return {
    ...product,
    id: String(product.id ?? `item-${index}`),
    name: String(
      product.name ||
      product.title ||
      `Clothing Item ${index + 1}`
    ),
    category: product.category || product.type || "",
    price: Math.max(0, Number(product.price) || 0),
    quantity: Math.max(1, Number(product.quantity) || 1),
    selectedSize:
      product.selectedSize || product.size || "M",
    color:
      product.color || product.selectedColor || "Beige",
  };
}

function normalizeOutfit(outfit, index) {
  if (!outfit || typeof outfit !== "object") return null;

  const sourceProducts = Array.isArray(outfit.products)
    ? outfit.products
    : Array.isArray(outfit.items)
      ? outfit.items
      : [];

  const products = sourceProducts
    .map(normalizeProduct)
    .filter(Boolean);

  const storedAvatar =
    outfit.avatar && typeof outfit.avatar === "object"
      ? outfit.avatar
      : {};

  const avatar = {
    ...DEFAULT_AVATAR,
    ...storedAvatar,
    gender:
      storedAvatar.gender ||
      outfit.gender ||
      DEFAULT_AVATAR.gender,
    skinTone:
      storedAvatar.skinTone ||
      outfit.skinTone ||
      DEFAULT_AVATAR.skinTone,
  };

  return {
    ...outfit,
    id: String(outfit.id ?? `outfit-${index}`),
    name: String(
      outfit.name || `Saved Outfit ${index + 1}`
    ),
    description: String(outfit.description || ""),
    createdAt: outfit.createdAt || "",
    avatar,
    avatarView: String(
      outfit.avatarView || "front"
    ).toLowerCase(),
    products,
  };
}

function loadOutfits() {
  return readArray(OUTFITS_KEY)
    .map(normalizeOutfit)
    .filter(Boolean);
}

function getCartCount() {
  return readArray(CART_KEY).reduce(
    (sum, item) =>
      sum + Math.max(1, Number(item.quantity) || 1),
    0
  );
}

function categorySlot(product) {
  const category = String(
    product.category || ""
  ).toLowerCase();

  if (/dress|gown|jumpsuit/.test(category))
    return "dress";

  if (/outer|jacket|coat|blazer|cardigan/.test(category))
    return "outerwear";

  if (/shoe|footwear|sneaker|boot|sandal/.test(category))
    return "shoes";

  if (/bottom|pants|trouser|jean|skirt|short/.test(category))
    return "bottom";

  if (/top|shirt|blouse|sweater|hoodie|polo/.test(category))
    return "top";

  const name = String(
    product.name || ""
  ).toLowerCase();

  if (/dress|gown|jumpsuit/.test(name))
    return "dress";

  if (/jacket|coat|blazer|cardigan/.test(name))
    return "outerwear";

  if (/shoe|sneaker|boot|sandal/.test(name))
    return "shoes";

  if (/pants|trouser|jean|skirt|short/.test(name))
    return "bottom";

  if (/shirt|blouse|sweater|hoodie|polo|top/.test(name))
    return "top";

  return null;
}

function outfitLayers(outfit) {
  const items =
    Array.isArray(outfit.items) && outfit.items.length
      ? outfit.items
      : outfit.products;

  const layers = {};

  items.forEach((item) => {
    const slot = categorySlot(item);
    if (slot) layers[slot] = item;
  });

  return layers;
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
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

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m16 16 5 5" />
    </svg>
  );
}

function HangerIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M13.5 8.5a3 3 0 1 1 4.7 2.5L17 12v2l11 8H4l11-8" />
    </svg>
  );
}

function OutfitCard({
  outfit,
  view,
  onView,
  onEdit,
  onDelete,
  onCart,
}) {
  const layers = useMemo(
    () => outfitLayers(outfit),
    [outfit]
  );

  const total = outfit.products.reduce(
    (sum, item) =>
      sum + item.price * item.quantity,
    0
  );

  const canAddToCart = outfit.products.length > 0;

  return (
    <article className="saved-outfit-card">
      <div className="saved-outfit-preview">
        <div
          className="saved-outfit-view-buttons"
          role="group"
          aria-label={`Preview ${outfit.name}`}
        >
          {VIEWS.map((angle) => (
            <button
              type="button"
              key={angle}
              className={
                view === angle ? "active" : ""
              }
              aria-pressed={view === angle}
              onClick={() =>
                onView(outfit.id, angle)
              }
            >
              {angle.charAt(0).toUpperCase() +
                angle.slice(1)}
            </button>
          ))}
        </div>

        <div className="saved-outfit-avatar">
          <AvatarCanvas
            avatar={outfit.avatar}
            view={view}
            equippedItems={layers}
          />
        </div>

        <span className="saved-outfit-view-tag">
          {view.toUpperCase()} VIEW
        </span>
      </div>

      <div className="saved-outfit-information">
        <div className="saved-outfit-title-row">
          <div>
            <p className="saved-outfit-label">
              SAVED OUTFIT
            </p>
            <h2>{outfit.name}</h2>
          </div>

          <span className="saved-outfit-date">
            {formatDate(outfit.createdAt)}
          </span>
        </div>

        <p className="saved-outfit-description">
          {outfit.description ||
            "Your saved look from the Fitting Studio."}
        </p>

        <div className="saved-outfit-avatar-info">
          <span>{outfit.avatar.gender}</span>
          <span>{outfit.avatar.height} cm</span>
          <span>{outfit.avatar.weight} kg</span>
        </div>

        <div className="saved-outfit-products">
          {outfit.products.length ? (
            outfit.products.map((item, index) => (
              <div
                className="saved-outfit-product"
                key={`${item.id}-${index}`}
              >
                <span>
                  {item.name}{" "}
                  <small>
                    ({item.selectedSize})
                  </small>
                </span>

                <strong>
                  {formatMoney(
                    item.price * item.quantity
                  )}
                </strong>
              </div>
            ))
          ) : (
            <p className="saved-outfit-no-products">
              No clothing items were saved with
              this outfit.
            </p>
          )}
        </div>

        <div className="saved-outfit-summary">
          <span>
            {outfit.products.length}{" "}
            {outfit.products.length === 1
              ? "item"
              : "items"}
          </span>

          <strong>{formatMoney(total)}</strong>
        </div>

        <div className="saved-outfit-actions">
          <button
            type="button"
            className="saved-outfit-primary"
            disabled={!canAddToCart}
            onClick={() => onCart(outfit)}
          >
            Add to Cart
          </button>

          <button
            type="button"
            className="saved-outfit-secondary"
            onClick={() => onEdit(outfit)}
          >
            Edit
          </button>

          <button
            type="button"
            className="saved-outfit-delete"
            onClick={() => onDelete(outfit)}
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

export default function SavedOutfitsPage() {
  const navigate = useNavigate();

  const [outfits, setOutfits] =
    useState(loadOutfits);

  const [searchText, setSearchText] =
    useState("");

  const [sortOption, setSortOption] =
    useState("newest");

  const [cartCount, setCartCount] =
    useState(getCartCount);

  const [selectedViews, setSelectedViews] =
    useState({});

  const [outfitToDelete, setOutfitToDelete] =
    useState(null);

  const [message, setMessage] =
    useState("");

  const refresh = useCallback(() => {
    setOutfits(loadOutfits());
    setCartCount(getCartCount());
  }, []);

  useEffect(() => {
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("pageshow", refresh);
    window.addEventListener(
      "fitfusion-cart-updated",
      refresh
    );
    window.addEventListener(
      "fitfusion-outfits-updated",
      refresh
    );

    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener(
        "pageshow",
        refresh
      );
      window.removeEventListener(
        "fitfusion-cart-updated",
        refresh
      );
      window.removeEventListener(
        "fitfusion-outfits-updated",
        refresh
      );
    };
  }, [refresh]);

  useEffect(() => {
    if (!message) return;

    const timeout = window.setTimeout(
      () => setMessage(""),
      3000
    );

    return () => window.clearTimeout(timeout);
  }, [message]);

  const filteredOutfits = useMemo(() => {
    const search = searchText
      .trim()
      .toLowerCase();

    const matching = outfits.filter((outfit) => {
      const searchable = [
        outfit.name,
        outfit.description,
        ...outfit.products.map(
          (item) => item.name
        ),
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(search);
    });

    return matching.sort((a, b) => {
      if (sortOption === "name") {
        return a.name.localeCompare(b.name);
      }

      const aDate =
        new Date(a.createdAt).getTime() || 0;

      const bDate =
        new Date(b.createdAt).getTime() || 0;

      return sortOption === "oldest"
        ? aDate - bDate
        : bDate - aDate;
    });
  }, [outfits, searchText, sortOption]);

  function changeView(id, view) {
    setSelectedViews((current) => ({
      ...current,
      [id]: view,
    }));
  }

  function confirmDelete() {
    if (!outfitToDelete) return;

    const next = outfits.filter(
      (item) =>
        item.id !== outfitToDelete.id
    );

    try {
      localStorage.setItem(
        OUTFITS_KEY,
        JSON.stringify(next)
      );

      setOutfits(next);
      setOutfitToDelete(null);

      setMessage(
        "Outfit deleted successfully."
      );

      window.dispatchEvent(
        new Event(
          "fitfusion-outfits-updated"
        )
      );
    } catch {
      setMessage(
        "Unable to delete this outfit. Please try again."
      );
    }
  }

  function editOutfit(outfit) {
    navigate(
      `/shopper/saved-outfits/${encodeURIComponent(
        outfit.id
      )}/edit`
    );
  }

  function addOutfitToCart(outfit) {
    if (!outfit.products.length) {
      setMessage(
        "This outfit has no clothing items to add."
      );
      return;
    }

    const cart = readArray(CART_KEY);

    outfit.products.forEach((product) => {
      const match = cart.find(
        (item) =>
          String(item.id) ===
            String(product.id) &&
          String(
            item.selectedSize ||
              item.size ||
              "M"
          ) === String(product.selectedSize)
      );

      if (match) {
        match.quantity =
          (Number(match.quantity) || 1) +
          product.quantity;
      } else {
        cart.push({ ...product });
      }
    });

    try {
      localStorage.setItem(
        CART_KEY,
        JSON.stringify(cart)
      );

      setCartCount(getCartCount());

      window.dispatchEvent(
        new Event(
          "fitfusion-cart-updated"
        )
      );

      setMessage(
        `“${outfit.name}” was added to your cart.`
      );
    } catch {
      setMessage(
        "Unable to add this outfit to your cart."
      );
    }
  }

  return (
    <main className="saved-outfits-page">
      <header className="saved-outfits-top-header">
        <button
          type="button"
          className="saved-outfits-header-cart"
          aria-label={`Open shopping cart with ${cartCount} items`}
          onClick={() =>
            navigate("/shopper/cart")
          }
        >
          <CartIcon />
          <span>{cartCount}</span>
        </button>
      </header>

      <div className="saved-outfits-content">
        <section className="saved-outfits-intro">
          <div>
            <p className="saved-outfits-eyebrow">
              YOUR STYLE COLLECTION
            </p>

            <h1>Your Saved Outfits</h1>

            <p className="saved-outfits-description">
              Revisit your saved looks with
              their original avatar and
              clothing combinations.
            </p>
          </div>

          <button
            type="button"
            className="saved-outfits-create"
            onClick={() =>
              navigate(
                "/shopper/fitting-studio"
              )
            }
          >
            <span aria-hidden="true">+</span>
            Create New Outfit
          </button>
        </section>

        <section
          className="saved-outfits-toolbar"
          aria-label="Saved outfit filters"
        >
          <label className="saved-outfits-search">
            <SearchIcon />

            <input
              type="search"
              value={searchText}
              placeholder="Search outfits or clothing items..."
              onChange={(event) =>
                setSearchText(
                  event.target.value
                )
              }
            />
          </label>

          <label className="saved-outfits-sort">
            <span className="sr-only">
              Sort outfits
            </span>

            <select
              value={sortOption}
              onChange={(event) =>
                setSortOption(
                  event.target.value
                )
              }
            >
              <option value="newest">
                Newest First
              </option>

              <option value="oldest">
                Oldest First
              </option>

              <option value="name">
                Name: A to Z
              </option>
            </select>
          </label>
        </section>

        <div className="saved-outfits-result-row">
          <p>
            <strong>
              {filteredOutfits.length}
            </strong>{" "}
            saved{" "}
            {filteredOutfits.length === 1
              ? "outfit"
              : "outfits"}
          </p>

          {searchText && (
            <button
              type="button"
              onClick={() =>
                setSearchText("")
              }
            >
              Clear search
            </button>
          )}
        </div>

        {filteredOutfits.length ? (
          <section className="saved-outfits-grid">
            {filteredOutfits.map((outfit) => (
              <OutfitCard
                key={outfit.id}
                outfit={outfit}
                view={
                  selectedViews[outfit.id] ||
                  (VIEWS.includes(
                    outfit.avatarView
                  )
                    ? outfit.avatarView
                    : "front")
                }
                onView={changeView}
                onEdit={editOutfit}
                onDelete={setOutfitToDelete}
                onCart={addOutfitToCart}
              />
            ))}
          </section>
        ) : (
          <section className="saved-outfits-empty">
            <div className="saved-outfits-empty-icon">
              <HangerIcon />
            </div>

            <h2>
              {searchText
                ? "No matching outfits"
                : "No saved outfits yet"}
            </h2>

            <p>
              {searchText
                ? "Try another outfit name or clothing item."
                : "Try on at least one clothing item in Fitting Studio, then save your look with a name."}
            </p>

            <button
              type="button"
              onClick={() =>
                searchText
                  ? setSearchText("")
                  : navigate(
                      "/shopper/fitting-studio"
                    )
              }
            >
              {searchText
                ? "Clear Search"
                : "Open Fitting Studio"}
            </button>
          </section>
        )}
      </div>

      {message && (
        <div
          className="saved-outfits-toast"
          role="status"
        >
          {message}
        </div>
      )}

      {outfitToDelete && (
        <div
          className="saved-outfits-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setOutfitToDelete(null);
            }
          }}
        >
          <section
            className="saved-outfits-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-outfit-title"
          >
            <div
              className="saved-outfits-modal-icon"
              aria-hidden="true"
            >
              !
            </div>

            <p className="saved-outfits-modal-label">
              DELETE SAVED OUTFIT
            </p>

            <h2 id="delete-outfit-title">
              Delete “{outfitToDelete.name}”?
            </h2>

            <p>
              This outfit will be permanently
              removed from your collection.
              This action cannot be undone.
            </p>

            <div className="saved-outfits-modal-actions">
              <button
                type="button"
                className="saved-outfits-cancel-delete"
                onClick={() =>
                  setOutfitToDelete(null)
                }
              >
                Keep Outfit
              </button>

              <button
                type="button"
                className="saved-outfits-confirm-delete"
                onClick={confirmDelete}
              >
                Delete Outfit
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
