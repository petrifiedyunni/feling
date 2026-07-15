import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { useCart } from "../cart/CartContext";
import { formatPrice } from "../types";
import { PaymentMarks } from "../components/PaymentMarks";
import { productImage } from "../productImage";

/** Stripe Checkout–inspired contact → payment → confirm flow */
export function CheckoutPage() {
  const { lines, subtotal, clearCart } = useCart();
  const [step, setStep] = useState<"info" | "pay" | "done">("info");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [card, setCard] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");

  const itemTotal = useMemo(
    () => lines.reduce((n, l) => n + l.quantity, 0),
    [lines]
  );

  if (lines.length === 0 && step !== "done") {
    return (
      <div className="checkout checkout--empty">
        <h1>Checkout</h1>
        <p>Your cart is empty.</p>
        <Link className="pay__primary" to="/shop">
          Return to shop
        </Link>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="checkout checkout--done">
        <div className="stripe-card stripe-card--done">
          <p className="stripe-card__ok">Payment successful</p>
          <h1>Thank you{name ? `, ${name.split(" ")[0]}` : ""}.</h1>
          <p>
            A confirmation is on its way to {email || "your email"}. We’ll pack
            your archive piece with care.
          </p>
          <Link className="pay__primary" to="/shop">
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout checkout--stripe">
      <div className="checkout__main">
        <Link to="/shop" className="checkout__brand">
          feling.
        </Link>

        <ol className="checkout__steps">
          <li className={step === "info" ? "is-active" : "is-done"}>
            Information
          </li>
          <li className={step === "pay" ? "is-active" : ""}>Payment</li>
        </ol>

        {step === "info" && (
          <form
            className="stripe-form"
            onSubmit={(e) => {
              e.preventDefault();
              setStep("pay");
            }}
          >
            <h1>Contact</h1>
            <label className="stripe-field">
              <span>Email</span>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                autoComplete="email"
              />
            </label>
            <label className="stripe-field">
              <span>Full name</span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                autoComplete="name"
              />
            </label>
            <button className="pay__primary pay__primary--wide" type="submit">
              Continue to payment
            </button>
          </form>
        )}

        {step === "pay" && (
          <form
            className="stripe-form"
            onSubmit={(e) => {
              e.preventDefault();
              clearCart();
              setStep("done");
            }}
          >
            <h1>Payment</h1>
            <p className="stripe-form__hint">
              Card details stay on this device for now — wire Stripe keys when
              you’re ready to take live payments.
            </p>

            <div className="stripe-panel">
              <label className="stripe-field">
                <span>Card number</span>
                <input
                  required
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="1234 1234 1234 1234"
                  value={card}
                  onChange={(e) => setCard(e.target.value)}
                />
              </label>
              <div className="stripe-field-row">
                <label className="stripe-field">
                  <span>Expiry</span>
                  <input
                    required
                    autoComplete="cc-exp"
                    placeholder="MM / YY"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                  />
                </label>
                <label className="stripe-field">
                  <span>CVC</span>
                  <input
                    required
                    autoComplete="cc-csc"
                    placeholder="CVC"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className="checkout__actions">
              <button
                type="button"
                className="pay__secondary"
                onClick={() => setStep("info")}
              >
                Back
              </button>
              <button className="pay__primary" type="submit">
                Pay {formatPrice(subtotal)}
              </button>
            </div>
            <PaymentMarks caption="Payments processed securely" />
          </form>
        )}
      </div>

      <aside className="checkout__summary stripe-summary">
        <ul>
          {lines.map((line) => (
            <li key={line.product.id}>
              <div className="stripe-summary__thumb">
                <img
                  src={productImage(line.product)}
                  alt=""
                />
                <span>{line.quantity}</span>
              </div>
              <div>
                <strong>{line.product.title}</strong>
                <em>{line.product.designer}</em>
              </div>
              <b>{formatPrice(line.product.price * line.quantity)}</b>
            </li>
          ))}
        </ul>
        <div className="checkout__totals">
          <div>
            <span>Subtotal · {itemTotal} items</span>
            <strong>{formatPrice(subtotal)}</strong>
          </div>
          <div>
            <span>Shipping</span>
            <strong>Calculated at next step</strong>
          </div>
          <div className="checkout__grand">
            <span>Total</span>
            <strong>{formatPrice(subtotal)}</strong>
          </div>
        </div>
      </aside>
    </div>
  );
}
