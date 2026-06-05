# Commerce Web Implementation Plan

## 1. Goal

`commerce-web`은 고객 쇼핑 앱, 셀러 콘솔, 어드민 콘솔을 하나의 Next.js 프로젝트 안에서 제공한다.
백엔드 `ably-commerce`의 현재 API 구현 상태를 기준으로, 먼저 실제 연결 가능한 화면을 만들고 부족한 API는 MSW와 계약 문서로 선행 정의한다.

## 2. Route Strategy

- Customer app: `/`, `/products/:id`, `/cart`, `/login`, `/mypage`
- Seller console: `/seller`, `/seller/products`, `/seller/inventory`, `/seller/orders`, `/seller/settlements`, `/seller/reviews`
- Admin console: `/admin`, `/admin/members`, `/admin/markets`, `/admin/products`, `/admin/orders`, `/admin/settlements`, `/admin/coupons`, `/admin/audit-logs`, `/admin/cms`

## 3. Customer MVP Minimum Scope

These items are the minimum implementation scope before seller/admin work can be considered product-complete.

### Phase C1: PLP, Product Listing Page

Status: required

Build:
- Product list page with category tabs, search entry, sort controls, and product cards
- Ranking/new-arrival/sale filters
- Pagination or infinite scroll
- Empty, loading, and API error states
- Mobile-first two-column grid and desktop four-column grid

Backend dependency:
- Implemented: `GET /api/v1/products`
- TODO: `GET /api/v1/categories`
- Current limitation: backend list filter query support is simplified, so frontend filters may start as local/MSW filters until API expands.

### Phase C1.5: Integrated Search and Autocomplete

Status: required

Build:
- Top app-shell search that routes to `/search?q=`
- Search result page that returns both products and markets in one view
- Autocomplete suggestions for keywords, products, and markets while typing
- Trending search keywords segmented by audience group with captured time
- MSW happy path for search result and suggestion contracts

Backend dependency:
- TODO: `GET /api/v1/search?q=&limit=`
- TODO: `GET /api/v1/search/suggestions?q=&limit=`
- TODO: `GET /api/v1/search/trending?segment=`
- Response should include products, markets, and normalized suggestions so the frontend does not need to run separate product/market searches.
- Trending search response should include `segments`, selected `segment`, `captured_at`, and ranked items so the frontend can render filters and 기준 시간 from backend data.

### Phase C2: PDP, Product Detail Page

Status: required

Build:
- Product image gallery
- Product title, market name, price, discount, shipping type, badges
- Option and quantity selection
- Stock/sold-out handling
- Add-to-cart flow
- Review section connected to product review API
- Sticky purchase action area on mobile

Backend dependency:
- Implemented: `GET /api/v1/products/:id`
- Implemented: `GET /api/v1/products/:id/reviews`
- Implemented: `POST /api/v1/cart/items`

### Phase C3: Cart, Checkout, and Payment Flow

Status: required

Build:
- Cart item list with quantity and selected option display
- Order sheet with shipping address, coupon, point usage, and final amount calculation
- Order creation from selected cart items
- Payment handoff placeholder for PortOne integration
- Payment completion screen that calls backend complete-payment API
- Order success and failure states

Backend dependency:
- Implemented: `GET /api/v1/cart`
- Implemented: `POST /api/v1/orders`
- Implemented: `POST /api/v1/orders/:orderCode/complete-payment`
- Implemented/partial: coupon and point APIs exist for customer use, but UI must verify actual route coverage.

### Phase C4: User Account, Profile Edit, and Orders

Status: required

Build:
- My page summary with email, role/status, notification settings, marketing consent, point balance
- Profile edit screen for notification type, marketing consent, nighttime consent, and password change placeholder
- My order list with status tabs
- Order detail page with market orders, line items, payment amount, delivery state placeholder
- Login-required guards and redirect behavior

