import { notFound } from "next/navigation";
import { CustomerInquiryDetailPage } from "@/components/customer-inquiries";

export default async function InquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const inquiryID = Number((await params).id);
  if (!Number.isSafeInteger(inquiryID) || inquiryID <= 0) notFound();
  return <CustomerInquiryDetailPage inquiryID={inquiryID} />;
}
