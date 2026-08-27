"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Store } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { getEffectiveToken } from "@/lib/auth-token";
import { sellerConsoleApi } from "@/lib/seller-console-api";
import { inventorySourceValidationError } from "@/lib/inventory-source-validation";
import { useSessionStore } from "@/lib/session-store";
import {
  ConsoleHeader,
  ConsoleLayout,
  ConsoleSection,
  DataTable,
  FilterField,
  StatusBadge,
  SummaryStrip,
} from "./console-layout";
import { PaginationBar, useDebouncedValue } from "./console-ui";
import { sellerLinks } from "./seller-shell";
import { Button } from "./ui/button";


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

function useResolvedSellerContext(token: string | null) {
  const marketID = useSellerContextMarketID();
  return useQuery({ queryKey: ["seller-context", marketID], queryFn: () => api.sellerContext(token ?? "", marketID), enabled: Boolean(token) });
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

export function SellerInventoryPage() {
  const token = useSellerToken();
  const effectiveToken = token ?? "";
  const sellerContextMarketID = useSellerContextMarketID();
  const { data: sellerContext } = useResolvedSellerContext(token);
  const resolvedMarketID = sellerContextMarketID ?? sellerContext?.market_id;
  const [sourceStatus, setSourceStatus] = useState("ALL");
  const [logStatus, setLogStatus] = useState("FAILED");
  const [logProvider, setLogProvider] = useState("ALL");
  const [sourceForm, setSourceForm] = useState({ provider: "SHOPIFY", display_name: "", shop_name: "", access_token: "", webhook_secret: "", refresh_token: "", client_id: "", client_secret: "" });
  const [tokenForm, setTokenForm] = useState<Record<number, { access_token: string; webhook_secret: string; refresh_token: string; client_secret: string }>>({});
  const [mappingForm, setMappingForm] = useState({ inventory_source_id: "", product_option_id: "", external_product_id: "", external_variant_id: "", external_inventory_item_id: "", external_location_id: "", disconnect_if_necessary: false });
  const [stockForm, setStockForm] = useState({ option_id: "", quantity: "" });
  const [optionPage, setOptionPage] = useState(1);
  const [optionQuery, setOptionQuery] = useState("");
  const debouncedOptionQuery = useDebouncedValue(optionQuery);
  const queryClient = useQueryClient();
  const { data: sources = [] } = useQuery({ queryKey: ["seller-inventory-sources", resolvedMarketID], queryFn: () => api.sellerInventorySources(effectiveToken, resolvedMarketID), enabled: Boolean(token && resolvedMarketID) });
  const { data: logs = [] } = useQuery({ queryKey: ["seller-inventory-logs", resolvedMarketID], queryFn: () => api.sellerInventoryLogs(effectiveToken, resolvedMarketID), enabled: Boolean(token && resolvedMarketID) });
  const optionsQuery = useQuery({
    queryKey: ["seller-inventory-options", resolvedMarketID, optionPage, debouncedOptionQuery],
    queryFn: () => sellerConsoleApi.inventoryOptions(effectiveToken, {
      market_id: resolvedMarketID,
      page: optionPage,
      page_size: 20,
      q: debouncedOptionQuery || undefined,
    }),
    enabled: Boolean(token && resolvedMarketID),
  });
  const optionPageData = optionsQuery.data;
  const options = optionPageData?.items ?? [];
  const marketID = resolvedMarketID ?? sources[0]?.market_id;
  const register = useMutation({
    mutationFn: () => {
      if (!marketID) {
        throw new Error("등록할 마켓을 먼저 확인해 주세요.");
      }
      const validationError = inventorySourceValidationError(sourceForm);
      if (validationError) {
        throw new Error(validationError);
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
      void queryClient.invalidateQueries({ queryKey: ["seller-inventory-sources", resolvedMarketID] });
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
      void queryClient.invalidateQueries({ queryKey: ["seller-inventory-sources", resolvedMarketID] });
    },
  });
  const deactivateSource = useMutation({
    mutationFn: (sourceID: number) => api.deactivateInventorySource(effectiveToken, sourceID),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["seller-inventory-sources", resolvedMarketID] }),
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
      void queryClient.invalidateQueries({ queryKey: ["seller-inventory-logs", resolvedMarketID] });
    },
  });
  const pullStock = useMutation({
    mutationFn: () => api.pullInventoryOptionStock(effectiveToken, Number(stockForm.option_id)),
    onSuccess: (result) => {
      setStockForm((current) => ({ ...current, quantity: String(result.quantity) }));
      void queryClient.invalidateQueries({ queryKey: ["seller-products", resolvedMarketID] });
      void queryClient.invalidateQueries({ queryKey: ["seller-inventory-logs", resolvedMarketID] });
      void queryClient.invalidateQueries({ queryKey: ["seller-inventory-options", resolvedMarketID] });
    },
  });
  const pushStock = useMutation({
    mutationFn: () => api.pushInventoryOptionStock(effectiveToken, Number(stockForm.option_id), Number(stockForm.quantity)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["seller-inventory-logs", resolvedMarketID] });
      void queryClient.invalidateQueries({ queryKey: ["seller-inventory-options", resolvedMarketID] });
    },
  });
  const retryLog = useMutation({
    mutationFn: (logID: number) => api.retryInventorySyncLog(effectiveToken, logID),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["seller-inventory-logs", resolvedMarketID] }),
  });
  const sellerName = useSellerContextName() ?? sellerContext?.market_name ?? sources[0]?.display_name?.replace(/ Shopify| Cafe24/g, "") ?? "셀러 마켓";

  if (!token) {
    return <SellerAuthRequired />;
  }

  const filteredSources = sourceStatus === "ALL" ? sources : sources.filter((source) => source.status === sourceStatus);
  const filteredLogs = logs.filter((log) => (logStatus === "ALL" || log.status === logStatus) && (logProvider === "ALL" || log.provider === logProvider));
  const sourceValidationError = inventorySourceValidationError(sourceForm);

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
        <SummaryStrip items={[{ label: "연동 소스", value: `${sources.length}개` }, { label: "활성", value: `${sources.filter((source) => source.status === "ACTIVE").length}개` }, { label: "실패 로그", value: `${logs.filter((log) => log.status === "FAILED").length}건` }, { label: "매핑 가능 옵션", value: `${optionPageData?.total ?? 0}개` }]} />
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
        <div className="mt-3 flex flex-col items-end gap-2">
          {sourceValidationError ? <p className="text-xs font-bold text-amber-800">{sourceValidationError}</p> : null}
          <Button onClick={() => register.mutate()} disabled={!marketID || Boolean(sourceValidationError) || register.isPending}>{register.isPending ? "등록 중" : "소스 등록"}</Button>
        </div>
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
        <div className="mb-4 max-w-xl">
          <FilterField label="상품/옵션 검색">
            <input
              className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm font-bold outline-none focus:border-foreground"
              value={optionQuery}
              onChange={(event) => {
                setOptionQuery(event.target.value);
                setOptionPage(1);
                setMappingForm((current) => ({ ...current, product_option_id: "" }));
                setStockForm((current) => ({ ...current, option_id: "" }));
              }}
              placeholder="상품명, 옵션명 또는 옵션값 검색"
            />
          </FilterField>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-3 md:grid-cols-2">
            <select className="h-10 rounded-md border border-line bg-white px-3 text-sm font-bold" value={mappingForm.inventory_source_id} onChange={(event) => setMappingForm((current) => ({ ...current, inventory_source_id: event.target.value }))}><option value="">소스 선택</option>{sources.map((source) => <option key={source.id} value={source.id}>{source.display_name}</option>)}</select>
            <select className="h-10 rounded-md border border-line bg-white px-3 text-sm font-bold" value={mappingForm.product_option_id} onChange={(event) => setMappingForm((current) => ({ ...current, product_option_id: event.target.value }))}><option value="">옵션 선택</option>{options.map((option) => <option key={option.id} value={option.id}>{option.product_name} · {option.option_name}:{option.option_value}</option>)}</select>
            <InventoryInput label="External Product" value={mappingForm.external_product_id} onChange={(value) => setMappingForm((current) => ({ ...current, external_product_id: value }))} />
            <InventoryInput label="External Variant" value={mappingForm.external_variant_id} onChange={(value) => setMappingForm((current) => ({ ...current, external_variant_id: value }))} />
            <InventoryInput label="Inventory Item" value={mappingForm.external_inventory_item_id} onChange={(value) => setMappingForm((current) => ({ ...current, external_inventory_item_id: value }))} />
            <InventoryInput label="Location" value={mappingForm.external_location_id} onChange={(value) => setMappingForm((current) => ({ ...current, external_location_id: value }))} />
            <label className="flex h-10 items-center gap-2 rounded-md border border-line px-3 text-sm font-bold"><input type="checkbox" checked={mappingForm.disconnect_if_necessary} onChange={(event) => setMappingForm((current) => ({ ...current, disconnect_if_necessary: event.target.checked }))} /> disconnect</label>
            <Button disabled={!mappingForm.inventory_source_id || !mappingForm.product_option_id || registerMapping.isPending} onClick={() => registerMapping.mutate()}>{registerMapping.isPending ? "매핑 중" : "매핑 저장"}</Button>
          </div>
          <div className="grid content-start gap-3"><select className="h-10 rounded-md border border-line bg-white px-3 text-sm font-bold" value={stockForm.option_id} onChange={(event) => setStockForm((current) => ({ ...current, option_id: event.target.value }))}><option value="">동기화 옵션 선택</option>{options.map((option) => <option key={option.id} value={option.id}>{option.product_name} · 현재 {option.quantity}개</option>)}</select><InventoryInput label="Push Quantity" type="number" value={stockForm.quantity} onChange={(value) => setStockForm((current) => ({ ...current, quantity: value }))} /><div className="flex gap-2"><Button variant="secondary" disabled={!stockForm.option_id || pullStock.isPending} onClick={() => pullStock.mutate()}>{pullStock.isPending ? "조회 중" : "Pull"}</Button><Button disabled={!stockForm.option_id || stockForm.quantity === "" || pushStock.isPending} onClick={() => pushStock.mutate()}>{pushStock.isPending ? "반영 중" : "Push"}</Button></div></div>
        </div>
        <PaginationBar
          page={optionPageData?.page ?? optionPage}
          totalPages={optionPageData?.total_pages ?? 1}
          total={optionPageData?.total ?? 0}
          onChange={(nextPage) => {
            setOptionPage(nextPage);
            setMappingForm((current) => ({ ...current, product_option_id: "" }));
            setStockForm((current) => ({ ...current, option_id: "" }));
          }}
        />
      </ConsoleSection>
      <ConsoleSection className="mt-5" title="동기화 로그" action={<div className="flex flex-col gap-2 md:flex-row"><StatusFilter value={logProvider} onChange={setLogProvider} options={["ALL", "SHOPIFY", "CAFE24"]} /><StatusFilter value={logStatus} onChange={setLogStatus} options={["ALL", "SUCCESS", "FAILED"]} /></div>}>
        <DataTable columns={["Provider", "옵션", "상태", "수량", "실패 원인", "일시", "작업"]} rows={filteredLogs.map((log) => [log.provider ?? "-", log.product_option_id ? `#${log.product_option_id}` : "-", <StatusBadge key="status" value={log.status} />, typeof log.new_quantity === "number" ? `${log.previous_quantity ?? "-"} → ${log.new_quantity}` : "-", <span key="message" className="line-clamp-2">{log.error_message || log.message || log.external_reference || "-"}</span>, new Date(log.created_at).toLocaleString("ko-KR"), <Button key="retry" size="sm" variant="secondary" disabled={log.status !== "FAILED" || retryLog.isPending} onClick={() => retryLog.mutate(log.id)}>재시도</Button>])} />
      </ConsoleSection>
    </SellerConsoleLayout>
  );
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
