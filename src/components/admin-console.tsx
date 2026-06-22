"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleDollarSign, ShoppingBag, Store, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { getEffectiveToken } from "@/lib/auth-token";
import { firstOrderItem } from "@/lib/order-utils";
import { useSessionStore } from "@/lib/session-store";
import type { Market, MemberProfile, Product } from "@/lib/types";
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

const adminLinks = [
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
];

function useAdminToken() {
  const token = useSessionStore((state) => state.accessToken);
  const role = useSessionStore((state) => state.role);
  if (role !== "ADMIN") {
    return null;
  }
  return getEffectiveToken(token);
}

function AdminAuthRequired() {
  return (
    <ConsoleLayout title="Admin" subtitle="플랫폼 운영 콘솔" links={adminLinks}>
      <ConsoleSection>
        <h2 className="text-2xl font-black">어드민 권한이 필요합니다</h2>
        <p className="mt-2 text-sm text-muted">어드민 계정으로 로그인한 사용자만 플랫폼 운영 콘솔에 접근할 수 있습니다.</p>
      </ConsoleSection>
    </ConsoleLayout>
  );
}

function productPrice(product: Product) {
  return product.discount_price || product.base_price;
}

function auditTargetID(log: { target_id?: number; settlement_id?: number }) {
  return log.target_id ?? log.settlement_id ?? "-";
}

function auditReason(log: { reason?: string }) {
  return log.reason || "-";
}

