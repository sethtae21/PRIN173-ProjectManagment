import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  NavLink,
  useNavigate,
} from "react-router-dom";

import fitFusionLogo from "../assets/fitfusion-logo.svg";
import "./css/SavedOutfitsPage.css";

function readStorageArray(key) {
  try {
    const value = JSON.parse(
      localStorage.getItem(key) || "[]"
    );

    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function createId() {
  return `outfit-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

function getProductSymbol(item) {
  if (item.symbol) {
    return item.symbol;
  }

  const category = (
    item.category || ""
  ).toLowerCase();

  if (category.includes("dress")) {
    return "👗";
  }

  if (
    category.includes("bottom") ||
    category.includes("pants") ||
    category.includes("trouser") ||
    category.includes("jeans")
  ) {
    return "👖";
  }

  if (
    category.includes("outer") ||
    category.includes("jacket") ||
    category.includes("blazer")
  ) {
    return "🧥";
  }

  return "👕";
}

function normalizeItem(item, index) {
  return {
    id:
      item.id ||
      item.productId ||
      `outfit-item-${index}`,

    name:
      item.name ||
      item.productName ||
      `Clothing Item ${index + 1}`,

    category:
      item.category || "Clothing",

    sellerId:
      item.sellerId || "seller-001",

    sellerName:
      item.sellerName ||
      item.storeName ||
      "FitFusion Seller",

    price: Number(item.price) || 0,

    symbol: getProductSymbol(item),

    selectedColor:
      item.selectedColor ||
      item.color ||
      "Default",

    selectedSize:
      item.selectedSize ||
      item.size ||
      null,

    quantity:
      Number(item.quantity) || 1,

    ...item,
  };
}

function normalizeOutfit(outfit, index) {
  const storedItems =
    outfit.items ||
    outfit.products ||
    outfit.clothing ||
    outfit.garments ||
    [];

  const items = Array.isArray(storedItems)
    ? storedItems.map(normalizeItem)
    : [];

  return {
    id:
      outfit.id ||
      outfit.outfitId ||
      `saved-outfit-${index}`,

    name:
      outfit.name ||
      outfit.outfitName ||
      `Saved Outfit ${index + 1}`,

    description:
      outfit.description ||
      "A saved outfit from your FitFusion fitting session.",

    items,

    avatar:
      outfit.avatar ||
      outfit.avatarPreset ||
      null,

    gender:
      outfit.gender ||
      outfit.avatar?.gender ||
      "Female",

    view:
      outfit.view ||
      outfit.selectedView ||
      "front",

    occasion:
      outfit.occasion ||
      "Everyday",

    createdAt:
      outfit.createdAt ||
      outfit.savedAt ||
      new Date().toISOString(),

    updatedAt:
      outfit.updatedAt || null,
  };
}

function formatDate(dateValue) {
  try {
    return new Intl.DateTimeFormat(
      "en-PH",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      }
    ).format(new Date(dateValue));
  } catch {
    return "Recently saved";
  }
}

function formatPrice(price) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(price);
}

function SavedOutfitsPage() {
  const navigate = useNavigate();

  const [outfits, setOutfits] =
    useState([]);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [sortBy, setSortBy] =
    useState("newest");

  const [deleteTarget, setDeleteTarget] =
    useState(null);

  const [toastMessage, setToastMessage] =
    useState("");

  const [cartCount, setCartCount] =
    useState(0);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });

    const savedOutfits =
      readStorageArray(
        "fitfusion-saved-outfits"
      ).map(normalizeOutfit);

    setOutfits(savedOutfits);
    updateCartCount();
  }, []);

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setToastMessage("");
    }, 2600);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toastMessage]);

  const filteredOutfits = useMemo(() => {
    const normalizedSearch =
      searchTerm.trim().toLowerCase();

    const matchingOutfits =
      outfits.filter((outfit) => {
        if (!normalizedSearch) {
          return true;
        }

        const productNames =
          outfit.items
            .map((item) => item.name)
            .join(" ")
            .toLowerCase();

        return (
          outfit.name
            .toLowerCase()
            .includes(normalizedSearch) ||
          outfit.occasion
            .toLowerCase()
            .includes(normalizedSearch) ||
          productNames.includes(
            normalizedSearch
          )
        );
      });

    return [...matchingOutfits].sort(
      (firstOutfit, secondOutfit) => {
        if (sortBy === "oldest") {
          return (
            new Date(
              firstOutfit.createdAt
            ) -
            new Date(
              secondOutfit.createdAt
            )
          );
        }

        if (sortBy === "name") {
          return firstOutfit.name.localeCompare(
            secondOutfit.name
          );
        }

        if (sortBy === "items-high") {
          return (
            secondOutfit.items.length -
            firstOutfit.items.length
          );
        }

        return (
          new Date(
            secondOutfit.createdAt
          ) -
          new Date(
            firstOutfit.createdAt
          )
        );
      }
    );
  }, [outfits, searchTerm, sortBy]);

  function saveOutfits(nextOutfits) {
    setOutfits(nextOutfits);

    localStorage.setItem(
      "fitfusion-saved-outfits",
      JSON.stringify(nextOutfits)
    );
  }

  function updateCartCount() {
    const count = readStorageArray(
      "fitfusion-cart-items"
    ).reduce((total, item) => {
      return (
        total +
        (Number(item.quantity) || 1)
      );
    }, 0);

    setCartCount(count);
  }

  function openInFittingStudio(outfit) {
    localStorage.setItem(
      "fitfusion-active-outfit",
      JSON.stringify(outfit)
    );

    localStorage.setItem(
      "fitfusion-selected-items",
      JSON.stringify(outfit.items)
    );

    if (outfit.avatar) {
      localStorage.setItem(
        "fitfusion-avatar-preset",
        JSON.stringify(outfit.avatar)
      );
    }

    if (outfit.gender) {
      localStorage.setItem(
        "fitfusion-avatar-gender",
        outfit.gender.toLowerCase()
      );
    }

    navigate(
      "/shopper/fitting-studio/customize"
    );
  }

  function editOutfit(outfit) {
    localStorage.setItem(
      "fitfusion-editing-outfit",
      JSON.stringify(outfit)
    );

    navigate(
      `/shopper/saved-outfits/${outfit.id}/edit`
    );
  }

  function duplicateOutfit(outfit) {
    const duplicatedOutfit = {
      ...outfit,
      id: createId(),
      name: `${outfit.name} Copy`,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    };

    saveOutfits([
      duplicatedOutfit,
      ...outfits,
    ]);

    setToastMessage(
      `${outfit.name} was duplicated.`
    );
  }

  function prepareOutfitForCart(outfit) {
    if (outfit.items.length === 0) {
      setToastMessage(
        "This outfit has no clothing items to add to the cart."
      );

      return;
    }

    localStorage.setItem(
      "fitfusion-active-outfit",
      JSON.stringify(outfit)
    );

    localStorage.setItem(
      "fitfusion-selected-items",
      JSON.stringify(outfit.items)
    );

    const missingSizes =
      outfit.items.some(
        (item) => !item.selectedSize
      );

    if (missingSizes) {
      setToastMessage(
        "Please select the product sizes before adding this outfit to your cart."
      );

      window.setTimeout(() => {
        navigate(
          "/shopper/fitting-studio/select-items"
        );
      }, 700);

      return;
    }

    const currentCart =
      readStorageArray(
        "fitfusion-cart-items"
      );

    const nextCart = [
      ...currentCart,
      ...outfit.items.map((item) => ({
        ...item,
        quantity:
          Number(item.quantity) || 1,
        outfitId: outfit.id,
        outfitName: outfit.name,
        addedAt:
          new Date().toISOString(),
      })),
    ];

    localStorage.setItem(
      "fitfusion-cart-items",
      JSON.stringify(nextCart)
    );

    updateCartCount();

    setToastMessage(
      `${outfit.name} was added to your cart.`
    );
  }

  function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    const remainingOutfits =
      outfits.filter(
        (outfit) =>
          String(outfit.id) !==
          String(deleteTarget.id)
      );

    saveOutfits(remainingOutfits);

    const editingOutfit =
      localStorage.getItem(
        "fitfusion-editing-outfit"
      );

    if (editingOutfit) {
      try {
        const parsedOutfit =
          JSON.parse(editingOutfit);

        if (
          String(parsedOutfit.id) ===
          String(deleteTarget.id)
        ) {
          localStorage.removeItem(
            "fitfusion-editing-outfit"
          );
        }
      } catch {
        // Invalid stored data is ignored.
      }
    }

    setToastMessage(
      `${deleteTarget.name} was deleted.`
    );

    setDeleteTarget(null);
  }

  function handleLogout() {
    const confirmed = window.confirm(
      "Are you sure you want to log out?"
    );

    if (!confirmed) {
      return;
    }

    sessionStorage.removeItem("userRole");
    sessionStorage.removeItem("userEmail");
    sessionStorage.removeItem(
      "registeredAccount"
    );

    localStorage.removeItem(
      "fitfusion-current-user"
    );

    navigate("/login");
  }

  return (
    <main className="saved-outfits-page">
      <aside className="saved-outfits-sidebar">
        <div className="saved-outfits-logo">
          <img
            src={fitFusionLogo}
            alt="FitFusion AI"
          />
        </div>

        <nav className="saved-outfits-navigation">
          <NavLink
            to="/shopper/dashboard"
            className="saved-outfits-nav-link"
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/shopper/fitting-studio"
            className="saved-outfits-nav-link"
          >
            Fitting Studio
          </NavLink>

          <NavLink
            to="/shopper/avatar-presets"
            className="saved-outfits-nav-link"
          >
            Avatar Presets
          </NavLink>

          <NavLink
            to="/shopper/catalog"
            className="saved-outfits-nav-link"
          >
            Catalog
          </NavLink>

          <NavLink
            to="/shopper/saved-outfits"
            className={() =>
              "saved-outfits-nav-link active"
            }
          >
            Saved Outfits
          </NavLink>

          <NavLink
            to="/shopper/orders"
            className="saved-outfits-nav-link"
          >
            Order History
          </NavLink>

          <NavLink
            to="/shopper/account"
            className="saved-outfits-nav-link"
          >
            Account
          </NavLink>
        </nav>

        <button
          type="button"
          className="saved-outfits-logout"
          onClick={handleLogout}
        >
          Logout
        </button>
      </aside>

      <section className="saved-outfits-content">
        <header className="saved-outfits-header">
          <div>
            <p className="saved-outfits-page-code">
              13 — SAVED OUTFITS
            </p>

            <p className="saved-outfits-description">
              Review and manage outfits saved
              from your fitting sessions
            </p>
          </div>

          <div className="saved-outfits-header-actions">
            <button
              type="button"
              className="saved-outfits-cart"
              onClick={() =>
                navigate("/shopper/cart")
              }
              aria-label={`Open cart with ${cartCount} items`}
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

            <div className="saved-outfits-role">
              REGISTERED SHOPPER
            </div>
          </div>
        </header>

        <div className="saved-outfits-body">
          <section className="saved-outfits-introduction">
            <div>
              <p>YOUR STYLE COLLECTION</p>

              <h1>Your saved outfits</h1>

              <span>
                Continue fitting, edit your
                outfit, or prepare its products
                for your shopping cart.
              </span>
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

          {outfits.length > 0 && (
            <section className="saved-outfits-toolbar">
              <div className="saved-outfits-search">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="7"
                  />

                  <path d="m20 20-4-4" />
                </svg>

                <input
                  type="search"
                  value={searchTerm}
                  placeholder="Search saved outfits or products..."
                  onChange={(event) =>
                    setSearchTerm(
                      event.target.value
                    )
                  }
                />

                {searchTerm && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearchTerm("")
                    }
                  >
                    ×
                  </button>
                )}
              </div>

              <select
                value={sortBy}
                onChange={(event) =>
                  setSortBy(
                    event.target.value
                  )
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

                <option value="items-high">
                  Most Items
                </option>
              </select>
            </section>
          )}

          {outfits.length === 0 ? (
            <EmptyOutfits
              onCreate={() =>
                navigate(
                  "/shopper/fitting-studio"
                )
              }
              onCatalog={() =>
                navigate(
                  "/shopper/catalog"
                )
              }
            />
          ) : filteredOutfits.length ===
            0 ? (
            <section className="saved-outfits-no-results">
              <div>⌕</div>

              <h2>
                No saved outfits found
              </h2>

              <p>
                No outfits match your search.
                Try entering another outfit or
                product name.
              </p>

              <button
                type="button"
                onClick={() =>
                  setSearchTerm("")
                }
              >
                Clear Search
              </button>
            </section>
          ) : (
            <>
              <div className="saved-outfits-result-count">
                <strong>
                  {filteredOutfits.length}
                </strong>

                <span>
                  {filteredOutfits.length ===
                  1
                    ? "saved outfit"
                    : "saved outfits"}
                </span>
              </div>

              <section className="saved-outfits-grid">
                {filteredOutfits.map(
                  (outfit) => (
                    <OutfitCard
                      key={outfit.id}
                      outfit={outfit}
                      onOpen={() =>
                        openInFittingStudio(
                          outfit
                        )
                      }
                      onEdit={() =>
                        editOutfit(outfit)
                      }
                      onDuplicate={() =>
                        duplicateOutfit(
                          outfit
                        )
                      }
                      onCart={() =>
                        prepareOutfitForCart(
                          outfit
                        )
                      }
                      onDelete={() =>
                        setDeleteTarget(
                          outfit
                        )
                      }
                    />
                  )
                )}
              </section>
            </>
          )}
        </div>
      </section>

      {deleteTarget && (
        <div
          className="saved-outfits-modal-backdrop"
          role="presentation"
          onMouseDown={() =>
            setDeleteTarget(null)
          }
        >
          <section
            className="saved-outfits-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-outfit-title"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="saved-outfits-modal-icon">
              !
            </div>

            <p>DELETE SAVED OUTFIT</p>

            <h2 id="delete-outfit-title">
              Delete “{deleteTarget.name}”?
            </h2>

            <span>
              This outfit will be permanently
              removed from your saved outfits.
              Its individual products will
              remain available in the catalog.
            </span>

            <div className="saved-outfits-modal-actions">
              <button
                type="button"
                onClick={() =>
                  setDeleteTarget(null)
                }
              >
                Keep Outfit
              </button>

              <button
                type="button"
                className="confirm-delete"
                onClick={confirmDelete}
              >
                Delete Outfit
              </button>
            </div>
          </section>
        </div>
      )}

      {toastMessage && (
        <div
          className="saved-outfits-toast"
          role="status"
        >
          {toastMessage}
        </div>
      )}
    </main>
  );
}

function OutfitCard({
  outfit,
  onOpen,
  onEdit,
  onDuplicate,
  onCart,
  onDelete,
}) {
  const [view, setView] = useState(
    outfit.view || "front"
  );

  const totalPrice = outfit.items.reduce(
    (total, item) =>
      total +
      Number(item.price || 0) *
        Number(item.quantity || 1),
    0
  );

  return (
    <article className="saved-outfit-card">
      <div className="saved-outfit-preview">
        <div className="saved-outfit-view-buttons">
          {["front", "side", "rear"].map(
            (viewOption) => (
              <button
                key={viewOption}
                type="button"
                className={
                  view === viewOption
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setView(viewOption)
                }
              >
                {viewOption}
              </button>
            )
          )}
        </div>

        <OutfitAvatar
          outfit={outfit}
          view={view}
        />

        <span className="saved-outfit-view-label">
          {view.toUpperCase()} VIEW
        </span>
      </div>

      <div className="saved-outfit-information">
        <div className="saved-outfit-heading">
          <div>
            <span>
              {outfit.occasion}
            </span>

            <h2>{outfit.name}</h2>
          </div>

          <button
            type="button"
            className="saved-outfit-menu-button"
            onClick={onDuplicate}
            title="Duplicate outfit"
          >
            ⧉
          </button>
        </div>

        <p className="saved-outfit-description">
          {outfit.description}
        </p>

        <div className="saved-outfit-products">
          {outfit.items.length > 0 ? (
            outfit.items
              .slice(0, 3)
              .map((item) => (
                <div key={item.id}>
                  <span>
                    {getProductSymbol(
                      item
                    )}
                  </span>

                  <div>
                    <strong>
                      {item.name}
                    </strong>

                    <small>
                      {item.selectedSize
                        ? `Size ${item.selectedSize}`
                        : "Size not selected"}
                    </small>
                  </div>
                </div>
              ))
          ) : (
            <div className="saved-outfit-no-items">
              No products saved in this outfit
            </div>
          )}

          {outfit.items.length > 3 && (
            <small className="saved-outfit-more-items">
              +{outfit.items.length - 3}{" "}
              more item
              {outfit.items.length - 3 === 1
                ? ""
                : "s"}
            </small>
          )}
        </div>

        <div className="saved-outfit-summary">
          <div>
            <span>Items</span>
            <strong>
              {outfit.items.length}
            </strong>
          </div>

          <div>
            <span>Total value</span>
            <strong>
              {formatPrice(totalPrice)}
            </strong>
          </div>

          <div>
            <span>Saved</span>
            <strong>
              {formatDate(
                outfit.createdAt
              )}
            </strong>
          </div>
        </div>

        <div className="saved-outfit-primary-actions">
          <button
            type="button"
            className="saved-outfit-open-button"
            onClick={onOpen}
          >
            Open in Studio
          </button>

          <button
            type="button"
            className="saved-outfit-cart-button"
            onClick={onCart}
          >
            Add to Cart
          </button>
        </div>

        <div className="saved-outfit-secondary-actions">
          <button
            type="button"
            onClick={onEdit}
          >
            Edit Outfit
          </button>

          <button
            type="button"
            className="saved-outfit-delete-button"
            onClick={onDelete}
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

function OutfitAvatar({
  outfit,
  view,
}) {
  const gender =
    outfit.gender === "Male"
      ? "male"
      : "female";

  const avatarSkin =
    outfit.avatar?.skinTone ||
    "#d9aa82";

  return (
    <div
      className={[
        "saved-outfit-avatar",
        `saved-outfit-avatar-${gender}`,
        `saved-outfit-avatar-${view}`,
      ].join(" ")}
      style={{
        "--outfit-skin": avatarSkin,
      }}
    >
      <div className="saved-outfit-avatar-head">
        <span />
      </div>

      <div className="saved-outfit-avatar-neck" />

      <div className="saved-outfit-avatar-body">
        <div className="saved-outfit-avatar-top">
          {outfit.items[0]?.symbol ||
            "👕"}
        </div>
      </div>

      <div className="saved-outfit-avatar-arm left" />

      <div className="saved-outfit-avatar-arm right" />

      <div className="saved-outfit-avatar-leg left" />

      <div className="saved-outfit-avatar-leg right" />

      {outfit.items[1] && (
        <div className="saved-outfit-avatar-bottom">
          {outfit.items[1].symbol ||
            "👖"}
        </div>
      )}
    </div>
  );
}

function EmptyOutfits({
  onCreate,
  onCatalog,
}) {
  return (
    <section className="saved-outfits-empty">
      <div className="saved-outfits-empty-preview">
        <span>👚</span>
        <span>👖</span>
        <span>🧥</span>
      </div>

      <p>YOUR COLLECTION IS EMPTY</p>

      <h2>
        You have no saved outfits yet
      </h2>

      <span>
        Open the Fitting Studio, try clothing
        items on your avatar, and save the
        combination as an outfit.
      </span>

      <div className="saved-outfits-empty-actions">
        <button
          type="button"
          className="saved-outfits-empty-primary"
          onClick={onCreate}
        >
          Open Fitting Studio
        </button>

        <button
          type="button"
          className="saved-outfits-empty-secondary"
          onClick={onCatalog}
        >
          Browse Catalog
        </button>
      </div>
    </section>
  );
}

export default SavedOutfitsPage;