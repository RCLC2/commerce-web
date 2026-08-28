import type { OutfitLook, OutfitSlotKind } from "@/lib/today-outfit-fixtures";
import { outfitSlotOrder } from "@/lib/today-outfit-fixtures";
import { formatPrice } from "@/lib/utils";

const slotPositions: Record<OutfitSlotKind, string> = {
  head: "left-2 top-14 sm:left-6 sm:top-12",
  accessory: "right-2 top-14 sm:right-6 sm:top-12",
  outer: "left-1 top-40 sm:left-3 sm:top-40",
  bag: "right-1 top-40 sm:right-3 sm:top-40",
  top: "left-2 bottom-44 sm:left-6 sm:bottom-28",
  bottom: "right-2 bottom-44 sm:right-6 sm:bottom-28",
  shoes: "bottom-24 left-1/2 -translate-x-1/2 sm:bottom-5",
};

export function EquipmentLook({ look, position }: { look: OutfitLook; position: number }) {
  return (
    <article className="relative min-h-[650px] w-full shrink-0 overflow-hidden rounded-3xl border border-brand/25 bg-[radial-gradient(circle_at_50%_42%,#fff_0_22%,#fff1f2_23%_51%,#f8fafc_72%)] px-2 pb-24 pt-4 sm:min-h-[540px] sm:px-4 sm:pb-20">
      <div className="text-center">
        <p className="text-[10px] font-black tracking-[0.18em] text-brand">LOOK {String(position).padStart(2, "0")} · WEATHER EQUIPMENT</p>
        <h3 className="mt-1 text-sm font-black sm:text-base">{look.title}</h3>
      </div>

      <div className="pointer-events-none absolute left-1/2 top-[43%] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-brand/35 shadow-[0_0_0_34px_rgba(255,228,230,0.28)] sm:top-1/2 sm:h-80 sm:w-80" />
      <FashionCharacter look={look} />

      {outfitSlotOrder.map((kind) => {
        const slot = look.slots[kind];
        return (
          <div
            key={kind}
            className={`absolute grid min-h-16 w-[42%] max-w-44 grid-cols-[42px_minmax(0,1fr)] items-center gap-2 rounded-2xl border border-line bg-white/95 p-2 shadow-[0_10px_24px_rgba(15,23,42,0.09)] sm:grid-cols-[50px_minmax(0,1fr)] ${slotPositions[kind]}`}
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-amber-100 to-rose-100 text-xl font-black text-zinc-700 sm:h-12 sm:w-12" aria-hidden="true">{slot.icon}</span>
            <span className="min-w-0">
              <span className="block text-[9px] font-black uppercase tracking-wide text-brand">{slot.label}</span>
              <strong className="mt-0.5 block truncate text-[10px] leading-4 sm:text-xs">{slot.name}</strong>
              <span className="block text-[9px] text-muted sm:text-[10px]">{formatPrice(slot.price)}</span>
            </span>
          </div>
        );
      })}

      <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-zinc-950 px-4 py-3 text-center text-[10px] leading-5 text-white shadow-xl sm:inset-x-24 sm:bottom-4 sm:text-xs">
        <strong className="text-rose-300">오늘의 코디 포인트</strong>
        <span className="mx-1 text-white/50">·</span>
        {look.reason}
      </div>
    </article>
  );
}

function FashionCharacter({ look }: { look: OutfitLook }) {
  const palette = look.palette;
  return (
    <svg
      viewBox="0 0 180 360"
      role="img"
      aria-label={`${look.title} 캐릭터`}
      className="absolute left-1/2 top-[43%] h-[315px] w-[158px] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_18px_18px_rgba(15,23,42,0.18)] sm:top-1/2 sm:h-[350px] sm:w-[180px]"
    >
      <ellipse cx="90" cy="344" rx="58" ry="11" fill="rgba(15,23,42,0.10)" />
      <rect x="50" y="118" width="24" height="122" rx="12" fill={palette.skin} transform="rotate(4 62 118)" />
      <rect x="106" y="118" width="24" height="122" rx="12" fill={palette.skin} transform="rotate(-4 118 118)" />
      <rect x="63" y="246" width="25" height="88" rx="12" fill={palette.skin} />
      <rect x="94" y="246" width="25" height="88" rx="12" fill={palette.skin} />
      <path d="M45 118 Q90 88 135 118 L127 232 Q90 249 53 232 Z" fill={palette.outer} stroke="white" strokeWidth="8" />
      <path d="M61 112 Q90 96 119 112 L116 211 Q90 222 64 211 Z" fill={palette.top} />
      <path d="M58 205 H122 L139 273 H41 Z" fill={palette.bottom} />
      <rect x="71" y="82" width="38" height="36" rx="12" fill={palette.skin} />
      <ellipse cx="90" cy="64" rx="39" ry="47" fill={palette.hair} />
      <ellipse cx="90" cy="69" rx="30" ry="36" fill={palette.skin} />
      <path d="M57 54 Q62 12 92 17 Q125 16 125 62 Q102 45 68 52 Z" fill={palette.hair} />
      <circle cx="79" cy="69" r="2.4" fill="#27272a" />
      <circle cx="101" cy="69" r="2.4" fill="#27272a" />
      <path d="M82 83 Q90 88 98 83" fill="none" stroke="#c2410c" strokeWidth="2" strokeLinecap="round" />
      <path d="M44 337 Q67 323 89 337 L87 352 H42 Z" fill={palette.shoes} stroke="#cbd5e1" strokeWidth="2" />
      <path d="M93 337 Q116 323 138 337 L138 352 H93 Z" fill={palette.shoes} stroke="#cbd5e1" strokeWidth="2" />
      <circle cx="133" cy="169" r="8" fill={palette.accent} />
    </svg>
  );
}
