"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";

export function CategoriesPage() {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: api.listCategories,
  });

  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 pt-8">
      <h1 className="text-2xl font-black">카테고리</h1>
      <p className="mt-1 text-sm text-muted">백엔드 카테고리 기준으로 상품을 탐색합니다.</p>
      {isLoading ? <p className="mt-6 text-sm text-muted">카테고리를 불러오는 중입니다.</p> : null}
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {categories.map((category) => (
          <Link key={category.id} href={category.href} className="rounded-md border border-line bg-white p-5 font-black hover:bg-zinc-50">
            {category.name}
          </Link>
        ))}
      </div>
    </main>
  );
}
