"use client";

import { useState } from "react";
import { BottomActionBar } from "@/components/ui/bottom-action-bar";
import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/quantity-stepper";

const unitPrice = 29_900;
const stock = 5;
const formatPrice = (value: number) => `${value.toLocaleString("ko-KR")}원`;

export function PurchaseDemo() {
  const [quantity, setQuantity] = useState(1);
  const [cartCount, setCartCount] = useState(0);
  const [message, setMessage] = useState("");
  const total = unitPrice * quantity;

  return (
    <div
      role="region"
      aria-label="상품 구매 예시"
      tabIndex={0}
      className="relative isolate max-h-[560px] overflow-y-auto rounded-surface border border-border-subtle bg-surface-raised sm:max-h-none"
    >
      <div className="grid sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="relative aspect-video bg-surface-subtle sm:aspect-auto sm:min-h-[420px]">
          <img
            src="assets/linen-shirt-product.png"
            alt="오프화이트 린넨 셔츠"
            loading="eager"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
        <div className="space-y-4 p-5 sm:space-y-6 sm:p-6">
          <div>
            <p className="text-xs text-content-secondary">MELT STANDARD</p>
            <h3 className="mt-2 text-xl font-bold">소프트 린넨 셔츠</h3>
            <p className="mt-2 text-sm text-content-secondary">
              오프화이트 · M
            </p>
          </div>
          <p className="text-xl font-bold">{formatPrice(unitPrice)}</p>
          <div className="space-y-3">
            <p className="text-sm font-medium">수량</p>
            <QuantityStepper
              value={quantity}
              min={1}
              max={stock}
              onValueChange={(value) => {
                setQuantity(value);
                setMessage("");
              }}
            />
            <p className="text-xs text-content-secondary">
              최대 {stock}개까지 주문할 수 있어요.
            </p>
          </div>
          <dl className="space-y-3 border-t border-border-subtle pt-5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-content-secondary">배송비</dt>
              <dd>무료</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-content-secondary">배송 예정</dt>
              <dd>출고 후 1–2일</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-content-secondary">소재</dt>
              <dd>린넨 55%, 면 45%</dd>
            </div>
          </dl>
        </div>
      </div>
      <BottomActionBar className="sm:static" aria-label="상품 구매 영역">
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-content-secondary">총 {quantity}개</p>
            <output aria-label="상품 합계" className="text-lg font-bold">
              {formatPrice(total)}
            </output>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setCartCount((count) => count + quantity);
                setMessage(
                  `상품 ${quantity}개를 담았어요. 장바구니에 총 ${cartCount + quantity}개가 있어요.`,
                );
              }}
            >
              장바구니
            </Button>
            <Button
              onClick={() =>
                setMessage(
                  `상품 ${quantity}개 · ${formatPrice(total)} 주문을 선택했어요.`,
                )
              }
            >
              구매하기
            </Button>
          </div>
          <p
            role="status"
            className={message ? "w-full text-xs text-content-secondary" : "sr-only"}
          >
            {message}
          </p>
        </div>
      </BottomActionBar>
    </div>
  );
}
