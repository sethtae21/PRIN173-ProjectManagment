import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./css/SavedOutfitsPage.css";

const sampleOutfits = [
  {
    id: "outfit-001",
    name: "Weekend Casual",
    description:
      "A comfortable casual combination for relaxed days.",
    createdAt: "2026-10-01T09:00:00.000Z",
    topColor: "#d7af4b",
    bottomColor: "#29251f",
    skinTone: "#d9a77e",
    products: [
      {
        id: "product-001",
        name: "Classic Gold Shirt",
        price: 799,
      },
      {
        id: "product-002",
        name: "Straight Black Pants",
        price: 999,
      },
    ],
  },
  {
    id: "outfit-002",
    name: "Elegant Evening",
    description:
      "An elegant outfit prepared for formal occasions.",
    createdAt: "2026-09-29T13:30:00.000Z",
    topColor: "#17130f",
    bottomColor: "#8e641f",
    skinTone: "#efc39b",
    products: [
      {
        id: "product-003",
        name: "Black Evening Top",
        price: 1299,
      },
      {
        id: "product-004",
        name: "Gold Formal Skirt",
        price: 1399,
      },
    ],
  },
  {
    id: "outfit-003",
    name: "Neutral Workwear",
    description:
      "A polished neutral outfit suitable for work.",
    createdAt: "2026-09-25T08:15:00.000Z",
    topColor: "#eee2cd",
    bottomColor: "#5c554c",
    skinTone: "#b97952",
    products: [
      {
        id: "product-005",
        name: "Cream Office Blouse",
        price: 899,
      },
      {
        id: "product-006",
        name: "Tailored Brown Pants",
        price: 1199,
      },
    ],
  },
  {
    id: "outfit-004",
    name: "Warm Street Style",
    description:
      "A warm-toned outfit for an everyday street look.",
    createdAt: "2026-09-20T16:45:00.000Z",
    topColor: "#b57e20",
    bottomColor: "#17130f",
    skinTone: "#f0c7a1",
    products: [
      {
        id: "product-007",
        name: "Warm Oversized Top",
        price: 999,
      },
      {
        id: "product-008",
        name: "Dark Casual Pants",
        price: 1099,
      },
    ],
  },
];

function safelyReadArray(key, fallback = []) {
  try {
    const storedValue = localStorage.getItem(key);

    if (!storedValue) {
      return fallback;
    }

    const parsedValue = JSON.parse(storedValue);

    return Array.isArray(parsedValue)
      ? parsedValue
      : fallback;
  } catch {
    return fallback;
  }
}

function formatPrice(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value);
}

