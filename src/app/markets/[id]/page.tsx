import { MarketPage } from "@/components/market-page";

export default async function Market({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <MarketPage marketId={Number(id)} />;
}
