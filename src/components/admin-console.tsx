"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getEffectiveToken } from "@/lib/auth-token";
import { firstOrderItem } from "@/lib/order-utils";
import { useSessionStore } from "@/lib/session-store";
import type {
  AdminMember,
  CMSHomeSection,
  CommerceCategory,
  Market,
  MarketPenalty,
  Product,
} from "@/lib/types";
import { formatFollowerCount, formatPrice } from "@/lib/utils";
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

export const adminLinks = [
  { href: "/admin", label: "홈" },
  { href: "/admin/members", label: "회원" },
  { href: "/admin/markets", label: "마켓" },
  { href: "/admin/products", label: "상품" },
  { href: "/admin/orders", label: "주문" },
  { href: "/admin/settlements", label: "정산" },
  { href: "/admin/coupons", label: "쿠폰" },
  { href: "/admin/tokens", label: "토큰 조회" },
  { href: "/admin/audit-logs", label: "감사 로그" },
  { href: "/admin/cms", label: "CMS" },
  { href: "/admin/ads", label: "광고 운영" },
  { href: "/admin/experiments", label: "실험" },
];

export function useAdminToken() {
  const token = useSessionStore((state) => state.accessToken);
  const role = useSessionStore((state) => state.role);
  const hydrate = useSessionStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (role !== "ADMIN") {
    return null;
  }
  return getEffectiveToken(token);
}

export function AdminAuthRequired() {
  return (
    <ConsoleLayout title="Admin" subtitle="플랫폼 운영 콘솔" links={adminLinks}>
      <ConsoleSection>
        <h2 className="text-2xl font-black">어드민 권한이 필요합니다</h2>
        <p className="mt-2 text-sm text-muted">어드민 계정으로 로그인한 사용자만 플랫폼 운영 콘솔에 접근할 수 있습니다.</p>
      </ConsoleSection>
    </ConsoleLayout>
  );
}

function marketPenaltyLabel(penalties: MarketPenalty[]) {
  if (!penalties.length) {
    return "-";
  }
  const totalScore = penalties.reduce((sum, penalty) => sum + penalty.score, 0);
  const latest = penalties[0];
  return `${totalScore}점 · ${latest.reason}`;
}
function productPrice(product: Product) {
  return product.discount_price || product.base_price;
}

function auditTargetID(log: { settlement_id?: number; order_id?: number; order_code?: string }) {
  return log.order_code ?? log.order_id ?? log.settlement_id ?? "-";
}

function couponDiscountLabel(coupon: { discount_type: string; discount_value: number }) {
  return coupon.discount_type === "PERCENT"
    ? `${coupon.discount_value}%`
    : formatPrice(coupon.discount_value);
}

export function AdminHomePage() {
  const token = useAdminToken();
  const { data: dashboard } = useQuery({ queryKey: ["admin-dashboard"], queryFn: () => api.adminDashboard(token ?? ""), enabled: Boolean(token) });

  if (!token) {
    return <AdminAuthRequired />;
  }

  return (
    <ConsoleLayout title="Admin" subtitle="플랫폼 운영 콘솔" links={adminLinks}>
      <ConsoleHeader title="어드민 홈" description="플랫폼 전체 주문, 정산, 마켓 리스크를 한 화면에서 감시합니다." />
      <div className="mt-5">{dashboard ? <MetricGrid metrics={dashboard.metrics} /> : null}</div>

      <div className="mt-5">
        <ConsoleSection title="운영 알림" description="정산, 배송, 마켓 상태와 관련된 고위험 이슈입니다.">
          <div className="grid gap-3">
            {dashboard?.alerts.map((alert) => (
              <div key={alert.id} className="rounded-md bg-zinc-50 p-3">
                <div className="flex justify-between gap-4">
                  <p className="font-bold">{alert.title}</p>
                  <StatusBadge value={alert.severity} />
                </div>
                <p className="mt-1 text-sm text-muted">{alert.description}</p>
              </div>
            ))}
          </div>
        </ConsoleSection>
      </div>

      <ConsoleSection className="mt-5" title="최근 관리자 작업" description="서버가 제공하는 작업 대상과 시각만 표시합니다.">
        <DataTable
          columns={["대상", "작업", "일시"]}
          rows={(dashboard?.recent_actions ?? []).map((log) => [
            `${log.target_type} #${auditTargetID(log)}`,
            log.action,
            new Date(log.created_at).toLocaleString("ko-KR"),
          ])}
        />
      </ConsoleSection>
    </ConsoleLayout>
  );
}

export function AdminMembersPage() {
  const token = useAdminToken();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const queryClient = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["admin-members"], queryFn: () => api.adminMembers(token ?? ""), enabled: Boolean(token) });
  const approveSeller = useMutation({
    mutationFn: (memberID: number) => api.approveSeller(token ?? "", memberID),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-members"] }),
  });
  const rejectSeller = useMutation({
    mutationFn: (memberID: number) => api.rejectSeller(token ?? "", memberID),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-members"] }),
  });

  if (!token) {
    return <AdminAuthRequired />;
  }

  const filteredMembers = data.filter((member) => {
    const matchesQuery = !query || member.email.toLowerCase().includes(query.toLowerCase());
    const matchesRole = role === "ALL" || member.role === role;
    const matchesStatus = status === "ALL" || member.status === status;
    return matchesQuery && matchesRole && matchesStatus;
  });

  return (
    <ConsoleLayout title="Admin" subtitle="플랫폼 운영 콘솔" links={adminLinks}>
      <ConsoleHeader title="회원 관리" description="서버가 제공하는 회원 권한과 상태를 확인합니다. 관리자 회원 응답에는 포인트 잔액이 포함되지 않습니다." />
      <div className="mt-5">
        <SummaryStrip
          items={[
            { label: "전체 회원", value: `${data.length}명` },
            { label: "회원", value: `${data.filter((member) => member.role === "MEMBER").length}명` },
            { label: "셀러", value: `${data.filter((member) => member.role === "SELLER").length}명` },
            { label: "어드민", value: `${data.filter((member) => member.role === "ADMIN").length}명` },
          ]}
        />
      </div>
      <ConsoleSection className="mt-5" title="회원 목록">
        <FilterPanel>
          <FilterField label="검색">
            <SearchBox value={query} onChange={setQuery} placeholder="이메일 검색" />
          </FilterField>
          <FilterField label="권한">
            <select className="h-10 rounded-md border border-line bg-white px-3 text-sm font-bold" value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="ALL">전체 권한</option>
              <option value="MEMBER">MEMBER</option>
              <option value="SELLER">SELLER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </FilterField>
          <FilterField label="상태">
            <select className="h-10 rounded-md border border-line bg-white px-3 text-sm font-bold" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="ALL">전체 상태</option>
              <option value="ACTIVE">활성</option>
              <option value="PENDING">대기</option>
              <option value="SUSPENDED">정지</option>
              <option value="WITHDRAWN">탈퇴</option>
            </select>
          </FilterField>
        </FilterPanel>
        <div className="mt-4" />
        <DataTable
          columns={["회원", "권한", "상태", "알림", "가입일", "작업"]}
          rows={filteredMembers.map((member) => [
            <MemberName key="member" member={member} />,
            member.role,
            <StatusBadge key="status" value={member.status} />,
            member.notification_type,
            new Date(member.created_at).toLocaleDateString("ko-KR"),
            member.role === "SELLER" ? (
              <div key="actions" className="flex flex-wrap gap-2">
                <Button size="sm" disabled={approveSeller.isPending || member.status === "ACTIVE"} onClick={() => approveSeller.mutate(member.id)}>승인</Button>
                <Button size="sm" variant="secondary" disabled={rejectSeller.isPending || member.status === "SUSPENDED"} onClick={() => rejectSeller.mutate(member.id)}>거절</Button>
              </div>
            ) : "-",
          ])}
        />
      </ConsoleSection>
    </ConsoleLayout>
  );
}

