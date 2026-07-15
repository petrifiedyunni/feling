import { Link } from "react-router-dom";
import type { Product } from "../types";
import { formatPrice } from "../types";
import { productImage } from "../productImage";

export function ProductTile({ product, index = 0 }: { product: Product; index?: number }) {
  const src = productImage(product);
  return (
    <Link
      to={`/piece/${product.slug}`}
      className={`tile tile--${product.category}`}
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
    >
      <div className="tile__media">
        <img src={src} alt={product.title} loading="lazy" />
      </div>
      <div className="tile__meta">
        <span className="tile__designer">{product.designer}</span>
        <h3 className="tile__title">{product.title}</h3>
        <span className="tile__price">{formatPrice(product.price)}</span>
      </div>
    </Link>
  );
}
