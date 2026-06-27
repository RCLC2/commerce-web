"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, CircleDollarSign, RefreshCw, Star, Store, Truck } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { getEffectiveToken } from "@/lib/auth-token";
import { firstOrderItem, orderStatusLabel } from "@/lib/order-utils";
import { useSessionStore } from "@/lib/session-store";
import type { CommerceCategory, OrderResponse, Product, ProductOption } from "@/lib/types";
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

function useSellerContextMarketID() {
  return useSessionStore((state) => state.sellerContext?.marketID);
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
  const sellerContextMarketID = useSellerContextMarketID();
  const { data: dashboard } = useQuery({ queryKey: ["seller-dashboard", sellerContextMarketID], queryFn: () => api.sellerDashboard(token ?? "", sellerContextMarketID), enabled: Boolean(token) });
  const { data: products = [] } = useQuery({ queryKey: ["seller-products", sellerContextMarketID], queryFn: () => api.sellerProducts(token ?? "", sellerContextMarketID), enabled: Boolean(token) });
  const { data: orders = [] } = useQuery({ queryKey: ["seller-orders", sellerContextMarketID], queryFn: () => api.sellerOrders(token ?? "", sellerContextMarketID), enabled: Boolean(token) });
  const { data: sources = [] } = useQuery({ queryKey: ["seller-inventory-sources", sellerContextMarketID], queryFn: () => api.sellerInventorySources(token ?? "", sellerContextMarketID), enabled: Boolean(token) });
  const { data: settlements = [] } = useQuery({ queryKey: ["seller-settlements", sellerContextMarketID], queryFn: () => api.sellerSettlements(token ?? "", sellerContextMarketID), enabled: Boolean(token) });
  const sellerName = useSellerContextName() ?? products[0]?.market_name ?? "셀러 마켓";
  const marketID = sellerContextMarketID ?? products[0]?.market_id;
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
  const queryClient = useQueryClient();
  const sellerContextMarketID = useSellerContextMarketID();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [shipping, setShipping] = useState("ALL");
  const [managedProducts, setManagedProducts] = useState<Record<number, ProductEditState>>({});
  const [createForm, setCreateForm] = useState<ProductCreateState>(() => emptyProductCreateForm());
  const { data = [] } = useQuery({ queryKey: ["seller-products", sellerContextMarketID], queryFn: () => api.sellerProducts(token ?? "", sellerContextMarketID), enabled: Boolean(token) });
  const { data: categories = [] } = useQuery({ queryKey: ["seller-product-categories"], queryFn: api.listCategories, enabled: Boolean(token) });
  const marketID = sellerContextMarketID ?? data[0]?.market_id;
  const saveProduct = useMutation({
    mutationFn: (product: Product) => api.updateSellerProduct(token ?? "", product),
    onSuccess: () => {
      setManagedProducts({});
      void queryClient.invalidateQueries({ queryKey: ["seller-products", sellerContextMarketID] });
    },
  });
  const createProduct = useMutation({
    mutationFn: () => {
      if (!marketID) {
        throw new Error("Market is required.");
      }
      return api.createSellerProduct(token ?? "", productCreatePayload(createForm, marketID, categories));
    },
    onSuccess: () => {
      setCreateForm(emptyProductCreateForm());
      void queryClient.invalidateQueries({ queryKey: ["seller-products", sellerContextMarketID] });
      void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });
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
  const categoryOptions = productCategoryOptions(categories);
  const selectedCategoryID = createForm.categoryID || String(categoryOptions[0]?.id ?? "");

  function updateProductEdit(product: Product, patch: Partial<ProductEditState>) {
    setManagedProducts((current) => ({
      ...current,
      [product.id]: { ...productEditState(product, current[product.id]), ...patch },
    }));
  }

  function updateProductOptionEdit(product: Product, optionID: number, patch: Partial<ProductOption>) {
    setManagedProducts((current) => {
      const state = productEditState(product, current[product.id]);
      return {
        ...current,
        [product.id]: {
          ...state,
          options: state.options.map((option) => (option.id === optionID ? { ...option, ...patch } : option)),
        },
      };
    });
  }

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
      <ConsoleSection className="mt-5" title="New product" description="Register a product through POST /api/v1/products.">
        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr_120px_120px]">
          <input className="h-11 rounded-md border border-line px-3 text-sm outline-none focus:border-foreground" value={createForm.name} onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))} placeholder="Product name" aria-label="Product name" />
          <select className="h-11 rounded-md border border-line bg-white px-3 text-sm font-bold" value={selectedCategoryID} onChange={(event) => setCreateForm((current) => ({ ...current, categoryID: event.target.value }))} aria-label="Category">
            {categoryOptions.map((category) => (<option key={category.id} value={category.id}>{categoryPathLabel(category, categoryOptions)}</option>))}
          </select>
          <input type="number" min={0} className="h-11 rounded-md border border-line px-3 text-sm outline-none focus:border-foreground" value={createForm.basePrice} onChange={(event) => setCreateForm((current) => ({ ...current, basePrice: event.target.value }))} placeholder="Price" aria-label="Price" />
          <input type="number" min={0} className="h-11 rounded-md border border-line px-3 text-sm outline-none focus:border-foreground" value={createForm.optionQuantity} onChange={(event) => setCreateForm((current) => ({ ...current, optionQuantity: event.target.value }))} placeholder="Stock" aria-label="Stock" />
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_130px_130px]">
          <input className="h-11 rounded-md border border-line px-3 text-sm outline-none focus:border-foreground" value={createForm.imageURL} onChange={(event) => setCreateForm((current) => ({ ...current, imageURL: event.target.value }))} placeholder="Image URL" aria-label="Image URL" />
          <input className="h-11 rounded-md border border-line px-3 text-sm outline-none focus:border-foreground" value={createForm.optionValue} onChange={(event) => setCreateForm((current) => ({ ...current, optionValue: event.target.value }))} placeholder="Option value" aria-label="Option value" />
          <select className="h-11 rounded-md border border-line bg-white px-3 text-sm font-bold" value={createForm.shippingType} onChange={(event) => setCreateForm((current) => ({ ...current, shippingType: event.target.value }))} aria-label="Shipping type"><option value="NORMAL">NORMAL</option><option value="FREE">FREE</option></select>
          <select className="h-11 rounded-md border border-line bg-white px-3 text-sm font-bold" value={createForm.status} onChange={(event) => setCreateForm((current) => ({ ...current, status: event.target.value }))} aria-label="Status"><option value="SELLING">SELLING</option><option value="SOLD_OUT">SOLD_OUT</option></select>
        </div>
        <textarea className="mt-3 min-h-24 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-foreground" value={createForm.description} onChange={(event) => setCreateForm((current) => ({ ...current, description: event.target.value }))} placeholder="Description" aria-label="Description" />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button disabled={!createForm.name.trim() || !selectedCategoryID || !marketID || createProduct.isPending} onClick={() => createProduct.mutate()}>{createProduct.isPending ? "Saving" : "Create product"}</Button>
          <Button variant="secondary" onClick={() => setCreateForm(emptyProductCreateForm())}>Reset</Button>
          {createProduct.error ? <p className="text-sm font-bold text-brand">{createProduct.error.message}</p> : null}
          {createProduct.isSuccess ? <p className="text-sm font-bold text-brand">Created.</p> : null}
        </div>
      </ConsoleSection>
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
          columns={["상품", "판매가", "배송", "상태", "옵션 재고", "관리"]}
          rows={filteredProducts.map((product) => {
            const state = productEditState(product, managedProducts[product.id]);
            return [
              <ProductName key="product" product={product} />,
              <input
                key="price"
                type="number"
                min={0}
                className="h-9 w-full rounded-md border border-line px-2 text-sm outline-none focus:border-foreground"
                value={state.price}
                onChange={(event) => updateProductEdit(product, { price: Number(event.target.value) })}
                aria-label={`${product.name} 판매가`}
              />,
              <select
                key="shipping"
                className="h-9 w-full rounded-md border border-line bg-white px-2 text-sm font-bold"
                value={state.shippingType}
                onChange={(event) => updateProductEdit(product, { shippingType: event.target.value })}
                aria-label={`${product.name} 배송`}
              >
                <option value="NORMAL">일반배송</option>
                <option value="FREE">무료배송</option>
              </select>,
              <select
                key="status"
                className="h-9 w-full rounded-md border border-line bg-white px-2 text-sm font-bold"
                value={state.status}
                onChange={(event) => updateProductEdit(product, { status: event.target.value })}
                aria-label={`${product.name} 상태`}
              >
                <option value="SELLING">판매중</option>
                <option value="SOLD_OUT">품절</option>
              </select>,
              <div key="options" className="grid min-w-0 gap-2">
                {state.options.map((option) => (
                  <div key={option.id} className="grid gap-2 rounded-md bg-zinc-50 p-2 md:grid-cols-[1fr_88px_88px]">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black">{optionLabel(option)}</p>
                      <p className="text-[11px] font-bold text-muted">예약 {option.reserved_quantity ?? 0}개</p>
                    </div>
                    <input
                      type="number"
                      min={0}
                      className="h-8 rounded-md border border-line px-2 text-xs outline-none focus:border-foreground"
                      value={option.quantity}
                      onChange={(event) => updateProductOptionEdit(product, option.id, { quantity: Number(event.target.value) })}
                      aria-label={`${product.name} ${optionLabel(option)} 재고`}
                    />
                    <select
                      className="h-8 rounded-md border border-line bg-white px-2 text-xs font-bold"
                      value={option.is_active ? "ACTIVE" : "INACTIVE"}
                      onChange={(event) => updateProductOptionEdit(product, option.id, { is_active: event.target.value === "ACTIVE" })}
                      aria-label={`${product.name} ${optionLabel(option)} 활성 상태`}
                    >
                      <option value="ACTIVE">활성</option>
                      <option value="INACTIVE">비활성</option>
                    </select>
                  </div>
                ))}
              </div>,
              <Button
                key="save"
                size="sm"
                disabled={!managedProducts[product.id] || saveProduct.isPending}
                onClick={() => saveProduct.mutate(productPayload(product, state))}
              >
                {saveProduct.isPending ? "저장 중" : "변경 저장"}
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
  const sellerContextMarketID = useSellerContextMarketID();
  const [sourceStatus, setSourceStatus] = useState("ALL");
  const [logStatus, setLogStatus] = useState("FAILED");
  const [logProvider, setLogProvider] = useState("ALL");
  const [sourceForm, setSourceForm] = useState({ provider: "SHOPIFY", display_name: "", shop_name: "", access_token: "", webhook_secret: "", refresh_token: "", client_id: "", client_secret: "" });
  const [tokenForm, setTokenForm] = useState<Record<number, { access_token: string; webhook_secret: string; refresh_token: string; client_secret: string }>>({});
  const [mappingForm, setMappingForm] = useState({ inventory_source_id: "", product_option_id: "", external_product_id: "", external_variant_id: "", external_inventory_item_id: "", external_location_id: "", disconnect_if_necessary: false });
  const [stockForm, setStockForm] = useState({ option_id: "", quantity: "" });
  const queryClient = useQueryClient();
  const { data: sources = [] } = useQuery({ queryKey: ["seller-inventory-sources", sellerContextMarketID], queryFn: () => api.sellerInventorySources(effectiveToken, sellerContextMarketID), enabled: Boolean(token) });
  const { data: logs = [] } = useQuery({ queryKey: ["seller-inventory-logs", sellerContextMarketID], queryFn: () => api.sellerInventoryLogs(effectiveToken, sellerContextMarketID), enabled: Boolean(token) });
  const { data: products = [] } = useQuery({ queryKey: ["seller-products", sellerContextMarketID], queryFn: () => api.sellerProducts(effectiveToken, sellerContextMarketID), enabled: Boolean(token) });
  const marketID = sellerContextMarketID ?? sources[0]?.market_id ?? products[0]?.market_id;
  const register = useMutation({
    mutationFn: () => {
      if (!marketID) {
        throw new Error("등록할 마켓을 먼저 확인해 주세요.");
      }
      return api.registerInventorySource(effectiveToken, {
        market_id: marketID,
        provider: sourceForm.provider,
        display_name: sourceForm.display_name.trim(),
        shop_name: sourceForm.shop_name.trim(),
        access_token: sourceForm.access_token.trim(),
        webhook_secret: sourceForm.webhook_secret.trim(),
        refresh_token: sourceForm.refresh_token.trim() || undefined,
        client_id: sourceForm.client_id.trim() || undefined,
        client_secret: sourceForm.client_secret.trim() || undefined,
      });
    },
    onSuccess: () => {
      setSourceForm({ provider: "SHOPIFY", display_name: "", shop_name: "", access_token: "", webhook_secret: "", refresh_token: "", client_id: "", client_secret: "" });
      void queryClient.invalidateQueries({ queryKey: ["seller-inventory-sources", sellerContextMarketID] });
    },
  });
  const replaceTokens = useMutation({
    mutationFn: (sourceID: number) => {
      const current = tokenForm[sourceID];
      if (!current) {
        throw new Error("교체할 토큰을 입력해 주세요.");
      }
      return api.replaceInventorySourceTokens(effectiveToken, sourceID, {
        access_token: current.access_token.trim() || undefined,
        refresh_token: current.refresh_token.trim() || undefined,
        client_secret: current.client_secret.trim() || undefined,
        webhook_secret: current.webhook_secret.trim() || undefined,
      });
    },
    onSuccess: () => {
      setTokenForm({});
      void queryClient.invalidateQueries({ queryKey: ["seller-inventory-sources", sellerContextMarketID] });
    },
  });
  const deactivateSource = useMutation({
    mutationFn: (sourceID: number) => api.deactivateInventorySource(effectiveToken, sourceID),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["seller-inventory-sources", sellerContextMarketID] }),
  });
  const registerMapping = useMutation({
    mutationFn: () => api.registerInventoryMapping(effectiveToken, {
      inventory_source_id: Number(mappingForm.inventory_source_id),
      product_option_id: Number(mappingForm.product_option_id),
      external_product_id: mappingForm.external_product_id.trim() || undefined,
      external_variant_id: mappingForm.external_variant_id.trim() || undefined,
      external_inventory_item_id: mappingForm.external_inventory_item_id.trim() || undefined,
      external_location_id: mappingForm.external_location_id.trim() || undefined,
      disconnect_if_necessary: mappingForm.disconnect_if_necessary,
    }),
    onSuccess: () => {
      setMappingForm({ inventory_source_id: "", product_option_id: "", external_product_id: "", external_variant_id: "", external_inventory_item_id: "", external_location_id: "", disconnect_if_necessary: false });
      void queryClient.invalidateQueries({ queryKey: ["seller-inventory-logs", sellerContextMarketID] });
    },
  });
  const pullStock = useMutation({
    mutationFn: () => api.pullInventoryOptionStock(effectiveToken, Number(stockForm.option_id)),
    onSuccess: (result) => {
      setStockForm((current) => ({ ...current, quantity: String(result.quantity) }));
      void queryClient.invalidateQueries({ queryKey: ["seller-products", sellerContextMarketID] });
      void queryClient.invalidateQueries({ queryKey: ["seller-inventory-logs", sellerContextMarketID] });
    },
  });
  const pushStock = useMutation({
    mutationFn: () => api.pushInventoryOptionStock(effectiveToken, Number(stockForm.option_id), Number(stockForm.quantity)),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["seller-inventory-logs", sellerContextMarketID] }),
  });
  const retryLog = useMutation({
    mutationFn: (logID: number) => api.retryInventorySyncLog(effectiveToken, logID),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["seller-inventory-logs", sellerContextMarketID] }),
  });
  const sellerName = useSellerContextName() ?? sources[0]?.display_name?.replace(/ Shopify| Cafe24/g, "") ?? "셀러 마켓";

  if (!token) {
    return <SellerAuthRequired />;
  }

  const options = products.flatMap((product) => (product.options ?? []).map((option) => ({ ...option, productName: product.name })));
  const filteredSources = sourceStatus === "ALL" ? sources : sources.filter((source) => source.status === sourceStatus);
  const filteredLogs = logs.filter((log) => (logStatus === "ALL" || log.status === logStatus) && (logProvider === "ALL" || log.provider === logProvider));

  function updateTokenForm(sourceID: number, key: "access_token" | "webhook_secret" | "refresh_token" | "client_secret", value: string) {
    setTokenForm((current) => {
      const next = current[sourceID] ?? { access_token: "", webhook_secret: "", refresh_token: "", client_secret: "" };
      return { ...current, [sourceID]: { ...next, [key]: value } };
    });
  }

  return (
    <SellerConsoleLayout sellerName={sellerName}>
      <ConsoleHeader title="외부몰 재고 연동" description="Shopify/Cafe24 재고 소스, 옵션 매핑, 동기화 실패 로그를 관리합니다." />
      <div className="mt-5">
        <SummaryStrip items={[{ label: "연동 소스", value: `${sources.length}개` }, { label: "활성", value: `${sources.filter((source) => source.status === "ACTIVE").length}개` }, { label: "실패 로그", value: `${logs.filter((log) => log.status === "FAILED").length}건` }, { label: "매핑 가능 옵션", value: `${options.length}개` }]} />
      </div>
      <ConsoleSection className="mt-5" title="소스 등록">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <select className="h-10 rounded-md border border-line bg-white px-3 text-sm font-bold" value={sourceForm.provider} onChange={(event) => setSourceForm((current) => ({ ...current, provider: event.target.value }))}><option value="SHOPIFY">SHOPIFY</option><option value="CAFE24">CAFE24</option></select>
          <InventoryInput label="표시 이름" value={sourceForm.display_name} onChange={(value) => setSourceForm((current) => ({ ...current, display_name: value }))} />
          <InventoryInput label="Shop/Mall" value={sourceForm.shop_name} onChange={(value) => setSourceForm((current) => ({ ...current, shop_name: value }))} />
          <InventoryInput label="Access Token" type="password" value={sourceForm.access_token} onChange={(value) => setSourceForm((current) => ({ ...current, access_token: value }))} />
          <InventoryInput label="Webhook Secret" type="password" value={sourceForm.webhook_secret} onChange={(value) => setSourceForm((current) => ({ ...current, webhook_secret: value }))} />
          <InventoryInput label="Refresh Token" type="password" value={sourceForm.refresh_token} onChange={(value) => setSourceForm((current) => ({ ...current, refresh_token: value }))} />
          <InventoryInput label="Client ID" value={sourceForm.client_id} onChange={(value) => setSourceForm((current) => ({ ...current, client_id: value }))} />
          <InventoryInput label="Client Secret" type="password" value={sourceForm.client_secret} onChange={(value) => setSourceForm((current) => ({ ...current, client_secret: value }))} />
        </div>
        <div className="mt-3 flex justify-end"><Button onClick={() => register.mutate()} disabled={!marketID || !sourceForm.display_name || !sourceForm.shop_name || !sourceForm.access_token || register.isPending}>{register.isPending ? "등록 중" : "소스 등록"}</Button></div>
      </ConsoleSection>
      <ConsoleSection className="mt-5" title="연동 소스" action={<StatusFilter value={sourceStatus} onChange={setSourceStatus} options={["ALL", "ACTIVE", "FAILED", "INACTIVE"]} />}>
        <DataTable columns={["소스", "Shop/Mall", "상태", "토큰 교체", "관리"]} rows={filteredSources.map((source) => [
          <div key="source" className="min-w-0"><p className="font-black">{source.display_name}</p><p className="text-xs text-muted">{source.provider} · #{source.id}</p></div>,
          source.shop_name ?? "-",
          <StatusBadge key="status" value={source.status} />,
          <div key="tokens" className="grid min-w-64 gap-2 md:grid-cols-2"><InventoryInput label="Access" type="password" value={tokenForm[source.id]?.access_token ?? ""} onChange={(value) => updateTokenForm(source.id, "access_token", value)} /><InventoryInput label="Webhook" type="password" value={tokenForm[source.id]?.webhook_secret ?? ""} onChange={(value) => updateTokenForm(source.id, "webhook_secret", value)} /><InventoryInput label="Refresh" type="password" value={tokenForm[source.id]?.refresh_token ?? ""} onChange={(value) => updateTokenForm(source.id, "refresh_token", value)} /><InventoryInput label="Client Secret" type="password" value={tokenForm[source.id]?.client_secret ?? ""} onChange={(value) => updateTokenForm(source.id, "client_secret", value)} /></div>,
          <div key="actions" className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" disabled={replaceTokens.isPending || !tokenForm[source.id]} onClick={() => replaceTokens.mutate(source.id)}>토큰 교체</Button><Button size="sm" variant="secondary" disabled={deactivateSource.isPending || source.status === "INACTIVE"} onClick={() => deactivateSource.mutate(source.id)}>비활성화</Button></div>,
        ])} />
      </ConsoleSection>
      <ConsoleSection className="mt-5" title="옵션 매핑 및 재고 동기화">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-3 md:grid-cols-2">
            <select className="h-10 rounded-md border border-line bg-white px-3 text-sm font-bold" value={mappingForm.inventory_source_id} onChange={(event) => setMappingForm((current) => ({ ...current, inventory_source_id: event.target.value }))}><option value="">소스 선택</option>{sources.map((source) => <option key={source.id} value={source.id}>{source.display_name}</option>)}</select>
            <select className="h-10 rounded-md border border-line bg-white px-3 text-sm font-bold" value={mappingForm.product_option_id} onChange={(event) => setMappingForm((current) => ({ ...current, product_option_id: event.target.value }))}><option value="">옵션 선택</option>{options.map((option) => <option key={option.id} value={option.id}>{option.productName} · {option.option_name}:{option.option_value}</option>)}</select>
            <InventoryInput label="External Product" value={mappingForm.external_product_id} onChange={(value) => setMappingForm((current) => ({ ...current, external_product_id: value }))} />
            <InventoryInput label="External Variant" value={mappingForm.external_variant_id} onChange={(value) => setMappingForm((current) => ({ ...current, external_variant_id: value }))} />
            <InventoryInput label="Inventory Item" value={mappingForm.external_inventory_item_id} onChange={(value) => setMappingForm((current) => ({ ...current, external_inventory_item_id: value }))} />
            <InventoryInput label="Location" value={mappingForm.external_location_id} onChange={(value) => setMappingForm((current) => ({ ...current, external_location_id: value }))} />
            <label className="flex h-10 items-center gap-2 rounded-md border border-line px-3 text-sm font-bold"><input type="checkbox" checked={mappingForm.disconnect_if_necessary} onChange={(event) => setMappingForm((current) => ({ ...current, disconnect_if_necessary: event.target.checked }))} /> disconnect</label>
            <Button disabled={!mappingForm.inventory_source_id || !mappingForm.product_option_id || registerMapping.isPending} onClick={() => registerMapping.mutate()}>{registerMapping.isPending ? "매핑 중" : "매핑 저장"}</Button>
          </div>
          <div className="grid content-start gap-3"><select className="h-10 rounded-md border border-line bg-white px-3 text-sm font-bold" value={stockForm.option_id} onChange={(event) => setStockForm((current) => ({ ...current, option_id: event.target.value }))}><option value="">동기화 옵션 선택</option>{options.map((option) => <option key={option.id} value={option.id}>{option.productName} · 현재 {option.quantity}개</option>)}</select><InventoryInput label="Push Quantity" type="number" value={stockForm.quantity} onChange={(value) => setStockForm((current) => ({ ...current, quantity: value }))} /><div className="flex gap-2"><Button variant="secondary" disabled={!stockForm.option_id || pullStock.isPending} onClick={() => pullStock.mutate()}>{pullStock.isPending ? "조회 중" : "Pull"}</Button><Button disabled={!stockForm.option_id || stockForm.quantity === "" || pushStock.isPending} onClick={() => pushStock.mutate()}>{pushStock.isPending ? "반영 중" : "Push"}</Button></div></div>
        </div>
      </ConsoleSection>
      <ConsoleSection className="mt-5" title="동기화 로그" action={<div className="flex flex-col gap-2 md:flex-row"><StatusFilter value={logProvider} onChange={setLogProvider} options={["ALL", "SHOPIFY", "CAFE24"]} /><StatusFilter value={logStatus} onChange={setLogStatus} options={["ALL", "SUCCESS", "FAILED"]} /></div>}>
        <DataTable columns={["Provider", "옵션", "상태", "수량", "실패 원인", "일시", "작업"]} rows={filteredLogs.map((log) => [log.provider ?? "-", log.product_option_id ? `#${log.product_option_id}` : "-", <StatusBadge key="status" value={log.status} />, typeof log.new_quantity === "number" ? `${log.previous_quantity ?? "-"} → ${log.new_quantity}` : "-", <span key="message" className="line-clamp-2">{log.error_message || log.message || log.external_reference || "-"}</span>, new Date(log.created_at).toLocaleString("ko-KR"), <Button key="retry" size="sm" variant="secondary" disabled={log.status !== "FAILED" || retryLog.isPending} onClick={() => retryLog.mutate(log.id)}>재시도</Button>])} />
      </ConsoleSection>
    </SellerConsoleLayout>
  );
}

