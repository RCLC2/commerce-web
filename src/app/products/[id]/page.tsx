import { ProductDetailExperience } from "@/components/product-detail-experience";
import { api } from "@/lib/api";

export default async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productId = Number(id);
  const initialProduct = await api.getProduct(productId).catch(() => undefined);

  return <ProductDetailExperience productId={productId} initialProduct={initialProduct} />;
}
