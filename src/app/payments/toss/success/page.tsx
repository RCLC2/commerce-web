import { Suspense } from "react";
import { TossSuccessClient } from "./toss-success-client";

export default function TossPaymentSuccessPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-xl px-4 py-16 text-center text-sm text-muted">결제 결과를 확인하는 중입니다.</main>}>
      <TossSuccessClient />
    </Suspense>
  );
}
