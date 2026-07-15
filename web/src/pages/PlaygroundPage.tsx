import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { Link } from "react-router-dom";
import catalog from "../data/catalog.json";
import type { Product } from "../types";
import { formatPrice } from "../types";
import { productImage } from "../productImage";

const products = catalog as Product[];
const STORAGE_KEY = "feling-playground-v1";
const DOLL = "/playground-doll.png";

type Slot = "dress" | "top" | "bottom" | "shoes" | "bag" | "other";

type Placed = {
  uid: string;
  productId: string;
  x: number;
  y: number;
  scale: number;
  rot: number;
  z: number;
};

type Gesture =
  | {
      kind: "move";
      uid: string;
      ox: number;
      oy: number;
    }
  | {
      kind: "scale";
      uid: string;
      startScale: number;
      startDist: number;
      x: number;
      y: number;
    }
  | {
      kind: "rotate";
      uid: string;
      startRot: number;
      startAngle: number;
      x: number;
      y: number;
    };

function slotFor(p: Product): Slot {
  const t = `${p.title} ${p.category}`.toLowerCase();
  if (p.category === "shoes" || /heel|shoe|boot|sandal|mule|pump|loafer/.test(t))
    return "shoes";
  if (p.category === "bags" || /\bbag\b|tote|clutch|purse/.test(t)) return "bag";
  if (/dress|gown|slip|romper|jumpsuit|overall/.test(t)) return "dress";
  if (/skirt|pant|trouser|jean|short|bottom/.test(t)) return "bottom";
  if (/jacket|blazer|coat|blous|top|shirt|knit|sweater|cardigan|corset|bustier/.test(t))
    return "top";
  if (p.category === "ready-to-wear") return "dress";
  return "other";
}

function defaultPose(slot: Slot): Pick<Placed, "x" | "y" | "scale" | "rot" | "z"> {
  switch (slot) {
    case "dress":
      return { x: 50, y: 52, scale: 0.72, rot: 0, z: 20 };
    case "top":
      return { x: 50, y: 38, scale: 0.55, rot: 0, z: 25 };
    case "bottom":
      return { x: 50, y: 62, scale: 0.55, rot: 0, z: 18 };
    case "shoes":
      return { x: 50, y: 88, scale: 0.32, rot: 0, z: 30 };
    case "bag":
      return { x: 72, y: 55, scale: 0.38, rot: -8, z: 28 };
    default:
      return { x: 50, y: 48, scale: 0.45, rot: 0, z: 22 };
  }
}

