"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminConsoleApi } from "@/lib/admin-console-api";
import { formatPrice } from "@/lib/utils";
import { AdminAuthRequired, adminLinks, useAdminToken } from "./admin-console";
import {
  ConsoleHeader,
  ConsoleLayout,
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
import { Button } from "./ui/button";

function filterValue(value: string) {
  return value === "ALL" ? undefined : value;
}

function numericFilter(value: string) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : undefined;
}

function dateTime(value?: string) {
  return value ? new Date(value).toLocaleString("ko-KR") : "-";
}

export function AdminProductsPageV2() {
  const token = useAdminToken();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [marketID, setMarketID] = useState("");
  const [categoryID, setCategoryID] = useState("");
  const [selectedID, setSelectedID] = useState<number>();
  const debouncedQuery = useDebouncedValue(query);

  const productsQuery = useQuery({
    queryKey: ["admin-products-v2", page, debouncedQuery, status, marketID, categoryID],
    queryFn: () =>
      adminConsoleApi.products(token ?? "", {
        page,
        page_size: 20,
        q: debouncedQuery || undefined,
        status: filterValue(status),
        market_id: numericFilter(marketID),
        category_id: numericFilter(categoryID),
      }),
    enabled: Boolean(token),
    meta: { consoleDataRole: "primary" },
  });
  const productQuery = useQuery({
    queryKey: ["admin-product-v2", selectedID],
    queryFn: () => adminConsoleApi.product(token ?? "", selectedID ?? 0),
    enabled: Boolean(token && selectedID),
  });

  if (!token) return <AdminAuthRequired />;
  const data = productsQuery.data;
  const products = data?.items ?? [];

  return (
    <ConsoleLayout title="Admin" subtitle="플랫폼 운영 콘솔" links={adminLinks}>
      <ConsoleHeader
        title="상품 관리"
        description="카드가 무한히 늘어나는 화면 대신, 서버 필터·페이지 단위 목록과 별도 상세 모달로 정리했습니다."
      />
      <ConsoleSection className="mt-5" title="상품 목록" description="목록은 핵심 정보만 표시하고, 상품을 누르면 옵션과 이미지를 추가 조회합니다.">
        <FilterPanel>
          <FilterField label="상품 검색">
            <input
              className={consoleInputClass}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="상품명 또는 마켓명"
            />
          </FilterField>
          <FilterField label="상태">
            <select
              className={consoleInputClass}
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">전체 상태</option>
              <option value="SELLING">판매중</option>
              <option value="SOLD_OUT">품절</option>
              <option value="HIDE">숨김</option>
              <option value="PENDING">검수 대기</option>
            </select>
          </FilterField>
          <FilterField label="마켓 번호">
            <input
              className={consoleInputClass}
              inputMode="numeric"
              value={marketID}
              onChange={(event) => {
                setMarketID(event.target.value);
                setPage(1);
              }}
              placeholder="전체"
            />
          </FilterField>
          <FilterField label="카테고리 번호">
            <input
              className={consoleInputClass}
              inputMode="numeric"
              value={categoryID}
              onChange={(event) => {
                setCategoryID(event.target.value);
                setPage(1);
              }}
              placeholder="전체"
            />
          </FilterField>
        </FilterPanel>
        <div className="mt-4">
          <ConsoleTable
            columns={["상품", "마켓 / 카테고리", "판매가", "가용 재고", "상태"]}
            rows={products.map((product) => [
              <div key="product" className="flex min-w-0 items-center gap-3">
                <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                  <SafeImage src={product.image_url} alt="" fill sizes="48px" className="object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-2 font-black">{product.name}</p>
                  <p className="text-xs text-muted">#{product.id}</p>
                </div>
              </div>,
              <div key="owner">
                <p className="font-bold">{product.market_name}</p>
                <p className="text-xs text-muted">{product.category_name}</p>
              </div>,
              <div key="price">
                {product.discount_price > 0 ? (
                  <p className="text-xs text-muted line-through">{formatPrice(product.base_price)}</p>
                ) : null}
                <p className="font-black">{formatPrice(product.discount_price || product.base_price)}</p>
              </div>,
              product.available_quantity.toLocaleString("ko-KR"),
              <StatusBadge key="status" value={product.status} />,
            ])}
            rowKeys={products.map((product) => product.id)}
            onRowClick={(index) => setSelectedID(products[index].id)}
          />
          <PaginationBar
            page={data?.page ?? page}
            totalPages={data?.total_pages ?? 1}
            total={data?.total ?? 0}
            onChange={setPage}
          />
        </div>
      </ConsoleSection>

      <ConsoleModal
        open={Boolean(selectedID)}
        title={productQuery.data?.name ?? "상품 상세"}
        description={selectedID ? `상품 #${selectedID}` : undefined}
        size="xl"
        onClose={() => setSelectedID(undefined)}
      >
        {productQuery.data ? (
          <div className="grid gap-6">
            <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
              <div className="relative aspect-square overflow-hidden rounded-xl bg-zinc-100">
                <SafeImage src={productQuery.data.image_url} alt={productQuery.data.name} fill sizes="220px" className="object-cover" />
              </div>
              <DetailGrid>
                <DetailItem label="마켓">{productQuery.data.market_name}</DetailItem>
                <DetailItem label="카테고리">{productQuery.data.category_name}</DetailItem>
                <DetailItem label="판매 상태"><StatusBadge value={productQuery.data.status} /></DetailItem>
                <DetailItem label="배송 유형">{productQuery.data.shipping_type}</DetailItem>
                <DetailItem label="정가">{formatPrice(productQuery.data.base_price)}</DetailItem>
                <DetailItem label="할인가">{productQuery.data.discount_price ? formatPrice(productQuery.data.discount_price) : "-"}</DetailItem>
                <DetailItem label="태그">{productQuery.data.tags.join(", ") || "-"}</DetailItem>
                <DetailItem label="등록일">{dateTime(productQuery.data.created_at)}</DetailItem>
              </DetailGrid>
            </div>
            <section>
              <h3 className="mb-2 font-black">요약 설명</h3>
              <p className="whitespace-pre-wrap rounded-xl bg-zinc-50 p-4 text-sm leading-6">{productQuery.data.summary_description || "-"}</p>
            </section>
            <section>
              <h3 className="mb-2 font-black">상품 상세</h3>
              <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl border border-line p-4 text-sm leading-6">
                {productQuery.data.description || "-"}
              </div>
            </section>
            <section>
              <h3 className="mb-3 font-black">옵션</h3>
              <ConsoleTable
                columns={["옵션", "추가 금액", "재고", "예약", "가용", "사용"]}
                rows={productQuery.data.options.map((option) => [
                  `${option.option_name}: ${option.option_value}`,
                  formatPrice(option.additional_price),
                  option.quantity.toLocaleString("ko-KR"),
                  option.reserved_quantity.toLocaleString("ko-KR"),
                  option.available_quantity.toLocaleString("ko-KR"),
                  option.is_active ? "사용" : "중지",
                ])}
              />
            </section>
          </div>
        ) : (
          <ModalLoading />
        )}
      </ConsoleModal>
    </ConsoleLayout>
  );
}

