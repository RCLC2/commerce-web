"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { apiErrorMessage } from "@/lib/api-client";
import { api } from "@/lib/api";
import { sellerConsoleApi } from "@/lib/seller-console-api";
import type { AdCampaign } from "@/lib/api/advertising";
import {
  campaignBudgetMicros,
  campaignID,
  campaignName,
  campaignSpendMicros,
  campaignStatus,
  campaignType,
  rateCPMMicros,
  rateCampaignType,
  ratePlacement,
} from "@/lib/advertising-view";
import { useSessionStore } from "@/lib/session-store";
import { ConsoleHeader, ConsoleLayout, ConsoleSection, DataTable, MetricGrid, StatusBadge } from "./console-layout";
import { adminLinks } from "./admin-console";
import { ConsoleModal, useDebouncedValue } from "./console-ui";
import { sellerLinks } from "./seller-shell";
import { Button } from "./ui/button";

type CampaignKind = "SPONSORED_FEED" | "SEARCH" | "CRM" | "GUARANTEED";

export function SellerAdvertisingPage() {
  const session = useAdSession();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyCampaignForm());
  const [createOpen, setCreateOpen] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const debouncedProductQuery = useDebouncedValue(productQuery);
  const enabled = Boolean(session.sellerToken);
  const productsQuery = useQuery({
    queryKey: ["seller-ad-products", session.marketID, debouncedProductQuery],
    queryFn: () => sellerConsoleApi.products(session.sellerToken ?? "", {
      market_id: session.marketID,
      page: 1,
      page_size: 20,
      q: debouncedProductQuery || undefined,
      status: "SELLING",
    }),
    enabled: Boolean(enabled && createOpen),
  });
  const products = productsQuery.data?.items ?? [];
  const { data: campaigns = [] } = useQuery({
    queryKey: ["seller-ad-campaigns", session.marketID],
    queryFn: () => api.sellerAdCampaigns(session.sellerToken ?? "", session.marketID),
    enabled,
    meta: { consoleDataRole: "primary" },
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["seller-ad-campaigns", session.marketID] });
  const { data: reports = [] } = useQuery({
    queryKey: ["seller-ad-reports", session.marketID],
    queryFn: () => api.sellerAdReports(session.sellerToken ?? "", session.marketID),
    enabled,
  });
  const create = useMutation({
    mutationFn: () => api.createSellerAdCampaign(session.sellerToken ?? "", session.marketID, campaignPayload(form)),
    onSuccess: () => {
      setForm(emptyCampaignForm());
      setCreateOpen(false);
      void invalidate();
      setProductQuery("");
    },
  });
  const transition = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "submit" | "pause" | "resume" }) => {
      const token = session.sellerToken ?? "";
      if (action === "submit") return api.submitSellerAdCampaign(token, id, session.marketID);
      if (action === "pause") return api.pauseSellerAdCampaign(token, id, session.marketID);
      return api.resumeSellerAdCampaign(token, id, session.marketID);
    },
    onSuccess: () => void invalidate(),
  });
  const metrics = useMemo(() => campaignMetrics(campaigns), [campaigns]);

  if (!session.sellerToken) {
    return <AdsAccessRequired role="셀러" />;
  }

  return (
    <ConsoleLayout title="Seller" subtitle="마켓 광고센터" links={sellerLinks}>
      <ConsoleHeader
        title="광고 캠페인"
        description="상품, 지면, 일예산을 선택해 검수 후 집행합니다. CPM 캠페인은 균등 분배로 일예산을 보호합니다."
        action={<Button type="button" onClick={() => setCreateOpen(true)}>캠페인 생성</Button>}
      />
		{create.isError || transition.isError ? <p className="mt-3 text-sm font-bold text-brand">{apiErrorMessage(create.error ?? transition.error)}</p> : null}
      <div className="mt-5"><MetricGrid metrics={metrics} /></div>
      <ConsoleSection className="mt-5" title="성과 리포트" description="유효 노출, 클릭, 과금, 주문 기여는 지연 이벤트 보정 후 집계됩니다.">
        <DataTable columns={["캠페인", "노출", "클릭", "광고비", "기여 주문", "기여 매출"]} rows={reports.map((report) => [campaignName(campaigns.find((campaign) => campaignID(campaign) === report.campaign_id) ?? {}), report.impressions.toLocaleString("ko-KR"), report.clicks.toLocaleString("ko-KR"), formatWon(report.spend_micros), report.attributed_orders.toLocaleString("ko-KR"), formatWon(report.revenue_micros)])} emptyText="집계된 광고 성과가 없습니다." />
      </ConsoleSection>
      <ConsoleModal
        open={createOpen}
        title="광고 캠페인 생성"
        description="구좌 단가는 운영자가 관리한 가격표를 사용하며, 셀러 입력값으로 바꾸지 않습니다."
        size="xl"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>취소</Button>
            <Button type="button" disabled={create.isPending || !canCreateCampaign(form)} onClick={() => create.mutate()}>
              {create.isPending ? "생성 중" : "초안 만들기"}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 lg:grid-cols-3">
          <Field label="캠페인 이름"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={inputClass} placeholder="가을 신상품 피드 광고" /></Field>
          <Field label="상품 검색">
            <input
              value={productQuery}
              onChange={(event) => {
                setProductQuery(event.target.value);
                setForm({ ...form, productID: "" });
              }}
              className={inputClass}
              placeholder="상품명 검색"
            />
          </Field>
          <Field label="광고 상품"><select value={form.productID} onChange={(event) => setForm({ ...form, productID: event.target.value })} className={inputClass}><option value="">{productsQuery.isFetching ? "상품 검색 중" : products.length ? "상품 선택" : "검색 결과 없음"}</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></Field>
          <Field label="광고 유형"><select value={form.campaignType} onChange={(event) => setForm({ ...form, campaignType: event.target.value as CampaignKind })} className={inputClass}><option value="SPONSORED_FEED">추천 피드 CPM</option><option value="SEARCH">검색 CPM</option><option value="CRM">CRM 알림 CPM</option><option value="GUARANTEED">메인 배너 일 임대</option></select></Field>
          <Field label="노출 구좌"><select value={form.placementKey} onChange={(event) => setForm({ ...form, placementKey: event.target.value })} className={inputClass}>{placementOptions(form.campaignType).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
          {form.campaignType === "GUARANTEED" ? null : <Field label="일예산 (원)"><input type="number" min="1" value={form.dailyBudgetWon} onChange={(event) => setForm({ ...form, dailyBudgetWon: event.target.value })} className={inputClass} /></Field>}
          <Field label="시작 일시"><input type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} className={inputClass} /></Field>
          <Field label="종료 일시"><input type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} className={inputClass} /></Field>
        </div>
        <p className="mt-4 text-xs font-bold text-muted">초안을 만든 후 검수 요청을 하면 운영자 승인 전까지 노출되지 않습니다.</p>
      </ConsoleModal>
      <ConsoleSection className="mt-5" title="내 캠페인" description="일예산 소진, 검수, 일시중지는 서버 상태를 기준으로 반영됩니다.">
        <DataTable
          columns={["캠페인", "유형/구좌", "오늘 예산", "상태", "작업"]}
          rows={campaigns.map((campaign) => campaignRow(campaign, transition))}
          emptyText="등록한 광고 캠페인이 없습니다."
        />
      </ConsoleSection>
    </ConsoleLayout>
  );
}

