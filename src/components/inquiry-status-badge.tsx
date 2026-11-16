import type { InquiryStatus } from "@/lib/api/inquiries";
import { inquiryStatusMeta } from "@/lib/inquiries";

export function InquiryStatusBadge({ status }: { status: InquiryStatus }) {
  const meta = inquiryStatusMeta[status];
  return <span className={`inline-flex min-h-6 items-center rounded-full px-2.5 py-1 text-xs font-bold ${meta.className}`}>{meta.label}</span>;
}
