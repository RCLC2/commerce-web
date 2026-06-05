import { Suspense } from "react";
import { ProductListPage } from "@/components/product-list-page";

export default function Products() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted">상품을 불러오는 중입니다.</main>}>
      <ProductListPage />
    </Suspense>
  );
}
