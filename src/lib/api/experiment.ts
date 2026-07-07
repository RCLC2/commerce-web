const DEFAULT_EXPERIMENT_API_BASE_URL = "/experiment-api";

export type ExperimentStatus = "DRAFT" | "SCHEDULED" | "RUNNING" | "PAUSED" | "ENDED";
export type ExperimentSubjectType = "MEMBER" | "ANONYMOUS";
export type ExperimentEventType = "impression" | "click" | "add_to_cart" | "purchase";

export type ExperimentVariant = {
  id?: number;
  key: string;
  name: string;
  traffic_weight: number;
};

export type Experiment = {
  id: number;
  key: string;
  name: string;
  domain: string;
  status: ExperimentStatus;
  include_anonymous: boolean;
  started_at?: string;
  ended_at?: string;
  primary_metric: string;
  description: string;
  variants: ExperimentVariant[];
  created_at: string;
  updated_at: string;
};

export type CreateExperimentPayload = {
  key: string;
  name: string;
  domain: string;
  status: ExperimentStatus;
  include_anonymous: boolean;
  started_at?: string;
  ended_at?: string;
  primary_metric: string;
  description: string;
  variants: ExperimentVariant[];
};

export type AssignmentResolveResponse = {
  assignments: Array<{
    experiment_key: string;
    variant_key: string;
    eligible: boolean;
    reason?: string;
    ttl_seconds?: number;
  }>;
};

export type ExperimentResult = {
  experiment_key: string;
  status: ExperimentStatus;
  primary_metric: string;
  decision: string;
  winner?: {
    variant_key: string;
    reason: string;
  };
  variants: Array<{
    variant_key: string;
    impressions: number;
    clicks: number;
    add_to_carts: number;
    purchases: number;
    revenue: number;
    ctr: number;
    purchase_rate: number;
    revenue_per_user: number;
    traffic_weight: number;
    sample_satisfied: boolean;
  }>;
};

export type ExperimentApiOptions = {
  baseUrl?: string;
  adminToken?: string;
};

function experimentApiBaseUrl(baseUrl?: string) {
  const configured = baseUrl?.trim() || process.env.NEXT_PUBLIC_EXPERIMENT_API_BASE_URL?.trim() || DEFAULT_EXPERIMENT_API_BASE_URL;
  if (configured.startsWith("/") || /^https?:\/\//i.test(configured)) {
    return configured.replace(/\/+$/, "");
  }
  return `http://${configured}`.replace(/\/+$/, "");
}

async function experimentRequest<T>(path: string, options: RequestInit & ExperimentApiOptions = {}): Promise<T> {
  const { baseUrl, adminToken, ...requestOptions } = options;
  const headers = new Headers(requestOptions.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");
  if (adminToken) {
    headers.set("X-Experiment-Admin-Token", adminToken);
  }

  const response = await fetch(`${experimentApiBaseUrl(baseUrl)}${path}`, {
    ...requestOptions,
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Experiment API request failed: ${response.status}`);
  }

  if (response.status === 204 || response.status === 202) {
    return undefined as T;
  }

  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export const experimentApi = {
  listExperiments: (options: ExperimentApiOptions) => experimentRequest<{ experiments: Experiment[] }>("/v1/experiments", options),
  createExperiment: (payload: CreateExperimentPayload, options: ExperimentApiOptions) =>
    experimentRequest<Experiment>("/v1/experiments", {
      ...options,
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getExperiment: (id: number, options: ExperimentApiOptions) => experimentRequest<Experiment>(`/v1/experiments/${id}`, options),
  getResult: (id: number, options: ExperimentApiOptions) => experimentRequest<ExperimentResult>(`/v1/experiments/${id}/results`, options),
  changeStatus: (id: number, action: "start" | "pause" | "resume" | "end", options: ExperimentApiOptions) =>
    experimentRequest<Experiment>(`/v1/experiments/${id}/${action}`, { ...options, method: "POST" }),
  patchStatus: (id: number, status: ExperimentStatus, options: ExperimentApiOptions) =>
    experimentRequest<Experiment>(`/v1/experiments/${id}/status`, {
      ...options,
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  resolveAssignment: (
    payload: { experiment_keys: string[]; subject: { type: ExperimentSubjectType; key: string }; context?: Record<string, unknown> },
    options: ExperimentApiOptions,
  ) =>
    experimentRequest<AssignmentResolveResponse>("/v1/assignments:resolve", {
      ...options,
      method: "POST",
      body: JSON.stringify(payload),
    }),
  recordEvent: (
    payload: {
      event_id: string;
      event_type: ExperimentEventType;
      experiment_key: string;
      variant_key?: string;
      subject: { type: ExperimentSubjectType; key: string };
      occurred_at: string;
      source: { service: string; endpoint: string };
      payload?: Record<string, unknown>;
    },
    options: ExperimentApiOptions,
  ) =>
    experimentRequest<void>("/v1/events", {
      ...options,
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
