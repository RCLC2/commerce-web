import { z } from "zod";
import { requestParsed } from "./api-client";
import {
  refundQuoteSchema,
  refundReceiveAccountSchema,
  type RefundReceiveAccount,
} from "./shipping-policy-api";

const id = z.number().int().positive();
const quantity = z.number().int().nonnegative();
export const returnReasonLabels = {
  CHANGE_OF_MIND: "단순변심",
  WRONG_OPTION: "옵션을 잘못 선택함",
  DUPLICATE_ORDER: "중복 주문",
  ORDERED_BY_MISTAKE: "잘못 주문함",
  SIZE_NOT_FIT: "사이즈가 맞지 않음",
  ITEM_DEFECTIVE: "상품 불량",
  ITEM_DAMAGED: "상품 파손",
  WRONG_ITEM: "다른 상품이 도착함",
  MISSING_PARTS: "구성품 누락",
  NOT_AS_DESCRIBED: "상품 설명과 다름",
  DELIVERY_DELAY: "배송 지연",
  SELLER_OUT_OF_STOCK: "판매자 품절",
} as const;
export const returnReasonSchema = z.enum(
  Object.keys(returnReasonLabels) as [
    keyof typeof returnReasonLabels,
    ...(keyof typeof returnReasonLabels)[],
  ],
);
export type ReturnReason = z.infer<typeof returnReasonSchema>;
export const responsibilitySchema = z.enum(["BUYER", "SELLER"]);
export const returnAddressSchema = z.object({
  recipient_name: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(1).max(20),
  postal_code: z.string().regex(/^[0-9]{5}$/),
  address: z.string().trim().min(1).max(255),
  address_detail: z.string().max(255),
});
export type ReturnAddress = z.infer<typeof returnAddressSchema>;
export const emptyReturnAddress = (): ReturnAddress => ({
  recipient_name: "",
  phone: "",
  postal_code: "",
  address: "",
  address_detail: "",
});
const itemSchema = z.object({
  id,
  refund_id: id,
  order_line_item_id: id,
  quantity: quantity.positive(),
  approved_quantity: quantity,
  reason: returnReasonSchema,
  responsibility: z.enum(["UNDETERMINED", "BUYER", "SELLER"]),
  cash_refund_amount: quantity,
  point_refund_amount: quantity,
});
export const returnRequestSchema = z.object({
  id,
  order_id: id,
  market_id: quantity,
  market_order_id: quantity,
  status: z.enum([
    "REQUESTED",
    "INSPECTED",
    "PROCESSING",
    "COMPLETED",
    "WITHDRAWN",
    "LEGACY",
  ]),
  items: z
    .array(itemSchema)
    .nullable()
    .transform((items) => items ?? []),
  amount: quantity,
  shipping_refund_amount: quantity,
  outbound_shipping_fee_deduction: quantity,
  return_shipping_fee: quantity,
  shipping_fee_waived_amount: quantity,
  point_refund_amount: quantity,
  quoted_at: z.string().nullable(),
  created_at: z.string(),
});
export type ReturnRequest = z.infer<typeof returnRequestSchema>;
const collectionItemSchema = z.object({
  id,
  return_collection_id: id,
  refund_item_id: id,
  quantity: quantity.positive(),
});
export const collectionSchema = z.object({
  id,
  order_id: id,
  market_id: id,
  status: z.enum(["DRAFT", "REQUESTED", "COLLECTED", "RECEIVED"]),
  pickup: returnAddressSchema,
  destination: returnAddressSchema,
  carrier: z.string(),
  tracking_number: z.string(),
  fee_refund_id: id.nullish(),
  collected_at: z.string().nullish(),
  items: z
    .array(collectionItemSchema)
    .nullable()
    .transform((items) => items ?? []),
});
export type ReturnCollection = z.infer<typeof collectionSchema>;
export const inspectionRequestSchema = z
  .object({
    received_quantity: quantity,
    refundable_quantity: quantity,
    restockable_quantity: quantity,
    responsibility: responsibilitySchema,
    result_code: z.enum([
      "NORMAL",
      "DAMAGED",
      "DEFECTIVE",
      "USED",
      "MISSING",
      "WRONG_ITEM",
    ]),
  })
  .refine(
    (value) =>
      value.refundable_quantity <= value.received_quantity &&
      value.restockable_quantity <= value.received_quantity,
    { message: "환불 승인·재판매 가능 수량은 수령 수량을 넘을 수 없습니다." },
  );
export type InspectionRequest = z.infer<typeof inspectionRequestSchema>;
export const inspectionSchema = inspectionRequestSchema.safeExtend({
  id,
  return_collection_item_id: id,
  version: id,
  inspected_by: id,
  inspected_at: z.string(),
});
export type ReturnInspection = z.infer<typeof inspectionSchema>;
export const returnRequestInputSchema = z.object({
  market_id: id,
  items: z
    .array(
      z.object({
        order_line_item_id: id,
        quantity: quantity.positive(),
        reason: returnReasonSchema,
      }),
    )
    .min(1)
    .max(100),
});
export type CreateReturnRequest = z.infer<typeof returnRequestInputSchema>;
export type CollectionInput = {
  market_id: number;
  refund_ids: number[];
  pickup: ReturnAddress;
  destination?: ReturnAddress;
  collection_id?: number;
};
export type CollectionUpdate = {
  status?: ReturnCollection["status"];
  carrier?: string;
  tracking_number?: string;
  pickup?: ReturnAddress;
  destination?: ReturnAddress;
};
const list = <T extends z.ZodType>(schema: T) =>
  z
    .array(schema)
    .nullable()
    .transform((rows) => rows ?? []);
