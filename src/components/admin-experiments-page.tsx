"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Beaker, Play, Pause, RotateCcw, Square, Send, RefreshCw } from "lucide-react";
import { experimentApi, type CreateExperimentPayload, type ExperimentEventType, type ExperimentStatus, type ExperimentSubjectType } from "@/lib/api/experiment";
import { cn } from "@/lib/utils";
import { AdminAuthRequired, adminLinks, useAdminToken } from "./admin-console";
import { ConsoleHeader, ConsoleLayout, ConsoleSection, DataTable, FilterField, FilterPanel, StatusBadge, SummaryStrip } from "./console-layout";
import { Button } from "./ui/button";

type ExperimentForm = {
  key: string;
  name: string;
  domain: string;
  status: ExperimentStatus;
  includeAnonymous: boolean;
  startedAt: string;
  endedAt: string;
  primaryMetric: string;
  description: string;
  segmentCount: string;
};

const defaultBaseUrl = process.env.NEXT_PUBLIC_EXPERIMENT_API_BASE_URL || "/experiment-api";

export function AdminExperimentsPage() {
  const adminToken = useAdminToken();
  const queryClient = useQueryClient();
  const [experimentBaseUrl, setExperimentBaseUrl] = useState(() => readStoredValue("experimentApiBaseUrl", defaultBaseUrl));
  const [experimentAdminToken, setExperimentAdminToken] = useState(() => readStoredValue("experimentAdminToken", ""));
  const [selectedID, setSelectedID] = useState<number | null>(null);
  const [form, setForm] = useState<ExperimentForm>(() => demoForm());
  const [subjectType, setSubjectType] = useState<ExperimentSubjectType>("ANONYMOUS");
  const [subjectKey, setSubjectKey] = useState("anon-admin-demo-001");
  const [eventVariantKey, setEventVariantKey] = useState("");
  const [eventRevenue, setEventRevenue] = useState("12900");
  const [lastResponse, setLastResponse] = useState<unknown>(null);
  const options = useMemo(() => ({ baseUrl: experimentBaseUrl, adminToken: experimentAdminToken }), [experimentBaseUrl, experimentAdminToken]);



  const experimentsQuery = useQuery({
    queryKey: ["experiment-admin", "experiments", experimentBaseUrl, experimentAdminToken],
    queryFn: () => experimentApi.listExperiments(options),
    enabled: Boolean(adminToken && experimentAdminToken),
  });

  const experiments = useMemo(() => experimentsQuery.data?.experiments ?? [], [experimentsQuery.data?.experiments]);
  const selected = experiments.find((experiment) => experiment.id === selectedID) ?? experiments[0] ?? null;
  const selectedEventVariantKey = selected?.variants.some((variant) => variant.key === eventVariantKey) ? eventVariantKey : selected?.variants[0]?.key ?? "";

  const resultQuery = useQuery({
    queryKey: ["experiment-admin", "results", selected?.id, experimentBaseUrl, experimentAdminToken],
    queryFn: () => experimentApi.getResult(selected?.id ?? 0, options),
    enabled: Boolean(adminToken && experimentAdminToken && selected?.id),
  });



  const createExperiment = useMutation({
    mutationFn: () => experimentApi.createExperiment(formPayload(form), options),
    onSuccess: (experiment) => {
      setLastResponse(experiment);
      setSelectedID(experiment.id);
      void queryClient.invalidateQueries({ queryKey: ["experiment-admin", "experiments"] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "start" | "pause" | "resume" | "end" }) => experimentApi.changeStatus(id, action, options),
    onSuccess: (experiment) => {
      setLastResponse(experiment);
      void queryClient.invalidateQueries({ queryKey: ["experiment-admin"] });
    },
  });

  const patchStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ExperimentStatus }) => experimentApi.patchStatus(id, status, options),
    onSuccess: (experiment) => {
      setLastResponse(experiment);
      void queryClient.invalidateQueries({ queryKey: ["experiment-admin"] });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: () => {
      if (!selected) {
        throw new Error("실험을 선택해 주세요.");
      }
      return experimentApi.resolveAssignment(
        {
          experiment_keys: [selected.key],
          subject: { type: subjectType, key: subjectKey.trim() },
          context: { surface: "admin-experiments" },
        },
        options,
      );
    },
    onSuccess: setLastResponse,
  });

  const eventMutation = useMutation({
    mutationFn: (eventType: ExperimentEventType) => {
      if (!selected) {
        throw new Error("실험을 선택해 주세요.");
      }
      return experimentApi.recordEvent(
        {
          event_id: `admin-${Date.now()}-${eventType}`,
          event_type: eventType,
          experiment_key: selected.key,
          variant_key: selectedEventVariantKey,
          subject: { type: subjectType, key: subjectKey.trim() },
          occurred_at: new Date().toISOString(),
          source: { service: "commerce-web-admin", endpoint: "/admin/experiments" },
          payload: eventType === "purchase" ? { revenue: Number(eventRevenue) || 0 } : undefined,
        },
        options,
      );
    },
    onSuccess: (_, eventType) => {
      setLastResponse({ accepted: true, event_type: eventType, variant_key: selectedEventVariantKey });
      void queryClient.invalidateQueries({ queryKey: ["experiment-admin", "results"] });
    },
  });

  if (!adminToken) {
    return <AdminAuthRequired />;
  }

  const result = resultQuery.data;
  const totalImpressions = result?.variants.reduce((sum, variant) => sum + variant.impressions, 0) ?? 0;
  const totalPurchases = result?.variants.reduce((sum, variant) => sum + variant.purchases, 0) ?? 0;
  const totalRevenue = result?.variants.reduce((sum, variant) => sum + variant.revenue, 0) ?? 0;
  const error = createExperiment.error ?? statusMutation.error ?? patchStatusMutation.error ?? resolveMutation.error ?? eventMutation.error ?? experimentsQuery.error ?? resultQuery.error;

  return (
    <ConsoleLayout title="Admin" subtitle="플랫폼 운영 콘솔" links={adminLinks}>
      <ConsoleHeader
        title="실험 관리"
        description="상품 카테고리 노출 순서 같은 운영 실험을 등록하고, 배정과 이벤트 집계 결과를 확인합니다."
        action={
          <Button variant="secondary" onClick={() => void experimentsQuery.refetch()}>
            <RefreshCw size={16} />
            새로고침
          </Button>
        }
      />

      <ConsoleSection className="mt-5" title="실험 서버 연결">
        <FilterPanel>
          <FilterField label="Experiment API base">
            <input className="h-10 rounded-md border border-line bg-white px-3 text-sm outline-none" value={experimentBaseUrl} onChange={(event) => { setExperimentBaseUrl(event.target.value); storeValue("experimentApiBaseUrl", event.target.value); }} />
          </FilterField>
          <FilterField label="Experiment admin token">
            <input className="h-10 rounded-md border border-line bg-white px-3 text-sm outline-none" type="password" value={experimentAdminToken} onChange={(event) => { setExperimentAdminToken(event.target.value); storeValue("experimentAdminToken", event.target.value); }} />
          </FilterField>
          <FilterField label="상태">
            <div className={cn("flex h-10 items-center rounded-md border px-3 text-sm font-bold", experimentAdminToken ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-line bg-white text-muted")}>
              {experimentAdminToken ? "토큰 입력됨" : "토큰 필요"}
            </div>
          </FilterField>
        </FilterPanel>
        {error ? <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error.message}</p> : null}
      </ConsoleSection>

      <div className="mt-5">
        <SummaryStrip
          items={[
            { label: "전체 실험", value: `${experiments.length}개` },
            { label: "실행 중", value: `${experiments.filter((experiment) => experiment.status === "RUNNING").length}개` },
            { label: "노출", value: totalImpressions.toLocaleString("ko-KR") },
            { label: "구매/매출", value: `${totalPurchases.toLocaleString("ko-KR")}건 / ${Math.round(totalRevenue).toLocaleString("ko-KR")}원` },
          ]}
        />
      </div>

      <div className="mt-5 grid items-start gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <ConsoleSection title="실험 목록" action={<StatusBadge value={experimentsQuery.isFetching ? "INFO" : "ACTIVE"} />}>
          <div className="max-h-[520px] overflow-y-auto rounded-md border border-line">
            {experiments.length ? (
              experiments.map((experiment) => {
                const selectedExperiment = experiment.id === selected?.id;
                return (
                  <button
                    key={experiment.id}
                    type="button"
                    className={cn("block w-full border-b border-line px-3 py-3 text-left transition last:border-b-0 hover:bg-zinc-50", selectedExperiment && "bg-brand/5")}
                    onClick={() => setSelectedID(experiment.id)}
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={cn("truncate text-sm font-black", selectedExperiment && "text-brand")}>{experiment.name}</p>
                        <p className="mt-1 truncate text-xs font-bold text-muted">{experiment.key}</p>
                      </div>
                      <StatusBadge value={experiment.status} />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="min-w-0 rounded bg-zinc-50 px-2 py-1">
                        <p className="font-black text-muted">대상</p>
                        <p className="truncate font-bold text-foreground">{experiment.include_anonymous ? "회원 + 비회원" : "회원만"}</p>
                      </div>
                      <div className="min-w-0 rounded bg-zinc-50 px-2 py-1">
                        <p className="font-black text-muted">지표</p>
                        <p className="truncate font-bold text-foreground">{experiment.primary_metric}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-10 text-center text-sm font-bold text-muted">{experimentsQuery.isFetching ? "불러오는 중입니다." : "등록된 실험이 없습니다."}</div>
            )}
          </div>
        </ConsoleSection>
        <ConsoleSection title="실험 생성" action={<Button variant="secondary" onClick={() => setForm(demoForm())}><Beaker size={16} />데모 채우기</Button>}>
          <div className="grid gap-3 md:grid-cols-2">
            <TextField label="키" value={form.key} onChange={(value) => setForm((current) => ({ ...current, key: value }))} />
            <TextField label="이름" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
            <TextField label="도메인" value={form.domain} onChange={(value) => setForm((current) => ({ ...current, domain: value }))} />
            <SelectField label="상태" value={form.status} onChange={(value) => setForm((current) => ({ ...current, status: value as ExperimentStatus }))} options={["DRAFT", "SCHEDULED", "RUNNING", "PAUSED"]} />
            <SelectField label="대상" value={form.includeAnonymous ? "true" : "false"} onChange={(value) => setForm((current) => ({ ...current, includeAnonymous: value === "true" }))} options={["true", "false"]} labels={{ true: "회원 + 비회원", false: "회원만" }} />
            <SelectField label="주 지표" value={form.primaryMetric} onChange={(value) => setForm((current) => ({ ...current, primaryMetric: value }))} options={["purchase_rate", "revenue_per_user", "ctr", "impressions"]} />
            <TextField label="세그먼트 수" type="number" value={form.segmentCount} onChange={(value) => setForm((current) => ({ ...current, segmentCount: value }))} />
            <TextField label="시작 일시" type="datetime-local" value={form.startedAt} onChange={(value) => setForm((current) => ({ ...current, startedAt: value }))} />
            <TextField label="종료 일시" type="datetime-local" value={form.endedAt} onChange={(value) => setForm((current) => ({ ...current, endedAt: value }))} />
          </div>
          <div className="mt-3">
            <TextField label="설명" value={form.description} onChange={(value) => setForm((current) => ({ ...current, description: value }))} />
          </div>
          <div className="mt-3 flex justify-end">
            <Button disabled={!experimentAdminToken || createExperiment.isPending} onClick={() => createExperiment.mutate()}>{createExperiment.isPending ? "생성 중" : "실험 생성"}</Button>
          </div>
        </ConsoleSection>
      </div>

      <div className="mt-5 grid gap-4">
        <ConsoleSection
          title="선택한 실험"
          description={selected ? `${selected.key} / ${selected.domain}` : "실험을 선택해 주세요."}
          action={
            selected ? (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: selected.id, action: "start" })}><Play size={14} />시작</Button>
                <Button size="sm" variant="secondary" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: selected.id, action: "pause" })}><Pause size={14} />중지</Button>
                <Button size="sm" variant="secondary" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: selected.id, action: "resume" })}><RotateCcw size={14} />재개</Button>
                <Button size="sm" variant="secondary" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: selected.id, action: "end" })}><Square size={14} />종료</Button>
              </div>
            ) : null
          }
        >
          {selected ? (
            <>
              <SummaryStrip
                items={[
                  { label: "상태", value: <StatusBadge value={selected.status} /> },
                  { label: "대상", value: selected.include_anonymous ? "회원 + 비회원" : "회원만" },
                  { label: "승리군", value: result?.winner?.variant_key ?? "-" },
                  { label: "판정", value: result?.decision ?? "-" },
                ]}
              />
              <div className="mt-4 flex flex-wrap gap-2">
                {(["DRAFT", "RUNNING", "PAUSED", "ENDED"] as ExperimentStatus[]).map((status) => (
                  <Button key={status} size="sm" variant="secondary" disabled={patchStatusMutation.isPending} onClick={() => patchStatusMutation.mutate({ id: selected.id, status })}>{status}</Button>
                ))}
              </div>
              <div className="mt-4">
                <DataTable
                  columns={["세그먼트", "트래픽"]}
                  rows={selected.variants.map((variant) => [
                    <div key="variant"><p className="font-bold">{variant.key}</p><p className="text-xs text-muted">{variant.name}</p></div>,
                    `${variant.traffic_weight}%`,
                  ])}
                />
              </div>
            </>
          ) : (
            <p className="text-sm font-bold text-muted">표시할 실험이 없습니다.</p>
          )}
        </ConsoleSection>

        <ConsoleSection title="배정, 이벤트, 결과 검증">
          <div className="grid gap-3 md:grid-cols-4">
            <SelectField label="Subject" value={subjectType} onChange={(value) => setSubjectType(value as ExperimentSubjectType)} options={["ANONYMOUS", "MEMBER"]} />
            <TextField label="Subject key" value={subjectKey} onChange={setSubjectKey} />
            <SelectField label="Variant" value={selectedEventVariantKey} onChange={setEventVariantKey} options={selected?.variants.map((variant) => variant.key) ?? []} />
            <TextField label="Revenue" type="number" value={eventRevenue} onChange={setEventRevenue} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" disabled={!selected || resolveMutation.isPending} onClick={() => resolveMutation.mutate()}>배정 확인</Button>
            <Button variant="secondary" disabled={!selected || eventMutation.isPending} onClick={() => eventMutation.mutate("impression")}><Send size={14} />노출</Button>
            <Button variant="secondary" disabled={!selected || eventMutation.isPending} onClick={() => eventMutation.mutate("add_to_cart")}>장바구니</Button>
            <Button disabled={!selected || eventMutation.isPending} onClick={() => eventMutation.mutate("purchase")}>구매</Button>
          </div>
          <div className="mt-4">
            <DataTable
              columns={["군", "노출", "장바구니", "구매", "구매율", "객단 매출"]}
              rows={(result?.variants ?? []).map((variant) => [
                variant.variant_key,
                variant.impressions.toLocaleString("ko-KR"),
                variant.add_to_carts.toLocaleString("ko-KR"),
                variant.purchases.toLocaleString("ko-KR"),
                `${(variant.purchase_rate * 100).toFixed(1)}%`,
                Math.round(variant.revenue_per_user).toLocaleString("ko-KR"),
              ])}
            />
          </div>
          <pre className="mt-4 max-h-72 overflow-auto rounded-md bg-zinc-950 p-3 text-xs leading-5 text-zinc-50">{JSON.stringify(lastResponse ?? result ?? {}, null, 2)}</pre>
        </ConsoleSection>
      </div>
    </ConsoleLayout>
  );
}

