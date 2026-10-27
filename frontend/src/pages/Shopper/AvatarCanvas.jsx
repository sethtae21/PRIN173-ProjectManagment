
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  imageToCanvas,
  detectBodyBounds,
  makeLattice,
  renderLayer,
  tintBody,
  catalogIllustration,
} from "./canvasWarp2D";

const WIDTH = 320;
const HEIGHT = 640;

const imageCache = new Map();

// ==========================================
// LOAD BLENDER AVATAR IMAGE
// ==========================================

function loadImage(path) {
  if (!imageCache.has(path)) {
    const promise = new Promise(
      (resolve, reject) => {
        const image = new Image();

        image.onload = () =>
          resolve(image);

        image.onerror = () =>
          reject(
            new Error(
              `Missing avatar image: ${path}`
            )
          );

        image.src = path;
      }
    );

    imageCache.set(
      path,
      promise
    );

    promise.catch(() => {
      imageCache.delete(path);
    });
  }

  return imageCache.get(path);
}

// ==========================================
// STANDARD AVATAR PATHS
// ==========================================

function avatarPath(
  gender,
  view
) {
  const folder =
    gender === "male"
      ? "Male_Standard"
      : "Female_Standard";

  return `/Avatars/${folder}/${folder}_${view}.png`;
}

// ==========================================
// PREPARE BLENDER AVATAR
// ==========================================

