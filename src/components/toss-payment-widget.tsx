"use client";

import { ANONYMOUS, loadTossPayments, type TossPaymentsWidgets } from "@tosspayments/tosspayments-sdk";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";

type TossPaymentWidgetProps = {
  clientKey: string;
  orderId: string;
  orderName: string;
  amount: number;
  customerEmail?: string;
  customerName?: string;
};

export function TossPaymentWidget({
  clientKey,
  orderId,
  orderName,
  amount,
  customerEmail,
  customerName,
}: TossPaymentWidgetProps) {
  const [widgets, setWidgets] = useState<TossPaymentsWidgets>();
  const [readyIdentity, setReadyIdentity] = useState<string>();
  const [error, setError] = useState<string>();
  const [requestError, setRequestError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const renderedWidgets: Array<{ destroy: () => Promise<void> }> = [];
    const identity = `${clientKey}:${orderId}:${amount}`;
    const destroyRenderedWidgets = () => {
      const widgetsToDestroy = renderedWidgets.splice(0);
      void Promise.allSettled(widgetsToDestroy.map((widget) => widget.destroy()));
    };

    const render = async () => {
      try {
        const tossPayments = await loadTossPayments(clientKey);
        if (cancelled) return;
        const nextWidgets = tossPayments.widgets({ customerKey: ANONYMOUS });
        await nextWidgets.setAmount({ currency: "KRW", value: amount });
        if (cancelled) return;
        renderedWidgets.push(await nextWidgets.renderPaymentMethods({ selector: "#toss-payment-methods" }));
        if (cancelled) {
          destroyRenderedWidgets();
          return;
        }
        renderedWidgets.push(await nextWidgets.renderAgreement({ selector: "#toss-payment-agreement" }));
        if (cancelled) {
          destroyRenderedWidgets();
          return;
        }
        setWidgets(nextWidgets);
        setReadyIdentity(identity);
        setError(undefined);
      } catch (renderError) {
        if (cancelled) return;
        setError(renderError instanceof Error ? renderError.message : "토스 결제 UI를 준비하지 못했습니다.");
        setReadyIdentity(undefined);
      }
    };

    void render();
    return () => {
      cancelled = true;
      destroyRenderedWidgets();
    };
  }, [amount, clientKey, orderId]);

  const isLoading = readyIdentity !== `${clientKey}:${orderId}:${amount}` || !widgets;
  const isReady = !isLoading && Boolean(widgets);

  const requestPayment = async () => {
    if (!widgets || !isReady || isSubmitting) return;
    setRequestError(undefined);
    setIsSubmitting(true);
    try {
      await widgets.requestPayment({
        orderId,
        orderName,
        customerEmail,
        customerName,
        successUrl: `${window.location.origin}/payments/toss/success`,
        failUrl: `${window.location.origin}/payments/toss/fail`,
      });
    } catch (paymentError) {
      setRequestError(paymentError instanceof Error ? paymentError.message : "결제를 시작하지 못했습니다.");
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mt-4 rounded-md border border-line bg-white p-4" aria-label="토스 테스트 결제">
      <h3 className="font-black">토스 테스트 결제</h3>
      <div id="toss-payment-methods" className="mt-3 min-h-20" />
      <div id="toss-payment-agreement" className="mt-3" />
      {isLoading ? <p className="mt-3 text-sm text-muted">결제수단을 준비하는 중입니다.</p> : null}
      {error ? <p className="mt-3 text-sm font-bold text-brand">{error}</p> : null}
      {requestError ? <p className="mt-3 text-sm font-bold text-brand">{requestError}</p> : null}
      <Button className="mt-4 w-full" size="lg" disabled={!isReady || isSubmitting} onClick={() => void requestPayment()}>
        {isSubmitting ? "결제창을 여는 중" : "테스트 결제하기"}
      </Button>
    </section>
  );
}
