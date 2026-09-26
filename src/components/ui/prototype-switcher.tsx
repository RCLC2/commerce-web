"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";

/** Temporary development-only layout comparison control. */
export function PrototypeSwitcher({ variants }: { variants: Array<{ key: string; name: string }> }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const index = Math.max(0, variants.findIndex((item) => item.key === params.get("variant")));
  const move = useCallback((direction: number) => {
    const next = new URLSearchParams(params.toString());
    next.set("variant", variants[(index + direction + variants.length) % variants.length].key);
    router.replace(`${pathname}?${next}`, { scroll: false });
  }, [index, params, pathname, router, variants]);
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable], [role=dialog]")) return;
      if (document.querySelector('[role="dialog"]') || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        move(event.key === "ArrowLeft" ? -1 : 1);
      }
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [move]);
  if (process.env.NODE_ENV === "production") return null;
  return <nav aria-label="임시 화면 비교" className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/15 bg-[#202027] px-3 py-2 text-white shadow-xl">
    <button type="button" onClick={() => move(-1)} aria-label="이전 화면안" className="grid size-9 cursor-pointer place-items-center rounded-full hover:bg-white/15"><ArrowLeft size={16} /></button>
    <div className="min-w-48 text-center"><p className="text-[10px] tracking-[0.12em] text-white/55">PC PROTOTYPE · {index + 1} / {variants.length}</p><p className="mt-0.5 text-xs font-semibold">{variants[index].key} — {variants[index].name}</p></div>
    <button type="button" onClick={() => move(1)} aria-label="다음 화면안" className="grid size-9 cursor-pointer place-items-center rounded-full hover:bg-white/15"><ArrowRight size={16} /></button>
  </nav>;
}
