"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  sellerConsoleApi,
  type SellerProductDetail,
  type SellerProductUpdate,
} from "@/lib/seller-console-api";
import type { CommerceCategory, Product } from "@/lib/types";
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

function statusFilter(value: string) {
  return value === "ALL" ? undefined : value;
}

function categoryLabel(category: CommerceCategory) {
  return category.name;
}

export function SellerHomePageV2() {
  const { token, marketID, marketName } = useSellerConsoleContext();
  const dashboardQuery = useQuery({
    queryKey: ["seller-dashboard-v2", marketID],
    queryFn: () => sellerConsoleApi.dashboard(token ?? "", marketID),
    enabled: Boolean(token),
    meta: { consoleDataRole: "primary" },
  });

  if (!token) return <SellerAuthRequiredV2 />;
  const dashboard = dashboardQuery.data;
  const metrics = dashboard?.metrics;
  const metricItems = [
    { label: "주문", value: metrics?.order_count ?? 0 },
    { label: "출고 대기", value: metrics?.ready_to_ship_count ?? 0 },
    { label: "배송중", value: metrics?.shipping_count ?? 0 },
    { label: "정산 대기", value: metrics?.pending_settlement_count ?? 0 },
    { label: "판매 상품", value: metrics?.selling_product_count ?? 0 },
  ];

  return (
    <SellerConsoleLayoutV2 marketName={marketName}>
      <ConsoleHeader title="셀러 홈" description="주문, 출고, 배송, 정산, 상품 현황을 한 줄에서 빠르게 확인합니다." />
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {metricItems.map((metric) => (
          <div key={metric.label} className="min-w-0 rounded-xl border border-line bg-white p-4">
            <p className="truncate text-xs font-black text-muted">{metric.label}</p>
            <p className="mt-2 text-2xl font-black">{metric.value.toLocaleString("ko-KR")}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <ConsoleSection title="처리 필요 작업" description="현재 마켓에 해당하는 작업만 표시합니다.">
          <div className="grid gap-3">
            {(dashboard?.tasks ?? []).map((task) => (
              <div key={task.id} className="rounded-xl bg-zinc-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-black">{task.title}</p>
                  <StatusBadge value={task.severity} />
                </div>
                <p className="mt-1 text-sm leading-6 text-muted">{task.description}</p>
              </div>
            ))}
            {!dashboard?.tasks.length ? (
              <p className="py-8 text-center text-sm font-bold text-muted">현재 처리할 작업이 없습니다.</p>
            ) : null}
          </div>
        </ConsoleSection>

        <ConsoleSection
          title="최근 주문 처리"
          description="가장 최근 주문 5건만 표시합니다."
          action={
            <Link className="text-sm font-black text-brand hover:underline" href="/seller/orders">
              더보기
            </Link>
          }
        >
          <ConsoleTable
            columns={["주문번호", "대표 상품", "상품 수", "상태", "주문일"]}
            rows={(dashboard?.recent_orders ?? []).slice(0, 5).map((order) => [
              <span key="code" className="font-black">{order.order_code}</span>,
              order.representative_product,
              String(order.item_count) + "개",
              <StatusBadge key="status" value={order.status} />,
              dateTime(order.created_at),
            ])}
          />
        </ConsoleSection>
      </div>
    </SellerConsoleLayoutV2>
  );
}

type ProductEditForm = {
  name: string;
  categoryID: string;
  basePrice: string;
  discountPrice: string;
  shippingType: string;
  status: string;
  summary: string;
  description: string;
  imageURL: string;
  options: Array<{ id: number; quantity: string; additionalPrice: string; isActive: boolean }>;
};

type ProductCreateForm = {
  name: string;
  categoryID: string;
  basePrice: string;
  discountPrice: string;
  shippingType: string;
  status: string;
  imageURL: string;
  summary: string;
  description: string;
  optionName: string;
  optionValue: string;
  optionQuantity: string;
};

function createEmptyProduct(): ProductCreateForm {
  return {
    name: "",
    categoryID: "",
    basePrice: "",
    discountPrice: "0",
    shippingType: "NORMAL",
    status: "SELLING",
    imageURL: "",
    summary: "",
    description: "",
    optionName: "",
    optionValue: "",
    optionQuantity: "0",
  };
}

function editFormFromProduct(product: SellerProductDetail): ProductEditForm {
  return {
    name: product.name,
    categoryID: String(product.category_id),
    basePrice: String(product.base_price),
    discountPrice: String(product.discount_price),
    shippingType: product.shipping_type,
    status: product.status,
    summary: product.summary_description,
    description: product.description,
    imageURL: product.image_url ?? "",
    options: product.options.map((option) => ({
      id: option.id,
      quantity: String(option.quantity),
      additionalPrice: String(option.additional_price),
      isActive: option.is_active,
    })),
  };
}

function productUpdatePayload(form: ProductEditForm): SellerProductUpdate {
  return {
    name: form.name.trim(),
    category_id: Number(form.categoryID),
    base_price: Math.max(0, Number(form.basePrice) || 0),
    discount_price: Math.max(0, Number(form.discountPrice) || 0),
    shipping_type: form.shippingType,
    status: form.status,
    summary_description: form.summary.trim(),
    description: form.description,
    image_url: form.imageURL.trim(),
    images: form.imageURL.trim()
      ? [{ url: form.imageURL.trim(), alt_text: form.name.trim(), sort_order: 0 }]
      : [],
    options: form.options.map((option) => ({
      id: option.id,
      quantity: Math.max(0, Number(option.quantity) || 0),
      additional_price: Math.max(0, Number(option.additionalPrice) || 0),
      is_active: option.isActive,
    })),
  };
}

function productCreatePayload(
  form: ProductCreateForm,
  marketID: number,
): Product {
  const imageURL = form.imageURL.trim();
  return {
    id: 0,
    market_id: marketID,
    category_id: Number(form.categoryID),
    name: form.name.trim(),
    description: form.description,
    summary_description: form.summary.trim(),
    base_price: Math.max(0, Number(form.basePrice) || 0),
    discount_price: Math.max(0, Number(form.discountPrice) || 0),
    shipping_type: form.shippingType,
    popularity_score: 0,
    status: form.status,
    image_url: imageURL || undefined,
    images: imageURL ? [{ url: imageURL, alt_text: form.name.trim(), sort_order: 0 }] : [],
    options: [
      {
        id: 0,
        product_id: 0,
        option_name: form.optionName.trim(),
        option_value: form.optionValue.trim(),
        additional_price: 0,
        quantity: Math.max(0, Number(form.optionQuantity) || 0),
        is_active: true,
      },
    ],
  };
}

export function SellerProductsPageV2() {
  const { token, marketID, marketName } = useSellerConsoleContext();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [categoryID, setCategoryID] = useState("");
  const [selectedID, setSelectedID] = useState<number>();
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<ProductEditForm>();
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<ProductCreateForm>(createEmptyProduct);
  const [htmlEditor, setHtmlEditor] = useState<"CREATE" | "EDIT">();
  const debouncedQuery = useDebouncedValue(query);

  const categoriesQuery = useQuery({
    queryKey: ["seller-product-categories-v2"],
    queryFn: api.listCategories,
    enabled: Boolean(token),
  });
  const productsQuery = useQuery({
    queryKey: ["seller-products-v2", marketID, page, debouncedQuery, status, categoryID],
    queryFn: () =>
      sellerConsoleApi.products(token ?? "", {
        market_id: marketID,
        page,
        page_size: 20,
        q: debouncedQuery || undefined,
        status: statusFilter(status),
        category_id: Number(categoryID) || undefined,
      }),
    enabled: Boolean(token),
    meta: { consoleDataRole: "primary" },
  });
  const productQuery = useQuery({
    queryKey: ["seller-product-v2", marketID, selectedID],
    queryFn: () => sellerConsoleApi.product(token ?? "", selectedID ?? 0, marketID),
    enabled: Boolean(token && selectedID),
  });

  useEffect(() => {
    if (!productQuery.data) return;
    const timer = window.setTimeout(() => {
      setEditForm(editFormFromProduct(productQuery.data));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [productQuery.data]);

  const updateMutation = useMutation({
    mutationFn: () =>
      sellerConsoleApi.updateProduct(
        token ?? "",
        selectedID ?? 0,
        productUpdatePayload(editForm ?? editFormFromProduct(productQuery.data!)),
      ),
    onSuccess: async () => {
      setEditing(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["seller-products-v2"] }),
        queryClient.invalidateQueries({ queryKey: ["seller-product-v2", marketID, selectedID] }),
      ]);
    },
  });
  const createMutation = useMutation({
    mutationFn: () => {
      if (!marketID) throw new Error("마켓 정보를 확인할 수 없습니다.");
      return api.createSellerProduct(token ?? "", productCreatePayload(createForm, marketID));
    },
    onSuccess: async () => {
      setCreateOpen(false);
      setCreateForm(createEmptyProduct());
      await queryClient.invalidateQueries({ queryKey: ["seller-products-v2"] });
    },
  });

  if (!token) return <SellerAuthRequiredV2 />;
  const data = productsQuery.data;
  const products = data?.items ?? [];
  const categories = categoriesQuery.data ?? [];
  const canCreate =
    Boolean(marketID) &&
    Boolean(createForm.name.trim()) &&
    Number(createForm.categoryID) > 0 &&
    Number(createForm.basePrice) >= 0 &&
    Boolean(createForm.optionName.trim()) &&
    Boolean(createForm.optionValue.trim());

  return (
    <SellerConsoleLayoutV2 marketName={marketName}>
      <ConsoleHeader
        title="상품 관리"
        description="상품 등록과 목록 관리를 분리했습니다. 목록은 조회 전용이며, 상품을 누른 뒤 수정 모드로 전환할 수 있습니다."
        action={<Button type="button" onClick={() => setCreateOpen(true)}>상품 등록하기</Button>}
      />
      <ConsoleSection className="mt-5" title="상품 목록 조회 및 관리">
        <FilterPanel>
          <FilterField label="상품 검색">
            <input className={consoleInputClass} value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="상품명" />
          </FilterField>
          <FilterField label="판매 상태">
            <select className={consoleInputClass} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
              <option value="ALL">전체 상태</option>
              <option value="SELLING">판매중</option>
              <option value="SOLD_OUT">품절</option>
              <option value="HIDE">숨김</option>
            </select>
          </FilterField>
          <FilterField label="카테고리">
            <select className={consoleInputClass} value={categoryID} onChange={(event) => { setCategoryID(event.target.value); setPage(1); }}>
              <option value="">전체 카테고리</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{categoryLabel(category)}</option>
              ))}
            </select>
          </FilterField>
        </FilterPanel>
        <div className="mt-4">
          <ConsoleTable
            columns={["상품", "카테고리", "판매가", "가용 재고", "상태", "수정일"]}
            rows={products.map((product) => [
              <div key="product" className="flex min-w-0 items-center gap-3">
                <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                  <SafeImage src={product.image_url} alt="" fill sizes="48px" className="object-cover" />
                </div>
                <div className="min-w-0"><p className="line-clamp-2 font-black">{product.name}</p><p className="text-xs text-muted">#{product.id}</p></div>
              </div>,
              product.category_name,
              formatPrice(product.discount_price || product.base_price),
              String(product.available_quantity) + "개",
              <StatusBadge key="status" value={product.status} />,
              dateTime(product.updated_at),
            ])}
            rowKeys={products.map((product) => product.id)}
            onRowClick={(index) => {
              setSelectedID(products[index].id);
              setEditing(false);
            }}
          />
          <PaginationBar page={data?.page ?? page} totalPages={data?.total_pages ?? 1} total={data?.total ?? 0} onChange={setPage} />
        </div>
      </ConsoleSection>

      <ConsoleModal
        open={Boolean(selectedID)}
        title={productQuery.data?.name ?? "상품 상세"}
        description="기본 상태는 조회 전용입니다."
        size="xl"
        onClose={() => setSelectedID(undefined)}
        footer={
          productQuery.data ? (
            <>
              {editing ? <Button type="button" variant="secondary" onClick={() => { setEditing(false); setEditForm(editFormFromProduct(productQuery.data!)); }}>취소</Button> : null}
              <Button type="button" disabled={updateMutation.isPending} onClick={() => editing ? updateMutation.mutate() : setEditing(true)}>
                {editing ? "변경 저장" : "수정"}
              </Button>
            </>
          ) : undefined
        }
      >
        {productQuery.data && editForm ? (
          <div className="grid gap-6">
            <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
              <div className="relative aspect-square overflow-hidden rounded-xl bg-zinc-100">
                <SafeImage src={editForm.imageURL || productQuery.data.image_url} alt="" fill sizes="220px" className="object-cover" />
              </div>
              {editing ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <FilterField label="상품명"><input className={consoleInputClass} value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} /></FilterField>
                  <FilterField label="카테고리">
                    <select className={consoleInputClass} value={editForm.categoryID} onChange={(event) => setEditForm({ ...editForm, categoryID: event.target.value })}>
                      {categories.map((category) => <option key={category.id} value={category.id}>{categoryLabel(category)}</option>)}
                    </select>
                  </FilterField>
                  <FilterField label="정가"><input className={consoleInputClass} type="number" min={0} value={editForm.basePrice} onChange={(event) => setEditForm({ ...editForm, basePrice: event.target.value })} /></FilterField>
                  <FilterField label="할인가"><input className={consoleInputClass} type="number" min={0} value={editForm.discountPrice} onChange={(event) => setEditForm({ ...editForm, discountPrice: event.target.value })} /></FilterField>
                  <FilterField label="배송 유형">
                    <select className={consoleInputClass} value={editForm.shippingType} onChange={(event) => setEditForm({ ...editForm, shippingType: event.target.value })}><option value="NORMAL">일반 배송</option><option value="FREE">무료 배송</option></select>
                  </FilterField>
                  <FilterField label="상태">
                    <select className={consoleInputClass} value={editForm.status} onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}><option value="SELLING">판매중</option><option value="SOLD_OUT">품절</option><option value="HIDE">숨김</option></select>
                  </FilterField>
                  <FilterField label="대표 이미지 URL"><input className={consoleInputClass} value={editForm.imageURL} onChange={(event) => setEditForm({ ...editForm, imageURL: event.target.value })} /></FilterField>
                  <FilterField label="요약 설명"><input className={consoleInputClass} value={editForm.summary} onChange={(event) => setEditForm({ ...editForm, summary: event.target.value })} /></FilterField>
                </div>
              ) : (
                <DetailGrid>
                  <DetailItem label="카테고리">{productQuery.data.category_name}</DetailItem>
                  <DetailItem label="상태"><StatusBadge value={productQuery.data.status} /></DetailItem>
                  <DetailItem label="정가">{formatPrice(productQuery.data.base_price)}</DetailItem>
                  <DetailItem label="할인가">{productQuery.data.discount_price ? formatPrice(productQuery.data.discount_price) : "-"}</DetailItem>
                  <DetailItem label="배송 유형">{productQuery.data.shipping_type}</DetailItem>
                  <DetailItem label="수정일">{dateTime(productQuery.data.updated_at)}</DetailItem>
                  <DetailItem label="요약 설명">{productQuery.data.summary_description}</DetailItem>
                  <DetailItem label="태그">{productQuery.data.tags.join(", ")}</DetailItem>
                </DetailGrid>
              )}
            </div>
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-black">상세 HTML</h3>
                {editing ? <Button type="button" size="sm" variant="secondary" onClick={() => setHtmlEditor("EDIT")}>HTML 편집</Button> : null}
              </div>
              <div className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl border border-line p-4 text-sm">{editForm.description || "-"}</div>
            </section>
            <section>
              <h3 className="mb-3 font-black">옵션</h3>
              <ConsoleTable
                columns={["옵션", "추가 금액", "수량", "가용", "사용"]}
                rows={productQuery.data.options.map((option, index) => [
                  option.option_name + ": " + option.option_value,
                  editing ? <input key="price" className={consoleInputClass} type="number" min={0} value={editForm.options[index]?.additionalPrice ?? "0"} onChange={(event) => setEditForm({ ...editForm, options: editForm.options.map((item, itemIndex) => itemIndex === index ? { ...item, additionalPrice: event.target.value } : item) })} /> : formatPrice(option.additional_price),
                  editing ? <input key="quantity" className={consoleInputClass} type="number" min={0} value={editForm.options[index]?.quantity ?? "0"} onChange={(event) => setEditForm({ ...editForm, options: editForm.options.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: event.target.value } : item) })} /> : String(option.quantity) + "개",
                  String(option.available_quantity) + "개",
                  editing ? <input key="active" type="checkbox" checked={editForm.options[index]?.isActive ?? false} onChange={(event) => setEditForm({ ...editForm, options: editForm.options.map((item, itemIndex) => itemIndex === index ? { ...item, isActive: event.target.checked } : item) })} /> : option.is_active ? "사용" : "중지",
                ])}
              />
            </section>
          </div>
        ) : (
          <ModalLoading />
        )}
      </ConsoleModal>

      <ConsoleModal
        open={createOpen}
        title="상품 등록"
        description="등록 정보와 상세 HTML을 분리해 편집합니다."
        size="xl"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>취소</Button>
            <Button type="button" disabled={!canCreate || createMutation.isPending} onClick={() => createMutation.mutate()}>상품 등록</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FilterField label="상품명"><input className={consoleInputClass} value={createForm.name} onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })} /></FilterField>
          <FilterField label="카테고리">
            <select className={consoleInputClass} value={createForm.categoryID} onChange={(event) => setCreateForm({ ...createForm, categoryID: event.target.value })}>
              <option value="">카테고리 선택</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{categoryLabel(category)}</option>)}
            </select>
          </FilterField>
          <FilterField label="정가"><input className={consoleInputClass} type="number" min={0} value={createForm.basePrice} onChange={(event) => setCreateForm({ ...createForm, basePrice: event.target.value })} /></FilterField>
          <FilterField label="할인가"><input className={consoleInputClass} type="number" min={0} value={createForm.discountPrice} onChange={(event) => setCreateForm({ ...createForm, discountPrice: event.target.value })} /></FilterField>
          <FilterField label="배송 유형"><select className={consoleInputClass} value={createForm.shippingType} onChange={(event) => setCreateForm({ ...createForm, shippingType: event.target.value })}><option value="NORMAL">일반 배송</option><option value="FREE">무료 배송</option></select></FilterField>
          <FilterField label="상태"><select className={consoleInputClass} value={createForm.status} onChange={(event) => setCreateForm({ ...createForm, status: event.target.value })}><option value="SELLING">판매중</option><option value="SOLD_OUT">품절</option><option value="HIDE">숨김</option></select></FilterField>
          <FilterField label="대표 이미지 URL"><input className={consoleInputClass} value={createForm.imageURL} onChange={(event) => setCreateForm({ ...createForm, imageURL: event.target.value })} /></FilterField>
          <FilterField label="요약 설명"><input className={consoleInputClass} value={createForm.summary} onChange={(event) => setCreateForm({ ...createForm, summary: event.target.value })} /></FilterField>
          <FilterField label="옵션명"><input className={consoleInputClass} value={createForm.optionName} onChange={(event) => setCreateForm({ ...createForm, optionName: event.target.value })} placeholder="예: 색상" /></FilterField>
          <FilterField label="옵션값"><input className={consoleInputClass} value={createForm.optionValue} onChange={(event) => setCreateForm({ ...createForm, optionValue: event.target.value })} placeholder="예: 블랙" /></FilterField>
          <FilterField label="초기 재고"><input className={consoleInputClass} type="number" min={0} value={createForm.optionQuantity} onChange={(event) => setCreateForm({ ...createForm, optionQuantity: event.target.value })} /></FilterField>
          <div className="grid content-end">
            <Button type="button" variant="secondary" onClick={() => setHtmlEditor("CREATE")}>상세 HTML 편집</Button>
          </div>
        </div>
      </ConsoleModal>

      <ConsoleModal
        open={Boolean(htmlEditor)}
        title="상세 HTML 편집"
        description="HTML 원문은 상품 등록·수정 모달과 분리해 넓게 편집합니다."
        size="xl"
        onClose={() => setHtmlEditor(undefined)}
        footer={<Button type="button" onClick={() => setHtmlEditor(undefined)}>편집 완료</Button>}
      >
        <textarea
          className="min-h-[52vh] w-full resize-y rounded-xl border border-line bg-zinc-950 p-4 font-mono text-sm leading-6 text-zinc-100 outline-none focus:border-zinc-500"
          value={htmlEditor === "EDIT" ? editForm?.description ?? "" : createForm.description}
          onChange={(event) => {
            if (htmlEditor === "EDIT" && editForm) setEditForm({ ...editForm, description: event.target.value });
            if (htmlEditor === "CREATE") setCreateForm({ ...createForm, description: event.target.value });
          }}
          placeholder="<section>상품 상세 내용을 입력하세요.</section>"
        />
      </ConsoleModal>
    </SellerConsoleLayoutV2>
  );
}
