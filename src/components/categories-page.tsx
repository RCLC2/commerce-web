"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { CommerceCategory } from "@/lib/types";

export function CategoriesPage() {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: queryKeys.categoryTree,
    queryFn: api.listCategoryTree,
  });

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-8">
      <h1 className="text-2xl font-black">카테고리</h1>
      <p className="mt-1 text-sm text-muted">백엔드 카테고리 기준으로 상품을 탐색합니다.</p>
      {isLoading ? <p className="mt-6 text-sm text-muted">카테고리를 불러오는 중입니다.</p> : null}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {categories.map((category) => (
          <CategoryBranch key={category.id} category={category} />
        ))}
      </div>
    </main>
  );
}

function CategoryBranch({ category }: { category: CommerceCategory }) {
  return (
    <section className="rounded-md border border-line bg-white p-5">
      <Link href={category.href} className="text-lg font-black hover:text-brand">
        {category.name}
      </Link>
      {category.children?.length ? (
        <div className="mt-4 grid gap-4">
          {category.children.map((child) => (
            <div key={child.id} className="border-t border-line pt-4 first:border-t-0 first:pt-0">
              <Link href={child.href} className="font-black hover:text-brand">
                {child.name}
              </Link>
              {child.children?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {child.children.map((grandchild) => (
                    <Link key={grandchild.id} href={grandchild.href} className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-bold hover:bg-zinc-200">
                      {grandchild.name}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
