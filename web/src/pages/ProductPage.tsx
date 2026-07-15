import { Link, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import catalog from "../data/catalog.json";
import type { Product } from "../types";
import { conditionLabel, formatPrice } from "../types";
import { ProductTile } from "../components/ProductTile";
import { PaymentMarks } from "../components/PaymentMarks";
import { useCart } from "../cart/CartContext";
import { productImage } from "../productImage";

const products = catalog as Product[];

const CATEGORY_LABEL: Record<string, string> = {
  bags: "Bags",
  shoes: "Shoes",
  "ready-to-wear": "Clothing",
};

export function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const product = products.find((p) => p.slug === slug);
  const { addItem, openCart } = useCart();
  const [added, setAdded] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  if (!product) {
    return (
      <div className="product product--missing">
        <h1>Piece not found</h1>
        <Link to="/shop">Back to shop</Link>
      </div>
    );
  }

  const image = productImage(product);

  const related = products
    .filter(
      (p) =>
        p.id !== product.id &&
        (p.designer === product.designer || p.category === product.category)
    )
    .slice(0, 4);

  const onAdd = () => {
    addItem(product);
    setAdded(true);
    openCart();
    window.setTimeout(() => setAdded(false), 1600);
  };

  const onBuy = () => {
    addItem(product);
    navigate("/checkout");
  };

  return (
    <div className="product">
      <div className="product__main">
        <div className="product__stage">
          <img src={image} alt={product.title} />
        </div>
        <div className="product__info">
          <p className="eyebrow">{product.designer}</p>
          <h1>{product.title}</h1>
          <p className="product__price">{formatPrice(product.price)}</p>

          <ul className="product__notes">
            <li>{conditionLabel(product.condition)}</li>
            <li>Authenticated archive piece</li>
          </ul>

          <ul className="product__facts">
            <li>
              <span>Era</span>
              <em>{product.era}</em>
            </li>
            <li>
              <span>Category</span>
              <em>{CATEGORY_LABEL[product.category] || product.category}</em>
            </li>
          </ul>

          <div className="pay">
            <button type="button" className="pay__secondary" onClick={onAdd}>
              {added ? "Added" : "Add to cart"}
            </button>
            <button type="button" className="pay__primary" onClick={onBuy}>
              Buy now
            </button>
            <PaymentMarks />
          </div>

          <div className="product__more">
            <button
              type="button"
              className="product__more-toggle"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((v) => !v)}
            >
              More information
              <span aria-hidden>{moreOpen ? "−" : "+"}</span>
            </button>
            {moreOpen && (
              <div className="product__more-body">
                <p>
                  One-of-one vintage from the feling. archive. Ships insured.
                  Returns accepted within 7 days if the piece is unworn and tags
                  remain.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="section product__related">
          <div className="section__head">
            <h2>You may also like</h2>
          </div>
          <div className="grid grid--shop">
            {related.map((p, i) => (
              <ProductTile key={p.id} product={p} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
