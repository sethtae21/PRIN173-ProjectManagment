import { useEffect, useMemo, useRef, useState } from "react";

import { getCachedCatalogItem } from "../../services/api";

import {
  imageToCanvas,
  detectBodyBounds,
  makeLattice,
  makeGarmentMesh,
  renderLayer,
  tintBody,
  catalogIllustration,
  garmentImageLayer,
  preloadGarmentImage,
  peekCroppedGarment,
} from "./canvasWarp2D";

const WIDTH = 320;
const HEIGHT = 640;

// Lift outerwear slightly so the jacket collar and shoulder seams
// align more closely with the avatar's shoulders.
const OUTERWEAR_LIFT_PX = 16;

const imageCache = new Map();

// FIX (dress on male): defensive render-side gate. Even if a dress-class
// item reaches the canvas through a stale session or a saved outfit, it is
// never handed to the warp pipeline on a male avatar. This does NOT modify
// canvasWarp2D.js -- it only chooses which items to render -- so the
// approved sweater / blazer / jeans fit is byte-for-byte unchanged.
const FEMALE_ONLY_CATEGORY_PATTERN = /dress|gown|jumpsuit|romper|one-?piece/i;

function isFemaleOnlyAvatarItem(item) {
  if (!item) return false;
  if (item.femaleOnlyCut === true) return true;
  return (
    FEMALE_ONLY_CATEGORY_PATTERN.test(String(item.rawCategory || "")) ||
    FEMALE_ONLY_CATEGORY_PATTERN.test(String(item.category || ""))
  );
}

function isOuterwearItem(item) {
  if (!item) return false;

  const category = String(
    item.rawCategory || item.category || ""
  ).toLowerCase();

  const name = String(item.name || "").toLowerCase();

  return (
    category.includes("outer") ||
    /blazer|jacket|coat|parka|hoodie|windbreaker|trench/.test(name)
  );
}

function loadImage(path) {
  if (!imageCache.has(path)) {
    const promise = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(new Error(`Missing avatar image: ${path}`));
      image.src = path;
    });

    imageCache.set(path, promise);

    promise.catch(() => {
      imageCache.delete(path);
    });
  }

  return imageCache.get(path);
}

function avatarPath(gender, view) {
  const folder =
    gender === "male" ? "Male_Standard" : "Female_Standard";
  return `/Avatars/${folder}/${folder}_${view}.png`;
}

function prepareAvatar(image) {
  const preview = imageToCanvas(image, WIDTH, HEIGHT);
  const bounds = detectBodyBounds(preview);

  if (!bounds) {
    return preview;
  }

  const sx = (bounds.left * image.width) / WIDTH;
  const sy = (bounds.top * image.height) / HEIGHT;
  const sw = Math.max(1, (bounds.width * image.width) / WIDTH);
  const sh = Math.max(1, (bounds.height * image.height) / HEIGHT);

  const targetHeight = HEIGHT * 0.72;
  const targetWidth = Math.min(
    WIDTH * 0.7,
    (sw / sh) * targetHeight
  );
  const targetLeft = (WIDTH - targetWidth) / 2;
  const targetTop = HEIGHT * 0.96 - targetHeight;

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return preview;
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    image,
    sx,
    sy,
    sw,
    sh,
    targetLeft,
    targetTop,
    targetWidth,
    targetHeight
  );

  return canvas;
}

function normalizeItem(item) {
  if (!item) {
    return null;
  }

  const category = String(item.category || "").toLowerCase();

  // Footwear permanently removed from the catalog: no shoe mapping.
  const categories = {
    top: "Tops",
    tops: "Tops",
    bottom: "Bottoms",
    bottoms: "Bottoms",
    dress: "Dresses",
    dresses: "Dresses",
    outerwear: "Outerwear",
  };

  return {
    ...item,
    category: categories[category] || item.category,
    colors: item.colors || [item.color || "Beige"],
  };
}

// The catalog stores three-view photos, but some payloads (ranked
// recommendations, saved-outfit snapshots) carry only the front photo on the
// item object. garmentImageLayer() always reads product.image, so for the
// rear angle we hand the warp pipeline a proxy whose image is the REAR
// photo -- either straight from the item or fetched once from the catalog
// record (rearSources). Falls back to the front photo only when a listing
// genuinely has no rear asset.
function rearImageOf(item) {
  return (
    item.rear_image ||
    item.rearImageUrl ||
    item.rear_image_url ||
    item.rearImage ||
    ""
  );
}

