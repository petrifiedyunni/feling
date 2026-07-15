import { Link } from "react-router-dom";
import { useCart } from "../cart/CartContext";
import { formatPrice } from "../types";
import { productImage } from "../productImage";

export function CartDrawer() {
  const {
    lines,
    subtotal,
    isOpen,
    closeCart,
    removeItem,
    setQuantity,
  } = useCart();

  return (
    <>
      {isOpen && (
        <button
          className="cart-scrim"
          type="button"
          aria-label="Close cart"
          onClick={closeCart}
        />
      )}
      <aside
        className={`cart-drawer ${isOpen ? "cart-drawer--open" : ""}`}
        aria-hidden={!isOpen}
      >
        <header className="cart-drawer__head">
          <h2>Your cart</h2>
          <button type="button" onClick={closeCart} className="cart-drawer__x">
            Close
          </button>
        </header>

        {lines.length === 0 ? (
          <div className="cart-drawer__empty">
            <p>Your cart is empty</p>
            <button type="button" className="btn btn--chrome" onClick={closeCart}>
              Continue shopping
            </button>
          </div>
        ) : (
          <>
            <ul className="cart-drawer__lines">
              {lines.map((line) => (
                <li key={line.product.id} className="cart-line">
                  <Link
                    to={`/piece/${line.product.slug}`}
                    onClick={closeCart}
                    className="cart-line__media"
                  >
                    <img src={productImage(line.product)} alt="" />
                  </Link>
                  <div className="cart-line__body">
                    <p className="cart-line__brand">{line.product.designer}</p>
                    <Link
                      to={`/piece/${line.product.slug}`}
                      onClick={closeCart}
                      className="cart-line__title"
                    >
                      {line.product.title}
                    </Link>
                    <p className="cart-line__price">
                      {formatPrice(line.product.price)}
                    </p>
                    <div className="cart-line__qty">
                      <button
                        type="button"
                        aria-label="Decrease"
                        onClick={() =>
                          setQuantity(line.product.id, line.quantity - 1)
                        }
                      >
                        −
                      </button>
                      <span>{line.quantity}</span>
                      <button
                        type="button"
                        aria-label="Increase"
                        onClick={() =>
                          setQuantity(line.product.id, line.quantity + 1)
                        }
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="cart-line__remove"
                        onClick={() => removeItem(line.product.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <footer className="cart-drawer__foot">
              <div className="cart-drawer__sub">
                <span>Subtotal</span>
                <strong>{formatPrice(subtotal)}</strong>
              </div>
              <p className="cart-drawer__note">
                Taxes and shipping calculated at checkout.
              </p>
              <Link
                to="/checkout"
                className="btn btn--chrome btn--block"
                onClick={closeCart}
              >
                Checkout
              </Link>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
