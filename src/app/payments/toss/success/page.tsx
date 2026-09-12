import { Suspense } from "react";
import { PageLayout } from "@/components/page-layout";
import { LoadingState } from "@/components/ui/feedback";
import { TossSuccessClient } from "./toss-success-client";

export default function TossPaymentSuccessPage() {
  return (
    <Suspense fallback={<PageLayout variant="payment"><LoadingState label="결제 결과를 확인하는 중입니다." /></PageLayout>}>
      <TossSuccessClient />
    </Suspense>
  );
}