export function AdminHomePage() {
  const token = useAdminToken();
  const { data: dashboard } = useQuery({ queryKey: ["admin-dashboard"], queryFn: () => api.adminDashboard(token ?? ""), enabled: Boolean(token) });
  const { data: members = [] } = useQuery({ queryKey: ["admin-members"], queryFn: () => api.adminMembers(token ?? ""), enabled: Boolean(token) });
  const { data: markets = [] } = useQuery({ queryKey: ["admin-markets"], queryFn: () => api.adminMarkets(token ?? ""), enabled: Boolean(token) });
  const { data: orders = [] } = useQuery({ queryKey: ["admin-orders"], queryFn: () => api.adminOrders(token ?? ""), enabled: Boolean(token) });
  const { data: settlements = [] } = useQuery({ queryKey: ["admin-settlements"], queryFn: () => api.adminSettlements(token ?? ""), enabled: Boolean(token) });

  if (!token) {
    return <AdminAuthRequired />;
  }

  return (
    <ConsoleLayout title="Admin" subtitle="플랫폼 운영 콘솔" links={adminLinks}>
      <ConsoleHeader title="어드민 홈" description="플랫폼 전체 주문, 정산, 마켓 리스크를 한 화면에서 감시합니다." />
      <div className="mt-5">{dashboard ? <MetricGrid metrics={dashboard.metrics} /> : null}</div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
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
        <ConsoleSection title="플랫폼 스냅샷">
          <div className="grid gap-3">
            <AdminSignal icon={<Users size={18} />} label="회원" value={`${members.length}명`} />
            <AdminSignal icon={<Store size={18} />} label="활성 마켓" value={`${markets.filter((market) => market.status === "ACTIVE").length}개`} />
            <AdminSignal icon={<ShoppingBag size={18} />} label="주문" value={`${orders.length}건`} />
            <AdminSignal icon={<CircleDollarSign size={18} />} label="정산 검증" value={`${settlements.filter((item) => item.status !== "PAID").length}건`} />
          </div>
        </ConsoleSection>
      </div>

      <ConsoleSection className="mt-5" title="최근 감사 로그" description="민감 운영 작업은 사유와 함께 남아야 합니다.">
        <DataTable
          columns={["대상", "작업", "사유", "일시"]}
          rows={(dashboard?.recent_actions ?? []).map((log) => [
            `${log.target_type} #${auditTargetID(log)}`,
            log.action,
            auditReason(log),
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
  const { data = [] } = useQuery({ queryKey: ["admin-members"], queryFn: () => api.adminMembers(token ?? ""), enabled: Boolean(token) });

  if (!token) {
    return <AdminAuthRequired />;
  }

  const filteredMembers = data.filter((member) => {
    const matchesQuery = !query || member.email.toLowerCase().includes(query.toLowerCase()) || member.user_name?.toLowerCase().includes(query.toLowerCase());
    const matchesRole = role === "ALL" || member.role === role;
    const matchesStatus = status === "ALL" || member.status === status;
    return matchesQuery && matchesRole && matchesStatus;
  });

  return (
    <ConsoleLayout title="Admin" subtitle="플랫폼 운영 콘솔" links={adminLinks}>
      <ConsoleHeader title="회원 관리" description="회원 권한, 상태, 포인트를 확인하고 고객/셀러/관리자 계정을 구분합니다." />
      <div className="mt-5">
        <SummaryStrip
          items={[
            { label: "전체 회원", value: `${data.length}명` },
            { label: "고객", value: `${data.filter((member) => member.role === "CUSTOMER").length}명` },
            { label: "셀러", value: `${data.filter((member) => member.role === "SELLER").length}명` },
            { label: "어드민", value: `${data.filter((member) => member.role === "ADMIN").length}명` },
          ]}
        />
      </div>
      <ConsoleSection className="mt-5" title="회원 목록">
        <FilterPanel>
          <FilterField label="검색">
            <SearchBox value={query} onChange={setQuery} placeholder="이메일 또는 이름 검색" />
          </FilterField>
          <FilterField label="권한">
            <select className="h-10 rounded-md border border-line bg-white px-3 text-sm font-bold" value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="ALL">전체 권한</option>
              <option value="CUSTOMER">CUSTOMER</option>
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
            </select>
          </FilterField>
        </FilterPanel>
        <div className="mt-4" />
        <DataTable
          columns={["회원", "권한", "상태", "알림", "포인트", "가입일"]}
          rows={filteredMembers.map((member) => [
            <MemberName key="member" member={member} />,
            member.role,
            <StatusBadge key="status" value={member.status} />,
            member.notification_type,
            formatPrice(member.point_balance),
            new Date(member.created_at).toLocaleDateString("ko-KR"),
          ])}
        />
      </ConsoleSection>
    </ConsoleLayout>
  );
}

export function AdminMarketsPage() {
  const token = useAdminToken();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [selectedMarketID, setSelectedMarketID] = useState<number | null>(null);
  const [penaltyReason, setPenaltyReason] = useState("배송 지연 반복에 따른 페널티 부여");
  const [penaltyScore, setPenaltyScore] = useState(10);
  const [penaltyRecords, setPenaltyRecords] = useState<Record<number, { score: number; reason: string }>>({});
  const { data = [] } = useQuery({ queryKey: ["admin-markets"], queryFn: () => api.adminMarkets(token ?? ""), enabled: Boolean(token) });
  const selectedMarket = data.find((market) => market.id === selectedMarketID) ?? data[0];
  const penaltyMutation = useMutation({
    mutationFn: () =>
      api.adminMutation(token ?? "", `/api/v1/admin/markets/${selectedMarket?.id ?? 0}/penalties`, {
        reason: penaltyReason,
        score: penaltyScore,
      }),
    onSuccess: () => {
      if (selectedMarket) {
        setPenaltyRecords((current) => ({
          ...current,
          [selectedMarket.id]: { score: penaltyScore, reason: penaltyReason },
        }));
      }
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
        {selectedMarketID && penaltyRecords[selectedMarketID] ? (
          <p className="mt-3 text-sm font-bold text-brand">
            {selectedMarket?.name}에 {penaltyRecords[selectedMarketID].score}점 페널티를 기록했습니다.
          </p>
        ) : null}
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
              <option value="ACTIVE">활성</option>
              <option value="PENDING">대기</option>
              <option value="SUSPENDED">정지</option>
            </select>
          </FilterField>
        </FilterPanel>
        <div className="mt-4" />
        <DataTable
          columns={["마켓", "팔로워", "상태", "태그", "페널티", "운영"]}
          rows={filteredMarkets.map((market) => [
            <MarketName key="market" market={market} />,
            market.follower_count?.toLocaleString("ko-KR") ?? "-",
            <StatusBadge key="status" value={market.status} />,
            market.tags?.join(", ") ?? "-",
            penaltyRecords[market.id] ? `${penaltyRecords[market.id].score}점 · ${penaltyRecords[market.id].reason}` : "-",
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
  const { data = [] } = useQuery({ queryKey: ["admin-products"], queryFn: () => api.adminProducts(token ?? ""), enabled: Boolean(token) });

  if (!token) {
    return <AdminAuthRequired />;
  }

  const marketOptions = Array.from(new Map(data.map((product) => [product.market_id, product.market_name ?? `마켓 ${product.market_id}`])).entries());
  const filteredProducts = data.filter((product) => {
    const matchesQuery = !query || product.name.toLowerCase().includes(query.toLowerCase()) || product.market_name?.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "ALL" || product.status === status;
    const matchesMarket = marketID === "ALL" || product.market_id === Number(marketID);
    return matchesQuery && matchesStatus && matchesMarket;
  });
  const expensiveProducts = [...data].sort((a, b) => productPrice(b) - productPrice(a)).slice(0, 3);

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
  const effectiveToken = token ?? "";
  const [reason, setReason] = useState("고객 요청에 따른 운영 취소");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const { data = [] } = useQuery({ queryKey: ["admin-orders"], queryFn: () => api.adminOrders(effectiveToken), enabled: Boolean(token) });
  const forceCancel = useMutation({
    mutationFn: () =>
      api.adminMutation(effectiveToken, "/api/v1/admin/orders/ORD-20260605-0001/force-cancel", {
        reason,
      }),
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
      <ConsoleHeader title="주문 관리" description="주문 상태, 결제 금액, 배송지 정보를 보고 민감 작업은 사유와 함께 기록합니다." />
      <ConsoleSection className="mt-5" title="주문 강제 취소" description="강제 취소는 감사 로그 대상 작업입니다. 실제 연결 시 주문 선택과 권한 검증이 필요합니다.">
        <div className="flex flex-col gap-2 md:flex-row">
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="h-11 flex-1 rounded-md border border-line px-3 text-sm outline-none"
            aria-label="주문 강제 취소 사유"
          />
          <Button disabled={!reason || forceCancel.isPending} onClick={() => forceCancel.mutate()}>
            {forceCancel.isPending ? "처리 중" : "강제 취소 기록"}
          </Button>
        </div>
        {forceCancel.data ? <p className="mt-3 text-sm font-bold text-brand">감사 로그에 작업을 기록했습니다.</p> : null}
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
              <option value="PLACED">주문 접수</option>
              <option value="PAYMENT_COMPLETED">결제 완료</option>
              <option value="SHIPPING">배송중</option>
              <option value="DELIVERED">배송 완료</option>
            </select>
          </FilterField>
        </FilterPanel>
        <div className="mt-4" />
        <DataTable
          columns={["주문", "대표 상품", "회원", "배송지", "금액", "상태"]}
          rows={filteredOrders.map((order) => {
            const amount = order.total_order_price - order.total_discount_price - order.used_point;
            return [
              <span key="code" className="text-xs font-black">{order.order_code}</span>,
              firstOrderItem(order)?.product?.name ?? "주문 상품",
              order.member_id ?? "-",
              order.shipping_address ? `${order.shipping_address.receiver} · ${order.shipping_address.line1}` : "-",
              formatPrice(amount),
              <StatusBadge key="status" value={order.status} />,
            ];
          })}
        />
      </ConsoleSection>
    </ConsoleLayout>
  );
}

export function AdminSettlementsPage() {
  const token = useAdminToken();
  const effectiveToken = token ?? "";
  const [reason, setReason] = useState("정산 검증 완료 후 지급 처리");
  const [status, setStatus] = useState("ALL");
  const { data = [] } = useQuery({ queryKey: ["admin-settlements"], queryFn: () => api.adminSettlements(effectiveToken), enabled: Boolean(token) });
  const markPaid = useMutation({
    mutationFn: () =>
      api.adminMutation(effectiveToken, "/api/v1/admin/settlements/1/mark-paid", {
        reason,
        status: "PAID",
      }),
  });

  if (!token) {
    return <AdminAuthRequired />;
  }

  const filteredSettlements = status === "ALL" ? data : data.filter((item) => item.status === status);

  return (
    <ConsoleLayout title="Admin" subtitle="플랫폼 운영 콘솔" links={adminLinks}>
      <ConsoleHeader title="정산 관리" description="정산 금액, 제외 건, 지급 완료 처리 내역을 운영 사유와 함께 관리합니다." />
      <div className="mt-5">
        <SummaryStrip
          items={[
            { label: "정산 대상", value: `${data.length}건` },
            { label: "지급 대기", value: `${data.filter((item) => item.status === "PREPARED").length}건` },
            { label: "정산 제외", value: `${data.filter((item) => item.status === "EXCLUDED").length}건` },
            { label: "총 지급액", value: formatPrice(data.reduce((sum, item) => sum + item.final_settlement_amount, 0)) },
          ]}
        />
      </div>
      <ConsoleSection className="mt-5" title="지급 완료 처리" description="지급 처리와 정산 제외는 사유가 필요한 민감 작업입니다.">
        <div className="flex flex-col gap-2 md:flex-row">
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="h-11 flex-1 rounded-md border border-line px-3 text-sm outline-none"
            aria-label="정산 지급 처리 사유"
          />
          <Button disabled={!reason || markPaid.isPending} onClick={() => markPaid.mutate()}>
            {markPaid.isPending ? "처리 중" : "지급 완료 기록"}
          </Button>
        </div>
        {markPaid.data ? <p className="mt-3 text-sm font-bold text-brand">정산 작업을 감사 로그에 기록했습니다.</p> : null}
        {markPaid.error ? <p className="mt-3 text-sm font-bold text-brand">{markPaid.error.message}</p> : null}
      </ConsoleSection>
      <ConsoleSection className="mt-5" title="정산 목록" action={<select className="h-10 rounded-md border border-line bg-white px-3 text-sm font-bold" value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">전체 상태</option><option value="PREPARED">지급 대기</option><option value="PAID">지급 완료</option><option value="EXCLUDED">정산 제외</option></select>}>
        <DataTable
          columns={["마켓", "월", "매출", "수수료", "지급액", "상태"]}
          rows={filteredSettlements.map((item) => [
            item.market_name,
            item.target_month,
            formatPrice(item.total_sales_amount),
            formatPrice(item.commission_amount),
            formatPrice(item.final_settlement_amount),
            <StatusBadge key="status" value={item.status} />,
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
  const [issuedCouponIDs, setIssuedCouponIDs] = useState<number[]>([]);
  const [targetMemberID, setTargetMemberID] = useState(1);
  const { data = [] } = useQuery({ queryKey: ["admin-coupons"], queryFn: () => api.adminCoupons(token ?? ""), enabled: Boolean(token) });
  const { data: issuableCoupons = [] } = useQuery({ queryKey: ["admin-issuable-coupons"], queryFn: () => api.listIssuableCoupons(token ?? ""), enabled: Boolean(token) });
  const { data: members = [] } = useQuery({ queryKey: ["admin-members"], queryFn: () => api.adminMembers(token ?? ""), enabled: Boolean(token) });
  const issueCoupon = useMutation({
    mutationFn: (couponID: number) => api.issueCoupon(token ?? "", couponID),
    onSuccess: (coupon) => {
      setIssuedCouponIDs((current) => [...new Set([...current, coupon.id])]);
      void queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-issuable-coupons"] });
    },
  });

  if (!token) {
    return <AdminAuthRequired />;
  }

  const couponMap = new Map([...data, ...issuableCoupons].map((coupon) => [coupon.id, coupon]));
  const coupons = Array.from(couponMap.values()).map((coupon) => ({
    ...coupon,
    status: issuedCouponIDs.includes(coupon.id) ? "ISSUED" : coupon.status,
  }));
  const filteredCoupons = coupons.filter((coupon) => {
    const matchesQuery = !query || coupon.name.toLowerCase().includes(query.toLowerCase()) || coupon.condition_text?.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "ALL" || coupon.status === status;
    return matchesQuery && matchesStatus;
  });

  return (
    <ConsoleLayout title="Admin" subtitle="플랫폼 운영 콘솔" links={adminLinks}>
      <ConsoleHeader title="쿠폰 관리" description="발급 가능한 쿠폰을 조회하고 회원을 선택해 발급 처리합니다." />
      <div className="mt-5">
        <SummaryStrip
          items={[
            { label: "쿠폰 수", value: `${coupons.length}개` },
            { label: "발급됨", value: `${coupons.filter((coupon) => coupon.status === "ISSUED").length}개` },
            { label: "발급 가능", value: `${coupons.filter((coupon) => coupon.status === "ISSUABLE").length}개` },
            { label: "총 할인액", value: formatPrice(coupons.reduce((sum, coupon) => sum + coupon.discount_amount, 0)) },
          ]}
        />
      </div>
      <ConsoleSection className="mt-5" title="쿠폰 발급 대상" description="발급 버튼을 누르면 선택된 회원에게 발급하는 흐름으로 처리됩니다.">
        <select className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm font-bold md:w-96" value={targetMemberID} onChange={(event) => setTargetMemberID(Number(event.target.value))}>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              #{member.id} {member.user_name ?? member.email} · {member.role}
            </option>
          ))}
        </select>
        {issueCoupon.data ? (
          <p className="mt-3 text-sm font-bold text-brand">
            회원 #{targetMemberID}에게 {issueCoupon.data.name} 쿠폰을 발급했습니다.
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
              <option value="ISSUED">발급됨</option>
              <option value="USED">사용됨</option>
            </select>
          </FilterField>
        </FilterPanel>
        <div className="mt-4" />
        <DataTable
          columns={["쿠폰", "할인", "최소 주문", "조건", "만료", "상태", "작업"]}
          rows={filteredCoupons.map((coupon) => [
            coupon.name,
            formatPrice(coupon.discount_amount),
            formatPrice(coupon.min_order_amount),
            coupon.condition_text ?? "-",
            coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString("ko-KR") : "-",
            <StatusBadge key="status" value={coupon.status ?? "ISSUED"} />,
            <Button
              key="issue"
              size="sm"
              disabled={coupon.status === "ISSUED" || issueCoupon.isPending}
              onClick={() => issueCoupon.mutate(coupon.id)}
            >
              {coupon.status === "ISSUED" ? "발급됨" : issueCoupon.isPending ? "발급 중" : "발급"}
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

  const filteredLogs = data.filter((log) => !query || `${log.target_type} ${log.action} ${auditReason(log)}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <ConsoleLayout title="Admin" subtitle="플랫폼 운영 콘솔" links={adminLinks}>
      <ConsoleHeader title="감사 로그" description="어드민 민감 작업의 대상, 작업, 사유, 일시를 추적합니다." />
      <ConsoleSection className="mt-5" action={<SearchBox value={query} onChange={setQuery} placeholder="대상, 작업, 사유 검색" />}>
        <DataTable
          columns={["관리자", "대상", "작업", "사유", "일시"]}
          rows={filteredLogs.map((log) => [
            `#${log.admin_id}`,
            `${log.target_type} #${auditTargetID(log)}`,
            log.action,
            auditReason(log),
            new Date(log.created_at).toLocaleString("ko-KR"),
          ])}
        />
      </ConsoleSection>
    </ConsoleLayout>
  );
}

export function AdminCMSPage() {
  const token = useAdminToken();
  const [status, setStatus] = useState("ALL");
  const { data = [] } = useQuery({ queryKey: ["admin-carousels"], queryFn: () => api.adminCarousels(token ?? ""), enabled: Boolean(token) });

  if (!token) {
    return <AdminAuthRequired />;
  }

  const filteredCarousels = status === "ALL" ? data : data.filter((carousel) => carousel.status === status);

  return (
    <ConsoleLayout title="Admin" subtitle="플랫폼 운영 콘솔" links={adminLinks}>
      <ConsoleHeader
        title="CMS"
        description="홈 캐러셀과 운영 배너의 노출 상태를 관리합니다."
        action={<select className="h-10 rounded-md border border-line bg-white px-3 text-sm font-bold" value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">전체 상태</option><option value="ACTIVE">활성</option><option value="INACTIVE">비활성</option></select>}
      />
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {filteredCarousels.map((carousel) => (
          <ConsoleSection key={carousel.id}>
            <div className="relative aspect-[16/7] overflow-hidden rounded-md bg-zinc-100">
              <SafeImage src={carousel.image_url} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
            </div>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div>
                <p className="font-black">{carousel.title}</p>
                <p className="mt-1 text-xs font-bold text-muted">{carousel.link_url}</p>
              </div>
              <StatusBadge value={carousel.status} />
            </div>
          </ConsoleSection>
        ))}
      </div>
    </ConsoleLayout>
  );
}

export function AdminTokenLookupPage() {
  const token = useAdminToken();
  const router = useRouter();
  const setSellerContext = useSessionStore((state) => state.setSellerContext);
  const [query, setQuery] = useState("");
  const { data: markets = [] } = useQuery({ queryKey: ["admin-markets"], queryFn: () => api.adminMarkets(token ?? ""), enabled: Boolean(token) });

  if (!token) {
    return <AdminAuthRequired />;
  }

  const filteredMarkets = markets.filter((market) => !query || market.name.toLowerCase().includes(query.toLowerCase()) || market.tags?.some((tag) => tag.toLowerCase().includes(query.toLowerCase())));

  function enterSeller(market: Market) {
    if (!token) {
      return;
    }
    setSellerContext({ marketID: market.id, marketName: market.name, token });
    router.push("/seller");
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
              <Button key="enter" size="sm" disabled={!token} onClick={() => enterSeller(market)}>셀러 페이지 진입</Button>,
          ])}
        />
      </ConsoleSection>
    </ConsoleLayout>
  );
}

function AdminSignal({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-3">
      <div className="flex items-center gap-2 text-sm font-bold text-muted">
        {icon}
        {label}
      </div>
      <span className="font-black">{value}</span>
    </div>
  );
}

function MemberName({ member }: { member: MemberProfile }) {
  return (
    <div>
      <p className="font-bold">{member.user_name ?? "이름 없음"}</p>
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
