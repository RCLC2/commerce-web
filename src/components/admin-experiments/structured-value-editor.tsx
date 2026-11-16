"use client";

import { Input, Select } from "../ui/input";
import { Button } from "../ui/button";

type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue };
type ValueKind = "string" | "number" | "boolean" | "object" | "array";

export function StructuredValueEditor({ label, value, onChange }: { label: string; value: unknown; onChange: (value: JSONValue) => void }) {
  return (
    <div className="grid gap-2 rounded-lg border border-border-subtle bg-surface-subtle p-3">
      <p className="text-xs font-bold text-content-secondary">{label}</p>
      <ValueNode value={asJSONValue(value)} onChange={onChange} depth={0} />
      <details className="text-xs text-content-secondary">
        <summary className="cursor-pointer font-bold">생성된 JSON 읽기 전용 보기</summary>
        <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-content-primary p-3 text-content-inverse">{JSON.stringify(value, null, 2)}</pre>
      </details>
    </div>
  );
}

function ValueNode({ value, onChange, depth }: { value: JSONValue; onChange: (value: JSONValue) => void; depth: number }) {
  const kind = valueKind(value);
  return (
    <div className="grid gap-2">
      <Select className="h-9 w-32 rounded-md border border-border-interactive bg-surface-raised px-2 text-xs font-bold" value={kind} onChange={(event) => onChange(defaultForKind(event.target.value as ValueKind))} aria-label={`값 타입 ${depth + 1}`}>
        <option value="string">문자열</option>
        <option value="number">숫자</option>
        <option value="boolean">불리언</option>
        <option value="object">객체</option>
        <option value="array">목록</option>
      </Select>
      {kind === "string" ? <Input className="h-10 rounded-md border border-border-interactive px-3 text-sm" value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} /> : null}
      {kind === "number" ? <Input type="number" className="h-10 rounded-md border border-border-interactive px-3 text-sm" value={String(value)} onChange={(event) => onChange(Number(event.target.value))} /> : null}
      {kind === "boolean" ? (
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" className="h-5 w-5 accent-action-primary" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />{value ? "참" : "거짓"}</label>
      ) : null}
      {kind === "object" ? <ObjectEditor value={value as { [key: string]: JSONValue }} onChange={onChange} depth={depth} /> : null}
      {kind === "array" ? <ArrayEditor value={value as JSONValue[]} onChange={onChange} depth={depth} /> : null}
    </div>
  );
}

function ObjectEditor({ value, onChange, depth }: { value: { [key: string]: JSONValue }; onChange: (value: JSONValue) => void; depth: number }) {
  const entries = Object.entries(value);
  return (
    <div className="grid gap-2 border-l-2 border-border-subtle pl-3">
      {entries.map(([key, child], index) => (
        <div key={`${key}-${index}`} className="grid gap-2 rounded-md bg-surface-raised p-2 sm:grid-cols-[minmax(120px,0.35fr)_1fr_auto]">
          <Input aria-label="속성명" className="h-10 rounded-md border border-border-interactive px-3 text-sm" value={key} onChange={(event) => {
            const next = { ...value };
            delete next[key];
            next[event.target.value] = child;
            onChange(next);
          }} />
          <ValueNode value={child} depth={depth + 1} onChange={(nextChild) => onChange({ ...value, [key]: nextChild })} />
          <Button type="button" size="sm" variant="secondary" onClick={() => { const next = { ...value }; delete next[key]; onChange(next); }}>삭제</Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="secondary" onClick={() => onChange({ ...value, [nextObjectKey(value)]: "" })}>속성 추가</Button>
    </div>
  );
}

function ArrayEditor({ value, onChange, depth }: { value: JSONValue[]; onChange: (value: JSONValue) => void; depth: number }) {
  return (
    <div className="grid gap-2 border-l-2 border-border-subtle pl-3">
      {value.map((child, index) => (
        <div key={index} className="grid gap-2 rounded-md bg-surface-raised p-2 sm:grid-cols-[32px_1fr_auto]">
          <span className="pt-2 text-center text-xs font-bold text-content-secondary">{index + 1}</span>
          <ValueNode value={child} depth={depth + 1} onChange={(nextChild) => onChange(value.map((item, itemIndex) => itemIndex === index ? nextChild : item))} />
          <Button type="button" size="sm" variant="secondary" onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}>삭제</Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="secondary" onClick={() => onChange([...value, ""])}>항목 추가</Button>
    </div>
  );
}

function valueKind(value: JSONValue): ValueKind {
  if (Array.isArray(value)) return "array";
  if (value !== null && typeof value === "object") return "object";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "string";
}

function defaultForKind(kind: ValueKind): JSONValue {
  if (kind === "number") return 0;
  if (kind === "boolean") return false;
  if (kind === "object") return {};
  if (kind === "array") return [];
  return "";
}

function asJSONValue(value: unknown): JSONValue {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(asJSONValue);
  if (typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, child]) => [key, asJSONValue(child)]));
  return "";
}

function nextObjectKey(value: { [key: string]: JSONValue }) {
  let index = Object.keys(value).length + 1;
  while (`property_${index}` in value) index += 1;
  return `property_${index}`;
}
