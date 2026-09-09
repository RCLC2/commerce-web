"use client";

import { Input, Select, Textarea } from "./ui/input";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { PDPShelfMode } from "@/lib/api/market-display";
import { apiErrorMessage } from "@/lib/api-client";
import { shippingTypeLabel } from "@/lib/display-labels";
import { queryKeys } from "@/lib/query-keys";
import {
  sellerConsoleApi,
  type SellerProductDetail,
  type SellerProductUpdate,
} from "@/lib/seller-console-api";
import type { CommerceCategory, Product, ProductImage } from "@/lib/types";
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

function statusFilter(value: string) {
  return value === "ALL" ? undefined : value;
}

function categoryLabel(category: CommerceCategory) {
  return category.name;
}

export function SellerHomePageV2() {
  const { token, marketID, marketName } = useSellerConsoleContext();
  const queryClient = useQueryClient();
  const dashboardQuery = useQuery({
    queryKey: ["seller-dashboard-v2", marketID],
    queryFn: () => sellerConsoleApi.dashboard(token ?? "", marketID),
    enabled: Boolean(token),
    meta: { consoleDataRole: "primary" },
  });
  const displaySettingsQuery = useQuery({
    queryKey: queryKeys.marketDisplaySettings(marketID),
    queryFn: () => api.sellerMarketDisplaySettings(token ?? "", marketID ?? 0),
    enabled: Boolean(token && marketID),
  });
  const updateDisplaySettings = useMutation({
    mutationFn: (mode: PDPShelfMode) => api.updateSellerMarketDisplaySettings(token ?? "", marketID ?? 0, mode),
    onSuccess: (settings) => queryClient.setQueryData(queryKeys.marketDisplaySettings(marketID), settings),
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
          <div key={metric.label} className="min-w-0 rounded-xl border border-border-subtle bg-surface-raised p-4">
            <p className="truncate text-xs font-bold text-content-secondary">{metric.label}</p>
            <p className="mt-2 text-2xl font-bold">{metric.value.toLocaleString("ko-KR")}</p>
          </div>
        ))}
      </div>

      <ConsoleSection
        className="mt-5"
        title="상품 상세 추천 캐러셀"
        description="내 마켓의 모든 상품 상세 페이지에서 리뷰 위에 노출할 상품 순서를 선택합니다. 추천 순서 계산은 플랫폼이 담당합니다."
      >
        <div className="grid gap-3 md:grid-cols-2" role="radiogroup" aria-label="상품 상세 추천 순서">
          {([
            ["PLATFORM_RECOMMENDED", "마켓의 추천 상품", "플랫폼 추천 알고리즘이 상품 순서를 정합니다."],
            ["NEWEST", "신상품 순", "판매 중인 상품을 최신 등록 순으로 보여줍니다."],
          ] as const).map(([mode, label, description]) => {
            const selected = (displaySettingsQuery.data?.pdp_shelf_mode ?? "PLATFORM_RECOMMENDED") === mode;
            return (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`rounded-xl border p-4 text-left transition ${selected ? "border-border-interactive bg-action-secondary" : "border-border-subtle bg-surface-raised hover:bg-surface-subtle"}`}
                disabled={updateDisplaySettings.isPending || !marketID}
                onClick={() => updateDisplaySettings.mutate(mode)}
              >
                <span className="text-sm font-black">{label}</span>
                <span className="mt-1 block text-xs leading-5 text-content-secondary">{description}</span>
              </button>
            );
          })}
        </div>
        {displaySettingsQuery.isLoading ? <p className="mt-3 text-xs text-content-secondary">전시 설정을 불러오는 중입니다.</p> : null}
        {displaySettingsQuery.isError || updateDisplaySettings.isError ? (
          <p className="mt-3 text-xs font-bold text-brand">{apiErrorMessage(displaySettingsQuery.error ?? updateDisplaySettings.error)}</p>
        ) : null}
        {updateDisplaySettings.isSuccess ? <p className="mt-3 text-xs font-bold text-status-positive">추천 캐러셀 설정을 저장했습니다.</p> : null}
      </ConsoleSection>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <ConsoleSection title="처리 필요 작업" description="현재 마켓에 해당하는 작업만 표시합니다.">
          <div className="grid gap-3">
            {(dashboard?.tasks ?? []).map((task) => (
              <div key={task.id} className="rounded-xl bg-surface-subtle p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold">{task.title}</p>
                  <StatusBadge value={task.severity} />
                </div>
                <p className="mt-1 text-sm leading-6 text-content-secondary">{task.description}</p>
              </div>
            ))}
            {!dashboard?.tasks.length ? (
              <p className="py-8 text-center text-sm font-bold text-content-secondary">현재 처리할 작업이 없습니다.</p>
            ) : null}
          </div>
        </ConsoleSection>

        <ConsoleSection
          title="최근 주문 처리"
          description="가장 최근 주문 5건만 표시합니다."
          action={
            <Link className="text-sm font-bold text-action-primary hover:underline" href="/seller/orders">
              더보기
            </Link>
          }
        >
          <ConsoleTable
            columns={["주문번호", "대표 상품", "상품 수", "상태", "주문일"]}
            rows={(dashboard?.recent_orders ?? []).slice(0, 5).map((order) => [
              <span key="code" className="font-bold">{order.order_code}</span>,
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
  images: ProductImage[];
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
  const images = product.images.length
    ? product.images.map((image) => ({ id: image.id, url: image.url, alt_text: image.alt_text, sort_order: image.sort_order }))
    : product.image_url
      ? [{ url: product.image_url, alt_text: product.name, sort_order: 0 }]
      : [];
  return {
    name: product.name,
    categoryID: String(product.category_id),
    basePrice: String(product.base_price),
    discountPrice: String(product.discount_price),
    shippingType: product.shipping_type,
    status: product.status,
    summary: product.summary_description,
    description: product.description,
    imageURL: images[0]?.url ?? product.image_url ?? "",
    images,
    options: product.options.map((option) => ({
      id: option.id,
      quantity: String(option.quantity),
      additionalPrice: String(option.additional_price),
      isActive: option.is_active,
    })),
  };
}

type ProductFormErrors = Record<string, string>;

function nonNegativeIntegerError(value: string, label: string) {
  if (!value.trim()) return `${label}을 입력해 주세요.`;
  if (!/^\d+$/.test(value.trim())) return `${label}은 0 이상의 정수로 입력해 주세요.`;
  return undefined;
}

function editFormErrors(form: ProductEditForm): ProductFormErrors {
  const errors: ProductFormErrors = {};
  const basePriceError = nonNegativeIntegerError(form.basePrice, "정가");
  const discountPriceError = nonNegativeIntegerError(form.discountPrice, "할인가");
  if (basePriceError) errors.basePrice = basePriceError;
  if (discountPriceError) errors.discountPrice = discountPriceError;
  if (!form.name.trim()) errors.name = "상품명을 입력해 주세요.";
  if (!Number.isSafeInteger(Number(form.categoryID)) || Number(form.categoryID) <= 0) errors.categoryID = "카테고리를 선택해 주세요.";
  form.options.forEach((option) => {
    const quantityError = nonNegativeIntegerError(option.quantity, "재고");
    const priceError = nonNegativeIntegerError(option.additionalPrice, "추가 금액");
    if (quantityError) errors[`options.${option.id}.quantity`] = quantityError;
    if (priceError) errors[`options.${option.id}.additionalPrice`] = priceError;
  });
  return errors;
}

function createFormErrors(form: ProductCreateForm): ProductFormErrors {
  const errors: ProductFormErrors = {};
  const fields: Array<[keyof ProductCreateForm, string, string]> = [
    ["basePrice", "정가", "basePrice"],
    ["discountPrice", "할인가", "discountPrice"],
    ["optionQuantity", "재고", "optionQuantity"],
  ];
  fields.forEach(([field, label, key]) => {
    const error = nonNegativeIntegerError(form[field], label);
    if (error) errors[key] = error;
  });
  if (!form.name.trim()) errors.name = "상품명을 입력해 주세요.";
  if (!Number.isSafeInteger(Number(form.categoryID)) || Number(form.categoryID) <= 0) errors.categoryID = "카테고리를 선택해 주세요.";
  if (!form.optionName.trim()) errors.optionName = "옵션명을 입력해 주세요.";
  if (!form.optionValue.trim()) errors.optionValue = "옵션값을 입력해 주세요.";
  return errors;
}

function formNumber(value: string) {
  return Number.parseInt(value, 10);
}

function FormError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs font-bold text-status-negative" role="alert">{message}</p> : null;
}

function productUpdatePayload(form: ProductEditForm): SellerProductUpdate {
  const images = form.images
    .filter((image) => image.url.trim())
    .map((image, index) => ({ ...image, url: image.url.trim(), sort_order: index }));
  const representativeURL = form.imageURL.trim();
  const representative = representativeURL
    ? [{ url: representativeURL, alt_text: images[0]?.alt_text ?? form.name.trim(), sort_order: 0 }]
    : [];
  const preserved = images.filter((image) => image.url !== representativeURL).map((image, index) => ({ ...image, sort_order: index + representative.length }));
  const nextImages = [...representative, ...preserved];
  return {
    name: form.name.trim(),
    category_id: formNumber(form.categoryID),
    base_price: formNumber(form.basePrice),
    discount_price: formNumber(form.discountPrice),
    shipping_type: form.shippingType,
    status: form.status,
    summary_description: form.summary.trim(),
    description: form.description,
    image_url: nextImages[0]?.url ?? "",
    images: nextImages,
    options: form.options.map((option) => ({
      id: option.id,
      quantity: formNumber(option.quantity),
      additional_price: formNumber(option.additionalPrice),
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
    category_id: formNumber(form.categoryID),
    name: form.name.trim(),
    description: form.description,
    summary_description: form.summary.trim(),
    base_price: formNumber(form.basePrice),
    discount_price: formNumber(form.discountPrice),
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
        quantity: formNumber(form.optionQuantity),
        is_active: true,
      },
    ],
  };
}

export function SellerProductsPageV2() {
  const { token, marketID, marketName } = useSellerConsoleContext();
  const queryClient = useQueryClient();
  const confirmation = useConsoleConfirm();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(() => Number(consoleUrlValue(searchParams, "page", "1")) || 1);
  const [query, setQuery] = useState(() => consoleUrlValue(searchParams, "q"));
  const [status, setStatus] = useState(() => consoleUrlValue(searchParams, "status", "ALL"));
  const [categoryID, setCategoryID] = useState(() => consoleUrlValue(searchParams, "category"));
  const [selectedID, setSelectedID] = useState<number>();
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<ProductEditForm>();
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<ProductCreateForm>(createEmptyProduct);
  const [htmlEditor, setHtmlEditor] = useState<"CREATE" | "EDIT">();
  const debouncedQuery = useDebouncedValue(query);
  useConsoleUrlFilters({ page, q: query, status, category: categoryID }, (next) => {
    setPage(Number(consoleUrlValue(next, "page", "1")) || 1);
    setQuery(consoleUrlValue(next, "q"));
    setStatus(consoleUrlValue(next, "status", "ALL"));
    setCategoryID(consoleUrlValue(next, "category"));
  });

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
    if (editing || !productQuery.data) return;
    const timer = window.setTimeout(() => {
      setEditForm(editFormFromProduct(productQuery.data));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [editing, productQuery.data]);

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
  const editErrors = editForm ? editFormErrors(editForm) : {};
  const createErrors = createFormErrors(createForm);
  const canSaveEdit = Boolean(editForm) && Object.keys(editErrors).length === 0;
  const canCreate =
    Boolean(marketID) &&
    Object.keys(createErrors).length === 0;

  function closeProductModal() {
    if (updateMutation.isPending) return;
    const dirty = Boolean(
      editing &&
        editForm &&
        productQuery.data &&
        JSON.stringify(editForm) !== JSON.stringify(editFormFromProduct(productQuery.data)),
    );
    if (dirty) {
      confirmation.ask({ title: "상품 상세 닫기", message: "저장하지 않은 상품 변경사항을 버릴까요?", confirmLabel: "변경 버리기", danger: true }, () => {
        updateMutation.reset();
        setEditing(false);
        setSelectedID(undefined);
      });
      return;
    }
    updateMutation.reset();
    setEditing(false);
    setSelectedID(undefined);
  }

  function cancelProductEditing() {
    const dirty = Boolean(
      editForm &&
        productQuery.data &&
        JSON.stringify(editForm) !== JSON.stringify(editFormFromProduct(productQuery.data)),
    );
    if (dirty) {
      confirmation.ask({ title: "상품 수정 취소", message: "저장하지 않은 상품 변경사항을 버릴까요?", confirmLabel: "변경 버리기", danger: true }, () => {
        setEditing(false);
        if (productQuery.data) setEditForm(editFormFromProduct(productQuery.data));
      });
      return;
    }
    setEditing(false);
    if (productQuery.data) setEditForm(editFormFromProduct(productQuery.data));
  }

  function closeCreateModal() {
    if (createMutation.isPending) return;
    const dirty = JSON.stringify(createForm) !== JSON.stringify(createEmptyProduct());
    if (dirty) {
      confirmation.ask({ title: "상품 등록 닫기", message: "입력한 상품 등록 정보를 버릴까요?", confirmLabel: "입력 내용 버리기", danger: true }, () => {
        createMutation.reset();
        setCreateOpen(false);
        setCreateForm(createEmptyProduct());
      });
      return;
    }
    createMutation.reset();
    setCreateOpen(false);
  }

  return (
    <SellerConsoleLayoutV2 marketName={marketName}>
      <ConsoleHeader
        title="상품 관리"
        description="상품을 검색하고 선택하면 상세 정보를 확인하거나 수정할 수 있습니다. 새 상품은 상품 등록하기에서 시작하세요."
        action={<Button type="button" onClick={() => setCreateOpen(true)}>상품 등록하기</Button>}
      />
      <ConsoleSection className="mt-5" title="상품 목록 조회 및 관리">
        <FilterPanel>
          <FilterField label="상품 검색">
            <Input className={consoleInputClass} value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="상품명" />
          </FilterField>
          <FilterField label="판매 상태">
            <Select className={consoleInputClass} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
              <option value="ALL">전체 상태</option>
              <option value="SELLING">판매중</option>
              <option value="SOLD_OUT">품절</option>
              <option value="HIDE">숨김</option>
            </Select>
          </FilterField>
          <FilterField label="카테고리">
            <Select className={consoleInputClass} value={categoryID} onChange={(event) => { setCategoryID(event.target.value); setPage(1); }}>
              <option value="">전체 카테고리</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{categoryLabel(category)}</option>
              ))}
            </Select>
          </FilterField>
        </FilterPanel>
        <div className="mt-4">
          <ConsoleTable
            columns={["상품", "카테고리", "판매가", "가용 재고", "상태", "수정일"]}
            loading={productsQuery.isLoading}
            emptyText={query || status !== "ALL" || categoryID ? "검색 조건에 맞는 상품이 없습니다." : "등록된 상품이 없습니다."}
            rows={products.map((product) => [
              <div key="product" className="flex min-w-0 items-center gap-3">
                <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-surface-subtle">
                  <SafeImage src={product.image_url} alt="" fill sizes="48px" className="object-cover" />
                </div>
                <div className="min-w-0"><p className="line-clamp-2 font-bold">{product.name}</p><p className="text-xs text-content-secondary">#{product.id}</p></div>
              </div>,
              product.category_name,
              formatPrice(product.discount_price || product.base_price),
              String(product.available_quantity) + "개",
              <StatusBadge key="status" value={product.status} />,
              dateTime(product.updated_at),
            ])}
            rowKeys={products.map((product) => product.id)}
            onRowClick={(index) => {
              updateMutation.reset();
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
        description="상품 정보를 확인한 뒤 수정하기를 눌러 변경하세요."
        size="xl"
        onClose={closeProductModal}
        footer={
          productQuery.data ? (
            <>
              {editing ? <Button type="button" variant="secondary" onClick={cancelProductEditing}>취소</Button> : null}
              <Button type="button" disabled={updateMutation.isPending || (editing && !canSaveEdit)} onClick={() => editing ? updateMutation.mutate() : setEditing(true)}>
                {editing ? "변경 저장" : "수정"}
              </Button>
            </>
          ) : undefined
        }
      >
        {productQuery.data && editForm ? (
          <div className="grid gap-6">
            {updateMutation.error ? <p className="rounded-md border border-status-negative/30 bg-status-negative-subtle px-3 py-2 text-sm font-bold text-status-negative" role="alert">{apiErrorMessage(updateMutation.error)}</p> : null}
            <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
              <div className="relative aspect-square overflow-hidden rounded-xl bg-surface-subtle">
                <SafeImage src={editForm.imageURL || productQuery.data.image_url} alt="" fill sizes="220px" className="object-cover" />
              </div>
              {editing ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <FilterField label="상품명"><Input className={consoleInputClass} value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} /><FormError message={editErrors.name} /></FilterField>
                  <FilterField label="카테고리">
                    <Select className={consoleInputClass} value={editForm.categoryID} onChange={(event) => setEditForm({ ...editForm, categoryID: event.target.value })}>
                      {categories.map((category) => <option key={category.id} value={category.id}>{categoryLabel(category)}</option>)}
                    </Select>
                    <FormError message={editErrors.categoryID} />
                  </FilterField>
                  <FilterField label="정가"><Input className={consoleInputClass} type="number" min={0} value={editForm.basePrice} onChange={(event) => setEditForm({ ...editForm, basePrice: event.target.value })} /><FormError message={editErrors.basePrice} /></FilterField>
                  <FilterField label="할인가"><Input className={consoleInputClass} type="number" min={0} value={editForm.discountPrice} onChange={(event) => setEditForm({ ...editForm, discountPrice: event.target.value })} /><FormError message={editErrors.discountPrice} /></FilterField>
                  <FilterField label="배송 유형">
                    <Select className={consoleInputClass} value={editForm.shippingType} onChange={(event) => setEditForm({ ...editForm, shippingType: event.target.value })}><option value="NORMAL">일반 배송</option><option value="FREE">무료 배송</option></Select>
                  </FilterField>
                  <FilterField label="상태">
                    <Select className={consoleInputClass} value={editForm.status} onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}><option value="SELLING">판매중</option><option value="SOLD_OUT">품절</option><option value="HIDE">숨김</option></Select>
                  </FilterField>
                  <FilterField label="대표 이미지 URL"><Input className={consoleInputClass} value={editForm.imageURL} onChange={(event) => setEditForm({ ...editForm, imageURL: event.target.value })} /></FilterField>
                  <FilterField label="요약 설명"><Input className={consoleInputClass} value={editForm.summary} onChange={(event) => setEditForm({ ...editForm, summary: event.target.value })} /></FilterField>
                </div>
              ) : (
                <DetailGrid>
                  <DetailItem label="카테고리">{productQuery.data.category_name}</DetailItem>
                  <DetailItem label="상태"><StatusBadge value={productQuery.data.status} /></DetailItem>
                  <DetailItem label="정가">{formatPrice(productQuery.data.base_price)}</DetailItem>
                  <DetailItem label="할인가">{productQuery.data.discount_price ? formatPrice(productQuery.data.discount_price) : "-"}</DetailItem>
                  <DetailItem label="배송 유형">{shippingTypeLabel(productQuery.data.shipping_type)}</DetailItem>
                  <DetailItem label="수정일">{dateTime(productQuery.data.updated_at)}</DetailItem>
                  <DetailItem label="요약 설명">{productQuery.data.summary_description}</DetailItem>
                  <DetailItem label="태그">{productQuery.data.tags.join(", ")}</DetailItem>
                </DetailGrid>
              )}
            </div>
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-bold">상세 HTML</h3>
                {editing ? <Button type="button" size="sm" variant="secondary" onClick={() => setHtmlEditor("EDIT")}>HTML 편집</Button> : null}
              </div>
              <div className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl border border-border-subtle p-4 text-sm">{editForm.description || "-"}</div>
            </section>
            <section>
              <h3 className="mb-3 font-bold">옵션</h3>
              <ConsoleTable
                columns={["옵션", "추가 금액", "수량", "가용", "사용"]}
                rows={productQuery.data.options.map((option) => {
                  const editOption = editForm.options.find((item) => item.id === option.id);
                  const optionErrorKey = editOption ? `options.${editOption.id}` : "";
                  return [
                  option.option_name + ": " + option.option_value,
                  editing ? <><Input key="price" aria-label={`${option.option_name} ${option.option_value} 추가 금액`} className={consoleInputClass} type="number" min={0} value={editOption?.additionalPrice ?? "0"} onChange={(event) => setEditForm({ ...editForm, options: editForm.options.map((item) => item.id === option.id ? { ...item, additionalPrice: event.target.value } : item) })} /><FormError message={optionErrorKey ? editErrors[`${optionErrorKey}.additionalPrice`] : undefined} /></> : formatPrice(option.additional_price),
                  editing ? <><Input key="quantity" aria-label={`${option.option_name} ${option.option_value} 수량`} className={consoleInputClass} type="number" min={0} value={editOption?.quantity ?? "0"} onChange={(event) => setEditForm({ ...editForm, options: editForm.options.map((item) => item.id === option.id ? { ...item, quantity: event.target.value } : item) })} /><FormError message={optionErrorKey ? editErrors[`${optionErrorKey}.quantity`] : undefined} /></> : String(option.quantity) + "개",
                  String(option.available_quantity) + "개",
                  editing ? <label key="active" className="inline-flex items-center gap-2"><input aria-label={`${option.option_name} ${option.option_value} 사용 여부`} type="checkbox" checked={editOption?.isActive ?? false} onChange={(event) => setEditForm({ ...editForm, options: editForm.options.map((item) => item.id === option.id ? { ...item, isActive: event.target.checked } : item) })} /><span className="text-xs font-bold">사용</span></label> : option.is_active ? "사용" : "중지",
                  ];
                })}
              />
            </section>
          </div>
        ) : (
          <ModalQueryState isLoading={productQuery.isLoading} error={productQuery.error} onRetry={() => void productQuery.refetch()} />
        )}
      </ConsoleModal>

      <ConsoleModal
        open={createOpen}
        title="상품 등록"
        description="등록 정보와 상세 HTML을 분리해 편집합니다."
        size="xl"
        onClose={closeCreateModal}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeCreateModal}>취소</Button>
            <Button type="button" disabled={!canCreate || createMutation.isPending} onClick={() => createMutation.mutate()}>상품 등록</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {createMutation.error ? <p className="sm:col-span-2 rounded-md border border-status-negative/30 bg-status-negative-subtle px-3 py-2 text-sm font-bold text-status-negative" role="alert">{apiErrorMessage(createMutation.error)}</p> : null}
          <FilterField label="상품명"><Input className={consoleInputClass} value={createForm.name} onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })} /><FormError message={createErrors.name} /></FilterField>
          <FilterField label="카테고리">
            <Select className={consoleInputClass} value={createForm.categoryID} onChange={(event) => setCreateForm({ ...createForm, categoryID: event.target.value })}>
              <option value="">카테고리 선택</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{categoryLabel(category)}</option>)}
            </Select>
            <FormError message={createErrors.categoryID} />
          </FilterField>
          <FilterField label="정가"><Input className={consoleInputClass} type="number" min={0} value={createForm.basePrice} onChange={(event) => setCreateForm({ ...createForm, basePrice: event.target.value })} /><FormError message={createErrors.basePrice} /></FilterField>
          <FilterField label="할인가"><Input className={consoleInputClass} type="number" min={0} value={createForm.discountPrice} onChange={(event) => setCreateForm({ ...createForm, discountPrice: event.target.value })} /><FormError message={createErrors.discountPrice} /></FilterField>
          <FilterField label="배송 유형"><Select className={consoleInputClass} value={createForm.shippingType} onChange={(event) => setCreateForm({ ...createForm, shippingType: event.target.value })}><option value="NORMAL">일반 배송</option><option value="FREE">무료 배송</option></Select></FilterField>
          <FilterField label="상태"><Select className={consoleInputClass} value={createForm.status} onChange={(event) => setCreateForm({ ...createForm, status: event.target.value })}><option value="SELLING">판매중</option><option value="SOLD_OUT">품절</option><option value="HIDE">숨김</option></Select></FilterField>
          <FilterField label="대표 이미지 URL"><Input className={consoleInputClass} value={createForm.imageURL} onChange={(event) => setCreateForm({ ...createForm, imageURL: event.target.value })} /></FilterField>
          <FilterField label="요약 설명"><Input className={consoleInputClass} value={createForm.summary} onChange={(event) => setCreateForm({ ...createForm, summary: event.target.value })} /></FilterField>
          <FilterField label="옵션명"><Input className={consoleInputClass} value={createForm.optionName} onChange={(event) => setCreateForm({ ...createForm, optionName: event.target.value })} placeholder="예: 색상" /><FormError message={createErrors.optionName} /></FilterField>
          <FilterField label="옵션값"><Input className={consoleInputClass} value={createForm.optionValue} onChange={(event) => setCreateForm({ ...createForm, optionValue: event.target.value })} placeholder="예: 블랙" /><FormError message={createErrors.optionValue} /></FilterField>
          <FilterField label="초기 재고"><Input className={consoleInputClass} type="number" min={0} value={createForm.optionQuantity} onChange={(event) => setCreateForm({ ...createForm, optionQuantity: event.target.value })} /><FormError message={createErrors.optionQuantity} /></FilterField>
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
        <Textarea
          className="min-h-[52vh] w-full resize-y rounded-xl border border-border-interactive bg-content-primary p-4 font-mono text-sm leading-6 text-content-inverse outline-none focus:border-border-interactive"
          value={htmlEditor === "EDIT" ? editForm?.description ?? "" : createForm.description}
          onChange={(event) => {
            if (htmlEditor === "EDIT" && editForm) setEditForm({ ...editForm, description: event.target.value });
            if (htmlEditor === "CREATE") setCreateForm({ ...createForm, description: event.target.value });
          }}
          placeholder="<section>상품 상세 내용을 입력하세요.</section>"
        />
      </ConsoleModal>

      {confirmation.dialog}
    </SellerConsoleLayoutV2>
  );
}
