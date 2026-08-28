import { z } from "zod";
import { getApiBaseUrl } from "./api-base-url";
import { logClientApiError } from "./client-error-logger";

const API_BASE_URL = getApiBaseUrl();

export type RequestOptions = RequestInit & {
  token?: string | null;
};

export type ApiErrorKind = "network" | "http" | "parse" | "contract" | "application";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly kind: ApiErrorKind,
    readonly status?: number,
    readonly details?: unknown,
    readonly code = "UNKNOWN_ERROR",
    readonly requestID?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ApiHttpError extends ApiError {
  constructor(message: string, status: number, details?: unknown, code?: string, requestID?: string) {
    super(message, "http", status, details, code ?? "HTTP_REQUEST_FAILED", requestID);
    this.name = "ApiHttpError";
  }
}

export class ApiParseError extends ApiError {
  constructor(message: string, details?: unknown) {
    super(message, "parse", undefined, details, "API_RESPONSE_PARSE_FAILED");
    this.name = "ApiParseError";
  }
}

export class ApiContractError extends ApiError {
  constructor(readonly endpoint: string, readonly issues: z.ZodIssue[]) {
    super(
      `서버 응답 계약이 올바르지 않습니다: ${endpoint}`,
      "contract",
      undefined,
      undefined,
      "API_RESPONSE_CONTRACT_INVALID",
    );
    this.name = "ApiContractError";
  }
}

const envelopeSchema = z.strictObject({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.unknown().optional(),
});

const commonErrorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    request_id: z.string().min(1),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});

export async function request(path: string, options: RequestOptions = {}): Promise<unknown> {
  const headers = new Headers(options.headers);
  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    const error = new ApiError(
      "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.",
      "network",
      undefined,
      undefined,
      "API_NETWORK_ERROR",
    );
    logClientApiError(path, error);
    throw error;
  }
  const text = await response.text();
  let payload: unknown;
  try {
    payload = parseResponseText(text, response);
  } catch (error) {
    logClientApiError(path, error as ApiParseError);
    throw error;
  }

  if (!response.ok) {
    if (response.status === 401 && options.token && typeof window !== "undefined") {
      window.localStorage.removeItem("commerce.accessToken");
      window.localStorage.removeItem("commerce.memberID");
      window.localStorage.removeItem("commerce.role");
      window.localStorage.removeItem("commerce.sellerContext");
      window.dispatchEvent(new CustomEvent("commerce:unauthorized"));
    }
    const error = httpError(payload, text, response.status);
    logClientApiError(path, error);
    throw error;
  }

  return unwrapKnownEnvelope(payload, response.status, path);
}

export function parseContract<T>(schema: z.ZodType<T>, payload: unknown, endpoint: string): T {
  const result = schema.safeParse(payload);
  if (!result.success) {
    const error = new ApiContractError(endpoint, result.error.issues);
    logClientApiError(endpoint, error);
    throw error;
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
    const error = new ApiContractError(endpoint, result.error.issues);
    logClientApiError(endpoint, error);
    throw error;
  }

  const failedStatus = result.data.status?.toUpperCase();
  if (
    (result.data.error !== undefined && result.data.error !== null)
    || failedStatus === "FAILED"
    || failedStatus === "FAILURE"
    || failedStatus === "ERROR"
  ) {
    const error = new ApiError(errorMessage(payload, "", 200), "application", 200, payload, "APPLICATION_ERROR");
    logClientApiError(endpoint, error);
    throw error;
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

function unwrapKnownEnvelope(payload: unknown, status: number, endpoint: string): unknown {
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
  const commonError = commonErrorEnvelopeSchema.safeParse(payload);
  if (commonError.success) {
    const error = new ApiError(
      commonError.data.error.message,
      "application",
      status,
      commonError.data.error.details,
      commonError.data.error.code,
      commonError.data.error.request_id,
    );
    logClientApiError(endpoint, error);
    throw error;
  }
  const error = new ApiError(errorMessage(envelope.data.error, "", status), "application", status, envelope.data.error, "APPLICATION_ERROR");
  logClientApiError(endpoint, error);
  throw error;
}

function httpError(payload: unknown, fallback: string, status: number): ApiHttpError {
  const commonError = commonErrorEnvelopeSchema.safeParse(payload);
  if (commonError.success) {
    const error = commonError.data.error;
    return new ApiHttpError(error.message, status, error.details, error.code, error.request_id);
  }
  return new ApiHttpError(errorMessage(payload, fallback, status), status, payload);
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

export function shouldRetryApiError(failureCount: number, error: unknown): boolean {
  return !(error instanceof ApiContractError) && failureCount < 1;
}
