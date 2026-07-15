/** Compact payment marks in the Stripe Checkout style. */

const METHODS = [
  "visa",
  "mastercard",
  "amex",
  "apple",
  "google",
  "paypal",
] as const;

type Method = (typeof METHODS)[number];

const LABELS: Record<Method, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  apple: "Apple Pay",
  google: "Google Pay",
  paypal: "PayPal",
};

function MarkIcon({ id }: { id: Method }) {
  switch (id) {
    case "visa":
      return (
        <svg viewBox="0 0 38 24" aria-hidden>
          <rect width="38" height="24" rx="4" fill="#1A1F71" />
          <text
            x="19"
            y="15.6"
            textAnchor="middle"
            fill="#fff"
            fontFamily="Arial, Helvetica, sans-serif"
            fontSize="9"
            fontWeight="700"
            fontStyle="italic"
            letterSpacing="1"
          >
            VISA
          </text>
        </svg>
      );
    case "mastercard":
      return (
        <svg viewBox="0 0 38 24" aria-hidden>
          <rect width="38" height="24" rx="4" fill="#252525" />
          <circle cx="15" cy="12" r="6.2" fill="#EB001B" />
          <circle cx="23" cy="12" r="6.2" fill="#F79E1B" />
          <path
            d="M19 7.4a6.2 6.2 0 0 1 0 9.2 6.2 6.2 0 0 1 0-9.2Z"
            fill="#FF5F00"
          />
        </svg>
      );
    case "amex":
      return (
        <svg viewBox="0 0 38 24" aria-hidden>
          <rect width="38" height="24" rx="4" fill="#2E77BC" />
          <text
            x="19"
            y="15.4"
            textAnchor="middle"
            fill="#fff"
            fontFamily="Arial, Helvetica, sans-serif"
            fontSize="7.5"
            fontWeight="700"
            letterSpacing="0.6"
          >
            AMEX
          </text>
        </svg>
      );
    case "apple":
      return (
        <svg viewBox="0 0 38 24" aria-hidden>
          <rect width="38" height="24" rx="4" fill="#000" />
          <g fill="#fff">
            <path d="M12.6 7.4c.5-.6.8-1.4.7-2.2-.7.1-1.6.5-2.1 1.1-.5.5-.9 1.4-.7 2.2.8.1 1.6-.4 2.1-1.1Zm.1 1.1c-1.1 0-2 .6-2.6.6-.6 0-1.4-.6-2.4-.6-1.2 0-2.4.7-3 1.9-1.3 2.2-.3 5.5 0 6.2.4.9.9 1.9 1.6 1.9.6.1 1 .6 2.1.6 1.1 0 1.4-.6 2.4-.6 1 0 1.3.6 2.2.6.8 0 1.3-.8 1.8-1.6.4-.7.6-1.5.6-1.5s-1.6-.6-1.6-2.6c0-2 1.7-2.8 1.8-2.9-.9-1.4-2.5-1.6-3-1.6Z" />
            <text
              x="17.2"
              y="15.4"
              fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
              fontSize="8.5"
              fontWeight="500"
            >
              Pay
            </text>
          </g>
        </svg>
      );
    case "google":
      return (
        <svg viewBox="0 0 46 24" aria-hidden>
          <rect
            x="0.5"
            y="0.5"
            width="45"
            height="23"
            rx="3.5"
            fill="#fff"
            stroke="#E0E0E0"
          />
          <g transform="translate(5.5 5.2)">
            <path
              fill="#4285F4"
              d="M13.4 6.9v2.4h-4c0 .9.4 2.1 1.1 2.8l2.5 1.9c1.5-1.4 2.4-3.4 2.4-5.8 0-.4 0-.9-.1-1.3h-1.9z"
            />
            <path
              fill="#34A853"
              d="M6.7 15.6c1.8 0 3.4-.6 4.5-1.6L9 11.9c-.5.4-1.5.8-2.5.8-1.9 0-3.5-1.3-4.1-3H.7v1.9c1.1 2.3 3.4 4 6 4z"
            />
            <path
              fill="#FBBC05"
              d="M2.6 9.7c-.2-.4-.2-.9-.2-1.4s.1-.9.2-1.4V5.1H.7C.2 6.1 0 7.1 0 8.3c0 1.2.2 2.3.7 3.3l1.9-1.9z"
            />
            <path
              fill="#EA4335"
              d="M6.7 2.3c1 0 1.9.3 2.6 1l2-2C10.2.8 8.6 0 6.7 0 4.1 0 1.8 1.7.7 4l1.9 1.9c.6-1.7 2.2-3.6 4.1-3.6z"
            />
          </g>
          <text
            x="22"
            y="15.3"
            fill="#3C4043"
            fontFamily="Arial, Helvetica, sans-serif"
            fontSize="8"
            fontWeight="500"
          >
            Pay
          </text>
        </svg>
      );
    case "paypal":
      return (
        <svg viewBox="0 0 38 24" aria-hidden>
          <rect
            x="0.5"
            y="0.5"
            width="37"
            height="23"
            rx="3.5"
            fill="#fff"
            stroke="#E0E0E0"
          />
          <text
            x="19"
            y="15.2"
            textAnchor="middle"
            fontFamily="Arial, Helvetica, sans-serif"
            fontSize="8"
            fontWeight="700"
          >
            <tspan fill="#003087">Pay</tspan>
            <tspan fill="#009CDE">Pal</tspan>
          </text>
        </svg>
      );
  }
}

export function PaymentMarks({
  className = "",
  caption = "Guaranteed safe & secure checkout",
}: {
  className?: string;
  caption?: string;
}) {
  return (
    <div className={`pay-marks ${className}`.trim()}>
      {caption ? (
        <p className="pay-marks__caption">
          <svg className="pay-marks__lock" viewBox="0 0 12 14" aria-hidden>
            <path
              fill="currentColor"
              d="M9.5 5.2V4a3.5 3.5 0 0 0-7 0v1.2H1.8A1.3 1.3 0 0 0 .5 6.5v5.2c0 .7.6 1.3 1.3 1.3h8.4c.7 0 1.3-.6 1.3-1.3V6.5c0-.7-.6-1.3-1.3-1.3H9.5Zm-5.2-1.2a2.2 2.2 0 0 1 4.4 0v1.2H4.3V4Z"
            />
          </svg>
          {caption}
        </p>
      ) : null}
      <ul className="pay-marks__list" aria-label="Accepted payment methods">
        {METHODS.map((id) => (
          <li key={id} title={LABELS[id]}>
            <span className="pay-marks__icon">
              <MarkIcon id={id} />
            </span>
            <span className="sr-only">{LABELS[id]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
