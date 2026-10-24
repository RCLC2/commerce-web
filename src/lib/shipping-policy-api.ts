import { z } from "zod";
import { requestParsed } from "./api-client";

const feeSchema = z.number().int().min(0).max(65535);
export const shippingSettingsSchema = z.object({
  market_id: z.number().int().positive(),
  shipping_fee: feeSchema,
  return_shipping_fee: feeSchema.optional(),
  additional_shipping_fee: feeSchema,
  additional_shipping_fee_reason: z.enum(["NONE", "REMOTE_AREA"]),
});
const shippingSettingsRequestSchema = shippingSettingsSchema.extend({
  shipping_fee: z.union([z.literal(0), z.literal(3000)]),
});
export type ShippingSettings = z.infer<typeof shippingSettingsSchema>;
export const refundReceiveAccountSchema = z.object({
  bank: z.string().regex(/^[0-9]{2,3}$/),
  accountNumber: z.string().regex(/^[0-9]{1,20}$/),
  holderName: z.string().trim().min(1).max(60),
});
export type RefundReceiveAccount = z.infer<typeof refundReceiveAccountSchema>;
export const cashReceiptSchema = z.object({
  receipt_key: z.string(),
  type: z.string(),
  transaction_type: z.enum(["CONFIRM", "CANCEL"]),
  issue_number: z.string(),
  receipt_url: z.string(),
  amount: z.number().int().nonnegative(),
  tax_free_amount: z.number().int().nonnegative(),
  issue_status: z.enum(["IN_PROGRESS", "COMPLETED", "FAILED"]),
  requested_at: z.string(),
});
export const refundQuoteSchema = z.object({
  cash_refund_amount: z.number().int().nonnegative(),
  retained_shipping_fee: z.number().int().nonnegative(),
  restored_point: z.number().int().nonnegative(),
  reason: z.string(),
  refund_id: z.number().int().positive(),
  shipping_refund_amount: z.number().int().nonnegative(),
  outbound_shipping_fee_deduction: z.number().int().nonnegative(),
  return_shipping_fee: z.number().int().nonnegative(),
  shipping_fee_waived_amount: z.number().int().nonnegative(),
  operation_status: z
    .enum(["PENDING", "RUNNING", "UNKNOWN", "SUCCEEDED", "FAILED"])
    .optional(),
  withdrawn: z.boolean().optional(),
  completed: z.boolean().optional(),
  requires_refund_account: z.boolean().optional(),
  bank_refund: z.boolean().optional(),
});
export const shippingPolicyApi = {
  settings: (token: string, marketID: number) =>
    requestParsed(
      shippingSettingsSchema.nullable(),
      `/api/v1/seller/markets/${marketID}/shipping-settings`,
      { token },
    ),
  update: (token: string, settings: ShippingSettings) => {
    const request = shippingSettingsRequestSchema.parse(settings);
    return requestParsed(
      shippingSettingsSchema,
      `/api/v1/seller/markets/${settings.market_id}/shipping-settings`,
      {
        token,
        method: "PUT",
        body: JSON.stringify({
          shipping_fee: request.shipping_fee,
          return_shipping_fee: request.return_shipping_fee ?? 3000,
          additional_shipping_fee: request.additional_shipping_fee,
          additional_shipping_fee_reason:
            request.additional_shipping_fee_reason,
        }),
      },
    );
  },
  cashReceipts: (token: string, orderCode: string) =>
    requestParsed(
      z.object({
        cash_receipts: z.array(cashReceiptSchema),
        bank_refund_status: z
          .enum(["NONE", "PENDING", "FAILED", "PARTIAL_FAILED", "COMPLETED"])
          .optional(),
      }),
      `/api/v1/orders/${encodeURIComponent(orderCode)}/cash-receipts`,
      { token },
    ),
};