export function AdminAdvertisingPage() {
  const session = useAdSession();
  const queryClient = useQueryClient();
  const [rate, setRate] = useState(emptyRateForm());
  const [rejectionReason, setRejectionReason] = useState("");
  const enabled = Boolean(session.adminToken);
  const { data: campaigns = [] } = useQuery({ queryKey: ["admin-ad-campaigns"], queryFn: () => api.adminAdCampaigns(session.adminToken ?? ""), enabled, meta: { consoleDataRole: "primary" } });
  const { data: rates = [] } = useQuery({ queryKey: ["admin-ad-rates"], queryFn: () => api.placementRates(session.adminToken ?? ""), enabled, meta: { consoleDataRole: "primary" } });
  const invalidate = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["admin-ad-campaigns"] }),
    queryClient.invalidateQueries({ queryKey: ["admin-ad-rates"] }),
  ]);
  const createRate = useMutation({ mutationFn: () => api.createPlacementRate(session.adminToken ?? "", ratePayload(rate)), onSuccess: () => { setRate(emptyRateForm()); void invalidate(); } });
  const review = useMutation({ mutationFn: ({ id, approved }: { id: number; approved: boolean }) => api.reviewAdCampaign(session.adminToken ?? "", id, approved, approved ? "" : rejectionReason), onSuccess: () => void invalidate() });
  const adminTransition = useMutation({ mutationFn: ({ id, action }: { id: number; action: "pause" | "resume" }) => action === "pause" ? api.pauseAdminAdCampaign(session.adminToken ?? "", id) : api.resumeAdminAdCampaign(session.adminToken ?? "", id), onSuccess: () => void invalidate() });

  if (!session.adminToken) {
    return <AdsAccessRequired role="관리자" />;
  }

  return (
    <ConsoleLayout title="Admin" subtitle="광고 운영 콘솔" links={adminLinks}>
      <ConsoleHeader title="광고 운영" description="지면 가격표를 관리하고 셀러 캠페인의 검수·집행 상태를 통제합니다." />
		{createRate.isError || review.isError || adminTransition.isError ? <p className="mt-3 text-sm font-bold text-brand">{apiErrorMessage(createRate.error ?? review.error ?? adminTransition.error)}</p> : null}
      <ConsoleSection className="mt-5" title="지면 가격표 등록" description="CPM은 1,000회 노출당 원화, 일 임대는 하루 원화 기준으로 입력합니다.">
        <div className="grid gap-3 lg:grid-cols-3">
          <Field label="광고 유형"><select value={rate.campaignType} onChange={(event) => setRate({ ...rate, campaignType: event.target.value as CampaignKind, placementKey: placementOptions(event.target.value as CampaignKind)[0].value })} className={inputClass}><option value="SPONSORED_FEED">추천 피드</option><option value="SEARCH">검색</option><option value="CRM">CRM</option><option value="GUARANTEED">보장형 배너</option></select></Field>
          <Field label="노출 구좌"><select value={rate.placementKey} onChange={(event) => setRate({ ...rate, placementKey: event.target.value })} className={inputClass}>{placementOptions(rate.campaignType).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
          <Field label={rate.campaignType === "GUARANTEED" ? "일 임대 단가 (원)" : "CPM 단가 (원)"}><input type="number" min="1" value={rate.priceWon} onChange={(event) => setRate({ ...rate, priceWon: event.target.value })} className={inputClass} /></Field>
        </div>
        <div className="mt-4 flex gap-3"><Button disabled={createRate.isPending || !Number(rate.priceWon)} onClick={() => createRate.mutate()}>{createRate.isPending ? "등록 중" : "가격표 등록"}</Button></div>
      </ConsoleSection>
      <ConsoleSection className="mt-5" title="활성 가격표">
        <DataTable columns={["지면", "광고 유형", "단가", "상태"]} rows={rates.map((item) => [ratePlacement(item), rateCampaignType(item), `${formatWon(rateCPMMicros(item) || (item.daily_flat_price_micros ?? item.DailyFlatPriceMicros ?? 0))}`, item.status ?? item.Status ?? "ACTIVE"])} />
      </ConsoleSection>
      <ConsoleSection className="mt-5" title="캠페인 검수" action={<input value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} className={inputClass} placeholder="반려할 때 사유 입력" aria-label="반려 사유" />}>
        <DataTable
          columns={["캠페인", "유형", "상태", "작업"]}
          rows={campaigns.map((campaign) => {
            const id = campaignID(campaign);
            const status = campaignStatus(campaign);
            const controls = (
              <div key="actions" className="flex flex-wrap gap-2">
                {status === "UNDER_REVIEW" ? (
                  <>
                    <Button size="sm" disabled={review.isPending} onClick={() => review.mutate({ id, approved: true })}>승인</Button>
                    <Button size="sm" variant="secondary" disabled={review.isPending || !rejectionReason.trim()} onClick={() => review.mutate({ id, approved: false })}>반려</Button>
                  </>
                ) : null}
                {["ACTIVE", "SCHEDULED"].includes(status) ? (
                  <Button size="sm" variant="secondary" disabled={adminTransition.isPending} onClick={() => adminTransition.mutate({ id, action: "pause" })}>긴급 중지</Button>
                ) : null}
                {status === "PAUSED" ? (
                  <Button size="sm" disabled={adminTransition.isPending} onClick={() => adminTransition.mutate({ id, action: "resume" })}>재개</Button>
                ) : null}
                {!["UNDER_REVIEW", "ACTIVE", "SCHEDULED", "PAUSED"].includes(status) ? <span className="text-xs font-bold text-muted">검수 완료</span> : null}
              </div>
            );
            return [
              campaignName(campaign),
              campaignType(campaign),
              <StatusBadge key="status" value={status} />,
              controls,
            ];
          })}
        />
      </ConsoleSection>
    </ConsoleLayout>
  );
}

