export function includesProduct(products: ReadonlyArray<{ id: number }> | undefined, productID: number) {
  return products?.some((product) => product.id === productID) ?? false;
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
  reviewable: boolean;
  reviewStatusLoaded: boolean;
  serverReviewed: boolean;
  submitted: boolean;
}) {
  return reviewable && reviewStatusLoaded && !serverReviewed && !submitted;
}
