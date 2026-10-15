import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { products as catalogProducts } from "../CatalogPage";
import {
  BODY_OPTIONS,
  SKIN_TONES,
  GRID_COLS,
  GRID_ROWS,
  selectSilhouette,
  imageToCanvas,
  detectBodyBounds,
  makeLattice,
  renderLayer,
  renderGrid,
  tintBody,
  catalogIllustration,
} from "./canvasWarp2D";
import "../css/FemaleAvatarCanvasTest.css";

const ROOT = "/Avatars/Female_avatar";
const avatarPath = (letter, view) => `${ROOT}/Female_${letter}/female_${letter}_${view}.png`;
const PRODUCT_VIEWS = ["front", "side", "rear"];
const DEFAULT_SHAPE = {
  shoulders: "Average", waist: "Average", hips: "Average", thighs: "Average", cup: "B",
};
const clamp = (x, min, max) => Math.min(max, Math.max(min, x));

const femaleCatalog = catalogProducts.filter(
  (p) =>
    ["Women", "Unisex"].includes(p.gender) &&
    ["Tops", "Bottoms", "Dresses", "Outerwear"].includes(p.category)
);
const peso = (value) => new Intl.NumberFormat("en-PH", {
  style: "currency", currency: "PHP", maximumFractionDigits: 0,
}).format(value || 0);

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not open ${url}`));
    image.src = url;
  });
}

function SegmentControl({ label, options, value, onChange }) {
  return (
    <div className="fc-control">
      <span className="fc-label">{label}</span>
      <div className="fc-segments">
        {options.map((item) => (
          <button key={item} type="button" aria-pressed={value === item}
            className={item === value ? "fc-pill is-active" : "fc-pill"}
            onClick={() => onChange(item)}>{item}</button>
        ))}
      </div>
    </div>
  );
}

function RangeControl({ label, value, min, max, step = 1, onChange, unit = "" }) {
  const display = Number(value).toFixed(step < 1 ? 2 : 0);
  return (
    <label className="fc-range">
      <span className="fc-range-title"><b>{label}</b><strong>{display}{unit}</strong></span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value), min, max))} />
    </label>
  );
}

export default function FemaleAvatarCanvasTest() {
  const canvasRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState("front");
  const [heightCm, setHeightCm] = useState(164);
  const [weightKg, setWeightKg] = useState(85);
  const [shape, setShape] = useState(DEFAULT_SHAPE);
  const [tone, setTone] = useState("Original");
  const [undertone, setUndertone] = useState("Neutral");
  const [strength, setStrength] = useState(1);
  const [quality, setQuality] = useState(512);
  const [showGrid, setShowGrid] = useState(false);
  const [compare, setCompare] = useState(false);
  const [sideFacing, setSideFacing] = useState("left");
  const [loaded, setLoaded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drawMs, setDrawMs] = useState(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogCategory, setCatalogCategory] = useState("All");

  const requested = selectSilhouette(weightKg, heightCm);
  const chosenProductId = searchParams.get("product");
  const product = femaleCatalog.find((item) => item.id === chosenProductId) || null;
  const W = quality, H = quality * 2;

  const changeShape = (field, value) => setShape((p) => ({ ...p, [field]: value }));
  const selectProduct = (id) => {
    const params = new URLSearchParams(searchParams);
    if (id) params.set("product", id); else params.delete("product");
    setSearchParams(params, { replace: true });
    setCatalogOpen(false);
  };

  const filteredCatalog = useMemo(() => femaleCatalog.filter((item) => {
    const query = catalogQuery.trim().toLowerCase();
    return (catalogCategory === "All" || item.category === catalogCategory) &&
      (!query || `${item.name} ${item.sellerName} ${item.category}`.toLowerCase().includes(query));
  }), [catalogCategory, catalogQuery]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setLoaded(null); setError("");
    (async () => {
      try {
        let letter = requested.letter;
        let isFallback = false;
        let image;
        try { image = await loadImage(avatarPath(letter, view)); }
        catch {
          letter = "C";
          isFallback = true;
          image = await loadImage(avatarPath("C", view));
        }
        if (!cancelled) setLoaded({ image, letter, isFallback });
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [view, requested.letter]);

  const source = useMemo(() => loaded?.image ? imageToCanvas(loaded.image, W, H) : null, [loaded, W, H]);
  const bounds = useMemo(() => detectBodyBounds(source), [source]);
  const skin = useMemo(() => tintBody(source, tone, undertone), [source, tone, undertone]);
  const cloth = useMemo(() => catalogIllustration(product, bounds, view, W, H), [product, bounds, view, W, H]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    if (!skin || !bounds) return;
    const id = requestAnimationFrame(() => {
      const start = performance.now();
      ctx.clearRect(0, 0, W, H);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      const mesh = makeLattice(W, H, bounds, {
        view, heightCm, sideFacing,
        ...(compare ? DEFAULT_SHAPE : shape),
        strength: compare ? 0 : strength,
      });
      renderLayer(ctx, skin, mesh);
      if (cloth) renderLayer(ctx, cloth, mesh);
      if (showGrid) renderGrid(ctx, mesh, bounds);
      setDrawMs(performance.now() - start);
    });
    return () => cancelAnimationFrame(id);
  }, [skin, bounds, cloth, W, H, heightCm, view, sideFacing, shape, strength, showGrid, compare]);

  function resetAvatar() {
    setHeightCm(164); setWeightKg(85); setShape(DEFAULT_SHAPE);
    setTone("Original"); setUndertone("Neutral"); setStrength(1);
    setSideFacing("left"); setShowGrid(false); setCompare(false);
    selectProduct(null);
  }

  return (
    <main className="fc-test">
      <header className="fc-header">
        <div>
          <p className="fc-eyebrow">FITFUSION AI Â· KAN-116 Â· CANVAS 2D ONLY</p>
          <h1>Avatar C â€” Deformation & Catalog Try-On</h1>
          <p>Calibrated body regions, fixed head width, height/weight selection, and catalog garment preview.</p>
        </div>
        <button type="button" className="fc-outline" onClick={resetAvatar}>Reset avatar</button>
      </header>

      <div className="fc-layout">
        <section className="fc-card fc-preview-card">
          <div className="fc-preview-title"><h2>Avatar Preview</h2><span>NO WEBGL</span></div>
          <div className="fc-segments fc-view-tabs" role="group" aria-label="Viewing angle">
            {PRODUCT_VIEWS.map((v) => (
              <button key={v} type="button" className={v === view ? "fc-pill is-active" : "fc-pill"}
                aria-pressed={v === view} onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>
            ))}
          </div>
          <div className="fc-canvas-box">
            <canvas ref={canvasRef} width={W} height={H} role="img"
              aria-label={`Female avatar ${loaded?.letter || 'C'} ${view} view`} />
            {(loading || error || !bounds) && (
              <div className="fc-overlay-message">{error || (loading ? "Loading avatarâ€¦" : "Avatar PNG is empty or has no transparency.")}</div>
            )}
          </div>
          <div className="fc-readings">
            <span>Requested silhouette: <b>{requested.letter}</b></span>
            <span>Loaded PNG: <b>{loaded?.letter || "â€”"}</b></span>
            <span>Reference weight: <b>{requested.referenceWeight.toFixed(1)} kg</b></span>
            <span>Canvas draw: <b>{drawMs === null ? "â€”" : `${drawMs.toFixed(1)} ms`}</b></span>
          </div>
          {loaded?.isFallback && <p className="fc-warning">Requested silhouette {requested.letter} is not rendered yet. Showing Female C unchanged â€” no fake whole-body stretching.</p>}
          {bounds && <p className="fc-tiny">Auto-calibrated body: {Math.round(bounds.width)} Ã— {Math.round(bounds.height)} preview pixels. Shoulder/waist/hip zones follow this detected body, not blank PNG margins.</p>}
        </section>

        <section className="fc-card fc-settings">
          <h2>Measurements</h2>
          <RangeControl label="Height" min={140} max={218.44} step={0.01} value={heightCm} onChange={setHeightCm} unit=" cm" />
          <RangeControl label="Weight" min={40} max={200} value={weightKg} onChange={setWeightKg} unit=" kg" />
          <p className="fc-tiny">Weight selects Aâ€“E base art with a reference-weight heuristic. Minimum input limits are test placeholders. Missing A/B/D/E PNGs use C unchanged.</p>

          <h2>Independent body adjustments</h2>
          <SegmentControl label="Shoulder width" options={BODY_OPTIONS.shoulders} value={shape.shoulders} onChange={(v) => changeShape("shoulders", v)} />
          <SegmentControl label="Waist" options={BODY_OPTIONS.waist} value={shape.waist} onChange={(v) => changeShape("waist", v)} />
          <SegmentControl label="Hips" options={BODY_OPTIONS.hips} value={shape.hips} onChange={(v) => changeShape("hips", v)} />
          <SegmentControl label="Thighs" options={BODY_OPTIONS.thighs} value={shape.thighs} onChange={(v) => changeShape("thighs", v)} />
          <SegmentControl label="Cup (prototype only)" options={BODY_OPTIONS.cup} value={shape.cup} onChange={(v) => changeShape("cup", v)} />
          <p className="fc-tiny">Change just one region at a time. The head stays the same width when shoulders change. Side-view cups remain experimental; rendered variants may be needed.</p>

          <h2>Skin color</h2>
          <div className="fc-selects">
            <label>Skin tone<select value={tone} onChange={(e) => setTone(e.target.value)}>
              {Object.keys(SKIN_TONES).map((key) => <option key={key}>{key}</option>)}
            </select></label>
            <label>Undertone<select value={undertone} onChange={(e) => setUndertone(e.target.value)}>
              {["Neutral", "Warm", "Cool"].map((key) => <option key={key}>{key}</option>)}
            </select></label>
          </div>
          <p className="fc-tiny">Skin tint applies only to the avatar layer, not clothes. A separate mask is needed for hair/eyes in production.</p>

          <h2>Choose clothing from Catalog</h2>
          <div className="fc-catalog-choice">
            <div className="fc-current-product">
              {product ? <><span className="fc-emoji">{product.symbol || "ðŸ‘š"}</span><div><b>{product.name}</b><small>{product.sellerName} Â· {peso(product.price)}</small></div></> : <p>No clothing selected yet</p>}
            </div>
            <button type="button" className="fc-gold-button" onClick={() => setCatalogOpen(true)}>Browse Catalog</button>
            {product && <button type="button" className="fc-outline" onClick={() => selectProduct(null)}>Remove outfit item</button>}
          </div>
          {product && <p className="fc-warning">Catalog item selected: the test currently draws an illustrative {product.category.toLowerCase()} shape, because this catalog record has no registered Front/Side/Rear transparent garment PNGs. The shared lattice warps this placeholder with the avatar; real seller-photo alignment is still unverified.</p>}

          <h2>Warp inspector</h2>
          <RangeControl label="Strength" min={0} max={1.5} step={0.05} value={strength} onChange={setStrength} unit="Ã—" />
          <label className="fc-check"><input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} /> Show {GRID_COLS}Ã—{GRID_ROWS} deformation grid and labels</label>
          <label className="fc-check"><input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} /> Pause body-part warp for comparison (height unchanged)</label>
          {view === "side" && <label className="fc-select-block">Side camera orientation<select value={sideFacing} onChange={(e) => setSideFacing(e.target.value)}><option value="left">Facing left</option><option value="right">Facing right</option></select></label>}
          <label className="fc-select-block">Preview resolution<select value={quality} onChange={(e) => setQuality(Number(e.target.value))}><option value={512}>512 Ã— 1024 (fast)</option><option value={1024}>1024 Ã— 2048 (full)</option></select></label>
          <p className="fc-tiny">Draw time excludes image downloads and interaction latency; target complete updates under one second on a mid-range laptop.</p>
        </section>
      </div>

      {catalogOpen && <div className="fc-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setCatalogOpen(false); }}>
        <section className="fc-modal" role="dialog" aria-modal="true" aria-labelledby="fc-catalog-title">
          <div className="fc-modal-header"><div><p className="fc-eyebrow">FITFUSION CATALOG</p><h2 id="fc-catalog-title">Select an item to try on</h2></div><button type="button" className="fc-close" aria-label="Close catalog" onClick={() => setCatalogOpen(false)}>Ã—</button></div>
          <div className="fc-catalog-filters">
            <input type="search" placeholder="Search clothing or store" value={catalogQuery} onChange={(e) => setCatalogQuery(e.target.value)} />
            <select value={catalogCategory} onChange={(e) => setCatalogCategory(e.target.value)}>
              {["All", "Tops", "Bottoms", "Dresses", "Outerwear"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="fc-product-grid">
            {filteredCatalog.map((item) => <article className="fc-product" key={item.id}>
              <div className="fc-product-icon">{item.symbol || "ðŸ‘•"}</div>
              <p className="fc-product-meta">{item.category} Â· {item.gender}</p>
              <h3>{item.name}</h3>
              <p className="fc-product-meta">{item.sellerName}</p>
              <p className="fc-price">{peso(item.price)}</p>
              <button type="button" className="fc-gold-button" onClick={() => selectProduct(item.id)}>Try on item</button>
            </article>)}
          </div>
          {filteredCatalog.length === 0 && <p className="fc-tiny">No matching catalog items found.</p>}
          <p className="fc-tiny">Products come from the existing CatalogPage data. This is a frontend-only prototype, not an upload form.</p>
        </section>
      </div>}
    </main>
  );
}