export function SellerOrdersPage() {
  const token = useSellerToken();
  const queryClient = useQueryClient();
  const sellerContextMarketID = useSellerContextMarketID();
  const [status, setStatus] = useState("ALL");
  const [query, setQuery] = useState("");
  const [invoiceMap, setInvoiceMap] = useState<Record<string, string>>({});
  const [carrierMap, setCarrierMap] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { data = [] } = useQuery({ queryKey: ["seller-orders", sellerContextMarketID], queryFn: () => api.sellerOrders(token ?? "", sellerContextMarketID), enabled: Boolean(token) });
  const shipOrder = useMutation({
    mutationFn: (order: OrderResponse) => {
      const marketID = sellerContextMarketID ?? order.market_orders?.[0]?.market_id;
      const invoiceNumber = invoiceMap[order.order_code];
      if (!marketID || !invoiceNumber) {
        throw new Error("마켓과 송장 번호를 확인해 주세요.");
      }
      return api.registerSellerInvoices(token ?? "", { market_id: marketID, invoices: [{ order_id: order.id, carrier: carrierMap[order.order_code] || "CJ", invoice_number: invoiceNumber }] });
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["seller-orders", sellerContextMarketID] }),
  });
  const startOrder = useMutation({
    mutationFn: async (order: OrderResponse) => {
      const marketID = sellerContextMarketID ?? order.market_orders?.[0]?.market_id;
      const invoiceNumber = invoiceMap[order.order_code] || order.delivery?.tracking_number;
      const delivery = order.delivery ?? await api.getDeliveryByOrder(token ?? "", order.id);
      if (!marketID || !invoiceNumber) {
        throw new Error("마켓과 송장 번호를 확인해 주세요.");
      }
      return api.startSellerDelivery(token ?? "", marketID, delivery.id, { carrier: carrierMap[order.order_code] || order.delivery?.carrier || "CJ", tracking_number: invoiceNumber });
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["seller-orders", sellerContextMarketID] }),
  });
  const submitInvoices = useMutation({
    mutationFn: () => {
      const marketID = sellerContextMarketID ?? filteredOrders.find((order) => order.market_orders?.[0]?.market_id)?.market_orders?.[0]?.market_id;
      const invoices = filteredOrders
        .filter((order) => invoiceMap[order.order_code])
        .map((order) => ({ order_id: order.id, carrier: carrierMap[order.order_code] || "CJ", invoice_number: invoiceMap[order.order_code] }));
      if (!marketID || invoices.length === 0) {
        throw new Error("일괄 등록할 송장이 없습니다.");
      }
      return api.registerSellerInvoices(token ?? "", { market_id: marketID, invoices });
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["seller-orders", sellerContextMarketID] }),
  });
  const completeOrder = useMutation({
    mutationFn: async (order: OrderResponse) => {
      const marketID = sellerContextMarketID ?? order.market_orders?.[0]?.market_id;
      if (!marketID) {
        throw new Error("마켓을 확인해 주세요.");
      }
      const delivery = order.delivery ?? await api.getDeliveryByOrder(token ?? "", order.id);
      return api.completeSellerDelivery(token ?? "", marketID, delivery.id);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["seller-orders", sellerContextMarketID] }),
  });
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
            <Button disabled={submitInvoices.isPending || !Object.values(invoiceMap).some(Boolean)} onClick={() => submitInvoices.mutate()}>{submitInvoices.isPending ? "일괄 등록 중" : "송장 일괄 등록"}</Button>
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
          columns={["주문", "대표 상품", "배송지", "결제 금액", "택배/송장", "상태", "처리"]}
          rows={filteredOrders.map((order) => {
            return [
              <span key="code" className="text-xs font-black">{order.order_code}</span>,
              <OrderProduct key="product" order={order} />,
              order.shipping_address ? `${order.shipping_address.receiver} · ${order.shipping_address.line1}` : "-",
              formatPrice(orderPayableAmount(order)),
              <div key="invoice" className="grid gap-2">
                <select
                  className="h-9 rounded-md border border-line bg-white px-2 text-sm font-bold"
                  value={carrierMap[order.order_code] ?? order.delivery?.carrier ?? "CJ"}
                  onChange={(event) => setCarrierMap((current) => ({ ...current, [order.order_code]: event.target.value }))}
                  aria-label={`${order.order_code} 택배사`}
                >
                  <option value="CJ">CJ대한통운</option>
                  <option value="HANJIN">한진택배</option>
                  <option value="LOTTE">롯데택배</option>
                  <option value="POST">우체국</option>
                </select>
                <input
                  value={invoiceMap[order.order_code] ?? order.delivery?.tracking_number ?? ""}
                  onChange={(event) => setInvoiceMap((current) => ({ ...current, [order.order_code]: event.target.value }))}
                  className="h-9 w-full rounded-md border border-line px-2 text-sm outline-none focus:border-foreground"
                  placeholder="송장 번호"
                  aria-label={`${order.order_code} 송장 번호`}
                />
              </div>,
              <StatusBadge key="status" value={sellerDeliveryStatus(order)} />,
              <OrderDeliveryActions
                key="ship"
                order={order}
                invoiceNumber={invoiceMap[order.order_code] ?? order.delivery?.tracking_number ?? ""}
                shipping={shipOrder.isPending || startOrder.isPending || completeOrder.isPending}
                onRegister={() => shipOrder.mutate(order)}
                onStart={() => startOrder.mutate(order)}
                onComplete={() => completeOrder.mutate(order)}
              />,
            ];
          })}
        />
      </ConsoleSection>
    </SellerConsoleLayout>
  );
}

