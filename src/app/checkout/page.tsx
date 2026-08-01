import { Suspense } from "react";
import { CheckoutPage } from "@/components/checkout-page";

export default function Checkout() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-5xl px-4 py-8 text-sm text-muted">주문서를 준비하는 중입니다.</main>}>
      <CheckoutPage />
    </Suspense>
  );
}
