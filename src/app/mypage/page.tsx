import { Suspense } from "react";
import { MyPage } from "@/components/my-page";

export default function Mypage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-5xl px-4 py-8 text-sm text-muted">마이페이지를 불러오는 중입니다.</main>}>
      <MyPage />
    </Suspense>
  );
}
