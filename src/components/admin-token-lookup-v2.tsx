"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminConsoleApi, type AdminMarketListItem } from "@/lib/admin-console-api";
import { api } from "@/lib/api";
import { useSessionStore } from "@/lib/session-store";
import { AdminAuthRequired, adminLinks, useAdminToken } from "./admin-console";
import { ConsoleHeader, ConsoleLayout, ConsoleSection, StatusBadge } from "./console-layout";
import {
  ConsoleTable,
  PaginationBar,
  consoleInputClass,
  useDebouncedValue,
} from "./console-ui";
import { Button } from "./ui/button";

export function AdminTokenLookupPageV2() {
  const router = useRouter();
  const token = useAdminToken();
  const setSellerContext = useSessionStore((state) => state.setSellerContext);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);

  const marketsQuery = useQuery({
    queryKey: ["admin-token-markets-v2", page, debouncedQuery],
    queryFn: () =>
      adminConsoleApi.markets(token ?? "", {
        page,
        page_size: 20,
        q: debouncedQuery || undefined,
      }),
    enabled: Boolean(token),
    meta: { consoleDataRole: "primary" },
  });
  const enterSeller = useMutation({
    mutationFn: (market: AdminMarketListItem) =>
      api.createSellerImpersonationToken(token ?? "", market.id),
    onSuccess: (response) => {
      setSellerContext({
        marketID: response.market_id,
        marketName: response.market_name,
        token: response.access_token,
        expiresAt: response.expires_at,
      });
      router.push("/seller");
    },
  });

  if (!token) return <AdminAuthRequired />;
  const data = marketsQuery.data;
  const markets = data?.items ?? [];

  return (
    <ConsoleLayout title="Admin" subtitle="플랫폼 운영 콘솔" links={adminLinks}>
      <ConsoleHeader title="셀러 화면 진입" description="마켓을 서버에서 검색한 뒤 관리자 대리 접속 토큰을 발급합니다." />
      <ConsoleSection className="mt-5" title="마켓 목록">
        <input
          className={consoleInputClass + " w-full md:max-w-sm"}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="마켓명 또는 사업자번호 검색"
        />
        <div className="mt-4">
          <ConsoleTable
            columns={["마켓", "셀러", "상태", "작업"]}
            rows={markets.map((market) => [
              <div key="market"><p className="font-black">{market.name}</p><p className="text-xs text-muted">{market.business_number}</p></div>,
              <span key="seller" className="break-all">{market.seller_email}</span>,
              <StatusBadge key="status" value={market.status} />,
              <Button
                key="enter"
                type="button"
                size="sm"
                disabled={enterSeller.isPending}
                onClick={(event) => {
                  event.stopPropagation();
                  enterSeller.mutate(market);
                }}
              >
                셀러 페이지 진입
              </Button>,
            ])}
            rowKeys={markets.map((market) => market.id)}
          />
          <PaginationBar page={data?.page ?? page} totalPages={data?.total_pages ?? 1} total={data?.total ?? 0} onChange={setPage} />
        </div>
      </ConsoleSection>
    </ConsoleLayout>
  );
}