export function AdminMarketsPage() {
  const token = useAdminToken();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [selectedMarketID, setSelectedMarketID] = useState<number | null>(null);
  const [penaltyReason, setPenaltyReason] = useState("배송 지연 반복에 따른 페널티 부여");
  const [penaltyScore, setPenaltyScore] = useState(10);

  const { data = [] } = useQuery({ queryKey: ["admin-markets"], queryFn: () => api.adminMarkets(token ?? ""), enabled: Boolean(token), meta: { consoleDataRole: "primary" } });
  const penaltyQueries = useQueries({
    queries: data.map((market) => ({
      queryKey: ["admin-market-penalties", market.id],
      queryFn: () => api.adminMarketPenalties(token ?? "", market.id),
      enabled: Boolean(token),
    })),
  });
  const penaltiesByMarketID = new Map(data.map((market, index) => [market.id, penaltyQueries[index]?.data ?? []]));
  const selectedMarket = data.find((market) => market.id === selectedMarketID) ?? data[0];
  const penaltyMutation = useMutation({
    mutationFn: () =>
      api.adminMutation(token ?? "", `/api/v1/admin/markets/${selectedMarket?.id ?? 0}/penalties`, {
        reason: penaltyReason,
        score: penaltyScore,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-market-penalties", selectedMarket?.id] });
    },
  });

  if (!token) {
    return <AdminAuthRequired />;
  }

  const filteredMarkets = data.filter((market) => {
    const matchesQuery = !query || market.name.toLowerCase().includes(query.toLowerCase()) || market.tags?.some((tag) => tag.toLowerCase().includes(query.toLowerCase()));
    const matchesStatus = status === "ALL" || market.status === status;
    return matchesQuery && matchesStatus;
  });

  return (
    <ConsoleLayout title="Admin" subtitle="플랫폼 운영 콘솔" links={adminLinks}>
      <ConsoleHeader title="마켓 관리" description="마켓 상태, 팔로워, 태그를 보고 운영 리스크를 확인합니다." />
      <ConsoleSection className="mt-5" title="페널티 부여" description="마켓 운영 제재는 사유와 점수를 함께 기록합니다.">
        <div className="grid gap-3 md:grid-cols-[1fr_120px]">
          <select
            className="h-11 rounded-md border border-line bg-white px-3 text-sm font-bold"
            value={selectedMarket?.id ?? ""}
            onChange={(event) => setSelectedMarketID(Number(event.target.value))}
          >
            {data.map((market) => (
              <option key={market.id} value={market.id}>{market.name}</option>
            ))}
          </select>
          <input
            type="number"
            className="h-11 rounded-md border border-line px-3 text-sm outline-none"
            value={penaltyScore}
            min={1}
            onChange={(event) => setPenaltyScore(Number(event.target.value))}
            aria-label="페널티 점수"
          />
        </div>
        <div className="mt-3 flex flex-col gap-2 md:flex-row">
          <input
            value={penaltyReason}
            onChange={(event) => setPenaltyReason(event.target.value)}
            className="h-11 flex-1 rounded-md border border-line px-3 text-sm outline-none"
            aria-label="페널티 사유"
          />
          <Button disabled={!selectedMarket || !penaltyReason || penaltyMutation.isPending} onClick={() => penaltyMutation.mutate()}>
            {penaltyMutation.isPending ? "기록 중" : "페널티 부여"}
          </Button>
        </div>
        {penaltyMutation.error ? <p className="mt-3 text-sm font-bold text-brand">{penaltyMutation.error.message}</p> : null}
      </ConsoleSection>
      <ConsoleSection className="mt-5" title="마켓 목록">
        <FilterPanel>
          <FilterField label="검색">
            <SearchBox value={query} onChange={setQuery} placeholder="마켓명 또는 태그 검색" />
          </FilterField>
          <FilterField label="상태">
            <select className="h-10 rounded-md border border-line bg-white px-3 text-sm font-bold" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="ALL">전체 상태</option>
              <option value="OPEN">운영중</option>
              <option value="CLOSED">운영 종료</option>
              <option value="HIDE">숨김</option>
              <option value="EXIT">퇴점</option>
            </select>
          </FilterField>
        </FilterPanel>
        <div className="mt-4" />
        <DataTable
          columns={["마켓", "팔로워", "상태", "태그", "페널티", "운영"]}
          rows={filteredMarkets.map((market) => [
            <MarketName key="market" market={market} />,
            market.follower_count == null ? "-" : formatFollowerCount(market.follower_count),
            <StatusBadge key="status" value={market.status} />,
            market.tags?.join(", ") ?? "-",
            marketPenaltyLabel(penaltiesByMarketID.get(market.id) ?? []),
            <Button key="select" variant="secondary" size="sm" onClick={() => setSelectedMarketID(market.id)}>선택</Button>,
          ])}
        />
      </ConsoleSection>
    </ConsoleLayout>
  );
}

export function AdminProductsPage() {
  const token = useAdminToken();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [marketID, setMarketID] = useState("ALL");
  const { data = [] } = useQuery({ queryKey: ["admin-products"], queryFn: () => api.adminProducts(token ?? ""), enabled: Boolean(token), meta: { consoleDataRole: "primary" } });
  const { data: markets = [] } = useQuery({ queryKey: ["admin-markets"], queryFn: () => api.adminMarkets(token ?? ""), enabled: Boolean(token) });

  if (!token) {
    return <AdminAuthRequired />;
  }

  const marketNameByID = new Map(markets.map((market) => [market.id, market.name]));
  const products = data.map((product) => ({ ...product, market_name: marketNameByID.get(product.market_id) ?? `마켓 #${product.market_id}` }));
  const marketOptions = Array.from(new Map(products.map((product) => [product.market_id, product.market_name ?? `마켓 #${product.market_id}`])).entries());
  const filteredProducts = products.filter((product) => {
    const matchesQuery = !query || product.name.toLowerCase().includes(query.toLowerCase()) || product.market_name?.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "ALL" || product.status === status;
    const matchesMarket = marketID === "ALL" || product.market_id === Number(marketID);
    return matchesQuery && matchesStatus && matchesMarket;
  });
  const expensiveProducts = [...products].sort((a, b) => productPrice(b) - productPrice(a)).slice(0, 3);

  return (
    <ConsoleLayout title="Admin" subtitle="플랫폼 운영 콘솔" links={adminLinks}>
      <ConsoleHeader title="상품 관리" description="상품 판매 상태, 마켓, 가격을 점검하고 이상 상품을 빠르게 찾습니다." />
      <div className="mt-5 grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
        <ConsoleSection title="가격 상위 상품">
          <div className="grid gap-3">
            {expensiveProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between gap-3 rounded-md bg-zinc-50 p-3">
                <ProductName product={product} />
                <p className="font-black">{formatPrice(productPrice(product))}</p>
              </div>
            ))}
          </div>
        </ConsoleSection>
        <ConsoleSection title="상품 목록">
          <FilterPanel>
            <FilterField label="검색">
              <SearchBox value={query} onChange={setQuery} placeholder="상품명 또는 마켓 검색" />
            </FilterField>
            <FilterField label="마켓">
              <select className="h-10 rounded-md border border-line bg-white px-3 text-sm font-bold" value={marketID} onChange={(event) => setMarketID(event.target.value)}>
                <option value="ALL">전체 마켓</option>
                {marketOptions.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </FilterField>
            <FilterField label="상태">
              <select className="h-10 rounded-md border border-line bg-white px-3 text-sm font-bold" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="ALL">전체 상태</option>
                <option value="SELLING">판매중</option>
                <option value="SOLD_OUT">품절</option>
              </select>
            </FilterField>
          </FilterPanel>
          <div className="mt-4" />
          <DataTable
            columns={["상품", "마켓", "가격", "할인", "상태"]}
            rows={filteredProducts.map((product) => [
              <ProductName key="product" product={product} />,
              product.market_name,
              formatPrice(productPrice(product)),
              product.discount_price ? formatPrice(product.base_price - product.discount_price) : "-",
              <StatusBadge key="status" value={product.status} />,
            ])}
          />
        </ConsoleSection>
      </div>
    </ConsoleLayout>
  );
}

