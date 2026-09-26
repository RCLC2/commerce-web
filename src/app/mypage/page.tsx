import { Suspense } from "react";
import { PageLayout } from "@/components/page-layout";
import { LoadingState } from "@/components/ui/feedback";
import { MyPage } from "@/components/my-page";

export default function Mypage() {
  return (
    <Suspense fallback={<PageLayout className="pt-7"><LoadingState label="마이페이지를 불러오는 중입니다." /></PageLayout>}>
      <MyPage />
    </Suspense>
  );
}
