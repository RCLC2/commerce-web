"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, MapPin, Ticket, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { getEffectiveToken } from "@/lib/auth-token";
import { firstOrderItem, orderStatusLabel } from "@/lib/order-utils";
import { queryKeys } from "@/lib/query-keys";
import { useSessionStore } from "@/lib/session-store";
import { formatPrice } from "@/lib/utils";
import { SafeImage } from "./safe-image";
import { Button } from "./ui/button";

export function MyPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useSessionStore((state) => state.accessToken);
  const logout = useSessionStore((state) => state.logout);
  const effectiveToken = getEffectiveToken(token) ?? "";
  const [orderStatus, setOrderStatus] = useState("ALL");
  const [orderQuery, setOrderQuery] = useState("");
  const [orderPeriod, setOrderPeriod] = useState("ALL");
  const { data: profile } = useQuery({ queryKey: queryKeys.me(effectiveToken), queryFn: () => api.me(effectiveToken), enabled: Boolean(effectiveToken) });
  const { data: orders = [] } = useQuery({
    queryKey: [...queryKeys.orders(effectiveToken), orderStatus],
    queryFn: () => api.listOrders(effectiveToken, { status: orderStatus, limit: 100 }),
    enabled: Boolean(effectiveToken),
  });
  const { data: myCoupons = [] } = useQuery({ queryKey: queryKeys.coupons(effectiveToken), queryFn: () => api.listCoupons(effectiveToken), enabled: Boolean(effectiveToken) });
  const { data: issuableCoupons = [] } = useQuery({ queryKey: queryKeys.issuableCoupons(effectiveToken), queryFn: () => api.listIssuableCoupons(effectiveToken), enabled: Boolean(effectiveToken) });
  const { data: addresses = [] } = useQuery({ queryKey: queryKeys.addresses(effectiveToken), queryFn: () => api.listAddresses(effectiveToken), enabled: Boolean(effectiveToken) });
  const issueCoupon = useMutation({
    mutationFn: (couponID: number) => api.issueCoupon(effectiveToken, couponID),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.coupons(effectiveToken) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.issuableCoupons(effectiveToken) });
    },
  });

  const defaultAddress = addresses.find((address) => address.is_default) ?? addresses[0];
  const filteredOrders = useMemo(() => {
    const query = orderQuery.trim().toLowerCase();
    const cutoff = orderPeriodCutoff(orderPeriod);
    return orders.filter((order) => {
      const item = firstOrderItem(order);
      const matchesQuery = !query || order.order_code.toLowerCase().includes(query) || item?.product?.name?.toLowerCase().includes(query) || String(item?.product_id ?? "").includes(query);
      const orderedAt = order.ordered_at ? new Date(order.ordered_at) : null;
      return matchesQuery && (!cutoff || (orderedAt !== null && orderedAt >= cutoff));
    });
  }, [orders, orderPeriod, orderQuery]);
  const orderSummary = [
    { label: "All", value: orders.length },
    { label: "Shipping", value: orders.filter((order) => order.status === "SHIPPED" || order.status === "DELIVERED" || order.market_orders?.some((marketOrder) => ["SHIPPED", "DELIVERED"].includes(marketOrder.status))).length },
    { label: "Confirmed", value: orders.filter((order) => order.status === "COMPLETED" || order.market_orders?.some((marketOrder) => marketOrder.line_items.some((item) => item.status === "COMPLETED"))).length },
  ];

  if (!token) {
    return <main className="mx-auto max-w-3xl px-4 py-16"><h1 className="text-2xl font-black">My page</h1><p className="mt-2 text-sm text-muted">Log in to view your account and orders.</p><Link href="/login"><Button className="mt-5">Log in</Button></Link></main>;
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-8">
      <div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-black">My page</h1><p className="mt-1 text-sm text-muted">{profile?.email ?? "-"}</p></div><Button variant="secondary" onClick={() => { logout(); router.push("/login"); }}>Logout</Button></div>
      <section className="mt-6 grid gap-3 md:grid-cols-3"><Metric icon={<Ticket size={16} />} label="Available coupons" value={`${issuableCoupons.length}`} /><Metric icon={<Wallet size={16} />} label="Points" value={formatPrice(profile?.point_balance ?? 0)} /><Metric icon={<Ticket size={16} />} label="My coupons" value={`${myCoupons.length}`} /></section>
      <section className="mt-4 rounded-md border border-line bg-white p-4"><details><summary className="flex cursor-pointer list-none items-center justify-between font-black">Coupon wallet<ChevronRight size={18} /></summary><div className="mt-4 grid gap-4 md:grid-cols-2"><div><h2 className="text-sm font-black">Available</h2><div className="mt-3 space-y-2">{issuableCoupons.map((coupon) => <div key={coupon.id} className="rounded-md bg-zinc-50 p-3"><div className="flex items-start justify-between gap-3"><div><p className="font-bold">{coupon.name}</p><p className="mt-1 text-xs text-muted">{coupon.condition_text}</p></div><Button size="sm" disabled={issueCoupon.isPending} onClick={() => issueCoupon.mutate(coupon.id)}>Issue</Button></div></div>)}</div></div><div><h2 className="text-sm font-black">Owned</h2><div className="mt-3 space-y-2">{myCoupons.map((coupon) => <div key={coupon.id} className="rounded-md bg-zinc-50 p-3"><p className="font-bold">{coupon.name}</p><p className="mt-1 text-xs text-muted">{coupon.condition_text ?? `${formatPrice(coupon.min_order_amount)} minimum`}</p><p className="mt-1 text-xs text-muted">Expires {coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString("ko-KR") : "-"}</p></div>)}</div></div></div></details></section>
      <section className="mt-4 rounded-md border border-line bg-white p-4"><div className="flex items-center justify-between gap-3"><div><h2 className="font-black">Reviews</h2><p className="mt-1 text-sm text-muted">Manage your written product reviews.</p></div><Link href="/mypage/reviews" className="text-sm font-bold text-muted">Manage</Link></div></section>
      <section className="mt-4 rounded-md border border-line bg-white p-4"><div className="flex items-center justify-between gap-3"><h2 className="font-black">Address</h2><Link href="/mypage/profile" className="text-sm font-bold text-muted">Manage</Link></div>{defaultAddress ? <div className="mt-3 flex gap-3 text-sm"><MapPin size={18} className="mt-0.5 shrink-0 text-brand" /><div><p className="font-bold">{defaultAddress.receiver} / {defaultAddress.phone}</p><p className="mt-1 text-muted">({defaultAddress.zip_code}) {defaultAddress.line1} {defaultAddress.line2}</p></div></div> : <p className="mt-3 text-sm text-muted">No address saved.</p>}</section>
      <section className="mt-8"><div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><h2 className="text-xl font-black">Orders</h2><p className="mt-1 text-sm text-muted">Filter by status, period, order number, or product.</p></div><div className="grid gap-2 md:grid-cols-[180px_140px_140px]"><input className="h-10 rounded-md border border-line px-3 text-sm outline-none" value={orderQuery} onChange={(event) => setOrderQuery(event.target.value)} placeholder="Order or product" aria-label="Order search" /><select className="h-10 rounded-md border border-line bg-white px-3 text-sm font-bold" value={orderStatus} onChange={(event) => setOrderStatus(event.target.value)} aria-label="Order status"><option value="ALL">All status</option><option value="PAYMENT_PENDING">Payment pending</option><option value="PAID">Paid</option><option value="SHIPPED">Shipping</option><option value="DELIVERED">Delivered</option><option value="COMPLETED">Confirmed</option><option value="CANCELLED">Canceled</option></select><select className="h-10 rounded-md border border-line bg-white px-3 text-sm font-bold" value={orderPeriod} onChange={(event) => setOrderPeriod(event.target.value)} aria-label="Order period"><option value="ALL">All time</option><option value="30D">Last 30 days</option><option value="90D">Last 90 days</option><option value="365D">Last year</option></select></div></div><div className="mt-4 grid gap-3 md:grid-cols-3">{orderSummary.map((item) => <div key={item.label} className="rounded-md border border-line bg-white p-3"><p className="text-xs font-bold text-muted">{item.label}</p><p className="mt-1 text-xl font-black">{item.value}</p></div>)}</div><div className="mt-3 space-y-3">{filteredOrders.length ? filteredOrders.map((order) => { const item = firstOrderItem(order); return <Link key={order.id} href={`/orders/${order.order_code}`} className="block rounded-md border border-line bg-white p-4 hover:bg-zinc-50"><div className="flex gap-3"><div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-zinc-100"><SafeImage src={item?.product?.image_url} alt="" fill sizes="80px" className="object-cover" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-black">{orderStatusLabel(order.status)}</p><p className="mt-1 truncate text-sm font-bold">{item?.product?.name ?? `Product #${item?.product_id ?? "-"}`}</p></div><p className="font-black">{formatPrice(order.total_order_price - order.total_discount_price - order.used_point)}</p></div><p className="mt-1 text-xs text-muted">{order.ordered_at ? new Date(order.ordered_at).toLocaleDateString("ko-KR") : "-"} / {order.order_code}</p><p className="mt-1 text-xs text-muted">{order.market_orders?.length ?? 0} markets / {order.market_orders?.flatMap((marketOrder) => marketOrder.line_items).length ?? 0} items</p></div></div></Link>; }) : <div className="rounded-md border border-line bg-white p-8 text-center text-sm font-bold text-muted">No orders match the filters.</div>}</div></section>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-md border border-line bg-white p-4"><div className="flex items-center gap-2 text-sm text-muted">{icon} {label}</div><p className="mt-2 text-2xl font-black">{value}</p></div>;
}

function orderPeriodCutoff(period: string) {
  if (period === "ALL") return null;
  const days = period === "30D" ? 30 : period === "90D" ? 90 : 365;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff;
}
