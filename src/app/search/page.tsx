import { Suspense } from "react";
import { SearchPage } from "@/components/search-page";

export default function Search() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted">검색을 준비하는 중입니다.</main>}>
      <SearchPage />
    </Suspense>
  );
}
