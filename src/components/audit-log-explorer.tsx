"use client";

import { Input, Select } from "./ui/input";

import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import {
  advanceAuditCursor,
  initialAuditCursor,
  previousAuditCursor,
} from "@/lib/audit-log-cursor";
import {
  auditApi,
  type AuditLog,
  type AuditLogQuery,
} from "@/lib/api/audit";
import { cn } from "@/lib/utils";
import {
  ConsoleModal,
  ConsoleTable,
  DetailGrid,
  DetailItem,
  consoleInputClass,
} from "./console-ui";
import {
  ConsoleHeader,
  ConsoleSection,
  FilterField,
  FilterPanel,
} from "./console-layout";
import { Button } from "./ui/button";

type AuditScope = "admin" | "seller";

type AuditFilterDraft = {
  q: string;
  requestID: string;
  actorID: string;
  actorRole: "ALL" | "ADMIN" | "SELLER" | "SYSTEM";
  action: string;
  tableName: string;
  recordID: string;
  marketID: string;
  operation: "ALL" | "INSERT" | "UPDATE" | "DELETE";
  attributionStatus: "ALL" | "ATTRIBUTED" | "UNATTRIBUTED" | "AMBIGUOUS";
  from: string;
  to: string;
};

const emptyFilters: AuditFilterDraft = {
  q: "",
  requestID: "",
  actorID: "",
  actorRole: "ALL",
  action: "",
  tableName: "",
  recordID: "",
  marketID: "",
  operation: "ALL",
  attributionStatus: "ALL",
  from: "",
  to: "",
};

const pageSizes = [10, 30, 50, 100, 200];