export function SellerSettlementsPage() {
  const token = useSellerToken();
  const sellerContextMarketID = useSellerContextMarketID();
  const [status, setStatus] = useState("ALL");
  const { data = [] } = useQuery({ queryKey: ["seller-settlements", sellerContextMarketID], queryFn: () => api.sellerSettlements(token ?? "", sellerContextMarketID), enabled: Boolean(token) });
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
  const sellerContextMarketID = useSellerContextMarketID();
  const [query, setQuery] = useState("");
  const [rating, setRating] = useState("ALL");
  const { data = [] } = useQuery({ queryKey: ["seller-reviews", sellerContextMarketID], queryFn: () => api.sellerReviews(token ?? "", sellerContextMarketID), enabled: Boolean(token) });
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

type ProductEditState = {
  price: number;
  status: string;
  shippingType: string;
  options: ProductOption[];
};

type ProductCreateState = {
  name: string;
  categoryID: string;
  basePrice: string;
  discountPrice: string;
  shippingType: string;
  status: string;
  imageURL: string;
  description: string;
  optionName: string;
  optionValue: string;
  optionQuantity: string;
};

function emptyProductCreateForm(): ProductCreateState {
  return {
    name: "",
    categoryID: "",
    basePrice: "",
    discountPrice: "0",
    shippingType: "NORMAL",
    status: "SELLING",
    imageURL: "",
    description: "",
    optionName: "Default",
    optionValue: "FREE",
    optionQuantity: "0",
  };
}

function productCreatePayload(form: ProductCreateState, marketID: number, categories: CommerceCategory[]): Product {
  const categoryID = Number(form.categoryID) || productCategoryOptions(categories)[0]?.id || 0;
  return {
    id: 0,
    market_id: marketID,
    category_id: categoryID,
    name: form.name.trim(),
    description: JSON.stringify({ text: form.description.trim() }),
    base_price: Math.max(0, Number(form.basePrice) || 0),
    discount_price: Math.max(0, Number(form.discountPrice) || 0),
    shipping_type: form.shippingType,
    popularity_score: 0,
    status: form.status,
    image_url: form.imageURL.trim() || undefined,
    options: [
      {
        id: 0,
        product_id: 0,
        option_name: form.optionName.trim() || "Default",
        option_value: form.optionValue.trim() || "FREE",
        additional_price: 0,
        quantity: Math.max(0, Number(form.optionQuantity) || 0),
        is_active: true,
      },
    ],
  };
}

function productCategoryOptions(categories: CommerceCategory[]) {
  return [...categories].sort((a, b) => a.level - b.level || a.sort_order - b.sort_order || a.id - b.id);
}

function categoryPathLabel(category: CommerceCategory, categories: CommerceCategory[]) {
  const byID = new Map(categories.map((item) => [item.id, item]));
  const names = [category.name];
  let parentID = category.parent_id;
  while (parentID) {
    const parent = byID.get(parentID);
    if (!parent) {
      break;
    }
    names.unshift(parent.name);
    parentID = parent.parent_id;
  }
  return names.join(" > ");
}

function productEditState(product: Product, state?: ProductEditState): ProductEditState {
  return state ?? {
    price: product.discount_price || product.base_price,
    status: product.status,
    shippingType: product.shipping_type,
    options: product.options?.map((option) => ({ ...option })) ?? [],
  };
}

function InventoryInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <input
      type={type}
      className="h-10 min-w-0 rounded-md border border-line px-3 text-sm outline-none focus:border-foreground"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={label}
      aria-label={label}
    />
  );
}

