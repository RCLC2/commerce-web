export type TossPaymentSuccessParams = {
  paymentKey: string;
  orderId: string;
  amount: number;
};

type SearchParamReader = {
  get: (name: string) => string | null;
};

export function parseTossSuccessParams(params: SearchParamReader):
  | { ok: true; value: TossPaymentSuccessParams }
  | { ok: false; message: string } {
  const paymentKey = params.get("paymentKey")?.trim() ?? "";
  const orderId = params.get("orderId")?.trim() ?? "";
  const rawAmount = params.get("amount") ?? "";

  if (!paymentKey || paymentKey.length > 200) {
    return { ok: false, message: "결제 키가 없거나 올바르지 않습니다." };
  }
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(orderId)) {
    return { ok: false, message: "결제 주문 ID가 올바르지 않습니다." };
  }
  if (!/^[1-9]\d*$/.test(rawAmount)) {
    return { ok: false, message: "결제 금액이 올바르지 않습니다." };
  }

  const amount = Number(rawAmount);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return { ok: false, message: "결제 금액이 올바르지 않습니다." };
  }
  return { ok: true, value: { paymentKey, orderId, amount } };
}