function SavedOutfitsPage() {
  const navigate = useNavigate();

  const [outfits, setOutfits] = useState(() => {
    const storedOutfits = safelyReadArray(
      "fitfusion-saved-outfits"
    );

    return storedOutfits.length > 0
      ? storedOutfits
      : sampleOutfits;
  });

  const [cartItems, setCartItems] = useState(() =>
    safelyReadArray("fitfusion-cart")
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] =
    useState("newest");
  const [selectedViews, setSelectedViews] =
    useState({});
  const [outfitToRemove, setOutfitToRemove] =
    useState(null);
  const [notification, setNotification] =
    useState("");

  const displayedOutfits = useMemo(() => {
    const normalizedSearch =
      searchTerm.trim().toLowerCase();

    const filteredOutfits = outfits.filter(
      (outfit) => {
        const productNames = (
          outfit.products || []
        )
          .map((product) => product.name)
          .join(" ");

        return `${outfit.name || ""} ${
          outfit.description || ""
        } ${productNames}`
          .toLowerCase()
          .includes(normalizedSearch);
      }
    );

    return [...filteredOutfits].sort(
      (firstOutfit, secondOutfit) => {
        if (sortOrder === "name") {
          return (firstOutfit.name || "").localeCompare(
            secondOutfit.name || ""
          );
        }

        const firstDate = new Date(
          firstOutfit.createdAt || 0
        ).getTime();

        const secondDate = new Date(
          secondOutfit.createdAt || 0
        ).getTime();

        if (sortOrder === "oldest") {
          return firstDate - secondDate;
        }

        return secondDate - firstDate;
      }
    );
  }, [outfits, searchTerm, sortOrder]);

  function selectView(outfitId, view) {
    setSelectedViews((currentViews) => ({
      ...currentViews,
      [outfitId]: view,
    }));
  }

  function confirmRemoveOutfit() {
    if (!outfitToRemove) {
      return;
    }

    const updatedOutfits = outfits.filter(
      (outfit) =>
        outfit.id !== outfitToRemove.id
    );

    setOutfits(updatedOutfits);

    localStorage.setItem(
      "fitfusion-saved-outfits",
      JSON.stringify(updatedOutfits)
    );

    setOutfitToRemove(null);
    setNotification("The outfit was removed.");

    window.setTimeout(() => {
      setNotification("");
    }, 2500);
  }

  function addOutfitToCart(outfit) {
    const products = outfit.products || [];

    if (products.length === 0) {
      setNotification(
        "This outfit does not contain any products."
      );

      return;
    }

    const newCartItems = products.map(
      (product) => ({
        ...product,
        cartItemId: `${product.id}-${Date.now()}-${Math.random()}`,
        quantity: 1,
        sourceOutfitId: outfit.id,
        sourceOutfitName: outfit.name,
      })
    );

    const updatedCart = [
      ...cartItems,
      ...newCartItems,
    ];

    setCartItems(updatedCart);

    localStorage.setItem(
      "fitfusion-cart",
      JSON.stringify(updatedCart)
    );

    navigate("/shopper/cart");
  }

  return (
    <main className="saved-outfits-page">
      {/* No sidebar is rendered here.
          ShopperLayout provides the only sidebar. */}

      {/* Large page title header removed.
          Cart and registered-shopper badge remain. */}
      <div className="saved-outfits-top-actions">
        <button
          type="button"
          className="saved-outfits-cart-button"
          onClick={() =>
            navigate("/shopper/cart")
          }
          aria-label={`Open cart with ${cartItems.length} items`}
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 7H6" />
            <circle cx="10" cy="20" r="1" />
            <circle cx="18" cy="20" r="1" />
          </svg>

          <span>{cartItems.length}</span>
        </button>

        <div className="saved-outfits-role-badge">
          REGISTERED SHOPPER
        </div>
      </div>

      <div className="saved-outfits-content">
        <section className="saved-outfits-introduction">
          <div>
            <p className="saved-outfits-eyebrow">
              YOUR STYLE COLLECTION
            </p>

            <h1>Your saved outfits</h1>

            <p className="saved-outfits-description">
              Continue fitting, edit an outfit, or
              prepare its products for your shopping
              cart.
            </p>
          </div>

          <button
            type="button"
            className="saved-outfits-create-button"
            onClick={() =>
              navigate(
                "/shopper/fitting-studio"
              )
            }
          >
            + Create New Outfit
          </button>
        </section>

        <section className="saved-outfits-toolbar">
          <label className="saved-outfits-search">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m16 16 5 5" />
            </svg>

            <input
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search saved outfits or products..."
              aria-label="Search saved outfits"
            />
          </label>

          <select
            className="saved-outfits-sort"
            value={sortOrder}
            onChange={(event) =>
              setSortOrder(event.target.value)
            }
            aria-label="Sort saved outfits"
          >
            <option value="newest">
              Newest First
            </option>

            <option value="oldest">
              Oldest First
            </option>

            <option value="name">
              Outfit Name
            </option>
          </select>
        </section>

        <div className="saved-outfits-result-count">
          <strong>{displayedOutfits.length}</strong>

          <span>
            {displayedOutfits.length === 1
              ? "saved outfit"
              : "saved outfits"}
          </span>
        </div>

        {notification && (
          <div
            className="saved-outfits-notification"
            role="status"
          >
            {notification}
          </div>
        )}

        {displayedOutfits.length > 0 ? (
          <section className="saved-outfits-grid">
            {displayedOutfits.map((outfit) => {
              const selectedView =
                selectedViews[outfit.id] ||
                "front";

              return (
                <article
                  className="saved-outfit-card"
                  key={outfit.id}
                >
                  <div className="saved-outfit-preview">
                    <div className="saved-outfit-view-buttons">
                      {[
                        "front",
                        "side",
                        "rear",
                      ].map((view) => (
                        <button
                          type="button"
                          key={view}
                          className={
                            selectedView === view
                              ? "active"
                              : ""
                          }
                          onClick={() =>
                            selectView(
                              outfit.id,
                              view
                            )
                          }
                        >
                          {view
                            .charAt(0)
                            .toUpperCase() +
                            view.slice(1)}
                        </button>
                      ))}
                    </div>

                    <OutfitAvatar
                      outfit={outfit}
                      view={selectedView}
                    />
                  </div>

                  <div className="saved-outfit-information">
                    <div className="saved-outfit-title-row">
                      <div>
                        <p>SAVED OUTFIT</p>
                        <h2>{outfit.name}</h2>
                      </div>

                      <span>
                        {(outfit.products || [])
                          .length}{" "}
                        {(outfit.products || [])
                          .length === 1
                          ? "item"
                          : "items"}
                      </span>
                    </div>

                    <p className="saved-outfit-card-description">
                      {outfit.description}
                    </p>

                    <div className="saved-outfit-products">
                      {(outfit.products || []).map(
                        (product) => (
                          <div key={product.id}>
                            <span>
                              {product.name}
                            </span>

                            <strong>
                              {formatPrice(
                                product.price
                              )}
                            </strong>
                          </div>
                        )
                      )}
                    </div>

                    <div className="saved-outfit-actions">
                      <button
                        type="button"
                        className="saved-outfit-primary"
                        onClick={() =>
                          addOutfitToCart(outfit)
                        }
                      >
                        Prepare Cart
                      </button>

                      <button
                        type="button"
                        className="saved-outfit-secondary"
                        onClick={() =>
                          navigate(
                            `/shopper/saved-outfits/${outfit.id}/edit`
                          )
                        }
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="saved-outfit-remove"
                        onClick={() =>
                          setOutfitToRemove(outfit)
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="saved-outfits-empty-state">
            <span aria-hidden="true">◇</span>

            <h2>No saved outfits found</h2>

            <p>
              Try another search or create a new
              outfit in the Fitting Studio.
            </p>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/shopper/fitting-studio"
                )
              }
            >
              Open Fitting Studio
            </button>
          </section>
        )}
      </div>

      {outfitToRemove && (
        <div
          className="saved-outfit-modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setOutfitToRemove(null);
            }
          }}
        >
          <section
            className="saved-outfit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-outfit-title"
          >
            <p className="saved-outfit-modal-label">
              REMOVE SAVED OUTFIT
            </p>

            <h2 id="remove-outfit-title">
              Remove “{outfitToRemove.name}”?
            </h2>

            <p>
              This outfit will be removed from your
              saved collection. Products already in
              your cart will not be affected.
            </p>

            <div className="saved-outfit-modal-actions">
              <button
                type="button"
                className="saved-outfit-modal-cancel"
                onClick={() =>
                  setOutfitToRemove(null)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="saved-outfit-modal-confirm"
                onClick={confirmRemoveOutfit}
              >
                Remove Outfit
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function OutfitAvatar({ outfit, view }) {
  return (
    <div
      className={`saved-avatar saved-avatar-${view}`}
      style={{
        "--saved-skin":
          outfit.skinTone || "#d9a77e",
        "--saved-top":
          outfit.topColor || "#d7af4b",
        "--saved-bottom":
          outfit.bottomColor || "#29251f",
      }}
      aria-label={`${outfit.name} ${view} view`}
    >
      <span className="saved-avatar-head">
        <span className="saved-avatar-hair" />

        {view !== "rear" && (
          <span className="saved-avatar-face">
            <i />
            {view === "front" && <i />}
          </span>
        )}
      </span>

      <span className="saved-avatar-neck" />

      <span className="saved-avatar-upper">
        <span className="saved-avatar-left-arm" />
        <span className="saved-avatar-shirt" />
        <span className="saved-avatar-right-arm" />
      </span>

      <span className="saved-avatar-lower">
        <i />
        <i />
      </span>
    </div>
  );
}

export default SavedOutfitsPage;