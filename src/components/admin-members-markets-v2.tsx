"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  adminConsoleApi,
  type AdminMarketListItem,
  type AdminMemberListItem,
} from "@/lib/admin-console-api";
import { formatPrice } from "@/lib/utils";
import { AdminAuthRequired, adminLinks, useAdminToken } from "./admin-console";
import {
  ConsoleHeader,
  ConsoleLayout,
  ConsoleSection,
  FilterField,
  FilterPanel,
  StatusBadge,
} from "./console-layout";
import {
  ConsoleModal,
  ConsoleTable,
  DetailGrid,
  DetailItem,
  ModalLoading,
  PaginationBar,
  consoleInputClass,
  useDebouncedValue,
} from "./console-ui";
import { SafeImage } from "./safe-image";
import { Button } from "./ui/button";

function normalizedFilter(value: string) {
  return value === "ALL" ? undefined : value;
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString("ko-KR") : "-";
}

export function AdminMembersPageV2() {
  const token = useAdminToken();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [selectedID, setSelectedID] = useState<number>();
  const [tab, setTab] = useState<"INFO" | "ORDERS">("INFO");
  const [orderPage, setOrderPage] = useState(1);
  const [editing, setEditing] = useState(false);
  const [editRole, setEditRole] = useState("MEMBER");
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const debouncedQuery = useDebouncedValue(query);

  const membersQuery = useQuery({
    queryKey: ["admin-members-v2", page, debouncedQuery, role, status],
    queryFn: () =>
      adminConsoleApi.members(token ?? "", {
        page,
        page_size: 20,
        q: debouncedQuery || undefined,
        role: normalizedFilter(role),
        status: normalizedFilter(status),
      }),
    enabled: Boolean(token),
    meta: { consoleDataRole: "primary" },
  });
  const memberQuery = useQuery({
    queryKey: ["admin-member-v2", selectedID],
    queryFn: () => adminConsoleApi.member(token ?? "", selectedID ?? 0),
    enabled: Boolean(token && selectedID),
  });
  const ordersQuery = useQuery({
    queryKey: ["admin-member-orders-v2", selectedID, orderPage],
    queryFn: () =>
      adminConsoleApi.memberOrders(token ?? "", selectedID ?? 0, {
        page: orderPage,
        page_size: 10,
      }),
    enabled: Boolean(token && selectedID && tab === "ORDERS"),
  });

  useEffect(() => {
    if (!memberQuery.data) return;
    const timer = window.setTimeout(() => {
      setEditRole(memberQuery.data.role);
      setEditStatus(memberQuery.data.status);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [memberQuery.data]);

  const updateMember = useMutation({
    mutationFn: async () => {
      if (!selectedID || !memberQuery.data) return;
      if (editRole !== memberQuery.data.role) {
        await adminConsoleApi.updateMemberRole(token ?? "", selectedID, editRole);
      }
      if (editStatus !== memberQuery.data.status) {
        await adminConsoleApi.updateMemberStatus(token ?? "", selectedID, editStatus);
      }
    },
    onSuccess: async () => {
      setEditing(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-members-v2"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-member-v2", selectedID] }),
      ]);
    },
  });

  if (!token) return <AdminAuthRequired />;
  const data = membersQuery.data;
  const members = data?.items ?? [];

  function openMember(member: AdminMemberListItem) {
    setSelectedID(member.id);
    setTab("INFO");
    setOrderPage(1);
    setEditing(false);
  }

  function cancelMemberEdit() {
    if (memberQuery.data) {
      setEditRole(memberQuery.data.role);
      setEditStatus(memberQuery.data.status);
    }
    setEditing(false);
  }

  return (
    <ConsoleLayout title="Admin" subtitle="플랫폼 운영 콘솔" links={adminLinks}>
      <ConsoleHeader
        title="회원 관리"
        description="검색·권한·상태 조건을 서버에 전달하고, 목록과 상세 응답을 분리해 필요한 정보만 불러옵니다."
      />
      <ConsoleSection className="mt-5" title="회원 목록" description="회원을 누르면 상세 정보, 수정, 주문 내역을 확인할 수 있습니다.">
        <FilterPanel>
          <FilterField label="이메일 검색">
            <input
              className={consoleInputClass}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="이메일 또는 회원 번호"
            />
          </FilterField>
          <FilterField label="권한">
            <select
              className={consoleInputClass}
              value={role}
              onChange={(event) => {
                setRole(event.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">전체 권한</option>
              <option value="MEMBER">회원</option>
              <option value="SELLER">셀러</option>
              <option value="ADMIN">관리자</option>
            </select>
          </FilterField>
          <FilterField label="상태">
            <select
              className={consoleInputClass}
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">전체 상태</option>
              <option value="ACTIVE">활성</option>
              <option value="PENDING">승인 대기</option>
              <option value="SUSPENDED">정지</option>
              <option value="WITHDRAWN">탈퇴</option>
            </select>
          </FilterField>
        </FilterPanel>
        <div className="mt-4">
          <ConsoleTable
            columns={["회원", "권한", "상태", "가입일"]}
            rows={members.map((member) => [
              <div key="member">
                <p className="font-black">#{member.id}</p>
                <p className="truncate text-xs text-muted">{member.email}</p>
              </div>,
              member.role,
              <StatusBadge key="status" value={member.status} />,
              formatDate(member.created_at),
            ])}
            rowKeys={members.map((member) => member.id)}
            onRowClick={(index) => openMember(members[index])}
          />
          <PaginationBar
            page={data?.page ?? page}
            totalPages={data?.total_pages ?? 1}
            total={data?.total ?? 0}
            onChange={setPage}
          />
        </div>
      </ConsoleSection>

      <ConsoleModal
        open={Boolean(selectedID)}
        title={memberQuery.data?.email ?? "회원 상세"}
        description={selectedID ? `회원 #${selectedID}` : undefined}
        onClose={() => setSelectedID(undefined)}
        footer={
          tab === "INFO" && memberQuery.data ? (
            <>
              {editing ? (
                <Button type="button" variant="secondary" onClick={cancelMemberEdit}>
                  취소
                </Button>
              ) : null}
              <Button
                type="button"
                disabled={updateMember.isPending}
                onClick={() => (editing ? updateMember.mutate() : setEditing(true))}
              >
                {editing ? "변경 저장" : "회원 수정"}
              </Button>
            </>
          ) : undefined
        }
      >
        <div className="mb-5 flex gap-2 border-b border-line">
          {(["INFO", "ORDERS"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={`border-b-2 px-4 py-2 text-sm font-black ${tab === value ? "border-brand text-brand" : "border-transparent text-muted"}`}
              onClick={() => setTab(value)}
            >
              {value === "INFO" ? "회원 정보" : "주문 내역"}
            </button>
          ))}
        </div>
        {tab === "INFO" ? (
          memberQuery.data ? (
            <DetailGrid>
              <DetailItem label="이메일">{memberQuery.data.email}</DetailItem>
              <DetailItem label="권한">
                {editing ? (
                  <select className={consoleInputClass} value={editRole} onChange={(event) => setEditRole(event.target.value)}>
                    <option value="MEMBER">MEMBER</option>
                    <option value="SELLER">SELLER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                ) : (
                  memberQuery.data.role
                )}
              </DetailItem>
              <DetailItem label="상태">
                {editing ? (
                  <select className={consoleInputClass} value={editStatus} onChange={(event) => setEditStatus(event.target.value)}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PENDING">PENDING</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                    <option value="WITHDRAWN">WITHDRAWN</option>
                  </select>
                ) : (
                  <StatusBadge value={memberQuery.data.status} />
                )}
              </DetailItem>
              <DetailItem label="알림 수신">{memberQuery.data.notification_type || "-"}</DetailItem>
              <DetailItem label="마케팅 동의">{memberQuery.data.marketing_consent ? "동의" : "미동의"}</DetailItem>
              <DetailItem label="야간 알림 동의">{memberQuery.data.nighttime_consent ? "동의" : "미동의"}</DetailItem>
              <DetailItem label="키 / 몸무게">{memberQuery.data.height || "-"}cm / {memberQuery.data.weight || "-"}kg</DetailItem>
              <DetailItem label="소셜 연동">{memberQuery.data.social_providers.join(", ") || "-"}</DetailItem>
              <DetailItem label="가입일">{formatDate(memberQuery.data.created_at)}</DetailItem>
              <DetailItem label="수정일">{formatDate(memberQuery.data.updated_at)}</DetailItem>
            </DetailGrid>
          ) : (
            <ModalLoading />
          )
        ) : (
          <>
            <ConsoleTable
              columns={["주문번호", "대표 상품", "결제 금액", "상태", "주문일"]}
              rows={(ordersQuery.data?.items ?? []).map((order) => [
                order.order_code,
                `${order.representative_product} 외 ${Math.max(0, order.item_count - 1)}건`,
                formatPrice(order.total_amount - order.discount_amount),
                <StatusBadge key="status" value={order.status} />,
                formatDate(order.created_at),
              ])}
            />
            <PaginationBar
              page={ordersQuery.data?.page ?? orderPage}
              totalPages={ordersQuery.data?.total_pages ?? 1}
              total={ordersQuery.data?.total ?? 0}
              onChange={setOrderPage}
            />
          </>
        )}
      </ConsoleModal>
    </ConsoleLayout>
  );
}

export function AdminMarketsPageV2() {
  const token = useAdminToken();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [selectedID, setSelectedID] = useState<number>();
  const [penaltyMarket, setPenaltyMarket] = useState<AdminMarketListItem>();
  const [penaltyScore, setPenaltyScore] = useState("10");
  const [penaltyReason, setPenaltyReason] = useState("");
  const debouncedQuery = useDebouncedValue(query);

  const marketsQuery = useQuery({
    queryKey: ["admin-markets-v2", page, debouncedQuery, status],
    queryFn: () =>
      adminConsoleApi.markets(token ?? "", {
        page,
        page_size: 20,
        q: debouncedQuery || undefined,
        status: normalizedFilter(status),
      }),
    enabled: Boolean(token),
    meta: { consoleDataRole: "primary" },
  });
  const marketQuery = useQuery({
    queryKey: ["admin-market-v2", selectedID],
    queryFn: () => adminConsoleApi.market(token ?? "", selectedID ?? 0),
    enabled: Boolean(token && selectedID),
  });
  const penaltyMutation = useMutation({
    mutationFn: () =>
      adminConsoleApi.addMarketPenalty(token ?? "", penaltyMarket?.id ?? 0, {
        score: Number(penaltyScore),
        reason: penaltyReason.trim(),
      }),
    onSuccess: async () => {
      setPenaltyMarket(undefined);
      setPenaltyReason("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-markets-v2"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-market-v2"] }),
      ]);
    },
  });
  const statusMutation = useMutation({
    mutationFn: (nextStatus: string) =>
      adminConsoleApi.updateMarketStatus(token ?? "", selectedID ?? 0, nextStatus),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-markets-v2"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-market-v2", selectedID] }),
      ]);
    },
  });

  if (!token) return <AdminAuthRequired />;
  const data = marketsQuery.data;
  const markets = data?.items ?? [];

  return (
    <ConsoleLayout title="Admin" subtitle="플랫폼 운영 콘솔" links={adminLinks}>
      <ConsoleHeader
        title="마켓 관리"
        description="마켓 행에서 바로 페널티를 부여하고, 상세 모달에서 셀러·상품·운영 상태를 함께 관리합니다."
      />
      <ConsoleSection className="mt-5" title="마켓 목록">
        <FilterPanel>
          <FilterField label="마켓 검색">
            <input
              className={consoleInputClass}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="마켓명 또는 사업자번호"
            />
          </FilterField>
          <FilterField label="운영 상태">
            <select
              className={consoleInputClass}
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">전체 상태</option>
              <option value="OPEN">운영중</option>
              <option value="CLOSED">운영 종료</option>
              <option value="HIDE">숨김</option>
              <option value="EXIT">퇴점</option>
            </select>
          </FilterField>
        </FilterPanel>
        <div className="mt-4">
          <ConsoleTable
            columns={["마켓", "셀러", "상품", "페널티", "상태", "관리"]}
            rows={markets.map((market) => [
              <div key="market" className="flex min-w-0 items-center gap-3">
                <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                  <SafeImage src={market.profile_image_url} alt="" fill sizes="44px" className="object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-black">{market.name}</p>
                  <p className="truncate text-xs text-muted">{market.business_number}</p>
                </div>
              </div>,
              <span key="seller" className="break-all">{market.seller_email}</span>,
              `${market.product_count}개`,
              `${market.penalty_score}점`,
              <StatusBadge key="status" value={market.status} />,
              <Button
                key="penalty"
                type="button"
                size="sm"
                variant="secondary"
                onClick={(event) => {
                  event.stopPropagation();
                  setPenaltyMarket(market);
                  setPenaltyScore("10");
                  setPenaltyReason("");
                }}
              >
                페널티
              </Button>,
            ])}
            rowKeys={markets.map((market) => market.id)}
            onRowClick={(index) => setSelectedID(markets[index].id)}
          />
          <PaginationBar
            page={data?.page ?? page}
            totalPages={data?.total_pages ?? 1}
            total={data?.total ?? 0}
            onChange={setPage}
          />
        </div>
      </ConsoleSection>

      <ConsoleModal
        open={Boolean(selectedID)}
        title={marketQuery.data?.name ?? "마켓 상세"}
        description={selectedID ? `마켓 #${selectedID}` : undefined}
        size="xl"
        onClose={() => setSelectedID(undefined)}
      >
        {marketQuery.data ? (
          <div className="grid gap-6">
            <DetailGrid>
              <DetailItem label="사업자번호">{marketQuery.data.business_number}</DetailItem>
              <DetailItem label="상태"><StatusBadge value={marketQuery.data.status} /></DetailItem>
              <DetailItem label="셀러 이메일">{marketQuery.data.seller.email}</DetailItem>
              <DetailItem label="셀러 상태"><StatusBadge value={marketQuery.data.seller.status} /></DetailItem>
              <DetailItem label="누적 페널티">{marketQuery.data.penalty_score}점</DetailItem>
              <DetailItem label="상품 수">{marketQuery.data.product_count}개</DetailItem>
              <DetailItem label="소개">{marketQuery.data.description}</DetailItem>
              <DetailItem label="등록일">{formatDate(marketQuery.data.created_at)}</DetailItem>
            </DetailGrid>

            <section>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-black">운영 상태</h3>
                <div className="flex flex-wrap gap-2">
                  {["OPEN", "HIDE", "CLOSED", "EXIT"].map((nextStatus) => (
                    <Button
                      key={nextStatus}
                      type="button"
                      size="sm"
                      variant={marketQuery.data.status === nextStatus ? "primary" : "secondary"}
                      disabled={statusMutation.isPending}
                      onClick={() => statusMutation.mutate(nextStatus)}
                    >
                      {nextStatus}
                    </Button>
                  ))}
                </div>
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-black">판매 상품</h3>
                  <p className="mt-1 text-xs text-muted">최대 7개를 미리 표시합니다.</p>
                </div>
                <Link
                  className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-100 px-3 text-sm font-black transition hover:bg-zinc-200"
                  href={marketQuery.data.public_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  더보기
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                {marketQuery.data.products.map((product) => (
                  <div key={product.id} className="min-w-0 rounded-xl border border-line p-2">
                    <div className="relative aspect-square overflow-hidden rounded-lg bg-zinc-100">
                      <SafeImage src={product.image_url} alt={product.name} fill sizes="140px" className="object-cover" />
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs font-black">{product.name}</p>
                    <p className="mt-1 text-xs text-muted">{formatPrice(product.discount_price || product.base_price)}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-3 font-black">최근 페널티</h3>
              <ConsoleTable
                columns={["점수", "사유", "부여일"]}
                rows={marketQuery.data.recent_penalties.map((penalty) => [
                  `${penalty.score}점`,
                  penalty.reason,
                  formatDate(penalty.created_at),
                ])}
              />
            </section>
          </div>
        ) : (
          <ModalLoading />
        )}
      </ConsoleModal>

      <ConsoleModal
        open={Boolean(penaltyMarket)}
        title={penaltyMarket ? `${penaltyMarket.name} 페널티 부여` : "페널티 부여"}
        description="점수와 사유를 입력하면 이 마켓에만 적용됩니다."
        size="md"
        onClose={() => setPenaltyMarket(undefined)}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setPenaltyMarket(undefined)}>취소</Button>
            <Button
              type="button"
              disabled={
                penaltyMutation.isPending ||
                !penaltyReason.trim() ||
                Number(penaltyScore) < 1 ||
                Number(penaltyScore) > 100
              }
              onClick={() => penaltyMutation.mutate()}
            >
              페널티 부여
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
          <FilterField label="점수 (1~100)">
            <input
              className={consoleInputClass}
              type="number"
              min={1}
              max={100}
              value={penaltyScore}
              onChange={(event) => setPenaltyScore(event.target.value)}
            />
          </FilterField>
          <FilterField label="사유">
            <textarea
              className={`${consoleInputClass} min-h-28 py-3`}
              value={penaltyReason}
              onChange={(event) => setPenaltyReason(event.target.value)}
              placeholder="구체적인 페널티 사유를 입력하세요."
            />
          </FilterField>
        </div>
      </ConsoleModal>
    </ConsoleLayout>
  );
}
