import type { Product } from "./types";

export function resolveProductDetailHtml(product: Product) {
  if (product.detail_html) {
    return product.detail_html;
  }
  if (!product.description) {
    return "";
  }
  return `<p>${escapeHtml(product.description)}</p>`;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
