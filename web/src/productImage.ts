import cutouts from "../data/cutouts.json";
import type { Product } from "../types";

const CUTOUTS = cutouts as Record<string, string>;

/** Single-subject cutouts are clothing-only; bags/shoes keep listing photos. */
export function productImage(product: Product): string {
  if (product.category === "ready-to-wear" && CUTOUTS[product.id]) {
    return CUTOUTS[product.id];
  }
  return product.photo;
}
