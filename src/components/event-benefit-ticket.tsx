import { Check, Coins, Download, Ticket } from "lucide-react";
import type { EventReward } from "@/lib/event-detail-types";
import { cn } from "@/lib/utils";

export function EventBenefitTicket({
  reward,
  claimed,
  pending,
  ready,
  authenticated,
  onClaim,
}: {
  reward: EventReward;
  claimed: boolean;
  pending: boolean;
  ready: boolean;
  authenticated: boolean;
  onClaim: () => void;
}) {
  const isPoint = reward.reward_type === "POINT_EVENT";
  const accent = isPoint ? "text-violet-600" : "text-[#ff3f55]";
  const actionBackground = isPoint ? "bg-violet-50" : "bg-[#fff1f3]";

  return (
    <article className="relative flex min-h-36 overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
      <div className="min-w-0 flex-1 p-5 pr-4 md:p-6">
        <div className={cn("flex items-center gap-1.5 text-[11px] font-black tracking-[0.12em]", accent)}>
          {isPoint ? <Coins size={15} /> : <Ticket size={15} />}
          {isPoint ? "POINT" : "COUPON"}
        </div>
        <h3 className="mt-3 break-keep text-2xl font-black leading-tight tracking-[-0.04em] text-zinc-950 md:text-[28px]">
          {reward.title}
        </h3>
        <p className="mt-2 break-keep text-xs leading-5 text-zinc-500 md:text-sm">{reward.description}</p>
      </div>

      <div className={cn("relative flex w-[104px] shrink-0 flex-col items-center justify-center border-l border-dashed border-zinc-300 px-3", actionBackground)}>
        <span className="absolute -left-2 -top-2 h-4 w-4 rounded-full border border-black/[0.07] bg-zinc-50" />
        <span className="absolute -bottom-2 -left-2 h-4 w-4 rounded-full border border-black/[0.07] bg-zinc-50" />
        <button
          type="button"
          aria-label={`${reward.title} ${authenticated ? reward.button_label : "로그인 후 받기"}`}
          disabled={claimed || pending || !ready}
          onClick={onClaim}
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full text-white shadow-sm transition active:scale-95 disabled:cursor-default disabled:active:scale-100",
            claimed ? "bg-zinc-400" : isPoint ? "bg-violet-600 hover:bg-violet-700" : "bg-[#ff3f55] hover:bg-[#ef2e45]",
          )}
        >
          {claimed ? <Check size={21} strokeWidth={3} /> : <Download size={21} strokeWidth={2.5} />}
        </button>
        <span className={cn("mt-2 text-center text-[11px] font-black leading-4", claimed ? "text-zinc-500" : accent)}>
          {claimed ? "발급 완료" : pending ? "발급 중" : !ready ? "상태 확인 필요" : authenticated ? reward.button_label : "로그인 후 받기"}
        </span>
      </div>
    </article>
  );
}
