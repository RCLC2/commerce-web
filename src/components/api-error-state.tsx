import { ApiError, apiErrorMessage } from "@/lib/api-client";
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
    <div role="alert" className={`rounded-md border border-red-200 bg-red-50 p-4 text-sm ${className}`}>
      <p className="font-bold text-brand">{apiErrorMessage(error)}</p>
      {apiError?.code && apiError.code !== "UNKNOWN_ERROR" ? (
        <p className="mt-1 text-xs text-zinc-700">오류 코드 {apiError.code}</p>
      ) : null}
      {apiError?.requestID ? (
        <p className="mt-1 break-all text-xs text-zinc-700">요청 ID {apiError.requestID}</p>
      ) : null}
      {onRetry ? <Button className="mt-3" size="sm" variant="secondary" onClick={onRetry}>{retryLabel}</Button> : null}
    </div>
  );
}
