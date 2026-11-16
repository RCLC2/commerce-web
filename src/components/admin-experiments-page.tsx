"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Beaker, History, Plus, RefreshCw, Save, ShieldAlert, X } from "lucide-react";
import { api } from "@/lib/api";
import {
  ExperimentApiError,
  experimentApi,
  type CreateExperimentPayload,
  type Experiment,
  type ExperimentConclusion,
  type ExperimentOverride,
  type ExperimentStatus,
  type ExperimentSubjectType,
  type ExperimentTargetingRule,
  type ExperimentValueType,
  type ExperimentVariant,
  type UpdateExperimentConfigPayload,
} from "@/lib/api/experiment";
import { apiErrorMessage } from "@/lib/api-client";
import { displayLabel } from "@/lib/display-labels";
import { cn } from "@/lib/utils";
import { AdminAuthRequired, adminLinks, useAdminToken } from "./admin-console";
import { ConsoleHeader, ConsoleLayout, ConsoleSection, DataTable, StatusBadge, SummaryStrip } from "./console-layout";
import { Button } from "./ui/button";
import { Input, Select } from "./ui/input";
import { TrafficAllocationBar } from "./admin-experiments/traffic-allocation-bar";
import { StructuredValueEditor } from "./admin-experiments/structured-value-editor";
import { OverrideEditor, TargetingRuleEditor } from "./admin-experiments/targeting-editors";

type WorkspaceTab = "BASIC" | "TRAFFIC" | "TARGETING" | "RESULTS";
type ExperimentDraft = {
  valueType: ExperimentValueType;
  defaultValue: unknown;
  includeAnonymous: boolean;
  variants: ExperimentVariant[];
  targetingRules: ExperimentTargetingRule[];
  overrides: ExperimentOverride[];
  conclusion: ExperimentConclusion;
  winnerVariantKey: string;
  decisionReason: string;
};
type CreateForm = { key: string; name: string; domain: string; description: string; primaryMetric: string };

const tabs: Array<{ id: WorkspaceTab; label: string }> = [
  { id: "BASIC", label: "기본 설정" }, { id: "TRAFFIC", label: "트래픽" },
  { id: "TARGETING", label: "대상 설정" }, { id: "RESULTS", label: "결과와 이력" },
];

