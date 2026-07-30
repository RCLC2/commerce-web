"use client";

import Link from "next/link";
import { useSessionStore } from "@/lib/session-store";
import { Button } from "./ui/button";

export function MyReviewsPage() {
  const token = useSessionStore((state) => state.accessToken);

  if (!token) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-black">내 리뷰</h1>
        <p className="mt-2 text-sm text-muted">작성한 리뷰를 확인하려면 로그인해주세요.</p>
        <Link href="/login">
          <Button className="mt-5">로그인하기</Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 pt-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">내 리뷰</h1>
          <p className="mt-1 text-sm text-muted">작성한 리뷰 목록과 수정·삭제 기능은 준비 중입니다.</p>
        </div>
        <Link href="/mypage">
          <Button variant="secondary">마이페이지</Button>
        </Link>
      </div>

      <section className="mt-8 rounded-md border border-amber-300 bg-amber-50 p-6">
        <h2 className="font-black text-amber-950">현재 서버에서 지원하지 않는 기능입니다</h2>
        <p className="mt-2 text-sm leading-6 text-amber-900">
          서버에 회원별 리뷰 목록 API가 없어 실제 목록을 조회하거나 안전하게 수정·삭제할 수 없습니다.
          구매확정한 주문의 상세 화면에서는 리뷰를 작성할 수 있으며, 중복 작성 여부는 제출 시 서버가 확인합니다.
        </p>
        <Link href="/mypage" className="mt-4 inline-flex text-sm font-bold text-amber-950 underline">
          주문 내역에서 리뷰 작성하기
        </Link>
      </section>
    </main>
  );
}