function prepareAvatar(image) {
  const preview = imageToCanvas(
    image,
    WIDTH,
    HEIGHT
  );

  const bounds =
    detectBodyBounds(preview);

  if (!bounds) {
    return preview;
  }

  const sx =
    (
      bounds.left *
      image.width
    ) /
    WIDTH;

  const sy =
    (
      bounds.top *
      image.height
    ) /
    HEIGHT;

  const sw = Math.max(
    1,
    (
      bounds.width *
      image.width
    ) /
      WIDTH
  );

  const sh = Math.max(
    1,
    (
      bounds.height *
      image.height
    ) /
      HEIGHT
  );

  // Leave enough space for a heavier
  // avatar to expand horizontally.
  const targetHeight =
    HEIGHT * 0.72;

  const targetWidth = Math.min(
    WIDTH * 0.70,
    (sw / sh) * targetHeight
  );

  const targetLeft =
    (
      WIDTH -
      targetWidth
    ) /
    2;

  const targetTop =
    HEIGHT * 0.96 -
    targetHeight;

  const canvas =
    document.createElement("canvas");

  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const ctx =
    canvas.getContext("2d");

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

// ==========================================
// NORMALIZE CLOTHING CATEGORIES
// ==========================================

function normalizeItem(item) {
  if (!item) {
    return null;
  }

  const category = String(
    item.category || ""
  ).toLowerCase();

  const categories = {
    top: "Tops",
    tops: "Tops",

    bottom: "Bottoms",
    bottoms: "Bottoms",

    shoes: "Footwear",
    shoe: "Footwear",
    footwear: "Footwear",

    dress: "Dresses",
    dresses: "Dresses",

    outerwear: "Outerwear",
  };

  return {
    ...item,

    category:
      categories[category] ||
      item.category,

    colors:
      item.colors ||
      [
        item.color ||
          "Beige",
      ],
  };
}

// ==========================================
// MAIN AVATAR COMPONENT
// ==========================================

export default function AvatarCanvas({
  avatar,
  view = "Front",
  equippedItems = {},
}) {
  const canvasRef = useRef(null);

  const [
    imageState,
    setImageState,
  ] = useState(null);

  const [
    error,
    setError,
  ] = useState("");

  // ========================================
  // GENDER
  // ========================================

  const gender =
    String(
      avatar?.gender
    ).toLowerCase() === "male"
      ? "male"
      : "female";

  // ========================================
  // VIEW
  // ========================================

  const requestedView = String(
    view
  ).toLowerCase();

  const angle = [
    "front",
    "side",
    "rear",
  ].includes(requestedView)
    ? requestedView
    : "front";

  const path = avatarPath(
    gender,
    angle
  );

  // ========================================
  // LOAD AVATAR IMAGE
  // ========================================

  useEffect(() => {
    let active = true;

    setImageState(null);
    setError("");

    loadImage(path)
      .then((image) => {
        if (!active) return;

        setImageState({
          image,
          path,
        });
      })
      .catch((err) => {
        if (!active) return;

        console.error(
          "Avatar loading error:",
          err
        );

        setError(
          `Could not load avatar. Check public${path}`
        );
      });

    return () => {
      active = false;
    };
  }, [path]);

  // ========================================
  // PREPARE BLENDER IMAGE
  // ========================================

  const source = useMemo(() => {
    if (!imageState?.image) {
      return null;
    }

    return prepareAvatar(
      imageState.image
    );
  }, [imageState]);

  // ========================================
  // DETECT BODY BOUNDS
  // ========================================

  const bounds = useMemo(() => {
    return detectBodyBounds(
      source
    );
  }, [source]);

  // ========================================
  // APPLY SKIN TONE
  // ========================================

  const skin = useMemo(() => {
    if (!source) {
      return null;
    }

    return tintBody(
      source,
      avatar?.skinTone ||
        "Original",
      avatar?.undertone ||
        "Neutral"
    );
  }, [
    source,
    avatar?.skinTone,
    avatar?.undertone,
  ]);

  // ========================================
  // PREPARE CLOTHING
  // ========================================

  const garments = useMemo(() => {
    if (!bounds) {
      return [];
    }

    const items =
      equippedItems.dress
        ? [
            equippedItems.dress,
            equippedItems.outerwear,
            equippedItems.shoes,
          ]
        : [
            equippedItems.bottom,
            equippedItems.top,
            equippedItems.outerwear,
            equippedItems.shoes,
          ];

    return items
      .filter(Boolean)
      .map(normalizeItem)
      .map((item) =>
        catalogIllustration(
          item,
          bounds,
          angle,
          WIDTH,
          HEIGHT
        )
      )
      .filter(Boolean);
  }, [
    equippedItems,
    bounds,
    angle,
  ]);

  // ========================================
  // CANVAS RENDERING
  // ========================================

  useEffect(() => {
    const canvas =
      canvasRef.current;

    if (!canvas) {
      return;
    }

    const ctx =
      canvas.getContext("2d");

    if (!ctx) {
      return;
    }

    ctx.clearRect(
      0,
      0,
      WIDTH,
      HEIGHT
    );

    if (
      !skin ||
      !bounds
    ) {
      return;
    }

    let active = true;

    const frame =
      requestAnimationFrame(() => {
        if (!active) return;

        try {
          // ================================
          // AVATAR CONFIGURATION
          // ================================

          const config = {
            gender,

            view: angle,

            heightCm:
              Number(
                avatar?.height
              ) || 164,

            weightKg:
              Number(
                avatar?.weight
              ) ||
              (
                gender === "male"
                  ? 70
                  : 58
              ),

            shoulders:
              avatar?.shoulder ||
              "Average",

            waist:
              avatar?.waist ||
              "Average",

            hips:
              avatar?.hip ||
              "Average",

            thighs:
              avatar?.thigh ||
              "Average",

            cup:
              gender === "female"
                ? avatar?.cupSize ||
                  "B"
                : "B",

            // Full weight response.
            strength: 1,
          };

          // ================================
          // CREATE CONTINUOUS BODY MESH
          // ================================

          const mesh = makeLattice(
            WIDTH,
            HEIGHT,
            bounds,
            config
          );

          ctx.clearRect(
            0,
            0,
            WIDTH,
            HEIGHT
          );

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          // ================================
          // RENDER COMPLETE BLENDER BODY
          // ================================

          // One connected mesh for:
          // - Head
          // - Shoulders
          // - Upper arms
          // - Forearms
          // - Hands
          // - Chest
          // - Belly
          // - Hips
          // - Thighs
          // - Calves
          // - Feet

          renderLayer(
            ctx,
            skin,
            mesh
          );

          // ================================
          // RENDER CLOTHING
          // ================================

          garments.forEach(
            (garment) => {
              renderLayer(
                ctx,
                garment,
                mesh
              );
            }
          );

          if (active) {
            setError("");
          }
        } catch (err) {
          console.error(
            "Avatar rendering error:",
            err
          );

          if (active) {
            setError(
              err?.message ||
                "Unable to render avatar."
            );
          }
        }
      });

    return () => {
      active = false;

      cancelAnimationFrame(
        frame
      );
    };
  }, [
    skin,
    bounds,
    garments,
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

  // ========================================
  // DISPLAY
  // ========================================

  return (
    <div
      className="studio-canvas-wrapper"
      style={{
        width: "100%",
        textAlign: "center",
      }}
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

          width:
            "min(100%, 320px)",

          height: "auto",

          aspectRatio:
            "1 / 2",

          margin:
            "0 auto",

          filter:
            "drop-shadow(0 9px 7px rgba(63,43,30,0.15))",
        }}
      />

      {!imageState && !error && (
        <small
          style={{
            display: "block",
            color: "#857660",
            marginTop: 8,
          }}
        >
          Loading avatar...
        </small>
      )}

      {error && (
        <small
          role="alert"
          style={{
            display: "block",
            color: "#b42318",
            marginTop: 8,
          }}
        >
          {error}
        </small>
      )}
    </div>
  );
}
