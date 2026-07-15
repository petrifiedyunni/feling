import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { PaymentMarks } from "./PaymentMarks";

const QUICK_LINKS = [
  { label: "Shop all", to: "/shop" },
  { label: "Playground", to: "/playground" },
  { label: "Contact", to: "mailto:hello@feling.archive" },
  { label: "Privacy policy", to: "/#privacy" },
  { label: "Terms of service", to: "/#terms" },
  { label: "Refund policy", to: "/#refunds" },
];

export function SiteFooter() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const onSubscribe = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setEmail("");
  };

  return (
    <footer className="site-footer">
      <div className="site-footer__grid">
        <div className="site-footer__col">
          <h3 className="site-footer__heading">Quick links</h3>
          <ul className="site-footer__links">
            {QUICK_LINKS.map((item) => (
              <li key={item.label}>
                {item.to.startsWith("mailto:") ? (
                  <a href={item.to}>{item.label}</a>
                ) : (
                  <Link to={item.to}>{item.label}</Link>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="site-footer__col">
          <h3 className="site-footer__heading">Disclaimer</h3>
          <p className="site-footer__copy">
            feling. is an independent archive boutique. We are not affiliated with,
            endorsed by, or connected to the brands whose pieces we source. All
            items are pre-owned archive finds — authenticated by taste, listed as
            found.
          </p>
          <div className="site-footer__social" aria-label="Social">
            <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm5 4.6A4.4 4.4 0 1 0 16.4 12 4.4 4.4 0 0 0 12 7.6zm0 7.2A2.8 2.8 0 1 1 14.8 12 2.8 2.8 0 0 1 12 14.8zM17.7 6.7a1 1 0 1 0 1 1 1 1 0 0 0-1-1z"
                />
              </svg>
            </a>
            <a href="https://tiktok.com" target="_blank" rel="noreferrer" aria-label="TikTok">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M14.5 3h2.1c.2 1.8 1.3 3.3 3.1 4v2.2a6.9 6.9 0 0 1-3.1-.9v6.4a5.7 5.7 0 1 1-5.7-5.7c.3 0 .6 0 .9.1v2.4a3.3 3.3 0 1 0 2.4 3.1V3z"
                />
              </svg>
            </a>
            <a href="https://pinterest.com" target="_blank" rel="noreferrer" aria-label="Pinterest">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 3a9 9 0 0 0-3.3 17.4c-.1-.7-.2-1.8 0-2.6.2-.7 1.3-5.4 1.3-5.4s-.3-.7-.3-1.6c0-1.5.9-2.6 2-2.6.9 0 1.4.7 1.4 1.5 0 .9-.6 2.3-.9 3.5-.3 1.1.5 1.9 1.6 1.9 1.9 0 3.2-2.4 3.2-5.3 0-2.2-1.5-3.8-4.2-3.8-3 0-4.9 2.2-4.9 4.7 0 .9.3 1.5.7 2 .1.1.1.2.1.3l-.3 1.1c0 .2-.1.2-.3.1-1.2-.5-1.8-1.9-1.8-3.4 0-2.5 2.1-5.6 6.3-5.6 3.4 0 5.6 2.4 5.6 5 0 3.4-1.9 6-4.7 6-1 0-1.9-.5-2.2-1.1l-.6 2.3c-.2.8-.8 1.8-1.2 2.4A9 9 0 1 0 12 3z"
                />
              </svg>
            </a>
          </div>
        </div>

        <div className="site-footer__col">
          <h3 className="site-footer__heading">Want in…?</h3>
          <p className="site-footer__copy">
            Sign up for early drops, quiet discounts, and archive finds before they
            hit the vault.
          </p>
          {subscribed ? (
            <p className="site-footer__thanks">You're on the list.</p>
          ) : (
            <form className="site-footer__form" onSubmit={onSubscribe}>
              <label className="sr-only" htmlFor="footer-email">
                Email address
              </label>
              <input
                id="footer-email"
                type="email"
                name="email"
                required
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              <button type="submit">Subscribe</button>
            </form>
          )}
        </div>
      </div>

      <div className="site-footer__bar">
        <div className="site-footer__legal">
          <p className="site-footer__region">Singapore · SGD</p>
          <p className="site-footer__copyright">
            © {new Date().getFullYear()} feling.
          </p>
        </div>
        <PaymentMarks className="pay-marks--footer" caption="" />
      </div>
    </footer>
  );
}
