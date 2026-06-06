"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Boxes, CircleDollarSign, RefreshCw, Star, Store, Truck } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { getEffectiveToken } from "@/lib/auth-token";
import { firstOrderItem, orderStatusLabel } from "@/lib/order-utils";
import { useSessionStore } from "@/lib/session-store";
import type { OrderResponse, Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import {
  ConsoleHeader,
  ConsoleLayout,
  ConsoleSection,
  DataTable,
  FilterField,
  FilterPanel,
  MetricGrid,
  SearchBox,
  StatusBadge,
  SummaryStrip,
} from "./console-layout";
import { SafeImage } from "./safe-image";
import { Button } from "./ui/button";

const sellerLinks = [
  { href: "/seller", label: "홈" },
  { href: "/seller/products", label: "상품" },
  { href: "/seller/inventory", label: "재고 연동" },
  { href: "/seller/orders", label: "주문/배송" },
  { href: "/seller/settlements", label: "정산" },
  { href: "/seller/reviews", label: "리뷰" },
];

function useSellerToken() {
  const token = useSessionStore((state) => state.accessToken);
  const role = useSessionStore((state) => state.role);
  const sellerContext = useSessionStore((state) => state.sellerContext);
  if (sellerContext) {
    return sellerContext.token;
  }
  if (role !== "SELLER") {
    return null;
  }
  return getEffectiveToken(token);
}

function useSellerContextName() {
  return useSessionStore((state) => state.sellerContext?.marketName);
}

function SellerAuthRequired() {
  return (
    <ConsoleLayout title="Seller" subtitle="마켓 운영 콘솔" links={sellerLinks}>
      <ConsoleSection>
        <h2 className="text-2xl font-black">셀러 권한이 필요합니다</h2>
        <p className="mt-2 text-sm text-muted">셀러 계정으로 로그인한 사용자만 마켓 운영 콘솔에 접근할 수 있습니다.</p>
      </ConsoleSection>
    </ConsoleLayout>
  );
}

function SellerConsoleLayout({ sellerName, children }: { sellerName?: string; children: React.ReactNode }) {
  return (
    <ConsoleLayout
      title="Seller"
      subtitle="마켓 운영 콘솔"
      links={sellerLinks}
      sidebarHeader={<SellerIdentity marketName={sellerName ?? "내 마켓"} />}
    >
      {children}
    </ConsoleLayout>
  );
}

function productStock(product: Product) {
  return product.options?.reduce((sum, option) => sum + option.quantity, 0) ?? 0;
}

function orderPayableAmount(order: OrderResponse) {
  return order.total_order_price - order.total_discount_price - order.used_point;
}

export function SellerHomePage() {
  const token = useSellerToken();
  const { data: dashboard } = useQuery({ queryKey: ["seller-dashboard"], queryFn: () => api.sellerDashboard(token ?? ""), enabled: Boolean(token) });
  const { data: products = [] } = useQuery({ queryKey: ["seller-products"], queryFn: () => api.sellerProducts(token ?? ""), enabled: Boolean(token) });
  const { data: orders = [] } = useQuery({ queryKey: ["seller-orders"], queryFn: () => api.sellerOrders(token ?? ""), enabled: Boolean(token) });
  const { data: sources = [] } = useQuery({ queryKey: ["seller-inventory-sources"], queryFn: () => api.sellerInventorySources(token ?? ""), enabled: Boolean(token) });
  const { data: settlements = [] } = useQuery({ queryKey: ["seller-settlements"], queryFn: () => api.sellerSettlements(token ?? ""), enabled: Boolean(token) });
  const sellerName = useSellerContextName() ?? products[0]?.market_name ?? "셀러 마켓";
  const marketID = products[0]?.market_id;
  const { data: market } = useQuery({ queryKey: ["seller-market", marketID], queryFn: () => api.getMarket(marketID ?? 0), enabled: Boolean(token && marketID) });

  if (!token) {
    return <SellerAuthRequired />;
  }

  const lowStockProducts = products.filter((product) => productStock(product) <= 10).slice(0, 5);
  const readyOrders = orders.filter((order) => order.market_orders?.some((marketOrder) => marketOrder.status === "READY_TO_SHIP"));
  const failedSources = sources.filter((source) => source.status === "FAILED");

  return (
      <SellerConsoleLayout sellerName={sellerName}>
      <ConsoleHeader title="셀러 홈" description="오늘 처리해야 할 주문, 재고, 정산 이슈를 한 화면에서 확인합니다." />
      <div className="mt-5">{dashboard ? <MetricGrid metrics={dashboard.metrics} /> : null}</div>
      <ConsoleSection className="mt-5" title="마켓 상세 정보" description="고객에게 노출되는 마켓 기본 정보와 운영 지표입니다.">
        <div className="grid gap-4 md:grid-cols-[180px_1fr]">
          <div className="relative aspect-square overflow-hidden rounded-md bg-zinc-100">
            <SafeImage src={market?.profile_image_url} alt="" fill sizes="180px" className="object-cover" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-black">{market?.name ?? sellerName}</h3>
              <StatusBadge value={market?.status ?? "ACTIVE"} />
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">{market?.description ?? "마켓 정보를 불러오는 중입니다."}</p>
            <div className="mt-4">
              <SummaryStrip
                items={[
                  { label: "팔로워", value: `${(market?.follower_count ?? 0).toLocaleString("ko-KR")}명` },
                  { label: "운영 상품", value: `${products.length}개` },
                  { label: "총 재고", value: `${products.reduce((sum, product) => sum + productStock(product), 0).toLocaleString("ko-KR")}개` },
                  { label: "정산 상태", value: settlements[0]?.status ? <StatusBadge value={settlements[0].status} /> : "-" },
                ]}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {(market?.tags ?? []).map((tag) => (
                <span key={tag} className="rounded-sm bg-zinc-100 px-2 py-1 text-xs font-black text-zinc-600">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </ConsoleSection>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <ConsoleSection title="처리 필요 작업" description="긴급도가 높은 작업부터 상단에 표시됩니다.">
          <div className="grid gap-3">
            {dashboard?.tasks.map((task) => (
              <div key={task.id} className="rounded-md bg-zinc-50 p-3">
                <div className="flex justify-between gap-4">
                  <p className="font-bold">{task.title}</p>
                  <StatusBadge value={task.severity} />
                </div>
                <p className="mt-1 text-sm text-muted">{task.description}</p>
              </div>
            ))}
          </div>
        </ConsoleSection>
        <ConsoleSection title="운영 상태">
          <div className="grid gap-3">
            <OperationRow icon={<Truck size={18} />} label="출고 대기 주문" value={`${readyOrders.length}건`} tone="text-amber-700" />
            <OperationRow icon={<Boxes size={18} />} label="품절 임박 상품" value={`${lowStockProducts.length}개`} tone="text-red-700" />
            <OperationRow icon={<RefreshCw size={18} />} label="연동 실패 소스" value={`${failedSources.length}개`} tone="text-red-700" />
            <OperationRow icon={<CircleDollarSign size={18} />} label="다음 정산" value={settlements[0]?.target_month ?? "-"} tone="text-emerald-700" />
          </div>
        </ConsoleSection>
      </div>

      <div className="mt-5 grid gap-4">
        <ConsoleSection title="품절 임박 옵션" description="재고 10개 이하 상품을 우선 보충하세요.">
          <DataTable
            columns={["상품", "가격", "재고", "상태"]}
            rows={lowStockProducts.map((product) => [
              <ProductName key="product" product={product} />,
              formatPrice(product.discount_price || product.base_price),
              `${productStock(product)}개`,
              <StatusBadge key="status" value={product.status} />,
            ])}
          />
        </ConsoleSection>
        <ConsoleSection title="최근 주문 처리">
          <DataTable
            columns={["주문", "상품", "금액", "상태"]}
            rows={orders.slice(0, 5).map((order) => [
              <span key="code" className="text-xs font-black">{order.order_code}</span>,
              firstOrderItem(order)?.product?.name ?? "주문 상품",
              formatPrice(orderPayableAmount(order)),
              <StatusBadge key="status" value={order.status} />,
            ])}
          />
        </ConsoleSection>
      </div>
    </SellerConsoleLayout>
  );
}

export function SellerProductsPage() {
  const token = useSellerToken();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [shipping, setShipping] = useState("ALL");
  const [managedProducts, setManagedProducts] = useState<Record<number, { status: string; price: number; stock: number }>>({});
  const { data = [] } = useQuery({ queryKey: ["seller-products"], queryFn: () => api.sellerProducts(token ?? ""), enabled: Boolean(token) });
  const sellerName = useSellerContextName() ?? data[0]?.market_name ?? "셀러 마켓";

  if (!token) {
    return <SellerAuthRequired />;
  }

  const filteredProducts = data.filter((product) => {
    const managed = managedProducts[product.id];
    const currentStatus = managed?.status ?? product.status;
    const matchesQuery = !query || product.name.toLowerCase().includes(query.toLowerCase()) || product.market_name?.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "ALL" || currentStatus === status;
    const matchesShipping = shipping === "ALL" || product.shipping_type === shipping;
    return matchesQuery && matchesStatus && matchesShipping;
  });
  const totalStock = data.reduce((sum, product) => sum + productStock(product), 0);

  return (
    <SellerConsoleLayout sellerName={sellerName}>
      <ConsoleHeader title="내 상품 관리" description="상품 판매 상태, 가격, 옵션 재고를 빠르게 점검합니다." />
      <div className="mt-5">
        <SummaryStrip
          items={[
            { label: "전체 상품", value: `${data.length}개` },
            { label: "판매중", value: `${data.filter((product) => product.status === "SELLING").length}개` },
            { label: "품절", value: `${data.filter((product) => product.status === "SOLD_OUT").length}개` },
            { label: "총 재고", value: `${totalStock.toLocaleString("ko-KR")}개` },
          ]}
        />
      </div>
      <ConsoleSection
        className="mt-5"
        title="상품 목록"
      >
        <FilterPanel>
          <FilterField label="검색">
            <SearchBox value={query} onChange={setQuery} placeholder="상품명 또는 마켓 검색" />
          </FilterField>
          <FilterField label="판매 상태">
            <select className="h-10 rounded-md border border-line bg-white px-3 text-sm font-bold" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="ALL">전체 상태</option>
              <option value="SELLING">판매중</option>
              <option value="SOLD_OUT">품절</option>
            </select>
          </FilterField>
          <FilterField label="배송">
            <select className="h-10 rounded-md border border-line bg-white px-3 text-sm font-bold" value={shipping} onChange={(event) => setShipping(event.target.value)}>
              <option value="ALL">전체 배송</option>
              <option value="FREE">무료배송</option>
              <option value="NORMAL">일반배송</option>
            </select>
          </FilterField>
        </FilterPanel>
        <div className="mt-4" />
        <DataTable
          columns={["상품", "판매가", "재고", "배송", "상태", "관리"]}
          rows={filteredProducts.map((product) => {
            const managed = managedProducts[product.id];
            const currentPrice = managed?.price ?? (product.discount_price || product.base_price);
            const currentStock = managed?.stock ?? productStock(product);
            const currentStatus = managed?.status ?? product.status;
            return [
              <ProductName key="product" product={product} />,
              <input
                key="price"
                type="number"
                className="h-9 w-full rounded-md border border-line px-2 text-sm outline-none focus:border-foreground"
                value={currentPrice}
                onChange={(event) =>
                  setManagedProducts((current) => ({
                    ...current,
                    [product.id]: { status: currentStatus, stock: currentStock, price: Number(event.target.value) },
                  }))
                }
                aria-label={`${product.name} 판매가`}
              />,
              <input
                key="stock"
                type="number"
                className="h-9 w-full rounded-md border border-line px-2 text-sm outline-none focus:border-foreground"
                value={currentStock}
                onChange={(event) =>
                  setManagedProducts((current) => ({
                    ...current,
                    [product.id]: { status: currentStatus, price: currentPrice, stock: Number(event.target.value) },
                  }))
                }
                aria-label={`${product.name} 재고`}
              />,
              product.shipping_type === "FREE" ? "무료배송" : "일반배송",
              <select
                key="status"
                className="h-9 w-full rounded-md border border-line bg-white px-2 text-sm font-bold"
                value={currentStatus}
                onChange={(event) =>
                  setManagedProducts((current) => ({
                    ...current,
                    [product.id]: { price: currentPrice, stock: currentStock, status: event.target.value },
                  }))
                }
                aria-label={`${product.name} 상태`}
              >
                <option value="SELLING">판매중</option>
                <option value="SOLD_OUT">품절</option>
              </select>,
              <Button key="save" size="sm" disabled={!managedProducts[product.id]}>
                변경 저장
              </Button>,
            ];
          })}
        />
      </ConsoleSection>
    </SellerConsoleLayout>
  );
}

export function SellerInventoryPage() {
  const token = useSellerToken();
  const effectiveToken = token ?? "";
  const [sourceStatus, setSourceStatus] = useState("ALL");
  const [logStatus, setLogStatus] = useState("ALL");
  const { data: sources = [] } = useQuery({ queryKey: ["seller-inventory-sources"], queryFn: () => api.sellerInventorySources(effectiveToken), enabled: Boolean(token) });
  const { data: logs = [] } = useQuery({ queryKey: ["seller-inventory-logs"], queryFn: () => api.sellerInventoryLogs(effectiveToken), enabled: Boolean(token) });
  const register = useMutation({ mutationFn: () => api.registerInventorySource(effectiveToken, { provider: "SHOPIFY", display_name: "New Shopify source" }) });
  const sellerName = useSellerContextName() ?? sources[0]?.display_name.replace(/ Shopify| Cafe24/g, "") ?? "셀러 마켓";

  if (!token) {
    return <SellerAuthRequired />;
  }

  const filteredSources = sourceStatus === "ALL" ? sources : sources.filter((source) => source.status === sourceStatus);
  const filteredLogs = logStatus === "ALL" ? logs : logs.filter((log) => log.status === logStatus);

  return (
    <SellerConsoleLayout sellerName={sellerName}>
      <ConsoleHeader
        title="외부몰 재고 연동"
        description="Shopify/Cafe24 재고 연동 상태와 동기화 실패 로그를 관리합니다."
        action={<Button onClick={() => register.mutate()} disabled={register.isPending}>{register.isPending ? "등록 중" : "Shopify 등록"}</Button>}
      />
      {register.data ? <p className="mt-3 rounded-md border border-line bg-white p-3 text-sm font-bold text-brand">{register.data.display_name} 연동 소스를 등록했습니다.</p> : null}
      {register.error ? <p className="mt-3 text-sm font-bold text-brand">{register.error.message}</p> : null}

      <ConsoleSection
        className="mt-5"
        title="연동 소스"
        action={<StatusFilter value={sourceStatus} onChange={setSourceStatus} options={["ALL", "ACTIVE", "FAILED", "PAUSED"]} />}
      >
        <div className="grid gap-3 md:grid-cols-2">
          {filteredSources.map((source) => (
            <div key={source.id} className="rounded-md border border-line bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black">{source.display_name}</p>
                  <p className="mt-1 text-xs font-bold text-muted">{source.provider}</p>
                </div>
                <StatusBadge value={source.status} />
              </div>
              <p className="mt-4 text-sm text-muted">최근 동기화 {source.last_synced_at ? new Date(source.last_synced_at).toLocaleString("ko-KR") : "-"}</p>
            </div>
          ))}
        </div>
      </ConsoleSection>
      <ConsoleSection className="mt-5" title="동기화 로그" description="실패 로그는 토큰 갱신 또는 옵션 매핑을 먼저 확인하세요." action={<StatusFilter value={logStatus} onChange={setLogStatus} options={["ALL", "SUCCESS", "FAILED"]} />}>
        <DataTable
          columns={["상품", "옵션", "상태", "메시지", "일시"]}
          rows={filteredLogs.map((log) => [
            `#${log.product_id}`,
            `#${log.option_id}`,
            <StatusBadge key="status" value={log.status} />,
            log.message,
            new Date(log.created_at).toLocaleString("ko-KR"),
          ])}
        />
      </ConsoleSection>
    </SellerConsoleLayout>
  );
}

export function SellerOrdersPage() {
  const token = useSellerToken();
  const [status, setStatus] = useState("ALL");
  const [query, setQuery] = useState("");
  const [invoiceMap, setInvoiceMap] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { data = [] } = useQuery({ queryKey: ["seller-orders"], queryFn: () => api.sellerOrders(token ?? ""), enabled: Boolean(token) });
  const sellerName = useSellerContextName() ?? "셀러 마켓";

  if (!token) {
    return <SellerAuthRequired />;
  }

  const filteredOrders = data.filter((order) => {
    const matchesStatus = status === "ALL" || order.status === status || order.market_orders?.some((marketOrder) => marketOrder.status === status);
    const matchesQuery =
      !query ||
      order.order_code.toLowerCase().includes(query.toLowerCase()) ||
      firstOrderItem(order)?.product?.name.toLowerCase().includes(query.toLowerCase()) ||
      order.shipping_address?.receiver.toLowerCase().includes(query.toLowerCase());
    return matchesStatus && matchesQuery;
  });

  function downloadInvoiceTemplate() {
    const csv = createInvoiceTemplateCsv(filteredOrders);
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `invoice-template-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function uploadInvoiceFile(file: File) {
    const text = await file.text();
    setInvoiceMap((current) => ({ ...current, ...parseInvoiceCsv(text) }));
  }

  return (
    <SellerConsoleLayout sellerName={sellerName}>
      <ConsoleHeader title="주문/배송" description="결제 완료/출고 대기 주문에 송장 번호를 입력하고 배송 처리합니다." />
      <div className="mt-5">
        <SummaryStrip
          items={[
            { label: "전체 주문", value: `${data.length}건` },
            { label: "출고 대기", value: `${data.filter((order) => order.market_orders?.some((marketOrder) => marketOrder.status === "READY_TO_SHIP")).length}건` },
            { label: "배송중", value: `${data.filter((order) => order.status === "SHIPPING").length}건` },
            { label: "주문 금액", value: formatPrice(data.reduce((sum, order) => sum + orderPayableAmount(order), 0)) },
          ]}
        />
      </div>
      <ConsoleSection
        className="mt-5"
        title="송장 처리"
        description="양식은 Excel에서 열 수 있는 CSV입니다. 송장번호 열만 채워 업로드하면 주문별 송장 번호가 반영됩니다."
        action={
          <div className="flex flex-col gap-2 md:flex-row">
            <Button variant="secondary" onClick={downloadInvoiceTemplate}>양식 다운로드</Button>
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>송장 업로드</Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void uploadInvoiceFile(file);
                }
                event.currentTarget.value = "";
              }}
            />
          </div>
        }
      >
        <SummaryStrip
          items={[
            { label: "업로드/입력 송장", value: `${Object.values(invoiceMap).filter(Boolean).length}건` },
            { label: "양식 대상 주문", value: `${filteredOrders.length}건` },
            { label: "발송 가능", value: `${filteredOrders.filter((order) => invoiceMap[order.order_code]).length}건` },
            { label: "미입력", value: `${filteredOrders.filter((order) => !invoiceMap[order.order_code]).length}건` },
          ]}
        />
      </ConsoleSection>
      <ConsoleSection
        className="mt-5"
        title="주문 목록"
        action={
          <div className="flex flex-col gap-2 md:flex-row">
            <SearchBox value={query} onChange={setQuery} placeholder="주문번호, 상품, 수령인 검색" />
            <StatusFilter value={status} onChange={setStatus} options={["ALL", "PLACED", "READY_TO_SHIP", "SHIPPING", "DELIVERED"]} />
          </div>
        }
      >
        <DataTable
          columns={["주문", "대표 상품", "배송지", "결제 금액", "송장 번호", "상태", "처리"]}
          rows={filteredOrders.map((order) => {
            const item = firstOrderItem(order);
            return [
              <span key="code" className="text-xs font-black">{order.order_code}</span>,
              <OrderProduct key="product" order={order} />,
              order.shipping_address ? `${order.shipping_address.receiver} · ${order.shipping_address.line1}` : "-",
              formatPrice(orderPayableAmount(order)),
              <input
                key="invoice"
                value={invoiceMap[order.order_code] ?? ""}
                onChange={(event) => setInvoiceMap((current) => ({ ...current, [order.order_code]: event.target.value }))}
                className="h-9 w-full rounded-md border border-line px-2 text-sm outline-none focus:border-foreground"
                placeholder="송장 번호"
                aria-label={`${order.order_code} 송장 번호`}
              />,
              <StatusBadge key="status" value={item?.status === "ORDERED" ? order.status : item?.status ?? order.status} />,
              <Button key="ship" size="sm" disabled={!invoiceMap[order.order_code]}>
                발송 처리
              </Button>,
            ];
          })}
        />
      </ConsoleSection>
    </SellerConsoleLayout>
  );
}

export function SellerSettlementsPage() {
  const token = useSellerToken();
  const [status, setStatus] = useState("ALL");
  const { data = [] } = useQuery({ queryKey: ["seller-settlements"], queryFn: () => api.sellerSettlements(token ?? ""), enabled: Boolean(token) });
  const sellerName = useSellerContextName() ?? data[0]?.market_name ?? "셀러 마켓";

  if (!token) {
    return <SellerAuthRequired />;
  }

  const filteredSettlements = status === "ALL" ? data : data.filter((item) => item.status === status);

  return (
    <SellerConsoleLayout sellerName={sellerName}>
      <ConsoleHeader title="정산" description="월별 매출, 수수료, 지급 예정 금액을 확인합니다." />
      <div className="mt-5">
        <SummaryStrip
          items={[
            { label: "정산 건수", value: `${data.length}건` },
            { label: "총 매출", value: formatPrice(data.reduce((sum, item) => sum + item.total_sales_amount, 0)) },
            { label: "수수료", value: formatPrice(data.reduce((sum, item) => sum + item.commission_amount, 0)) },
            { label: "지급 예정", value: formatPrice(data.reduce((sum, item) => sum + item.final_settlement_amount, 0)) },
          ]}
        />
      </div>
      <ConsoleSection className="mt-5" title="정산 내역" action={<StatusFilter value={status} onChange={setStatus} options={["ALL", "PREPARED", "PAID", "EXCLUDED"]} />}>
        <DataTable
          columns={["월", "매출", "수수료", "지급액", "상태"]}
          rows={filteredSettlements.map((item) => [
            item.target_month,
            formatPrice(item.total_sales_amount),
            formatPrice(item.commission_amount),
            formatPrice(item.final_settlement_amount),
            <StatusBadge key="status" value={item.status} />,
          ])}
        />
      </ConsoleSection>
    </SellerConsoleLayout>
  );
}

export function SellerReviewsPage() {
  const token = useSellerToken();
  const [query, setQuery] = useState("");
  const [rating, setRating] = useState("ALL");
  const { data = [] } = useQuery({ queryKey: ["seller-reviews"], queryFn: () => api.sellerReviews(token ?? ""), enabled: Boolean(token) });
  const averageRating = useMemo(() => (data.length ? data.reduce((sum, review) => sum + review.rating, 0) / data.length : 0), [data]);
  const sellerName = useSellerContextName() ?? "셀러 마켓";

  if (!token) {
    return <SellerAuthRequired />;
  }

  const filteredReviews = data.filter((review) => {
    const matchesQuery = !query || review.content.toLowerCase().includes(query.toLowerCase()) || String(review.product_id).includes(query);
    const matchesRating = rating === "ALL" || review.rating === Number(rating);
    return matchesQuery && matchesRating;
  });

  return (
    <SellerConsoleLayout sellerName={sellerName}>
      <ConsoleHeader title="리뷰" description="리뷰 평점과 내용을 확인하고 상품 개선 포인트를 찾습니다." />
      <div className="mt-5">
        <SummaryStrip
          items={[
            { label: "리뷰 수", value: `${data.length}개` },
            { label: "평균 평점", value: averageRating ? averageRating.toFixed(1) : "-" },
            { label: "5점 리뷰", value: `${data.filter((review) => review.rating === 5).length}개` },
            { label: "최근 리뷰", value: data[0] ? new Date(data[0].created_at).toLocaleDateString("ko-KR") : "-" },
          ]}
        />
      </div>
      <ConsoleSection
        className="mt-5"
        title="리뷰 목록"
        action={
          <div className="flex flex-col gap-2 md:flex-row">
            <SearchBox value={query} onChange={setQuery} placeholder="리뷰 내용 또는 상품 ID 검색" />
            <select className="h-10 rounded-md border border-line bg-white px-3 text-sm font-bold" value={rating} onChange={(event) => setRating(event.target.value)}>
              <option value="ALL">전체 평점</option>
              <option value="5">5점</option>
              <option value="4">4점</option>
              <option value="3">3점</option>
              <option value="2">2점</option>
              <option value="1">1점</option>
            </select>
          </div>
        }
      >
        <DataTable
          columns={["상품", "평점", "내용", "작성일"]}
          rows={filteredReviews.map((review) => [
            `#${review.product_id}`,
            <span key="rating" className="inline-flex items-center gap-1 font-black text-brand"><Star size={14} className="fill-brand" /> {review.rating}</span>,
            <span key="content" className="line-clamp-2">{review.content}</span>,
            new Date(review.created_at).toLocaleDateString("ko-KR"),
          ])}
        />
      </ConsoleSection>
    </SellerConsoleLayout>
  );
}

function SellerIdentity({ marketName }: { marketName: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-zinc-50 p-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-brand">
        <Store size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-black text-muted">운영 마켓</p>
        <p className="mt-0.5 line-clamp-2 text-sm font-black">{marketName}</p>
      </div>
    </div>
  );
}

function OperationRow({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: string }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-3">
      <div className="flex items-center gap-2 text-sm font-bold text-muted">
        {icon}
        {label}
      </div>
      <span className={`font-black ${tone}`}>{value}</span>
    </div>
  );
}

