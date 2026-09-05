"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getEffectiveToken } from "@/lib/auth-token";
import { useSessionStore } from "@/lib/session-store";
import type { CMSHomeSection, CommerceCategory } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import {
  ConsoleHeader,
  ConsoleLayout,
  ConsoleSection,
  DataTable,
  FilterField,
  FilterPanel,
  MetricGrid,
  SearchBox,
  StatusBadge,
  SummaryStrip,
} from "./console-layout";
import { SafeImage } from "./safe-image";
import { Button } from "./ui/button";

export const adminLinks = [
  { href: "/admin", label: "홈" },
  { href: "/admin/members", label: "회원" },
  { href: "/admin/markets", label: "마켓" },
  { href: "/admin/products", label: "상품" },
  { href: "/admin/orders", label: "주문" },
  { href: "/admin/settlements", label: "정산" },
  { href: "/admin/coupons", label: "쿠폰" },
  { href: "/admin/tokens", label: "토큰 조회" },
  { href: "/admin/audit-logs", label: "감사 로그" },
  { href: "/admin/cms", label: "CMS" },
  { href: "/admin/ads", label: "광고 운영" },
  { href: "/admin/experiments", label: "실험" },
];

export function useAdminToken() {
  const token = useSessionStore((state) => state.accessToken);
  const role = useSessionStore((state) => state.role);
  const hydrate = useSessionStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (role !== "ADMIN") {
    return null;
  }
  return getEffectiveToken(token);
}

export function AdminAuthRequired() {
  return (
    <ConsoleLayout title="Admin" subtitle="플랫폼 운영 콘솔" links={adminLinks}>
      <ConsoleSection>
        <h2 className="text-2xl font-black">어드민 권한이 필요합니다</h2>
        <p className="mt-2 text-sm text-muted">어드민 계정으로 로그인한 사용자만 플랫폼 운영 콘솔에 접근할 수 있습니다.</p>
      </ConsoleSection>
    </ConsoleLayout>
  );
}

function auditTargetID(log: { settlement_id?: number; order_id?: number; order_code?: string }) {
  return log.order_code ?? log.order_id ?? log.settlement_id ?? "-";
}

function couponDiscountLabel(coupon: { discount_type: string; discount_value: number }) {
  return coupon.discount_type === "PERCENT"
    ? `${coupon.discount_value}%`
    : formatPrice(coupon.discount_value);
}

export function AdminHomePage() {
  const token = useAdminToken();
  const { data: dashboard } = useQuery({ queryKey: ["admin-dashboard"], queryFn: () => api.adminDashboard(token ?? ""), enabled: Boolean(token) });

  if (!token) {
    return <AdminAuthRequired />;
  }

  return (
    <ConsoleLayout title="Admin" subtitle="플랫폼 운영 콘솔" links={adminLinks}>
      <ConsoleHeader title="어드민 홈" description="플랫폼 전체 주문, 정산, 마켓 리스크를 한 화면에서 감시합니다." />
      <div className="mt-5">{dashboard ? <MetricGrid metrics={dashboard.metrics} /> : null}</div>

      <div className="mt-5">
        <ConsoleSection title="운영 알림" description="정산, 배송, 마켓 상태와 관련된 고위험 이슈입니다.">
          <div className="grid gap-3">
            {dashboard?.alerts.map((alert) => (
              <div key={alert.id} className="rounded-md bg-zinc-50 p-3">
                <div className="flex justify-between gap-4">
                  <p className="font-bold">{alert.title}</p>
                  <StatusBadge value={alert.severity} />
                </div>
                <p className="mt-1 text-sm text-muted">{alert.description}</p>
              </div>
            ))}
          </div>
        </ConsoleSection>
      </div>

      <ConsoleSection className="mt-5" title="최근 관리자 작업" description="서버가 제공하는 작업 대상과 시각만 표시합니다.">
        <DataTable
          columns={["대상", "작업", "일시"]}
          rows={(dashboard?.recent_actions ?? []).map((log) => [
            `${log.target_type} #${auditTargetID(log)}`,
            log.action,
            new Date(log.created_at).toLocaleString("ko-KR"),
          ])}
        />
      </ConsoleSection>
    </ConsoleLayout>
  );
}

