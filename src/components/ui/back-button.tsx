"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "./button";

type NavigationHistory = {
  currentEntry?: { index: number };
  entries?: () => Array<{ url?: string }>;
};

function hasPreviousSitePage() {
  const navigation = (window as Window & { navigation?: NavigationHistory }).navigation;
  const index = navigation?.currentEntry?.index;
  const previousURL = index !== undefined ? navigation?.entries?.()[index - 1]?.url : undefined;
  const candidate = previousURL ?? (window.history.length > 1 ? document.referrer : "");
  if (!candidate) return false;
  try {
    return new URL(candidate).origin === window.location.origin;
  } catch {
    return false;
  }
}

export function BackButton({ fallbackHref, className }: { fallbackHref: string; className?: string }) {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="lg"
      className={cn("-ml-3 gap-2 text-content-secondary", className)}
      onClick={() => hasPreviousSitePage() ? router.back() : router.push(fallbackHref)}
    >
      <ArrowLeft size={22} aria-hidden="true" /> 뒤로가기
    </Button>
  );
}
