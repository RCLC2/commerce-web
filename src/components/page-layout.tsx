import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type PageLayoutVariant = "default" | "auth" | "payment" | "console" | "onboarding" | "product-detail";

const variantClasses: Record<PageLayoutVariant, string> = {
  default: "mx-auto min-h-[60vh] w-full max-w-6xl px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-8",
  auth: "mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-md items-center px-4 pb-[calc(5rem+env(safe-area-inset-bottom))]",
  payment: "mx-auto min-h-[60vh] w-full max-w-xl px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-16 text-center",
  console: "mx-auto grid min-h-[60vh] w-full max-w-7xl px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-5",
  onboarding: "min-h-screen w-full overflow-hidden bg-[radial-gradient(circle_at_top,#fff1f4_0,#fafafa_42%)] px-4 pb-10 pt-[max(20px,env(safe-area-inset-top))]",
  "product-detail": "mx-auto min-h-[60vh] w-full max-w-6xl px-4 pb-[calc(11rem+env(safe-area-inset-bottom))] pt-5 md:pt-8",
};

export type PageLayoutProps = ComponentPropsWithoutRef<"main"> & {
  variant?: PageLayoutVariant;
};

/**
 * The single semantic page root for application screens. Route-specific layout
 * differences are explicit variants so shared page spacing cannot drift.
 */
export function PageLayout({
  variant = "default",
  className,
  ...props
}: PageLayoutProps) {
  return <main className={cn(variantClasses[variant], className)} {...props} />;
}
