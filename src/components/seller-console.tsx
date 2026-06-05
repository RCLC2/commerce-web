"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSessionStore } from "@/lib/session-store";
import { formatPrice } from "@/lib/utils";
import { Button } from "./ui/button";
import { ConsoleLayout, DataTable, MetricGrid, StatusBadge } from "./console-layout";

const sellerLinks = [
  { href: "/seller", label: "홈" },
  { href: "/seller/products", label: "상품" },
  { href: "/seller/inventory", label: "재고 연동" },
  { href: "/seller/orders", label: "주문/배송" },
  { href: "/seller/settlements", label: "정산" },
  { href: "/seller/reviews", label: "리뷰" },
];

function useToken() {
  const token = useSessionStore((state) => state.accessToken);
  return token ?? (process.env.NEXT_PUBLIC_API_MOCKING === "enabled" ? "mock-access-token" : null);
}

function SellerAuthRequired() {
  return (
    <ConsoleLayout title="Seller" links={sellerLinks}>
      <div className="rounded-md border border-line bg-white p-6">
        <h2 className="text-2xl font-black">로그인이 필요합니다</h2>
        <p className="mt-2 text-sm text-muted">셀러 기능은 인증된 사용자만 접근할 수 있습니다.</p>
      </div>
    </ConsoleLayout>
  );
}

export function SellerHomePage() {
  const token = useToken();
  const { data } = useQuery({ queryKey: ["seller-dashboard"], queryFn: () => api.sellerDashboard(token ?? ""), enabled: Boolean(token) });

  if (!token) {
    return <SellerAuthRequired />;
  }

  return (
    <ConsoleLayout title="Seller" links={sellerLinks}>
      <h2 className="text-2xl font-black">셀러 홈</h2>
      <div className="mt-5">{data ? <MetricGrid metrics={data.metrics} /> : null}</div>
      <section className="mt-6 rounded-md border border-line bg-white p-4">
        <h3 className="font-black">처리 필요 작업</h3>
        <div className="mt-3 grid gap-3">
          {data?.tasks.map((task) => (
            <div key={task.id} className="rounded-md bg-zinc-50 p-3">
              <div className="flex justify-between gap-4">
                <p className="font-bold">{task.title}</p>
                <StatusBadge value={task.severity} />
              </div>
              <p className="mt-1 text-sm text-muted">{task.description}</p>
            </div>
          ))}
        </div>
      </section>
    </ConsoleLayout>
  );
}

export function SellerProductsPage() {
  const token = useToken();
  const { data = [] } = useQuery({ queryKey: ["seller-products"], queryFn: () => api.sellerProducts(token ?? ""), enabled: Boolean(token) });

  if (!token) {
    return <SellerAuthRequired />;
  }

  return (
    <ConsoleLayout title="Seller" links={sellerLinks}>
      <h2 className="text-2xl font-black">내 상품 관리</h2>
      <div className="mt-5">
        <DataTable
          columns={["상품", "가격", "재고", "상태"]}
          rows={data.map((product) => [
            <div key="name"><p className="font-bold">{product.name}</p><p className="text-xs text-muted">{product.market_name}</p></div>,
            formatPrice(product.discount_price || product.base_price),
            product.options?.reduce((sum, option) => sum + option.quantity, 0) ?? 0,
            <StatusBadge key="status" value={product.status} />,
          ])}
        />
      </div>
    </ConsoleLayout>
  );
}

