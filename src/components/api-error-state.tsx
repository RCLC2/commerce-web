import { ApiError, apiErrorMessage } from "@/lib/api-client";
import { Notice } from "./ui/notice";
import { Button } from "./ui/button";

export function ApiErrorState({
  error,
  onRetry,
  retryLabel = "다시 시도",
  className = "",
}: {
  error: unknown;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  const apiError = error instanceof ApiError ? error : undefined;

  return (
    <Notice tone="error" className={className}>
      <p className="font-bold">{apiErrorMessage(error)}</p>
      {apiError?.code && apiError.code !== "UNKNOWN_ERROR" ? (
        <p className="mt-1 text-xs text-content-secondary">오류 코드 {apiError.code}</p>
      ) : null}
      {apiError?.requestID ? (
        <p className="mt-1 break-all text-xs text-content-secondary">요청 ID {apiError.requestID}</p>
      ) : null}
      {onRetry ? <Button className="mt-3" size="sm" variant="secondary" onClick={onRetry}>{retryLabel}</Button> : null}
    </Notice>
  );
}
