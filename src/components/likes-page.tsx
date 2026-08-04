"use client";

import { useQuery } from "@tanstack/react-query";
import { Bookmark, ChevronLeft, ChevronRight, Heart } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-client";
import { getEffectiveToken } from "@/lib/auth-token";
import { validCollectionPage } from "@/lib/product-engagement";
import { queryKeys } from "@/lib/query-keys";
import { useSessionStore } from "@/lib/session-store";
import { ProductCard } from "./product-card";
import { Button } from "./ui/button";

const PAGE_SIZE = 20;
type CollectionView = "liked" | "wishlist";

export function LikesPage() {
  const [view, setView] = useState<CollectionView>("liked");
  const [page, setPage] = useState(1);
  const token = useSessionStore((state) => state.accessToken);
  const effectiveToken = getEffectiveToken(token);
  const likedProducts = useQuery({
    queryKey: queryKeys.likedProducts(effectiveToken),
    queryFn: () => api.listLikedProducts(effectiveToken ?? ""),
    enabled: Boolean(effectiveToken),
  });
  const wishlistedProducts = useQuery({
    queryKey: queryKeys.wishlist(effectiveToken),
    queryFn: () => api.listWishlistedProducts(effectiveToken ?? ""),
    enabled: Boolean(effectiveToken),
  });
  const selectedQuery = view === "liked" ? likedProducts : wishlistedProducts;
  const products = selectedQuery.data ?? [];
  const currentPage = validCollectionPage(page, products.length, PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const pageProducts = products.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function selectView(next: CollectionView) {
    setView(next);
    setPage(1);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-8">
      <h1 className="text-2xl font-black">좋아요</h1>
      <p className="mt-1 text-sm text-muted">좋아요한 상품과 나중에 구매하려고 찜한 상품을 구분해서 확인합니다.</p>

      {!effectiveToken ? (
        <section className="mt-6 rounded-md border border-line bg-white p-6 text-sm text-muted">
          내 상품 목록을 보려면 로그인해 주세요.
          <Link href="/login?next=/likes" className="ml-2 font-black text-foreground">로그인</Link>
        </section>
      ) : (
        <section className="mt-8">
          <div className="flex gap-2" role="tablist" aria-label="좋아요 상품 목록">
            <CollectionTab active={view === "liked"} icon={<Heart size={16} />} label="좋아요 상품" count={likedProducts.data?.length} onClick={() => selectView("liked")} />
            <CollectionTab active={view === "wishlist"} icon={<Bookmark size={16} />} label="찜한 상품" count={wishlistedProducts.data?.length} onClick={() => selectView("wishlist")} />
          </div>

          <div className="mt-6 flex items-center justify-between">
            <h2 className="text-lg font-black">{view === "liked" ? "좋아요 상품" : "찜한 상품"}</h2>
            {selectedQuery.isSuccess ? <span className="text-sm font-bold text-muted">{products.length}개 · {currentPage}/{totalPages}</span> : null}
          </div>

          {selectedQuery.isLoading ? <p className="mt-4 rounded-md border border-line bg-white p-5 text-sm text-muted">상품 목록을 불러오는 중입니다.</p> : null}
          {selectedQuery.isError ? (
            <div className="mt-4 rounded-md border border-brand/30 bg-red-50 p-5 text-sm">
              <p className="font-bold text-brand">{apiErrorMessage(selectedQuery.error)}</p>
              <Button className="mt-3" size="sm" variant="secondary" onClick={() => void selectedQuery.refetch()}>다시 시도</Button>
            </div>
          ) : null}
          {selectedQuery.isSuccess && pageProducts.length ? (
            <div className="mt-6 grid grid-cols-3 gap-x-2 gap-y-6 md:grid-cols-5 md:gap-x-4">
              {pageProducts.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          ) : null}
          {selectedQuery.isSuccess && !pageProducts.length ? <p className="mt-4 rounded-md border border-line bg-white p-5 text-sm text-muted">{view === "liked" ? "좋아요한 상품이 없습니다." : "찜한 상품이 없습니다."}</p> : null}
          {selectedQuery.isSuccess && products.length > PAGE_SIZE ? (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button variant="secondary" size="sm" disabled={currentPage === 1} onClick={() => setPage(Math.max(1, currentPage - 1))}><ChevronLeft size={16} /> 이전</Button>
              {Array.from({ length: totalPages }).map((_, index) => (
                <button key={index} className={`h-9 w-9 rounded-md text-sm font-black ${currentPage === index + 1 ? "bg-foreground text-white" : "bg-white"}`} onClick={() => setPage(index + 1)}>{index + 1}</button>
              ))}
              <Button variant="secondary" size="sm" disabled={currentPage === totalPages} onClick={() => setPage(Math.min(totalPages, currentPage + 1))}>다음 <ChevronRight size={16} /></Button>
            </div>
          ) : null}
        </section>
      )}
    </main>
  );
}

function CollectionTab({ active, icon, label, count, onClick }: { active: boolean; icon: React.ReactNode; label: string; count?: number; onClick: () => void }) {
  return <button type="button" role="tab" aria-selected={active} className={`inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-black ${active ? "bg-foreground text-white" : "border border-line bg-white"}`} onClick={onClick}>{icon}{label}{count === undefined ? "" : ` ${count}`}</button>;
}