function campaignRow(campaign: AdCampaign, transition: { mutate: (input: { id: number; action: "submit" | "pause" | "resume" }) => void; isPending: boolean }) {
  const id = campaignID(campaign);
  const status = campaignStatus(campaign);
  const budget = campaignBudgetMicros(campaign);
  const spend = campaignSpendMicros(campaign);
  return [
    <div key="name"><p className="font-black">{campaignName(campaign)}</p>{campaign.rejection_reason ?? campaign.RejectionReason ? <p className="mt-1 text-xs font-bold text-brand">반려: {campaign.rejection_reason ?? campaign.RejectionReason}</p> : null}</div>,
    `${campaignType(campaign)} · ${campaign.placement_key ?? campaign.PlacementKey ?? ""}`,
    budget ? `${formatWon(spend)} / ${formatWon(budget)}` : "일 정액 예약",
    <StatusBadge key="status" value={status} />,
    <div key="actions" className="flex flex-wrap gap-2">{status === "DRAFT" ? <Button size="sm" disabled={transition.isPending} onClick={() => transition.mutate({ id, action: "submit" })}>검수 요청</Button> : null}{status === "ACTIVE" || status === "SCHEDULED" ? <Button size="sm" variant="secondary" disabled={transition.isPending} onClick={() => transition.mutate({ id, action: "pause" })}>중지</Button> : null}{status === "PAUSED" ? <Button size="sm" disabled={transition.isPending} onClick={() => transition.mutate({ id, action: "resume" })}>재개</Button> : null}</div>,
  ];
}

