"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useSessionStore } from "@/lib/session-store";
import { formatPrice } from "@/lib/utils";
import { ConsoleLayout, DataTable, MetricGrid, StatusBadge } from "./console-layout";
import { Button } from "./ui/button";

const adminLinks = [
  { href: "/admin", label: "홈" },
  { href: "/admin/members", label: "회원" },
  { href: "/admin/markets", label: "마켓" },
  { href: "/admin/products", label: "상품" },
  { href: "/admin/orders", label: "주문" },
  { href: "/admin/settlements", label: "정산" },
  { href: "/admin/coupons", label: "쿠폰" },
  { href: "/admin/audit-logs", label: "감사 로그" },
  { href: "/admin/cms", label: "CMS" },
];

function useToken() {
  const token = useSessionStore((state) => state.accessToken);
  return token ?? (process.env.NEXT_PUBLIC_API_MOCKING === "enabled" ? "mock-access-token" : null);
}

function AdminAuthRequired() {
  return (
    <ConsoleLayout title="Admin" links={adminLinks}>
      <div className="rounded-md border border-line bg-white p-6">
        <h2 className="text-2xl font-black">로그인이 필요합니다</h2>
        <p className="mt-2 text-sm text-muted">어드민 기능은 인증된 사용자만 접근할 수 있습니다.</p>
      </div>
    </ConsoleLayout>
  );
}

export function AdminHomePage() {
  const token = useToken();
  const { data } = useQuery({ queryKey: ["admin-dashboard"], queryFn: () => api.adminDashboard(token ?? ""), enabled: Boolean(token) });

  if (!token) {
    return <AdminAuthRequired />;
  }

  return (
    <ConsoleLayout title="Admin" links={adminLinks}>
      <h2 className="text-2xl font-black">어드민 홈</h2>
      <div className="mt-5">{data ? <MetricGrid metrics={data.metrics} /> : null}</div>
      <section className="mt-6 rounded-md border border-line bg-white p-4">
        <h3 className="font-black">운영 알림</h3>
        <div className="mt-3 grid gap-3">
          {data?.alerts.map((alert) => (
            <div key={alert.id} className="rounded-md bg-zinc-50 p-3">
              <div className="flex justify-between gap-4">
                <p className="font-bold">{alert.title}</p>
                <StatusBadge value={alert.severity} />
              </div>
              <p className="mt-1 text-sm text-muted">{alert.description}</p>
            </div>
          ))}
        </div>
      </section>
    </ConsoleLayout>
  );
}

export function AdminMembersPage() {
  const token = useToken();
  const { data = [] } = useQuery({ queryKey: ["admin-members"], queryFn: () => api.adminMembers(token ?? ""), enabled: Boolean(token) });

  if (!token) {
    return <AdminAuthRequired />;
  }

  return (
    <ConsoleLayout title="Admin" links={adminLinks}>
      <h2 className="text-2xl font-black">회원 관리</h2>
      <div className="mt-5">
        <DataTable columns={["ID", "이메일", "권한", "상태", "포인트"]} rows={data.map((member) => [member.id, member.email, member.role, <StatusBadge key="status" value={member.status} />, formatPrice(member.point_balance)])} />
      </div>
    </ConsoleLayout>
  );
}

export function AdminMarketsPage() {
  const token = useToken();
  const { data = [] } = useQuery({ queryKey: ["admin-markets"], queryFn: () => api.adminMarkets(token ?? ""), enabled: Boolean(token) });

  if (!token) {
    return <AdminAuthRequired />;
  }

  return (
    <ConsoleLayout title="Admin" links={adminLinks}>
      <h2 className="text-2xl font-black">마켓 관리</h2>
      <div className="mt-5">
        <DataTable columns={["마켓", "팔로워", "상태", "태그"]} rows={data.map((market) => [market.name, market.follower_count.toLocaleString("ko-KR"), <StatusBadge key="status" value={market.status} />, market.tags.join(", ")])} />
      </div>
    </ConsoleLayout>
  );
}

export function AdminProductsPage() {
  const token = useToken();
  const { data = [] } = useQuery({ queryKey: ["admin-products"], queryFn: () => api.adminProducts(token ?? ""), enabled: Boolean(token) });

  if (!token) {
    return <AdminAuthRequired />;
  }

  return (
    <ConsoleLayout title="Admin" links={adminLinks}>
      <h2 className="text-2xl font-black">상품 관리</h2>
      <div className="mt-5">
        <DataTable columns={["상품", "마켓", "가격", "상태"]} rows={data.map((product) => [product.name, product.market_name, formatPrice(product.discount_price || product.base_price), <StatusBadge key="status" value={product.status} />])} />
      </div>
    </ConsoleLayout>
  );
}

