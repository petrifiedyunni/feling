/** An item waiting for Approve/Skip in the /review queue (mirrors pending.json). */
export type PendingItem = {
  uid: string;
  platform: string;
  brand: string;
  title: string;
  price: number;
  condition: string;
  photo: string;
  url: string;
  taste?: number;
  heat?: number;
  region_label?: string;
  region?: string;
};

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
  status?: InventoryStatus;
  sold?: boolean;
};

/** Lifecycle of a physical item after it's been approved for purchase. */
export type InventoryStatus =
  | "approved"
  | "received"
  | "qc_passed"
  | "photographed"
  | "listed"
  | "sold"
  | "returned";

export const INVENTORY_STATUSES: InventoryStatus[] = [
  "approved",
  "received",
  "qc_passed",
  "photographed",
  "listed",
  "sold",
  "returned",
];

export const STATUS_LABEL: Record<InventoryStatus, string> = {
  approved: "Approved (not yet received)",
  received: "Received",
  qc_passed: "QC passed",
  photographed: "Photographed",
  listed: "Listed for sale",
  sold: "Sold",
  returned: "Returned / issue",
};

/** One approved listing merged with its post-purchase tracker fields. */
export type InventoryItem = {
  uid: string;
  platform: string;
  brand: string;
  title: string;
  cost: number;
  condition: string;
  url: string;
  photo: string;
  approved_at?: string;
  status: InventoryStatus;
  received_at?: string;
  qc_passed?: boolean;
  qc_notes?: string;
  photographed?: boolean;
  resale_price?: number;
  listed_channels?: string;
  listed_at?: string;
  sold_price?: number;
  sold_at?: string;
  sold_channel?: string;
  notes?: string;
  updated_at?: string;
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