function ProductName({ product }: { product: Product }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-zinc-100">
        <SafeImage src={product.image_url} alt="" fill sizes="48px" className="object-cover" />
      </div>
      <div className="min-w-0">
        <p className="truncate font-bold">{product.name}</p>
        <p className="text-xs text-muted">{product.market_name}</p>
      </div>
    </div>
  );
}

function OrderProduct({ order }: { order: OrderResponse }) {
  const item = firstOrderItem(order);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-zinc-100">
        <SafeImage src={item?.product?.image_url} alt="" fill sizes="48px" className="object-cover" />
      </div>
      <div className="min-w-0">
        <p className="truncate font-bold">{item?.product?.name ?? "주문 상품"}</p>
        <p className="text-xs text-muted">{orderStatusLabel(order.status)}</p>
      </div>
    </div>
  );
}

function StatusFilter({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <select className="h-10 rounded-md border border-line bg-white px-3 text-sm font-bold" value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => (
        <option key={option} value={option}>
          {option === "ALL" ? "전체 상태" : option}
        </option>
      ))}
    </select>
  );
}

function createInvoiceTemplateCsv(orders: OrderResponse[]) {
  const headers = ["order_code", "product_name", "receiver", "phone", "address", "invoice_number"];
  const rows = orders.map((order) => {
    const item = firstOrderItem(order);
    const address = order.shipping_address;
    return [
      order.order_code,
      item?.product?.name ?? "주문 상품",
      address?.receiver ?? "",
      address?.phone ?? "",
      address ? `(${address.zip_code}) ${address.line1} ${address.line2}` : "",
      "",
    ];
  });

  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function parseInvoiceCsv(text: string) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const result: Record<string, string> = {};
  const [, ...rows] = lines;

  rows.forEach((line) => {
    const cells = parseCsvLine(line);
    const orderCode = cells[0]?.trim();
    const invoiceNumber = cells[5]?.trim();
    if (orderCode && invoiceNumber) {
      result[orderCode] = invoiceNumber;
    }
  });

  return result;
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}
