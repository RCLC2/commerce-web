import { z } from "zod";
import { requestParsed } from "./api-client";

const feeSchema = z.number().int().min(0).max(65535);
export const shippingSettingsSchema = z.object({
  market_id: z.number().int().positive(),
  shipping_fee: feeSchema,
  additional_shipping_fee: feeSchema,
  additional_shipping_fee_reason: z.enum(["NONE", "REMOTE_AREA"]),
});
const shippingSettingsRequestSchema = shippingSettingsSchema.extend({ shipping_fee: z.union([z.literal(0), z.literal(3000)]) });
export type ShippingSettings = z.infer<typeof shippingSettingsSchema>;
export type RefundReason = "CHANGE_OF_MIND" | "SELLER_FAULT";
export const refundReceiveAccountSchema = z.object({
 bank: z.string().regex(/^[0-9]{2,3}$/),
 accountNumber: z.string().regex(/^[0-9]{1,20}$/),
 holderName: z.string().trim().min(1).max(60),
});
export type RefundReceiveAccount = z.infer<typeof refundReceiveAccountSchema>;
export const cashReceiptSchema = z.object({
 receipt_key: z.string(), type: z.string(), transaction_type: z.enum(["CONFIRM", "CANCEL"]),
 issue_number: z.string(), receipt_url: z.string(), amount: z.number().int().nonnegative(),
 tax_free_amount: z.number().int().nonnegative(), issue_status: z.enum(["IN_PROGRESS", "COMPLETED", "FAILED"]), requested_at: z.string(),
});
export const refundQuoteSchema = z.object({
  cash_refund_amount: z.number().int().nonnegative(),
  retained_shipping_fee: z.number().int().nonnegative(),
  restored_point: z.number().int().nonnegative(),
  reason: z.enum(["CHANGE_OF_MIND", "SELLER_FAULT"]),
  operation_status: z.enum(["PENDING", "RUNNING", "UNKNOWN", "SUCCEEDED", "FAILED"]).optional(),
  withdrawn: z.boolean().optional(),
  completed: z.boolean().optional(),
 requires_refund_account: z.boolean().optional(),
 bank_refund: z.boolean().optional(),
});
export const shippingPolicyApi = {
  settings: (token: string, marketID: number) => requestParsed(shippingSettingsSchema, `/api/v1/seller/markets/${marketID}/shipping-settings`, { token }),
  update: (token: string, settings: ShippingSettings) => {
    const request = shippingSettingsRequestSchema.parse(settings);
    return requestParsed(shippingSettingsSchema, `/api/v1/seller/markets/${settings.market_id}/shipping-settings`, {
      token, method: "PUT", body: JSON.stringify({ shipping_fee: request.shipping_fee, additional_shipping_fee: request.additional_shipping_fee, additional_shipping_fee_reason: request.additional_shipping_fee_reason }),
    });
  },
  withdrawRefund: (token: string, orderCode: string) => requestParsed(z.object({ withdrawn: z.literal(true) }), `/api/v1/admin/orders/${encodeURIComponent(orderCode)}/refund/withdraw`, { token, method: "POST", body: JSON.stringify({ confirm_no_refund: true }) }),
  refundQuote: (token: string, orderCode: string, reason: RefundReason) => requestParsed(refundQuoteSchema, `/api/v1/admin/orders/${encodeURIComponent(orderCode)}/refund-quote?reason=${reason}`, { token }),
  cashReceipts: (token: string, orderCode: string) => requestParsed(z.object({ cash_receipts: z.array(cashReceiptSchema), bank_refund_status: z.enum(["NONE", "PENDING", "FAILED", "PARTIAL_FAILED", "COMPLETED"]).optional() }), `/api/v1/orders/${encodeURIComponent(orderCode)}/cash-receipts`, { token }),
  refund: (token: string, orderCode: string, reason: RefundReason, account?: RefundReceiveAccount) => requestParsed(refundQuoteSchema, `/api/v1/admin/orders/${encodeURIComponent(orderCode)}/refund`, { token, method: "POST", body: JSON.stringify({ reason, items_received: true, ...(account ? { refund_receive_account: refundReceiveAccountSchema.parse(account) } : {}) }) }),
};
