import { Suspense } from "react";
import { PageLayout } from "@/components/page-layout";
import { MyCouponsPage } from "@/components/my-coupons-page";
import { LoadingState } from "@/components/ui/feedback";

export default function Page() {
  return <Suspense fallback={<PageLayout className="text-sm text-content-secondary"><LoadingState label="쿠폰을 불러오는 중입니다." /></PageLayout>}><MyCouponsPage /></Suspense>;
}