function toMediaUrl(path) {
  if (!path) return "";
  const raw = String(path);
  if (raw.startsWith("http")) return raw;
  return raw.startsWith("/") ? raw : `/${raw}`;
}

export default function AvatarCanvas({
  avatar,
  view = "Front",
  equippedItems = {},
}) {
  const canvasRef = useRef(null);

  const [imageState, setImageState] = useState(null);
  const [error, setError] = useState("");
  const [garmentImageVersion, setGarmentImageVersion] = useState(0);
  const [rearSources, setRearSources] = useState({});

  const gender =
    String(avatar?.gender).toLowerCase() === "male" ? "male" : "female";

  const requestedView = String(view).toLowerCase();

  const angle = ["front", "rear"].includes(requestedView)
    ? requestedView
    : "front";

  const path = avatarPath(gender, angle);

  useEffect(() => {
    let active = true;

    setImageState(null);
    setError("");

    loadImage(path)
      .then((image) => {
        if (!active) return;
        setImageState({ image, path });
      })
      .catch((err) => {
        if (!active) return;
        console.error("Avatar loading error:", err);
        setError(`Could not load avatar. Check public${path}`);
      });

    return () => {
      active = false;
    };
  }, [path]);

  const source = useMemo(() => {
    if (!imageState?.image) return null;
    return prepareAvatar(imageState.image);
  }, [imageState]);

  const bounds = useMemo(() => {
    return detectBodyBounds(source);
  }, [source]);

  const skin = useMemo(() => {
    if (!source) return null;
    return tintBody(
      source,
      avatar?.skinTone || "Original",
      avatar?.undertone || "Neutral"
    );
  }, [source, avatar?.skinTone, avatar?.undertone]);

  const garmentItems = useMemo(() => {
    // Footwear permanently removed: no shoes slot is rendered.
    const items = equippedItems.dress
      ? [
          equippedItems.dress,
          equippedItems.outerwear,
        ]
      : [
          equippedItems.bottom,
          equippedItems.top,
          equippedItems.outerwear,
        ];

    return items
      .filter(Boolean)
      .map(normalizeItem)
      .filter(Boolean)
      // FIX (dress on male): drop female-only cuts before they reach the
      // warp pipeline when the avatar is male.
      .filter((item) => !(gender === "male" && isFemaleOnlyAvatarItem(item)));
  }, [equippedItems, gender]);

  // NEW: fetch the catalog record once per garment that arrived without a
  // rear photo, so the Rear angle can show the real rear photograph.
  useEffect(() => {
    let active = true;

    const missing = garmentItems.filter((item) => {
      const id = item?.id ?? item?.item_id ?? item?.product_id;
      return (
        id !== undefined &&
        id !== null &&
        id !== "" &&
        !rearImageOf(item) &&
        !(String(id) in rearSources)
      );
    });

    if (!missing.length) {
      return undefined;
    }

    missing.forEach((item) => {
      const id = String(item.id ?? item.item_id ?? item.product_id);

      getCachedCatalogItem(id)
        .then((record) => {
          if (!active) return;
          const rear = toMediaUrl(
            record?.rear_image ||
              record?.rearImageUrl ||
              record?.rear_image_url ||
              record?.rearImage ||
              ""
          );
          setRearSources((current) => ({ ...current, [id]: rear }));
        })
        .catch(() => {
          if (!active) return;
          // Unreachable catalog: keep the documented front-photo fallback.
          setRearSources((current) => ({ ...current, [id]: "" }));
        });
    });

    return () => {
      active = false;
    };
  }, [garmentItems, rearSources]);

  function rearSourceFor(item) {
    const own = rearImageOf(item);
    if (own) return own;
    const id = item?.id ?? item?.item_id ?? item?.product_id;
    return (id !== undefined && id !== null && String(id) in rearSources)
      ? rearSources[String(id)]
      : "";
  }

  // View-aware garment list (rear photo on the rear angle).
  const viewGarmentItems = useMemo(() => {
    if (angle !== "rear") return garmentItems;

    return garmentItems.map((item) => {
      const rearSrc = rearSourceFor(item);
      return rearSrc ? { ...item, image: rearSrc } : item;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [garmentItems, angle, rearSources]);

  useEffect(() => {
    let active = true;

    // Preload BOTH angles so switching Front/Rear never shows the polygon
    // fallback while a crop is still loading.
    const sources = garmentItems
      .flatMap((item) => [
        item.image || item.front_image || "",
        rearSourceFor(item),
      ])
      .filter(Boolean);

    if (!sources.length) {
      return undefined;
    }

    sources.forEach((src) => {
      if (peekCroppedGarment(src)) {
        return;
      }

      preloadGarmentImage(src)
        .then(() => {
          if (active) {
            setGarmentImageVersion((version) => version + 1);
          }
        })
        .catch(() => {
          // Missing/unreadable image: keep polygon fallback silently.
        });
    });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [garmentItems, rearSources]);

  const garmentLayers = useMemo(() => {
    if (!bounds) return [];

    return viewGarmentItems
      .map((item) => ({
        item,
        layer:
          garmentImageLayer(
            item,
            bounds,
            angle,
            WIDTH,
            HEIGHT,
            source,
            gender
          ) || catalogIllustration(item, bounds, angle, WIDTH, HEIGHT),
      }))
      .filter((entry) => Boolean(entry.layer));
  }, [
    viewGarmentItems,
    bounds,
    angle,
    source,
    gender,
    garmentImageVersion,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    if (!skin || !bounds) {
      return;
    }

    let active = true;

    const frame = requestAnimationFrame(() => {
      if (!active) return;

      try {
        // Body mesh: full deformation from all avatar parameters.
        const config = {
          gender,
          view: angle,
          heightCm: Number(avatar?.height) || 164,
          weightKg:
            Number(avatar?.weight) || (gender === "male" ? 70 : 58),
          shoulders: avatar?.shoulder || "Average",
          waist: avatar?.waist || "Average",
          hips: avatar?.hip || "Average",
          thighs: avatar?.thigh || "Average",
          cup: gender === "female" ? avatar?.cupSize || "B" : "B",
          strength: 1,
        };

        const mesh = makeLattice(WIDTH, HEIGHT, bounds, config);

        ctx.clearRect(0, 0, WIDTH, HEIGHT);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        renderLayer(ctx, skin, mesh);

        // Each garment renders through its own size-true mesh: it follows
        // the body's position (rigid translation at its anchor) and the
        // FR-2.7 shape controls, but never squeezes/stretches with the
        // Height / Body Build sliders.
        garmentLayers.forEach((entry) => {
          const garmentMesh = makeGarmentMesh(
            WIDTH,
            HEIGHT,
            bounds,
            config,
            entry.item
          );

          // Lift outerwear slightly to align its collar and shoulder seams.
          // Save/restore keeps this translation from affecting later layers.
          if (isOuterwearItem(entry.item)) {
            ctx.save();
            ctx.translate(0, -OUTERWEAR_LIFT_PX);
            renderLayer(ctx, entry.layer, garmentMesh);
            ctx.restore();
          } else {
            renderLayer(ctx, entry.layer, garmentMesh);
          }
        });

        if (active) {
          setError("");
        }
      } catch (err) {
        console.error("Avatar rendering error:", err);
        if (active) {
          setError(err?.message || "Unable to render avatar.");
        }
      }
    });

    return () => {
      active = false;
      cancelAnimationFrame(frame);
    };
  }, [
    skin,
    bounds,
    garmentLayers,
    gender,
    angle,
    avatar?.height,
    avatar?.weight,
    avatar?.shoulder,
    avatar?.waist,
    avatar?.hip,
    avatar?.thigh,
    avatar?.cupSize,
  ]);

  return (
    <div
      className="studio-canvas-wrapper"
      style={{ width: "100%", textAlign: "center" }}
    >
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        className="studio-avatar-canvas"
        role="img"
        aria-label={`${gender} avatar, ${angle} view`}
        style={{
          display: "block",
          width: "min(100%, 320px)",
          height: "auto",
          aspectRatio: "1 / 2",
          margin: "0 auto",
          filter: "drop-shadow(0 9px 7px rgba(63,43,30,0.15))",
        }}
      />

      {!imageState && !error && (
        <small
          style={{ display: "block", color: "#857660", marginTop: 8 }}
        >
          Loading avatar...
        </small>
      )}

      {error && (
        <small
          role="alert"
          style={{ display: "block", color: "#b42318", marginTop: 8 }}
        >
          {error}
        </small>
      )}
    </div>
  );
}