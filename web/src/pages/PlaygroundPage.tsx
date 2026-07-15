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
const STORAGE_KEY = "feling-playground-v5";
const DOLL = "/playground-doll.png";
const DOLL_HEAD = "/playground-doll-head.png";
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
      return { x: 50, y: 62, scale: 0.68, rot: 0, z: 20 };
    case "top":
      return { x: 50, y: 52, scale: 0.55, rot: 0, z: 25 };
    case "bottom":
      return { x: 50, y: 68, scale: 0.58, rot: 0, z: 18 };
    case "shoes":
      return { x: 50, y: 90, scale: 0.34, rot: 0, z: 30 };
    case "bag":
      return { x: 72, y: 58, scale: 0.38, rot: -6, z: 28 };
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
  return {
    lx: dx * Math.cos(r) - dy * Math.sin(r),
    ly: dx * Math.sin(r) + dy * Math.cos(r),
  };
}

function ShopPanel({
  title,
  items,
  onPick,
}: {
  title: string;
  items: Product[];
  onPick: (p: Product) => void;
}) {
  return (
    <aside className="shop">
      <h2 className="shop__title">{title}</h2>
      <ul className="shop__grid">
        {items.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              className="shop__slot"
              draggable
              title={`${p.designer} — ${p.title}`}
              onDragStart={(e) => {
                e.dataTransfer.setData("text/product-id", p.id);
                e.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() => onPick(p)}
            >
              <img src={productImage(p)} alt={p.title} />
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function PlaygroundPage() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [placed, setPlaced] = useState<Placed[]>(() =>
    typeof window === "undefined" ? [] : loadPlaced()
  );
  const [activeUid, setActiveUid] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<"shoes" | "bags">("shoes");
  const gestureRef = useRef<Gesture | null>(null);
  const zCounter = useRef(40);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), []);
  const clothes = useMemo(
    () => products.filter((p) => p.category === "ready-to-wear"),
    []
  );
  const shoes = useMemo(() => products.filter((p) => p.category === "shoes"), []);
  const bags = useMemo(() => products.filter((p) => p.category === "bags"), []);
  const rightItems = rightTab === "shoes" ? shoes : bags;

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
        const y = Math.min(92, Math.max(12, ((e.clientY - rect.top) / rect.height) * 100 - g.oy));
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
      const ang = angleAt(rect, g.x, g.y, e.clientX, e.clientY);
      const rot = Math.round(g.startRot + (ang - g.startAngle));
      setPlaced((prev) => prev.map((p) => (p.uid === g.uid ? { ...p, rot } : p)));
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
    zCounter.current = Math.min(zCounter.current + 1, 90);
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
    zCounter.current += 1;
    const next: Placed = {
      uid: `${p.id}-${Date.now()}`,
      productId: p.id,
      ...defaultPose(slotFor(p)),
      z: zCounter.current,
      ...(at ?? {}),
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
      <div className="walkin__bg" aria-hidden />

      <div className="walkin__layout">
        <ShopPanel title="Clothes" items={clothes} onPick={addPiece} />

        <div className="walkin__center">
          <div
            ref={stageRef}
            className="walkin__stage"
            onDragOver={(e) => e.preventDefault()}
            onDrop={onStageDrop}
            onClick={() => setActiveUid(null)}
          >
            {/* Body under clothes; head always on top so outfits can't erase her face */}
            <div
              className="walkin__doll walkin__doll--body"
              role="img"
              aria-label="You"
              style={{ backgroundImage: `url(${DOLL}?v=6)` }}
            />

            {placed.map((piece) => {
              const product = byId.get(piece.productId);
              if (!product) return null;
              const selected = piece.uid === activeUid;
              return (
                <div
                  key={piece.uid}
                  className={`fit${selected ? " is-on" : ""}`}
                  style={{ left: `${piece.x}%`, top: `${piece.y}%`, zIndex: piece.z }}
                  onWheel={(e) => onPieceWheel(e, piece.uid)}
                >
                  <div
                    className="fit__body"
                    style={{
                      width: BASE_W * piece.scale,
                      transform: `translate(-50%, -50%) rotate(${piece.rot}deg)`,
                    }}
                  >
                    <button
                      type="button"
                      className="fit__hit"
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
                        className="fit__sel"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="fit__x"
                          aria-label="Remove"
                          onClick={() => removePiece(piece.uid)}
                        >
                          ×
                        </button>
                        <button
                          type="button"
                          className="fit__rot"
                          aria-label="Rotate"
                          onPointerDown={(e) => onRotateDown(e, piece.uid)}
                        />
                        {edges.map((edge) => (
                          <button
                            key={edge}
                            type="button"
                            className={`fit__h fit__h--${edge}`}
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

            <div
              className="walkin__doll walkin__doll--head"
              aria-hidden
              style={{ backgroundImage: `url(${DOLL_HEAD}?v=6)` }}
            />
          </div>

          <div className="walkin__tools">
            <button
              type="button"
              disabled={!placed.length}
              onClick={() => {
                setPlaced([]);
                setActiveUid(null);
              }}
            >
              Undress
            </button>
            <button
              type="button"
              disabled={!active}
              onClick={() => activeUid && removePiece(activeUid)}
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

        <div className="walkin__right">
          <div className="shop__tabs">
            <button
              type="button"
              className={rightTab === "shoes" ? "is-on" : undefined}
              onClick={() => setRightTab("shoes")}
            >
              Shoes
            </button>
            <button
              type="button"
              className={rightTab === "bags" ? "is-on" : undefined}
              onClick={() => setRightTab("bags")}
            >
              Bags
            </button>
          </div>
          <ShopPanel
            title={rightTab === "shoes" ? "Shoes" : "Bags"}
            items={rightItems}
            onPick={addPiece}
          />
        </div>
      </div>
    </section>
  );
}
