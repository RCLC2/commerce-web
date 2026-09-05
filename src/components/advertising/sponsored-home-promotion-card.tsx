import Link from "next/link";
import type { AdDecision } from "@/lib/api/advertising";
import { SponsoredDisclosure } from "./sponsored-disclosure";

export function SponsoredHomePromotionCard({ decision, onNavigate }: { decision: AdDecision; onNavigate: () => void }) {
  if (decision.creative.format !== "PROMOTION_CARD") return null;
  return (
    <article className="relative overflow-hidden rounded-xl border border-brand/25 bg-rose-50 p-5 pr-32">
      <SponsoredDisclosure />
      <Link href={decision.creative.landing_url} onClick={onNavigate} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
        <h2 className="font-black">{decision.creative.headline}</h2>
        <p className="mt-1 text-sm text-zinc-700">{decision.creative.body}</p>
      </Link>
    </article>
  );
}
