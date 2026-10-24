import { inspectionSchema, returnRequestSchema } from "@/lib/returns-api";
export const returnedInspection = () =>
  inspectionSchema.parse({
    id: 21,
    return_collection_item_id: 1,
    version: 1,
    received_quantity: 2,
    refundable_quantity: 2,
    restockable_quantity: 2,
    result_code: "NORMAL",
    responsibility: "BUYER",
    inspected_by: 5,
    inspected_at: "2026-10-18T00:00:00Z",
    restocked_quantity: 0,
    restocked_at: null,
  });
export const returnedRequest = () =>
  returnRequestSchema.parse({
    id: 12,
    order_id: 3,
    market_id: 7,
    market_order_id: 8,
    status: "INSPECTED",
    items: [
      {
        id: 10,
        refund_id: 12,
        order_line_item_id: 9,
        quantity: 2,
        approved_quantity: 1,
        reason: "ITEM_DEFECTIVE",
        responsibility: "SELLER",
        cash_refund_amount: 10000,
        point_refund_amount: 0,
      },
    ],
    amount: 10000,
    shipping_refund_amount: 0,
    outbound_shipping_fee_deduction: 0,
    return_shipping_fee: 0,
    shipping_fee_waived_amount: 0,
    point_refund_amount: 0,
    quoted_at: null,
    created_at: "2026-10-18T00:00:00Z",
  });