export function AdminOrdersPageV2() {
  const token = useAdminToken();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [marketID, setMarketID] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedCode, setSelectedCode] = useState<string>();
  const debouncedQuery = useDebouncedValue(query);

  const ordersQuery = useQuery({
    queryKey: ["admin-orders-v2", page, debouncedQuery, status, marketID, from, to],
    queryFn: () =>
      adminConsoleApi.orders(token ?? "", {
        page,
        page_size: 20,
        q: debouncedQuery || undefined,
        status: filterValue(status),
        market_id: numericFilter(marketID),
        from: from || undefined,
        to: to || undefined,
      }),
    enabled: Boolean(token),
    meta: { consoleDataRole: "primary" },
  });
  const orderQuery = useQuery({
    queryKey: ["admin-order-v2", selectedCode],
    queryFn: () => adminConsoleApi.order(token ?? "", selectedCode ?? ""),
    enabled: Boolean(token && selectedCode),
  });
  const cancelMutation = useMutation({
    mutationFn: () => adminConsoleApi.cancelOrder(token ?? "", selectedCode ?? ""),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-orders-v2"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-order-v2", selectedCode] }),
      ]);
    },
  });

  if (!token) return <AdminAuthRequired />;
  const data = ordersQuery.data;
  const orders = data?.items ?? [];

  return (
    <ConsoleLayout title="Admin" subtitle="플랫폼 운영 콘솔" links={adminLinks}>
      <ConsoleHeader title="주문 관리" description="주문번호·구매자·마켓·날짜·상태 필터를 서버에서 처리합니다." />
      <ConsoleSection className="mt-5" title="주문 목록" description="목록을 누르면 구매자, 마켓별 주문, 배송지와 상품 내역을 상세 조회합니다.">
        <FilterPanel>
          <FilterField label="주문 검색">
            <input className={consoleInputClass} value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="주문번호 또는 이메일" />
          </FilterField>
          <FilterField label="상태">
            <select className={consoleInputClass} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
              <option value="ALL">전체 상태</option>
              <option value="PLACED">주문 접수</option>
              <option value="PAYMENT_PENDING">결제 대기</option>
              <option value="PAID">결제 완료</option>
              <option value="SHIPPED">배송중</option>
              <option value="DELIVERED">배송 완료</option>
              <option value="COMPLETED">구매 확정</option>
              <option value="RETURN_REQUESTED">반품 요청</option>
              <option value="RETURN_APPROVED">반품 승인</option>
              <option value="RETURN_REJECTED">반품 거절</option>
              <option value="RETURN_COMPLETED">반품 완료</option>
              <option value="CANCELLED">취소</option>
            </select>
          </FilterField>
          <FilterField label="마켓 번호">
            <input className={consoleInputClass} inputMode="numeric" value={marketID} onChange={(event) => { setMarketID(event.target.value); setPage(1); }} placeholder="전체" />
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
            columns={["주문번호", "구매자", "결제 금액", "마켓 / 상품", "상태", "주문일"]}
            rows={orders.map((order) => [
              <span key="code" className="font-black">{order.order_code}</span>,
              <span key="buyer" className="break-all">{order.buyer_email}</span>,
              formatPrice(order.total_order_price - order.discount_amount),
              `${order.market_count}개 마켓 / ${order.item_count}개 상품`,
              <StatusBadge key="status" value={order.status} />,
              dateTime(order.created_at),
            ])}
            rowKeys={orders.map((order) => order.id)}
            onRowClick={(index) => setSelectedCode(orders[index].order_code)}
          />
          <PaginationBar page={data?.page ?? page} totalPages={data?.total_pages ?? 1} total={data?.total ?? 0} onChange={setPage} />
        </div>
      </ConsoleSection>

      <ConsoleModal
        open={Boolean(selectedCode)}
        title={selectedCode ? `주문 ${selectedCode}` : "주문 상세"}
        size="xl"
        onClose={() => setSelectedCode(undefined)}
        footer={
          orderQuery.data && !["CANCELLED", "COMPLETED"].includes(orderQuery.data.status) ? (
            <Button type="button" variant="secondary" disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate()}>
              주문 취소
            </Button>
          ) : undefined
        }
      >
        {orderQuery.data ? (
          <div className="grid gap-6">
            <DetailGrid>
              <DetailItem label="구매자">{orderQuery.data.buyer.email}</DetailItem>
              <DetailItem label="주문 상태"><StatusBadge value={orderQuery.data.status} /></DetailItem>
              <DetailItem label="주문 금액">{formatPrice(orderQuery.data.total_order_price)}</DetailItem>
              <DetailItem label="총 할인">{formatPrice(orderQuery.data.total_discount_price)}</DetailItem>
              <DetailItem label="사용 포인트">{formatPrice(orderQuery.data.used_point)}</DetailItem>
              <DetailItem label="결제 수단">{orderQuery.data.payment_method}</DetailItem>
              <DetailItem label="주문일">{dateTime(orderQuery.data.created_at)}</DetailItem>
              <DetailItem label="수정일">{dateTime(orderQuery.data.updated_at)}</DetailItem>
            </DetailGrid>
            {orderQuery.data.delivery ? (
              <section>
                <h3 className="mb-3 font-black">배송 정보</h3>
                <DetailGrid>
                  <DetailItem label="수령인">{orderQuery.data.delivery.receiver_name}</DetailItem>
                  <DetailItem label="연락처">{orderQuery.data.delivery.receiver_phone}</DetailItem>
                  <DetailItem label="주소">{orderQuery.data.delivery.address}</DetailItem>
                  <DetailItem label="배송 상태"><StatusBadge value={orderQuery.data.delivery.status} /></DetailItem>
                  <DetailItem label="택배사">{orderQuery.data.delivery.carrier}</DetailItem>
                  <DetailItem label="송장번호">{orderQuery.data.delivery.tracking_number}</DetailItem>
                </DetailGrid>
              </section>
            ) : null}
            {orderQuery.data.market_orders.map((marketOrder) => (
              <section key={marketOrder.id} className="rounded-xl border border-line p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-black">{marketOrder.market_name}</h3>
                    <p className="mt-1 text-xs text-muted">배송비 {formatPrice(marketOrder.shipping_fee)} · 예상 정산 {formatPrice(marketOrder.expected_settlement_amount)}</p>
                    {marketOrder.shipping_package ? (
                      <p className="mt-1 text-xs text-muted">
                        {marketOrder.shipping_package.carrier || "택배사 미지정"} · {marketOrder.shipping_package.tracking_number || "송장 미등록"} · {marketOrder.shipping_package.status}
                      </p>
                    ) : null}
                  </div>
                  <StatusBadge value={marketOrder.status} />
                </div>
                <ConsoleTable
                  columns={["상품", "옵션", "수량", "판매가", "할인", "상태"]}
                  rows={marketOrder.items.map((item) => [
                    item.product_name,
                    `${item.option_name}: ${item.option_value}`,
                    `${item.quantity}개`,
                    formatPrice(item.price),
                    formatPrice(item.discount_amount),
                    <StatusBadge key="status" value={item.status} />,
                  ])}
                />
              </section>
            ))}
          </div>
        ) : (
          <ModalLoading />
        )}
      </ConsoleModal>
    </ConsoleLayout>
  );
}

