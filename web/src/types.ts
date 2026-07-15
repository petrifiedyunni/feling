export type Product = {
  id: string;
  slug: string;
  brand: string;
  designer: string;
  title: string;
  price: number;
  condition: string;
  category: "bags" | "shoes" | "ready-to-wear" | string;
  photo: string;
  url: string;
  platform: string;
  approved_at?: string;
  era: string;
};

export function formatPrice(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function conditionLabel(c: string) {
  const map: Record<string, string> = {
    is_new: "New / Deadstock",
    is_gently_used: "Gently used",
    gently_used: "Gently used",
    is_used: "Vintage used",
    used: "Vintage used",
    Excellent: "Excellent",
    "Very Good": "Very good",
    Unknown: "Archive condition",
  };
  return map[c] || c || "Archive condition";
}
