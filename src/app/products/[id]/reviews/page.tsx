import { ProductReviewsPage } from "@/components/product-reviews-page";
import { api } from "@/lib/api";

export default async function ProductReviews({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productId = Number(id);
  const initialProduct = Number.isInteger(productId) && productId > 0
    ? await api.getProduct(productId).catch(() => undefined)
    : undefined;

  return <ProductReviewsPage productId={productId} initialProduct={initialProduct} />;
}