function productPayload(product: Product, state: ProductEditState): Product {
  return {
    id: product.id,
    market_id: product.market_id,
    category_id: product.category_id,
    name: product.name,
    description: "",
    base_price: state.price,
    discount_price: 0,
    shipping_type: state.shippingType,
    popularity_score: product.popularity_score,
    status: state.status,
    image_url: product.image_url,
    options: state.options.map((option) => ({ ...option, quantity: Math.max(0, option.quantity), additional_price: Math.max(0, option.additional_price) })),
  };
}

function optionLabel(option: ProductOption) {
  return [option.option_name, option.option_value].filter(Boolean).join(" · ") || `옵션 #${option.id}`;
}

function sellerOrderStatus(order: OrderResponse) {
  return order.market_orders?.[0]?.status ?? order.status;
}

function sellerDeliveryStatus(order: OrderResponse) {
  return order.delivery?.status ?? sellerOrderStatus(order);
}

function OrderDeliveryActions({
  order,
  invoiceNumber,
  shipping,
  onRegister,
  onStart,
  onComplete,
}: {
  order: OrderResponse;
  invoiceNumber: string;
  shipping: boolean;
  onRegister: () => void;
  onStart: () => void;
  onComplete: () => void;
}) {
  const deliveryStatus = sellerDeliveryStatus(order);
  const marketStatus = sellerOrderStatus(order);
  if (deliveryStatus === "DELIVERED" || marketStatus === "DELIVERED") {
    return <StatusBadge value="DELIVERED" />;
  }
  if (deliveryStatus === "SHIPPING" || marketStatus === "SHIPPED") {
    return <Button size="sm" disabled={shipping} onClick={onComplete}>{shipping ? "완료 중" : "배송 완료"}</Button>;
  }
  if (order.delivery?.id) {
    return <Button size="sm" disabled={shipping || !invoiceNumber} onClick={onStart}>{shipping ? "시작 중" : "배송 시작"}</Button>;
  }
  return <Button size="sm" disabled={shipping || !invoiceNumber} onClick={onRegister}>{shipping ? "등록 중" : "송장 등록"}</Button>;
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
