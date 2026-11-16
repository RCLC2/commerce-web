const DEFAULT_EXPERIMENT_API_BASE_URL = "/experiment-api";

export type ExperimentStatus = "DRAFT" | "SCHEDULED" | "RUNNING" | "PAUSED" | "ENDED";
export type ExperimentSubjectType = "MEMBER" | "ANONYMOUS";
export type ExperimentEventType = "impression" | "click" | "add_to_cart" | "purchase";
export type ExperimentValueType = "BOOLEAN" | "STRING" | "NUMBER" | "JSON";
export type ExperimentConclusion = "UNDECIDED" | "WINNER" | "INCONCLUSIVE";
export type ExperimentVariantRole = "CONTROL" | "TREATMENT";

export type ExperimentTargetingRule = {
  attribute: string;
  operator: "EQ" | "NEQ" | "IN" | "NOT_IN" | "GT" | "GTE" | "LT" | "LTE";
  value: unknown;
};

export type ExperimentOverride = {
  subject_type: ExperimentSubjectType;
  subject_key: string;
  variant_key: string;
};

export type ExperimentVariant = {
  id?: number;
  key: string;
  name: string;
  role: ExperimentVariantRole;
  description: string;
  traffic_weight: number;
  value?: unknown;
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
  value_type: ExperimentValueType;
  default_value: unknown;
  kill_switch: boolean;
  targeting_rules: ExperimentTargetingRule[];
  overrides: ExperimentOverride[];
  conclusion: ExperimentConclusion;
  winner_variant_key?: string;
  decision_reason?: string;
  revision: number;
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
  value_type?: ExperimentValueType;
  default_value?: unknown;
  variants: ExperimentVariant[];
};

export type UpdateExperimentConfigPayload = {
  expected_revision: number;
  value_type: ExperimentValueType;
  default_value: unknown;
  include_anonymous: boolean;
  started_at?: string;
  ended_at?: string;
  variants: ExperimentVariant[];
  targeting_rules: ExperimentTargetingRule[];
  overrides: ExperimentOverride[];
  conclusion: ExperimentConclusion;
  winner_variant_key?: string;
  decision_reason?: string;
  change_reason: string;
};

export type ExperimentConfigSnapshot = Omit<UpdateExperimentConfigPayload, "expected_revision" | "change_reason"> & {
  status?: ExperimentStatus;
  kill_switch: boolean;
};

export type ExperimentRevision = {
  revision: number;
  snapshot: ExperimentConfigSnapshot;
  change_reason: string;
  created_by: string;
  actor_member_id?: number;
  actor_email: string;
  actor_role: string;
  created_at: string;
};

export type AssignmentResolveResponse = {
  assignments: Array<{
    experiment_key: string;
    variant_key: string;
    eligible: boolean;
    value?: unknown;
    revision?: number;
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
  token?: string;
};

function experimentApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_EXPERIMENT_API_BASE_URL?.trim() || DEFAULT_EXPERIMENT_API_BASE_URL;
  if (configured.startsWith("/") || /^https?:\/\//i.test(configured)) {
    return configured.replace(/\/+$/, "");
  }
  return `http://${configured}`.replace(/\/+$/, "");
}

async function experimentRequest<T>(path: string, options: RequestInit & ExperimentApiOptions = {}): Promise<T> {
  const { token, ...requestOptions } = options;
  const headers = new Headers(requestOptions.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${experimentApiBaseUrl()}${path}`, {
    ...requestOptions,
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    let details: { error?: string; current_revision?: number } = {};
    try {
      details = JSON.parse(message) as typeof details;
    } catch {
      details = { error: message };
    }
    throw new ExperimentApiError(details.error || `Experiment API request failed: ${response.status}`, response.status, details.current_revision);
  }

  if (response.status === 204 || response.status === 202) {
    return undefined as T;
  }

  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export class ExperimentApiError extends Error {
  constructor(message: string, readonly status: number, readonly currentRevision?: number) {
    super(message);
    this.name = "ExperimentApiError";
  }
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
  changeStatus: (id: number, action: "start" | "pause" | "resume" | "end", payload: { expected_revision: number; change_reason: string }, options: ExperimentApiOptions) =>
    experimentRequest<Experiment>(`/v1/experiments/${id}/${action}`, { ...options, method: "POST", body: JSON.stringify(payload) }),
  patchStatus: (id: number, status: ExperimentStatus, payload: { expected_revision: number; change_reason: string }, options: ExperimentApiOptions) =>
    experimentRequest<Experiment>(`/v1/experiments/${id}/status`, {
      ...options,
      method: "PATCH",
      body: JSON.stringify({ status, ...payload }),
    }),
  updateConfig: (id: number, payload: UpdateExperimentConfigPayload, options: ExperimentApiOptions) =>
    experimentRequest<Experiment>(`/v1/experiments/${id}/config`, {
      ...options,
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  listRevisions: (id: number, options: ExperimentApiOptions) =>
    experimentRequest<{ revisions: ExperimentRevision[] }>(`/v1/experiments/${id}/revisions`, options),
  rollbackConfig: (
    id: number,
    revision: number,
    payload: { expected_revision: number; change_reason: string },
    options: ExperimentApiOptions,
  ) => experimentRequest<Experiment>(`/v1/experiments/${id}/revisions/${revision}/rollback`, {
    ...options,
    method: "POST",
    body: JSON.stringify(payload),
  }),
  changeKillSwitch: (id: number, payload: { enabled: boolean; expected_revision: number; change_reason: string }, options: ExperimentApiOptions) =>
    experimentRequest<Experiment>(`/v1/experiments/${id}/kill-switch`, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  simulate: (
    id: number,
    payload: { subject: { type: ExperimentSubjectType; key: string }; context?: Record<string, unknown> },
    options: ExperimentApiOptions,
  ) => experimentRequest<AssignmentResolveResponse["assignments"][number]>(`/v1/experiments/${id}/simulate`, {
    ...options,
    method: "POST",
    body: JSON.stringify(payload),
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