export function AuditLogExplorer({ scope, token }: { scope: AuditScope; token: string }) {
  const [draftFilters, setDraftFilters] = useState<AuditFilterDraft>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<AuditFilterDraft>(emptyFilters);
  const [limit, setLimit] = useState(30);
  const [cursor, setCursor] = useState(initialAuditCursor);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const query = buildAuditQuery(appliedFilters, limit, cursor.current);
  const logsQuery = useQuery({
    queryKey: ["cdc-audit-logs", scope, query],
    queryFn: () => scope === "admin"
      ? auditApi.adminAuditLogs(token, query)
      : auditApi.sellerAuditLogs(token, query),
    enabled: Boolean(token),
    placeholderData: (previousData) => previousData,
    meta: { consoleDataRole: "primary", consoleKeepMounted: true },
  });

  function updateFilter<Key extends keyof AuditFilterDraft>(key: Key, value: AuditFilterDraft[Key]) {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedFilters(draftFilters);
    setCursor(initialAuditCursor());
  }

  function resetFilters() {
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setCursor(initialAuditCursor());
  }

  const logs = logsQuery.data?.items ?? [];
  const page = cursor.previous.length + 1;

  return (
    <>
      <ConsoleHeader
        title="변경 이력"
        description="인증된 셀러·관리자 작업과 CDC 변경 전후 값을 최근 순으로 확인합니다."
      />

      <ConsoleSection className="mt-5" title="검색 및 필터" description="필터를 적용하면 첫 페이지부터 다시 조회합니다.">
        <form onSubmit={applyFilters}>
          <FilterPanel>
            <FilterField label="통합 검색">
              <Input
                className={consoleInputClass}
                value={draftFilters.q}
                onChange={(event) => updateFilter("q", event.target.value)}
                placeholder="요청·작업·대상 검색"
              />
            </FilterField>
            <FilterField label="요청 ID">
              <Input
                className={consoleInputClass}
                value={draftFilters.requestID}
                onChange={(event) => updateFilter("requestID", event.target.value)}
                placeholder="요청 식별자"
              />
            </FilterField>
            <FilterField label="행위자 ID">
              <Input
                className={consoleInputClass}
                type="number"
                min={1}
                value={draftFilters.actorID}
                onChange={(event) => updateFilter("actorID", event.target.value)}
                placeholder="회원 식별자"
              />
            </FilterField>
            <FilterField label="행위자 역할">
              <Select
                className={consoleInputClass}
                value={draftFilters.actorRole}
                onChange={(event) => updateFilter("actorRole", event.target.value as AuditFilterDraft["actorRole"])}
              >
                <option value="ALL">전체 역할</option>
                <option value="ADMIN">관리자</option>
                <option value="SELLER">셀러</option>
                <option value="SYSTEM">시스템</option>
              </Select>
            </FilterField>
            <FilterField label="작업">
              <Input
                className={consoleInputClass}
                value={draftFilters.action}
                onChange={(event) => updateFilter("action", event.target.value)}
                placeholder="예: category.update (카테고리 수정)"
              />
            </FilterField>
            <FilterField label="테이블">
              <Input
                className={consoleInputClass}
                value={draftFilters.tableName}
                onChange={(event) => updateFilter("tableName", event.target.value)}
                placeholder="예: categories (카테고리)"
              />
            </FilterField>
            <FilterField label="레코드 ID">
              <Input
                className={consoleInputClass}
                value={draftFilters.recordID}
                onChange={(event) => updateFilter("recordID", event.target.value)}
                placeholder="레코드 또는 대상 식별자"
              />
            </FilterField>
            {scope === "admin" ? (
              <FilterField label="마켓 ID">
                <Input
                  className={consoleInputClass}
                  type="number"
                  min={1}
                  value={draftFilters.marketID}
                  onChange={(event) => updateFilter("marketID", event.target.value)}
                  placeholder="마켓 식별자"
                />
              </FilterField>
            ) : null}
            <FilterField label="변경 유형">
              <Select
                className={consoleInputClass}
                value={draftFilters.operation}
                onChange={(event) => updateFilter("operation", event.target.value as AuditFilterDraft["operation"])}
              >
                <option value="ALL">전체 유형</option>
                <option value="INSERT">생성</option>
                <option value="UPDATE">수정</option>
                <option value="DELETE">삭제</option>
              </Select>
            </FilterField>
            <FilterField label="귀속 상태">
              <Select
                className={consoleInputClass}
                value={draftFilters.attributionStatus}
                onChange={(event) => updateFilter("attributionStatus", event.target.value as AuditFilterDraft["attributionStatus"])}
              >
                <option value="ALL">전체 상태</option>
                <option value="ATTRIBUTED">귀속 완료</option>
                <option value="UNATTRIBUTED">미귀속</option>
                <option value="AMBIGUOUS">귀속 불명확</option>
              </Select>
            </FilterField>
            <FilterField label="시작 시각">
              <Input
                className={consoleInputClass}
                type="datetime-local"
                value={draftFilters.from}
                onChange={(event) => updateFilter("from", event.target.value)}
              />
            </FilterField>
            <FilterField label="종료 시각">
              <Input
                className={consoleInputClass}
                type="datetime-local"
                value={draftFilters.to}
                onChange={(event) => updateFilter("to", event.target.value)}
              />
            </FilterField>
          </FilterPanel>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" onClick={resetFilters}>필터 초기화</Button>
            <Button type="submit">필터 적용</Button>
          </div>
        </form>
      </ConsoleSection>

      <ConsoleSection
        className="mt-5"
        title="변경 로그"
        description={`${page}페이지 · 이번 페이지 ${logs.length.toLocaleString("ko-KR")}건${logsQuery.isFetching ? " · 갱신 중" : ""}`}
        action={
          <label className="flex items-center gap-2 text-xs font-bold text-content-secondary">
            페이지 크기
            <Select
              aria-label="페이지 크기"
              className={consoleInputClass}
              value={limit}
              onChange={(event) => {
                setLimit(Number(event.target.value));
                setCursor(initialAuditCursor());
              }}
            >
              {pageSizes.map((size) => <option key={size} value={size}>{size}개</option>)}
            </Select>
          </label>
        }
      >
        <ConsoleTable
          columns={["발생 시각", "행위자", "변경", "대상", "귀속", "상세"]}
          rowKeys={logs.map((log) => log.id)}
          rows={logs.map((log) => [
            new Date(log.occurred_at).toLocaleString("ko-KR"),
            actorLabel(log),
            <div key="change" className="grid gap-1">
              <OperationBadge operation={log.operation} />
              <span className="break-all text-xs font-bold text-content-secondary">{log.action || "직접 변경"}</span>
            </div>,
            <div key="target" className="grid gap-1">
              <span className="font-bold">{log.target_type || log.table_name}</span>
              <span className="break-all text-xs text-content-secondary">#{log.target_id || log.record_key || "-"}</span>
            </div>,
            <AttributionBadge key="attribution" status={log.attribution_status} />,
            <Button key="detail" type="button" size="sm" variant="secondary" aria-label="상세 보기" onClick={() => setSelectedLog(log)}>
              보기
            </Button>,
          ])}
          emptyText="조건에 맞는 변경 이력이 없습니다."
        />

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
          <p className="text-xs font-bold text-content-secondary">이전 조회 위치 기준 {page}페이지</p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              aria-label="이전 페이지"
              disabled={!cursor.previous.length}
              onClick={() => setCursor((current) => previousAuditCursor(current))}
            >
              이전
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              aria-label="다음 페이지"
              disabled={!logsQuery.data?.page.has_more || !logsQuery.data.page.next_cursor}
              onClick={() => setCursor((current) => advanceAuditCursor(current, logsQuery.data?.page.next_cursor))}
            >
              다음
            </Button>
          </div>
        </div>
      </ConsoleSection>

      <AuditLogDetail log={selectedLog} onClose={() => setSelectedLog(null)} />
    </>
  );
}