export function AdminExperimentsPage() {
  const token = useAdminToken();
  const queryClient = useQueryClient();
  const options = useMemo(() => ({ token: token ?? undefined }), [token]);
  const [selectedID, setSelectedID] = useState<number | null>(null);
  const [tab, setTab] = useState<WorkspaceTab>("BASIC");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(() => emptyCreateForm());
  const [draft, setDraft] = useState<ExperimentDraft | null>(null);
  const [baseRevision, setBaseRevision] = useState(0);
  const [draftExperimentID, setDraftExperimentID] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [changeReason, setChangeReason] = useState("운영 설정 변경");
  const [conflictRevision, setConflictRevision] = useState<number | null>(null);
  const [killSwitchTarget, setKillSwitchTarget] = useState<boolean | null>(null);
  const [rollbackRevision, setRollbackRevision] = useState<number | null>(null);
  const [subjectType, setSubjectType] = useState<ExperimentSubjectType>("MEMBER");
  const [subjectKey, setSubjectKey] = useState("qa-member-1004");
  const [simulationContext, setSimulationContext] = useState<unknown>({ country: "KR", orders: 3 });
  const [lastSimulation, setLastSimulation] = useState<unknown>(null);

  const experimentsQuery = useQuery({ queryKey: ["experiment-admin", "experiments"], queryFn: () => experimentApi.listExperiments(options), enabled: Boolean(token) });
  const profileQuery = useQuery({ queryKey: ["experiment-admin", "profile"], queryFn: () => api.me(token ?? ""), enabled: Boolean(token) });
  const experiments = useMemo(() => experimentsQuery.data?.experiments ?? [], [experimentsQuery.data?.experiments]);
  const selected = experiments.find((experiment) => experiment.id === selectedID) ?? experiments[0] ?? null;

  useEffect(() => {
    if (!selected) return;
    if (draftExperimentID !== selected.id || (!dirty && baseRevision !== selected.revision)) {
      setDraft(draftFromExperiment(selected));
      setDraftExperimentID(selected.id);
      setBaseRevision(selected.revision);
      setConflictRevision(null);
      setDirty(false);
    }
  }, [baseRevision, dirty, draftExperimentID, selected]);

  const resultQuery = useQuery({ queryKey: ["experiment-admin", "results", selected?.id], queryFn: () => experimentApi.getResult(selected?.id ?? 0, options), enabled: Boolean(token && selected?.id) });
  const revisionsQuery = useQuery({ queryKey: ["experiment-admin", "revisions", selected?.id], queryFn: () => experimentApi.listRevisions(selected?.id ?? 0, options), enabled: Boolean(token && selected?.id) });
  async function refreshAll() { await queryClient.invalidateQueries({ queryKey: ["experiment-admin"] }); }

  const createMutation = useMutation({
    mutationFn: () => experimentApi.createExperiment(createPayload(createForm), options),
    onSuccess: async (experiment) => { setDrawerOpen(false); setSelectedID(experiment.id); setCreateForm(emptyCreateForm()); await refreshAll(); },
  });
  const configMutation = useMutation({
    mutationFn: () => {
      if (!selected || !draft) throw new Error("실험을 선택해 주세요.");
      const errors = validateDraft(draft, changeReason);
      if (errors.length > 0) throw new Error(errors[0]);
      return experimentApi.updateConfig(selected.id, configPayload(draft, baseRevision, selected, changeReason), options);
    },
    onSuccess: async (experiment) => { setDraft(draftFromExperiment(experiment)); setBaseRevision(experiment.revision); setDirty(false); setConflictRevision(null); await refreshAll(); },
    onError: async (error) => {
      if (error instanceof ExperimentApiError && error.status === 409) { setConflictRevision(error.currentRevision ?? null); await queryClient.invalidateQueries({ queryKey: ["experiment-admin", "experiments"] }); }
    },
  });
  const killSwitchMutation = useMutation({
    mutationFn: () => {
      if (!selected || killSwitchTarget === null) throw new Error("Kill Switch 변경 대상을 확인해 주세요.");
      return experimentApi.changeKillSwitch(selected.id, { enabled: killSwitchTarget, expected_revision: selected.revision, change_reason: killSwitchTarget ? "긴급 Kill Switch 활성화" : "Kill Switch 해제" }, options);
    },
    onSuccess: async () => { setKillSwitchTarget(null); await refreshAll(); },
  });
  const statusMutation = useMutation({
    mutationFn: (status: ExperimentStatus) => {
      if (!selected) throw new Error("실험을 선택해 주세요.");
      return experimentApi.patchStatus(selected.id, status, { expected_revision: selected.revision, change_reason: `상태를 ${status}(으)로 변경` }, options);
    },
    onSuccess: refreshAll,
  });
  const rollbackMutation = useMutation({
    mutationFn: () => {
      if (!selected || rollbackRevision === null) throw new Error("롤백할 revision을 선택해 주세요.");
      return experimentApi.rollbackConfig(selected.id, rollbackRevision, { expected_revision: selected.revision, change_reason: `revision ${rollbackRevision} 설정을 새 revision으로 복원` }, options);
    },
    onSuccess: async () => { setRollbackRevision(null); await refreshAll(); },
  });
  const simulationMutation = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("실험을 선택해 주세요.");
      return experimentApi.simulate(selected.id, { subject: { type: subjectType, key: subjectKey.trim() }, context: isRecord(simulationContext) ? simulationContext : {} }, options);
    },
    onSuccess: setLastSimulation,
  });

  if (!token) return <AdminAuthRequired />;
  const draftErrors = draft ? validateDraft(draft, changeReason) : [];
  const error = createMutation.error ?? configMutation.error ?? killSwitchMutation.error ?? statusMutation.error ?? rollbackMutation.error ?? simulationMutation.error ?? experimentsQuery.error;

  return (
    <ConsoleLayout title="관리자" subtitle="플랫폼 운영 콘솔" links={adminLinks}>
      <ConsoleHeader title="실험 관리" description="서버가 최종 판정하는 피처 플래그와 실험을 안전하게 운영합니다." action={<div className="flex gap-2"><Button variant="secondary" onClick={() => void refreshAll()}><RefreshCw size={16} />새로고침</Button><Button onClick={() => setDrawerOpen(true)}><Plus size={16} />실험 생성</Button></div>} />
      {error ? <div className="mt-4 rounded-lg border border-status-negative-border bg-status-negative-subtle p-3 text-sm font-bold text-status-negative">{apiErrorMessage(error)}</div> : null}
      <div className="mt-5 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <ConsoleSection title="실험 목록" description={`${experiments.length}개 실험`}>
          <div className="grid max-h-[760px] gap-2 overflow-auto">
            {experiments.map((experiment) => <button type="button" key={experiment.id} className={cn("rounded-lg border p-3 text-left transition", selected?.id === experiment.id ? "border-action-primary bg-action-secondary" : "border-border-subtle bg-surface-raised hover:border-border-interactive")} onClick={() => { if (dirty && !window.confirm("저장하지 않은 변경을 버리고 다른 실험으로 이동할까요?")) return; setSelectedID(experiment.id); setDraftExperimentID(null); }}><div className="flex items-start justify-between gap-2"><p className="font-bold text-content-primary">{experiment.name}</p><StatusBadge value={experiment.status} /></div><p className="mt-1 text-xs text-content-secondary">{experiment.key}</p><div className="mt-3 flex items-center justify-between text-xs font-bold text-content-secondary"><span>Revision {experiment.revision}</span><span>{experiment.variants.map((variant) => `${variant.traffic_weight}%`).join(" / ")}</span></div></button>)}
            {experiments.length === 0 ? <p className="py-12 text-center text-sm font-bold text-content-secondary">등록된 실험이 없습니다.</p> : null}
          </div>
        </ConsoleSection>
        <div className="min-w-0">
          {selected && draft ? <>
            <ConsoleSection className="sticky top-3 z-20" title={selected.name} description={selected.description} action={<StatusBadge value={selected.kill_switch ? "KILL SWITCH ON" : selected.status} />}>
              <SummaryStrip items={[{ label: "Revision", value: `#${selected.revision}` }, { label: "트래픽", value: draft.variants.map((variant) => `${variant.name} ${variant.traffic_weight}%`).join(" · ") }, { label: "마지막 변경", value: new Date(selected.updated_at).toLocaleString("ko-KR") }, { label: "초안", value: dirty ? "저장되지 않은 변경 있음" : "저장됨" }]} />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2">{(["DRAFT", "RUNNING", "PAUSED", "ENDED"] as ExperimentStatus[]).map((status) => <Button key={status} size="sm" variant="secondary" disabled={status === selected.status || statusMutation.isPending} onClick={() => statusMutation.mutate(status)}>{displayLabel(status)}</Button>)}</div><Button variant={selected.kill_switch ? "secondary" : "danger"} onClick={() => setKillSwitchTarget(!selected.kill_switch)}><ShieldAlert size={16} />{selected.kill_switch ? "긴급 중단 해제" : "긴급 중단"}</Button></div>
            </ConsoleSection>
            <div className="mt-4 flex gap-1 overflow-x-auto rounded-lg border border-border-subtle bg-surface-raised p-1">{tabs.map((item) => <button type="button" key={item.id} className={cn("min-w-28 rounded-md px-4 py-3 text-sm font-bold", tab === item.id ? "bg-content-primary text-content-inverse" : "text-content-secondary hover:bg-surface-subtle")} onClick={() => setTab(item.id)}>{item.label}</button>)}</div>
            <div className="mt-4">
              {tab === "BASIC" ? <BasicTab draft={draft} onChange={(next) => updateDraft(next, setDraft, setDirty)} /> : null}
              {tab === "TRAFFIC" ? <TrafficTab draft={draft} onChange={(next) => updateDraft(next, setDraft, setDirty)} /> : null}
              {tab === "TARGETING" ? <TargetingTab draft={draft} subjectType={subjectType} subjectKey={subjectKey} simulationContext={simulationContext} lastSimulation={lastSimulation} onDraftChange={(next) => updateDraft(next, setDraft, setDirty)} onSubjectType={setSubjectType} onSubjectKey={setSubjectKey} onSimulationContext={setSimulationContext} onSimulate={() => simulationMutation.mutate()} /> : null}
              {tab === "RESULTS" ? <ResultsTab selected={selected} draft={draft} result={resultQuery.data} revisions={revisionsQuery.data?.revisions ?? []} onDraftChange={(next) => updateDraft(next, setDraft, setDirty)} onRollback={setRollbackRevision} /> : null}
            </div>
            {conflictRevision !== null ? <div className="sticky bottom-24 z-30 mt-4 rounded-xl border border-status-warning-border bg-status-warning-subtle p-4 shadow-xl" data-testid="revision-conflict"><div className="flex items-start gap-3"><AlertTriangle size={22} /><div><p className="font-bold">다른 관리자가 먼저 저장했습니다.</p><p className="mt-1 text-sm">내 초안은 revision #{baseRevision} 기준이며 서버는 #{conflictRevision || selected.revision}입니다. 초안은 보존되어 있습니다.</p></div></div><div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" onClick={() => { setDraft(draftFromExperiment(selected)); setBaseRevision(selected.revision); setDirty(false); setConflictRevision(null); }}>최신 설정 불러오기</Button><Button onClick={() => { setBaseRevision(selected.revision); setConflictRevision(null); setDirty(true); }}>내 변경을 최신 revision에 재적용</Button></div></div> : null}
            <div className="sticky bottom-3 z-20 mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border-interactive bg-surface-raised p-4 shadow-xl"><div><p className="font-bold text-content-primary">{dirty ? "저장하지 않은 변경이 있습니다." : "서버 설정과 동일합니다."}</p><p className={cn("mt-1 text-xs font-bold", draftErrors.length > 0 ? "text-status-negative" : "text-content-secondary")}>{draftErrors[0] ?? `Revision #${baseRevision} 기준으로 저장합니다.`}</p></div><div className="flex min-w-72 items-end gap-2"><label className="grid flex-1 gap-1 text-xs font-bold text-content-secondary">변경 사유<Input className="h-10 rounded-md border border-border-interactive px-3 text-sm" value={changeReason} onChange={(event) => setChangeReason(event.target.value)} /></label><Button disabled={!dirty || draftErrors.length > 0 || configMutation.isPending} onClick={() => configMutation.mutate()}><Save size={16} />{configMutation.isPending ? "저장 중" : "변경 저장"}</Button></div></div>
          </> : <ConsoleSection><p className="py-20 text-center text-sm font-bold text-content-secondary">운영할 실험을 선택해 주세요.</p></ConsoleSection>}
        </div>
      </div>
      {drawerOpen ? <CreateDrawer form={createForm} pending={createMutation.isPending} onChange={setCreateForm} onClose={() => setDrawerOpen(false)} onCreate={() => createMutation.mutate()} /> : null}
      {killSwitchTarget !== null && selected ? <ConfirmDialog title={killSwitchTarget ? "실험을 즉시 중단할까요?" : "긴급 중단을 해제할까요?"} description={`${selected.name}의 다음 서버 판정부터 ${killSwitchTarget ? "모든 사용자를 제외" : "정상 평가를 재개"}합니다. 변경자는 ${profileQuery.data?.email ?? "현재 관리자"}로 자동 기록됩니다.`} confirmLabel={killSwitchTarget ? "즉시 중단" : "중단 해제"} danger={killSwitchTarget} pending={killSwitchMutation.isPending} onCancel={() => setKillSwitchTarget(null)} onConfirm={() => killSwitchMutation.mutate()} /> : null}
      {rollbackRevision !== null && selected ? <ConfirmDialog title={`Revision #${rollbackRevision} 설정을 복원할까요?`} description={`현재 #${selected.revision} 설정을 덮어쓰지 않고 과거 스냅샷을 새 revision으로 커밋합니다. 변경자는 ${profileQuery.data?.email ?? "현재 관리자"}로 기록됩니다.`} confirmLabel="새 revision으로 복원" pending={rollbackMutation.isPending} onCancel={() => setRollbackRevision(null)} onConfirm={() => rollbackMutation.mutate()} /> : null}
    </ConsoleLayout>
  );
}

