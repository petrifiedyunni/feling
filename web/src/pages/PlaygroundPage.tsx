import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import catalog from "../data/catalog.json";
import type { Product } from "../types";
import { formatPrice } from "../types";
import { productImage } from "../productImage";

const products = catalog as Product[];
const STORAGE_KEY = "feling-playground-v11";
const BASE_W = 220;

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
type InvTab = "clothes" | "shoes" | "bags";

const EDGES: Edge[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
const TABS: { id: InvTab; label: string }[] = [
  { id: "clothes", label: "Clothes" },
  { id: "shoes", label: "Shoes" },
  { id: "bags", label: "Bags" },
];

function slotPose(p: Product): Pick<Placed, "x" | "y" | "scale" | "rot" | "z"> {
  const t = `${p.title} ${p.category}`.toLowerCase();
  if (p.category === "shoes" || /heel|shoe|boot|sandal|mule|pump/.test(t))
    return { x: 48, y: 92, scale: 0.4, rot: 0, z: 30 };
  if (p.category === "bags" || /\bbag\b|tote|clutch|purse/.test(t))
    return { x: 64, y: 58, scale: 0.42, rot: -5, z: 28 };
  if (/skirt|pant|trouser|jean|short/.test(t))
    return { x: 48, y: 74, scale: 0.64, rot: 0, z: 18 };
  if (/jacket|blazer|coat|top|shirt|knit|corset|bustier|blouse/.test(t))
    return { x: 48, y: 52, scale: 0.58, rot: 0, z: 25 };
  return { x: 48, y: 62, scale: 0.72, rot: 0, z: 20 };
}

function load(): Placed[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Placed[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

export function PlaygroundPage() {
  const stageRef = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<string, HTMLDivElement>());
  const placedRef = useRef<Placed[]>([]);
  const zRef = useRef(40);
  const dragging = useRef(false);

  const [placed, setPlaced] = useState<Placed[]>(() =>
    typeof window === "undefined" ? [] : load()
  );
  const [active, setActive] = useState<string | null>(null);
  const [tab, setTab] = useState<InvTab>("clothes");

  placedRef.current = placed;

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), []);
  const items = useMemo(() => {
    if (tab === "shoes") return products.filter((p) => p.category === "shoes");
    if (tab === "bags") return products.filter((p) => p.category === "bags");
    return products.filter((p) => p.category === "ready-to-wear");
  }, [tab]);

  const activePiece = placed.find((p) => p.uid === active);
  const activeProduct = activePiece ? byId.get(activePiece.productId) : undefined;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(placed));
  }, [placed]);

  const paint = (uid: string, x: number, y: number, scale: number, rot: number) => {
    const el = nodes.current.get(uid);
    if (!el) return;
    el.style.left = `${x}%`;
    el.style.top = `${y}%`;
    el.style.width = `${BASE_W * scale}px`;
    el.style.transform = `translate(-50%, -50%) rotate(${rot}deg)`;
  };

  /** Plain mouse/pointer drag — listeners bound on press, no React until release */
  const grab = (
    e: React.MouseEvent | React.PointerEvent,
    uid: string,
    mode: "move" | "scale" | "rotate",
    edge?: Edge
  ) => {
    if ("button" in e && e.button !== 0) return;
    if (dragging.current) return;
    const t = e.target as HTMLElement;
    if (mode === "move" && t.closest(".fit__x, .fit__rot, .fit__h")) return;

    e.preventDefault();
    e.stopPropagation();

    const stage = stageRef.current;
    const piece = placedRef.current.find((p) => p.uid === uid);
    const el = nodes.current.get(uid);
    if (!stage || !piece || !el) return;

    dragging.current = true;
    zRef.current += 1;
    const z = zRef.current;
    const rect = stage.getBoundingClientRect();
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    let liveX = piece.x;
    let liveY = piece.y;
    let liveScale = piece.scale;
    let liveRot = piece.rot;

    el.classList.add("is-drag");
    el.style.zIndex = String(z);

    const cx = rect.left + (piece.x / 100) * rect.width;
    const cy = rect.top + (piece.y / 100) * rect.height;
    const startAng = Math.atan2(e.clientY - cy, e.clientX - cx);

    const onMove = (ev: MouseEvent | PointerEvent) => {
      if (!dragging.current) return;
      if (mode === "move") {
        liveX = clamp(piece.x + ((ev.clientX - startClientX) / rect.width) * 100, 5, 95);
        liveY = clamp(piece.y + ((ev.clientY - startClientY) / rect.height) * 100, 5, 95);
        paint(uid, liveX, liveY, liveScale, liveRot);
      } else if (mode === "scale" && edge) {
        let delta = 0;
        const dx = ev.clientX - startClientX;
        const dy = ev.clientY - startClientY;
        if (edge.includes("e")) delta += dx;
        if (edge.includes("w")) delta -= dx;
        if (edge.includes("s")) delta += dy;
        if (edge.includes("n")) delta -= dy;
        if (edge.length === 2) delta *= 0.7;
        liveScale = clamp(piece.scale + delta / 160, 0.15, 1.9);
        paint(uid, liveX, liveY, liveScale, liveRot);
      } else if (mode === "rotate") {
        const ang = Math.atan2(ev.clientY - cy, ev.clientX - cx);
        liveRot = Math.round(piece.rot + ((ang - startAng) * 180) / Math.PI);
        paint(uid, liveX, liveY, liveScale, liveRot);
      }
    };

    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);

      el.classList.remove("is-drag");
      paint(uid, liveX, liveY, liveScale, liveRot);
      setPlaced((prev) =>
        prev.map((p) =>
          p.uid === uid
            ? { ...p, x: liveX, y: liveY, scale: liveScale, rot: liveRot, z }
            : p
        )
      );
      setActive(uid);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const add = (p: Product) => {
    zRef.current += 1;
    const next: Placed = {
      uid: `${p.id}-${Date.now()}`,
      productId: p.id,
      ...slotPose(p),
      z: zRef.current,
    };
    setPlaced((prev) => [...prev, next]);
    setActive(next.uid);
  };

  const remove = (uid: string) => {
    setPlaced((prev) => prev.filter((p) => p.uid !== uid));
    if (active === uid) setActive(null);
  };

  return (
    <section className="walkin">
      <div className="walkin__room" aria-hidden />

      <div className="walkin__layout">
        <div className="walkin__stage-col">
          <div
            ref={stageRef}
            className="walkin__stage"
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) setActive(null);
            }}
          >
            {/* Body under clothes */}
            <img
              className="walkin__you-body"
              src="/playground-doll.png"
              alt=""
              draggable={false}
              aria-hidden
            />

            {placed.map((piece) => {
              const product = byId.get(piece.productId);
              if (!product) return null;
              const on = piece.uid === active;
              return (
                <div
                  key={piece.uid}
                  ref={(el) => {
                    if (el) nodes.current.set(piece.uid, el);
                    else nodes.current.delete(piece.uid);
                  }}
                  className={`fit${on ? " is-on" : ""}`}
                  style={{
                    left: `${piece.x}%`,
                    top: `${piece.y}%`,
                    width: BASE_W * piece.scale,
                    zIndex: piece.z,
                    transform: `translate(-50%, -50%) rotate(${piece.rot}deg)`,
                  }}
                  onPointerDown={(e) => grab(e, piece.uid, "move")}
                  onMouseDown={(e) => grab(e, piece.uid, "move")}
                >
                  <img
                    className="fit__img"
                    src={productImage(product)}
                    alt=""
                    draggable={false}
                  />
                  {on && (
                    <div className="fit__sel">
                      <button
                        type="button"
                        className="fit__x"
                        aria-label="Remove"
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(piece.uid);
                        }}
                      >
                        ×
                      </button>
                      <button
                        type="button"
                        className="fit__rot"
                        aria-label="Rotate"
                        onPointerDown={(e) => grab(e, piece.uid, "rotate")}
                        onMouseDown={(e) => grab(e, piece.uid, "rotate")}
                      />
                      {EDGES.map((edge) => (
                        <button
                          key={edge}
                          type="button"
                          className={`fit__h fit__h--${edge}`}
                          aria-label={`Resize ${edge}`}
                          onPointerDown={(e) => grab(e, piece.uid, "scale", edge)}
                          onMouseDown={(e) => grab(e, piece.uid, "scale", edge)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Head on top visually; clicks pass through to clothes below */}
            <img
              className="walkin__you-head"
              src="/playground-doll-head.png"
              alt=""
              draggable={false}
              aria-hidden
            />
          </div>

          <div className="walkin__tools">
            <button
              type="button"
              disabled={!placed.length}
              onClick={() => {
                setPlaced([]);
                setActive(null);
              }}
            >
              Undress
            </button>
            <button
              type="button"
              disabled={!activePiece}
              onClick={() => active && remove(active)}
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

        <aside className="inv">
          <div className="inv__chrome">
            <div className="inv__tabs" role="tablist">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  className={tab === t.id ? "is-on" : undefined}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <ul className="inv__grid">
            {items.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="inv__slot"
                  title={`${p.designer} — ${p.title}`}
                  onClick={() => add(p)}
                >
                  <img src={productImage(p)} alt={p.title} draggable={false} />
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
