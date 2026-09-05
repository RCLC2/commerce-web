"use client";

import { AuditLogExplorer } from "./audit-log-explorer";
import { AdminAuthRequired, adminLinks, useAdminToken } from "./admin-console";
import { ConsoleLayout } from "./console-layout";

export function AdminAuditLogsPage() {
  const token = useAdminToken();

  if (!token) {
    return <AdminAuthRequired />;
  }

  return (
    <ConsoleLayout title="Admin" subtitle="플랫폼 운영 콘솔" links={adminLinks}>
      <AuditLogExplorer scope="admin" token={token} />
    </ConsoleLayout>
  );
}
