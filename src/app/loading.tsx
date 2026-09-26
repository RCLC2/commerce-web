"use client";

import { usePathname } from "next/navigation";
import { LoadingState } from "@/components/ui/feedback";
import { PageLayout } from "@/components/page-layout";

export default function Loading() {
  const pathname = usePathname();
  const label = "화면을 불러오는 중입니다.";

  if (pathname.startsWith("/onboarding/")) {
    return <PageLayout variant="onboarding" className="flex items-center justify-center text-sm text-content-secondary"><LoadingState label={label} /></PageLayout>;
  }
  if (pathname === "/login" || pathname === "/register") {
    return <PageLayout variant="auth" className="text-sm text-content-secondary"><LoadingState label={label} /></PageLayout>;
  }
  if (pathname.startsWith("/payments/toss/")) {
    return <PageLayout variant="payment" className="text-sm text-content-secondary"><LoadingState label={label} /></PageLayout>;
  }
  if (pathname.startsWith("/admin") || pathname.startsWith("/seller")) {
    return <PageLayout variant="console" className="text-sm text-content-secondary"><LoadingState label={label} /></PageLayout>;
  }
  if (/^\/products\/\d+\/?$/.test(pathname)) {
    return <PageLayout variant="product-detail" className="pt-10 text-sm text-content-secondary"><LoadingState label={label} /></PageLayout>;
  }
  if (pathname === "/search") {
    return <PageLayout className="pt-2 text-sm text-content-secondary"><LoadingState label={label} /></PageLayout>;
  }
  if (pathname === "/products") {
    return <PageLayout className="pt-6 text-sm text-content-secondary"><LoadingState label={label} /></PageLayout>;
  }
  if (pathname === "/cart") {
    return <PageLayout className="text-sm text-content-secondary"><LoadingState label={label} /></PageLayout>;
  }
  if (pathname === "/checkout") {
    return <PageLayout className="text-sm text-content-secondary"><LoadingState label={label} /></PageLayout>;
  }
  if (pathname === "/mypage") {
    return <PageLayout className="pt-7 text-sm text-content-secondary"><LoadingState label={label} /></PageLayout>;
  }
  if (pathname === "/mypage/profile") {
    return <PageLayout className="text-sm text-content-secondary"><LoadingState label={label} /></PageLayout>;
  }
  if (pathname === "/mypage/coupons") {
    return <PageLayout className="text-sm text-content-secondary"><LoadingState label={label} /></PageLayout>;
  }
  if (pathname === "/mypage/reviews" || pathname.startsWith("/orders/")) {
    return <PageLayout className="text-sm text-content-secondary"><LoadingState label={label} /></PageLayout>;
  }
  if (/^\/products\/\d+\/reviews\/?$/.test(pathname)) {
    return <PageLayout className="text-sm text-content-secondary"><LoadingState label={label} /></PageLayout>;
  }
  if (pathname === "/" || /^\/(events|markets)\/\d+\/?$/.test(pathname)) {
    return <PageLayout className="pt-0 text-sm text-content-secondary"><LoadingState label={label} /></PageLayout>;
  }

  return <PageLayout className="text-sm text-content-secondary"><LoadingState label={label} /></PageLayout>;
}
