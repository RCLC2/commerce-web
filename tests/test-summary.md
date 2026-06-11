# Review Image E2E Test Summary

## Scope

- Added customer review image upload UI on `/orders/[orderCode]`.
- Verified the flow from completed order line item to product review visibility.
- Added `/mypage/reviews` management coverage for listing, editing, and deleting written reviews.
- Covered presign, object upload, upload completion, review creation, duplicate prevention, product review list rendering, and review management through MSW.
- Aligned client-side file validation with the backend review media contract: PNG/JPG/WEBP only, 10 MiB max size, and 8000x8000 max dimensions before presign.

## Test Case

- `tests/e2e/review-image-flow.spec.ts`
  - Opens `ORD-20260605-0001`.
  - Starts a review from a `COMPLETED` order line item.
  - Attaches a PNG image.
  - Submits the review.
  - Navigates to `/products/101` through the product link.
  - Confirms the review content, photo review badge, and review image are visible.
  - Confirms the review submit button is disabled until content is entered.
  - Confirms completed order lines with an existing active review show `리뷰 작성 완료` and link to `내 리뷰 보기`.
  - Opens `/mypage/reviews`, edits a written review, confirms deletion, and deletes it.
  - Rejects non-image file attachments without increasing the attachment count.
  - Rejects unsupported image MIME types before presign.
  - Rejects files larger than 10 MiB before presign.
  - Removes an attached review image and returns the count to zero.
  - Caps attached review images at five files.
  - Registers a text-only review and confirms it appears without photo review UI.

## Commands

```bash
npm run lint
npm run build
npm run test:e2e
```

## Result

- `npm run lint`: passed
- `npm run build`: passed
- `npm run test:e2e`: passed, 9 tests
