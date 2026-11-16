"use client";

import type { ExperimentOverride, ExperimentSubjectType, ExperimentTargetingRule, ExperimentVariant } from "@/lib/api/experiment";
import { Input, Select } from "../ui/input";
import { Button } from "../ui/button";
import { StructuredValueEditor } from "./structured-value-editor";

const operatorLabels: Record<ExperimentTargetingRule["operator"], string> = {
  EQ: "같음", NEQ: "같지 않음", IN: "다음 중 하나", NOT_IN: "다음 중 어느 것도 아님",
  GT: "초과", GTE: "이상", LT: "미만", LTE: "이하",
};

export function TargetingRuleEditor({ rules, onChange }: { rules: ExperimentTargetingRule[]; onChange: (rules: ExperimentTargetingRule[]) => void }) {
  return (
    <div className="grid gap-3">
      <div className="rounded-md bg-status-info-subtle p-3 text-sm font-bold text-content-secondary">모든 조건을 AND로 평가합니다. {ruleSummary(rules)}</div>
      {rules.map((rule, index) => (
        <div key={index} className="grid gap-2 rounded-lg border border-border-subtle p-3 lg:grid-cols-[1fr_180px_1.4fr_auto]">
          <Input aria-label="타게팅 속성" className="h-10 rounded-md border border-border-interactive px-3 text-sm" value={rule.attribute} onChange={(event) => onChange(replaceAt(rules, index, { ...rule, attribute: event.target.value }))} placeholder="예: country" />
          <Select aria-label="타게팅 조건" className="h-10 rounded-md border border-border-interactive bg-surface-raised px-3 text-sm" value={rule.operator} onChange={(event) => onChange(replaceAt(rules, index, { ...rule, operator: event.target.value as ExperimentTargetingRule["operator"] }))}>
            {Object.entries(operatorLabels).map(([operator, label]) => <option key={operator} value={operator}>{label}</option>)}
          </Select>
          <StructuredValueEditor label="조건 값" value={rule.value} onChange={(value) => onChange(replaceAt(rules, index, { ...rule, value }))} />
          <Button type="button" size="sm" variant="secondary" onClick={() => onChange(rules.filter((_, ruleIndex) => ruleIndex !== index))}>삭제</Button>
        </div>
      ))}
      <Button type="button" variant="secondary" onClick={() => onChange([...rules, { attribute: "", operator: "EQ", value: "" }])}>조건 추가</Button>
    </div>
  );
}

export function OverrideEditor({ overrides, variants, onChange }: { overrides: ExperimentOverride[]; variants: ExperimentVariant[]; onChange: (overrides: ExperimentOverride[]) => void }) {
  return (
    <div className="grid gap-3">
      {overrides.map((override, index) => (
        <div key={`${override.subject_type}-${override.subject_key}-${index}`} className="grid gap-2 rounded-lg border border-border-subtle p-3 md:grid-cols-[160px_1fr_1fr_auto]">
          <Select className="h-10 rounded-md border border-border-interactive bg-surface-raised px-3 text-sm" value={override.subject_type} onChange={(event) => onChange(replaceAt(overrides, index, { ...override, subject_type: event.target.value as ExperimentSubjectType }))}>
            <option value="MEMBER">회원</option><option value="ANONYMOUS">비회원</option>
          </Select>
          <Input aria-label="사용자 식별자" className="h-10 rounded-md border border-border-interactive px-3 text-sm" value={override.subject_key} onChange={(event) => onChange(replaceAt(overrides, index, { ...override, subject_key: event.target.value }))} />
          <Select aria-label="배정할 군" className="h-10 rounded-md border border-border-interactive bg-surface-raised px-3 text-sm" value={override.variant_key} onChange={(event) => onChange(replaceAt(overrides, index, { ...override, variant_key: event.target.value }))}>
            {variants.map((variant) => <option key={variant.key} value={variant.key}>{variant.name}</option>)}
          </Select>
          <Button type="button" size="sm" variant="secondary" onClick={() => onChange(overrides.filter((_, overrideIndex) => overrideIndex !== index))}>삭제</Button>
        </div>
      ))}
      <Button type="button" variant="secondary" disabled={variants.length === 0} onClick={() => onChange([...overrides, { subject_type: "MEMBER", subject_key: "", variant_key: variants[0]?.key ?? "" }])}>고정 배정 추가</Button>
    </div>
  );
}

export function ruleSummary(rules: ExperimentTargetingRule[]) {
  if (rules.length === 0) return "조건이 없어 모든 사용자가 대상입니다.";
  return rules.map((rule) => `${rule.attribute || "속성"}이(가) ${operatorLabels[rule.operator]} ${formatValue(rule.value)}`).join("이고 ");
}

function replaceAt<T>(items: T[], index: number, value: T) {
  return items.map((item, itemIndex) => itemIndex === index ? value : item);
}

function formatValue(value: unknown) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  return String(value);
}