function loadPlaced(): Placed[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Placed[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function clampScale(n: number) {
  return Math.min(1.8, Math.max(0.12, n));
}

function angleAt(
  stage: DOMRect,
  xPct: number,
  yPct: number,
  clientX: number,
  clientY: number
) {
  const cx = stage.left + (xPct / 100) * stage.width;
  const cy = stage.top + (yPct / 100) * stage.height;
  return (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
}

function distAt(
  stage: DOMRect,
  xPct: number,
  yPct: number,
  clientX: number,
  clientY: number
) {
  const cx = stage.left + (xPct / 100) * stage.width;
  const cy = stage.top + (yPct / 100) * stage.height;
  return Math.hypot(clientX - cx, clientY - cy) || 1;
}

export function PlaygroundPage() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<"all" | "ready-to-wear" | "shoes" | "bags">(
    "ready-to-wear"
  );
  const [placed, setPlaced] = useState<Placed[]>(() =>
    typeof window === "undefined" ? [] : loadPlaced()
  );
  const [activeUid, setActiveUid] = useState<string | null>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const zCounter = useRef(40);

  const byId = useMemo(() => {
    const m = new Map(products.map((p) => [p.id, p]));
    return m;
  }, []);

  const wardrobe = useMemo(() => {
    return products.filter((p) => {
      if (filter === "all") return true;
      return p.category === filter;
    });
  }, [filter]);

  const active = placed.find((p) => p.uid === activeUid);
  const activeProduct = active ? byId.get(active.productId) : undefined;

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const g = gestureRef.current;
      const stage = stageRef.current;
      if (!g || !stage) return;
      const rect = stage.getBoundingClientRect();

      if (g.kind === "move") {
        const x = Math.min(
          95,
          Math.max(5, ((e.clientX - rect.left) / rect.width) * 100 - g.ox)
        );
        const y = Math.min(
          98,
          Math.max(5, ((e.clientY - rect.top) / rect.height) * 100 - g.oy)
        );
        setPlaced((prev) => prev.map((p) => (p.uid === g.uid ? { ...p, x, y } : p)));
        return;
      }
      if (g.kind === "scale") {
        const d = distAt(rect, g.x, g.y, e.clientX, e.clientY);
        const scale = clampScale(g.startScale * (d / g.startDist));
        setPlaced((prev) => prev.map((p) => (p.uid === g.uid ? { ...p, scale } : p)));
        return;
      }
      if (g.kind === "rotate") {
        const ang = angleAt(rect, g.x, g.y, e.clientX, e.clientY);
        const rot = Math.round(g.startRot + (ang - g.startAngle));
        setPlaced((prev) => prev.map((p) => (p.uid === g.uid ? { ...p, rot } : p)));
      }
    };
    const onUp = () => {
      gestureRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(placed));
  }, [placed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!activeUid) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        setPlaced((prev) => prev.filter((p) => p.uid !== activeUid));
        setActiveUid(null);
        return;
      }
      if (e.key === "[" || e.key === "-") {
        e.preventDefault();
        setPlaced((prev) =>
          prev.map((p) =>
            p.uid === activeUid ? { ...p, scale: clampScale(p.scale - 0.05) } : p
          )
        );
      }
      if (e.key === "]" || e.key === "=" || e.key === "+") {
        e.preventDefault();
        setPlaced((prev) =>
          prev.map((p) =>
            p.uid === activeUid ? { ...p, scale: clampScale(p.scale + 0.05) } : p
          )
        );
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setPlaced((prev) =>
          prev.map((p) => (p.uid === activeUid ? { ...p, rot: p.rot - 5 } : p))
        );
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setPlaced((prev) =>
          prev.map((p) => (p.uid === activeUid ? { ...p, rot: p.rot + 5 } : p))
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeUid]);

  const bringFront = (uid: string) => {
    zCounter.current += 1;
    setPlaced((prev) =>
      prev.map((p) => (p.uid === uid ? { ...p, z: zCounter.current } : p))
    );
    setActiveUid(uid);
  };

  const removePiece = (uid: string) => {
    setPlaced((prev) => prev.filter((p) => p.uid !== uid));
    if (activeUid === uid) setActiveUid(null);
  };

  const addPiece = (p: Product, at?: { x: number; y: number }) => {
    const pose = defaultPose(slotFor(p));
    zCounter.current += 1;
    const next: Placed = {
      uid: `${p.id}-${Date.now()}`,
      productId: p.id,
      ...pose,
      z: zCounter.current,
      ...(at ? { x: at.x, y: at.y } : {}),
    };
    setPlaced((prev) => [...prev, next]);
    setActiveUid(next.uid);
  };

  const clearAll = () => {
    setPlaced([]);
    setActiveUid(null);
  };

  const patchActive = (patch: Partial<Placed>) => {
    if (!activeUid) return;
    setPlaced((prev) =>
      prev.map((p) => (p.uid === activeUid ? { ...p, ...patch } : p))
    );
  };

  const onMoveDown = (e: ReactPointerEvent, uid: string) => {
    e.stopPropagation();
    e.preventDefault();
    const stage = stageRef.current;
    const piece = placed.find((p) => p.uid === uid);
    if (!stage || !piece) return;
    bringFront(uid);
    const rect = stage.getBoundingClientRect();
    gestureRef.current = {
      kind: "move",
      uid,
      ox: ((e.clientX - rect.left) / rect.width) * 100 - piece.x,
      oy: ((e.clientY - rect.top) / rect.height) * 100 - piece.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onScaleDown = (e: ReactPointerEvent, uid: string) => {
    e.stopPropagation();
    e.preventDefault();
    const stage = stageRef.current;
    const piece = placed.find((p) => p.uid === uid);
    if (!stage || !piece) return;
    bringFront(uid);
    const rect = stage.getBoundingClientRect();
    gestureRef.current = {
      kind: "scale",
      uid,
      startScale: piece.scale,
      startDist: distAt(rect, piece.x, piece.y, e.clientX, e.clientY),
      x: piece.x,
      y: piece.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onRotateDown = (e: ReactPointerEvent, uid: string) => {
    e.stopPropagation();
    e.preventDefault();
    const stage = stageRef.current;
    const piece = placed.find((p) => p.uid === uid);
    if (!stage || !piece) return;
    bringFront(uid);
    const rect = stage.getBoundingClientRect();
    gestureRef.current = {
      kind: "rotate",
      uid,
      startRot: piece.rot,
      startAngle: angleAt(rect, piece.x, piece.y, e.clientX, e.clientY),
      x: piece.x,
      y: piece.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPieceWheel = (e: ReactWheelEvent, uid: string) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveUid(uid);
    const delta = e.deltaY > 0 ? -0.045 : 0.045;
    setPlaced((prev) =>
      prev.map((p) =>
        p.uid === uid ? { ...p, scale: clampScale(p.scale + delta) } : p
      )
    );
  };

  const onWardrobeDragStart = (e: React.DragEvent, p: Product) => {
    e.dataTransfer.setData("text/product-id", p.id);
    e.dataTransfer.effectAllowed = "copy";
  };

  const onStageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/product-id");
    const product = byId.get(id);
    const stage = stageRef.current;
    if (!product || !stage) return;
    const rect = stage.getBoundingClientRect();
    addPiece(product, {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <section className="playground">
      <header className="playground__head">
        <p className="playground__kicker">Vanity · Playground</p>
        <h1>Dress-up box</h1>
        <p className="playground__lede">
          Tap a piece for handles — drag to move, corner to resize, top knob to
          rotate, ✕ to remove.
        </p>
      </header>

      <div className="playground__layout">
        <div className="playground__stage-wrap">
          <div className="playground__box">
            <div className="playground__box-flap playground__box-flap--l" aria-hidden />
            <div className="playground__box-flap playground__box-flap--r" aria-hidden />
            <div className="playground__box-top" aria-hidden>
              <span>feling.</span>
              <em>collector’s window</em>
            </div>
            <div
              ref={stageRef}
              className="playground__stage"
              onDragOver={(e) => e.preventDefault()}
              onDrop={onStageDrop}
              onClick={() => setActiveUid(null)}
            >
              <div className="playground__vanity" aria-hidden />
              <div className="playground__glass" aria-hidden />
              <div className="playground__sparkles" aria-hidden>
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>

              <img
                className="playground__doll"
                src={DOLL}
                alt="Custom feling doll"
                draggable={false}
              />

              {placed.map((piece) => {
                const product = byId.get(piece.productId);
                if (!product) return null;
                const selected = piece.uid === activeUid;
                return (
                  <div
                    key={piece.uid}
                    className={`playground__piece${selected ? " is-active" : ""}`}
                    style={{
                      left: `${piece.x}%`,
                      top: `${piece.y}%`,
                      zIndex: piece.z,
                    }}
                    onWheel={(e) => onPieceWheel(e, piece.uid)}
                  >
                    <button
                      type="button"
                      className="playground__piece-hit"
                      style={{
                        transform: `translate(-50%, -50%) rotate(${piece.rot}deg) scale(${piece.scale})`,
                      }}
                      onPointerDown={(e) => onMoveDown(e, piece.uid)}
                      onClick={(e) => {
                        e.stopPropagation();
                        bringFront(piece.uid);
                      }}
                      aria-label={`${product.title}${selected ? ", selected" : ""}`}
                    >
                      <img src={productImage(product)} alt="" draggable={false} />
                    </button>

                    {selected && (
                      <div
                        className="playground__chrome"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="playground__chrome-x"
                          aria-label={`Remove ${product.title}`}
                          onClick={() => removePiece(piece.uid)}
                        >
                          ✕
                        </button>
                        <button
                          type="button"
                          className="playground__chrome-rot"
                          aria-label="Drag to rotate"
                          onPointerDown={(e) => onRotateDown(e, piece.uid)}
                        >
                          ↻
                        </button>
                        <button
                          type="button"
                          className="playground__chrome-scale"
                          aria-label="Drag to resize"
                          onPointerDown={(e) => onScaleDown(e, piece.uid)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="playground__box-foot">fit · fluff · obsess</p>
          </div>

          <div className="playground__tools">
            <button type="button" onClick={clearAll} disabled={!placed.length}>
              Clear all
            </button>
            <button
              type="button"
              onClick={() => activeUid && removePiece(activeUid)}
              disabled={!active}
            >
              Remove
            </button>
            <div className="playground__sliders" hidden={!active}>
              <label>
                Size
                <input
                  type="range"
                  min={12}
                  max={180}
                  value={Math.round((active?.scale ?? 0.5) * 100)}
                  onChange={(e) =>
                    patchActive({ scale: clampScale(Number(e.target.value) / 100) })
                  }
                />
              </label>
              <label>
                Rotate
                <input
                  type="range"
                  min={-180}
                  max={180}
                  value={active?.rot ?? 0}
                  onChange={(e) => patchActive({ rot: Number(e.target.value) })}
                />
              </label>
            </div>
            {activeProduct && (
              <Link className="playground__buy" to={`/piece/${activeProduct.slug}`}>
                View · {formatPrice(activeProduct.price)}
              </Link>
            )}
          </div>
        </div>

        <aside className="playground__rail">
          <div className="playground__filters" role="tablist" aria-label="Inventory">
            {(
              [
                ["ready-to-wear", "Clothes"],
                ["shoes", "Shoes"],
                ["bags", "Bags"],
                ["all", "All"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={filter === key}
                className={filter === key ? "is-on" : undefined}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <ul className="playground__inventory">
            {wardrobe.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="playground__swatch"
                  draggable
                  onDragStart={(e) => onWardrobeDragStart(e, p)}
                  onClick={() => addPiece(p)}
                  title={p.title}
                >
                  <span className="playground__swatch-img">
                    <img src={productImage(p)} alt="" />
                  </span>
                  <span className="playground__swatch-meta">
                    <em>{p.designer}</em>
                    <span>{p.title}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
