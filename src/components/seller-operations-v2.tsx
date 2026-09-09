"use client";

import { Input, Select } from "./ui/input";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-client";
import { sellerConsoleApi } from "@/lib/seller-console-api";
import { paymentMethodLabel } from "@/lib/display-labels";
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
  ModalQueryState,
  PaginationBar,
  consoleInputClass,
  consoleUrlValue,
  useConsoleConfirm,
  useConsoleUrlFilters,
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
  const confirmation = useConsoleConfirm();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(() => Number(consoleUrlValue(searchParams, "page", "1")) || 1);
  const [query, setQuery] = useState(() => consoleUrlValue(searchParams, "q"));
  const [status, setStatus] = useState(() => consoleUrlValue(searchParams, "status", "ALL"));
  const [from, setFrom] = useState(() => consoleUrlValue(searchParams, "from"));
  const [to, setTo] = useState(() => consoleUrlValue(searchParams, "to"));
  const [selectedCode, setSelectedCode] = useState<string>();
  const [carrier, setCarrier] = useState("");
  const [invoice, setInvoice] = useState("");
  const [shipmentEditing, setShipmentEditing] = useState(false);
  const [operationResolution, setOperationResolution] = useState<string>();
  const debouncedQuery = useDebouncedValue(query);
  useConsoleUrlFilters({ page, q: query, status, from, to }, (next) => {
    setPage(Number(consoleUrlValue(next, "page", "1")) || 1);
    setQuery(consoleUrlValue(next, "q"));
    setStatus(consoleUrlValue(next, "status", "ALL"));
    setFrom(consoleUrlValue(next, "from"));
    setTo(consoleUrlValue(next, "to"));
  });

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
    if (shipmentEditing) return;
    const timer = window.setTimeout(() => {
      setCarrier(orderQuery.data?.delivery?.carrier ?? "");
      setInvoice(orderQuery.data?.delivery?.tracking_number ?? "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [orderQuery.data, shipmentEditing]);

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
    onSuccess: async () => {
      setShipmentEditing(false);
      setOperationResolution("송장 정보를 등록했습니다.");
      await refreshOrder();
    },
  });
  const completeDelivery = useMutation({
    mutationFn: () => {
      if (!marketID || !orderQuery.data?.delivery?.id) {
        throw new Error("배송 정보를 확인해 주세요.");
      }
      return api.completeSellerPackage(token ?? "", marketID, orderQuery.data.delivery.id);
    },
    onSuccess: async () => {
      setShipmentEditing(false);
      setOperationResolution("배송 완료 처리를 반영했습니다.");
      await refreshOrder();
    },
  });

  if (!token) return <SellerAuthRequiredV2 />;
  const data = ordersQuery.data;
  const orders = data?.items ?? [];
  const order = orderQuery.data;
  const deliveryStatus = order?.delivery?.status ?? order?.status ?? "PENDING";
  const shippingPending =
    registerInvoice.isPending || completeDelivery.isPending;
  const shipmentFieldsEditable = !["SHIPPING", "SHIPPED", "DELIVERED", "COMPLETED", "CANCELLED"].includes(deliveryStatus);

  let orderAction = null;
  if (order && !["DELIVERED", "COMPLETED", "CANCELLED"].includes(deliveryStatus)) {
    if (!order.delivery?.id || deliveryStatus === "PENDING") {
      orderAction = <Button type="button" disabled={shippingPending || !carrier || !invoice.trim()} onClick={() => confirmation.ask({ title: "송장 등록", message: `택배사 ${carrier}, 송장번호 ${invoice.trim()}로 배송을 시작할까요?`, confirmLabel: "송장 등록" }, () => registerInvoice.mutate())}>송장 등록</Button>;
    } else if (["SHIPPING", "SHIPPED"].includes(deliveryStatus)) {
      orderAction = <Button type="button" disabled={shippingPending} onClick={() => confirmation.ask({ title: "배송 완료 처리", message: "이 주문을 배송 완료로 처리할까요?", confirmLabel: "배송 완료" }, () => completeDelivery.mutate())}>배송 완료</Button>;
    }
  }

  return (
    <SellerConsoleLayoutV2 marketName={marketName}>
      <ConsoleHeader
        title="주문/배송"
        description="주문번호, 상품명, 구매자, 날짜, 상태로 주문을 찾고 배송 정보를 관리합니다."
      />
      <ConsoleSection className="mt-5" title="주문 목록" description="주문을 누르면 상품, 구매자, 배송 정보와 처리 버튼을 확인할 수 있습니다.">
        <FilterPanel>
          <FilterField label="주문 검색">
            <Input className={consoleInputClass} value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="주문번호, 상품명, 구매자" />
          </FilterField>
          <FilterField label="상태">
            <Select className={consoleInputClass} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
              <option value="ALL">전체 상태</option>
              <option value="PAYMENT_PENDING">결제 대기</option>
              <option value="PAID">출고 대기</option>
              <option value="PLACED">주문 접수</option>
              <option value="SHIPPED">배송중</option>
              <option value="DELIVERED">배송 완료</option>
              <option value="COMPLETED">구매 확정</option>
              <option value="RETURN_REQUESTED">반품 요청</option>
              <option value="RETURN_APPROVED">반품 승인</option>
              <option value="RETURN_REJECTED">반품 거절</option>
              <option value="RETURN_COMPLETED">반품 완료</option>
              <option value="CANCELLED">취소</option>
            </Select>
          </FilterField>
          <FilterField label="시작일">
            <Input className={consoleInputClass} type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} />
          </FilterField>
          <FilterField label="종료일">
            <Input className={consoleInputClass} type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} />
          </FilterField>
        </FilterPanel>
        <div className="mt-4">
          <ConsoleTable
            columns={["주문번호", "구매자", "대표 상품", "결제 금액", "정산 예정", "상태", "주문일"]}
            loading={ordersQuery.isLoading}
            emptyText={query || status !== "ALL" || from || to ? "검색 조건에 맞는 주문이 없습니다." : "처리할 주문이 없습니다."}
            rows={orders.map((item) => [
              <span key="code" className="font-bold">{item.order_code}</span>,
              <span key="buyer" className="break-all">{item.buyer_email}</span>,
              item.representative_product + (item.item_count > 1 ? " 외 " + String(item.item_count - 1) + "건" : ""),
              formatPrice(item.market_total_amount),
              formatPrice(item.expected_settlement_amount),
              <StatusBadge key="status" value={item.delivery_status ?? item.status} />,
              dateTime(item.created_at),
            ])}
            rowKeys={orders.map((item) => item.market_order_id)}
            onRowClick={(index) => {
              registerInvoice.reset();
              completeDelivery.reset();
              setShipmentEditing(false);
              setOperationResolution(undefined);
              setSelectedCode(orders[index].order_code);
            }}
          />
          <PaginationBar page={data?.page ?? page} totalPages={data?.total_pages ?? 1} total={data?.total ?? 0} onChange={setPage} />
        </div>
      </ConsoleSection>

      <ConsoleModal
        open={Boolean(selectedCode)}
        title={selectedCode ? "주문 " + selectedCode : "주문 상세"}
        size="xl"
        onClose={() => {
          if (shippingPending) return;
          const dirty = shipmentEditing && order?.delivery && (carrier !== (order.delivery.carrier ?? "") || invoice !== (order.delivery.tracking_number ?? ""));
          if (dirty) {
            confirmation.ask({ title: "주문 상세 닫기", message: "저장하지 않은 배송 정보를 버릴까요?", confirmLabel: "변경 버리기", danger: true }, () => {
              registerInvoice.reset();
              completeDelivery.reset();
              setShipmentEditing(false);
              setSelectedCode(undefined);
            });
            return;
          }
          registerInvoice.reset();
          completeDelivery.reset();
          setShipmentEditing(false);
          setSelectedCode(undefined);
        }}
        footer={orderAction}
      >
        {order ? (
          <div className="grid gap-6">
            {registerInvoice.error || completeDelivery.error ? <p className="rounded-md border border-status-negative/30 bg-status-negative-subtle px-3 py-2 text-sm font-bold text-status-negative" role="alert">{apiErrorMessage(registerInvoice.error ?? completeDelivery.error)}</p> : null}
            {operationResolution ? <p className="rounded-md bg-status-positive-subtle px-3 py-2 text-sm font-bold text-status-positive" role="status">{operationResolution}</p> : null}
            <DetailGrid>
              <DetailItem label="구매자">{order.buyer_email}</DetailItem>
              <DetailItem label="주문 상태"><StatusBadge value={order.status} /></DetailItem>
              <DetailItem label="마켓 결제 금액">{formatPrice(order.market_total_amount)}</DetailItem>
              <DetailItem label="배송비">{formatPrice(order.shipping_fee)}</DetailItem>
              <DetailItem label="예상 정산">{formatPrice(order.expected_settlement_amount)}</DetailItem>
              <DetailItem label="결제 수단">{paymentMethodLabel(order.payment_method)}</DetailItem>
              <DetailItem label="주문일">{dateTime(order.created_at)}</DetailItem>
              <DetailItem label="수정일">{dateTime(order.updated_at)}</DetailItem>
            </DetailGrid>
            <section>
              <h3 className="mb-3 font-bold">배송 정보</h3>
              <div className="grid gap-3 rounded-xl bg-surface-subtle p-4 sm:grid-cols-2">
                {!shipmentFieldsEditable ? <p className="sm:col-span-2 rounded-md border border-border-subtle bg-surface-raised px-3 py-2 text-xs font-bold text-content-secondary">배송이 시작된 주문은 택배사와 송장번호를 조회만 할 수 있습니다.</p> : null}
                <FilterField label="택배사">
                  <Select className={consoleInputClass} value={carrier} onChange={(event) => { setShipmentEditing(true); setOperationResolution(undefined); if (!shippingPending) registerInvoice.reset(); setCarrier(event.target.value); }} disabled={!shipmentFieldsEditable || shippingPending}>
                    <option value="">택배사 선택</option>
                    {(carriersQuery.data?.carriers ?? []).map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
                  </Select>
                </FilterField>
                <FilterField label="송장번호">
                  <Input className={consoleInputClass} value={invoice} onChange={(event) => { setShipmentEditing(true); setOperationResolution(undefined); if (!shippingPending) registerInvoice.reset(); setInvoice(event.target.value); }} placeholder="송장번호" disabled={!shipmentFieldsEditable || shippingPending} />
                </FilterField>
                <DetailItem label="배송 상태"><StatusBadge value={deliveryStatus} /></DetailItem>
                <DetailItem label="수령인">{order.delivery?.receiver_name}</DetailItem>
                <DetailItem label="연락처">{order.delivery?.receiver_phone}</DetailItem>
                <DetailItem label="주소">{order.delivery?.address}</DetailItem>
              </div>
            </section>
            <section>
              <h3 className="mb-3 font-bold">주문 상품</h3>
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
          <ModalQueryState isLoading={orderQuery.isLoading} error={orderQuery.error} onRetry={() => void orderQuery.refetch()} />
        )}
      </ConsoleModal>
      {confirmation.dialog}
    </SellerConsoleLayoutV2>
  );
}