function AuditLogDetail({ log, onClose }: { log: AuditLog | null; onClose: () => void }) {
  return (
    <ConsoleModal
      open={Boolean(log)}
      title="변경 이력 상세"
      description="요청 귀속과 CDC 원본의 정제된 변경 전후 값입니다."
      onClose={onClose}
      size="xl"
    >
      {log ? (
        <div className="grid gap-5">
          <DetailGrid>
            <DetailItem label="트랜잭션 ID">{log.transaction_id}</DetailItem>
            <DetailItem label="요청 ID">{log.request_id || "미귀속"}</DetailItem>
            <DetailItem label="행위자">{actorLabel(log)}</DetailItem>
            <DetailItem label="작업">{log.action || "직접 변경"}</DetailItem>
            <DetailItem label="대상">{`${log.target_type || log.table_name} #${log.target_id || log.record_key || "-"}`}</DetailItem>
            <DetailItem label="테이블">{`${log.schema_name}.${log.table_name}`}</DetailItem>
            <DetailItem label="변경 유형">{operationLabel(log.operation)}</DetailItem>
            <DetailItem label="마켓">{log.market_id ? `#${log.market_id}` : "-"}</DetailItem>
            <DetailItem label="대리 접속 마켓">{log.impersonated_market_id ? `#${log.impersonated_market_id}` : "-"}</DetailItem>
            <DetailItem label="귀속 상태">{attributionLabel(log.attribution_status)}</DetailItem>
            <DetailItem label="발생 시각">{new Date(log.occurred_at).toLocaleString("ko-KR")}</DetailItem>
            <DetailItem label="수신 시각">{new Date(log.received_at).toLocaleString("ko-KR")}</DetailItem>
          </DetailGrid>

          <div className="grid gap-4 lg:grid-cols-2">
            <JsonPanel title="변경 전" value={log.before_data} />
            <JsonPanel title="변경 후" value={log.after_data} />
          </div>
        </div>
      ) : null}
    </ConsoleModal>
  );
}

function JsonPanel({ title, value }: { title: string; value: unknown }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-border-subtle bg-content-primary">
      <h3 className="border-b border-white/10 px-4 py-3 text-sm font-bold text-content-inverse">{title}</h3>
      <pre className="max-h-[420px] overflow-auto p-4 text-xs leading-6 text-content-inverse">{formatJSON(value)}</pre>
    </section>
  );
}

function buildAuditQuery(filters: AuditFilterDraft, limit: number, cursor?: string): AuditLogQuery {
  return {
    q: clean(filters.q),
    request_id: clean(filters.requestID),
    actor_id: positiveNumber(filters.actorID),
    actor_role: filters.actorRole === "ALL" ? undefined : filters.actorRole,
    action: clean(filters.action),
    table_name: clean(filters.tableName),
    record_id: clean(filters.recordID),
    market_id: positiveNumber(filters.marketID),
    operation: filters.operation === "ALL" ? undefined : filters.operation,
    attribution_status: filters.attributionStatus === "ALL" ? undefined : filters.attributionStatus,
    from: toRFC3339(filters.from),
    to: toRFC3339(filters.to),
    cursor,
    limit,
  };
}

function clean(value: string) {
  return value.trim() || undefined;
}

function positiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function toRFC3339(value: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? undefined : parsed.toISOString();
}

function actorLabel(log: AuditLog) {
  if (!log.actor_role) return "미귀속";
  return `${actorRoleLabel(log.actor_role)}${log.actor_member_id ? ` #${log.actor_member_id}` : ""}`;
}

function actorRoleLabel(role: NonNullable<AuditLog["actor_role"]>) {
  return { ADMIN: "관리자", SELLER: "셀러", SYSTEM: "시스템" }[role];
}

function OperationBadge({ operation }: { operation: AuditLog["operation"] }) {
  return (
    <span className={cn(
      "w-fit rounded-full px-2 py-1 text-xs font-bold",
      operation === "INSERT" && "bg-status-positive-subtle text-status-positive",
      operation === "UPDATE" && "bg-status-info-subtle text-status-info",
      operation === "DELETE" && "bg-status-negative-subtle text-status-negative",
    )}>
      {operationLabel(operation)}
    </span>
  );
}

function operationLabel(operation: AuditLog["operation"]) {
  return { INSERT: "생성", UPDATE: "수정", DELETE: "삭제" }[operation];
}

function AttributionBadge({ status }: { status: AuditLog["attribution_status"] }) {
  return (
    <span className={cn(
      "w-fit rounded-full px-2 py-1 text-xs font-bold",
      status === "ATTRIBUTED" && "bg-status-positive-subtle text-status-positive",
      status === "UNATTRIBUTED" && "bg-surface-subtle text-content-secondary",
      status === "AMBIGUOUS" && "bg-status-warning-subtle text-status-warning",
    )}>
      {attributionLabel(status)}
    </span>
  );
}

function attributionLabel(status: AuditLog["attribution_status"]) {
  return {
    ATTRIBUTED: "귀속 완료",
    UNATTRIBUTED: "미귀속",
    AMBIGUOUS: "귀속 불명확",
  }[status];
}

function formatJSON(value: unknown) {
  if (value === undefined || value === null) return "-";
  return JSON.stringify(value, null, 2) ?? "-";
}
