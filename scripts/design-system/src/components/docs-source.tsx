import { CodeBlock } from "./docs-content";

export type DemoName =
  | "button"
  | "field"
  | "tabs"
  | "filter-chip"
  | "quantity-stepper"
  | "dialog"
  | "select"
  | "bottom-action-bar"
  | "purchase";

// The HTML builder injects the exact source files used by the interactive examples.
declare const __DEMO_SOURCES__: Record<DemoName, string>;

export function DemoSource({ name }: { name: DemoName }) {
  const filename = `${name}-demo.tsx`;
  const source = __DEMO_SOURCES__[name];
  return <CodeBlock filename={filename}>{source}</CodeBlock>;
}
