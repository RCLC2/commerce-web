"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { sellerConsoleApi } from "@/lib/seller-console-api";
import { formatPrice } from "@/lib/utils";
import {
  ConsoleHeader,
  ConsoleSection,
  FilterField,
  FilterPanel,
  StatusBadge,
} from "./console-layout";
import {
  ConsoleModal,
  ConsoleTable,
  DetailGrid,
  DetailItem,
  ModalLoading,
  PaginationBar,
  consoleInputClass,
  useDebouncedValue,
} from "./console-ui";
import { SafeImage } from "./safe-image";
import {
  SellerAuthRequiredV2,
  SellerConsoleLayoutV2,
  useSellerConsoleContext,
} from "./seller-shell";
import { Button } from "./ui/button";

function dateTime(value?: string) {
  return value ? new Date(value).toLocaleString("ko-KR") : "-";
}

function filterStatus(value: string) {
  return value === "ALL" ? undefined : value;
}

export function SellerOrdersPageV2() {
  const { token, marketID, marketName } = useSellerConsoleContext();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedCode, setSelectedCode] = useState<string>();
  const [carrier, setCarrier] = useState("");
  const [invoice, setInvoice] = useState("");
  const debouncedQuery = useDebouncedValue(query);

  const ordersQuery = useQuery({
    queryKey: ["seller-orders-v2", marketID, page, debouncedQuery, status, from, to],
    queryFn: () =>
      sellerConsoleApi.orders(token ?? "", {
        market_id: marketID,
        page,
        page_size: 30,
        q: debouncedQuery || undefined,
        status: filterStatus(status),
        from: from || undefined,
        to: to || undefined,
      }),
    enabled: Boolean(token),
    meta: { consoleDataRole: "primary" },
  });
  const orderQuery = useQuery({
    queryKey: ["seller-order-v2", marketID, selectedCode],
    queryFn: () => sellerConsoleApi.order(token ?? "", selectedCode ?? "", marketID),
    enabled: Boolean(token && selectedCode),
  });
  const carriersQuery = useQuery({
    queryKey: ["delivery-carriers-v2"],
    queryFn: () => api.deliveryCarriers(token ?? ""),
    enabled: Boolean(token),
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCarrier(orderQuery.data?.delivery?.carrier ?? "");
      setInvoice(orderQuery.data?.delivery?.tracking_number ?? "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [orderQuery.data]);

  async function refreshOrder() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["seller-orders-v2"] }),
      queryClient.invalidateQueries({ queryKey: ["seller-order-v2", marketID, selectedCode] }),
      queryClient.invalidateQueries({ queryKey: ["seller-dashboard-v2"] }),
    ]);
  }

  const registerInvoice = useMutation({
    mutationFn: () => {
      if (!marketID || !orderQuery.data || !carrier || !invoice.trim()) {
        throw new Error("마켓, 택배사, 송장 번호를 확인해 주세요.");
      }
      return api.registerSellerInvoices(token ?? "", {
        market_id: marketID,
        invoices: [{
          order_id: orderQuery.data.order_id,
          carrier,
          invoice_number: invoice.trim(),
        }],
      });
    },
    onSuccess: refreshOrder,
  });
  const startDelivery = useMutation({
    mutationFn: () => {
      if (!marketID || !orderQuery.data?.delivery?.id || !carrier || !invoice.trim()) {
        throw new Error("배송 정보와 송장 번호를 확인해 주세요.");
      }
      return api.startSellerDelivery(
        token ?? "",
        marketID,
        orderQuery.data.delivery.id,
        { carrier, tracking_number: invoice.trim() },
      );
    },
    onSuccess: refreshOrder,
  });
  const completeDelivery = useMutation({
    mutationFn: () => {
      if (!marketID || !orderQuery.data?.delivery?.id) {
        throw new Error("배송 정보를 확인해 주세요.");
      }
      return api.completeSellerDelivery(token ?? "", marketID, orderQuery.data.delivery.id);
    },
    onSuccess: refreshOrder,
  });

  if (!token) return <SellerAuthRequiredV2 />;
  const data = ordersQuery.data;
  const orders = data?.items ?? [];
  const order = orderQuery.data;
  const deliveryStatus = order?.delivery?.status ?? order?.status ?? "PENDING";
  const shippingPending =
    registerInvoice.isPending || startDelivery.isPending || completeDelivery.isPending;

  let orderAction = null;
  if (order && !["DELIVERED", "COMPLETED", "CANCELLED"].includes(deliveryStatus)) {
    if (!order.delivery?.id) {
      orderAction = <Button type="button" disabled={shippingPending || !carrier || !invoice.trim()} onClick={() => registerInvoice.mutate()}>송장 등록</Button>;
    } else if (["SHIPPING", "SHIPPED"].includes(deliveryStatus)) {
      orderAction = <Button type="button" disabled={shippingPending} onClick={() => completeDelivery.mutate()}>배송 완료</Button>;
    } else {
      orderAction = <Button type="button" disabled={shippingPending || !carrier || !invoice.trim()} onClick={() => startDelivery.mutate()}>배송 시작</Button>;
    }
  }

  return (
    <SellerConsoleLayoutV2 marketName={marketName}>
      <ConsoleHeader
        title="주문/배송"
        description="기본 30건씩 불러오며 검색·날짜·상태 필터를 서버에서 처리합니다. 목록은 조회 전용입니다."
      />
      <ConsoleSection className="mt-5" title="주문 목록" description="주문을 누르면 상품, 구매자, 배송 정보와 처리 버튼을 확인할 수 있습니다.">
        <FilterPanel>
          <FilterField label="주문 검색">
            <input className={consoleInputClass} value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="주문번호, 상품명, 구매자" />
          </FilterField>
          <FilterField label="상태">
            <select className={consoleInputClass} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
              <option value="ALL">전체 상태</option>
              <option value="PAID">출고 대기</option>
              <option value="PLACED">주문 접수</option>
              <option value="SHIPPED">배송중</option>
              <option value="DELIVERED">배송 완료</option>
              <option value="COMPLETED">구매 확정</option>
              <option value="CANCELLED">취소</option>
            </select>
          </FilterField>
          <FilterField label="시작일">
            <input className={consoleInputClass} type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} />
          </FilterField>
          <FilterField label="종료일">
            <input className={consoleInputClass} type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} />
          </FilterField>
        </FilterPanel>
        <div className="mt-4">
          <ConsoleTable
            columns={["주문번호", "구매자", "대표 상품", "결제 금액", "정산 예정", "상태", "주문일"]}
            rows={orders.map((item) => [
              <span key="code" className="font-black">{item.order_code}</span>,
              <span key="buyer" className="break-all">{item.buyer_email}</span>,
              item.representative_product + (item.item_count > 1 ? " 외 " + String(item.item_count - 1) + "건" : ""),
              formatPrice(item.market_total_amount),
              formatPrice(item.expected_settlement_amount),
              <StatusBadge key="status" value={item.delivery_status ?? item.status} />,
              dateTime(item.created_at),
            ])}
            rowKeys={orders.map((item) => item.market_order_id)}
            onRowClick={(index) => setSelectedCode(orders[index].order_code)}
          />
          <PaginationBar page={data?.page ?? page} totalPages={data?.total_pages ?? 1} total={data?.total ?? 0} onChange={setPage} />
        </div>
      </ConsoleSection>

      <ConsoleModal
        open={Boolean(selectedCode)}
        title={selectedCode ? "주문 " + selectedCode : "주문 상세"}
        size="xl"
        onClose={() => setSelectedCode(undefined)}
        footer={orderAction}
      >
        {order ? (
          <div className="grid gap-6">
            <DetailGrid>
              <DetailItem label="구매자">{order.buyer_email}</DetailItem>
              <DetailItem label="주문 상태"><StatusBadge value={order.status} /></DetailItem>
              <DetailItem label="마켓 결제 금액">{formatPrice(order.market_total_amount)}</DetailItem>
              <DetailItem label="배송비">{formatPrice(order.shipping_fee)}</DetailItem>
              <DetailItem label="예상 정산">{formatPrice(order.expected_settlement_amount)}</DetailItem>
              <DetailItem label="결제 수단">{order.payment_method}</DetailItem>
              <DetailItem label="주문일">{dateTime(order.created_at)}</DetailItem>
              <DetailItem label="수정일">{dateTime(order.updated_at)}</DetailItem>
            </DetailGrid>
            <section>
              <h3 className="mb-3 font-black">배송 정보</h3>
              <div className="grid gap-3 rounded-xl bg-zinc-50 p-4 sm:grid-cols-2">
                <FilterField label="택배사">
                  <select className={consoleInputClass} value={carrier} onChange={(event) => setCarrier(event.target.value)} disabled={["DELIVERED", "COMPLETED"].includes(deliveryStatus)}>
                    <option value="">택배사 선택</option>
                    {(carriersQuery.data?.carriers ?? []).map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
                  </select>
                </FilterField>
                <FilterField label="송장번호">
                  <input className={consoleInputClass} value={invoice} onChange={(event) => setInvoice(event.target.value)} placeholder="송장번호" disabled={["DELIVERED", "COMPLETED"].includes(deliveryStatus)} />
                </FilterField>
                <DetailItem label="배송 상태"><StatusBadge value={deliveryStatus} /></DetailItem>
                <DetailItem label="수령인">{order.delivery?.receiver_name}</DetailItem>
                <DetailItem label="연락처">{order.delivery?.receiver_phone}</DetailItem>
                <DetailItem label="주소">{order.delivery?.address}</DetailItem>
              </div>
            </section>
            <section>
              <h3 className="mb-3 font-black">주문 상품</h3>
              <ConsoleTable
                columns={["상품", "옵션", "수량", "판매가", "할인", "상태"]}
                rows={order.items.map((item) => [
                  item.product_name,
                  item.option_name + ": " + item.option_value,
                  String(item.quantity) + "개",
                  formatPrice(item.price),
                  formatPrice(item.discount_amount),
                  <StatusBadge key="status" value={item.status} />,
                ])}
              />
            </section>
          </div>
        ) : (
          <ModalLoading />
        )}
      </ConsoleModal>
    </SellerConsoleLayoutV2>
  );
}

