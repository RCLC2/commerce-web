import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { PageHeading } from "@/components/ui/page-heading";
import { Surface } from "@/components/ui/surface";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <Surface padding="lg">
        <PageHeading icon={<SearchX />} eyebrow="404" title="페이지를 찾을 수 없습니다" description="주소가 변경되었거나 삭제된 페이지입니다. 홈으로 돌아가거나 상품을 찾아보세요." />
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/">홈으로 가기</ButtonLink>
          <ButtonLink href="/products" variant="secondary">상품 둘러보기</ButtonLink>
        </div>
      </Surface>
    </main>
  );
}
