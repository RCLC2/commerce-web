import { OrderDetailPage } from "@/components/order-detail-page";

export default async function OrderDetail({ params }: { params: Promise<{ orderCode: string }> }) {
  const { orderCode } = await params;

  return <OrderDetailPage orderCode={orderCode} />;
}
