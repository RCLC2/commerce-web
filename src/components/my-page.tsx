"use client";

import { PageHeading } from "./ui/page-heading";
import { UserRound as PageIcon } from "lucide-react";

import { ButtonLink } from "@/components/ui/button-link";

import { FilterChip } from "./ui/filter-chip";

import { Input } from "./ui/input";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Heart, MapPin, MessageSquareText, Settings2, ShoppingBag, Ticket } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-client";
import { firstOrderItem, orderStatusLabel } from "@/lib/order-utils";
import { queryKeys } from "@/lib/query-keys";
import { useSessionStore } from "@/lib/session-store";
import type { Address } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { SafeImage } from "./safe-image";
import { Button } from "./ui/button";

const statuses = [
  ["ALL", "전체"], ["PAYMENT_PENDING", "결제 대기"], ["PAID", "결제 완료"], ["PLACED", "주문 접수"],
  ["SHIPPED", "배송 중"], ["DELIVERED", "배송 완료"], ["COMPLETED", "구매 확정"], ["CANCELLED", "취소"],
] as const;

export function MyPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useSessionStore((state) => state.accessToken) ?? "";
  const memberID = useSessionStore((state) => state.memberID);
  const logout = useSessionStore((state) => state.logout);
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressDraft, setAddressDraft] = useState<Address | null>(null);

  const profileQuery = useQuery({ queryKey: queryKeys.me(memberID), queryFn: () => api.me(token), enabled: Boolean(token) });
  const ordersQuery = useQuery({ queryKey: queryKeys.orders(memberID), queryFn: () => api.listAllOrders(token), enabled: Boolean(token) });
  const couponsQuery = useQuery({ queryKey: queryKeys.coupons(memberID), queryFn: () => api.listCoupons(token), enabled: Boolean(token) });
  const issuableQuery = useQuery({ queryKey: queryKeys.issuableCoupons(memberID), queryFn: () => api.listIssuableCoupons(token), enabled: Boolean(token) });
  const addressesQuery = useQuery({ queryKey: queryKeys.addresses(memberID), queryFn: () => api.listAddresses(token), enabled: Boolean(token) });

  const orders = ordersQuery.data ?? [];
  const productIDs = [...new Set(orders.flatMap((order) => order.market_orders?.flatMap((marketOrder) => marketOrder.line_items.map((item) => item.product_id)) ?? []))];
  const products = useQueries({ queries: productIDs.map((id) => ({ queryKey: queryKeys.product(id), queryFn: () => api.getProduct(id), staleTime: 300000 })) });
  const productByID = new Map(products.flatMap((query, index) => query.data ? [[productIDs[index], query.data] as const] : []));
  const defaultAddress = addressesQuery.data?.find((item) => item.is_default) ?? addressesQuery.data?.[0];

  const saveAddress = useMutation({
    mutationFn: (address: Address) => api.updateAddress(token, address.id, { address_name: "기본 배송지", receiver: address.receiver, phone: address.phone, zip_code: address.zip_code, line1: address.line1, line2: address.line2, is_default: true }),
    onSuccess: () => { setEditingAddress(false); void queryClient.invalidateQueries({ queryKey: queryKeys.addresses(memberID) }); },
  });

  const filteredOrders = orders.filter((order) => {
    const item = firstOrderItem(order);
    const product = item ? item.product ?? productByID.get(item.product_id) : undefined;
    const keyword = search.trim().toLowerCase();
    return (status === "ALL" || order.status === status) && (!keyword || order.order_code.toLowerCase().includes(keyword) || product?.name.toLowerCase().includes(keyword));
  });

  if (!token) return <main className="mx-auto max-w-3xl px-4 py-16"><h1 className="text-2xl font-bold">마이페이지</h1><p className="mt-2 text-sm text-content-secondary">로그인하고 주문과 혜택을 확인하세요.</p><ButtonLink href="/login" className="mt-5">로그인하기</ButtonLink></main>;

  const queryError = profileQuery.error ?? ordersQuery.error ?? couponsQuery.error ?? issuableQuery.error ?? addressesQuery.error;
  const profile = profileQuery.data;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-28 pt-7">
      <section className="rounded-2xl border border-border-subtle bg-surface-raised p-5 md:p-7">
        <div className="flex items-start justify-between gap-3">
          <PageHeading className="[&_h1]:text-xl sm:[&_h1]:text-3xl" icon={<PageIcon />} eyebrow="마이페이지" title={`${profile?.email?.split("@")[0] || "회원"}님`} />
          <Button variant="secondary" size="sm" onClick={() => { logout(); router.push("/login"); }}>로그아웃</Button>
        </div>
        {profile?.email ? <p className="mt-3 break-all text-sm text-content-secondary">{profile.email}</p> : null}
        <div className="mt-6 grid grid-cols-3 divide-x divide-border-subtle rounded-xl bg-surface-subtle px-2 py-4 text-center">
          <div><p className="text-xs text-content-secondary">포인트</p><p className="mt-1 font-bold">{profileQuery.isSuccess ? formatPrice(profile?.point_balance ?? 0) : "확인 필요"}</p></div>
          <div><p className="text-xs text-content-secondary">보유 쿠폰</p><p className="mt-1 font-bold">{couponsQuery.isSuccess ? `${couponsQuery.data.length}장` : "확인 필요"}</p></div>
          <div><p className="text-xs text-content-secondary">전체 주문</p><p className="mt-1 font-bold">{ordersQuery.isSuccess ? `${orders.length}건` : "확인 필요"}</p></div>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Shortcut href="/cart" icon={<ShoppingBag size={19} />} label="장바구니" />
        <Shortcut href="/likes" icon={<Heart size={19} />} label="좋아요" />
        <Shortcut href="/mypage/profile" icon={<Settings2 size={19} />} label="사용자 정보 수정" />
        <Shortcut href="/mypage/reviews" icon={<MessageSquareText size={19} />} label="리뷰 관리" />
      </section>

      {queryError ? <div className="mt-5 rounded-xl border border-action-primary/30 bg-status-negative-subtle p-4 text-sm"><p className="font-bold text-status-negative">{apiErrorMessage(queryError)}</p><Button className="mt-3" size="sm" variant="secondary" onClick={() => { void profileQuery.refetch(); void ordersQuery.refetch(); void couponsQuery.refetch(); void issuableQuery.refetch(); void addressesQuery.refetch(); }}>다시 시도</Button></div> : null}

      <section className="mt-6 grid gap-3 md:grid-cols-2">
        <BenefitCard title="발급 가능한 쿠폰" value={issuableQuery.isSuccess ? `${issuableQuery.data.length}장` : "확인 필요"} href="/mypage/coupons?view=issuable" />
        <BenefitCard title="발급한 쿠폰" value={couponsQuery.isSuccess ? `${couponsQuery.data.length}장` : "확인 필요"} href="/mypage/coupons?view=owned" />
      </section>

      <section className="mt-4 rounded-2xl border border-border-subtle bg-surface-raised p-5">
        <div className="flex items-center justify-between gap-3"><h2 className="font-bold">기본 배송지</h2>{defaultAddress ? <Button variant="ghost" className="text-sm font-bold text-action-primary" onClick={() => { saveAddress.reset(); setAddressDraft({ ...defaultAddress }); setEditingAddress(true); }}>편집하기</Button> : null}</div>
        {addressesQuery.isError ? (
          <p className="mt-3 text-sm font-bold text-action-primary">배송지를 불러오지 못했습니다. 위의 다시 시도를 눌러주세요.</p>
        ) : editingAddress && addressDraft ? (
          <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); saveAddress.mutate(addressDraft); }}>
            <AddressInput label="받는 분" value={addressDraft.receiver} onChange={(value) => setAddressDraft({ ...addressDraft, receiver: value })} />
            <AddressInput label="연락처" value={addressDraft.phone} onChange={(value) => setAddressDraft({ ...addressDraft, phone: value })} />
            <AddressInput label="우편번호" value={addressDraft.zip_code} onChange={(value) => setAddressDraft({ ...addressDraft, zip_code: value })} />
            <AddressInput label="기본 주소" value={addressDraft.line1} onChange={(value) => setAddressDraft({ ...addressDraft, line1: value })} />
            <div className="sm:col-span-2"><AddressInput label="상세 주소" value={addressDraft.line2} onChange={(value) => setAddressDraft({ ...addressDraft, line2: value })} /></div>
            <div className="flex gap-2 sm:col-span-2"><Button type="submit" size="sm" disabled={saveAddress.isPending}>저장</Button><Button type="button" size="sm" variant="secondary" onClick={() => { saveAddress.reset(); setEditingAddress(false); }}>취소</Button></div>
            {saveAddress.error ? <p className="text-sm font-bold text-status-negative sm:col-span-2">{apiErrorMessage(saveAddress.error)}</p> : null}
          </form>
        ) : defaultAddress ? <div className="mt-3 flex gap-3 text-sm"><MapPin size={18} className="mt-0.5 shrink-0 text-action-primary" /><div><p className="font-bold">{defaultAddress.receiver} / {defaultAddress.phone}</p><p className="mt-1 text-content-secondary">({defaultAddress.zip_code}) {defaultAddress.line1} {defaultAddress.line2}</p></div></div> : <p className="mt-3 text-sm text-content-secondary">등록된 배송지가 없습니다.</p>}
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold">주문 내역</h2>
        <p className="mt-1 text-sm text-content-secondary">주문 상태와 상품명으로 내역을 확인하세요.</p>
        <Input className="mt-4 h-11 w-full rounded-control border border-border-interactive px-3 text-sm outline-none md:max-w-sm" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="주문번호 또는 상품명 검색" placeholder="주문번호 또는 상품명 검색" />
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2" role="group" aria-label="주문 상태">
          {statuses.map(([value, label]) => <FilterChip key={value} selected={status === value} onClick={() => setStatus(value)}>{label}</FilterChip>)}
        </div>
        <div className="mt-3 space-y-3">
          {filteredOrders.map((order) => {
            const item = firstOrderItem(order);
            const product = item ? item.product ?? productByID.get(item.product_id) : undefined;
            return <Link key={order.id} href={`/orders/${order.order_code}`} className="block rounded-xl border border-border-subtle bg-surface-raised p-4 hover:bg-surface-subtle"><div className="flex gap-3"><div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-surface-subtle"><SafeImage src={product?.image_url} alt="" fill sizes="80px" className="object-cover" /></div><div className="min-w-0 flex-1"><div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:gap-3"><div className="min-w-0 max-w-full"><p className="font-bold">{orderStatusLabel(order.status)}</p><p className="mt-1 truncate text-sm font-bold">{product?.name ?? `상품 #${item?.product_id ?? "-"}`}</p></div><p className="shrink-0 whitespace-nowrap font-bold tabular-nums">{formatPrice(order.total_order_price - order.total_discount_price - order.used_point)}</p></div><p className="mt-2 text-xs text-content-secondary">{order.ordered_at ? new Date(order.ordered_at).toLocaleDateString("ko-KR") : ""} · {order.order_code}</p></div></div></Link>;
          })}
          {ordersQuery.isSuccess && !filteredOrders.length ? <div className="rounded-md border border-border-subtle bg-surface-raised p-8 text-center text-sm text-content-secondary">조건에 맞는 주문이 없습니다.</div> : null}
        </div>
      </section>
    </main>
  );
}

function Shortcut({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return <Link href={href} className="flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-raised p-4 text-sm font-bold hover:border-action-primary/30"><span className="text-action-primary">{icon}</span>{label}</Link>;
}

function BenefitCard({ title, value, href }: { title: string; value: string; href: string }) {
  return <div className="rounded-2xl border border-border-subtle bg-surface-raised p-5"><div className="flex items-center gap-2 text-sm font-bold text-content-secondary"><Ticket size={17} className="text-action-primary" />{title}</div><div className="mt-3 flex items-end justify-between"><p className="text-2xl font-bold">{value}</p><Link href={href} className="inline-flex items-center text-sm font-bold text-action-primary">더보기 <ChevronRight size={16} /></Link></div></div>;
}

function AddressInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="text-xs font-bold text-content-secondary">{label}</span><Input required className="mt-1 h-11 w-full rounded-control border border-border-interactive px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}
