import Link from "next/link";
import type { AdDecision } from "@/lib/api/advertising";
import { SafeImage } from "../safe-image";
import { SponsoredDisclosure } from "./sponsored-disclosure";

export function SponsoredBanner({ decision, onNavigate }: { decision: AdDecision; onNavigate: () => void }) {
  if (decision.creative.format !== "BANNER") return null;
  const targetName = decision.target.type === "PRODUCT" ? decision.target.product.name : decision.target.market.name;
  return (
    <article className="relative overflow-hidden rounded-2xl bg-content-primary text-content-inverse shadow-sm">
      <SponsoredDisclosure />
      <div className="relative aspect-video md:aspect-[16/7]">
        <SafeImage
          src={decision.creative.image_url}
          alt={`${targetName} 스폰서드 배너`}
          fill
          sizes="(max-width: 768px) 100vw, 1152px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-black/10" />
        <Link href={decision.creative.landing_url} onClick={onNavigate} className="absolute inset-0 flex items-end p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white md:items-center md:p-10">
          <div className="max-w-xl pr-16">
            <p className="text-xs font-bold text-content-inverse/75">{targetName}</p>
            <h2 className="mt-2 text-2xl font-bold md:text-4xl">{decision.creative.headline}</h2>
            {decision.creative.body ? <p className="mt-2 line-clamp-2 text-sm text-content-inverse/80 md:text-base">{decision.creative.body}</p> : null}
            <span className="mt-4 inline-flex rounded-full bg-surface-raised px-4 py-2 text-sm font-bold text-content-primary">{decision.creative.cta_label}</span>
          </div>
        </Link>
      </div>
      {decision.creative.pexels_photographer && decision.creative.pexels_photographer_url && decision.creative.pexels_photo_url ? (
        <p className="absolute bottom-2 right-3 z-20 text-xs text-content-inverse/75">
          사진: <a href={decision.creative.pexels_photographer_url} target="_blank" rel="noreferrer" className="underline">{decision.creative.pexels_photographer}</a>{" "}
          제공: <a href={decision.creative.pexels_photo_url} target="_blank" rel="noreferrer" className="underline">Pexels</a>
        </p>
      ) : null}
    </article>
  );
}
