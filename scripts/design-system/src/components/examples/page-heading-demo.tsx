import { ShoppingBag } from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";

export function PageHeadingDemo() {
  return <PageHeading icon={<ShoppingBag />} title="장바구니" description="상품의 옵션과 수량을 확인하고 주문하세요." />;
}
