"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-client";
import type { HomeCard } from "@/lib/api/home-placements";
import { AdminAuthRequired, adminLinks, useAdminToken } from "./admin-console";
import { ConsoleHeader, ConsoleLayout, ConsoleSection, DataTable, StatusBadge } from "./console-layout";
import { Button } from "./ui/button";

type CardType = HomeCard["card_type"];
type Audience = HomeCard["audience_type"];
type Placement = HomeCard["placement"];

const cardTypeOptions: Array<{ value: CardType; label: string }> = [
  { value: "SIGNUP_COUPON", label: "가입 기념 쿠폰" },
  { value: "FIRST_PURCHASE_COUPON", label: "첫 구매 쿠폰" },
  { value: "PERSONALIZED_EVENT", label: "개인화 이벤트" },
  { value: "TEXT_AD", label: "텍스트 광고" },
  { value: "EVENT", label: "통합 카드 이벤트" },
];

const placementOptions: Array<{ value: Placement; label: string }> = [
  { value: "HOME_CONTEXT_TEXT", label: "홈 텍스트 혜택" },
  { value: "HOME_FEATURE_CARD", label: "홈 통합 카드" },
  { value: "PDP_REVIEW_BANNER", label: "PDP 리뷰 하단 배너" },
];

export function AdminHomeCardsPage() {
  const token = useAdminToken();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const cardsQuery = useQuery({
    queryKey: ["admin-home-cards"],
    queryFn: () => api.adminHomeCards(token ?? ""),
    enabled: Boolean(token),
    meta: { consoleDataRole: "primary" },
  });
  const create = useMutation({
    mutationFn: () => api.createAdminHomeCard(token ?? "", cardPayload(form)),
    onSuccess: async () => {
      setForm(emptyForm());
      await queryClient.invalidateQueries({ queryKey: ["admin-home-cards"] });
    },
  });
  const transition = useMutation({
    mutationFn: ({ cardID, active }: { cardID: number; active: boolean }) =>
      api.setAdminHomeCardActive(token ?? "", cardID, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-home-cards"] }),
  });

  if (!token) return <AdminAuthRequired />;
  const cards = cardsQuery.data ?? [];

  return (
    <ConsoleLayout title="Admin" subtitle="플랫폼 운영 콘솔" links={adminLinks}>
      <ConsoleHeader
        title="홈 구좌 카드"
        description="홈 텍스트·통합 카드와 PDP 리뷰 하단 배너에 노출할 플랫폼 카드를 등록합니다. 활성 카드의 대상과 노출 가능 여부는 서버가 결정합니다."
      />
      <ConsoleSection className="mt-5" title="카드 등록" description="CTA 문구와 이동 URL은 함께 입력하세요. 쿠폰·이벤트 참조 ID는 해당 카드 유형에서만 사용됩니다.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="구좌">
            <select className={inputClass} value={form.placement} onChange={(event) => {
              const placement = event.target.value as Placement;
              setForm({ ...form, placement, cardType: cardTypeOptionsForPlacement(placement)[0].value, takeover: false });
            }}>
              {placementOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>
          <Field label="카드 유형">
            <select className={inputClass} value={form.cardType} onChange={(event) => setForm({ ...form, cardType: event.target.value as CardType, takeover: false })}>
              {cardTypeOptionsForPlacement(form.placement).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>
          <Field label="노출 대상">
            <select className={inputClass} value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value as Audience })}>
              <option value="ALL">전체</option>
              <option value="AUTHENTICATED">로그인 회원</option>
            </select>
          </Field>
          <Field label="우선순위"><input className={inputClass} type="number" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} /></Field>
          <Field label="제목"><input className={inputClass} value={form.headline} onChange={(event) => setForm({ ...form, headline: event.target.value })} /></Field>
          <Field label="본문"><input className={inputClass} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} /></Field>
          {form.cardType === "EVENT" ? <Field label="이미지 URL"><input className={inputClass} value={form.imageURL} onChange={(event) => setForm({ ...form, imageURL: event.target.value })} placeholder="https://... 또는 /images/..." /></Field> : null}
          {isCouponType(form.cardType) ? <Field label="쿠폰 ID"><input className={inputClass} type="number" min="1" value={form.referenceID} onChange={(event) => setForm({ ...form, referenceID: event.target.value })} /></Field> : null}
          {isEventType(form.cardType) ? <Field label="이벤트 ID"><input className={inputClass} type="number" min="1" value={form.referenceID} onChange={(event) => setForm({ ...form, referenceID: event.target.value })} /></Field> : null}
          <Field label="CTA 문구"><input className={inputClass} value={form.ctaLabel} onChange={(event) => setForm({ ...form, ctaLabel: event.target.value })} placeholder="쿠폰 받기" /></Field>
          <Field label="이동 URL"><input className={inputClass} value={form.landingURL} onChange={(event) => setForm({ ...form, landingURL: event.target.value })} placeholder="/events/1" /></Field>
          <Field label="시작 일시"><input className={inputClass} type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /></Field>
          <Field label="종료 일시"><input className={inputClass} type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} /></Field>
        </div>
        {form.placement === "HOME_FEATURE_CARD" && form.cardType === "EVENT" ? (
          <label className="mt-4 flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={form.takeover} onChange={(event) => setForm({ ...form, takeover: event.target.checked })} />
            광고보다 먼저 노출하는 takeover 이벤트
          </label>
        ) : null}
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={() => create.mutate()} disabled={create.isPending || !canCreate(form)}>{create.isPending ? "등록 중" : "비활성 카드 등록"}</Button>
          <span className="text-xs text-muted">등록 후 목록에서 활성화해야 해당 구좌에 노출됩니다.</span>
        </div>
        {create.isError ? <p className="mt-3 text-sm font-bold text-brand">{apiErrorMessage(create.error)}</p> : null}
      </ConsoleSection>

      <ConsoleSection className="mt-5" title="등록 카드">
        <DataTable
          columns={["구좌", "유형", "제목", "대상/우선순위", "상태", "작업"]}
          rows={cards.map((card) => [
            placementOptions.find((option) => option.value === card.placement)?.label ?? card.placement,
            cardTypeOptions.find((option) => option.value === card.card_type)?.label ?? card.card_type,
            card.headline,
            `${card.audience_type} · ${card.priority}`,
            <StatusBadge key="status" value={card.status} />,
            <Button key="action" size="sm" variant={card.status === "ACTIVE" ? "secondary" : "primary"} disabled={transition.isPending} onClick={() => transition.mutate({ cardID: card.id, active: card.status !== "ACTIVE" })}>
              {card.status === "ACTIVE" ? "비활성화" : "활성화"}
            </Button>,
          ])}
          emptyText="등록한 홈 카드가 없습니다."
        />
        {transition.isError ? <p className="mt-3 text-sm font-bold text-brand">{apiErrorMessage(transition.error)}</p> : null}
      </ConsoleSection>
    </ConsoleLayout>
  );
}

