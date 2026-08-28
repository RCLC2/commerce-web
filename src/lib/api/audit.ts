import { z } from "zod";
import { requestParsed } from "../api-client";
import { withQuery } from "../console-contracts";

export const auditLogSchema = z.object({
  id: z.number().int().positive(),
  transaction_id: z.string(),
  schema_name: z.string(),
  table_name: z.string(),
  row_ordinal: z.number().int().nonnegative(),
  operation: z.enum(["INSERT", "UPDATE", "DELETE"]),
  primary_key: z.unknown().optional(),
  record_key: z.string().optional(),
  before_data: z.unknown().optional(),
  after_data: z.unknown().optional(),
  audit_action_id: z.string().optional(),
  request_id: z.string().optional(),
  actor_member_id: z.number().int().positive().optional(),
  actor_role: z.enum(["ADMIN", "SELLER", "SYSTEM"]).optional(),
  impersonated_market_id: z.number().int().positive().optional(),
  market_id: z.number().int().positive().optional(),
  action: z.string().optional(),
  target_type: z.string().optional(),
  target_id: z.string().optional(),
  attribution_status: z.enum(["ATTRIBUTED", "UNATTRIBUTED", "AMBIGUOUS"]),
  occurred_at: z.string(),
  received_at: z.string(),
});

export const auditLogPageSchema = z.object({
  items: z.array(auditLogSchema),
  page: z.object({
    limit: z.number().int().min(1).max(200),
    next_cursor: z.string().nullable(),
    has_more: z.boolean(),
  }),
});

export type AuditLog = z.infer<typeof auditLogSchema>;
export type AuditLogPage = z.infer<typeof auditLogPageSchema>;

export type AuditLogQuery = {
  q?: string;
  request_id?: string;
  actor_id?: number;
  actor_role?: "ADMIN" | "SELLER" | "SYSTEM";
  action?: string;
  table_name?: string;
  record_id?: string;
  market_id?: number;
  operation?: "INSERT" | "UPDATE" | "DELETE";
  attribution_status?: "ATTRIBUTED" | "UNATTRIBUTED" | "AMBIGUOUS";
  from?: string;
  to?: string;
  cursor?: string;
  limit: number;
};

function listAuditLogs(path: string, token: string, query: AuditLogQuery) {
  return requestParsed(auditLogPageSchema, withQuery(path, query), { token });
}

export const auditApi = {
  adminAuditLogs: (token: string, query: AuditLogQuery) =>
    listAuditLogs("/api/v1/admin/audit-logs", token, query),
  sellerAuditLogs: (token: string, query: AuditLogQuery) =>
    listAuditLogs("/api/v1/seller/audit-logs", token, query),
};