export function AdminOrdersPage() {
  const token = useAdminToken();
  const queryClient = useQueryClient();
  const effectiveToken = token ?? "";
  const [selectedOrderCode, setSelectedOrderCode] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const { data = [] } = useQuery({ queryKey: ["admin-orders"], queryFn: () => api.adminOrders(effectiveToken), enabled: Boolean(token) });
  const forceCancel = useMutation({
    mutationFn: () => {
      if (!selectedOrderCode) {
        throw new Error("취소할 주문을 선택해 주세요.");
      }
      return api.forceCancelOrder(effectiveToken, selectedOrderCode);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-orders"] }),
  });

  if (!token) {
    return <AdminAuthRequired />;
  }

  const filteredOrders = data.filter((order) => {
    const matchesQuery = !query || order.order_code.toLowerCase().includes(query.toLowerCase()) || firstOrderItem(order)?.product?.name.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "ALL" || order.status === status;
    return matchesQuery && matchesStatus;
  });

  return (
    <ConsoleLayout title="Admin" subtitle="플랫폼 운영 콘솔" links={adminLinks}>
      <ConsoleHeader title="주문 관리" description="주문 상태와 서버 확정 결제 금액을 확인합니다." />
      <ConsoleSection className="mt-5" title="주문 강제 취소" description="현재 서버는 취소 사유를 저장하지 않으므로 주문 상태 변경만 수행합니다.">
        <div className="flex flex-col gap-2 md:flex-row">
          <select className="h-11 rounded-md border border-line bg-white px-3 text-sm font-bold" value={selectedOrderCode} onChange={(event) => setSelectedOrderCode(event.target.value)}>
            <option value="">주문 선택</option>
            {data.map((order) => <option key={order.order_code} value={order.order_code}>{order.order_code}</option>)}
          </select>
          <Button disabled={!selectedOrderCode || forceCancel.isPending} onClick={() => forceCancel.mutate()}>
            {forceCancel.isPending ? "처리 중" : "강제 취소"}
          </Button>
        </div>
        {forceCancel.data ? <p className="mt-3 text-sm font-bold text-brand">주문 상태를 취소로 변경했습니다.</p> : null}
        {forceCancel.error ? <p className="mt-3 text-sm font-bold text-brand">{forceCancel.error.message}</p> : null}
      </ConsoleSection>
      <ConsoleSection className="mt-5" title="주문 목록">
        <FilterPanel>
          <FilterField label="검색">
            <SearchBox value={query} onChange={setQuery} placeholder="주문번호 또는 상품 검색" />
          </FilterField>
          <FilterField label="상태">
            <select className="h-10 rounded-md border border-line bg-white px-3 text-sm font-bold" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="ALL">전체 상태</option>
              <option value="PAYMENT_PENDING">결제 대기</option>
              <option value="PAID">결제 완료</option>
              <option value="PLACED">주문 접수</option>
              <option value="SHIPPED">배송중</option>
              <option value="DELIVERED">배송 완료</option>
              <option value="COMPLETED">구매 확정</option>
              <option value="CANCELLED">취소</option>
            </select>
          </FilterField>
        </FilterPanel>
        <div className="mt-4" />
        <DataTable
          columns={["주문", "대표 상품", "회원", "금액", "상태", "작업"]}
          rows={filteredOrders.map((order) => {
            const amount = order.total_order_price - order.total_discount_price - order.used_point;
            return [
              <span key="code" className="text-xs font-black">{order.order_code}</span>,
              firstOrderItem(order)?.product?.name ?? "주문 상품",
              order.member_id ?? "-",
              formatPrice(amount),
              <StatusBadge key="status" value={order.status} />,
              <Button key="select" size="sm" variant="secondary" onClick={() => setSelectedOrderCode(order.order_code)}>선택</Button>,
            ];
          })}
        />
      </ConsoleSection>
    </ConsoleLayout>
  );
}

export function AdminSettlementsPage() {
  const token = useAdminToken();
  const queryClient = useQueryClient();
  const effectiveToken = token ?? "";
  const [selectedSettlementID, setSelectedSettlementID] = useState<number | null>(null);
  const [status, setStatus] = useState("ALL");
  const { data = [] } = useQuery({ queryKey: ["admin-settlements"], queryFn: () => api.adminSettlements(effectiveToken), enabled: Boolean(token), meta: { consoleDataRole: "primary" } });
  const { data: markets = [] } = useQuery({ queryKey: ["admin-markets"], queryFn: () => api.adminMarkets(effectiveToken), enabled: Boolean(token) });
  const markPaid = useMutation({
    mutationFn: () => {
      if (!selectedSettlementID) {
        throw new Error("지급 처리할 정산 건을 선택해 주세요.");
      }
      return api.markSettlementPaid(effectiveToken, selectedSettlementID);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-settlements"] }),
  });

  if (!token) {
    return <AdminAuthRequired />;
  }

  const marketNameByID = new Map(markets.map((market) => [market.id, market.name]));
  const settlements = data.map((item) => ({ ...item, market_name: marketNameByID.get(item.market_id) ?? `마켓 #${item.market_id}` }));
  const filteredSettlements = status === "ALL" ? settlements : settlements.filter((item) => item.status === status);

  return (
    <ConsoleLayout title="Admin" subtitle="플랫폼 운영 콘솔" links={adminLinks}>
      <ConsoleHeader title="정산 관리" description="정산 금액, 제외 건과 서버가 제공하는 지급 상태를 관리합니다." />
      <div className="mt-5">
        <SummaryStrip
          items={[
            { label: "정산 대상", value: `${settlements.length}건` },
            { label: "지급 대기", value: `${settlements.filter((item) => item.status === "PREPARED").length}건` },
            { label: "정산 제외", value: `${settlements.filter((item) => item.status === "EXCLUDED").length}건` },
            { label: "총 지급액", value: formatPrice(settlements.reduce((sum, item) => sum + item.final_settlement_amount, 0)) },
          ]}
        />
      </div>
      <ConsoleSection className="mt-5" title="지급 완료 처리" description="서버가 제공하는 정산 상태 변경만 수행합니다. 사유 저장은 지원되지 않습니다.">
        <div className="flex flex-col gap-2 md:flex-row">
          <select className="h-11 rounded-md border border-line bg-white px-3 text-sm font-bold" value={selectedSettlementID ?? ""} onChange={(event) => setSelectedSettlementID(Number(event.target.value) || null)}>
            <option value="">정산 선택</option>
            {settlements.map((item) => <option key={item.id} value={item.id}>{item.market_name} · {item.target_month}</option>)}
          </select>
          <Button disabled={!selectedSettlementID || markPaid.isPending} onClick={() => markPaid.mutate()}>
            {markPaid.isPending ? "처리 중" : "지급 완료"}
          </Button>
        </div>
        {markPaid.data ? <p className="mt-3 text-sm font-bold text-brand">정산 상태를 지급 완료로 변경했습니다.</p> : null}
        {markPaid.error ? <p className="mt-3 text-sm font-bold text-brand">{markPaid.error.message}</p> : null}
      </ConsoleSection>
      <ConsoleSection className="mt-5" title="정산 목록" action={<select className="h-10 rounded-md border border-line bg-white px-3 text-sm font-bold" value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">전체 상태</option><option value="PREPARED">지급 대기</option><option value="CONFIRMED">지급 확정</option><option value="PAID">지급 완료</option><option value="EXCLUDED">정산 제외</option></select>}>
        <DataTable
          columns={["마켓", "월", "매출", "수수료", "지급액", "상태", "작업"]}
          rows={filteredSettlements.map((item) => [
            item.market_name,
            item.target_month,
            formatPrice(item.total_sales_amount),
            formatPrice(item.commission_amount),
            formatPrice(item.final_settlement_amount),
            <StatusBadge key="status" value={item.status} />,
            <Button key="select" size="sm" variant="secondary" disabled={item.status === "PAID"} onClick={() => setSelectedSettlementID(item.id)}>선택</Button>,
          ])}
        />
      </ConsoleSection>
    </ConsoleLayout>
  );
}

export function AdminCouponsPage() {
  const token = useAdminToken();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [targetMemberID, setTargetMemberID] = useState<number | null>(null);
  const { data = [] } = useQuery({ queryKey: ["admin-coupons", targetMemberID], queryFn: () => api.adminCoupons(token ?? "", targetMemberID), enabled: Boolean(token), meta: { consoleDataRole: "primary" } });
  const issueCoupon = useMutation({
    mutationFn: (couponID: number) => {
      if (!targetMemberID) {
        throw new Error("쿠폰을 발급할 회원을 선택해 주세요.");
      }
      return api.issueCouponToMember(token ?? "", couponID, targetMemberID);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-coupons", targetMemberID] });
    },
  });

  if (!token) {
    return <AdminAuthRequired />;
  }

  const coupons = data;
  const filteredCoupons = coupons.filter((coupon) => {
    const matchesQuery = !query || coupon.name.toLowerCase().includes(query.toLowerCase()) || coupon.condition_text?.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "ALL"
      || coupon.definition_status === status
      || coupon.issuance_status === status
      || coupon.user_coupon_status === status;
    return matchesQuery && matchesStatus;
  });

  return (
    <ConsoleLayout title="Admin" subtitle="플랫폼 운영 콘솔" links={adminLinks}>
      <ConsoleHeader title="쿠폰 관리" description="발급 가능한 쿠폰을 조회하고 회원을 선택해 발급 처리합니다. 정의 활성 상태는 현재 서버에서 제공하지 않습니다." />
      <div className="mt-5">
        <SummaryStrip
          items={[
            { label: "쿠폰 수", value: `${coupons.length}개` },
            { label: "회원 발급됨", value: `${coupons.filter((coupon) => coupon.user_coupon_status === "ISSUED").length}개` },
            { label: "발급 가능", value: `${coupons.filter((coupon) => coupon.issuance_status === "ISSUABLE").length}개` },
            { label: "정의 상태", value: "서버 미제공" },
          ]}
        />
      </div>
      <ConsoleSection className="mt-5" title="쿠폰 발급 대상" description="발급 버튼을 누르면 선택된 회원에게 발급하는 흐름으로 처리됩니다.">
        <input
          className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm font-bold md:w-96"
          type="number"
          min={1}
          value={targetMemberID ?? ""}
          onChange={(event) => setTargetMemberID(Number(event.target.value) || null)}
          placeholder="발급할 회원 번호"
        />
        {issueCoupon.data ? (
          <p className="mt-3 text-sm font-bold text-brand">
            회원 #{issueCoupon.data.member_id}에게 쿠폰 #{issueCoupon.data.coupon_id}을 발급했습니다.
          </p>
        ) : null}
        {issueCoupon.error ? <p className="mt-3 text-sm font-bold text-brand">{issueCoupon.error.message}</p> : null}
      </ConsoleSection>
      <ConsoleSection className="mt-5" title="쿠폰 목록">
        <FilterPanel>
          <FilterField label="검색">
            <SearchBox value={query} onChange={setQuery} placeholder="쿠폰명 또는 조건 검색" />
          </FilterField>
          <FilterField label="상태">
            <select className="h-10 rounded-md border border-line bg-white px-3 text-sm font-bold" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="ALL">전체 상태</option>
              <option value="ISSUABLE">발급 가능</option>
              <option value="SCHEDULED">발급 예정</option>
              <option value="ENDED">발급 종료</option>
              <option value="SOLD_OUT">소진</option>
              <option value="INACTIVE">발급 비활성</option>
              <option value="ISSUED">회원 발급됨</option>
              <option value="USED">보유·사용됨</option>
            </select>
          </FilterField>
        </FilterPanel>
        <div className="mt-4" />
        <DataTable
          columns={["쿠폰", "할인", "최소 주문", "조건", "만료", "상태", "작업"]}
          rows={filteredCoupons.map((coupon) => [
            coupon.name,
            couponDiscountLabel(coupon),
            formatPrice(coupon.min_order_amount),
            coupon.condition_text ?? "-",
            coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString("ko-KR") : "-",
            <div key="status" className="flex flex-wrap items-center gap-1">
              {coupon.definition_status
                ? <StatusBadge value={coupon.definition_status} />
                : <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-bold text-muted">정의 상태: 서버 미제공</span>}
              {coupon.issuance_status ? <StatusBadge value={coupon.issuance_status} /> : null}
              {coupon.user_coupon_status ? <StatusBadge value={coupon.user_coupon_status} /> : null}
            </div>,
            <Button
              key="issue"
              size="sm"
              disabled={!targetMemberID || coupon.issuance_status !== "ISSUABLE" || Boolean(coupon.user_coupon_status) || issueCoupon.isPending}
              onClick={() => issueCoupon.mutate(coupon.id)}
            >
              {coupon.user_coupon_status ? "발급됨" : issueCoupon.isPending ? "발급 중" : "발급"}
            </Button>,
          ])}
        />
      </ConsoleSection>
    </ConsoleLayout>
  );
}

export function AdminAuditLogsPage() {
  const token = useAdminToken();
  const [query, setQuery] = useState("");
  const { data = [] } = useQuery({ queryKey: ["admin-audit-logs"], queryFn: () => api.adminAuditLogs(token ?? ""), enabled: Boolean(token) });

  if (!token) {
    return <AdminAuthRequired />;
  }

  const filteredLogs = data.filter((log) => !query || `${log.target_type} ${log.action} ${log.settlement_id ?? ""}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <ConsoleLayout title="Admin" subtitle="플랫폼 운영 콘솔" links={adminLinks}>
      <ConsoleHeader title="감사 로그" description="서버가 제공하는 정산 관리자 작업 필드만 표시합니다." />
      <ConsoleSection className="mt-5" action={<SearchBox value={query} onChange={setQuery} placeholder="대상 또는 작업 검색" />}>
        <DataTable
          columns={["관리자", "대상", "작업", "일시"]}
          rows={filteredLogs.map((log) => [
            `#${log.admin_id}`,
            `${log.target_type} #${auditTargetID(log)}`,
            log.action,
            new Date(log.created_at).toLocaleString("ko-KR"),
          ])}
        />
      </ConsoleSection>
    </ConsoleLayout>
  );
}

export function AdminCMSPage() {
  const token = useAdminToken();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("ALL");
  const [editingID, setEditingID] = useState<number | null>(null);
  const [categoryEditingID, setCategoryEditingID] = useState<number | null>(null);
  const [sectionEditingID, setSectionEditingID] = useState<number | null>(null);
  const [form, setForm] = useState(emptyCMSCarouselForm());
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm());
  const [sectionForm, setSectionForm] = useState(emptyHomeSectionForm());

  const { data = [] } = useQuery({ queryKey: ["admin-carousels"], queryFn: () => api.adminCarousels(token ?? ""), enabled: Boolean(token) });
  const { data: categories = [] } = useQuery({ queryKey: ["admin-categories"], queryFn: () => api.adminCategories(token ?? ""), enabled: Boolean(token) });
  const { data: homeSections = [] } = useQuery({ queryKey: ["admin-home-sections"], queryFn: () => api.adminHomeSections(token ?? ""), enabled: Boolean(token) });

  const saveCarousel = useMutation({
    mutationFn: async () => {
      const payload = cmsCarouselPayload(form);
      if (editingID) {
        await api.updateCarousel(token ?? "", editingID, payload);
      } else {
        await api.createCarousel(token ?? "", payload);
      }
    },
    onSuccess: () => {
      setEditingID(null);
      setForm(emptyCMSCarouselForm());
      void queryClient.invalidateQueries({ queryKey: ["admin-carousels"] });
    },
  });
  const deactivateCarousel = useMutation({
    mutationFn: (carouselID: number) => api.deactivateCarousel(token ?? "", carouselID),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-carousels"] }),
  });
  const saveCategory = useMutation({
    mutationFn: () => {
      const payload = categoryPayload(categoryForm);
      return categoryEditingID ? api.updateCategory(token ?? "", categoryEditingID, payload) : api.createCategory(token ?? "", payload);
    },
    onSuccess: () => {
      setCategoryEditingID(null);
      setCategoryForm(emptyCategoryForm());
      void queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
  });
  const deleteCategory = useMutation({
    mutationFn: (categoryID: number) => api.deleteCategory(token ?? "", categoryID),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-categories"] }),
  });
  const reorderCategories = useMutation({
    mutationFn: (items: { id: number; display_order: number }[]) => api.reorderCategories(token ?? "", items),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-categories"] }),
  });
  const saveHomeSection = useMutation({
    mutationFn: () => {
      const payload = homeSectionPayload(sectionForm);
      return sectionEditingID ? api.updateHomeSection(token ?? "", sectionEditingID, payload) : api.createHomeSection(token ?? "", payload);
    },
    onSuccess: () => {
      setSectionEditingID(null);
      setSectionForm(emptyHomeSectionForm());
      void queryClient.invalidateQueries({ queryKey: ["admin-home-sections"] });
    },
  });
  const deleteHomeSection = useMutation({
    mutationFn: (sectionID: number) => api.deleteHomeSection(token ?? "", sectionID),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-home-sections"] }),
  });
  const reorderHomeSections = useMutation({
    mutationFn: (items: { id: number; sequence: number }[]) => api.reorderHomeSections(token ?? "", items),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-home-sections"] }),
  });

  if (!token) {
    return <AdminAuthRequired />;
  }

  const filteredCarousels = status === "ALL" ? data : data.filter((carousel) => carousel.status === status);
  const sortedCategories = [...categories].sort((a, b) => a.level - b.level || a.sort_order - b.sort_order || a.id - b.id);
  const sortedSections = [...homeSections].sort((a, b) => a.sequence - b.sequence || a.id - b.id);

  function editCarousel(carousel: (typeof data)[number]) {
    setEditingID(carousel.id);
    setForm({
      title: carousel.title,
      image_url: carousel.image_url,
      target_type: carousel.target_type ?? "PRODUCT",
      target_id: String(carousel.target_id ?? ""),
      display_order: String(carousel.display_order ?? 0),
      status: carousel.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
      starts_at: toDateTimeLocal(carousel.starts_at),
      ends_at: toDateTimeLocal(carousel.ends_at),
    });
  }

  function editCategory(category: CommerceCategory) {
    setCategoryEditingID(category.id);
    setCategoryForm({ parent_id: category.parent_id ? String(category.parent_id) : "", name: category.name, slug: category.slug, display_order: String(category.sort_order ?? 0) });
  }

  function editHomeSection(section: CMSHomeSection) {
    setSectionEditingID(section.id);
    setSectionForm({ sequence: String(section.sequence ?? 0), title: section.title, description: section.description ?? "", api_url: section.api_url, status: section.status === "ACTIVE" ? "ACTIVE" : "INACTIVE" });
  }

  function moveCategory(category: CommerceCategory, direction: -1 | 1) {
    const siblings = categories.filter((item) => (item.parent_id ?? 0) === (category.parent_id ?? 0)).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    const items = shiftedOrder(siblings, category.id, direction).map((item, index) => ({ id: item.id, display_order: index }));
    reorderCategories.mutate(items);
  }

  function moveSection(section: CMSHomeSection, direction: -1 | 1) {
    const items = shiftedOrder(sortedSections, section.id, direction).map((item, index) => ({ id: item.id, sequence: index }));
    reorderHomeSections.mutate(items);
  }

  return (
    <ConsoleLayout title="Admin" subtitle="플랫폼 운영 콘솔" links={adminLinks}>
      <ConsoleHeader
        title="CMS 운영"
        description="홈 구좌, 이벤트 캐러셀, 카테고리 노출 순서를 백엔드 설정 기준으로 관리합니다."
        action={<select className="h-10 rounded-md border border-line bg-white px-3 text-sm font-bold" value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">전체 상태</option><option value="ACTIVE">활성</option><option value="INACTIVE">비활성</option></select>}
      />

      <ConsoleSection className="mt-5" title={sectionEditingID ? "홈 구좌 수정" : "홈 구좌 등록"}>
        <div className="grid gap-3 lg:grid-cols-[90px_1fr_1.2fr_1.1fr_130px_auto]">
          <input type="number" className="h-11 rounded-md border border-line px-3 text-sm outline-none" value={sectionForm.sequence} onChange={(event) => setSectionForm((current) => ({ ...current, sequence: event.target.value }))} aria-label="구좌 순서" />
          <input className="h-11 rounded-md border border-line px-3 text-sm outline-none" value={sectionForm.title} onChange={(event) => setSectionForm((current) => ({ ...current, title: event.target.value }))} placeholder="구좌명" aria-label="구좌명" />
          <input className="h-11 rounded-md border border-line px-3 text-sm outline-none" value={sectionForm.description} onChange={(event) => setSectionForm((current) => ({ ...current, description: event.target.value }))} placeholder="설명" aria-label="구좌 설명" />
          <input className="h-11 rounded-md border border-line px-3 text-sm outline-none" value={sectionForm.api_url} onChange={(event) => setSectionForm((current) => ({ ...current, api_url: event.target.value }))} placeholder="/api/v1/products/popular" aria-label="API URL" />
          <select className="h-11 rounded-md border border-line bg-white px-3 text-sm font-bold" value={sectionForm.status} onChange={(event) => setSectionForm((current) => ({ ...current, status: event.target.value }))} aria-label="구좌 상태"><option value="ACTIVE">활성</option><option value="INACTIVE">비활성</option></select>
          <div className="flex gap-2">
            <Button disabled={!sectionForm.title || !sectionForm.api_url || saveHomeSection.isPending} onClick={() => saveHomeSection.mutate()}>{saveHomeSection.isPending ? "저장 중" : sectionEditingID ? "수정" : "등록"}</Button>
            {sectionEditingID ? <Button variant="secondary" onClick={() => { setSectionEditingID(null); setSectionForm(emptyHomeSectionForm()); }}>취소</Button> : null}
          </div>
        </div>
        {saveHomeSection.error ? <p className="mt-3 text-sm font-bold text-brand">{saveHomeSection.error.message}</p> : null}
        <div className="mt-4" />
        <DataTable
          columns={["순서", "구좌", "API", "상태", "작업"]}
          rows={sortedSections.map((section) => [
            section.sequence,
            <div key="section"><p className="font-bold">{section.title}</p><p className="text-xs text-muted">{section.description}</p></div>,
            section.api_url,
            <StatusBadge key="status" value={section.status} />,
            <div key="actions" className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={() => moveSection(section, -1)}>위</Button><Button size="sm" variant="secondary" onClick={() => moveSection(section, 1)}>아래</Button><Button size="sm" onClick={() => editHomeSection(section)}>수정</Button><Button size="sm" variant="secondary" disabled={deleteHomeSection.isPending} onClick={() => deleteHomeSection.mutate(section.id)}>삭제</Button></div>,
          ])}
        />
      </ConsoleSection>

      <ConsoleSection className="mt-5" title={categoryEditingID ? "카테고리 수정" : "카테고리 등록"}>
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_100px_auto]">
          <input className="h-11 rounded-md border border-line px-3 text-sm outline-none" value={categoryForm.name} onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))} placeholder="카테고리명" aria-label="카테고리명" />
          <input className="h-11 rounded-md border border-line px-3 text-sm outline-none" value={categoryForm.slug} onChange={(event) => setCategoryForm((current) => ({ ...current, slug: event.target.value }))} placeholder="slug" aria-label="카테고리 slug" />
          <select className="h-11 rounded-md border border-line bg-white px-3 text-sm font-bold" value={categoryForm.parent_id} onChange={(event) => setCategoryForm((current) => ({ ...current, parent_id: event.target.value }))} aria-label="상위 카테고리">
            <option value="">최상위</option>
            {categories.filter((category) => category.level < 3 && category.id !== categoryEditingID).map((category) => <option key={category.id} value={category.id}>{categoryPathLabel(category, categories)}</option>)}
          </select>
          <input type="number" className="h-11 rounded-md border border-line px-3 text-sm outline-none" value={categoryForm.display_order} onChange={(event) => setCategoryForm((current) => ({ ...current, display_order: event.target.value }))} aria-label="카테고리 순서" />
          <div className="flex gap-2">
            <Button disabled={!categoryForm.name || saveCategory.isPending} onClick={() => saveCategory.mutate()}>{saveCategory.isPending ? "저장 중" : categoryEditingID ? "수정" : "등록"}</Button>
            {categoryEditingID ? <Button variant="secondary" onClick={() => { setCategoryEditingID(null); setCategoryForm(emptyCategoryForm()); }}>취소</Button> : null}
          </div>
        </div>
        {saveCategory.error ? <p className="mt-3 text-sm font-bold text-brand">{saveCategory.error.message}</p> : null}
        {deleteCategory.error ? <p className="mt-3 text-sm font-bold text-brand">{deleteCategory.error.message}</p> : null}
        <div className="mt-4" />
        <DataTable
          columns={["순서", "카테고리", "slug", "단계", "작업"]}
          rows={sortedCategories.map((category) => [
            category.sort_order,
            <span key="name" className="font-bold">{categoryPathLabel(category, categories)}</span>,
            category.slug,
            `${category.level}단계`,
            <div key="actions" className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={() => moveCategory(category, -1)}>위</Button><Button size="sm" variant="secondary" onClick={() => moveCategory(category, 1)}>아래</Button><Button size="sm" onClick={() => editCategory(category)}>수정</Button><Button size="sm" variant="secondary" disabled={deleteCategory.isPending || categories.some((item) => item.parent_id === category.id)} onClick={() => deleteCategory.mutate(category.id)}>삭제</Button></div>,
          ])}
        />
      </ConsoleSection>

      <ConsoleSection className="mt-5" title={editingID ? "이벤트 캐러셀 수정" : "이벤트 캐러셀 등록"}>
        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_130px_110px]">
          <input className="h-11 rounded-md border border-line px-3 text-sm outline-none" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="제목" aria-label="캐러셀 제목" />
          <input className="h-11 rounded-md border border-line px-3 text-sm outline-none" value={form.image_url} onChange={(event) => setForm((current) => ({ ...current, image_url: event.target.value }))} placeholder="이미지 URL" aria-label="이미지 URL" />
          <select className="h-11 rounded-md border border-line bg-white px-3 text-sm font-bold" value={form.target_type} onChange={(event) => setForm((current) => ({ ...current, target_type: event.target.value }))} aria-label="대상 유형"><option value="PRODUCT">상품</option><option value="MARKET">마켓</option><option value="URL">URL</option></select>
          <input type="number" className="h-11 rounded-md border border-line px-3 text-sm outline-none" value={form.target_id} onChange={(event) => setForm((current) => ({ ...current, target_id: event.target.value }))} placeholder="대상 ID" aria-label="대상 ID" />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-[120px_150px_1fr_1fr_auto]">
          <input type="number" className="h-11 rounded-md border border-line px-3 text-sm outline-none" value={form.display_order} onChange={(event) => setForm((current) => ({ ...current, display_order: event.target.value }))} placeholder="순서" aria-label="노출 순서" />
          <select className="h-11 rounded-md border border-line bg-white px-3 text-sm font-bold" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} aria-label="노출 상태"><option value="ACTIVE">활성</option><option value="INACTIVE">비활성</option></select>
          <input type="datetime-local" className="h-11 rounded-md border border-line px-3 text-sm outline-none" value={form.starts_at} onChange={(event) => setForm((current) => ({ ...current, starts_at: event.target.value }))} aria-label="시작 일시" />
          <input type="datetime-local" className="h-11 rounded-md border border-line px-3 text-sm outline-none" value={form.ends_at} onChange={(event) => setForm((current) => ({ ...current, ends_at: event.target.value }))} aria-label="종료 일시" />
          <div className="flex gap-2"><Button disabled={!form.title || !form.image_url || saveCarousel.isPending} onClick={() => saveCarousel.mutate()}>{saveCarousel.isPending ? "저장 중" : editingID ? "수정 저장" : "등록"}</Button>{editingID ? <Button variant="secondary" onClick={() => { setEditingID(null); setForm(emptyCMSCarouselForm()); }}>취소</Button> : null}</div>
        </div>
        {saveCarousel.error ? <p className="mt-3 text-sm font-bold text-brand">{saveCarousel.error.message}</p> : null}
      </ConsoleSection>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {filteredCarousels.map((carousel) => (
          <ConsoleSection key={carousel.id}>
            <div className="relative aspect-[16/7] overflow-hidden rounded-md bg-zinc-100"><SafeImage src={carousel.image_url} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" /></div>
            <div className="mt-3 flex items-start justify-between gap-3"><div><p className="font-black">{carousel.title}</p><p className="mt-1 text-xs font-bold text-muted">순서 {carousel.display_order ?? 0} · {carousel.link_url}</p><p className="mt-1 text-xs font-bold text-muted">{cmsScheduleText(carousel.starts_at, carousel.ends_at)}</p></div><StatusBadge value={carousel.status} /></div>
            <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" onClick={() => editCarousel(carousel)}>수정</Button><Button size="sm" variant="secondary" disabled={deactivateCarousel.isPending || carousel.status !== "ACTIVE"} onClick={() => deactivateCarousel.mutate(carousel.id)}>비활성화</Button></div>
          </ConsoleSection>
        ))}
      </div>
    </ConsoleLayout>
  );
}
export function AdminTokenLookupPage() {
  const router = useRouter();
  const token = useAdminToken();
  const setSellerContext = useSessionStore((state) => state.setSellerContext);
  const [query, setQuery] = useState("");
  const { data: markets = [] } = useQuery({ queryKey: ["admin-markets"], queryFn: () => api.adminMarkets(token ?? ""), enabled: Boolean(token) });

  const enterSellerMutation = useMutation({
    mutationFn: (market: Market) => api.createSellerImpersonationToken(token ?? "", market.id),
    onSuccess: (response) => {
      setSellerContext({ marketID: response.market_id, marketName: response.market_name, token: response.access_token, expiresAt: response.expires_at });
      router.push("/seller");
    },
  });

  if (!token) {
    return <AdminAuthRequired />;
  }

  const filteredMarkets = markets.filter((market) => !query || market.name.toLowerCase().includes(query.toLowerCase()) || market.tags?.some((tag) => tag.toLowerCase().includes(query.toLowerCase())));

  function enterSeller(market: Market) {
    if (!token) {
      return;
    }
    enterSellerMutation.mutate(market);
  }

  return (
    <ConsoleLayout title="Admin" subtitle="플랫폼 운영 콘솔" links={adminLinks}>
      <ConsoleHeader title="셀러 화면 진입" description="관리자 권한으로 마켓 기준 셀러 화면에 진입합니다." />
      <ConsoleSection className="mt-5" title="마켓 목록" action={<SearchBox value={query} onChange={setQuery} placeholder="마켓명 또는 태그 검색" />}>
        <DataTable
          columns={["마켓", "상태", "작업"]}
          rows={filteredMarkets.map((market) => [
              <MarketName key="market" market={market} />,
              <StatusBadge key="status" value={market.status} />,
              <Button key="enter" size="sm" disabled={!token || enterSellerMutation.isPending} onClick={() => enterSeller(market)}>{enterSellerMutation.isPending ? "발급 중" : "셀러 페이지 진입"}</Button>,
          ])}
        />
      </ConsoleSection>
    </ConsoleLayout>
  );
}

