"use client";

import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useRef, useState } from "react";
import type { OutfitGender, OutfitLook } from "@/lib/today-outfit-fixtures";
import { cn } from "@/lib/utils";
import { EquipmentLook } from "./equipment-look";

export function EquipmentSlider({
  looks,
  gender,
  onGenderChange,
}: {
  looks: OutfitLook[];
  gender?: OutfitGender;
  onGenderChange?: (gender: OutfitGender) => void;
}) {
  const [index, setIndex] = useState(0);
  const pointerStartX = useRef<number | null>(null);
  const total = looks.length;

  function move(offset: number) {
    setIndex((current) => (current + offset + total) % total);
  }

  function handlePointerEnd(clientX: number) {
    if (pointerStartX.current === null) return;
    const distance = clientX - pointerStartX.current;
    pointerStartX.current = null;
    if (Math.abs(distance) < 45) return;
    move(distance < 0 ? 1 : -1);
  }

  return (
    <section>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-black">오늘 날씨에 맞춘 장비</h2>
          <p className="mt-1 text-xs text-muted sm:text-sm">캐릭터와 상품 슬롯을 좌우로 넘겨 코디 10개를 확인하세요.</p>
        </div>
        <div className="flex items-center justify-end gap-2">
          {gender && onGenderChange ? (
            <div className="flex rounded-xl bg-zinc-200 p-1" aria-label="코디 성별">
              <button type="button" className={cn("grid h-9 w-10 place-items-center rounded-lg text-xl font-black text-muted", gender === "female" && "bg-brand text-white shadow-sm")} aria-label="여성 코디" aria-pressed={gender === "female"} onClick={() => onGenderChange("female")}>♀</button>
              <button type="button" className={cn("grid h-9 w-10 place-items-center rounded-lg text-xl font-black text-muted", gender === "male" && "bg-brand text-white shadow-sm")} aria-label="남성 코디" aria-pressed={gender === "male"} onClick={() => onGenderChange("male")}>♂</button>
            </div>
          ) : null}
          <button type="button" className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-3 text-xs font-black shadow-sm hover:border-brand hover:text-brand" onClick={() => move(1)}>
            <RefreshCw size={15} /> 다른 코디
          </button>
        </div>
      </div>

      <div
        role="region"
        aria-label="오늘의 코디 10개"
        aria-roledescription="carousel"
        tabIndex={0}
        className="relative touch-pan-y overflow-hidden rounded-3xl outline-none ring-brand focus-visible:ring-2"
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") move(-1);
          if (event.key === "ArrowRight") move(1);
        }}
        onPointerDown={(event) => { pointerStartX.current = event.clientX; }}
        onPointerUp={(event) => handlePointerEnd(event.clientX)}
        onPointerCancel={() => { pointerStartX.current = null; }}
      >
        <div
          className="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {looks.map((look, lookIndex) => (
            <div key={look.id} className="w-full shrink-0" aria-hidden={lookIndex !== index}>
              <EquipmentLook look={look} position={lookIndex + 1} />
            </div>
          ))}
        </div>

        <button type="button" aria-label="이전 코디" className="absolute left-2 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white shadow-xl hover:text-brand sm:left-4" onClick={() => move(-1)}><ChevronLeft size={25} /></button>
        <button type="button" aria-label="다음 코디" className="absolute right-2 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white shadow-xl hover:text-brand sm:right-4" onClick={() => move(1)}><ChevronRight size={25} /></button>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2" aria-label="코디 위치">
        <span className="mr-1 text-xs font-black text-brand">{String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
        {looks.map((look, dotIndex) => (
          <button
            key={look.id}
            type="button"
            aria-label={dotIndex === 0 ? "첫 번째 코디 보기" : `${dotIndex + 1}번째 코디 보기`}
            aria-current={dotIndex === index ? "true" : undefined}
            className={cn("h-2 w-2 rounded-full bg-zinc-300 transition-all", dotIndex === index && "w-7 bg-brand")}
            onClick={() => setIndex(dotIndex)}
          />
        ))}
      </div>
    </section>
  );
}
