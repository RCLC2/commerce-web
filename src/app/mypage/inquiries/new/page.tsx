import { CreateInquiryPage } from "@/components/customer-inquiries";

export default async function NewInquiryPage({ searchParams }: { searchParams: Promise<{ orderCode?: string; lineItemID?: string }> }) {
  const { orderCode = "", lineItemID } = await searchParams;
  const parsedLineItemID = Number(lineItemID);
  return <CreateInquiryPage initialOrderCode={orderCode} initialLineItemID={Number.isSafeInteger(parsedLineItemID) && parsedLineItemID > 0 ? parsedLineItemID : undefined} />;
}