function BasicTab({ draft, onChange }: { draft: ExperimentDraft; onChange: (draft: ExperimentDraft) => void }) {
  return <ConsoleSection title="기본 설정" description="대조군은 현재 운영 기준이며, 실험군은 새 변경의 효과를 검증합니다."><div className="grid gap-4"><div className="grid gap-3 md:grid-cols-2"><SelectField label="값 타입" value={draft.valueType} options={["BOOLEAN", "STRING", "NUMBER", "JSON"]} onChange={(value) => { const nextType = value as ExperimentValueType; const nextValue = defaultValue(nextType); onChange({ ...draft, valueType: nextType, defaultValue: nextValue, variants: draft.variants.map((variant) => ({ ...variant, value: cloneValue(nextValue) })) }); }} /><SelectField label="비회원 평가" value={draft.includeAnonymous ? "true" : "false"} options={["true", "false"]} labels={{ true: "허용", false: "회원만" }} onChange={(value) => onChange({ ...draft, includeAnonymous: value === "true" })} /></div><StructuredValueEditor label="기본 반환값" value={draft.defaultValue} onChange={(value) => onChange({ ...draft, defaultValue: value })} /><div className="grid gap-3">{draft.variants.map((variant, index) => <div key={variant.key} className="rounded-xl border border-border-subtle bg-surface-subtle p-4"><div className="mb-3 flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold">{variant.role === "CONTROL" ? "대조군" : "실험군"} · {variant.name}</p><p className="mt-1 text-xs text-content-secondary">{variant.role === "CONTROL" ? "현재 운영 기능으로 비교 기준입니다. (Control)" : "새롭게 적용해 효과를 확인하는 군입니다. (Treatment)"}</p></div>{variant.role !== "CONTROL" ? <Button size="sm" variant="secondary" onClick={() => onChange({ ...draft, variants: draft.variants.map((item, itemIndex) => ({ ...item, role: itemIndex === index ? "CONTROL" : "TREATMENT" })) })}>대조군으로 지정</Button> : <StatusBadge value="CONTROL" />}</div><div className="grid gap-3 md:grid-cols-2"><TextField label="기술 키" value={variant.key} disabled onChange={() => undefined} /><TextField label="운영 이름" value={variant.name} onChange={(value) => onChange({ ...draft, variants: replaceVariant(draft.variants, index, { ...variant, name: value }) })} /><div className="md:col-span-2"><TextField label="사용자에게 보이는 차이 설명" value={variant.description} onChange={(value) => onChange({ ...draft, variants: replaceVariant(draft.variants, index, { ...variant, description: value }) })} /></div></div><div className="mt-3"><StructuredValueEditor label={`${variant.name} 반환값`} value={variant.value} onChange={(value) => onChange({ ...draft, variants: replaceVariant(draft.variants, index, { ...variant, value }) })} /></div></div>)}</div></div></ConsoleSection>;
}