Backend dependency:
- Implemented: `GET /api/v1/me`
- Implemented: `GET /api/v1/orders`
- Implemented: `GET /api/v1/orders/:orderCode`
- Missing or partial: profile update API is not visible in the current server routes, so edit UI may need an API contract/MSW first.

### Customer MVP Acceptance Criteria

- A user can browse PLP, open PDP, select an option, add to cart, create an order, complete payment, and see the order in My Page.
- A logged-in user can view their profile and order history.
- Profile edit UI is present; actual save is connected when backend update API is available.
- All required customer pages include loading, empty, and error states.
- MSW supports the full happy path for local development without the backend server.

## 4. Shared Architecture

- Role-aware navigation after login: `CUSTOMER`, `SELLER`, `ADMIN`
- Route guards in client layout and API request layer
- Dense dashboard UI for seller/admin areas, separate from customer commerce UI
- TanStack Query query keys split by domain: `products`, `seller-products`, `admin-orders`, `settlements`
- MSW handlers for all seller/admin APIs that are not yet connected in the backend
- Audit-aware mutation forms: every sensitive admin mutation must include `reason`

## 5. Seller Console Plan

### Phase S1: Seller Shell and Dashboard

Status: planned

Build:
- Seller-only layout with sidebar, top search, account/market switcher
- Summary widgets: sales, orders, pending shipments, low-stock options, settlement amount
- Task queue: new orders, delayed deliveries, inventory sync failures, settlement alerts

Backend dependency:
- Most dashboard aggregate APIs are not implemented yet.
- Start with MSW and define expected response contracts.

### Phase S2: Product and Inventory Operations

Status: planned

Build:
- My product list, product detail drawer, selling status controls
- Option and stock table
- Shopify/Cafe24 source registration forms
- Option mapping screen
- Inventory push action and sync status timeline

Backend dependency:
- Implemented: `POST /api/v1/inventory/sources`, `POST /api/v1/inventory/mappings`, `POST /api/v1/inventory/options/:optionID/push`
- Missing or partial: seller-owned product list, integration list/update/delete, sync log query, Cafe24 provider extension

### Phase S3: Seller Orders and Delivery

Status: planned

Build:
- Market order list filtered by status, date, shipment state
- Order detail with line items, buyer-safe shipping info, delivery actions
- Delivery start/complete flows
- Cancellation/return response placeholders

Backend dependency:
- Missing: market-scoped order list/detail APIs
- Partial: delivery start/complete APIs exist but need seller ownership verification

### Phase S4: Seller Settlements and Reviews

Status: planned

Build:
- Settlement summary and monthly settlement detail
- Settlement line items: order, commission, penalty, return shipping fee
- Review list for seller-owned products
- Review report/reply placeholders

Backend dependency:
- Implemented: `GET /api/v1/settlements/:marketID/summary`
- Missing: seller-protected settlement detail, payout account APIs, seller product review filters

## 6. Admin Console Plan

### Phase A1: Admin Shell and Operational Dashboard

Status: planned

Build:
- Admin-only layout with dense sidebar navigation
- KPI cards for orders, revenue, settlements, members, products
- Operational alerts: payment failure, delayed delivery, inventory sync failure, settlement error
- Recent admin activity feed

Backend dependency:
- Dashboard aggregate APIs are not implemented.
- Audit log storage exists, but audit log query API is missing.

### Phase A2: Orders, Delivery, and Settlements

Status: planned

Build first because backend docs mark this as the highest business priority.

Build:
- Global order search and filtering by date, status, market
- Order detail with Temporal/workflow status visibility placeholder
- Manual delivery status controls
- Force-cancel flow with required reason
- Settlement prepared/paid/excluded tables
- Penalty assignment and market restriction screens

Backend dependency:
- Partial: repositories/services exist for some operations, but admin routes are incomplete
- Implemented: delivery start/complete and settlement summary
- Missing: global order admin APIs, settlement finalization/payment APIs, restriction query/mutation APIs

