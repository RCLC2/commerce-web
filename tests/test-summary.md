# Review Image E2E Test Summary

## Scope

- Added customer review image upload UI on `/orders/[orderCode]`.
- Verified the flow from completed order line item to product review visibility.
- Covered presign, object upload, upload completion, review creation, and product review list rendering through MSW.

## Test Case

- `tests/e2e/review-image-flow.spec.ts`
  - Opens `ORD-20260605-0001`.
  - Starts a review from a `COMPLETED` order line item.
  - Attaches a PNG image.
  - Submits the review.
  - Navigates to `/products/101` through the product link.
  - Confirms the review content, photo review badge, and review image are visible.
  - Confirms the review submit button is disabled until content is entered.
  - Rejects non-image file attachments without increasing the attachment count.
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
- `npm run test:e2e`: passed, 6 tests
