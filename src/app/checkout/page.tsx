import { Suspense } from "react";
import { PageLayout } from "@/components/page-layout";
import { LoadingState } from "@/components/ui/feedback";
import { CheckoutPage } from "@/components/checkout-page";

export default function Checkout() {
  return (
    <Suspense fallback={<PageLayout><LoadingState label="주문서를 준비하는 중입니다." /></PageLayout>}>
      <CheckoutPage />
    </Suspense>
  );
}
