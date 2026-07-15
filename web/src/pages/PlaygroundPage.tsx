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
  x: number; // % of stage width (center)
  y: number; // % of stage height (center)
  scale: number;
  rot: number;
  z: number;
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

export function PlaygroundPage() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<"all" | "ready-to-wear" | "shoes" | "bags">(
    "ready-to-wear"
  );
  const [placed, setPlaced] = useState<Placed[]>(() =>
    typeof window === "undefined" ? [] : loadPlaced()
  );
  const [activeUid, setActiveUid] = useState<string | null>(null);
  const dragRef = useRef<{
    uid: string;
    ox: number;
    oy: number;
    startX: number;
    startY: number;
  } | null>(null);
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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(placed));
  }, [placed]);

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

  const removeActive = () => {
    if (!activeUid) return;
    setPlaced((prev) => prev.filter((p) => p.uid !== activeUid));
    setActiveUid(null);
  };

  const active = placed.find((p) => p.uid === activeUid);

  const onStagePointerDown = (e: ReactPointerEvent, uid: string) => {
    e.stopPropagation();
    e.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const piece = placed.find((p) => p.uid === uid);
    if (!piece) return;
    zCounter.current += 1;
    setPlaced((prev) =>
      prev.map((p) => (p.uid === uid ? { ...p, z: zCounter.current } : p))
    );
    setActiveUid(uid);
    const rect = stage.getBoundingClientRect();
    dragRef.current = {
      uid,
      ox: ((e.clientX - rect.left) / rect.width) * 100 - piece.x,
      oy: ((e.clientY - rect.top) / rect.height) * 100 - piece.y,
      startX: e.clientX,
      startY: e.clientY,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onStagePointerMove = (e: ReactPointerEvent) => {
    const drag = dragRef.current;
    const stage = stageRef.current;
    if (!drag || !stage) return;
    const rect = stage.getBoundingClientRect();
    const x = Math.min(
      95,
      Math.max(5, ((e.clientX - rect.left) / rect.width) * 100 - drag.ox)
    );
    const y = Math.min(
      98,
      Math.max(5, ((e.clientY - rect.top) / rect.height) * 100 - drag.oy)
    );
    setPlaced((prev) =>
      prev.map((p) => (p.uid === drag.uid ? { ...p, x, y } : p))
    );
  };

  const onStagePointerUp = () => {
    dragRef.current = null;
  };

  const onPieceWheel = (e: ReactWheelEvent, uid: string) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveUid(uid);
    const delta = e.deltaY > 0 ? -0.04 : 0.04;
    setPlaced((prev) =>
      prev.map((p) =>
        p.uid === uid
          ? { ...p, scale: Math.min(1.6, Math.max(0.15, p.scale + delta)) }
          : p
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

  const nudgeScale = (d: number) => {
    if (!activeUid) return;
    setPlaced((prev) =>
      prev.map((p) =>
        p.uid === activeUid
          ? { ...p, scale: Math.min(1.6, Math.max(0.15, p.scale + d)) }
          : p
      )
    );
  };

  const nudgeRot = (d: number) => {
    if (!activeUid) return;
    setPlaced((prev) =>
      prev.map((p) => (p.uid === activeUid ? { ...p, rot: p.rot + d } : p))
    );
  };

  return (
    <section className="playground">
      <header className="playground__head">
        <p className="playground__kicker">Vanity · Playground</p>
        <h1>Dress-up box</h1>
        <p className="playground__lede">
          Open the window, drag archive pieces onto her, fuss until she’s perfect.
        </p>
      </header>

      <div className="playground__layout">
        <div className="playground__stage-wrap">
          <div className="playground__box" aria-hidden={false}>
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
              onPointerMove={onStagePointerMove}
              onPointerUp={onStagePointerUp}
              onPointerCancel={onStagePointerUp}
              onClick={() => setActiveUid(null)}
            >
              <div className="playground__vanity" aria-hidden />
              <div className="playground__glass" aria-hidden />
              <div className="playground__sparkles" aria-hidden>
                <i /><i /><i /><i /><i /><i />
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
                  <button
                    key={piece.uid}
                    type="button"
                    className={`playground__piece${selected ? " is-active" : ""}`}
                    style={{
                      left: `${piece.x}%`,
                      top: `${piece.y}%`,
                      zIndex: piece.z,
                      transform: `translate(-50%, -50%) rotate(${piece.rot}deg) scale(${piece.scale})`,
                    }}
                    onPointerDown={(e) => onStagePointerDown(e, piece.uid)}
                    onWheel={(e) => onPieceWheel(e, piece.uid)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setPlaced((prev) => prev.filter((p) => p.uid !== piece.uid));
                      if (activeUid === piece.uid) setActiveUid(null);
                    }}
                    aria-label={`${product.title} on doll`}
                  >
                    <img src={productImage(product)} alt="" draggable={false} />
                  </button>
                );
              })}
            </div>
            <p className="playground__box-foot">fit · fluff · obsess</p>
          </div>

          <div className="playground__tools">
            <button type="button" onClick={clearAll} disabled={!placed.length}>
              Undress
            </button>
            <button type="button" onClick={removeActive} disabled={!active}>
              Remove
            </button>
            <button type="button" onClick={() => nudgeScale(-0.06)} disabled={!active}>
              −
            </button>
            <button type="button" onClick={() => nudgeScale(0.06)} disabled={!active}>
              +
            </button>
            <button type="button" onClick={() => nudgeRot(-8)} disabled={!active}>
              ↶
            </button>
            <button type="button" onClick={() => nudgeRot(8)} disabled={!active}>
              ↷
            </button>
            {active && byId.get(active.productId) && (
              <Link
                className="playground__buy"
                to={`/piece/${byId.get(active.productId)!.slug}`}
              >
                View piece · {formatPrice(byId.get(active.productId)!.price)}
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
