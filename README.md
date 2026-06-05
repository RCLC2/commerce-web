# Commerce Web

`commerce-web` is a production-oriented fashion commerce frontend for the `ably-commerce` backend.

Repository: [RCLC2/commerce-web](https://github.com/RCLC2/commerce-web)

## Overview

The app targets an Ably-inspired fashion commerce experience with a customer shopping app first, then seller and admin consoles.
It is designed for Vercel deployment and can run locally either against the Go backend API or against MSW mock APIs.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- TanStack Query
- Zustand
- React Hook Form + Zod
- MSW for local mock API
- Vercel deployment ready

## Local Setup

```bash
npm install
npm run dev
```

Default local URL:

```text
http://localhost:3000
```

## Environment

Create `.env.local` from `.env.example`.

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_API_MOCKING=enabled
```

When `NEXT_PUBLIC_API_MOCKING=enabled`, MSW serves the same frontend API contracts without the backend server.
For Vercel or real backend integration, set `NEXT_PUBLIC_API_BASE_URL` to the deployed API host and disable or unset `NEXT_PUBLIC_API_MOCKING`.

For production deployments, configure:

```bash
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_API_MOCKING=disabled
```

`NEXT_PUBLIC_API_BASE_URL` may be provided with or without `http://`; the app normalizes it before making requests.

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run start
```

## Current Customer Routes

- `/`: home, featured products, popular markets
- `/products`: PLP with search and sort controls
- `/products/[id]`: PDP with image, option selection, reviews, add-to-cart
- `/cart`: cart summary
- `/checkout`: order sheet, coupon/point usage, mock payment completion
- `/orders/[orderCode]`: order detail
- `/login`: login
- `/register`: customer/seller registration
- `/mypage`: profile summary and order history
- `/mypage/profile`: profile edit UI

## Planned Console Routes

- `/seller`: seller dashboard
- `/seller/products`: seller product management
- `/seller/inventory`: Shopify/Cafe24 inventory integrations
- `/seller/orders`: seller market orders
- `/seller/settlements`: seller settlements
- `/admin`: admin dashboard
- `/admin/members`: member management
- `/admin/markets`: market and restriction management
- `/admin/products`: product management
- `/admin/orders`: global order operations
- `/admin/settlements`: settlement and penalty operations
- `/admin/audit-logs`: append-only admin audit logs
- `/admin/cms`: carousel and content management

See [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) for the phased plan.

## API Coverage

Currently wired in the API client and MSW:

- `GET /api/v1/markets`
- `GET /api/v1/products`
- `GET /api/v1/products/:id`
- `GET /api/v1/products/:id/reviews`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `GET /api/v1/me`
- `PATCH /api/v1/me`
- `POST /api/v1/cart/items`
- `GET /api/v1/cart`
- `GET /api/v1/coupons`
- `POST /api/v1/orders`
- `GET /api/v1/orders`
- `GET /api/v1/orders/:orderCode`
- `POST /api/v1/orders/:orderCode/complete-payment`
- `GET /api/v1/seller/dashboard`
- `GET /api/v1/seller/products`
- `GET /api/v1/seller/inventory/sources`
- `GET /api/v1/seller/inventory/sync-logs`
- `GET /api/v1/seller/orders`
- `GET /api/v1/seller/settlements`
- `GET /api/v1/seller/reviews`
- `POST /api/v1/inventory/sources`
- `GET /api/v1/admin/dashboard`
- `GET /api/v1/admin/members`
- `GET /api/v1/admin/markets`
- `GET /api/v1/admin/products`
- `GET /api/v1/admin/orders`
- `GET /api/v1/admin/settlements`
- `GET /api/v1/admin/coupons`
- `GET /api/v1/admin/audit-logs`
- `GET /api/v1/admin/carousels`

Notes:

- `PATCH /api/v1/me` is currently a frontend/MSW contract. The backend route is not connected yet.
- `GET /api/v1/markets` is currently a frontend/MSW contract for richer UI fixtures.
- Seller/admin API contracts are planned and documented but not fully implemented.
- Seller/admin screens are available through MSW contracts first. Replace these contracts with real backend routes as they are connected.

## Mock Data

MSW includes:

- 6 markets
- 12 fashion products
- Product options and inventory quantities
- Reviews
- Coupons
- Cart item
- Order list and order detail

Mock definitions live in:

- `src/mocks/mock-data.ts`
- `src/mocks/handlers.ts`

## Backend Relationship

The backend project is expected beside this app:

```text
vacation/
  ably-commerce/
  commerce-web/
```

The backend API base URL defaults to:

```text
http://localhost:8080
```

## Git Remote

This project is connected to:

```bash
git remote add origin https://github.com/RCLC2/commerce-web.git
```

Do not assume the working tree has been committed. This project was intentionally prepared without creating a commit.

## Deployment

Vercel environment variables:

```bash
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_API_MOCKING=disabled
```

For demo deployments without a backend, set:

```bash
NEXT_PUBLIC_API_MOCKING=enabled
```
