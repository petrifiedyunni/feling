import cutouts from "./data/cutouts.json";
import type { Product } from "./types";

const CUTOUTS = cutouts as Record<string, string>;

/** Single-subject cutouts for clothes, shoes, and bags. */
const CUTOUT_CATEGORIES = new Set(["ready-to-wear", "shoes", "bags"]);

export function productImage(product: Product): string {
  if (CUTOUT_CATEGORIES.has(product.category) && CUTOUTS[product.id]) {
    return CUTOUTS[product.id];
  }
  return product.photo;
}
