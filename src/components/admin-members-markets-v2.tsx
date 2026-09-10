"use client";

import { Input, Select, Textarea } from "./ui/input";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  adminConsoleApi,
  type AdminMarketListItem,
  type AdminMemberListItem,
} from "@/lib/admin-console-api";
import { apiErrorMessage } from "@/lib/api-client";
import { displayLabel } from "@/lib/display-labels";
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
  ModalQueryState,
  PaginationBar,
  consoleInputClass,
  consoleUrlValue,
  useConsoleConfirm,
  useConsoleUrlFilters,
  useDebouncedValue,
} from "./console-ui";
import { SafeImage } from "./safe-image";
import { Tabs } from "./ui/tabs";
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
  const confirmation = useConsoleConfirm();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(() => Number(consoleUrlValue(searchParams, "page", "1")) || 1);
  const [query, setQuery] = useState(() => consoleUrlValue(searchParams, "q"));
  const [role, setRole] = useState(() => consoleUrlValue(searchParams, "role", "ALL"));
  const [status, setStatus] = useState(() => consoleUrlValue(searchParams, "status", "ALL"));
  const [selectedID, setSelectedID] = useState<number>();
  const [tab, setTab] = useState<"INFO" | "ORDERS">("INFO");
  const [orderPage, setOrderPage] = useState(1);
  const [editing, setEditing] = useState(false);
  const [editRole, setEditRole] = useState("MEMBER");
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [updateResolution, setUpdateResolution] = useState<{ memberID: number; tone: "success" | "error"; message: string }>();
  const debouncedQuery = useDebouncedValue(query);
  useConsoleUrlFilters({ page, q: query, role, status }, (next) => {
    setPage(Number(consoleUrlValue(next, "page", "1")) || 1);
    setQuery(consoleUrlValue(next, "q"));
    setRole(consoleUrlValue(next, "role", "ALL"));
    setStatus(consoleUrlValue(next, "status", "ALL"));
  });

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
    if (editing || !memberQuery.data) return;
    const timer = window.setTimeout(() => {
      setEditRole(memberQuery.data.role);
      setEditStatus(memberQuery.data.status);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [editing, memberQuery.data]);

  const updateMember = useMutation({
    mutationFn: async (memberID: number) => {
      if (!memberID || !memberQuery.data) return;
      const changed: string[] = [];
      if (editRole !== memberQuery.data.role) {
        await adminConsoleApi.updateMemberRole(token ?? "", memberID, editRole);
        changed.push("권한");
      }
      if (editStatus !== memberQuery.data.status) {
        await adminConsoleApi.updateMemberStatus(token ?? "", memberID, editStatus);
        changed.push("상태");
      }
      return changed;
    },
    onMutate: () => setUpdateResolution(undefined),
    onSuccess: async (changed, memberID) => {
      setEditing(false);
      if (selectedID === memberID) {
        setUpdateResolution({ memberID, tone: "success", message: changed?.length ? `${changed.join("·")}을 변경했습니다.` : "변경된 내용이 없습니다." });
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-members-v2"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-member-v2", memberID] }),
      ]);
    },
    onError: async (_error, memberID) => {
      if (selectedID === memberID) {
        setUpdateResolution({ memberID, tone: "error", message: "일부 변경 결과를 확인하지 못했습니다. 실제 회원 정보를 다시 조회했습니다." });
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-members-v2"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-member-v2", memberID] }),
      ]);
    },
  });

  if (!token) return <AdminAuthRequired />;
  const data = membersQuery.data;
  const members = data?.items ?? [];
  const currentUpdateResolution = updateResolution?.memberID === selectedID ? updateResolution : undefined;

  function openMember(member: AdminMemberListItem) {
    updateMember.reset();
    setUpdateResolution(undefined);
    setSelectedID(member.id);
    setTab("INFO");
    setOrderPage(1);
    setEditing(false);
  }

  function discardMemberEdit() {
    if (memberQuery.data) {
      setEditRole(memberQuery.data.role);
      setEditStatus(memberQuery.data.status);
    }
    setEditing(false);
  }

  function memberEditIsDirty() {
    return Boolean(memberQuery.data && (editRole !== memberQuery.data.role || editStatus !== memberQuery.data.status));
  }

  function cancelMemberEdit() {
    if (updateMember.isPending) return;
    if (memberEditIsDirty()) {
      confirmation.ask({ title: "회원 변경 취소", message: "저장하지 않은 권한·상태 변경을 버릴까요?", confirmLabel: "변경 버리기", danger: true }, discardMemberEdit);
      return;
    }
    discardMemberEdit();
  }

  function closeMemberModal() {
    if (updateMember.isPending) return;
    const dirty = editing && memberEditIsDirty();
    if (dirty) {
      confirmation.ask({ title: "회원 상세 닫기", message: "저장하지 않은 회원 변경사항을 버릴까요?", confirmLabel: "변경 버리기", danger: true }, () => {
        setEditing(false);
        setSelectedID(undefined);
      });
      return;
    }
    setEditing(false);
    updateMember.reset();
    setUpdateResolution(undefined);
    setSelectedID(undefined);
  }

  return (
    <ConsoleLayout title="관리자" subtitle="플랫폼 운영 콘솔" links={adminLinks}>
      <ConsoleHeader
        title="회원 관리"
        description="이메일, 권한, 상태로 회원을 찾고 상세 정보와 주문 내역을 확인할 수 있습니다."
      />
      <ConsoleSection className="mt-5" title="회원 목록" description="회원을 누르면 상세 정보, 수정, 주문 내역을 확인할 수 있습니다.">
        <FilterPanel>
          <FilterField label="이메일 검색">
            <Input
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
            <Select
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
            </Select>
          </FilterField>
          <FilterField label="상태">
            <Select
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
            </Select>
          </FilterField>
        </FilterPanel>
        <div className="mt-4">
          <ConsoleTable
            columns={["회원", "권한", "상태", "가입일"]}
            loading={membersQuery.isLoading}
            emptyText={query || role !== "ALL" || status !== "ALL" ? "검색 조건에 맞는 회원이 없습니다." : "등록된 회원이 없습니다."}
            rows={members.map((member) => [
              <div key="member">
                <p className="font-bold">#{member.id}</p>
                <p className="truncate text-xs text-content-secondary">{member.email}</p>
              </div>,
              displayLabel(member.role),
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
        onClose={closeMemberModal}
        footer={
          tab === "INFO" && memberQuery.data ? (
            <>
              {editing ? (
                <Button type="button" variant="secondary" disabled={updateMember.isPending} onClick={cancelMemberEdit}>
                  취소
                </Button>
              ) : null}
              <Button
                type="button"
                disabled={updateMember.isPending}
                onClick={() => {
                  if (!editing) {
                    setUpdateResolution(undefined);
                    setEditing(true);
                    return;
                  }
                  if (selectedID) confirmation.ask({ title: "회원 정보 저장", message: `회원 #${selectedID}의 권한·상태 변경을 저장할까요?`, confirmLabel: "변경 저장" }, () => updateMember.mutate(selectedID));
                }}
              >
                {editing ? "변경 저장" : "회원 수정"}
              </Button>
            </>
          ) : undefined
        }
      >
        <Tabs
          className="mb-5"
          ariaLabel="회원 상세 탭"
          value={tab}
          onValueChange={(value) => {
            if (updateMember.isPending) return;
            setTab(value as "INFO" | "ORDERS");
          }}
          items={[{ value: "INFO", label: "회원 정보" }, { value: "ORDERS", label: "주문 내역" }]}
        />
        {tab === "INFO" ? (
          memberQuery.data ? (
            <>
            {currentUpdateResolution ? <p className={`mb-4 rounded-md px-3 py-2 text-sm font-bold ${currentUpdateResolution.tone === "error" ? "bg-status-negative-subtle text-status-negative" : "bg-status-positive-subtle text-status-positive"}`} role={currentUpdateResolution.tone === "error" ? "alert" : "status"}>{currentUpdateResolution.message}</p> : null}
            <DetailGrid>
              <DetailItem label="이메일">{memberQuery.data.email}</DetailItem>
              <DetailItem label="권한">
                {editing ? (
                  <Select className={consoleInputClass} value={editRole} onChange={(event) => setEditRole(event.target.value)} disabled={updateMember.isPending}>
                    <option value="MEMBER">일반 회원</option>
                    <option value="SELLER">판매자</option>
                    <option value="ADMIN">관리자</option>
                  </Select>
                ) : (
                  displayLabel(memberQuery.data.role)
                )}
              </DetailItem>
              <DetailItem label="상태">
                {editing ? (
                  <Select className={consoleInputClass} value={editStatus} onChange={(event) => setEditStatus(event.target.value)} disabled={updateMember.isPending}>
                    <option value="ACTIVE">활성</option>
                    <option value="PENDING">대기</option>
                    <option value="SUSPENDED">정지</option>
                    <option value="WITHDRAWN">탈퇴</option>
                  </Select>
                ) : (
                  <StatusBadge value={memberQuery.data.status} />
                )}
              </DetailItem>
              <DetailItem label="알림 수신">{displayLabel(memberQuery.data.notification_type)}</DetailItem>
              <DetailItem label="마케팅 동의">{memberQuery.data.marketing_consent ? "동의" : "미동의"}</DetailItem>
              <DetailItem label="야간 알림 동의">{memberQuery.data.nighttime_consent ? "동의" : "미동의"}</DetailItem>
              <DetailItem label="키 / 몸무게">{memberQuery.data.height || "-"}cm / {memberQuery.data.weight || "-"}kg</DetailItem>
              <DetailItem label="소셜 연동">{memberQuery.data.social_providers.map(displayLabel).join(", ") || "-"}</DetailItem>
              <DetailItem label="가입일">{formatDate(memberQuery.data.created_at)}</DetailItem>
              <DetailItem label="수정일">{formatDate(memberQuery.data.updated_at)}</DetailItem>
            </DetailGrid>
            </>
          ) : (
            <ModalQueryState isLoading={memberQuery.isLoading} error={memberQuery.error} onRetry={() => void memberQuery.refetch()} />
          )
        ) : (
          <>
            {ordersQuery.isError ? <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-status-negative-subtle p-3 text-sm font-bold text-status-negative"><p>회원 주문 내역을 불러오지 못했습니다.</p><Button size="sm" variant="secondary" onClick={() => void ordersQuery.refetch()}>주문 내역 다시 불러오기</Button></div> : null}
            <ConsoleTable
              columns={["주문번호", "대표 상품", "결제 금액", "상태", "주문일"]}
              loading={ordersQuery.isLoading}
              emptyText={ordersQuery.isError ? "" : "주문 내역이 없습니다."}
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
      {confirmation.dialog}
    </ConsoleLayout>
  );
}

export function AdminMarketsPageV2() {
  const token = useAdminToken();
  const queryClient = useQueryClient();
  const confirmation = useConsoleConfirm();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(() => Number(consoleUrlValue(searchParams, "page", "1")) || 1);
  const [query, setQuery] = useState(() => consoleUrlValue(searchParams, "q"));
  const [status, setStatus] = useState(() => consoleUrlValue(searchParams, "status", "ALL"));
  const [selectedID, setSelectedID] = useState<number>();
  const [penaltyMarket, setPenaltyMarket] = useState<AdminMarketListItem>();
  const [penaltyScore, setPenaltyScore] = useState("10");
  const [penaltyReason, setPenaltyReason] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  useConsoleUrlFilters({ page, q: query, status }, (next) => {
    setPage(Number(consoleUrlValue(next, "page", "1")) || 1);
    setQuery(consoleUrlValue(next, "q"));
    setStatus(consoleUrlValue(next, "status", "ALL"));
  });

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
    <ConsoleLayout title="관리자" subtitle="플랫폼 운영 콘솔" links={adminLinks}>
      <ConsoleHeader
        title="마켓 관리"
        description="마켓 행에서 바로 페널티를 부여하고, 상세 모달에서 셀러·상품·운영 상태를 함께 관리합니다."
      />
      <ConsoleSection className="mt-5" title="마켓 목록">
        <FilterPanel>
          <FilterField label="마켓 검색">
            <Input
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
            <Select
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
            </Select>
          </FilterField>
        </FilterPanel>
        <div className="mt-4">
          <ConsoleTable
            columns={["마켓", "셀러", "상품", "페널티", "상태", "관리"]}
            loading={marketsQuery.isLoading}
            emptyText={query || status !== "ALL" ? "검색 조건에 맞는 마켓이 없습니다." : "등록된 마켓이 없습니다."}
            rows={markets.map((market) => [
              <div key="market" className="flex min-w-0 items-center gap-3">
                <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-surface-subtle">
                  <SafeImage src={market.profile_image_url} alt="" fill sizes="44px" className="object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-bold">{market.name}</p>
                  <p className="truncate text-xs text-content-secondary">{market.business_number}</p>
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
                  penaltyMutation.reset();
                  setPenaltyMarket(market);
                  setPenaltyScore("10");
                  setPenaltyReason("");
                }}
              >
                페널티
              </Button>,
            ])}
            rowKeys={markets.map((market) => market.id)}
            onRowClick={(index) => {
              statusMutation.reset();
              setSelectedID(markets[index].id);
            }}
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
        onClose={() => {
          if (statusMutation.isPending) return;
          statusMutation.reset();
          setSelectedID(undefined);
        }}
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
                <h3 className="font-bold">운영 상태</h3>
                <div className="flex flex-wrap gap-2">
                  {["OPEN", "HIDE", "CLOSED", "EXIT"].map((nextStatus) => (
                    <Button
                      key={nextStatus}
                      type="button"
                      size="sm"
                      variant={marketQuery.data.status === nextStatus ? "primary" : "secondary"}
                      disabled={statusMutation.isPending}
                      onClick={() => {
                        if (nextStatus === marketQuery.data?.status) {
                          statusMutation.mutate(nextStatus);
                          return;
                        }
                        confirmation.ask({ title: "마켓 상태 변경", message: `${marketQuery.data.name}의 상태를 ${nextStatus}(으)로 변경할까요?`, confirmLabel: "상태 변경" }, () => statusMutation.mutate(nextStatus));
                      }}
                    >
                      {nextStatus}
                    </Button>
                  ))}
                </div>
              </div>
              {statusMutation.error ? <p className="rounded-md border border-status-negative/30 bg-status-negative-subtle px-3 py-2 text-sm font-bold text-status-negative" role="alert">{apiErrorMessage(statusMutation.error)}</p> : null}
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold">판매 상품</h3>
                  <p className="mt-1 text-xs text-content-secondary">최대 7개를 미리 표시합니다.</p>
                </div>
                <Link
                  className="inline-flex h-9 items-center justify-center rounded-md bg-surface-subtle px-3 text-sm font-bold transition hover:bg-border-subtle"
                  href={marketQuery.data.public_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  더보기
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                {marketQuery.data.products.map((product) => (
                  <div key={product.id} className="min-w-0 rounded-xl border border-border-subtle p-2">
                    <div className="relative aspect-square overflow-hidden rounded-lg bg-surface-subtle">
                      <SafeImage src={product.image_url} alt={product.name} fill sizes="140px" className="object-cover" />
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs font-bold">{product.name}</p>
                    <p className="mt-1 text-xs text-content-secondary">{formatPrice(product.discount_price || product.base_price)}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-3 font-bold">최근 페널티</h3>
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
          <ModalQueryState isLoading={marketQuery.isLoading} error={marketQuery.error} onRetry={() => void marketQuery.refetch()} />
        )}
      </ConsoleModal>

      <ConsoleModal
        open={Boolean(penaltyMarket)}
        title={penaltyMarket ? `${penaltyMarket.name} 페널티 부여` : "페널티 부여"}
        description="점수와 사유를 입력하면 이 마켓에만 적용됩니다."
        size="md"
        onClose={() => {
          if (penaltyMutation.isPending) return;
          penaltyMutation.reset();
          setPenaltyMarket(undefined);
        }}
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
              onClick={() => confirmation.ask({ title: "마켓 페널티 부여", message: `${penaltyMarket?.name ?? "이 마켓"}에 ${penaltyScore}점 페널티를 부여할까요?`, confirmLabel: "페널티 부여", danger: true }, () => penaltyMutation.mutate())}
            >
              페널티 부여
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
          {penaltyMutation.error ? <p className="sm:col-span-2 rounded-md border border-status-negative/30 bg-status-negative-subtle px-3 py-2 text-sm font-bold text-status-negative" role="alert">{apiErrorMessage(penaltyMutation.error)}</p> : null}
          <FilterField label="점수 (1~100)">
            <Input
              className={consoleInputClass}
              type="number"
              min={1}
              max={100}
              value={penaltyScore}
              onChange={(event) => setPenaltyScore(event.target.value)}
            />
          </FilterField>
          <FilterField label="사유">
            <Textarea
              className={`${consoleInputClass} min-h-28 py-3`}
              value={penaltyReason}
              onChange={(event) => setPenaltyReason(event.target.value)}
              placeholder="구체적인 페널티 사유를 입력하세요."
            />
          </FilterField>
        </div>
      </ConsoleModal>
      {confirmation.dialog}
    </ConsoleLayout>
  );
}
