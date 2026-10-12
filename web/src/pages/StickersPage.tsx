import { useState } from "react";
import items from "../data/stickers.json";
import { formatPrice } from "../types";

type Kind = "sticker" | "print";

type Extra = {
  id: string;
  kind: Kind;
  title: string;
  note: string;
  image: string | null;
  price: number | null;
};

const extras = items as Extra[];

const FILTERS: { key: "all" | Kind; label: string }[] = [
  { key: "all", label: "All" },
  { key: "sticker", label: "Stickers" },
  { key: "print", label: "Prints" },
];

const NUMERALS = ["I", "II", "III", "IV", "V", "VI"];

export function StickersPage() {
  const [active, setActive] = useState<"all" | Kind>("all");
  const list = extras.filter((x) => active === "all" || x.kind === active);

  return (
    <div className="shop">
      <header className="shop__hero">
        <h1>Stickers &amp; prints</h1>
      </header>

      <div className="filters">
        <div className="filters__row">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`filter-link ${active === f.key ? "is-active" : ""}`}
              onClick={() => setActive(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid--shop">
        {list.map((x, i) => (
          <div
            key={x.id}
            className={`tile tile--extra tile--${x.kind}`}
            style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
          >
            <div className="tile__media">
              {x.image ? (
                <img src={x.image} alt={x.title} loading="lazy" />
              ) : (
                <span className="tile__placeholder" aria-hidden>
                  {NUMERALS[extras.filter((e) => e.kind === x.kind).indexOf(x)] ?? ""}
                </span>
              )}
            </div>
            <div className="tile__meta">
              <span className="tile__designer">
                {x.kind === "sticker" ? "Sticker" : "Print"}
              </span>
              <h3 className="tile__title">{x.title}</h3>
              <span className="tile__price">
                {x.price != null ? formatPrice(x.price) : x.note}
              </span>
            </div>
          </div>
        ))}
      </div>
      {!list.length && <p className="empty">Nothing here yet.</p>}
    </div>
  );
}