function emptyForm() {
  return {
    placement: "HOME_CONTEXT_TEXT" as Placement,
    cardType: "SIGNUP_COUPON" as CardType,
    audience: "AUTHENTICATED" as Audience,
    priority: "100",
    headline: "",
    body: "",
    imageURL: "",
    referenceID: "",
    ctaLabel: "",
    landingURL: "",
    startsAt: "",
    endsAt: "",
    takeover: false,
  };
}

function isCouponType(type: CardType) {
  return type === "SIGNUP_COUPON" || type === "FIRST_PURCHASE_COUPON";
}

function isEventType(type: CardType) {
  return type === "PERSONALIZED_EVENT" || type === "EVENT";
}

function cardTypeOptionsForPlacement(placement: Placement) {
  if (placement === "HOME_FEATURE_CARD") return cardTypeOptions.filter((option) => option.value === "EVENT");
  if (placement === "HOME_CONTEXT_TEXT") return cardTypeOptions.filter((option) => option.value !== "EVENT");
  return cardTypeOptions;
}

function cardPayload(form: ReturnType<typeof emptyForm>) {
  const referenceID = Number(form.referenceID) || undefined;
  return {
    placement: form.placement,
    card_type: form.cardType,
    headline: form.headline.trim(),
    body: form.body.trim(),
    image_url: form.cardType === "EVENT" ? form.imageURL.trim() : undefined,
    cta_label: form.ctaLabel.trim() || undefined,
    landing_url: form.landingURL.trim() || undefined,
    coupon_id: isCouponType(form.cardType) ? referenceID : undefined,
    event_id: isEventType(form.cardType) ? referenceID : undefined,
    audience_type: form.audience,
    priority: Number(form.priority) || 0,
    is_takeover: form.placement === "HOME_FEATURE_CARD" && form.cardType === "EVENT" && form.takeover,
    starts_at: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
    ends_at: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
    status: "INACTIVE",
  };
}

function canCreate(form: ReturnType<typeof emptyForm>) {
  if (!form.headline.trim()) return false;
  if (!cardTypeOptionsForPlacement(form.placement).some((option) => option.value === form.cardType)) return false;
  if ((form.ctaLabel.trim() || form.landingURL.trim()) && !(form.ctaLabel.trim() && form.landingURL.trim())) return false;
  if ((isCouponType(form.cardType) || isEventType(form.cardType)) && Number(form.referenceID) < 1) return false;
  if (form.cardType === "EVENT" && !form.imageURL.trim()) return false;
  return !form.startsAt || !form.endsAt || new Date(form.endsAt) > new Date(form.startsAt);
}

const inputClass = "h-11 w-full rounded-md border border-line bg-white px-3 text-sm font-bold outline-none focus:border-foreground";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1 text-xs font-black text-muted">{label}{children}</label>;
}
