"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiErrorMessage } from "@/lib/api-client";
import { api } from "@/lib/api";
import { clearCheckoutRetryState, readCheckoutRetryState } from "@/lib/queries/checkout";
import { useSessionStore } from "@/lib/session-store";
import { parseTossSuccessParams, type TossPaymentSuccessParams } from "@/lib/toss-payment";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ConfirmationState = "waiting" | "success" | "error";

export function TossSuccessClient() {
  const searchParams = useSearchParams();
  const token = useSessionStore((state) => state.accessToken);
  const hydrate = useSessionStore((state) => state.hydrate);
  const attempted = useRef(false);
  const [sessionHydrated, setSessionHydrated] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const [state, setState] = useState<ConfirmationState>("waiting");
  const [message, setMessage] = useState("결제 결과를 확인하는 중입니다.");
  const [orderId, setOrderId] = useState<string>();
  const [amount, setAmount] = useState<number>();
  const [callbackParams, setCallbackParams] = useState<TossPaymentSuccessParams>();

  useEffect(() => {
    hydrate();
    const hydrationTimer = window.setTimeout(() => setSessionHydrated(true), 0);
    return () => window.clearTimeout(hydrationTimer);
  }, [hydrate]);

  useEffect(() => {
    if (!sessionHydrated) return;
    if (attempted.current) return;

    const confirm = async () => {
      if (!token) {
        setState("error");
        setMessage("결제를 확인하려면 로그인이 필요합니다.");
        return;
      }
      attempted.current = true;
      const parsed = parseTossSuccessParams(searchParams);
      if (!parsed.ok) {
        setState("error");
        setMessage(parsed.message);
        return;
      }
      const { paymentKey, orderId: requestedOrderId, amount: requestedAmount } = parsed.value;
      setCallbackParams(parsed.value);

      const retryState = readCheckoutRetryState(() => window.sessionStorage);
      if (retryState?.orderCode && retryState.orderCode !== requestedOrderId) {
        setState("error");
        setMessage("결제 주문과 현재 결제 세션의 주문이 일치하지 않습니다.");
        return;
      }

      setOrderId(requestedOrderId);
      setAmount(requestedAmount);
      try {
        await api.completePayment(token, requestedOrderId, {
          payment_key: paymentKey,
          order_id: requestedOrderId,
          amount: requestedAmount,
        });

        let latest = await api.getOrder(token, requestedOrderId);
        for (let attempt = 0; attempt < 5 && !["PAID", "PLACED"].includes(latest.status); attempt += 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 400));
          latest = await api.getOrder(token, requestedOrderId);
        }
        if (!["PAID", "PLACED"].includes(latest.status)) {
          throw new Error("결제 승인은 완료됐지만 주문 상태 반영이 지연되고 있습니다.");
        }

        clearCheckoutRetryState(() => window.sessionStorage);
        setState("success");
        setMessage("결제가 완료되었습니다.");
      } catch (error) {
        setState("error");
        setMessage(apiErrorMessage(error));
      }
    };

    void confirm();
  }, [searchParams, sessionHydrated, token, retryNonce]);

  const retryConfirmation = () => {
    attempted.current = false;
    setState("waiting");
    setMessage("같은 결제 승인을 다시 확인하는 중입니다.");
    setRetryNonce((current) => current + 1);
  };

  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-2xl font-black">{state === "success" ? "결제 완료" : "토스 결제 확인"}</h1>
      <p className="mt-4 text-sm text-muted">{message}</p>
      {orderId && amount ? <p className="mt-2 text-sm font-bold">{orderId} · {formatPrice(amount)}</p> : null}
      {state === "waiting" ? <p className="mt-5 text-sm text-muted">잠시만 기다려주세요.</p> : null}
      {state === "success" && orderId ? (
        <Link href={`/orders/${encodeURIComponent(orderId)}`}><Button className="mt-6">주문 상세 보기</Button></Link>
      ) : null}
      {state === "error" ? (
        <div className="mt-6 flex justify-center gap-2">
          {callbackParams ? <Button onClick={retryConfirmation}>같은 결제 다시 확인</Button> : null}
          <Link href="/checkout"><Button>결제 다시 시도</Button></Link>
          {!token ? <Link href="/login"><Button variant="secondary">로그인하기</Button></Link> : null}
          <Link href="/mypage"><Button variant="secondary">주문 내역</Button></Link>
        </div>
      ) : null}
    </main>
  );
}
