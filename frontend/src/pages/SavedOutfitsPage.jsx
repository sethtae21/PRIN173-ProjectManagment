import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import "./css/SavedOutfitsPage.css";

const initialOutfits = [
  {
    id: "golden-weekend",
    name: "Golden Weekend",
    description:
      "Warm neutral pieces for a relaxed weekend outfit.",
    createdAt: "2026-10-08",
    color: "#d8ad45",
    pantsColor: "#29251f",
    skinTone: "#d9a276",
    gender: "Male",
    products: [
      {
        id: "cream-knit-sweater",
        name: "Cream Knit Sweater",
        price: 1599,
        quantity: 1,
        selectedSize: "M",
      },
      {
        id: "black-tailored-trousers",
        name: "Black Tailored Trousers",
        price: 1699,
        quantity: 1,
        selectedSize: "M",
      },
    ],
  },
  {
    id: "modern-classic",
    name: "Modern Classic",
    description:
      "A clean combination suitable for casual and smart occasions.",
    createdAt: "2026-10-06",
    color: "#d8ad45",
    pantsColor: "#29251f",
    skinTone: "#d9a276",
    gender: "Male",
    products: [
      {
        id: "modern-oxford-shirt",
        name: "Modern Oxford Shirt",
        price: 1499,
        quantity: 1,
        selectedSize: "M",
      },
      {
        id: "black-tailored-trousers",
        name: "Black Tailored Trousers",
        price: 1699,
        quantity: 1,
        selectedSize: "M",
      },
    ],
  },
  {
    id: "soft-ivory",
    name: "Soft Ivory",
    description:
      "An elegant light-colored outfit with a soft neutral finish.",
    createdAt: "2026-10-04",
    color: "#eee4d1",
    pantsColor: "#9b7448",
    skinTone: "#d9a276",
    gender: "Female",
    products: [
      {
        id: "ivory-satin-blouse",
        name: "Ivory Satin Blouse",
        price: 1399,
        quantity: 1,
        selectedSize: "S",
      },
      {
        id: "pleated-midi-skirt",
        name: "Pleated Midi Skirt",
        price: 1299,
        quantity: 1,
        selectedSize: "S",
      },
    ],
  },
  {
    id: "denim-day",
    name: "Denim Day",
    description:
      "A comfortable denim-inspired outfit for everyday wear.",
    createdAt: "2026-10-02",
    color: "#526e86",
    pantsColor: "#29251f",
    skinTone: "#d9a276",
    gender: "Female",
    products: [
      {
        id: "classic-denim-jacket",
        name: "Classic Denim Jacket",
        price: 2299,
        quantity: 1,
        selectedSize: "M",
      },
      {
        id: "black-tailored-trousers",
        name: "Black Tailored Trousers",
        price: 1699,
        quantity: 1,
        selectedSize: "M",
      },
    ],
  },
];

function normalizeProduct(
  product,
  index,
) {
  return {
    id:
      product?.id ||
      `saved-product-${index + 1}`,

    name:
      product?.name ||
      `Saved Product ${index + 1}`,

    price: Number(product?.price || 0),

    quantity: Math.max(
      1,
      Number(product?.quantity || 1),
    ),

    selectedSize:
      product?.selectedSize ||
      product?.size ||
      "M",
  };
}

function normalizeOutfit(
  outfit,
  index,
) {
  const products = Array.isArray(
    outfit?.products,
  )
    ? outfit.products.map(
        normalizeProduct,
      )
    : [];

  return {
    id:
      outfit?.id ||
      `saved-outfit-${index + 1}`,

    name:
      outfit?.name ||
      `Saved Outfit ${index + 1}`,

    description:
      outfit?.description ||
      "A saved outfit from your fitting session.",

    createdAt:
      outfit?.createdAt ||
      new Date().toISOString(),

    color:
      outfit?.color ||
      outfit?.shirtColor ||
      "#d8ad45",

    pantsColor:
      outfit?.pantsColor ||
      "#29251f",

    skinTone:
      outfit?.skinTone ||
      "#d9a276",

    gender:
      outfit?.gender === "Female"
        ? "Female"
        : "Male",

    products,
  };
}

