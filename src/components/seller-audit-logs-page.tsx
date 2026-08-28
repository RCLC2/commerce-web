"use client";

import { AuditLogExplorer } from "./audit-log-explorer";
import {
  SellerAuthRequiredV2,
  SellerConsoleLayoutV2,
  useSellerConsoleContext,
} from "./seller-shell";

export function SellerAuditLogsPage() {
  const { token, marketName } = useSellerConsoleContext();

  if (!token) {
    return <SellerAuthRequiredV2 />;
  }

  return (
    <SellerConsoleLayoutV2 marketName={marketName}>
      <AuditLogExplorer scope="seller" token={token} />
    </SellerConsoleLayoutV2>
  );
}