function TrafficTab({ draft, onChange }: { draft: ExperimentDraft; onChange: (draft: ExperimentDraft) => void }) {
  return <ConsoleSection title="트래픽" description="핸들을 움직이면 맞닿은 두 군만 1% 단위로 바뀌며 합계는 항상 100%입니다."><TrafficAllocationBar variants={draft.variants} onChange={(weights) => onChange({ ...draft, variants: draft.variants.map((variant, index) => ({ ...variant, traffic_weight: weights[index] })) })} /><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{draft.variants.map((variant) => <div key={variant.key} className="rounded-lg border border-border-subtle p-3"><p className="text-xs font-bold text-content-secondary">{variant.role === "CONTROL" ? "대조군" : "실험군"}</p><div className="mt-1 flex items-end justify-between gap-2"><div><p className="font-bold">{variant.name}</p><p className="mt-1 text-xs text-content-secondary">{variant.description}</p></div><p className="text-2xl font-black">{variant.traffic_weight}%</p></div></div>)}</div><p className="mt-4 text-sm font-bold text-status-positive">합계 {draft.variants.reduce((sum, variant) => sum + variant.traffic_weight, 0)}%</p></ConsoleSection>;
}

function TargetingTab(props: { draft: ExperimentDraft; subjectType: ExperimentSubjectType; subjectKey: string; simulationContext: unknown; lastSimulation: unknown; onDraftChange: (draft: ExperimentDraft) => void; onSubjectType: (value: ExperimentSubjectType) => void; onSubjectKey: (value: string) => void; onSimulationContext: (value: unknown) => void; onSimulate: () => void }) {
  return <div className="grid gap-4"><ConsoleSection title="타게팅 조건"><TargetingRuleEditor rules={props.draft.targetingRules} onChange={(targetingRules) => props.onDraftChange({ ...props.draft, targetingRules })} /></ConsoleSection><ConsoleSection title="사용자 고정 배정" description="QA 사용자나 특정 사용자를 지정한 군에 고정합니다."><OverrideEditor overrides={props.draft.overrides} variants={props.draft.variants} onChange={(overrides) => props.onDraftChange({ ...props.draft, overrides })} /></ConsoleSection><ConsoleSection title="중앙 판정 시뮬레이터" description="실제 배정을 저장하지 않고 서버의 동일한 평가 규칙을 실행합니다."><div className="grid gap-3 md:grid-cols-2"><SelectField label="사용자 유형" value={props.subjectType} options={["MEMBER", "ANONYMOUS"]} labels={{ MEMBER: "회원", ANONYMOUS: "비회원" }} onChange={(value) => props.onSubjectType(value as ExperimentSubjectType)} /><TextField label="사용자 식별자" value={props.subjectKey} onChange={props.onSubjectKey} /></div><div className="mt-3"><StructuredValueEditor label="판정 context" value={props.simulationContext} onChange={props.onSimulationContext} /></div><div className="mt-3 flex justify-end"><Button variant="secondary" onClick={props.onSimulate}><Beaker size={16} />판정 실행</Button></div>{props.lastSimulation ? <div className="mt-3 rounded-lg bg-surface-subtle p-3 text-sm font-bold">판정 결과: {simulationSummary(props.lastSimulation)}</div> : null}</ConsoleSection></div>;
}

