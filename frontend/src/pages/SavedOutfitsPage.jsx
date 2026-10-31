import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AvatarCanvas from "./Shopper/AvatarCanvas";
import { outfitsApi, cartApi, API_URL } from "../services/api";
import "./css/SavedOutfitsPage.css";

// FIX: Side view removed
const VIEWS = ["front", "rear"];

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

// Same-origin media path (keeps <canvas> pixel reads untainted; mirrors the
// product/seller pages' mediaUrl).
function mediaUrl(path) {
  if (!path) return "";
  const raw = String(path);
  if (raw.startsWith("http")) return raw;
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function normalizeProduct(product, index) {
  if (!product || typeof product !== "object") return null;

  return {
    ...product,
    id: String(product.id ?? product.catalog_item ?? `item-${index}`),
    name: String(product.name || product.title || `Clothing Item ${index + 1}`),
    category: product.category || product.type || "",
    price: Math.max(0, Number(product.price) || 0),
    quantity: Math.max(1, Number(product.quantity) || 1),
    selectedSize: product.selectedSize || product.size || "M",
    size: product.selectedSize || product.size || "M",
    color: product.color || product.selectedColor || "Beige",
    image: mediaUrl(product.image || product.front_image || product.frontImageUrl || ""),
  };
}

// Resolve the stored CatalogItem IDs into real garments via the guest-readable
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
          category: "",
          price: 0,
          quantity: 1,
          selectedSize: "",
          size: "",
          color: "",
          image: "",
          _requestedId: String(list[i]),
        }
  );
}