export function AdminCouponsPage() {
  const token = useAdminToken();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [targetMemberID, setTargetMemberID] = useState<number | null>(null);
  const { data = [] } = useQuery({ queryKey: ["admin-coupons", targetMemberID], queryFn: () => api.adminCoupons(token ?? "", targetMemberID), enabled: Boolean(token), meta: { consoleDataRole: "primary" } });
  const issueCoupon = useMutation({
    mutationFn: (couponID: number) => {
      if (!targetMemberID) {
        throw new Error("쿠폰을 발급할 회원을 선택해 주세요.");
      }
      return api.issueCouponToMember(token ?? "", couponID, targetMemberID);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-coupons", targetMemberID] });
    },
  });

  if (!token) {
    return <AdminAuthRequired />;
  }

  const coupons = data;
  const filteredCoupons = coupons.filter((coupon) => {
    const matchesQuery = !query || coupon.name.toLowerCase().includes(query.toLowerCase()) || coupon.condition_text?.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "ALL"
      || coupon.definition_status === status
      || coupon.issuance_status === status
      || coupon.user_coupon_status === status;
    return matchesQuery && matchesStatus;
  });

  return (
    <ConsoleLayout title="Admin" subtitle="플랫폼 운영 콘솔" links={adminLinks}>
      <ConsoleHeader title="쿠폰 관리" description="발급 가능한 쿠폰을 조회하고 회원을 선택해 발급 처리합니다. 정의 활성 상태는 현재 서버에서 제공하지 않습니다." />
      <div className="mt-5">
        <SummaryStrip
          items={[
            { label: "쿠폰 수", value: `${coupons.length}개` },
            { label: "회원 발급됨", value: `${coupons.filter((coupon) => coupon.user_coupon_status === "ISSUED").length}개` },
            { label: "발급 가능", value: `${coupons.filter((coupon) => coupon.issuance_status === "ISSUABLE").length}개` },
            { label: "정의 상태", value: "서버 미제공" },
          ]}
        />
      </div>
      <ConsoleSection className="mt-5" title="쿠폰 발급 대상" description="발급 버튼을 누르면 선택된 회원에게 발급하는 흐름으로 처리됩니다.">
        <input
          className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm font-bold md:w-96"
          type="number"
          min={1}
          value={targetMemberID ?? ""}
          onChange={(event) => setTargetMemberID(Number(event.target.value) || null)}
          placeholder="발급할 회원 번호"
        />
        {issueCoupon.data ? (
          <p className="mt-3 text-sm font-bold text-brand">
            회원 #{issueCoupon.data.member_id}에게 쿠폰 #{issueCoupon.data.coupon_id}을 발급했습니다.
          </p>
        ) : null}
        {issueCoupon.error ? <p className="mt-3 text-sm font-bold text-brand">{issueCoupon.error.message}</p> : null}
      </ConsoleSection>
      <ConsoleSection className="mt-5" title="쿠폰 목록">
        <FilterPanel>
          <FilterField label="검색">
            <SearchBox value={query} onChange={setQuery} placeholder="쿠폰명 또는 조건 검색" />
          </FilterField>
          <FilterField label="상태">
            <select className="h-10 rounded-md border border-line bg-white px-3 text-sm font-bold" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="ALL">전체 상태</option>
              <option value="ISSUABLE">발급 가능</option>
              <option value="SCHEDULED">발급 예정</option>
              <option value="ENDED">발급 종료</option>
              <option value="SOLD_OUT">소진</option>
              <option value="INACTIVE">발급 비활성</option>
              <option value="ISSUED">회원 발급됨</option>
              <option value="USED">보유·사용됨</option>
            </select>
          </FilterField>
        </FilterPanel>
        <div className="mt-4" />
        <DataTable
          columns={["쿠폰", "할인", "최소 주문", "조건", "만료", "상태", "작업"]}
          rows={filteredCoupons.map((coupon) => [
            coupon.name,
            couponDiscountLabel(coupon),
            formatPrice(coupon.min_order_amount),
            coupon.condition_text ?? "-",
            coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString("ko-KR") : "-",
            <div key="status" className="flex flex-wrap items-center gap-1">
              {coupon.definition_status
                ? <StatusBadge value={coupon.definition_status} />
                : <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-bold text-muted">정의 상태: 서버 미제공</span>}
              {coupon.issuance_status ? <StatusBadge value={coupon.issuance_status} /> : null}
              {coupon.user_coupon_status ? <StatusBadge value={coupon.user_coupon_status} /> : null}
            </div>,
            <Button
              key="issue"
              size="sm"
              disabled={!targetMemberID || coupon.issuance_status !== "ISSUABLE" || Boolean(coupon.user_coupon_status) || issueCoupon.isPending}
              onClick={() => issueCoupon.mutate(coupon.id)}
            >
              {coupon.user_coupon_status ? "발급됨" : issueCoupon.isPending ? "발급 중" : "발급"}
            </Button>,
          ])}
        />
      </ConsoleSection>
    </ConsoleLayout>
  );
}

export function AdminCMSPage() {
  const token = useAdminToken();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("ALL");
  const [editingID, setEditingID] = useState<number | null>(null);
  const [categoryEditingID, setCategoryEditingID] = useState<number | null>(null);
  const [sectionEditingID, setSectionEditingID] = useState<number | null>(null);
  const [form, setForm] = useState(emptyCMSCarouselForm());
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm());
  const [sectionForm, setSectionForm] = useState(emptyHomeSectionForm());

  const { data = [] } = useQuery({ queryKey: ["admin-carousels"], queryFn: () => api.adminCarousels(token ?? ""), enabled: Boolean(token) });
  const { data: categories = [] } = useQuery({ queryKey: ["admin-categories"], queryFn: () => api.adminCategories(token ?? ""), enabled: Boolean(token) });
  const { data: homeSections = [] } = useQuery({ queryKey: ["admin-home-sections"], queryFn: () => api.adminHomeSections(token ?? ""), enabled: Boolean(token) });

  const saveCarousel = useMutation({
    mutationFn: async () => {
      const payload = cmsCarouselPayload(form);
      if (editingID) {
        await api.updateCarousel(token ?? "", editingID, payload);
      } else {
        await api.createCarousel(token ?? "", payload);
      }
    },
    onSuccess: () => {
      setEditingID(null);
      setForm(emptyCMSCarouselForm());
      void queryClient.invalidateQueries({ queryKey: ["admin-carousels"] });
    },
  });
  const deactivateCarousel = useMutation({
    mutationFn: (carouselID: number) => api.deactivateCarousel(token ?? "", carouselID),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-carousels"] }),
  });
  const saveCategory = useMutation({
    mutationFn: () => {
      const payload = categoryPayload(categoryForm);
      return categoryEditingID ? api.updateCategory(token ?? "", categoryEditingID, payload) : api.createCategory(token ?? "", payload);
    },
    onSuccess: () => {
      setCategoryEditingID(null);
      setCategoryForm(emptyCategoryForm());
      void queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
  });
  const deleteCategory = useMutation({
    mutationFn: (categoryID: number) => api.deleteCategory(token ?? "", categoryID),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-categories"] }),
  });
  const reorderCategories = useMutation({
    mutationFn: (items: { id: number; display_order: number }[]) => api.reorderCategories(token ?? "", items),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-categories"] }),
  });
  const saveHomeSection = useMutation({
    mutationFn: () => {
      const payload = homeSectionPayload(sectionForm);
      return sectionEditingID ? api.updateHomeSection(token ?? "", sectionEditingID, payload) : api.createHomeSection(token ?? "", payload);
    },
    onSuccess: () => {
      setSectionEditingID(null);
      setSectionForm(emptyHomeSectionForm());
      void queryClient.invalidateQueries({ queryKey: ["admin-home-sections"] });
    },
  });
  const deleteHomeSection = useMutation({
    mutationFn: (sectionID: number) => api.deleteHomeSection(token ?? "", sectionID),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-home-sections"] }),
  });
  const reorderHomeSections = useMutation({
    mutationFn: (items: { id: number; sequence: number }[]) => api.reorderHomeSections(token ?? "", items),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-home-sections"] }),
  });

  if (!token) {
    return <AdminAuthRequired />;
  }

  const filteredCarousels = status === "ALL" ? data : data.filter((carousel) => carousel.status === status);
  const sortedCategories = [...categories].sort((a, b) => a.level - b.level || a.sort_order - b.sort_order || a.id - b.id);
  const sortedSections = [...homeSections].sort((a, b) => a.sequence - b.sequence || a.id - b.id);

  function editCarousel(carousel: (typeof data)[number]) {
    setEditingID(carousel.id);
    setForm({
      title: carousel.title,
      image_url: carousel.image_url,
      target_type: carousel.target_type ?? "PRODUCT",
      target_id: String(carousel.target_id ?? ""),
      display_order: String(carousel.display_order ?? 0),
      status: carousel.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
      starts_at: toDateTimeLocal(carousel.starts_at),
      ends_at: toDateTimeLocal(carousel.ends_at),
    });
  }

  function editCategory(category: CommerceCategory) {
    setCategoryEditingID(category.id);
    setCategoryForm({ parent_id: category.parent_id ? String(category.parent_id) : "", name: category.name, slug: category.slug, display_order: String(category.sort_order ?? 0) });
  }

  function editHomeSection(section: CMSHomeSection) {
    setSectionEditingID(section.id);
    setSectionForm({ sequence: String(section.sequence ?? 0), title: section.title, description: section.description ?? "", api_url: section.api_url, status: section.status === "ACTIVE" ? "ACTIVE" : "INACTIVE" });
  }

  function moveCategory(category: CommerceCategory, direction: -1 | 1) {
    const siblings = categories.filter((item) => (item.parent_id ?? 0) === (category.parent_id ?? 0)).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    const items = shiftedOrder(siblings, category.id, direction).map((item, index) => ({ id: item.id, display_order: index }));
    reorderCategories.mutate(items);
  }

  function moveSection(section: CMSHomeSection, direction: -1 | 1) {
    const items = shiftedOrder(sortedSections, section.id, direction).map((item, index) => ({ id: item.id, sequence: index }));
    reorderHomeSections.mutate(items);
  }

  return (
    <ConsoleLayout title="Admin" subtitle="플랫폼 운영 콘솔" links={adminLinks}>
      <ConsoleHeader
        title="CMS 운영"
        description="홈 구좌, 이벤트 캐러셀, 카테고리 노출 순서를 백엔드 설정 기준으로 관리합니다."
        action={<select className="h-10 rounded-md border border-line bg-white px-3 text-sm font-bold" value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">전체 상태</option><option value="ACTIVE">활성</option><option value="INACTIVE">비활성</option></select>}
      />

      <ConsoleSection className="mt-5" title={sectionEditingID ? "홈 구좌 수정" : "홈 구좌 등록"}>
        <div className="grid gap-3 lg:grid-cols-[90px_1fr_1.2fr_1.1fr_130px_auto]">
          <input type="number" className="h-11 rounded-md border border-line px-3 text-sm outline-none" value={sectionForm.sequence} onChange={(event) => setSectionForm((current) => ({ ...current, sequence: event.target.value }))} aria-label="구좌 순서" />
          <input className="h-11 rounded-md border border-line px-3 text-sm outline-none" value={sectionForm.title} onChange={(event) => setSectionForm((current) => ({ ...current, title: event.target.value }))} placeholder="구좌명" aria-label="구좌명" />
          <input className="h-11 rounded-md border border-line px-3 text-sm outline-none" value={sectionForm.description} onChange={(event) => setSectionForm((current) => ({ ...current, description: event.target.value }))} placeholder="설명" aria-label="구좌 설명" />
          <input className="h-11 rounded-md border border-line px-3 text-sm outline-none" value={sectionForm.api_url} onChange={(event) => setSectionForm((current) => ({ ...current, api_url: event.target.value }))} placeholder="/api/v1/products/popular" aria-label="API URL" />
          <select className="h-11 rounded-md border border-line bg-white px-3 text-sm font-bold" value={sectionForm.status} onChange={(event) => setSectionForm((current) => ({ ...current, status: event.target.value }))} aria-label="구좌 상태"><option value="ACTIVE">활성</option><option value="INACTIVE">비활성</option></select>
          <div className="flex gap-2">
            <Button disabled={!sectionForm.title || !sectionForm.api_url || saveHomeSection.isPending} onClick={() => saveHomeSection.mutate()}>{saveHomeSection.isPending ? "저장 중" : sectionEditingID ? "수정" : "등록"}</Button>
            {sectionEditingID ? <Button variant="secondary" onClick={() => { setSectionEditingID(null); setSectionForm(emptyHomeSectionForm()); }}>취소</Button> : null}
          </div>
        </div>
        {saveHomeSection.error ? <p className="mt-3 text-sm font-bold text-brand">{saveHomeSection.error.message}</p> : null}
        <div className="mt-4" />
        <DataTable
          columns={["순서", "구좌", "API", "상태", "작업"]}
          rows={sortedSections.map((section) => [
            section.sequence,
            <div key="section"><p className="font-bold">{section.title}</p><p className="text-xs text-muted">{section.description}</p></div>,
            section.api_url,
            <StatusBadge key="status" value={section.status} />,
            <div key="actions" className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={() => moveSection(section, -1)}>위</Button><Button size="sm" variant="secondary" onClick={() => moveSection(section, 1)}>아래</Button><Button size="sm" onClick={() => editHomeSection(section)}>수정</Button><Button size="sm" variant="secondary" disabled={deleteHomeSection.isPending} onClick={() => deleteHomeSection.mutate(section.id)}>삭제</Button></div>,
          ])}
        />
      </ConsoleSection>

      <ConsoleSection className="mt-5" title={categoryEditingID ? "카테고리 수정" : "카테고리 등록"}>
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_100px_auto]">
          <input className="h-11 rounded-md border border-line px-3 text-sm outline-none" value={categoryForm.name} onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))} placeholder="카테고리명" aria-label="카테고리명" />
          <input className="h-11 rounded-md border border-line px-3 text-sm outline-none" value={categoryForm.slug} onChange={(event) => setCategoryForm((current) => ({ ...current, slug: event.target.value }))} placeholder="slug" aria-label="카테고리 slug" />
          <select className="h-11 rounded-md border border-line bg-white px-3 text-sm font-bold" value={categoryForm.parent_id} onChange={(event) => setCategoryForm((current) => ({ ...current, parent_id: event.target.value }))} aria-label="상위 카테고리">
            <option value="">최상위</option>
            {categories.filter((category) => category.level < 3 && category.id !== categoryEditingID).map((category) => <option key={category.id} value={category.id}>{categoryPathLabel(category, categories)}</option>)}
          </select>
          <input type="number" className="h-11 rounded-md border border-line px-3 text-sm outline-none" value={categoryForm.display_order} onChange={(event) => setCategoryForm((current) => ({ ...current, display_order: event.target.value }))} aria-label="카테고리 순서" />
          <div className="flex gap-2">
            <Button disabled={!categoryForm.name || saveCategory.isPending} onClick={() => saveCategory.mutate()}>{saveCategory.isPending ? "저장 중" : categoryEditingID ? "수정" : "등록"}</Button>
            {categoryEditingID ? <Button variant="secondary" onClick={() => { setCategoryEditingID(null); setCategoryForm(emptyCategoryForm()); }}>취소</Button> : null}
          </div>
        </div>
        {saveCategory.error ? <p className="mt-3 text-sm font-bold text-brand">{saveCategory.error.message}</p> : null}
        {deleteCategory.error ? <p className="mt-3 text-sm font-bold text-brand">{deleteCategory.error.message}</p> : null}
        <div className="mt-4" />
        <DataTable
          columns={["순서", "카테고리", "slug", "단계", "작업"]}
          rows={sortedCategories.map((category) => [
            category.sort_order,
            <span key="name" className="font-bold">{categoryPathLabel(category, categories)}</span>,
            category.slug,
            `${category.level}단계`,
            <div key="actions" className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={() => moveCategory(category, -1)}>위</Button><Button size="sm" variant="secondary" onClick={() => moveCategory(category, 1)}>아래</Button><Button size="sm" onClick={() => editCategory(category)}>수정</Button><Button size="sm" variant="secondary" disabled={deleteCategory.isPending || categories.some((item) => item.parent_id === category.id)} onClick={() => deleteCategory.mutate(category.id)}>삭제</Button></div>,
          ])}
        />
      </ConsoleSection>

      <ConsoleSection className="mt-5" title={editingID ? "이벤트 캐러셀 수정" : "이벤트 캐러셀 등록"}>
        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_130px_110px]">
          <input className="h-11 rounded-md border border-line px-3 text-sm outline-none" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="제목" aria-label="캐러셀 제목" />
          <input className="h-11 rounded-md border border-line px-3 text-sm outline-none" value={form.image_url} onChange={(event) => setForm((current) => ({ ...current, image_url: event.target.value }))} placeholder="이미지 URL" aria-label="이미지 URL" />
          <select className="h-11 rounded-md border border-line bg-white px-3 text-sm font-bold" value={form.target_type} onChange={(event) => setForm((current) => ({ ...current, target_type: event.target.value }))} aria-label="대상 유형"><option value="PRODUCT">상품</option><option value="MARKET">마켓</option><option value="URL">URL</option></select>
          <input type="number" className="h-11 rounded-md border border-line px-3 text-sm outline-none" value={form.target_id} onChange={(event) => setForm((current) => ({ ...current, target_id: event.target.value }))} placeholder="대상 ID" aria-label="대상 ID" />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-[120px_150px_1fr_1fr_auto]">
          <input type="number" className="h-11 rounded-md border border-line px-3 text-sm outline-none" value={form.display_order} onChange={(event) => setForm((current) => ({ ...current, display_order: event.target.value }))} placeholder="순서" aria-label="노출 순서" />
          <select className="h-11 rounded-md border border-line bg-white px-3 text-sm font-bold" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} aria-label="노출 상태"><option value="ACTIVE">활성</option><option value="INACTIVE">비활성</option></select>
          <input type="datetime-local" className="h-11 rounded-md border border-line px-3 text-sm outline-none" value={form.starts_at} onChange={(event) => setForm((current) => ({ ...current, starts_at: event.target.value }))} aria-label="시작 일시" />
          <input type="datetime-local" className="h-11 rounded-md border border-line px-3 text-sm outline-none" value={form.ends_at} onChange={(event) => setForm((current) => ({ ...current, ends_at: event.target.value }))} aria-label="종료 일시" />
          <div className="flex gap-2"><Button disabled={!form.title || !form.image_url || saveCarousel.isPending} onClick={() => saveCarousel.mutate()}>{saveCarousel.isPending ? "저장 중" : editingID ? "수정 저장" : "등록"}</Button>{editingID ? <Button variant="secondary" onClick={() => { setEditingID(null); setForm(emptyCMSCarouselForm()); }}>취소</Button> : null}</div>
        </div>
        {saveCarousel.error ? <p className="mt-3 text-sm font-bold text-brand">{saveCarousel.error.message}</p> : null}
      </ConsoleSection>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {filteredCarousels.map((carousel) => (
          <ConsoleSection key={carousel.id}>
            <div className="relative aspect-[16/7] overflow-hidden rounded-md bg-zinc-100"><SafeImage src={carousel.image_url} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" /></div>
            <div className="mt-3 flex items-start justify-between gap-3"><div><p className="font-black">{carousel.title}</p><p className="mt-1 text-xs font-bold text-muted">순서 {carousel.display_order ?? 0} · {carousel.link_url}</p><p className="mt-1 text-xs font-bold text-muted">{cmsScheduleText(carousel.starts_at, carousel.ends_at)}</p></div><StatusBadge value={carousel.status} /></div>
            <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" onClick={() => editCarousel(carousel)}>수정</Button><Button size="sm" variant="secondary" disabled={deactivateCarousel.isPending || carousel.status !== "ACTIVE"} onClick={() => deactivateCarousel.mutate(carousel.id)}>비활성화</Button></div>
          </ConsoleSection>
        ))}
      </div>
    </ConsoleLayout>
  );
}
function emptyCMSCarouselForm() {
  return {
    title: "",
    image_url: "",
    target_type: "PRODUCT",
    target_id: "",
    display_order: "0",
    status: "ACTIVE",
    starts_at: "",
    ends_at: "",
  };
}