function AdsAccessRequired({ role }: { role: string }) {
  return <ConsoleLayout title="Ads" subtitle="광고센터" links={role === "관리자" ? adminLinks : sellerLinks}><ConsoleSection><h2 className="text-xl font-black">{role} 권한이 필요합니다</h2><p className="mt-2 text-sm text-muted">광고 캠페인과 가격표는 권한이 확인된 계정에서만 관리할 수 있습니다.</p></ConsoleSection></ConsoleLayout>;
}

function useAdSession() {
  const accessToken = useSessionStore((state) => state.accessToken);
  const role = useSessionStore((state) => state.role);
  const sellerContext = useSessionStore((state) => state.sellerContext);
  const hydrate = useSessionStore((state) => state.hydrate);
  useEffect(() => hydrate(), [hydrate]);
  return {
    sellerToken: sellerContext?.token ?? (role === "SELLER" ? accessToken : null),
    marketID: sellerContext?.marketID ?? null,
    adminToken: role === "ADMIN" ? accessToken : null,
  };
}

function campaignMetrics(campaigns: AdCampaign[]) {
  const active = campaigns.filter((campaign) => ["ACTIVE", "SCHEDULED"].includes(campaignStatus(campaign))).length;
  const spend = campaigns.reduce((total, campaign) => total + campaignSpendMicros(campaign), 0);
  const budget = campaigns.reduce((total, campaign) => total + campaignBudgetMicros(campaign), 0);
  return [{ label: "운영 캠페인", value: String(active) }, { label: "오늘 집행비", value: formatWon(spend) }, { label: "오늘 일예산", value: formatWon(budget) }, { label: "검수 대기", value: String(campaigns.filter((campaign) => campaignStatus(campaign) === "UNDER_REVIEW").length) }];
}