export function SellerSettlementsPageV2() {
  const { token, marketID, marketName } = useSellerConsoleContext();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("ALL");
  const [targetMonth, setTargetMonth] = useState("");
  const [selectedID, setSelectedID] = useState<number>();
  const [linePage, setLinePage] = useState(1);

  const settlementsQuery = useQuery({
    queryKey: ["seller-settlements-v2", marketID, page, status, targetMonth],
    queryFn: () =>
      sellerConsoleApi.settlements(token ?? "", {
        market_id: marketID,
        page,
        page_size: 20,
        status: filterStatus(status),
        target_month: targetMonth || undefined,
      }),
    enabled: Boolean(token),
    meta: { consoleDataRole: "primary" },
  });
  const settlementQuery = useQuery({
    queryKey: ["seller-settlement-v2", marketID, selectedID, linePage],
    queryFn: () => sellerConsoleApi.settlement(token ?? "", selectedID ?? 0, marketID, linePage),
    enabled: Boolean(token && selectedID),
  });

  if (!token) return <SellerAuthRequiredV2 />;
  const data = settlementsQuery.data;
  const settlements = data?.items ?? [];

  return (
    <SellerConsoleLayoutV2 marketName={marketName}>
      <ConsoleHeader title="정산" description="정산 목록과 주문별 상세 라인을 분리해 필요한 범위만 불러옵니다." />
      <ConsoleSection className="mt-5" title="정산 목록">
        <FilterPanel>
          <FilterField label="상태">
            <select className={consoleInputClass} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
              <option value="ALL">전체 상태</option>
              <option value="PREPARED">지급 대기</option>
              <option value="CONFIRMED">지급 확정</option>
              <option value="PAID">지급 완료</option>
              <option value="EXCLUDED">정산 제외</option>
            </select>
          </FilterField>
          <FilterField label="정산월">
            <input className={consoleInputClass} type="month" value={targetMonth} onChange={(event) => { setTargetMonth(event.target.value); setPage(1); }} />
          </FilterField>
        </FilterPanel>
        <div className="mt-4">
          <ConsoleTable
            columns={["정산월", "매출", "수수료", "최종 정산", "지급 예정일", "상태"]}
            rows={settlements.map((item) => [
              <span key="month" className="font-black">{item.target_month}</span>,
              formatPrice(item.total_sales_amount),
              formatPrice(item.commission_amount),
              <span key="amount" className="font-black">{formatPrice(item.final_settlement_amount)}</span>,
              dateTime(item.payment_due_date),
              <StatusBadge key="status" value={item.status} />,
            ])}
            rowKeys={settlements.map((item) => item.id)}
            onRowClick={(index) => { setSelectedID(settlements[index].id); setLinePage(1); }}
          />
          <PaginationBar page={data?.page ?? page} totalPages={data?.total_pages ?? 1} total={data?.total ?? 0} onChange={setPage} />
        </div>
      </ConsoleSection>

      <ConsoleModal
        open={Boolean(selectedID)}
        title={settlementQuery.data ? settlementQuery.data.target_month + " 정산 상세" : "정산 상세"}
        size="xl"
        onClose={() => setSelectedID(undefined)}
      >
        {settlementQuery.data ? (
          <div className="grid gap-6">
            <DetailGrid>
              <DetailItem label="상태"><StatusBadge value={settlementQuery.data.status} /></DetailItem>
              <DetailItem label="총 매출">{formatPrice(settlementQuery.data.total_sales_amount)}</DetailItem>
              <DetailItem label="반품 배송비">{formatPrice(settlementQuery.data.total_return_shipping_fee)}</DetailItem>
              <DetailItem label="수수료">{formatPrice(settlementQuery.data.commission_amount)}</DetailItem>
              <DetailItem label="최종 정산">{formatPrice(settlementQuery.data.final_settlement_amount)}</DetailItem>
              <DetailItem label="지급 예정일">{dateTime(settlementQuery.data.payment_due_date)}</DetailItem>
              <DetailItem label="지급일">{dateTime(settlementQuery.data.paid_at)}</DetailItem>
              <DetailItem label="수정일">{dateTime(settlementQuery.data.updated_at)}</DetailItem>
            </DetailGrid>
            <section>
              <h3 className="mb-3 font-black">주문별 정산</h3>
              <ConsoleTable
                columns={["주문", "상품 / 옵션", "수량", "매출", "수수료", "최종 정산", "상태"]}
                rows={settlementQuery.data.lines.items.map((line) => [
                  line.order_code,
                  <div key="product"><p className="font-bold">{line.product_name}</p><p className="text-xs text-muted">{line.option_name}: {line.option_value}</p></div>,
                  String(line.quantity) + "개",
                  formatPrice(line.gross_amount),
                  formatPrice(line.commission_amount),
                  formatPrice(line.final_settlement_amount),
                  <StatusBadge key="status" value={line.status} />,
                ])}
              />
              <PaginationBar page={settlementQuery.data.lines.page} totalPages={settlementQuery.data.lines.total_pages} total={settlementQuery.data.lines.total} onChange={setLinePage} />
            </section>
          </div>
        ) : (
          <ModalLoading />
        )}
      </ConsoleModal>
    </SellerConsoleLayoutV2>
  );
}

