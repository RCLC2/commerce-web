import { SafeImage } from "@/components/safe-image";
import type { OutfitLook, OutfitSlotKind } from "@/lib/today-outfit";
import { outfitProductAnchorID } from "@/lib/today-outfit";
import { formatPrice } from "@/lib/utils";

const slotPositions: Record<OutfitSlotKind, string> = {
  head: "left-2 top-16 sm:left-6 sm:top-16",
  accessory: "right-2 top-16 sm:right-6 sm:top-16",
  outer: "left-1 top-44 sm:left-3 sm:top-44",
  bag: "right-1 top-44 sm:right-3 sm:top-44",
  top: "left-2 bottom-28 sm:left-6 sm:bottom-28",
  bottom: "right-2 bottom-28 sm:right-6 sm:bottom-28",
  shoes: "bottom-4 left-1/2 -translate-x-1/2",
};

export function EquipmentLook({
  look,
  position,
  active,
  onProductSelect,
}: {
  look: OutfitLook;
  position: number;
  active: boolean;
  onProductSelect: (productID: number) => void;
}) {
  const disclosureID = `outfit-${look.id}-image-disclosure`;

  return (
    <article className="w-full shrink-0 overflow-hidden rounded-3xl border border-brand/25 bg-white">
      <div data-testid="outfit-image-stage" className="relative min-h-[650px] overflow-hidden bg-[radial-gradient(circle_at_50%_42%,#fff_0_22%,#fff1f2_23%_51%,#f8fafc_72%)] px-2 pt-4 sm:min-h-[560px] sm:px-4">
        <div className="relative z-10 text-center">
          <p className="text-[10px] font-black tracking-[0.18em] text-brand">LOOK {String(position).padStart(2, "0")} · WEATHER EQUIPMENT</p>
          <h3 className="mt-1 text-sm font-black sm:text-base">{look.title}</h3>
        </div>

        <div className="pointer-events-none absolute left-1/2 top-[47%] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-brand/35 shadow-[0_0_0_34px_rgba(255,228,230,0.28)] sm:h-80 sm:w-80" />
        <div className="absolute left-1/2 top-[47%] h-[400px] w-[300px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[2rem] bg-zinc-100 shadow-[0_18px_32px_rgba(15,23,42,0.18)] sm:h-[440px] sm:w-[330px]">
          <SafeImage
            src={look.image_url}
            alt={`${look.title} AI 코디 연출 이미지`}
            aria-describedby={disclosureID}
            fill
            unoptimized
            sizes="(max-width: 640px) 300px, 330px"
            className="object-cover"
          />
          <p id={disclosureID} className="absolute inset-x-2 bottom-2 rounded-full bg-zinc-950/75 px-3 py-1.5 text-center text-[9px] font-bold text-white backdrop-blur">
            {look.image_disclosure}
          </p>
        </div>

        {look.items.map((item) => (
          <button
            key={item.slot}
            type="button"
            tabIndex={active ? 0 : -1}
            aria-controls={outfitProductAnchorID(look.id, item.product.id)}
            aria-label={`${item.slot_label} ${item.product.name}, 상품 목록에서 보기`}
            className={`absolute z-10 grid min-h-16 w-[42%] max-w-44 grid-cols-[42px_minmax(0,1fr)] items-center gap-2 rounded-2xl border border-line bg-white/95 p-2 text-left shadow-[0_10px_24px_rgba(15,23,42,0.12)] transition hover:border-brand hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:grid-cols-[50px_minmax(0,1fr)] ${slotPositions[item.slot]}`}
            onClick={() => onProductSelect(item.product.id)}
          >
            <span className="relative block h-10 w-10 overflow-hidden rounded-xl bg-zinc-100 sm:h-12 sm:w-12" aria-hidden="true">
              <SafeImage src={item.product.image_url} alt="" fill sizes="48px" className="object-cover" />
            </span>
            <span className="min-w-0">
              <span className="block text-[9px] font-black uppercase tracking-wide text-brand">{item.slot_label}</span>
              <strong className="mt-0.5 block truncate text-[10px] leading-4 sm:text-xs">{item.product.name}</strong>
              <span className="block text-[9px] text-muted sm:text-[10px]">{formatPrice(item.product.discount_price || item.product.base_price)}</span>
            </span>
          </button>
        ))}
      </div>

      <footer data-testid="outfit-point-bar" className="m-4 rounded-2xl bg-zinc-950 px-4 py-3 text-center text-[10px] leading-5 text-white shadow-xl sm:mx-24 sm:text-xs">
        <strong className="text-rose-300">오늘의 코디 포인트</strong>
        <span className="mx-1 text-white/50">·</span>
        {look.reason}
      </footer>
    </article>
  );
}
