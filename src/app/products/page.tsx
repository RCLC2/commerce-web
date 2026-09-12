import { Suspense } from "react";
import { PageLayout } from "@/components/page-layout";
import { LoadingState } from "@/components/ui/feedback";
import { ProductListPage } from "@/components/product-list-page";

export default function Products() {
  return (
    <Suspense fallback={<PageLayout className="pt-6"><LoadingState label="상품을 불러오는 중입니다." /></PageLayout>}>
      <ProductListPage />
    </Suspense>
  );
}
