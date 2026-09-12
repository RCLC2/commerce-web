import { SellerProductsPageV2 } from "@/components/seller-home-products-v2";

export default async function SellerProducts({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (process.env.NODE_ENV !== "production" && (await searchParams).prototype === "detail-editor") {
    const { SellerProductDetailPrototype } = await import("@/components/seller-product-detail-prototype");
    return <SellerProductDetailPrototype />;
  }
  return <SellerProductsPageV2 />;
}