function emptyCategoryForm() {
  return {
    parent_id: "",
    name: "",
    slug: "",
    display_order: "0",
  };
}

function categoryPayload(form: ReturnType<typeof emptyCategoryForm>) {
  return {
    parent_id: form.parent_id ? Number(form.parent_id) : null,
    name: form.name.trim(),
    slug: form.slug.trim(),
    display_order: Number(form.display_order) || 0,
  };
}

function emptyHomeSectionForm() {
  return {
    sequence: "0",
    title: "",
    description: "",
    api_url: "/api/v1/products/popular",
    status: "ACTIVE",
  };
}

function homeSectionPayload(form: ReturnType<typeof emptyHomeSectionForm>) {
  return {
    sequence: Number(form.sequence) || 0,
    title: form.title.trim(),
    description: form.description.trim(),
    api_url: form.api_url.trim(),
    status: form.status,
  };
}

function shiftedOrder<T extends { id: number }>(items: T[], id: number, direction: -1 | 1) {
  const next = [...items];
  const index = next.findIndex((item) => item.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= next.length) {
    return next;
  }
  const current = next[index];
  next[index] = next[target];
  next[target] = current;
  return next;
}

function categoryPathLabel(category: CommerceCategory, categories: CommerceCategory[]) {
  const names = [category.name];
  let parentID = category.parent_id;
  while (parentID) {
    const parent = categories.find((item) => item.id === parentID);
    if (!parent) {
      break;
    }
    names.unshift(parent.name);
    parentID = parent.parent_id;
  }
  return names.join(" / ");
}
function cmsCarouselPayload(form: ReturnType<typeof emptyCMSCarouselForm>) {
  return {
    title: form.title.trim(),
    image_url: form.image_url.trim(),
    target_type: form.target_type,
    target_id: Number(form.target_id) || 0,
    display_order: Number(form.display_order) || 0,
    status: form.status,
    starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : undefined,
    ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : undefined,
  };
}

function toDateTimeLocal(value?: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function cmsScheduleText(startsAt?: string | null, endsAt?: string | null) {
  if (!startsAt && !endsAt) {
    return "상시 노출";
  }
  const start = startsAt ? new Date(startsAt).toLocaleString("ko-KR") : "시작 즉시";
  const end = endsAt ? new Date(endsAt).toLocaleString("ko-KR") : "종료 없음";
  return `${start} ~ ${end}`;
}
