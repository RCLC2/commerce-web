import { Suspense } from "react";
import { PageLayout } from "@/components/page-layout";
import { LoadingState } from "@/components/ui/feedback";
import { SearchPage } from "@/components/search-page";

export default function Search() {
  return (
    <Suspense fallback={<PageLayout className="pt-2"><LoadingState label="검색을 준비하는 중입니다." /></PageLayout>}>
      <SearchPage />
    </Suspense>
  );
}
