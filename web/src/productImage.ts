import cutouts from "./data/cutouts.json";
import type { Product } from "./types";

const CUTOUTS = cutouts as Record<string, string>;

/** Cutouts for clothing + shoes (bags keep listing photos). */
const CUTOUT_CATEGORIES = new Set(["ready-to-wear", "shoes"]);

export function productImage(product: Product): string {
  if (CUTOUT_CATEGORIES.has(product.category) && CUTOUTS[product.id]) {
    return CUTOUTS[product.id];
  }
  return product.photo;
}