function getSavedOutfits() {
  try {
    const savedOutfits =
      localStorage.getItem(
        "fitfusion-saved-outfits",
      );

    if (!savedOutfits) {
      return initialOutfits;
    }

    const parsedOutfits =
      JSON.parse(savedOutfits);

    if (!Array.isArray(parsedOutfits)) {
      return initialOutfits;
    }

    if (parsedOutfits.length === 0) {
      return [];
    }

    const validOutfits =
      parsedOutfits.filter(
        (outfit) =>
          outfit &&
          typeof outfit === "object",
      );

    if (validOutfits.length === 0) {
      return initialOutfits;
    }

    return validOutfits.map(
      normalizeOutfit,
    );
  } catch (error) {
    console.error(
      "Unable to load saved outfits:",
      error,
    );

    return initialOutfits;
  }
}

function getCartCount() {
  try {
    const savedCart =
      localStorage.getItem(
        "fitfusion-cart",
      );

    const cart = savedCart
      ? JSON.parse(savedCart)
      : [];

    if (!Array.isArray(cart)) {
      return 0;
    }

    return cart.reduce(
      (total, item) =>
        total +
        Math.max(
          1,
          Number(item?.quantity || 1),
        ),
      0,
    );
  } catch {
    return 0;
  }
}

function SavedOutfitsPage() {
  const navigate = useNavigate();

  const [outfits, setOutfits] =
    useState(getSavedOutfits);

  const [searchText, setSearchText] =
    useState("");

  const [sortOption, setSortOption] =
    useState("newest");

  const [cartCount, setCartCount] =
    useState(getCartCount);

  const [
    selectedViews,
    setSelectedViews,
  ] = useState({});

  const [
    outfitToDelete,
    setOutfitToDelete,
  ] = useState(null);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    function updateCartCount() {
      setCartCount(getCartCount());
    }

    updateCartCount();

    window.addEventListener(
      "fitfusion-cart-updated",
      updateCartCount,
    );

    window.addEventListener(
      "storage",
      updateCartCount,
    );

    return () => {
      window.removeEventListener(
        "fitfusion-cart-updated",
        updateCartCount,
      );

      window.removeEventListener(
        "storage",
        updateCartCount,
      );
    };
  }, []);

  const filteredOutfits = useMemo(() => {
    const normalizedSearch = String(
      searchText || "",
    )
      .trim()
      .toLowerCase();

    const filtered = outfits.filter(
      (outfit) => {
        const outfitName = String(
          outfit?.name || "",
        ).toLowerCase();

        const outfitDescription =
          String(
            outfit?.description || "",
          ).toLowerCase();

        const outfitProducts =
          Array.isArray(outfit?.products)
            ? outfit.products
            : [];

        const productNames =
          outfitProducts
            .map((product) =>
              String(
                product?.name || "",
              ),
            )
            .join(" ")
            .toLowerCase();

        return (
          normalizedSearch.length ===
            0 ||
          outfitName.includes(
            normalizedSearch,
          ) ||
          outfitDescription.includes(
            normalizedSearch,
          ) ||
          productNames.includes(
            normalizedSearch,
          )
        );
      },
    );

    return [...filtered].sort(
      (a, b) => {
        if (sortOption === "name") {
          return String(
            a?.name || "",
          ).localeCompare(
            String(b?.name || ""),
          );
        }

        const firstDate =
          new Date(
            a?.createdAt || 0,
          ).getTime() || 0;

        const secondDate =
          new Date(
            b?.createdAt || 0,
          ).getTime() || 0;

        if (sortOption === "oldest") {
          return (
            firstDate - secondDate
          );
        }

        return secondDate - firstDate;
      },
    );
  }, [
    outfits,
    searchText,
    sortOption,
  ]);

  function getSelectedView(outfitId) {
    return (
      selectedViews[outfitId] ||
      "front"
    );
  }

  function changeOutfitView(
    outfitId,
    view,
  ) {
    setSelectedViews((current) => ({
      ...current,
      [outfitId]: view,
    }));
  }

  function saveOutfits(nextOutfits) {
    setOutfits(nextOutfits);

    localStorage.setItem(
      "fitfusion-saved-outfits",
      JSON.stringify(nextOutfits),
    );
  }

  function showTemporaryMessage(
    nextMessage,
  ) {
    setMessage(nextMessage);

    window.setTimeout(() => {
      setMessage("");
    }, 2500);
  }

  function confirmDeleteOutfit() {
    if (!outfitToDelete) {
      return;
    }

    const nextOutfits = outfits.filter(
      (outfit) =>
        outfit.id !== outfitToDelete.id,
    );

    saveOutfits(nextOutfits);
    setOutfitToDelete(null);

    showTemporaryMessage(
      "Outfit removed.",
    );
  }

  function addOutfitToCart(outfit) {
    const outfitProducts =
      Array.isArray(outfit?.products)
        ? outfit.products
        : [];

    if (outfitProducts.length === 0) {
      showTemporaryMessage(
        "This saved outfit has no products to add.",
      );

      return;
    }

    let cart = [];

    try {
      const savedCart =
        localStorage.getItem(
          "fitfusion-cart",
        );

      cart = savedCart
        ? JSON.parse(savedCart)
        : [];

      if (!Array.isArray(cart)) {
        cart = [];
      }
    } catch {
      cart = [];
    }

    outfitProducts.forEach(
      (product, index) => {
        const normalizedProduct =
          normalizeProduct(
            product,
            index,
          );

        const existingItem =
          cart.find(
            (item) =>
              item?.id ===
              normalizedProduct.id,
          );

        if (existingItem) {
          cart = cart.map((item) =>
            item?.id ===
            normalizedProduct.id
              ? {
                  ...item,
                  quantity:
                    Number(
                      item.quantity || 1,
                    ) +
                    normalizedProduct.quantity,
                }
              : item,
          );
        } else {
          cart.push(normalizedProduct);
        }
      },
    );

    localStorage.setItem(
      "fitfusion-cart",
      JSON.stringify(cart),
    );

    setCartCount(getCartCount());

    window.dispatchEvent(
      new Event(
        "fitfusion-cart-updated",
      ),
    );

    showTemporaryMessage(
      `${outfit.name} was added to your cart.`,
    );
  }

  return (
    <main className="saved-outfits-page">
      <header className="saved-outfits-top-header">
        <button
          type="button"
          className="saved-outfits-header-cart"
          onClick={() =>
            navigate("/shopper/cart")
          }
          aria-label={`Open shopping cart with ${cartCount} items`}
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

            <h1>Your saved outfits</h1>

            <p className="saved-outfits-description">
              Continue fitting, edit an
              outfit, or prepare its
              products for your shopping
              cart.
            </p>
          </div>

          <button
            type="button"
            className="saved-outfits-create"
            onClick={() =>
              navigate(
                "/shopper/fitting-studio",
              )
            }
          >
            <span>+</span>
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
              placeholder="Search saved outfits or products..."
              onChange={(event) =>
                setSearchText(
                  event.target.value,
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
                  event.target.value,
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
            {filteredOutfits.length ===
            1
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

        {filteredOutfits.length > 0 ? (
          <section className="saved-outfits-grid">
            {filteredOutfits.map(
              (outfit) => {
                const selectedView =
                  getSelectedView(
                    outfit.id,
                  );

                const outfitProducts =
                  Array.isArray(
                    outfit?.products,
                  )
                    ? outfit.products
                    : [];

                const totalPrice =
                  outfitProducts.reduce(
                    (
                      total,
                      product,
                    ) =>
                      total +
                      Number(
                        product?.price ||
                          0,
                      ) *
                        Math.max(
                          1,
                          Number(
                            product?.quantity ||
                              1,
                          ),
                        ),
                    0,
                  );

                return (
                  <article
                    key={outfit.id}
                    className="saved-outfit-card"
                  >
                    <div className="saved-outfit-preview">
                      <div className="saved-outfit-view-buttons">
                        {[
                          "front",
                          "side",
                          "rear",
                        ].map((view) => (
                          <button
                            key={view}
                            type="button"
                            className={
                              selectedView ===
                              view
                                ? "active"
                                : ""
                            }
                            onClick={() =>
                              changeOutfitView(
                                outfit.id,
                                view,
                              )
                            }
                          >
                            {capitalize(view)}
                          </button>
                        ))}
                      </div>

                      <OutfitAvatar
                        view={selectedView}
                        shirtColor={
                          outfit.color
                        }
                        pantsColor={
                          outfit.pantsColor
                        }
                        skinTone={
                          outfit.skinTone
                        }
                        gender={
                          outfit.gender
                        }
                      />
                    </div>

                    <div className="saved-outfit-information">
                      <div className="saved-outfit-title-row">
                        <div>
                          <p className="saved-outfit-label">
                            SAVED OUTFIT
                          </p>

                          <h2>
                            {outfit.name}
                          </h2>
                        </div>
                      </div>

                      <p className="saved-outfit-description">
                        {outfit.description}
                      </p>

                      <div className="saved-outfit-products">
                        {outfitProducts.length >
                        0 ? (
                          outfitProducts.map(
                            (
                              product,
                              index,
                            ) => (
                              <div
                                key={
                                  product.id ||
                                  `product-${index}`
                                }
                                className="saved-outfit-product"
                              >
                                <span>
                                  {
                                    product.name
                                  }
                                </span>

                                <strong>
                                  {formatCurrency(
                                    product.price,
                                  )}
                                </strong>
                              </div>
                            ),
                          )
                        ) : (
                          <p className="saved-outfit-no-products">
                            No products are
                            connected to this
                            saved outfit.
                          </p>
                        )}
                      </div>

                      <div className="saved-outfit-summary">
                        <span>
                          {
                            outfitProducts.length
                          }{" "}
                          {outfitProducts.length ===
                          1
                            ? "product"
                            : "products"}
                        </span>

                        <strong>
                          {formatCurrency(
                            totalPrice,
                          )}
                        </strong>
                      </div>

                      <div className="saved-outfit-actions">
                        <button
                          type="button"
                          className="saved-outfit-primary"
                          onClick={() =>
                            addOutfitToCart(
                              outfit,
                            )
                          }
                        >
                          Add Outfit to Cart
                        </button>

                        <button
                          type="button"
                          className="saved-outfit-secondary"
                          onClick={() =>
                            navigate(
                              `/shopper/saved-outfits/${outfit.id}/edit`,
                            )
                          }
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="saved-outfit-delete"
                          onClick={() =>
                            setOutfitToDelete(
                              outfit,
                            )
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </article>
                );
              },
            )}
          </section>
        ) : (
          <section className="saved-outfits-empty">
            <div className="saved-outfits-empty-icon">
              <HangerIcon />
            </div>

            <h2>
              No saved outfits found
            </h2>

            <p>
              Create an outfit in the
              Fitting Studio and save it
              to your collection.
            </p>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/shopper/fitting-studio",
                )
              }
            >
              Open Fitting Studio
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
          role="presentation"
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
            <p className="saved-outfits-modal-label">
              REMOVE SAVED OUTFIT
            </p>

            <h2 id="delete-outfit-title">
              Remove{" "}
              {outfitToDelete.name}?
            </h2>

            <p>
              This outfit will be removed
              from your saved collection.
              This action cannot be undone.
            </p>

            <div className="saved-outfits-modal-actions">
              <button
                type="button"
                className="saved-outfits-confirm-delete"
                onClick={
                  confirmDeleteOutfit
                }
              >
                Remove Outfit
              </button>

              <button
                type="button"
                className="saved-outfits-cancel-delete"
                onClick={() =>
                  setOutfitToDelete(null)
                }
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function OutfitAvatar({
  view,
  shirtColor,
  pantsColor,
  skinTone,
  gender,
}) {
  if (view === "side") {
    return (
      <svg
        className="saved-outfit-avatar"
        viewBox="0 0 260 390"
        role="img"
        aria-label="Side view of outfit"
      >
        <ellipse
          cx="134"
          cy="65"
          rx="40"
          ry="49"
          fill={skinTone}
          stroke="#6d5038"
          strokeWidth="3"
        />

        <path
          d="M101 45c9-34 74-38 80 2v19h-77Z"
          fill="#2f2119"
        />

        <circle
          cx="158"
          cy="67"
          r="3"
          fill="#29251f"
        />

        <rect
          x="121"
          y="111"
          width="27"
          height="35"
          fill={skinTone}
          stroke="#6d5038"
          strokeWidth="3"
        />

        <path
          d="M112 143c45-12 66 15 59 117h-68c-7-57-3-96 9-117Z"
          fill={shirtColor}
          stroke="#5f492d"
          strokeWidth="3"
        />

        <path
          d="M165 161c21 9 25 28 23 85-1 20-14 28-25 17l-4-90Z"
          fill={skinTone}
          stroke="#6d5038"
          strokeWidth="3"
        />

        <path
          d="M110 260h59l8 112h-31l-10-91-5 91H99Z"
          fill={pantsColor}
          stroke="#17130f"
          strokeWidth="3"
        />
      </svg>
    );
  }

  if (view === "rear") {
    return (
      <svg
        className="saved-outfit-avatar"
        viewBox="0 0 260 390"
        role="img"
        aria-label="Rear view of outfit"
      >
        <ellipse
          cx="130"
          cy="65"
          rx="42"
          ry="49"
          fill={skinTone}
          stroke="#6d5038"
          strokeWidth="3"
        />

        <path
          d="M88 51c2-45 84-48 86 0v18H88Z"
          fill="#2f2119"
        />

        <rect
          x="116"
          y="111"
          width="28"
          height="35"
          fill={skinTone}
          stroke="#6d5038"
          strokeWidth="3"
        />

        <path
          d="M91 145c17-10 61-10 78 0l7 115H84Z"
          fill={shirtColor}
          stroke="#5f492d"
          strokeWidth="3"
        />

        <rect
          x="59"
          y="158"
          width="31"
          height="110"
          rx="15"
          fill={skinTone}
          stroke="#6d5038"
          strokeWidth="3"
        />

        <rect
          x="170"
          y="158"
          width="31"
          height="110"
          rx="15"
          fill={skinTone}
          stroke="#6d5038"
          strokeWidth="3"
        />

        <path
          d="M86 260h88l9 112h-37l-16-92-16 92H77Z"
          fill={pantsColor}
          stroke="#17130f"
          strokeWidth="3"
        />
      </svg>
    );
  }

  return (
    <svg
      className="saved-outfit-avatar"
      viewBox="0 0 260 390"
      role="img"
      aria-label="Front view of outfit"
    >
      <ellipse
        cx="130"
        cy="65"
        rx="42"
        ry="49"
        fill={skinTone}
        stroke="#6d5038"
        strokeWidth="3"
      />

      <path
        d="M88 51c2-45 84-48 86 0v18H88Z"
        fill="#2f2119"
      />

      <circle
        cx="111"
        cy="69"
        r="3"
        fill="#29251f"
      />

      <circle
        cx="149"
        cy="69"
        r="3"
        fill="#29251f"
      />

      <rect
        x="116"
        y="111"
        width="28"
        height="35"
        fill={skinTone}
        stroke="#6d5038"
        strokeWidth="3"
      />

      <path
        d="M91 145c17-10 61-10 78 0l7 115H84Z"
        fill={shirtColor}
        stroke="#5f492d"
        strokeWidth="3"
      />

      <rect
        x="59"
        y="158"
        width="31"
        height="110"
        rx="15"
        fill={skinTone}
        stroke="#6d5038"
        strokeWidth="3"
      />

      <rect
        x="170"
        y="158"
        width="31"
        height="110"
        rx="15"
        fill={skinTone}
        stroke="#6d5038"
        strokeWidth="3"
      />

      {gender === "Female" && (
        <path
          d="M92 232c21 9 55 9 76 0"
          fill="none"
          stroke="rgba(255,255,255,.4)"
          strokeWidth="3"
        />
      )}

      <path
        d="M86 260h88l9 112h-37l-16-92-16 92H77Z"
        fill={pantsColor}
        stroke="#17130f"
        strokeWidth="3"
      />
    </svg>
  );
}

function CartIcon() {
  return (
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
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        cx="11"
        cy="11"
        r="7"
      />

      <path d="m16 16 5 5" />
    </svg>
  );
}

function HangerIcon() {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
    >
      <path d="M13.5 8.5a3 3 0 1 1 4.7 2.5L17 12v2l11 8H4l11-8" />
    </svg>
  );
}

function capitalize(value) {
  const safeValue = String(
    value || "",
  );

  return (
    safeValue.charAt(0).toUpperCase() +
    safeValue.slice(1)
  );
}

function formatCurrency(value) {
  return new Intl.NumberFormat(
    "en-PH",
    {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    },
  ).format(Number(value || 0));
}

export default SavedOutfitsPage;