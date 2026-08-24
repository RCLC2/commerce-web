export const PRODUCT_DETAIL_DOCUMENT_VERSION = 1;

export const productDetailBlockTypes = ["hero", "text", "image", "features", "notice", "divider", "button"] as const;

export type ProductDetailBlockType = typeof productDetailBlockTypes[number];
export type ProductDetailBlockAlignment = "left" | "center";

export type ProductDetailBlock = {
  id: string;
  type: ProductDetailBlockType;
  eyebrow: string;
  title: string;
  body: string;
  imageURL: string;
  imageAlt: string;
  items: string[];
  label: string;
  href: string;
  align: ProductDetailBlockAlignment;
};

export type ProductDetailDocument = {
  version: typeof PRODUCT_DETAIL_DOCUMENT_VERSION;
  blocks: ProductDetailBlock[];
  html: string;
};

let nextBlockID = 0;

export function emptyProductDetailDocument(): ProductDetailDocument {
  return { version: PRODUCT_DETAIL_DOCUMENT_VERSION, blocks: [], html: "" };
}

export function createProductDetailBlock(type: ProductDetailBlockType, patch: Partial<Omit<ProductDetailBlock, "id" | "type">> = {}): ProductDetailBlock {
  nextBlockID += 1;
  return normalizeBlock({
    id: `${type}-${nextBlockID}`,
    type,
    eyebrow: "",
    title: "",
    body: "",
    imageURL: "",
    imageAlt: "",
    items: [],
    label: "",
    href: "",
    align: "left",
    ...patch,
  })!;
}

export function withProductDetailBlocks(document: ProductDetailDocument, blocks: ProductDetailBlock[]): ProductDetailDocument {
  const safeBlocks = blocks.map(normalizeBlock).filter((block): block is ProductDetailBlock => Boolean(block));
  return { version: PRODUCT_DETAIL_DOCUMENT_VERSION, blocks: safeBlocks, html: renderProductDetailBlocks(safeBlocks) };
}

export function withProductDetailHTML(document: ProductDetailDocument, html: string): ProductDetailDocument {
  return { ...document, version: PRODUCT_DETAIL_DOCUMENT_VERSION, blocks: [], html };
}

export function serializeProductDetailDocument(document: ProductDetailDocument): string {
  return JSON.stringify({
    version: PRODUCT_DETAIL_DOCUMENT_VERSION,
    blocks: document.blocks.map(normalizeBlock).filter((block): block is ProductDetailBlock => Boolean(block)),
    html: document.html.trim(),
  });
}

export function detailDocumentFromDescription(description?: string): ProductDetailDocument {
  const raw = description?.trim() ?? "";
  if (!raw) return emptyProductDetailDocument();

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ...emptyProductDetailDocument(), html: raw };
    }
    const source = parsed as { version?: unknown; blocks?: unknown; html?: unknown };
    const html = typeof source.html === "string" ? source.html : "";
    const blocks = source.version === PRODUCT_DETAIL_DOCUMENT_VERSION && Array.isArray(source.blocks)
      ? source.blocks.map(normalizeBlock).filter((block): block is ProductDetailBlock => Boolean(block))
      : [];
    return { version: PRODUCT_DETAIL_DOCUMENT_VERSION, blocks, html };
  } catch {
    return { ...emptyProductDetailDocument(), html: raw };
  }
}

export function renderProductDetailBlocks(blocks: ProductDetailBlock[]): string {
  return blocks.map(normalizeBlock).filter((block): block is ProductDetailBlock => Boolean(block)).map(renderBlock).join("\n");
}

function renderBlock(block: ProductDetailBlock): string {
  const title = block.title ? `<h3>${escapeHTML(block.title)}</h3>` : "";
  const eyebrow = block.eyebrow ? `<p class="detail-eyebrow">${escapeHTML(block.eyebrow)}</p>` : "";
  const body = block.body ? `<p>${escapeHTML(block.body)}</p>` : "";
  const image = productDetailImageHTML(block.imageURL, block.imageAlt);
  const alignment = block.align === "center" ? " detail-center-text" : "";

  switch (block.type) {
    case "hero":
      return `<section class="detail-band detail-hero${alignment}">${image}<div class="detail-center">${eyebrow}${title}${body}</div></section>`;
    case "text":
      return `<section class="detail-band detail-text${alignment}"><div class="detail-center">${eyebrow}${title}${body}</div></section>`;
    case "image":
      return `<section class="detail-band detail-image"><div class="detail-center">${image}${body}</div></section>`;
    case "features": {
      const items = block.items.map((item) => item.trim()).filter(Boolean).map((item) => `<li>${escapeHTML(item)}</li>`).join("");
      return `<section class="detail-band detail-features${alignment}"><div class="detail-center">${title}${body}${items ? `<ul>${items}</ul>` : ""}</div></section>`;
    }
    case "notice":
      return `<section class="detail-band detail-notice${alignment}"><div class="detail-center">${title}${body}</div></section>`;
    case "divider":
      return '<div class="detail-divider" role="separator"></div>';
    case "button": {
      const href = safeLink(block.href);
      const label = escapeHTML(block.label || block.title || "자세히 보기");
      return href ? `<section class="detail-band detail-button-wrap${alignment}"><div class="detail-center"><a class="detail-button" href="${href}" rel="noopener noreferrer">${label}</a></div></section>` : "";
    }
  }
}

function productDetailImageHTML(url: string, alt: string): string {
  const safeURL = safeLink(url);
  return safeURL ? `<img src="${safeURL}" alt="${escapeHTML(alt)}">` : "";
}

function safeLink(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) return escapeHTML(trimmed);
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:" ? escapeHTML(url.toString()) : "";
  } catch {
    return "";
  }
}

function normalizeBlock(value: unknown): ProductDetailBlock | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const block = value as Partial<ProductDetailBlock>;
  if (typeof block.id !== "string" || !block.id.trim() || !productDetailBlockTypes.includes(block.type as ProductDetailBlockType)) {
    return undefined;
  }
  return {
    id: block.id.trim().slice(0, 80),
    type: block.type as ProductDetailBlockType,
    eyebrow: stringValue(block.eyebrow, 160),
    title: stringValue(block.title, 240),
    body: stringValue(block.body, 3_000),
    imageURL: stringValue(block.imageURL, 2_000),
    imageAlt: stringValue(block.imageAlt, 240),
    items: Array.isArray(block.items) ? block.items.filter((item): item is string => typeof item === "string").map((item) => item.trim().slice(0, 240)).filter(Boolean).slice(0, 12) : [],
    label: stringValue(block.label, 120),
    href: stringValue(block.href, 2_000),
    align: block.align === "center" ? "center" : "left",
  };
}

function stringValue(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

function escapeHTML(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
