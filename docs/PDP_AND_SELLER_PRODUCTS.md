# PDP and Seller Product Authoring

This document uses the normative terms defined by the server PDP and seller product content document.

## PDP Behavior

- Market Name is a Next.js `Link` to the Market Page.
- Rating and total review count come from Review Summary. They are never calculated from review cards in the browser.
- Purchase Summary is the only descriptive copy in the purchase panel.
- Product Detail HTML is the long vertical section below the Review Carousel.
- Product Image Gallery supports up to five ordered images, thumbnail selection, Gallery Drag Navigation with live translation feedback, and previous/next controls.
- Review Carousel is horizontally scrollable and appears between the top product layout and Product Detail HTML.
- Each Review Detail card renders the masked reviewer alias, Verified Purchase badge, purchased option, body profile when present, creation date, rating, content, and representative review image from the server response.
- The floating action remains available while scrolling. It opens the Quick Purchase Modal with option, quantity, wishlist, and cart actions.
- PDP Merchandising is fetched in the Next.js server route and passed into the initial PDP render.
- PDP Card Ad and Sponsored Market Shelf appear above Product Detail HTML only when their server response values are non-null.
- Also Viewed Shelf appears below Product Detail HTML and uses only the server-ordered products.
- PDP Card Ad, Sponsored Market Shelf, and Also Viewed Shelf are the normative names shared with the server document.

## Seller Product Authoring

- Seller can enter Purchase Summary separately from Product Detail HTML.
- The HTML editor supports source editing, local `.html` import, and preview.
- The editor manages up to five image URLs and changes their canonical order with Left/Right controls.
- The server sanitizes Product Detail HTML when it is saved.
- The browser does not parse or generate Excel workbooks.
- Template download, all-products export, and Bulk Upsert use the server Seller Product Workbook endpoints.
- Bulk import results display created, updated, and error counts; product queries are invalidated after a successful response.

## API Error Policy

Product detail, reviews, Review Summary, merchandising, and seller product-list failures remain visible as errors. The client does not replace HTTP 404 or other failures with preview product data.

## Acceptance Criteria

1. Clicking Market Name opens the corresponding Market Page.
2. No client code derives review count or average rating.
3. Purchase Summary does not duplicate Product Detail HTML.
4. Gallery works with one through five images by thumbnail, live mouse/touch drag, and direction controls.
5. Review Detail cards do not reconstruct purchase or reviewer metadata in the browser.
6. Reviews render as a horizontal carousel above Product Detail HTML.
7. Quick Purchase Modal is reachable while deep in long-form content.
8. Seller can import HTML, preview it, manage image order, and save the product.
9. Seller can download the Workbook Template, bulk upload `.xlsx`, and download the full seller catalog.
10. API errors and empty responses are not replaced with preview data.
12. PDP Merchandising markup is present in the server-rendered response.
13. Null paid-placement values do not create empty PDP sections.
14. Product shelves are horizontal carousels with hidden scrollbars and direction controls.

## Delivery Workflow

This repository is changed in an isolated worktree from fetched `origin/main`. No commit is created before user approval; approved commits are split into logical units.