function emptyCampaignForm() {
  return { name: "", productID: "", campaignType: "SPONSORED_FEED" as CampaignKind, placementKey: "home_feed.sponsored_card", dailyBudgetWon: "", startsAt: "", endsAt: "" };
}

function campaignPayload(form: ReturnType<typeof emptyCampaignForm>) {
  return {
    product_id: Number(form.productID), name: form.name.trim(), campaign_type: form.campaignType, placement_key: form.placementKey,
    daily_budget_micros: form.campaignType === "GUARANTEED" ? 0 : wonToMicros(form.dailyBudgetWon),
    advertiser_timezone: "Asia/Seoul",
    starts_at: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
    ends_at: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
  };
}

function canCreateCampaign(form: ReturnType<typeof emptyCampaignForm>) {
	if (!form.name.trim() || !form.productID || !form.placementKey || !form.startsAt || !form.endsAt) return false;
	const startsAt = new Date(form.startsAt);
	const endsAt = new Date(form.endsAt);
	if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) return false;
	if (form.campaignType !== "GUARANTEED") return Number(form.dailyBudgetWon) > 0;
	return startsAt.getHours() === 0 && startsAt.getMinutes() === 0
		&& endsAt.getHours() === 0 && endsAt.getMinutes() === 0
		&& endsAt.getTime() - startsAt.getTime() === 24 * 60 * 60 * 1000;
}

function emptyRateForm() {
  return { campaignType: "SPONSORED_FEED" as CampaignKind, placementKey: "home_feed.sponsored_card", priceWon: "" };
}

function ratePayload(rate: ReturnType<typeof emptyRateForm>) {
  const guaranteed = rate.campaignType === "GUARANTEED";
  return { placement_key: rate.placementKey, campaign_type: rate.campaignType, pricing_model: guaranteed ? "DAILY_FLAT" : "CPM", cpm_micros: guaranteed ? 0 : wonToMicros(rate.priceWon), daily_flat_price_micros: guaranteed ? wonToMicros(rate.priceWon) : 0, effective_from: new Date().toISOString(), status: "ACTIVE" };
}

function placementOptions(type: CampaignKind) {
  if (type === "SEARCH") return [{ value: "search.sponsored_top", label: "검색 결과 상단" }];
  if (type === "CRM") return [{ value: "crm.in_app_notification", label: "홈 인앱 알림" }, { value: "crm.push_notification", label: "푸시 알림" }];
  if (type === "GUARANTEED") return [{ value: "home.main_banner", label: "메인 배너" }];
  return [{ value: "home_feed.sponsored_card", label: "홈 추천 피드" }];
}

function wonToMicros(value: string) { return Math.round(Number(value) * 1_000_000); }
function formatWon(micros: number) { return `${Math.round(micros / 1_000_000).toLocaleString("ko-KR")}원`; }
const inputClass = "h-11 w-full rounded-md border border-line bg-white px-3 text-sm font-bold outline-none focus:border-foreground";
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1 text-xs font-black text-muted">{label}{children}</label>; }