function ResultsTab({ selected, draft, result, revisions, onDraftChange, onRollback }: { selected: Experiment; draft: ExperimentDraft; result: Awaited<ReturnType<typeof experimentApi.getResult>> | undefined; revisions: Awaited<ReturnType<typeof experimentApi.listRevisions>>["revisions"]; onDraftChange: (draft: ExperimentDraft) => void; onRollback: (revision: number) => void }) {
  return <div className="grid gap-4"><ConsoleSection title="결론과 승리군" description="승리군 확정은 트래픽을 자동으로 100% 전환하지 않습니다."><div className="grid gap-3 md:grid-cols-3"><SelectField label="결론" value={draft.conclusion} options={["UNDECIDED", "WINNER", "INCONCLUSIVE"]} onChange={(value) => onDraftChange({ ...draft, conclusion: value as ExperimentConclusion, winnerVariantKey: value === "WINNER" ? draft.winnerVariantKey : "" })} /><SelectField label="승리군" value={draft.winnerVariantKey} options={["", ...draft.variants.map((variant) => variant.key)]} labels={{ "": "선택 안 함", ...Object.fromEntries(draft.variants.map((variant) => [variant.key, variant.name])) }} onChange={(winnerVariantKey) => onDraftChange({ ...draft, winnerVariantKey })} /><TextField label="판정 사유" value={draft.decisionReason} onChange={(decisionReason) => onDraftChange({ ...draft, decisionReason })} /></div></ConsoleSection><ConsoleSection title="실험 결과"><DataTable columns={["군", "노출", "구매", "구매율", "사용자당 매출"]} rows={(result?.variants ?? []).map((variant) => [variant.variant_key, variant.impressions.toLocaleString("ko-KR"), variant.purchases.toLocaleString("ko-KR"), `${(variant.purchase_rate * 100).toFixed(2)}%`, Math.round(variant.revenue_per_user).toLocaleString("ko-KR")])} /></ConsoleSection><ConsoleSection title="Revision 이력" description={`현재 revision #${selected.revision}`}><DataTable columns={["Revision", "변경", "변경자", "작업"]} rows={revisions.map((revision) => [`#${revision.revision}`, <div key="change"><p className="font-bold">{revision.change_reason}</p><p className="text-xs text-content-secondary">{new Date(revision.created_at).toLocaleString("ko-KR")}</p></div>, <div key="actor"><p className="font-bold">{revision.actor_email || revision.created_by}</p><p className="text-xs text-content-secondary">{revision.actor_role || "SYSTEM"}{revision.actor_member_id ? ` · #${revision.actor_member_id}` : ""}</p></div>, <Button key="rollback" size="sm" variant="secondary" disabled={revision.revision === selected.revision} onClick={() => onRollback(revision.revision)}><History size={14} />롤백 비교</Button>])} /></ConsoleSection></div>;
}

