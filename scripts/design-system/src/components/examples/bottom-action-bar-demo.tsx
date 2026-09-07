"use client";

import { useState } from "react";
import { BottomActionBar } from "@/components/ui/bottom-action-bar";
import { Button } from "@/components/ui/button";

export function BottomActionBarDemo() {
  const [added, setAdded] = useState(false);

  return (
    <div
      role="region"
      aria-label="하단 구매 바 스크롤 예시"
      tabIndex={0}
      className="relative isolate mx-auto h-96 max-w-sm overflow-y-auto rounded-surface border border-border-subtle bg-surface-raised"
    >
      <div className="min-h-[560px] space-y-8 p-5">
        <div>
          <h3 className="font-bold">소프트 린넨 셔츠</h3>
          <p className="mt-2 text-sm text-content-secondary">
            오프화이트 · M · 1개
          </p>
        </div>
        <div>
          <h4 className="text-sm font-bold">상품 정보</h4>
          <p className="mt-2 text-sm leading-7 text-content-secondary">
            린넨 55%, 면 45%
            <br />
            총장 68cm · 어깨 48cm · 가슴 56cm
          </p>
        </div>
        <div>
          <h4 className="text-sm font-bold">세탁 안내</h4>
          <p className="mt-2 text-sm leading-7 text-content-secondary">
            찬물로 단독 손세탁하고 그늘에서 건조해주세요.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-bold">배송 안내</h4>
          <p className="mt-2 text-sm leading-7 text-content-secondary">
            무료배송 · 출고 후 1–2일
          </p>
        </div>
      </div>
      <BottomActionBar aria-label="하단 구매 바">
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <span className="text-xs text-content-secondary">총 금액</span>
          <strong className="text-base">29,900원</strong>
        </div>
        <Button disabled={added} onClick={() => setAdded(true)}>
          {added ? "담기 완료" : "장바구니 담기"}
        </Button>
        <span role="status" className="sr-only">
          {added ? "상품을 장바구니에 담았어요." : ""}
        </span>
      </BottomActionBar>
    </div>
  );
}