function emptyCMSCarouselForm() {
  return {
    title: "",
    image_url: "",
    target_type: "PRODUCT",
    target_id: "",
    display_order: "0",
    status: "ACTIVE",
    starts_at: "",
    ends_at: "",
  };
}

function emptyCategoryForm() {
  return {
    parent_id: "",
    name: "",
    slug: "",
    display_order: "0",
  };
}

function categoryPayload(form: ReturnType<typeof emptyCategoryForm>) {
  return {
    parent_id: form.parent_id ? Number(form.parent_id) : null,
    name: form.name.trim(),
    slug: form.slug.trim(),
    display_order: Number(form.display_order) || 0,
  };
}

function emptyHomeSectionForm() {
  return {
    sequence: "0",
    title: "",
    description: "",
    api_url: "/api/v1/products/popular",
    status: "ACTIVE",
  };
}

function homeSectionPayload(form: ReturnType<typeof emptyHomeSectionForm>) {
  return {
    sequence: Number(form.sequence) || 0,
    title: form.title.trim(),
    description: form.description.trim(),
    api_url: form.api_url.trim(),
    status: form.status,
  };
}

function shiftedOrder<T extends { id: number }>(items: T[], id: number, direction: -1 | 1) {
  const next = [...items];
  const index = next.findIndex((item) => item.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= next.length) {
    return next;
  }
  const current = next[index];
  next[index] = next[target];
  next[target] = current;
  return next;
}