export function SellerReviewsPageV2() {
  const { token, marketID, marketName } = useSellerConsoleContext();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [ratingX2, setRatingX2] = useState("");
  const [selectedID, setSelectedID] = useState<number>();
  const debouncedQuery = useDebouncedValue(query);

  const reviewsQuery = useQuery({
    queryKey: ["seller-reviews-v2", marketID, page, debouncedQuery, status, ratingX2],
    queryFn: () =>
      sellerConsoleApi.reviews(token ?? "", {
        market_id: marketID,
        page,
        page_size: 20,
        q: debouncedQuery || undefined,
        status: filterStatus(status),
        rating_x2: Number(ratingX2) || undefined,
      }),
    enabled: Boolean(token),
    meta: { consoleDataRole: "primary" },
  });
  const reviewQuery = useQuery({
    queryKey: ["seller-review-v2", marketID, selectedID],
    queryFn: () => sellerConsoleApi.review(token ?? "", selectedID ?? 0, marketID),
    enabled: Boolean(token && selectedID),
  });

  if (!token) return <SellerAuthRequiredV2 />;
  const data = reviewsQuery.data;
  const reviews = data?.items ?? [];

  return (
    <SellerConsoleLayoutV2 marketName={marketName}>
      <ConsoleHeader title="리뷰" description="사이드바에서 항상 접근할 수 있으며, 리뷰를 누르면 상품·주문·옵션 정보를 상세 조회합니다." />
      <ConsoleSection className="mt-5" title="리뷰 목록">
        <FilterPanel>
          <FilterField label="리뷰 검색">
            <input className={consoleInputClass} value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="상품명, 구매자, 내용" />
          </FilterField>
          <FilterField label="상태">
            <select className={consoleInputClass} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
              <option value="ALL">전체 상태</option>
              <option value="ACTIVE">노출</option>
              <option value="HIDE">숨김</option>
            </select>
          </FilterField>
          <FilterField label="평점">
            <select className={consoleInputClass} value={ratingX2} onChange={(event) => { setRatingX2(event.target.value); setPage(1); }}>
              <option value="">전체 평점</option>
              {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value / 2}점</option>)}
            </select>
          </FilterField>
        </FilterPanel>
        <div className="mt-4">
          <ConsoleTable
            columns={["상품", "구매자", "평점", "내용", "상태", "작성일"]}
            rows={reviews.map((review) => [
              <div key="product" className="flex min-w-0 items-center gap-3">
                <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-zinc-100"><SafeImage src={review.product_image_url} alt="" fill sizes="44px" className="object-cover" /></div>
                <p className="line-clamp-2 font-black">{review.product_name}</p>
              </div>,
              <span key="buyer" className="break-all">{review.buyer_email}</span>,
              <span key="rating" className="inline-flex items-center gap-1 font-black text-brand"><Star className="size-4 fill-brand" />{review.rating}</span>,
              <span key="content" className="line-clamp-2">{review.content_preview}</span>,
              <StatusBadge key="status" value={review.status} />,
              dateTime(review.created_at),
            ])}
            rowKeys={reviews.map((review) => review.id)}
            onRowClick={(index) => setSelectedID(reviews[index].id)}
          />
          <PaginationBar page={data?.page ?? page} totalPages={data?.total_pages ?? 1} total={data?.total ?? 0} onChange={setPage} />
        </div>
      </ConsoleSection>

      <ConsoleModal
        open={Boolean(selectedID)}
        title={reviewQuery.data ? reviewQuery.data.product_name + " 리뷰" : "리뷰 상세"}
        size="lg"
        onClose={() => setSelectedID(undefined)}
      >
        {reviewQuery.data ? (
          <div className="grid gap-5">
            <div className="grid gap-5 sm:grid-cols-[160px_minmax(0,1fr)]">
              <div className="relative aspect-square overflow-hidden rounded-xl bg-zinc-100">
                <SafeImage src={reviewQuery.data.product_image_url} alt={reviewQuery.data.product_name} fill sizes="160px" className="object-cover" />
              </div>
              <DetailGrid>
                <DetailItem label="상품">{reviewQuery.data.product_name} (#{reviewQuery.data.product_id})</DetailItem>
                <DetailItem label="옵션">{reviewQuery.data.option_name}: {reviewQuery.data.option_value}</DetailItem>
                <DetailItem label="구매자">{reviewQuery.data.buyer_email}</DetailItem>
                <DetailItem label="주문번호">{reviewQuery.data.order_code}</DetailItem>
                <DetailItem label="평점"><span className="inline-flex items-center gap-1 text-brand"><Star className="size-4 fill-brand" />{reviewQuery.data.rating}</span></DetailItem>
                <DetailItem label="상태"><StatusBadge value={reviewQuery.data.status} /></DetailItem>
                <DetailItem label="신체 정보">{reviewQuery.data.height_at_time ?? "-"}cm / {reviewQuery.data.weight_at_time ?? "-"}kg</DetailItem>
                <DetailItem label="작성일">{dateTime(reviewQuery.data.created_at)}</DetailItem>
              </DetailGrid>
            </div>
            <section>
              <h3 className="mb-2 font-black">리뷰 내용</h3>
              <p className="whitespace-pre-wrap rounded-xl bg-zinc-50 p-4 text-sm leading-7">{reviewQuery.data.content}</p>
            </section>
          </div>
        ) : (
          <ModalLoading />
        )}
      </ConsoleModal>
    </SellerConsoleLayoutV2>
  );
}
