import { getApiBaseUrl } from "./api-base-url";

const API_BASE_URL = getApiBaseUrl();

export type RequestOptions = RequestInit & {
  token?: string | null;
};

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(apiErrorMessage(text) || `API request failed: ${response.status}`);
  }

  if (response.status === 204 || !text) {
    return undefined as T;
  }

  return unwrapApiResponse(JSON.parse(text)) as T;
}

function unwrapApiResponse(value: unknown) {
  if (!isRecord(value) || typeof value.success !== "boolean") {
    return value;
  }
  if (!value.success) {
    const error = isRecord(value.error) ? value.error : {};
    throw new Error(String(error.message ?? error.detail ?? "API request failed"));
  }
  return value.data;
}

function apiErrorMessage(text: string) {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (isRecord(parsed) && isRecord(parsed.error)) {
      return String(parsed.error.message ?? parsed.error.detail ?? text);
    }
  } catch {
    return text;
  }
  return text;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
