type LoggableApiError = {
  status?: number;
  code?: string;
  requestID?: string;
  issues?: unknown;
};

export function logClientApiError(endpoint: string, error: LoggableApiError): void {
  console.error("[commerce-api-error]", {
    endpoint,
    status: error.status,
    code: error.code,
    request_id: error.requestID,
    issues: error.issues,
  });
}