export function SellerInventoryPage() {
  const token = useToken();
  const effectiveToken = token ?? "";
  const { data: sources = [] } = useQuery({ queryKey: ["seller-inventory-sources"], queryFn: () => api.sellerInventorySources(effectiveToken), enabled: Boolean(token) });
  const { data: logs = [] } = useQuery({ queryKey: ["seller-inventory-logs"], queryFn: () => api.sellerInventoryLogs(effectiveToken), enabled: Boolean(token) });
  const register = useMutation({ mutationFn: () => api.registerInventorySource(effectiveToken, { provider: "SHOPIFY", display_name: "New Shopify source" }) });

  if (!token) {
    return <SellerAuthRequired />;
  }

  return (
    <ConsoleLayout title="Seller" links={sellerLinks}>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-black">외부몰 재고 연동</h2>
        <Button onClick={() => register.mutate()} disabled={register.isPending}>
          {register.isPending ? "등록 중" : "Shopify 등록"}
        </Button>
      </div>
      {register.data ? (
        <p className="mt-3 rounded-md border border-line bg-white p-3 text-sm font-bold text-brand">
          {register.data.display_name} 연동 소스를 등록했습니다.
        </p>
      ) : null}
      {register.error ? <p className="mt-3 text-sm font-bold text-brand">{register.error.message}</p> : null}
      <div className="mt-5">
        <DataTable
          columns={["연동", "Provider", "상태", "최근 동기화"]}
          rows={sources.map((source) => [
            source.display_name,
            source.provider,
            <StatusBadge key="status" value={source.status} />,
            source.last_synced_at ? new Date(source.last_synced_at).toLocaleString("ko-KR") : "-",
          ])}
        />
      </div>
      <h3 className="mt-8 text-lg font-black">동기화 로그</h3>
      <div className="mt-3">
        <DataTable
          columns={["상품", "옵션", "상태", "메시지"]}
          rows={logs.map((log) => [log.product_id, log.option_id, <StatusBadge key="status" value={log.status} />, log.message])}
        />
      </div>
    </ConsoleLayout>
  );
}

export function SellerOrdersPage() {
  const token = useToken();
  const { data = [] } = useQuery({ queryKey: ["seller-orders"], queryFn: () => api.sellerOrders(token ?? ""), enabled: Boolean(token) });

  if (!token) {
    return <SellerAuthRequired />;
  }

  return (
    <ConsoleLayout title="Seller" links={sellerLinks}>
      <h2 className="text-2xl font-black">주문/배송</h2>
      <div className="mt-5">
        <DataTable columns={["주문번호", "금액", "상태", "마켓 주문"]} rows={data.map((order) => [order.order_code, formatPrice(order.total_order_price), <StatusBadge key="status" value={order.status} />, order.market_orders?.length ?? 0])} />
      </div>
    </ConsoleLayout>
  );
}

export function SellerSettlementsPage() {
  const token = useToken();
  const { data = [] } = useQuery({ queryKey: ["seller-settlements"], queryFn: () => api.sellerSettlements(token ?? ""), enabled: Boolean(token) });

  if (!token) {
    return <SellerAuthRequired />;
  }

  return (
    <ConsoleLayout title="Seller" links={sellerLinks}>
      <h2 className="text-2xl font-black">정산</h2>
      <div className="mt-5">
        <DataTable columns={["월", "매출", "수수료", "지급액", "상태"]} rows={data.map((item) => [item.target_month, formatPrice(item.total_sales_amount), formatPrice(item.commission_amount), formatPrice(item.final_settlement_amount), <StatusBadge key="status" value={item.status} />])} />
      </div>
    </ConsoleLayout>
  );
}

export function SellerReviewsPage() {
  const token = useToken();
  const { data = [] } = useQuery({ queryKey: ["seller-reviews"], queryFn: () => api.sellerReviews(token ?? ""), enabled: Boolean(token) });

  if (!token) {
    return <SellerAuthRequired />;
  }

  return (
    <ConsoleLayout title="Seller" links={sellerLinks}>
      <h2 className="text-2xl font-black">리뷰</h2>
      <div className="mt-5">
        <DataTable columns={["상품", "평점", "내용", "작성일"]} rows={data.map((review) => [review.product_id, review.rating, review.content, new Date(review.created_at).toLocaleDateString("ko-KR")])} />
      </div>
    </ConsoleLayout>
  );
}
