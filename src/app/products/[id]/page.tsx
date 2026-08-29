import { ProductDetailExperience } from "@/components/product-detail-experience";
import { api } from "@/lib/api";
import { getPdpMerchandising } from "@/lib/pdp-merchandising";

export default async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productId = Number(id);
  const [initialProduct, merchandising] = await Promise.all([
    api.getProduct(productId).catch(() => undefined),
    getPdpMerchandising(productId).catch(() => ({ also_viewed: [] })),
  ]);

  return <ProductDetailExperience productId={productId} initialProduct={initialProduct} initialMerchandising={merchandising} />;
}