// Compose a render-ready outfit from the API row + hydrated products. The API
// returns items as id-strings and created_at (snake); the nested avatar /
// occasion / description come from the additive Phase-A serializer.
function composeOutfit(raw, products, index) {
  if (!raw || typeof raw !== "object") return null;

  const storedAvatar =
    raw.avatar && typeof raw.avatar === "object" ? raw.avatar : {};

  const requestedView = String(
    raw.avatar_view || raw.avatarView || raw.view || "front"
  ).toLowerCase();

  return {
    ...raw,
    id: String(raw.id ?? `outfit-${index}`),
    name: String(raw.name || `Saved Outfit ${index + 1}`),
    occasion: String(raw.occasion || "Casual"),
    description: String(raw.description || ""),
    createdAt: raw.created_at || raw.createdAt || "",
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
    : date.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
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

function categorySlot(product) {
  const category = String(product.category || "").toLowerCase();
  if (/dress|gown|jumpsuit/.test(category)) return "dress";
  if (/outer|jacket|coat|blazer|cardigan/.test(category)) return "outerwear";
  if (/shoe|footwear|sneaker|boot|sandal/.test(category)) return "shoes";
  if (/bottom|pants|trouser|jean|skirt|short/.test(category)) return "bottom";
  if (/top|shirt|blouse|sweater|hoodie|polo/.test(category)) return "top";
  return null;
}

function outfitLayers(outfit) {
  // Hydrated products carry a real category, so the canvas slots fill correctly.
  const layers = {};
  (outfit.products || []).forEach((item) => {
    const slot = categorySlot(item);
    if (slot) layers[slot] = item;
  });
  return layers;
}

function OutfitCard({ outfit, view, onView, onEdit, onDelete, onCart }) {
  const layers = useMemo(() => outfitLayers(outfit), [outfit]);
  const total = (outfit.products || []).reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const canAddToCart = (outfit.products || []).some((p) => p.id);

  return (
    <article className="saved-outfit-card">
      <div className="saved-outfit-preview">
        <div className="saved-outfit-view-buttons" role="group" aria-label={`Preview ${outfit.name}`}>
          {VIEWS.map((angle) => (
            <button
              type="button"
              key={angle}
              className={view === angle ? "active" : ""}
              aria-pressed={view === angle}
              onClick={() => onView(outfit.id, angle)}
            >
              {angle.charAt(0).toUpperCase() + angle.slice(1)}
            </button>
          ))}
        </div>

        <div className="saved-outfit-avatar">
          <AvatarCanvas avatar={outfit.avatar} view={view} equippedItems={layers} />
        </div>

        <span className="saved-outfit-view-tag">{view.toUpperCase()} VIEW</span>
      </div>

      <div className="saved-outfit-information">
        <div className="saved-outfit-title-row">
          <div>
            <p className="saved-outfit-label">SAVED OUTFIT</p>
            <h2>{outfit.name}</h2>
          </div>
          <span className="saved-outfit-date">{formatDate(outfit.createdAt)}</span>
        </div>

        <p className="saved-outfit-description">
          {outfit.description || "Your saved look from the Fitting Studio."}
        </p>

        <div className="saved-outfit-avatar-info">
          <span>{outfit.avatar.gender}</span>
          <span>{outfit.avatar.height} cm</span>
          <span>{outfit.avatar.weight} kg</span>
        </div>

        <div className="saved-outfit-products">
          {(outfit.products || []).length ? (
            outfit.products.map((item, index) => (
              <div className="saved-outfit-product" key={`${item.id || item._requestedId}-${index}`}>
                <span>
                  {item.name} {item.selectedSize ? <small>({item.selectedSize})</small> : null}
                </span>
                <strong>{formatMoney(item.price * item.quantity)}</strong>
              </div>
            ))
          ) : (
            <p className="saved-outfit-no-products">No clothing items were saved with this outfit.</p>
          )}
        </div>

        <div className="saved-outfit-summary">
          <span>{(outfit.products || []).length} {(outfit.products || []).length === 1 ? "item" : "items"}</span>
          <strong>{formatMoney(total)}</strong>
        </div>

        <div className="saved-outfit-actions">
          <button type="button" className="saved-outfit-primary" disabled={!canAddToCart} onClick={() => onCart(outfit)}>Add to Cart</button>
          <button type="button" className="saved-outfit-secondary" onClick={() => onEdit(outfit)}>Edit</button>
          <button type="button" className="saved-outfit-delete" onClick={() => onDelete(outfit)}>Delete</button>
        </div>
      </div>
    </article>
  );
}

export default function SavedOutfitsPage() {
  const navigate = useNavigate();

  const [outfits, setOutfits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [sortOption, setSortOption] = useState("newest");
  const [selectedViews, setSelectedViews] = useState({});
  const [outfitToDelete, setOutfitToDelete] = useState(null);
  const [message, setMessage] = useState("");

  // ====================================================
  // FETCH OUTFITS FROM DATABASE + HYDRATE ITEM IDS
  // ====================================================
  const fetchOutfits = useCallback(async () => {
    try {
      const data = await outfitsApi.list();
      const rows = Array.isArray(data) ? data : (data.results || []);

      const hydrated = await Promise.all(
        rows.map(async (raw, index) => {
          const ids = Array.isArray(raw.items) ? raw.items : [];
          const products = await hydrateProducts(ids);
          return composeOutfit(raw, products, index);
        })
      );

      setOutfits(hydrated.filter(Boolean));
    } catch (err) {
      console.error("Failed to load outfits from DB:", err);
      setMessage("Failed to load saved outfits.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOutfits();
    window.addEventListener("focus", fetchOutfits);
    window.addEventListener("fitfusion-outfits-updated", fetchOutfits);
    return () => {
      window.removeEventListener("focus", fetchOutfits);
      window.removeEventListener("fitfusion-outfits-updated", fetchOutfits);
    };
  }, [fetchOutfits]);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(""), 3000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  const filteredOutfits = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    const matching = outfits.filter((outfit) => {
      const searchable = [outfit.name, outfit.description, ...(outfit.products || []).map((item) => item.name)].join(" ").toLowerCase();
      return searchable.includes(search);
    });

    return matching.sort((a, b) => {
      if (sortOption === "name") return a.name.localeCompare(b.name);
      const aDate = new Date(a.createdAt).getTime() || 0;
      const bDate = new Date(b.createdAt).getTime() || 0;
      return sortOption === "oldest" ? aDate - bDate : bDate - aDate;
    });
  }, [outfits, searchText, sortOption]);

  function changeView(id, view) {
    setSelectedViews((current) => ({ ...current, [id]: view }));
  }

  // ====================================================
  // DELETE OUTFIT FROM DATABASE
  // ====================================================
  async function confirmDelete() {
    if (!outfitToDelete) return;
    try {
      await outfitsApi.remove(outfitToDelete.id);
      setOutfits((prev) => prev.filter((item) => item.id !== outfitToDelete.id));
      setOutfitToDelete(null);
      setMessage("Outfit deleted successfully.");
      window.dispatchEvent(new Event("fitfusion-outfits-updated"));
    } catch {
      setMessage("Unable to delete this outfit. Please try again.");
    }
  }

  function editOutfit(outfit) {
    navigate(`/shopper/saved-outfits/${encodeURIComponent(outfit.id)}/edit`);
  }

  // ====================================================
  // ADD OUTFIT TO CART (VIA API, using hydrated catalog ids)
  // ====================================================
  async function addOutfitToCart(outfit) {
    const usable = (outfit.products || []).filter((p) => p.id);
    if (!usable.length) {
      setMessage("This outfit has no clothing items to add.");
      return;
    }

    try {
      for (const product of usable) {
        await cartApi.add(product.id, product.quantity);
      }
      setMessage(`“${outfit.name}” was added to your cart.`);
      window.dispatchEvent(new Event("fitfusion-cart-updated"));
    } catch {
      setMessage("Unable to add this outfit to your cart.");
    }
  }

  return (
    <main className="saved-outfits-page">
      <header className="saved-outfits-top-header">
        <button type="button" className="saved-outfits-header-cart" aria-label="Open shopping cart" onClick={() => navigate("/shopper/cart")}>
          <CartIcon />
          <span>Cart</span>
        </button>
      </header>

      <div className="saved-outfits-content">
        <section className="saved-outfits-intro">
          <div>
            <p className="saved-outfits-eyebrow">YOUR STYLE COLLECTION</p>
            <h1>Your Saved Outfits</h1>
            <p className="saved-outfits-description">Revisit your saved looks with their original avatar and clothing combinations.</p>
          </div>
          <button type="button" className="saved-outfits-create" onClick={() => navigate("/shopper/fitting-studio")}>
            <span aria-hidden="true">+</span> Create New Outfit
          </button>
        </section>

        <section className="saved-outfits-toolbar" aria-label="Saved outfit filters">
          <label className="saved-outfits-search">
            <SearchIcon />
            <input type="search" value={searchText} placeholder="Search outfits or clothing items..." onChange={(event) => setSearchText(event.target.value)} />
          </label>
          <label className="saved-outfits-sort">
            <span className="sr-only">Sort outfits</span>
            <select value={sortOption} onChange={(event) => setSortOption(event.target.value)}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name: A to Z</option>
            </select>
          </label>
        </section>

        <div className="saved-outfits-result-row">
          <p><strong>{filteredOutfits.length}</strong> saved {filteredOutfits.length === 1 ? "outfit" : "outfits"}</p>
          {searchText && <button type="button" onClick={() => setSearchText("")}>Clear search</button>}
        </div>

        {loading && <p>Loading your saved outfits...</p>}

        {!loading && filteredOutfits.length ? (
          <section className="saved-outfits-grid">
            {filteredOutfits.map((outfit) => (
              <OutfitCard
                key={outfit.id}
                outfit={outfit}
                view={selectedViews[outfit.id] || (VIEWS.includes(outfit.avatarView) ? outfit.avatarView : "front")}
                onView={changeView}
                onEdit={editOutfit}
                onDelete={setOutfitToDelete}
                onCart={addOutfitToCart}
              />
            ))}
          </section>
        ) : (
          !loading && (
            <section className="saved-outfits-empty">
              <div className="saved-outfits-empty-icon"><HangerIcon /></div>
              <h2>{searchText ? "No matching outfits" : "No saved outfits yet"}</h2>
              <p>{searchText ? "Try another outfit name or clothing item." : "Try on at least one clothing item in Fitting Studio, then save your look with a name."}</p>
              <button type="button" onClick={() => searchText ? setSearchText("") : navigate("/shopper/fitting-studio")}>
                {searchText ? "Clear Search" : "Open Fitting Studio"}
              </button>
            </section>
          )
        )}
      </div>

      {message && <div className="saved-outfits-toast" role="status">{message}</div>}

      {outfitToDelete && (
        <div className="saved-outfits-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOutfitToDelete(null); }}>
          <section className="saved-outfits-modal" role="dialog" aria-modal="true" aria-labelledby="delete-outfit-title">
            <div className="saved-outfits-modal-icon" aria-hidden="true">!</div>
            <p className="saved-outfits-modal-label">DELETE SAVED OUTFIT</p>
            <h2 id="delete-outfit-title">Delete “{outfitToDelete.name}”?</h2>
            <p>This outfit will be permanently removed from your collection.</p>
            <div className="saved-outfits-modal-actions">
              <button type="button" className="saved-outfits-cancel-delete" onClick={() => setOutfitToDelete(null)}>Keep Outfit</button>
              <button type="button" className="saved-outfits-confirm-delete" onClick={confirmDelete}>Delete Outfit</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}