function categoryPathLabel(category: CommerceCategory, categories: CommerceCategory[]) {
  const names = [category.name];
  let parentID = category.parent_id;
  while (parentID) {
    const parent = categories.find((item) => item.id === parentID);
    if (!parent) {
      break;
    }
    names.unshift(parent.name);
    parentID = parent.parent_id;
  }
  return names.join(" / ");
}
function cmsCarouselPayload(form: ReturnType<typeof emptyCMSCarouselForm>) {
  return {
    title: form.title.trim(),
    image_url: form.image_url.trim(),
    target_type: form.target_type,
    target_id: Number(form.target_id) || 0,
    display_order: Number(form.display_order) || 0,
    status: form.status,
    starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : undefined,
    ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : undefined,
  };
}

function toDateTimeLocal(value?: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function cmsScheduleText(startsAt?: string | null, endsAt?: string | null) {
  if (!startsAt && !endsAt) {
    return "상시 노출";
  }
  const start = startsAt ? new Date(startsAt).toLocaleString("ko-KR") : "시작 즉시";
  const end = endsAt ? new Date(endsAt).toLocaleString("ko-KR") : "종료 없음";
  return `${start} ~ ${end}`;
}



function MemberName({ member }: { member: AdminMember }) {
  return (
    <div>
      <p className="font-bold">회원 #{member.id}</p>
      <p className="text-xs text-muted">{member.email}</p>
    </div>
  );
}

function MarketName({ market }: { market: Market }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-zinc-100">
        <SafeImage src={market.profile_image_url} alt="" fill sizes="48px" className="object-cover" />
      </div>
      <div className="min-w-0">
        <p className="truncate font-bold">{market.name}</p>
        <p className="line-clamp-1 text-xs text-muted">{market.description}</p>
      </div>
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