export function AdminOrdersPage() {
  const token = useToken();
  const effectiveToken = token ?? "";
  const [reason, setReason] = useState("고객 요청에 따른 운영 취소");
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

  return (
    <ConsoleLayout title="Admin" links={adminLinks}>
      <h2 className="text-2xl font-black">주문 관리</h2>
      <p className="mt-1 text-sm text-muted">강제 취소, 배송 수동 변경 등 민감 작업은 사유 입력이 필요합니다.</p>
      <div className="mt-5 rounded-md border border-line bg-white p-4">
        <h3 className="font-black">주문 강제 취소</h3>
        <div className="mt-3 flex flex-col gap-2 md:flex-row">
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
      </div>
      <div className="mt-5">
        <DataTable columns={["주문번호", "회원", "금액", "상태"]} rows={data.map((order) => [order.order_code, order.member_id ?? "-", formatPrice(order.total_order_price - order.total_discount_price - order.used_point), <StatusBadge key="status" value={order.status} />])} />
      </div>
    </ConsoleLayout>
  );
}

export function AdminSettlementsPage() {
  const token = useToken();
  const effectiveToken = token ?? "";
  const [reason, setReason] = useState("정산 검증 완료 후 지급 처리");
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

  return (
    <ConsoleLayout title="Admin" links={adminLinks}>
      <h2 className="text-2xl font-black">정산 관리</h2>
      <div className="mt-5 rounded-md border border-line bg-white p-4">
        <h3 className="font-black">지급 완료 처리</h3>
        <div className="mt-3 flex flex-col gap-2 md:flex-row">
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
      </div>
      <div className="mt-5">
        <DataTable columns={["마켓", "월", "매출", "수수료", "지급액", "상태"]} rows={data.map((item) => [item.market_name, item.target_month, formatPrice(item.total_sales_amount), formatPrice(item.commission_amount), formatPrice(item.final_settlement_amount), <StatusBadge key="status" value={item.status} />])} />
      </div>
    </ConsoleLayout>
  );
}

export function AdminCouponsPage() {
  const token = useToken();
  const { data = [] } = useQuery({ queryKey: ["admin-coupons"], queryFn: () => api.adminCoupons(token ?? ""), enabled: Boolean(token) });

  if (!token) {
    return <AdminAuthRequired />;
  }

  return (
    <ConsoleLayout title="Admin" links={adminLinks}>
      <h2 className="text-2xl font-black">쿠폰 관리</h2>
      <div className="mt-5">
        <DataTable columns={["쿠폰", "할인", "최소 주문", "만료"]} rows={data.map((coupon) => [coupon.name, formatPrice(coupon.discount_amount), formatPrice(coupon.min_order_amount), coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString("ko-KR") : "-"])} />
      </div>
    </ConsoleLayout>
  );
}

export function AdminAuditLogsPage() {
  const token = useToken();
  const { data = [] } = useQuery({ queryKey: ["admin-audit-logs"], queryFn: () => api.adminAuditLogs(token ?? ""), enabled: Boolean(token) });

  if (!token) {
    return <AdminAuthRequired />;
  }

  return (
    <ConsoleLayout title="Admin" links={adminLinks}>
      <h2 className="text-2xl font-black">감사 로그</h2>
      <div className="mt-5">
        <DataTable columns={["대상", "작업", "사유", "일시"]} rows={data.map((log) => [`${log.target_type} #${log.target_id}`, log.action, log.reason, new Date(log.created_at).toLocaleString("ko-KR")])} />
      </div>
    </ConsoleLayout>
  );
}

export function AdminCMSPage() {
  const token = useToken();
  const { data = [] } = useQuery({ queryKey: ["admin-carousels"], queryFn: () => api.adminCarousels(token ?? ""), enabled: Boolean(token) });

  if (!token) {
    return <AdminAuthRequired />;
  }

  return (
    <ConsoleLayout title="Admin" links={adminLinks}>
      <h2 className="text-2xl font-black">CMS</h2>
      <div className="mt-5">
        <DataTable columns={["제목", "링크", "상태"]} rows={data.map((carousel) => [carousel.title, carousel.link_url, <StatusBadge key="status" value={carousel.status} />])} />
      </div>
    </ConsoleLayout>
  );
}