function CreateDrawer({ form, pending, onChange, onClose, onCreate }: { form: CreateForm; pending: boolean; onChange: (form: CreateForm) => void; onClose: () => void; onCreate: () => void }) {
  return <div className="fixed inset-0 z-50 flex justify-end bg-black/40" role="dialog" aria-modal="true"><div className="h-full w-full max-w-xl overflow-auto bg-surface-raised p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h2 className="text-2xl font-black">새 실험 생성</h2><p className="mt-1 text-sm text-content-secondary">대조군과 실험군을 50%씩 만든 뒤 운영 화면에서 조정합니다.</p></div><Button variant="secondary" size="sm" onClick={onClose}><X size={16} /></Button></div><div className="mt-6 grid gap-4"><TextField label="실험 키" value={form.key} onChange={(key) => onChange({ ...form, key })} /><TextField label="실험 이름" value={form.name} onChange={(name) => onChange({ ...form, name })} /><TextField label="도메인" value={form.domain} onChange={(domain) => onChange({ ...form, domain })} /><TextField label="설명" value={form.description} onChange={(description) => onChange({ ...form, description })} /><SelectField label="주요 지표" value={form.primaryMetric} options={["purchase_rate", "revenue_per_user", "ctr", "impressions"]} onChange={(primaryMetric) => onChange({ ...form, primaryMetric })} /></div><div className="mt-8 flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>취소</Button><Button disabled={pending || !form.key.trim() || !form.name.trim()} onClick={onCreate}>{pending ? "생성 중" : "실험 생성"}</Button></div></div></div>;
}

