import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import catalog from "../data/catalog.json";
import type { Product } from "../types";
import { ProductTile } from "../components/ProductTile";

const products = catalog as Product[];

const FILTERS = [
  { key: "all", label: "All", path: "/shop" },
  { key: "bags", label: "Bags", path: "/shop/bags" },
  { key: "shoes", label: "Shoes", path: "/shop/shoes" },
  { key: "ready-to-wear", label: "Clothing", path: "/shop/ready-to-wear" },
];

const TITLES: Record<string, string> = {
  all: "Shop",
  bags: "Bags",
  shoes: "Shoes",
  "ready-to-wear": "Clothing",
};

export function ShopPage() {
  const { category } = useParams();
  const [params, setParams] = useSearchParams();
  const designer = params.get("designer") || "all";

  const designers = useMemo(() => {
    const set = new Set(products.map((p) => p.designer));
    return ["all", ...Array.from(set).sort()];
  }, []);

  const list = useMemo(() => {
    return products.filter((p) => {
      if (category && category !== "all" && p.category !== category) return false;
      if (designer !== "all" && p.designer !== designer) return false;
      return true;
    });
  }, [category, designer]);

  const active = category || "all";

  return (
    <div className="shop">
      <header className="shop__hero">
        <h1>{TITLES[active] || "Shop"}</h1>
      </header>

      <div className="filters">
        <div className="filters__row">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              to={f.path}
              className={`filter-link ${active === f.key ? "is-active" : ""}`}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <div className="filters__row filters__row--scroll">
          {designers.map((d) => (
            <button
              key={d}
              type="button"
              className={`filter-link ${designer === d ? "is-active" : ""}`}
              onClick={() => {
                const next = new URLSearchParams(params);
                if (d === "all") next.delete("designer");
                else next.set("designer", d);
                setParams(next);
              }}
            >
              {d === "all" ? "All brands" : d}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid--shop">
        {list.map((p, i) => (
          <ProductTile key={p.id} product={p} index={i} />
        ))}
      </div>
      {!list.length && <p className="empty">No pieces in this collection.</p>}
    </div>
  );
}
