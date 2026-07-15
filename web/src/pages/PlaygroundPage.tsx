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
const STORAGE_KEY = "feling-playground-v3";
const DOLL = "/playground-doll.png";
const BASE_W = 200;

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

type Edge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

type Gesture =
  | { kind: "move"; uid: string; ox: number; oy: number }
  | {
      kind: "scale";
      uid: string;
      edge: Edge;
      startScale: number;
      startX: number;
      startY: number;
      rot: number;
    }
  | {
      kind: "rotate";
      uid: string;
      startRot: number;
      startAngle: number;
      x: number;
      y: number;
    };

const SHELF_ORDER = ["ready-to-wear", "shoes", "bags"] as const;
type ShelfKey = (typeof SHELF_ORDER)[number];

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
      return { x: 50, y: 54, scale: 0.9, rot: 0, z: 20 };
    case "top":
      return { x: 50, y: 40, scale: 0.65, rot: 0, z: 25 };
    case "bottom":
      return { x: 50, y: 64, scale: 0.65, rot: 0, z: 18 };
    case "shoes":
      return { x: 50, y: 88, scale: 0.38, rot: 0, z: 30 };
    case "bag":
      return { x: 68, y: 56, scale: 0.42, rot: -6, z: 28 };
    default:
      return { x: 50, y: 50, scale: 0.55, rot: 0, z: 22 };
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
  return Math.min(1.9, Math.max(0.14, n));
}

function angleAt(stage: DOMRect, xPct: number, yPct: number, clientX: number, clientY: number) {
  const cx = stage.left + (xPct / 100) * stage.width;
  const cy = stage.top + (yPct / 100) * stage.height;
  return (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
}

function localDelta(dx: number, dy: number, rotDeg: number) {
  const r = (-rotDeg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return { lx: dx * cos - dy * sin, ly: dx * sin + dy * cos };
}

function ShelfRow({
  label,
  items,
  onPick,
}: {
  label: string;
  items: Product[];
  onPick: (p: Product) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const nudge = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(320, el.clientWidth * 0.7), behavior: "smooth" });
  };

  return (
    <section className="shelf">
      <div className="shelf__head">
        <h2>{label}</h2>
        <div className="shelf__nudge">
          <button type="button" aria-label={`Previous ${label}`} onClick={() => nudge(-1)}>
            ‹
          </button>
          <button type="button" aria-label={`Next ${label}`} onClick={() => nudge(1)}>
            ›
          </button>
        </div>
      </div>
      <div className="shelf__ledge" aria-hidden />
      <div className="shelf__track" ref={scrollerRef}>
        {items.map((p) => (
          <button
            key={p.id}
            type="button"
            className="shelf__item"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/product-id", p.id);
              e.dataTransfer.effectAllowed = "copy";
            }}
            onClick={() => onPick(p)}
            title={p.title}
          >
            <span className="shelf__hook" aria-hidden />
            <span className="shelf__garment">
              <img src={productImage(p)} alt="" />
            </span>
            <span className="shelf__caption">
              <em>{p.designer}</em>
            </span>
          </button>
        ))}
        {!items.length && <p className="shelf__empty">Nothing on this shelf yet</p>}
      </div>
    </section>
  );
}