Policy notes:
- Admin mutations that affect settlement, penalty, market restriction, or force cancellation must require a reason.
- `PAID` settlements must be read-only.
- Penalty score thresholds: 10+ `HIDE`, 20+ `PROMOTION_BAN`, 50+ `EXIT`.

### Phase A3: Members, Markets, Products, Categories

Status: planned

Build:
- Member list/search/detail
- Member status changes and role changes
- Market list/detail, status and restriction management
- Product list/detail, status changes
- Category management placeholder

Backend dependency:
- Many list/search/admin mutation APIs are missing.
- Customer product list/detail APIs are implemented and can seed product admin UI.

Policy notes:
- Customer personal information access must create an audit log.
- Member status and role changes should require admin reason once backend supports it.

### Phase A4: Coupons, Points, CMS, Reviews

Status: planned

Build:
- Coupon definition list/create/edit
- Coupon issue management
- Point adjustment with required reason
- Carousel/CMS management
- Review moderation queue

Backend dependency:
- Implemented: `POST /api/v1/carousels`, review write/list
- Partial: coupon and point services exist but admin routes are incomplete
- Missing: review moderation APIs, CMS update/disable APIs

## 7. Backend Contract Backlog

Define these contracts before building final seller/admin screens:

- `GET /api/v1/products?categoryID=&sort=&limit=&offset=`
- `GET /api/v1/categories`
- `GET /api/v1/search?q=&limit=`
- `GET /api/v1/search/suggestions?q=&limit=`
- `GET /api/v1/search/trending?segment=`
- `PATCH /api/v1/me`
- `GET /api/v1/me/addresses`
- `GET /api/v1/coupons/issuable`
- `POST /api/v1/coupons/:couponID/issue`
- `PATCH /api/v1/cart/items/:id`
- `DELETE /api/v1/cart/items/:id`
- `GET /api/v1/orders/:orderCode`
- `GET /api/v1/seller/dashboard`
- `GET /api/v1/seller/products`
- `PATCH /api/v1/seller/products/:id/status`
- `GET /api/v1/seller/inventory/sources`
- `PATCH /api/v1/seller/inventory/sources/:id`
- `GET /api/v1/seller/inventory/sync-logs`
- `GET /api/v1/seller/orders`
- `GET /api/v1/seller/orders/:orderCode`
- `GET /api/v1/seller/settlements`
- `GET /api/v1/admin/dashboard`
- `GET /api/v1/admin/audit-logs`
- `GET /api/v1/admin/members`
- `PATCH /api/v1/admin/members/:id/status`
- `GET /api/v1/admin/markets`
- `PATCH /api/v1/admin/markets/:id/restrictions`
- `GET /api/v1/admin/orders`
- `POST /api/v1/admin/orders/:orderCode/force-cancel`
- `GET /api/v1/admin/settlements`
- `PATCH /api/v1/admin/settlements/:id/status`
- `POST /api/v1/admin/markets/:id/penalties`
- `GET /api/v1/admin/coupons`
- `POST /api/v1/admin/points/adjustments`

## 8. Build Order

1. Complete customer PLP, PDP, cart, checkout/payment, My Page profile, and order history.
2. Add customer MSW happy path for browse-to-payment-to-order-history.
3. Add role-aware app shell, auth guard, and route groups for `/seller` and `/admin`.
4. Add MSW contracts for seller/admin dashboard, products, orders, settlements, audit logs.
5. Build seller dashboard and inventory integration screens first.
6. Build admin orders/settlements screens first.
7. Add member/market/product admin screens.
8. Add coupons/points/CMS/review moderation screens.
9. Replace MSW endpoints with real backend APIs as routes become available.

## 9. Design Direction

- Customer pages: app-like fashion commerce, image-heavy, mobile-first.
- Seller pages: operational, compact, table-heavy, task-first.
- Admin pages: dense back-office console with clear filters, audit reasons, and irreversible-state warnings.
- Avoid marketing-style hero sections in seller/admin areas.