function ConfirmDialog({ title, description, confirmLabel, danger = false, pending, onCancel, onConfirm }: { title: string; description: string; confirmLabel: string; danger?: boolean; pending: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4" role="alertdialog" aria-modal="true"><div className="w-full max-w-lg rounded-xl bg-surface-raised p-6 shadow-2xl"><h2 className="text-xl font-black">{title}</h2><p className="mt-3 text-sm leading-6 text-content-secondary">{description}</p><div className="mt-6 flex justify-end gap-2"><Button variant="secondary" onClick={onCancel}>취소</Button><Button variant={danger ? "danger" : "primary"} disabled={pending} onClick={onConfirm}>{pending ? "처리 중" : confirmLabel}</Button></div></div></div>;
}

function TextField({ label, value, onChange, disabled = false }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean }) { return <label className="grid gap-1 text-xs font-bold text-content-secondary">{label}<Input className="h-11 rounded-control border border-border-interactive bg-surface-raised px-3 text-sm text-content-primary" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} /></label>; }
function SelectField({ label, value, options, labels, onChange }: { label: string; value: string; options: string[]; labels?: Record<string, string>; onChange: (value: string) => void }) { return <label className="grid gap-1 text-xs font-bold text-content-secondary">{label}<Select className="h-11 rounded-control border border-border-interactive bg-surface-raised px-3 text-sm font-bold" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{labels?.[option] ?? displayLabel(option)}</option>)}</Select></label>; }

