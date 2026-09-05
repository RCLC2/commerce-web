"use client";

import { useQuery } from "@tanstack/react-query";
import { Store } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { api } from "@/lib/api";
import { getEffectiveToken } from "@/lib/auth-token";
import { useSessionStore } from "@/lib/session-store";
import { ConsoleLayout, ConsoleSection } from "./console-layout";

export const sellerLinks = [
  { href: "/seller", label: "홈" },
  { href: "/seller/products", label: "상품" },
  { href: "/seller/ads", label: "광고" },
  { href: "/seller/inventory", label: "재고 연동" },
  { href: "/seller/orders", label: "주문/배송" },
  { href: "/seller/settlements", label: "정산" },
  { href: "/seller/reviews", label: "리뷰" },
  { href: "/seller/audit-logs", label: "변경 이력" },
];

export function useSellerConsoleContext() {
  const accessToken = useSessionStore((state) => state.accessToken);
  const role = useSessionStore((state) => state.role);
  const sellerContext = useSessionStore((state) => state.sellerContext);
  const hydrate = useSessionStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const token = sellerContext?.token ?? (role === "SELLER" ? getEffectiveToken(accessToken) : null);
  const contextQuery = useQuery({
    queryKey: ["seller-context-v2", sellerContext?.marketID],
    queryFn: () => api.sellerContext(token ?? "", sellerContext?.marketID),
    enabled: Boolean(token),
  });

  return {
    token,
    marketID: sellerContext?.marketID ?? contextQuery.data?.market_id,
    marketName: sellerContext?.marketName ?? contextQuery.data?.market_name ?? "내 마켓",
    contextQuery,
  };
}

export function SellerAuthRequiredV2() {
  return (
    <ConsoleLayout title="Seller" subtitle="마켓 운영 콘솔" links={sellerLinks}>
      <ConsoleSection>
        <h2 className="text-2xl font-black">셀러 권한이 필요합니다</h2>
        <p className="mt-2 text-sm text-muted">셀러 계정 또는 관리자 대리 접속으로 로그인해야 합니다.</p>
      </ConsoleSection>
    </ConsoleLayout>
  );
}

export function SellerConsoleLayoutV2({
  marketName,
  children,
}: {
  marketName: string;
  children: ReactNode;
}) {
  return (
    <ConsoleLayout
      title="Seller"
      subtitle="마켓 운영 콘솔"
      links={sellerLinks}
      sidebarHeader={
        <div className="flex min-w-0 items-center gap-3 rounded-lg bg-zinc-50 p-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-brand">
            <Store className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black text-muted">운영 마켓</p>
            <p className="mt-0.5 line-clamp-2 text-sm font-black">{marketName}</p>
          </div>
        </div>
      }
    >
      {children}
    </ConsoleLayout>
  );
}
