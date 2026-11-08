"use client";

import { Check, ChevronLeft, ChevronRight, CircleHelp, Coins, CreditCard, LockKeyhole, Plus, WalletCards } from "lucide-react";
import Image from "next/image";
import { useRef, useState, type PointerEvent } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { LoadingSpinner } from "./ui/feedback";
import { BottomSheet } from "./ui/overlay";
import styles from "./commerce-money-wallet.module.css";

const cardDesigns = [
  { kind: "card", name: "현대카드", product: "ZERO Edition3 Metal", src: "/images/payment-cards/hyundai-zero-edition3.png", width: 604, height: 956, sideways: false },
  { kind: "card", name: "신한카드", product: "Mr.Life", src: "/images/payment-cards/shinhan-mr-life.png", width: 1119, height: 705, sideways: true },
  { kind: "card", name: "KB국민카드", product: "My WE:SH", src: "/images/payment-cards/kb-my-wish.png", width: 570, height: 360, sideways: true },
] as const;
const methods = [{ kind: "money", name: "머니", product: "commerce money" }, ...cardDesigns] as const;

type WalletProps = { pointBalance: number | null; pointsError: boolean; onRetryPoints: () => void };
type WalletSheet = "details" | "add" | "help" | null;
type Gesture = { pointerId: number; x: number; y: number; dragging: boolean };

