import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { Link } from "react-router-dom";
import catalog from "../data/catalog.json";
import cutouts from "../data/cutouts.json";
import type { Product } from "../types";
import { formatPrice } from "../types";
import { productImage } from "../productImage";

const products = catalog as Product[];
const CUTOUTS = cutouts as Record<string, string>;
const COLUMBUS_CUTOUT = "/columbus-hero.png";

/** Golden ratio — nautilus / conch growth rate. */
const PHI = 1.6180339887;

function clamp(n: number, a = 0, b = 1) {
  return Math.min(b, Math.max(a, n));
}

function remap(p: number, a: number, b: number) {
  return clamp((p - a) / (b - a));
}

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function remapEase(p: number, a: number, b: number) {
  return easeInOut(remap(p, a, b));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function smootherstep(t: number) {
  const x = clamp(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

export function HeroSpill() {
  const trackRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const progressRef = useRef(0);
  const targetRef = useRef(0);
  const committedRef = useRef(false);

  const drops = useMemo(() => {
    // Prefer anything with a cutout so boxes never show raw listing squares
    const cut = products.filter((p) => CUTOUTS[p.id]);
    if (cut.length >= 12) return cut.slice(0, 12);
    const rest = products.filter((p) => !CUTOUTS[p.id]);
    return [...cut, ...rest].slice(0, 12);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let raf = 0;
    let smoothing = 0;

    const readTarget = () => {
      if (committedRef.current) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const next = total > 0 ? clamp(-rect.top / total) : 0;
      targetRef.current = Math.max(targetRef.current, next);

      if (targetRef.current >= 0.97 && !committedRef.current) {
        committedRef.current = true;
        targetRef.current = 1;
      }
    };

    const tick = () => {
      readTarget();
      const target = targetRef.current;
      const current = progressRef.current;
      const ease = committedRef.current ? 0.14 : 0.065;
      const next = current + (target - current) * ease;
      progressRef.current = next;
      setProgress(next);

      if (committedRef.current && next > 0.995) {
        progressRef.current = 1;
        setProgress(1);
        return;
      }

      if (Math.abs(target - next) > 0.0004 || !committedRef.current) {
        smoothing = requestAnimationFrame(tick);
      }
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        readTarget();
        cancelAnimationFrame(smoothing);
        smoothing = requestAnimationFrame(tick);
      });
    };

    readTarget();
    smoothing = requestAnimationFrame(tick);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(smoothing);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Front-load: first wiggle of scroll brings cutouts on screen
  const story = (() => {
    const p = progress;
    if (p < 0.35) return (p / 0.35) * 0.55;
    return 0.55 + ((p - 0.35) / 0.65) * 0.45;
  })();

  // Static bag · rack spin → nautilus spiral → soft unwind into New In
  const presentT = 1 - remapEase(story, 0.08, 0.28);
  const emergeT = remapEase(story, 0.02, 0.14);
  const rackT = remapEase(story, 0.04, 0.4);
  // Longer, gentler morph into the shell
  const shellBlend = smootherstep(remap(story, 0.26, 0.58));
  // Long unwind so pieces keep turning as they settle
  const fallT = smootherstep(remap(story, 0.48, 0.94));
  const bagFade = 1 - remapEase(story, 0.34, 0.54);
  const shopT = fallT;
  const shopMode = shopT > 0.18;
  const settled = progress >= 0.98;

  // Spin eases as we enter the spiral, never hard-stops
  const rackSpin =
    rackT * Math.PI * 2 * 1.55 + shellBlend * Math.PI * 0.75 + fallT * Math.PI * 0.55;

  // Golden / nautilus growth: r ∝ φ^(2θ/π)  ≡  e^(bθ)
  const shellB = Math.log(PHI) / (Math.PI / 2);

  useEffect(() => {
    document.documentElement.classList.toggle("shop-expanded", shopMode);
    return () => document.documentElement.classList.remove("shop-expanded");
  }, [shopMode]);

  const onMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (shopMode || emergeT > 0.5) return;
    const el = stageRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: nx * 8, y: ny * -6 });
  };

  return (
    <section
      className={`drop-story ${shopMode ? "is-shop" : ""} ${
        settled ? "is-settled" : ""
      }`}
      ref={trackRef}
      style={
        {
          "--shop": shopT,
          "--bag-fade": bagFade,
          "--present": presentT,
          "--tilt-x": `${tilt.y}deg`,
          "--tilt-y": `${tilt.x}deg`,
        } as CSSProperties
      }
    >
      <div
        className="drop-story__pin"
        ref={stageRef}
        onMouseMove={onMove}
        onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      >
        <p className="drop-backdrop" aria-hidden>
          feling.
        </p>

        <div className="drop-subject" style={{ opacity: bagFade }}>
          <div className="drop-subject__3d">
            <img
              className="drop-subject__img"
              src={COLUMBUS_CUTOUT}
              alt="Dior Columbus bag"
              draggable={false}
            />
          </div>
        </div>

        <div
          className={`drop-grid ${shopT > 0.2 ? "is-shopify" : "is-burst"}`}
        >
          {shopT > 0.26 && (
            <div className="drop-grid__bar">
              <h2>New in</h2>
              <Link to="/shop">View all</Link>
            </div>
          )}
          <div className="drop-grid__items">
            {drops.map((item, i) => {
              const n = Math.max(drops.length, 1);

              // 1) Clothing rack — keep the scale that felt right
              const rackAngle = (i / n) * Math.PI * 2 + rackSpin;
              const rackX = Math.cos(rackAngle) * 34 * emergeT;
              const rackY = Math.sin(rackAngle) * 20 * emergeT;
              const rackDepth = (Math.sin(rackAngle) + 1) / 2;
              const rackRot = Math.cos(rackAngle) * 18 * emergeT;
              const rackScale = lerp(0.18, 0.3 + rackDepth * 0.24, emergeT);

              // 2) Wide nautilus arm — keeps turning while settling
              const armStep = 0.48;
              const baseTheta = i * armStep;
              const settle = fallT;
              // Continuous spin into place (radius shrinks, angle keeps moving)
              const liveTheta =
                rackSpin * 0.55 + baseTheta + settle * Math.PI * 0.7;
              const liveR =
                5.2 *
                Math.exp(shellB * baseTheta) *
                emergeT *
                Math.pow(1 - settle, 0.72);
              const shellX = Math.cos(liveTheta) * liveR * 3.5;
              const shellY = Math.sin(liveTheta) * liveR * 2.2;
              const shellRot = ((liveTheta + Math.PI / 2) * 180) / Math.PI;
              const shellScale = lerp(
                0.2,
                0.36 - (i / n) * 0.08,
                emergeT * (1 - settle * 0.35)
              );
              const shellDepth = clamp(1 - i / (n + 0.5));

              // Soft morph: rack → living spiral (then spiral collapses itself)
              const s = shellBlend;
              const midX = lerp(rackX, shellX, s);
              const midY = lerp(rackY, shellY, s);
              const midRot = lerp(rackRot, shellRot * 0.15, s);
              const midScale = lerp(rackScale, shellScale, s);
              const depth = lerp(rackDepth, shellDepth, s);

              // Final ease onto grid — light stagger, no hard drop
              const order = (i * 5) % n;
              const delay = (order / n) * 0.18;
              const land = smootherstep(
                clamp((settle - delay * 0.45) / Math.max(0.62, 1 - delay))
              );

              const bx = midX * (1 - land);
              const by = midY * (1 - land);
              const rot = midRot * (1 - land);
              const scale = lerp(midScale, 1, land);
              const pop = clamp((emergeT - i * 0.02) * 3.2);
              const opacity = Math.min(1, pop + land * 0.25);

              return (
                <Link
                  key={item.id}
                  to={`/piece/${item.slug}`}
                  className={`drop-card drop-card--${item.category}`}
                  style={
                    {
                      "--bx": `${bx}vw`,
                      "--by": `${by}vh`,
                      "--rot": `${rot}deg`,
                      "--scale": scale,
                      "--opacity": opacity,
                      "--z": Math.round(8 + depth * 24),
                    } as CSSProperties
                  }
                >
                  <div className="drop-card__media">
                    <img src={productImage(item)} alt={item.title} />
                  </div>
                  <div className="drop-card__meta">
                    <span>{item.designer}</span>
                    <strong>{item.title}</strong>
                    <em>{formatPrice(item.price)}</em>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
