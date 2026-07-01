"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { getEffectiveToken } from "@/lib/auth-token";
import { useSessionStore } from "@/lib/session-store";
import { ProductCard } from "./product-card";
import { Button } from "./ui/button";

const PAGE_SIZE = 20;

export function LikesPage() {
  const [page, setPage] = useState(1);
  const token = useSessionStore((state) => state.accessToken);
  const effectiveToken = getEffectiveToken(token);
  const { data: wishlistedProducts = [], isLoading } = useQuery({
    queryKey: ["me-wishlist", effectiveToken],
    queryFn: () => api.listWishlistedProducts(effectiveToken ?? ""),
    enabled: Boolean(effectiveToken),
  });
  const totalPages = Math.max(1, Math.ceil(wishlistedProducts.length / PAGE_SIZE));
  const pageProducts = wishlistedProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-8">
      <h1 className="text-2xl font-black">좋아요</h1>
      <p className="mt-1 text-sm text-muted">찜한 상품을 모아봅니다.</p>

      {!effectiveToken ? (
        <section className="mt-6 rounded-md border border-line bg-white p-6 text-sm text-muted">
          찜한 상품을 보려면 로그인해 주세요.
          <Link href="/login" className="ml-2 font-black text-foreground">로그인</Link>
        </section>
      ) : (
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black">찜한 상품</h2>
            <span className="text-sm font-bold text-muted">
              {wishlistedProducts.length}개 · {page}/{totalPages}
            </span>
          </div>
          {isLoading ? <p className="mt-4 rounded-md border border-line bg-white p-5 text-sm text-muted">찜한 상품을 불러오는 중입니다.</p> : null}
          {!isLoading && pageProducts.length ? (
            <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-4 md:gap-x-5">
              {pageProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : null}
          {!isLoading && !pageProducts.length ? <p className="mt-4 rounded-md border border-line bg-white p-5 text-sm text-muted">찜한 상품이 없습니다.</p> : null}
          {wishlistedProducts.length > PAGE_SIZE ? (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                <ChevronLeft size={16} />
                이전
              </Button>
              {Array.from({ length: totalPages }).map((_, index) => (
                <button
                  key={index}
                  className={`h-9 w-9 rounded-md text-sm font-black ${page === index + 1 ? "bg-foreground text-white" : "bg-white"}`}
                  onClick={() => setPage(index + 1)}
                >
                  {index + 1}
                </button>
              ))}
              <Button variant="secondary" size="sm" disabled={page === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
                다음
                <ChevronRight size={16} />
              </Button>
            </div>
          ) : null}
        </section>
      )}
    </main>
  );
}