export function AdminSettlementsPageV2() {
  const token = useAdminToken();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [targetMonth, setTargetMonth] = useState("");
  const [marketID, setMarketID] = useState("");
  const [selectedID, setSelectedID] = useState<number>();
  const [linePage, setLinePage] = useState(1);
  const debouncedQuery = useDebouncedValue(query);

  const settlementsQuery = useQuery({
    queryKey: ["admin-settlements-v2", page, debouncedQuery, status, targetMonth, marketID],
    queryFn: () =>
      adminConsoleApi.settlements(token ?? "", {
        page,
        page_size: 20,
        q: debouncedQuery || undefined,
        status: filterValue(status),
        target_month: targetMonth || undefined,
        market_id: numericFilter(marketID),
      }),
    enabled: Boolean(token),
    meta: { consoleDataRole: "primary" },
  });
  const settlementQuery = useQuery({
    queryKey: ["admin-settlement-v2", selectedID, linePage],
    queryFn: () => adminConsoleApi.settlement(token ?? "", selectedID ?? 0, linePage),
    enabled: Boolean(token && selectedID),
  });
  const paidMutation = useMutation({
    mutationFn: () => adminConsoleApi.markSettlementPaid(token ?? "", selectedID ?? 0),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-settlements-v2"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-settlement-v2", selectedID] }),
      ]);
    },
  });

  if (!token) return <AdminAuthRequired />;
  const data = settlementsQuery.data;
  const settlements = data?.items ?? [];

  return (
    <ConsoleLayout title="Admin" subtitle="플랫폼 운영 콘솔" links={adminLinks}>
      <ConsoleHeader title="정산 관리" description="정산 목록과 주문별 정산 라인을 분리하고, 월·마켓·상태 조건을 서버에서 처리합니다." />
      <ConsoleSection className="mt-5" title="정산 목록">
        <FilterPanel>
          <FilterField label="마켓 검색">
            <input className={consoleInputClass} value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="마켓명" />
          </FilterField>
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
          <FilterField label="마켓 번호">
            <input className={consoleInputClass} inputMode="numeric" value={marketID} onChange={(event) => { setMarketID(event.target.value); setPage(1); }} placeholder="전체" />
          </FilterField>
        </FilterPanel>
        <div className="mt-4">
          <ConsoleTable
            columns={["마켓", "정산월", "매출", "수수료", "최종 정산", "상태"]}
            rows={settlements.map((settlement) => [
              <div key="market">
                <p className="font-black">{settlement.market_name}</p>
                <p className="text-xs text-muted">#{settlement.market_id}</p>
              </div>,
              settlement.target_month,
              formatPrice(settlement.total_sales_amount),
              formatPrice(settlement.commission_amount),
              <span key="amount" className="font-black">{formatPrice(settlement.final_settlement_amount)}</span>,
              <StatusBadge key="status" value={settlement.status} />,
            ])}
            rowKeys={settlements.map((settlement) => settlement.id)}
            onRowClick={(index) => {
              setSelectedID(settlements[index].id);
              setLinePage(1);
            }}
          />
          <PaginationBar page={data?.page ?? page} totalPages={data?.total_pages ?? 1} total={data?.total ?? 0} onChange={setPage} />
        </div>
      </ConsoleSection>

      <ConsoleModal
        open={Boolean(selectedID)}
        title={settlementQuery.data ? `${settlementQuery.data.market_name} ${settlementQuery.data.target_month} 정산` : "정산 상세"}
        size="xl"
        onClose={() => setSelectedID(undefined)}
        footer={
          settlementQuery.data && settlementQuery.data.status !== "PAID" ? (
            <Button type="button" disabled={paidMutation.isPending} onClick={() => paidMutation.mutate()}>지급 완료 처리</Button>
          ) : undefined
        }
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
              <h3 className="mb-3 font-black">주문별 정산 내역</h3>
              <ConsoleTable
                columns={["주문", "상품 / 옵션", "수량", "매출", "수수료", "최종 정산", "상태"]}
                rows={settlementQuery.data.lines.items.map((line) => [
                  line.order_code,
                  <div key="product"><p className="font-bold">{line.product_name}</p><p className="text-xs text-muted">{line.option_name}: {line.option_value}</p></div>,
                  `${line.quantity}개`,
                  formatPrice(line.gross_amount),
                  formatPrice(line.commission_amount),
                  formatPrice(line.final_settlement_amount),
                  <StatusBadge key="status" value={line.status} />,
                ])}
              />
              <PaginationBar
                page={settlementQuery.data.lines.page}
                totalPages={settlementQuery.data.lines.total_pages}
                total={settlementQuery.data.lines.total}
                onChange={setLinePage}
              />
            </section>
          </div>
        ) : (
          <ModalLoading />
        )}
      </ConsoleModal>
    </ConsoleLayout>
  );
}
