import { z } from "zod";
import { requestParsed, requestVoid } from "../api-client";

export const inquiryStatusSchema = z.enum(["STARTED", "IN_PROGRESS", "COMPLETED", "CLOSED"]);
export const inquiryCategorySchema = z.enum([
  "ORDER",
  "MEMBER",
  "EVENT",
  "PROMOTION",
  "REPORT",
  "NOTIFICATION",
  "BUG_FEEDBACK",
  "OTHER",
]);

export const inquiryMessageSchema = z.object({
  id: z.number().int().positive(),
  inquiry_id: z.number().int().positive(),
  sender_type: z.enum(["MEMBER", "SELLER", "ADMIN", "SYSTEM"]),
  sender_member_id: z.number().int().positive().optional(),
  body: z.string(),
  created_at: z.string(),
});

const satisfactionResponseSchema = z.object({
  id: z.number().int().positive(),
  inquiry_id: z.number().int().positive(),
  member_id: z.number().int().positive(),
  resolved: z.boolean(),
  score: z.number().int().min(1).max(5),
  comment: z.string(),
  reasons: z.array(z.string()).optional(),
  created_at: z.string(),
});

export const inquirySchema = z.object({
  id: z.number().int().positive(),
  member_id: z.number().int().positive(),
  owner_type: z.enum(["ADMIN", "MARKET"]),
  market_id: z.number().int().positive().optional(),
  order_id: z.number().int().positive().optional(),
  market_order_id: z.number().int().positive().optional(),
  order_line_item_id: z.number().int().positive().optional(),
  category: inquiryCategorySchema,
  subcategory: z.string(),
  title: z.string(),
  status: inquiryStatusSchema,
  completed_at: z.string().optional(),
  closed_at: z.string().optional(),
  satisfaction_due_at: z.string().optional(),
  last_message_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  messages: z.array(inquiryMessageSchema).optional(),
  satisfaction_response: satisfactionResponseSchema.optional(),
});

export const operatorInquirySchema = inquirySchema.extend({
  member_email: z.string().email(),
  order_code: z.string().optional(),
  market_name: z.string().optional(),
});

const inquiryPageSchema = z.object({
  items: z.array(inquirySchema),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});

const operatorInquiryPageSchema = z.object({
  items: z.array(operatorInquirySchema),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});

export type Inquiry = z.infer<typeof inquirySchema>;
export type InquiryMessage = z.infer<typeof inquiryMessageSchema>;
export type InquiryStatus = z.infer<typeof inquiryStatusSchema>;
export type InquiryCategory = z.infer<typeof inquiryCategorySchema>;
export type OperatorInquiry = z.infer<typeof operatorInquirySchema>;

type OperatorFilter = {
  query?: string;
  status?: InquiryStatus;
  category?: InquiryCategory;
  marketID?: number;
  limit?: number;
  offset?: number;
};

function queryString(values: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const encoded = query.toString();
  return encoded ? `?${encoded}` : "";
}

function operatorPath(role: "admin" | "seller", filter?: OperatorFilter) {
  return `/api/v1/${role}/inquiries${queryString({
    q: filter?.query,
    status: filter?.status,
    category: filter?.category,
    market_id: role === "seller" ? filter?.marketID : undefined,
    limit: filter?.limit,
    offset: filter?.offset,
  })}`;
}

export const inquiryApi = {
  createInquiry: (token: string, payload: {
    category: InquiryCategory;
    subcategory: string;
    title: string;
    message: string;
    order_code?: string;
    order_line_item_id?: number;
  }) => requestParsed(inquirySchema, "/api/v1/inquiries", { method: "POST", token, body: JSON.stringify(payload) }),
  listMyInquiries: (token: string, filter?: { status?: InquiryStatus; limit?: number; offset?: number }) =>
    requestParsed(inquiryPageSchema, `/api/v1/me/inquiries${queryString(filter ?? {})}`, { token }),
  getMyInquiry: (token: string, inquiryID: number) =>
    requestParsed(inquirySchema, `/api/v1/me/inquiries/${inquiryID}`, { token }),
  replyToInquiry: (token: string, inquiryID: number, body: string) =>
    requestParsed(inquiryMessageSchema, `/api/v1/me/inquiries/${inquiryID}/messages`, { method: "POST", token, body: JSON.stringify({ body }) }),
  markInquiryRead: (token: string, inquiryID: number, messageID: number) =>
    requestVoid(`/api/v1/me/inquiries/${inquiryID}/read`, { method: "POST", token, body: JSON.stringify({ message_id: messageID }) }),
  closeInquiry: (token: string, inquiryID: number) =>
    requestVoid(`/api/v1/me/inquiries/${inquiryID}/close`, { method: "POST", token }),
  submitInquirySatisfaction: (token: string, inquiryID: number, payload: { resolved: boolean; score: number; reasons?: string[]; comment?: string }) =>
    requestParsed(satisfactionResponseSchema, `/api/v1/me/inquiries/${inquiryID}/satisfaction`, { method: "POST", token, body: JSON.stringify(payload) }),
  listOperatorInquiries: (token: string, role: "admin" | "seller", filter?: OperatorFilter) =>
    requestParsed(operatorInquiryPageSchema, operatorPath(role, filter), { token }),
  getOperatorInquiry: (token: string, role: "admin" | "seller", inquiryID: number, marketID?: number) =>
    requestParsed(operatorInquirySchema, `/api/v1/${role}/inquiries/${inquiryID}${queryString({ market_id: role === "seller" ? marketID : undefined })}`, { token }),
  replyAsOperator: (token: string, role: "admin" | "seller", inquiryID: number, body: string, marketID?: number) =>
    requestParsed(inquiryMessageSchema, `/api/v1/${role}/inquiries/${inquiryID}/messages${queryString({ market_id: role === "seller" ? marketID : undefined })}`, { method: "POST", token, body: JSON.stringify({ body }) }),
  completeInquiry: (token: string, role: "admin" | "seller", inquiryID: number, marketID?: number) =>
    requestVoid(`/api/v1/${role}/inquiries/${inquiryID}/complete${queryString({ market_id: role === "seller" ? marketID : undefined })}`, { method: "POST", token }),
};