export function SellerSettlementsPageV2() {
  const { token, marketID, marketName } = useSellerConsoleContext();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(() => Number(consoleUrlValue(searchParams, "page", "1")) || 1);
  const [status, setStatus] = useState(() => consoleUrlValue(searchParams, "status", "ALL"));
  const [targetMonth, setTargetMonth] = useState(() => consoleUrlValue(searchParams, "month"));
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
  useConsoleUrlFilters({ page, status, month: targetMonth }, (next) => {
    setPage(Number(consoleUrlValue(next, "page", "1")) || 1);
    setStatus(consoleUrlValue(next, "status", "ALL"));
    setTargetMonth(consoleUrlValue(next, "month"));
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
      <ConsoleHeader title="정산" description="정산월과 상태로 지급 내역을 찾고 주문별 금액을 확인할 수 있습니다." />
      <ConsoleSection className="mt-5" title="정산 목록">
        <FilterPanel>
          <FilterField label="상태">
            <Select className={consoleInputClass} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
              <option value="ALL">전체 상태</option>
              <option value="PREPARED">지급 대기</option>
              <option value="CONFIRMED">지급 확정</option>
              <option value="PAID">지급 완료</option>
              <option value="EXCLUDED">정산 제외</option>
            </Select>
          </FilterField>
          <FilterField label="정산월">
            <Input className={consoleInputClass} type="month" value={targetMonth} onChange={(event) => { setTargetMonth(event.target.value); setPage(1); }} />
          </FilterField>
        </FilterPanel>
        <div className="mt-4">
          <ConsoleTable
            columns={["정산월", "매출", "수수료", "최종 정산", "지급 예정일", "상태"]}
            loading={settlementsQuery.isLoading}
            emptyText={status !== "ALL" || targetMonth ? "검색 조건에 맞는 정산이 없습니다." : "등록된 정산이 없습니다."}
            rows={settlements.map((item) => [
              <span key="month" className="font-bold">{item.target_month}</span>,
              formatPrice(item.total_sales_amount),
              formatPrice(item.commission_amount),
              <span key="amount" className="font-bold">{formatPrice(item.final_settlement_amount)}</span>,
              dateTime(item.payment_due_date),
              <StatusBadge context="settlement" key="status" value={item.status} />,
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
              <DetailItem label="상태"><StatusBadge context="settlement" value={settlementQuery.data.status} /></DetailItem>
              <DetailItem label="총 매출">{formatPrice(settlementQuery.data.total_sales_amount)}</DetailItem>
              <DetailItem label="반품 배송비">{formatPrice(settlementQuery.data.total_return_shipping_fee)}</DetailItem>
              <DetailItem label="수수료">{formatPrice(settlementQuery.data.commission_amount)}</DetailItem>
              <DetailItem label="최종 정산">{formatPrice(settlementQuery.data.final_settlement_amount)}</DetailItem>
              <DetailItem label="지급 예정일">{dateTime(settlementQuery.data.payment_due_date)}</DetailItem>
              <DetailItem label="지급일">{dateTime(settlementQuery.data.paid_at)}</DetailItem>
              <DetailItem label="수정일">{dateTime(settlementQuery.data.updated_at)}</DetailItem>
            </DetailGrid>
            <section>
              <h3 className="mb-3 font-bold">주문별 정산</h3>
              <ConsoleTable
                columns={["주문", "상품 / 옵션", "수량", "매출", "수수료", "최종 정산", "상태"]}
                rows={settlementQuery.data.lines.items.map((line) => [
                  line.order_code,
                  <div key="product"><p className="font-bold">{line.product_name}</p><p className="text-xs text-content-secondary">{line.option_name}: {line.option_value}</p></div>,
                  String(line.quantity) + "개",
                  formatPrice(line.gross_amount),
                  formatPrice(line.commission_amount),
                  formatPrice(line.final_settlement_amount),
                  <StatusBadge context="settlement" key="status" value={line.status} />,
                ])}
              />
              <PaginationBar page={settlementQuery.data.lines.page} totalPages={settlementQuery.data.lines.total_pages} total={settlementQuery.data.lines.total} onChange={setLinePage} />
            </section>
          </div>
        ) : (
          <ModalQueryState isLoading={settlementQuery.isLoading} error={settlementQuery.error} onRetry={() => void settlementQuery.refetch()} />
        )}
      </ConsoleModal>
    </SellerConsoleLayoutV2>
  );
}

export function SellerReviewsPageV2() {
  const { token, marketID, marketName } = useSellerConsoleContext();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(() => Number(consoleUrlValue(searchParams, "page", "1")) || 1);
  const [query, setQuery] = useState(() => consoleUrlValue(searchParams, "q"));
  const [status, setStatus] = useState(() => consoleUrlValue(searchParams, "status", "ALL"));
  const [ratingX2, setRatingX2] = useState(() => consoleUrlValue(searchParams, "rating"));
  const [selectedID, setSelectedID] = useState<number>();
  const debouncedQuery = useDebouncedValue(query);
  useConsoleUrlFilters({ page, q: query, status, rating: ratingX2 }, (next) => {
    setPage(Number(consoleUrlValue(next, "page", "1")) || 1);
    setQuery(consoleUrlValue(next, "q"));
    setStatus(consoleUrlValue(next, "status", "ALL"));
    setRatingX2(consoleUrlValue(next, "rating"));
  });

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
      <ConsoleHeader title="리뷰" description="상품명, 구매자, 내용으로 리뷰를 찾고 상품·주문·옵션 정보를 확인할 수 있습니다." />
      <ConsoleSection className="mt-5" title="리뷰 목록">
        <FilterPanel>
          <FilterField label="리뷰 검색">
            <Input className={consoleInputClass} value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="상품명, 구매자, 내용" />
          </FilterField>
          <FilterField label="상태">
            <Select className={consoleInputClass} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
              <option value="ALL">전체 상태</option>
              <option value="ACTIVE">노출</option>
              <option value="HIDE">숨김</option>
            </Select>
          </FilterField>
          <FilterField label="평점">
            <Select className={consoleInputClass} value={ratingX2} onChange={(event) => { setRatingX2(event.target.value); setPage(1); }}>
              <option value="">전체 평점</option>
              {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value / 2}점</option>)}
            </Select>
          </FilterField>
        </FilterPanel>
        <div className="mt-4">
          <ConsoleTable
            columns={["상품", "구매자", "평점", "내용", "상태", "작성일"]}
            loading={reviewsQuery.isLoading}
            emptyText={query || status !== "ALL" || ratingX2 ? "검색 조건에 맞는 리뷰가 없습니다." : "작성된 리뷰가 없습니다."}
            rows={reviews.map((review) => [
              <div key="product" className="flex min-w-0 items-center gap-3">
                <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-surface-subtle"><SafeImage src={review.product_image_url} alt="" fill sizes="44px" className="object-cover" /></div>
                <p className="line-clamp-2 font-bold">{review.product_name}</p>
              </div>,
              <span key="buyer" className="break-all">{review.buyer_email}</span>,
              <span key="rating" className="inline-flex items-center gap-1 font-bold text-action-primary"><Star className="size-4 fill-brand" />{review.rating}</span>,
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
              <div className="relative aspect-square overflow-hidden rounded-xl bg-surface-subtle">
                <SafeImage src={reviewQuery.data.product_image_url} alt={reviewQuery.data.product_name} fill sizes="160px" className="object-cover" />
              </div>
              <DetailGrid>
                <DetailItem label="상품">{reviewQuery.data.product_name} (#{reviewQuery.data.product_id})</DetailItem>
                <DetailItem label="옵션">{reviewQuery.data.option_name}: {reviewQuery.data.option_value}</DetailItem>
                <DetailItem label="구매자">{reviewQuery.data.buyer_email}</DetailItem>
                <DetailItem label="주문번호">{reviewQuery.data.order_code}</DetailItem>
                <DetailItem label="평점"><span className="inline-flex items-center gap-1 text-action-primary"><Star className="size-4 fill-brand" />{reviewQuery.data.rating}</span></DetailItem>
                <DetailItem label="상태"><StatusBadge value={reviewQuery.data.status} /></DetailItem>
                <DetailItem label="신체 정보">{reviewQuery.data.height_at_time ?? "-"}cm / {reviewQuery.data.weight_at_time ?? "-"}kg</DetailItem>
                <DetailItem label="작성일">{dateTime(reviewQuery.data.created_at)}</DetailItem>
              </DetailGrid>
            </div>
            <section>
              <h3 className="mb-2 font-bold">리뷰 내용</h3>
              <p className="whitespace-pre-wrap rounded-xl bg-surface-subtle p-4 text-sm leading-7">{reviewQuery.data.content}</p>
            </section>
          </div>
        ) : (
          <ModalQueryState isLoading={reviewQuery.isLoading} error={reviewQuery.error} onRetry={() => void reviewQuery.refetch()} />
        )}
      </ConsoleModal>
    </SellerConsoleLayoutV2>
  );
}
