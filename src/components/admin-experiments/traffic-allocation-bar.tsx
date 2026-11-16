"use client";

import { useRef } from "react";
import type { ExperimentVariant } from "@/lib/api/experiment";
import { adjustBoundary, allocateAll, cumulativeBoundaries, equalWeights } from "./traffic-allocation";

const colors = ["bg-action-primary", "bg-status-positive", "bg-status-warning", "bg-status-info", "bg-status-negative"];

export function TrafficAllocationBar({ variants, onChange }: { variants: ExperimentVariant[]; onChange: (weights: number[]) => void }) {
  const barRef = useRef<HTMLDivElement>(null);
  const weights = variants.map((variant) => variant.traffic_weight);
  const boundaries = cumulativeBoundaries(weights);

  function moveBoundary(index: number, clientX: number) {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect) return;
    const target = Math.max(0, Math.min(100, Math.round(((clientX - rect.left) / rect.width) * 100)));
    onChange(adjustBoundary(weights, index, target - boundaries[index]));
  }

  return (
    <div className="grid gap-4">
      <div ref={barRef} className="relative flex h-16 overflow-visible rounded-xl bg-surface-subtle" data-testid="traffic-allocation-bar">
        {variants.map((variant, index) => (
          <div key={variant.key} className={`${colors[index % colors.length]} flex min-w-0 items-center justify-center overflow-hidden text-xs font-bold text-white first:rounded-l-xl last:rounded-r-xl`} style={{ width: `${variant.traffic_weight}%` }}>
            {variant.traffic_weight >= 10 ? `${variant.name} ${variant.traffic_weight}%` : variant.traffic_weight > 0 ? `${variant.traffic_weight}%` : null}
          </div>
        ))}
        {boundaries.map((position, index) => (
          <button
            key={`${variants[index].key}-${variants[index + 1].key}`}
            type="button"
            role="slider"
            aria-label={`${variants[index].name}과 ${variants[index + 1].name} 비율 경계`}
            aria-valuemin={0}
            aria-valuemax={weights[index] + weights[index + 1]}
            aria-valuenow={weights[index]}
            className="absolute top-1/2 z-10 h-20 w-5 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-full border-4 border-surface-raised bg-content-primary shadow-lg focus:outline-none focus:ring-2 focus:ring-action-primary"
            style={{ left: `${position}%` }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              moveBoundary(index, event.clientX);
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) moveBoundary(index, event.clientX);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") { event.preventDefault(); onChange(adjustBoundary(weights, index, -1)); }
              if (event.key === "ArrowRight") { event.preventDefault(); onChange(adjustBoundary(weights, index, 1)); }
            }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded-md border border-border-interactive px-3 py-2 text-xs font-bold" onClick={() => onChange(equalWeights(variants.length))}>균등 분배</button>
        {variants.map((variant, index) => (
          <button key={variant.key} type="button" className="rounded-md border border-border-interactive px-3 py-2 text-xs font-bold" onClick={() => onChange(allocateAll(variants.length, index))}>{variant.name} 100%</button>
        ))}
      </div>
    </div>
  );
}
