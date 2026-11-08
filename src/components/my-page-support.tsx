"use client";

import { BookOpen, ChevronRight, Headphones, LogOut, MessageSquareText, Settings2, Ticket } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "./ui/button";
import { BottomSheet } from "./ui/overlay";

const supportQuestions = [
  ["배송 상태는 어디에서 확인하나요?", "주문 내역에서 상품을 선택하면 주문 상세에서 현재 주문 상태와 배송 정보를 확인할 수 있어요."],
  ["반품은 어떻게 신청하나요?", "주문 상세에서 반품을 신청할 수 있어요. 주문 상태와 상품별 신청 가능 수량, 반품 사유 등의 안내를 확인해주세요."],
] as const;

const guideQuestions = [
  ["결제수단은 어디에서 선택하나요?", "commerce money 지갑에서 머니와 카드를 살펴보고 주문서로 이동할 수 있어요. 실제 결제창에서 신용·체크카드 또는 간편결제를 선택하고, 사용할 포인트와 결제금액을 확인해주세요."],
  ["쿠폰과 포인트는 어떻게 사용하나요?", "주문서의 쿠폰·포인트 영역에서 적용할 수 있어요. 쿠폰별 사용 조건과 최종 결제금액을 확인한 후 결제해주세요."],
] as const;

export function MyPageSupport({ onLogout }: { onLogout: () => void }) {
  const [activeSheet, setActiveSheet] = useState<"support" | "guide" | null>(null);
  const isGuide = activeSheet === "guide";
  return <>
    <section className="mt-8 w-full border-t border-border-subtle pt-2" aria-label="고객 지원">
      {([
        { id: "support", label: "고객센터", description: "주문·배송·반품 도움이 필요할 때", icon: Headphones },
        { id: "guide", label: "이용안내", description: "결제·포인트 사용법과 내 쇼핑 관리", icon: BookOpen },
      ] as const).map(({ id, label, description, icon: Icon }) => <button key={id} type="button" className="flex w-full items-center gap-4 border-b border-border-subtle px-2 py-5 text-left transition hover:bg-action-secondary/40 sm:px-4" aria-label={label} aria-haspopup="dialog" aria-expanded={activeSheet === id} onClick={() => setActiveSheet(id)}><span className="grid size-11 shrink-0 place-items-center rounded-control bg-surface-subtle text-action-primary"><Icon size={22} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold">{label}</span><span className="mt-1 block text-xs text-content-secondary">{description}</span></span><ChevronRight size={18} className="shrink-0 text-content-tertiary" /></button>)}
      <Button variant="ghost" className="mt-3 w-full text-content-secondary" onClick={onLogout}><LogOut size={16} /> 로그아웃</Button>
    </section>
    <BottomSheet open={activeSheet !== null} onClose={() => setActiveSheet(null)} title={isGuide ? "이용안내" : "고객센터"} description={isGuide ? "쇼핑 서비스 사용법과 계정 관리를 확인하세요." : "주문·배송·반품에 관한 궁금한 점을 확인하세요."} className="mx-auto max-w-6xl">
      <h3 className="text-sm font-bold">{isGuide ? "쇼핑 서비스 이용 방법" : "자주 묻는 질문"}</h3>
      <div className="mt-3 divide-y divide-border-subtle rounded-surface border border-border-subtle px-4">{(isGuide ? guideQuestions : supportQuestions).map(([question, answer]) => <details key={question} className="group py-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden">{question}<ChevronRight size={16} className="shrink-0 text-content-tertiary transition-transform group-open:rotate-90" /></summary><p className="mt-3 text-sm leading-6 text-content-secondary">{answer}</p></details>)}</div>
      {isGuide ? <>
        <h3 className="mt-6 text-sm font-bold">내 쇼핑 관리</h3>
        <div className="mt-3 grid grid-cols-2 gap-2">{[
          { href: "/mypage/profile", label: "회원정보 수정", icon: Settings2 },
          { href: "/mypage/reviews", label: "리뷰 관리", icon: MessageSquareText },
          { href: "/mypage/coupons", label: "쿠폰함", icon: Ticket },
          { href: "/notifications", label: "알림함", icon: Headphones },
        ].map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setActiveSheet(null)} className="flex items-center gap-2 rounded-control border border-border-subtle p-3 text-xs font-bold hover:bg-action-secondary"><Icon size={16} className="text-action-primary" />{label}<ChevronRight size={14} className="ml-auto text-content-tertiary" /></Link>)}</div>
      </> : null}
    </BottomSheet>
  </>;
}
