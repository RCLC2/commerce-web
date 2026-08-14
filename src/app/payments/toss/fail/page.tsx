import { Suspense } from "react";
import { TossFailClient } from "./toss-fail-client";

export default function TossPaymentFailPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-xl px-4 py-16 text-center text-sm text-muted">결제 결과를 확인하는 중입니다.</main>}>
      <TossFailClient />
    </Suspense>
  );
}
