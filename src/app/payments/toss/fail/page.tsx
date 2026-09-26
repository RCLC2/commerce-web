import { Suspense } from "react";
import { PageLayout } from "@/components/page-layout";
import { LoadingState } from "@/components/ui/feedback";
import { TossFailClient } from "./toss-fail-client";

export default function TossPaymentFailPage() {
  return (
    <Suspense fallback={<PageLayout variant="payment"><LoadingState label="결제 결과를 확인하는 중입니다." /></PageLayout>}>
      <TossFailClient />
    </Suspense>
  );
}