export function PlaygroundPage() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [placed, setPlaced] = useState<Placed[]>(() =>
    typeof window === "undefined" ? [] : loadPlaced()
  );
  const [activeUid, setActiveUid] = useState<string | null>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const zCounter = useRef(40);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), []);

  const byShelf = useMemo(() => {
    const map: Record<ShelfKey, Product[]> = {
      "ready-to-wear": [],
      shoes: [],
      bags: [],
    };
    for (const p of products) {
      if (p.category === "shoes") map.shoes.push(p);
      else if (p.category === "bags") map.bags.push(p);
      else map["ready-to-wear"].push(p);
    }
    return map;
  }, []);

  const active = placed.find((p) => p.uid === activeUid);
  const activeProduct = active ? byId.get(active.productId) : undefined;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(placed));
  }, [placed]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const g = gestureRef.current;
      const stage = stageRef.current;
      if (!g || !stage) return;
      const rect = stage.getBoundingClientRect();

      if (g.kind === "move") {
        const x = Math.min(90, Math.max(10, ((e.clientX - rect.left) / rect.width) * 100 - g.ox));
        const y = Math.min(92, Math.max(10, ((e.clientY - rect.top) / rect.height) * 100 - g.oy));
        setPlaced((prev) => prev.map((p) => (p.uid === g.uid ? { ...p, x, y } : p)));
        return;
      }
      if (g.kind === "scale") {
        const { lx, ly } = localDelta(e.clientX - g.startX, e.clientY - g.startY, g.rot);
        let delta = 0;
        if (g.edge.includes("e")) delta += lx;
        if (g.edge.includes("w")) delta -= lx;
        if (g.edge.includes("s")) delta += ly;
        if (g.edge.includes("n")) delta -= ly;
        if (g.edge.length === 2) delta *= 0.7;
        const scale = clampScale(g.startScale + delta / 180);
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
    const onKey = (e: KeyboardEvent) => {
      if (!activeUid) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        setPlaced((prev) => prev.filter((p) => p.uid !== activeUid));
        setActiveUid(null);
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
  };

  const onScaleDown = (e: ReactPointerEvent, uid: string, edge: Edge) => {
    e.stopPropagation();
    e.preventDefault();
    const piece = placed.find((p) => p.uid === uid);
    if (!piece) return;
    bringFront(uid);
    gestureRef.current = {
      kind: "scale",
      uid,
      edge,
      startScale: piece.scale,
      startX: e.clientX,
      startY: e.clientY,
      rot: piece.rot,
    };
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
  };

  const onPieceWheel = (e: ReactWheelEvent, uid: string) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveUid(uid);
    const delta = e.deltaY > 0 ? -0.04 : 0.04;
    setPlaced((prev) =>
      prev.map((p) => (p.uid === uid ? { ...p, scale: clampScale(p.scale + delta) } : p))
    );
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

  const edges: Edge[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];

  return (
    <section className="walkin">
      <div className="walkin__room" aria-hidden />

      <div className="walkin__frame">
        <header className="walkin__head">
          <p>Walk-in wardrobe</p>
          <h1>feling.</h1>
        </header>

        <div className="walkin__scene">
          <div className="walkin__shelves walkin__shelves--top">
            <ShelfRow
              label="Clothes"
              items={byShelf["ready-to-wear"]}
              onPick={addPiece}
            />
          </div>

          <div className="walkin__mirror">
            <div className="walkin__mirror-frame">
              <div
                ref={stageRef}
                className="walkin__stage"
                onDragOver={(e) => e.preventDefault()}
                onDrop={onStageDrop}
                onClick={() => setActiveUid(null)}
              >
                <div className="walkin__glow" aria-hidden />
                <img className="walkin__doll" src={DOLL} alt="Dress-up doll" draggable={false} />

                {placed.map((piece) => {
                  const product = byId.get(piece.productId);
                  if (!product) return null;
                  const selected = piece.uid === activeUid;
                  const w = BASE_W * piece.scale;
                  return (
                    <div
                      key={piece.uid}
                      className={`closet-piece${selected ? " is-active" : ""}`}
                      style={{ left: `${piece.x}%`, top: `${piece.y}%`, zIndex: piece.z }}
                      onWheel={(e) => onPieceWheel(e, piece.uid)}
                    >
                      <div
                        className="closet-piece__body"
                        style={{
                          width: w,
                          transform: `translate(-50%, -50%) rotate(${piece.rot}deg)`,
                        }}
                      >
                        <button
                          type="button"
                          className="closet-piece__hit"
                          onPointerDown={(e) => onMoveDown(e, piece.uid)}
                          onClick={(e) => {
                            e.stopPropagation();
                            bringFront(piece.uid);
                          }}
                          aria-label={product.title}
                        >
                          <img src={productImage(product)} alt="" draggable={false} />
                        </button>

                        {selected && (
                          <div
                            className="closet-sel"
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="closet-sel__x"
                              aria-label={`Remove ${product.title}`}
                              onClick={() => removePiece(piece.uid)}
                            >
                              ×
                            </button>
                            <button
                              type="button"
                              className="closet-sel__rot"
                              aria-label="Drag to rotate"
                              onPointerDown={(e) => onRotateDown(e, piece.uid)}
                            />
                            {edges.map((edge) => (
                              <button
                                key={edge}
                                type="button"
                                className={`closet-sel__h closet-sel__h--${edge}`}
                                aria-label={`Resize ${edge}`}
                                onPointerDown={(e) => onScaleDown(e, piece.uid, edge)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="walkin__actions">
              <button
                type="button"
                onClick={() => {
                  setPlaced([]);
                  setActiveUid(null);
                }}
                disabled={!placed.length}
              >
                Undress
              </button>
              <button
                type="button"
                onClick={() => activeUid && removePiece(activeUid)}
                disabled={!active}
              >
                Remove
              </button>
              {activeProduct && (
                <Link to={`/piece/${activeProduct.slug}`}>
                  Shop · {formatPrice(activeProduct.price)}
                </Link>
              )}
            </div>
          </div>

          <div className="walkin__shelves walkin__shelves--bottom">
            <ShelfRow label="Shoes" items={byShelf.shoes} onPick={addPiece} />
            <ShelfRow label="Bags" items={byShelf.bags} onPick={addPiece} />
          </div>
        </div>
      </div>
    </section>
  );
}