const orderPath = (code: string) =>
  `/api/v1/orders/${encodeURIComponent(code)}`;
const json = (token: string, method: string, body: unknown) => ({
  token,
  method,
  body: JSON.stringify(body),
});
export const returnsApi = {
  requests: (token: string, code: string) =>
    requestParsed(list(returnRequestSchema), `${orderPath(code)}/refunds`, {
      token,
    }),
  create: (token: string, code: string, body: CreateReturnRequest) =>
    requestParsed(
      returnRequestSchema,
      `${orderPath(code)}/refunds`,
      json(token, "POST", returnRequestInputSchema.parse(body)),
    ),
  collections: (token: string, code: string) =>
    requestParsed(
      list(collectionSchema),
      `${orderPath(code)}/return-collections`,
      { token },
    ),
  collect: (token: string, code: string, body: CollectionInput) =>
    requestParsed(
      collectionSchema,
      `${orderPath(code)}/return-collections`,
      json(
        token,
        "POST",
        z
          .object({
            market_id: id,
            refund_ids: z.array(id).min(1),
            pickup: returnAddressSchema,
            destination: returnAddressSchema.optional(),
            collection_id: id.optional(),
          })
          .parse(body),
      ),
    ),
  updateCollection: (
    token: string,
    collectionID: number,
    body: CollectionUpdate,
  ) =>
    requestParsed(
      collectionSchema,
      `/api/v1/return-collections/${collectionID}`,
      json(token, "PATCH", body),
    ),
  inspections: (token: string, collectionID: number) =>
    requestParsed(
      list(inspectionSchema),
      `/api/v1/return-collections/${collectionID}/inspections`,
      { token },
    ),
  inspect: (token: string, itemID: number, body: InspectionRequest) =>
    requestParsed(
      inspectionSchema,
      `/api/v1/return-collection-items/${itemID}/inspections`,
      json(token, "POST", inspectionRequestSchema.parse(body)),
    ),
  restock: (token: string, inspectionID: number, count: number) =>
    requestParsed(
      z.object({ restocked: z.literal(true) }),
      `/api/v1/return-inspections/${inspectionID}/restock`,
      json(token, "POST", { quantity: quantity.positive().parse(count) }),
    ),
  address: (token: string, marketID: number) =>
    requestParsed(
      returnAddressSchema,
      `/api/v1/markets/${marketID}/return-address`,
      { token },
    ),
  saveAddress: (token: string, marketID: number, address: ReturnAddress) =>
    requestParsed(
      z.object({ saved: z.literal(true) }),
      `/api/v1/markets/${marketID}/return-address`,
      json(token, "PUT", returnAddressSchema.parse(address)),
    ),
  quote: (token: string, refundID: number) =>
    requestParsed(refundQuoteSchema, `/api/v1/refunds/${refundID}/quote`, {
      token,
    }),
  execute: (token: string, refundID: number, account?: RefundReceiveAccount) =>
    requestParsed(
      refundQuoteSchema,
      `/api/v1/refunds/${refundID}/execute`,
      json(
        token,
        "POST",
        account
          ? {
              refund_receive_account: refundReceiveAccountSchema.parse(account),
            }
          : {},
      ),
    ),
  withdraw: (token: string, refundID: number) =>
    requestParsed(
      z.object({ withdrawn: z.literal(true) }),
      `/api/v1/refunds/${refundID}/withdraw`,
      json(token, "POST", {}),
    ),
};
export const returnStatusLabels: Record<ReturnRequest["status"], string> = {
  REQUESTED: "반품 접수",
  INSPECTED: "검수 기록 완료",
  PROCESSING: "환불 처리 중",
  COMPLETED: "환불 완료",
  WITHDRAWN: "요청 철회",
  LEGACY: "이전 환불 기록",
};
export const collectionStatusLabels: Record<
  ReturnCollection["status"],
  string
> = {
  DRAFT: "수거 준비",
  REQUESTED: "수거 접수",
  COLLECTED: "수거 완료",
  RECEIVED: "반품 입고",
};
export type ReturnLine = {
  id: number;
  name: string;
  quantity: number;
  price: number;
  status: string;
  purchaseConfirmedAt?: string | null;
};
export type ReturnMarket = { id: number; name: string; items: ReturnLine[] };
export function returnableQuantity(
  line: ReturnLine,
  requests: ReturnRequest[],
) {
  if (
    line.purchaseConfirmedAt ||
    ![
      "SHIPPED",
      "DELIVERED",
      "RETURN_REQUESTED",
      "RETURN_APPROVED",
      "RETURN_REJECTED",
    ].includes(line.status)
  )
    return 0;
  const reserved = requests
    .filter((request) => request.status !== "WITHDRAWN")
    .flatMap((request) =>
      request.items.map((item) => ({ item, status: request.status })),
    )
    .filter(({ item }) => item.order_line_item_id === line.id)
    .reduce(
      (sum, { item, status }) =>
        sum + (status === "COMPLETED" ? item.approved_quantity : item.quantity),
      0,
    );
  return Math.max(0, line.quantity - reserved);
}
