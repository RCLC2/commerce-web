import { z } from "zod";
import { getApiBaseUrl } from "./api-base-url";

const API_BASE_URL = getApiBaseUrl();

export type RequestOptions = RequestInit & {
  token?: string | null;
};

export type ApiErrorKind = "http" | "parse" | "contract" | "application";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly kind: ApiErrorKind,
    readonly status?: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ApiHttpError extends ApiError {
  constructor(message: string, status: number, details?: unknown) {
    super(message, "http", status, details);
    this.name = "ApiHttpError";
  }
}

export class ApiParseError extends ApiError {
  constructor(message: string, details?: unknown) {
    super(message, "parse", undefined, details);
    this.name = "ApiParseError";
  }
}

export class ApiContractError extends ApiError {
  constructor(readonly endpoint: string, details?: unknown) {
    super(`서버 응답 계약이 올바르지 않습니다: ${endpoint}`, "contract", undefined, details);
    this.name = "ApiContractError";
  }
}

const envelopeSchema = z.strictObject({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.unknown().optional(),
});

export async function request(path: string, options: RequestOptions = {}): Promise<unknown> {
  const headers = new Headers(options.headers);
  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
  const text = await response.text();
  const payload = parseResponseText(text, response);

  if (!response.ok) {
    throw new ApiHttpError(errorMessage(payload, text, response.status), response.status, payload);
  }

  return unwrapKnownEnvelope(payload, response.status);
}

export function parseContract<T>(schema: z.ZodType<T>, payload: unknown, endpoint: string): T {
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new ApiContractError(endpoint, result.error.flatten());
  }
  return result.data;
}

export async function requestParsed<T>(
  schema: z.ZodType<T>,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  return parseContract(schema, await request(path, options), path);
}

export async function requestVoid(path: string, options: RequestOptions = {}): Promise<void> {
  parseVoid(await request(path, options), path);
}

export function parseVoid(payload: unknown, endpoint: string): void {
  if (payload === undefined || payload === null) {
    return;
  }

  const result = z.looseObject({
    status: z.string().optional(),
    error: z.unknown().optional(),
  }).safeParse(payload);
  if (!result.success) {
    throw new ApiContractError(endpoint, result.error.flatten());
  }

  const failedStatus = result.data.status?.toUpperCase();
  if (
    (result.data.error !== undefined && result.data.error !== null)
    || failedStatus === "FAILED"
    || failedStatus === "FAILURE"
    || failedStatus === "ERROR"
  ) {
    throw new ApiError(errorMessage(payload, "", 200), "application", 200, payload);
  }
}

function parseResponseText(text: string, response: Response): unknown {
  if (!text.trim() || response.status === 204) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    if (!response.ok) {
      return text.trim();
    }
    throw new ApiParseError("서버가 올바른 JSON을 반환하지 않았습니다.", error);
  }
}

function unwrapKnownEnvelope(payload: unknown, status: number): unknown {
  if (
    !payload
    || typeof payload !== "object"
    || (
      !Object.prototype.hasOwnProperty.call(payload, "data")
      && !Object.prototype.hasOwnProperty.call(payload, "error")
    )
  ) {
    return payload;
  }
  const envelope = envelopeSchema.safeParse(payload);
  if (!envelope.success) {
    return payload;
  }
  if (envelope.data.success) {
    return envelope.data.data;
  }
  throw new ApiError(errorMessage(envelope.data.error, "", status), "application", status, envelope.data.error);
}

function errorMessage(payload: unknown, fallback: string, status: number): string {
  if (typeof payload === "string" && payload.trim()) {
    return payload.trim();
  }
  if (payload && typeof payload === "object") {
    const result = z.looseObject({
      message: z.string().optional(),
      error: z.union([z.string(), z.looseObject({ message: z.string().optional() })]).optional(),
    }).safeParse(payload);
    if (result.success) {
      if (result.data.message) return result.data.message;
      if (typeof result.data.error === "string") return result.data.error;
      if (result.data.error?.message) return result.data.error.message;
    }
  }
  return fallback.trim() || `API 요청에 실패했습니다. (${status})`;
}

export function apiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "로그인이 만료되었습니다. 다시 로그인해주세요.";
    if (error.status === 403) return "이 작업을 수행할 권한이 없습니다.";
    if (error.kind === "contract") return "서버 응답을 해석하지 못했습니다. 잠시 후 다시 시도해주세요.";
    return error.message;
  }
  return error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
}