function TextField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="grid gap-1 text-xs font-black text-muted">
      {label}
      <input className="h-10 rounded-md border border-line bg-white px-3 text-sm text-foreground outline-none" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField({ label, value, options, labels, onChange }: { label: string; value: string; options: string[]; labels?: Record<string, string>; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-xs font-black text-muted">
      {label}
      <select className="h-10 rounded-md border border-line bg-white px-3 text-sm font-bold text-foreground outline-none" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{labels?.[option] ?? option}</option>)}
      </select>
    </label>
  );
}

function readStoredValue(key: string, fallback: string) {
  if (typeof window === "undefined") {
    return fallback;
  }
  return localStorage.getItem(key) || fallback;
}

function storeValue(key: string, value: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(key, value);
  }
}

function demoForm(): ExperimentForm {
  const suffix = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  return {
    key: `category_order_home_v1_admin_${suffix}`,
    name: "카테고리 조회 순서 실험",
    domain: "CATALOG",
    status: "DRAFT",
    includeAnonymous: true,
    startedAt: "",
    endedAt: "",
    primaryMetric: "purchase_rate",
    description: "카테고리 조회 API에서 사용자 세그먼트별 a,b,c,d,e 노출 순서를 비교합니다.",
    segmentCount: "2",
  };
}

function formPayload(form: ExperimentForm): CreateExperimentPayload {
  return {
    key: form.key.trim(),
    name: form.name.trim(),
    domain: form.domain.trim(),
    status: form.status,
    include_anonymous: form.includeAnonymous,
    started_at: form.startedAt ? new Date(form.startedAt).toISOString() : undefined,
    ended_at: form.endedAt ? new Date(form.endedAt).toISOString() : undefined,
    primary_metric: form.primaryMetric,
    description: form.description.trim(),
    variants: segmentVariants(Number(form.segmentCount) || 2),
  };
}

function segmentVariants(count: number): CreateExperimentPayload["variants"] {
  const normalized = Math.min(Math.max(Math.trunc(count), 2), 10);
  const base = Math.floor(100 / normalized);
  let remainder = 100 - base * normalized;
  return Array.from({ length: normalized }, (_, index) => {
    const key = String.fromCharCode(65 + index);
    const trafficWeight = base + (remainder > 0 ? 1 : 0);
    remainder -= remainder > 0 ? 1 : 0;
    return { key, name: `${key}군`, traffic_weight: trafficWeight };
  });
}