function draftFromExperiment(experiment: Experiment): ExperimentDraft { return { valueType: experiment.value_type, defaultValue: cloneValue(experiment.default_value), includeAnonymous: experiment.include_anonymous, variants: experiment.variants.map((variant, index) => ({ ...variant, role: variant.role ?? (index === 0 ? "CONTROL" : "TREATMENT"), description: variant.description || variant.name, value: cloneValue(variant.value ?? experiment.default_value) })), targetingRules: cloneValue(experiment.targeting_rules), overrides: cloneValue(experiment.overrides), conclusion: experiment.conclusion, winnerVariantKey: experiment.winner_variant_key ?? "", decisionReason: experiment.decision_reason ?? "" }; }
function configPayload(draft: ExperimentDraft, expectedRevision: number, selected: Experiment, changeReason: string): UpdateExperimentConfigPayload { return { expected_revision: expectedRevision, value_type: draft.valueType, default_value: draft.defaultValue, include_anonymous: draft.includeAnonymous, started_at: selected.started_at, ended_at: selected.ended_at, variants: draft.variants, targeting_rules: draft.targetingRules, overrides: draft.overrides, conclusion: draft.conclusion, winner_variant_key: draft.conclusion === "WINNER" ? draft.winnerVariantKey : undefined, decision_reason: draft.decisionReason.trim(), change_reason: changeReason.trim() }; }
function validateDraft(draft: ExperimentDraft, reason: string) { const errors: string[] = []; if (draft.variants.filter((variant) => variant.role === "CONTROL").length !== 1) errors.push("대조군은 정확히 하나여야 합니다."); if (draft.variants.filter((variant) => variant.role === "TREATMENT").length < 1) errors.push("실험군이 하나 이상 필요합니다."); if (draft.variants.some((variant) => !variant.name.trim() || !variant.description.trim())) errors.push("모든 군의 이름과 설명을 입력해 주세요."); if (draft.variants.reduce((sum, variant) => sum + variant.traffic_weight, 0) !== 100) errors.push("트래픽 합계는 100%여야 합니다."); const subjects = draft.overrides.map((override) => `${override.subject_type}:${override.subject_key.trim()}`); if (subjects.some((subject) => subject.endsWith(":")) || new Set(subjects).size !== subjects.length) errors.push("고정 배정의 사용자 식별자를 확인해 주세요."); if (draft.targetingRules.some((rule) => !rule.attribute.trim())) errors.push("타게팅 속성을 입력해 주세요."); if (draft.conclusion === "WINNER" && !draft.winnerVariantKey) errors.push("승리군을 선택해 주세요."); if (!reason.trim()) errors.push("변경 사유를 입력해 주세요."); return errors; }
function createPayload(form: CreateForm): CreateExperimentPayload { return { key: form.key.trim(), name: form.name.trim(), domain: form.domain.trim(), status: "DRAFT", include_anonymous: false, primary_metric: form.primaryMetric, description: form.description.trim(), value_type: "BOOLEAN", default_value: false, variants: [{ key: "control", name: "기존 기능", role: "CONTROL", description: "현재 운영 중인 비교 기준", traffic_weight: 50, value: false }, { key: "treatment", name: "새 기능", role: "TREATMENT", description: "효과를 확인할 새 변경", traffic_weight: 50, value: true }] }; }
function emptyCreateForm(): CreateForm { return { key: "", name: "", domain: "CATALOG", description: "", primaryMetric: "purchase_rate" }; }
function replaceVariant(variants: ExperimentVariant[], index: number, value: ExperimentVariant) { return variants.map((variant, variantIndex) => variantIndex === index ? value : variant); }
function updateDraft(next: ExperimentDraft, setDraft: (draft: ExperimentDraft) => void, setDirty: (dirty: boolean) => void) { setDraft(next); setDirty(true); }
function defaultValue(type: ExperimentValueType) { if (type === "BOOLEAN") return false; if (type === "NUMBER") return 0; if (type === "JSON") return {}; return ""; }
function cloneValue<T>(value: T): T { return value === undefined ? value : JSON.parse(JSON.stringify(value)) as T; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function simulationSummary(value: unknown) { if (!isRecord(value)) return "판정 결과를 확인해 주세요."; return `${String(value.variant_key ?? "배정 없음")} · ${String(value.reason ?? "사유 없음")} · revision ${String(value.revision ?? "-")}`; }