export function CommerceMoneyWallet({ pointBalance, pointsError, onRetryPoints }: WalletProps) {
  const [selected, setSelected] = useState(0);
  const [detailSelection, setDetailSelection] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [sheet, setSheet] = useState<WalletSheet>(null);
  const [addKind, setAddKind] = useState<"money" | "card">("money");
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const method = methods[selected];
  const detailMethod = methods[detailSelection];

  function selectMethod(index: number) {
    setSelected(Math.max(0, Math.min(methods.length - 1, index)));
    setDragOffset(0);
  }

  function openDetails(index: number) {
    setDetailSelection(index);
    setSheet("details");
  }

  function startGesture(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    suppressClick.current = false;
    gesture.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, dragging: false };
  }

  function moveGesture(event: PointerEvent<HTMLDivElement>) {
    const start = gesture.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!start.dragging) {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { gesture.current = null; return; }
      if (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy)) return;
      start.dragging = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const atEdge = (selected === 0 && dx > 0) || (selected === methods.length - 1 && dx < 0);
    setDragOffset(Math.max(-160, Math.min(160, dx * (atEdge ? 0.25 : 1))));
  }

  function endGesture(event: PointerEvent<HTMLDivElement>) {
    const start = gesture.current;
    if (!start || start.pointerId !== event.pointerId) return;
    gesture.current = null;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    suppressClick.current = start.dragging;
    if (start.dragging && Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy)) selectMethod(selected + (dx < 0 ? 1 : -1));
    else setDragOffset(0);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function cancelGesture() {
    if (!gesture.current) return;
    suppressClick.current = gesture.current.dragging;
    gesture.current = null;
    setDragOffset(0);
  }

  const pointValue = pointsError ? <Button variant="ghost" size="sm" onClick={onRetryPoints}>포인트 다시 확인</Button> : pointBalance === null ? <span role="status" aria-label="결제 포인트를 불러오는 중입니다."><LoadingSpinner className="size-5" /></span> : <p className="text-xl font-bold tabular-nums">{pointBalance.toLocaleString()}<span className="ml-1 text-sm text-action-primary">P</span></p>;
  const points = <div className={styles.pointsRow}>
    <p className="text-sm font-bold">보유 포인트</p>
    {pointValue}
  </div>;

  return <>
    <section className={styles.wallet} aria-labelledby="commerce-money-title">
      <div className={styles.header}>
        <div><h2 id="commerce-money-title" className={styles.wordmark}>commerce <span>money</span></h2><p className="mt-2 text-xs text-content-secondary">머니와 카드를 한곳에서</p></div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="sm" aria-label="결제수단 추가" aria-haspopup="dialog" aria-expanded={sheet === "add"} onClick={() => { setAddKind(method.kind); setSheet("add"); }}><Plus size={16} /> 추가</Button>
          <Button variant="ghost" size="icon" aria-label="머니 이용안내" aria-haspopup="dialog" aria-expanded={sheet === "help"} onClick={() => setSheet("help")}><CircleHelp size={20} /></Button>
        </div>
      </div>

      <section className={styles.infoPanel} aria-label="선택한 결제수단 정보">
        {method.kind === "money" ? <><h3 className="text-sm font-bold">보유 포인트</h3>{pointValue}</> : <div className="min-w-0"><h3 className="text-xl font-bold">{method.name}</h3><p className="mt-1 text-sm text-content-secondary">{method.product}</p></div>}
      </section>

      <div className={styles.slider}>
        <div className={styles.carouselStage}>
        <div className={styles.viewport} role="group" aria-label="머니·카드 슬라이드" aria-roledescription="슬라이더" tabIndex={0}
          onPointerDown={startGesture} onPointerMove={moveGesture} onPointerUp={endGesture} onPointerCancel={cancelGesture}
          onLostPointerCapture={(event) => { if (event.target === event.currentTarget) cancelGesture(); }}
          onPointerLeave={() => { if (gesture.current && !gesture.current.dragging) gesture.current = null; }}
          onClickCapture={(event) => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; } }}
          onDragStart={(event) => event.preventDefault()}
          onKeyDown={(event) => {
            const next = event.key === "ArrowLeft" ? selected - 1 : event.key === "ArrowRight" ? selected + 1 : event.key === "Home" ? 0 : event.key === "End" ? methods.length - 1 : null;
            if (next === null) return;
            event.preventDefault();
            event.currentTarget.focus();
            selectMethod(next);
          }}>
          <div className={cn(styles.track, dragOffset !== 0 && styles.dragging)} style={{ transform: `translate3d(calc(50% - var(--slide-width) / 2 - ${selected} * (var(--slide-width) + var(--slide-gap)) + ${dragOffset}px), 0, 0)` }}>
            {methods.map((item, index) => <div key={item.name} className={cn(styles.slide, index === selected && styles.activeSlide, index < selected && styles.previousSlide, index > selected && styles.nextSlide)} aria-hidden={index !== selected}>
              <button type="button" className={styles.methodButton} tabIndex={index === selected ? 0 : -1} aria-label={`${item.name} 상세 보기`} aria-haspopup="dialog" aria-expanded={index === selected && sheet === "details"}
                onClick={() => { if (index === selected) openDetails(index); else selectMethod(index); }}>
                {item.kind === "money" ? <MoneyCard /> : <span className={styles.plate}><CardImage card={item} /></span>}
              </button>
            </div>)}
          </div>
        </div>
          <button type="button" className={styles.previousButton} aria-label="이전 결제수단" disabled={selected === 0} onClick={() => selectMethod(selected - 1)}><ChevronLeft size={28} strokeWidth={2.5} /></button>
          <button type="button" className={styles.nextButton} aria-label="다음 결제수단" disabled={selected === methods.length - 1} onClick={() => selectMethod(selected + 1)}><ChevronRight size={28} strokeWidth={2.5} /></button>
        </div>
        <p className={styles.sliderPosition} role="status" aria-live="polite" aria-atomic="true"><span className="font-bold text-content-primary">{method.name}</span><span>{selected + 1} / {methods.length}</span></p>
      </div>
    </section>

    <BottomSheet open={sheet !== null} onClose={() => setSheet(null)} title={sheet === "help" ? "머니 이용안내" : sheet === "add" ? "결제수단 추가" : detailMethod.name} description={sheet === "add" ? "쇼핑에 사용할 결제수단을 선택하세요." : sheet === "help" ? "commerce money와 카드로 이어지는 쇼핑." : detailMethod.product} className="mx-auto max-w-xl">
      {sheet === "help" ? <div className="space-y-5">{[
        { icon: WalletCards, title: "머니 · commerce money", description: "머니는 지갑의 맨 앞에서 확인할 수 있어요. 보유 포인트를 주문서에서 적용하고 결제로 이어가세요." },
        { icon: CreditCard, title: "카드 선택", description: "머니와 카드를 좌우로 밀어 살펴보세요. 실제 결제 카드는 주문서의 결제창에서 선택하고, 카드 정보는 결제창에서 입력해요." },
        { icon: LockKeyhole, title: "결제 확인", description: "결제가 완료되면 주문 내역에서 주문 상태와 실제 결제수단을 확인할 수 있어요." },
      ].map(({ icon: Icon, title, description }) => <div key={title} className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-control bg-action-secondary text-action-primary"><Icon size={20} /></span><div><h3 className="text-sm font-bold">{title}</h3><p className="mt-1 text-sm leading-6 text-content-secondary">{description}</p></div></div>)}</div> : sheet === "add" ? <>
        <div className="grid gap-3" role="group" aria-label="추가할 결제수단">
          {([{ value: "money", label: "머니 · commerce money", description: "보유 포인트를 적용하고 결제로 이어가요", icon: WalletCards }, { value: "card", label: "신용·체크카드", description: "주문서의 결제창에서 카드 정보를 입력해요", icon: CreditCard }] as const).map(({value,label,description,icon:Icon}) => <button key={value} type="button" className={cn(styles.addOption, addKind === value && styles.addOptionSelected)} aria-pressed={addKind === value} onClick={() => setAddKind(value)}><Icon size={24} className="shrink-0 text-action-primary" /><span className="min-w-0 flex-1 text-left"><span className="block text-sm font-bold">{label}</span><span className="mt-1 block text-xs leading-5 text-content-secondary">{description}</span></span><span className={styles.choiceMark} aria-hidden="true">{addKind === value ? <Check size={14} /> : null}</span></button>)}
        </div>
        <p className="mt-5 text-xs leading-5 text-content-secondary">카드 정보 입력과 결제수단 선택은 주문서에서 진행해요. 이 화면에서는 카드 정보를 저장하지 않아요.</p>
        <Button variant="secondary" className="mt-5 w-full" onClick={() => setSheet(null)}>확인</Button>
      </> : sheet === "details" ? <>
        <div className={styles.sheetArtwork}>{detailMethod.kind === "money" ? <MoneyCard /> : <div className={styles.plate}><CardImage card={detailMethod} /></div>}</div>
        {detailMethod.kind === "money" ? points : null}
      </> : null}
    </BottomSheet>
  </>;
}

function MoneyCard() {
  return <span className={styles.moneyCard} aria-hidden="true"><WalletCards size={20} /><span className={styles.moneyLogo}>commerce<br /><strong>money</strong></span><span className={styles.moneyEmblem}><Coins size={32} /></span><span className="text-xs">나의 쇼핑 머니</span></span>;
}

function CardImage({ card }: { card: typeof cardDesigns[number] }) {
  return <Image src={card.src} width={card.width} height={card.height} alt={`${card.name} ${card.product} 원본 카드 디자인`} unoptimized draggable={false} className={card.sideways ? styles.landscapeSource : styles.portraitSource} />;
}
