"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type ConsoleLink = {
  href: string;
  label: string;
};

export function ConsoleLayout({
  title,
  links,
  children,
}: {
  title: string;
  links: ConsoleLink[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 pb-24 pt-6 md:grid-cols-[220px_1fr]">
      <aside className="h-fit rounded-md border border-line bg-white p-3 md:sticky md:top-24">
        <h1 className="px-3 py-2 text-lg font-black">{title}</h1>
        <nav className="mt-2 grid gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-bold text-zinc-600 hover:bg-zinc-50",
                pathname === link.href && "bg-foreground text-white hover:bg-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <section className="min-w-0">{children}</section>
    </main>
  );
}

export function MetricGrid({ metrics }: { metrics: { label: string; value: string; delta?: string }[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-md border border-line bg-white p-4">
          <p className="text-sm text-muted">{metric.label}</p>
          <p className="mt-2 text-2xl font-black">{metric.value}</p>
          {metric.delta ? <p className="mt-1 text-xs font-bold text-brand">{metric.delta}</p> : null}
        </div>
      ))}
    </div>
  );
}

export function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<Array<React.ReactNode>>;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-line bg-white">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead className="bg-zinc-50 text-left text-xs text-muted">
          <tr>
            {columns.map((column) => (
              <th key={column} className="border-b border-line px-4 py-3 font-black">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-line last:border-b-0">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatusBadge({ value }: { value: string }) {
  return <span className="rounded-sm bg-zinc-100 px-2 py-1 text-xs font-black text-zinc-700">{value}</span>;
}
