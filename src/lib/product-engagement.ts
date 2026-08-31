export function includesProduct(products: ReadonlyArray<{ id: number }> | undefined, productID: number) {
  return products?.some((product) => product.id === productID) ?? false;
}

export type SellableOption = {
  id: number;
  quantity: number;
  reserved_quantity?: number;
  is_active: boolean;
};

export function availableOptionQuantity(option: SellableOption | undefined): number {
  if (!option?.is_active) return 0;
  return Math.max(0, option.quantity - Math.max(0, option.reserved_quantity ?? 0));
}

export function firstSellableOption<T extends SellableOption>(
  options: readonly T[] | undefined,
): T | undefined {
  return options?.find((option) => availableOptionQuantity(option) > 0);
}

export function clampOptionQuantity(quantity: number, option: SellableOption | undefined): number {
  const available = availableOptionQuantity(option);
  if (available === 0) return 1;
  const normalized = Number.isSafeInteger(quantity) ? quantity : 1;
  return Math.min(available, Math.max(1, normalized));
}

type CartItemIdentity = {
  id: number;
  product_id: number;
  option_id: number;
  quantity: number;
};

export function findNewMatchingCartItem<T extends CartItemIdentity>(
  before: readonly T[],
  after: readonly T[],
  input: Omit<CartItemIdentity, "id">,
): T | undefined {
  const priorIDs = new Set(before.map((item) => item.id));
  const matches = after.filter((item) =>
    !priorIDs.has(item.id)
    && item.product_id === input.product_id
    && item.option_id === input.option_id
    && item.quantity === input.quantity);
  return matches.length === 1 ? matches[0] : undefined;
}

export function validCollectionPage(page: number, itemCount: number, pageSize: number) {
  if (!Number.isSafeInteger(pageSize) || pageSize <= 0) {
    throw new RangeError("페이지 크기는 1 이상의 안전한 정수여야 합니다.");
  }
  const totalPages = Math.max(1, Math.ceil(Math.max(0, itemCount) / pageSize));
  const normalizedPage = Number.isSafeInteger(page) ? page : 1;
  return Math.min(totalPages, Math.max(1, normalizedPage));
}

export function reviewedOrderLineItemIDs(
  reviews: ReadonlyArray<{ order_line_item_id?: number }> | undefined,
) {
  return new Set(
    reviews?.flatMap((review) => review.order_line_item_id === undefined ? [] : [review.order_line_item_id]) ?? [],
  );
}

export function canWriteOrderLineReview({
  reviewable,
  reviewStatusLoaded,
  serverReviewed,
  submitted,
}: {
  reviewable: boolean | undefined;
  reviewStatusLoaded: boolean;
  serverReviewed: boolean;
  submitted: boolean;
}) {
  return reviewable === true && reviewStatusLoaded && !serverReviewed && !submitted;
}
