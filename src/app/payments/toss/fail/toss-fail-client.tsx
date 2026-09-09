"use client";

import { ButtonLink } from "@/components/ui/button-link";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useSessionStore } from "@/lib/session-store";

export function TossFailClient() {
  const searchParams = useSearchParams();
  const hydrate = useSessionStore((state) => state.hydrate);
  const orderId = searchParams.get("orderId")?.trim();
  const code = searchParams.get("code")?.trim();
  const message = searchParams.get("message")?.trim() || "결제가 취소되었거나 완료되지 않았습니다.";

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">결제가 완료되지 않았습니다</h1>
      <p className="mt-4 text-sm text-content-secondary">{message}</p>
      {code ? <p className="mt-2 text-xs text-content-secondary">오류 코드: {code}</p> : null}
      {orderId ? <p className="mt-2 text-sm font-bold">주문: {orderId}</p> : null}
      <div className="mt-6 flex justify-center gap-2">
        <ButtonLink href="/checkout" >결제 다시 시도</ButtonLink>
        <ButtonLink href="/mypage" variant="secondary">주문 내역</ButtonLink>
      </div>
    </main>
  );
}
