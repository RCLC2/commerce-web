import { ConfirmationDemo, PaginationDemo } from "../components/docs-interactions";
import { ConsolePreview } from "../components/docs-previews";
import { DocsExample, DocsHero, DocsSection } from "../components/docs-content";

export default function SellerPage() {
  return <>
    <DocsHero eyebrow="SELLER" title="주문 운영" description="주문 목록, 필터, 페이지 이동과 출고 확인 예시입니다." />
    <DocsSection title="주문 목록" description="주문, 상품, 다음 작업과 상태를 함께 표시합니다.">
      <DocsExample padded={false} description="PC에서는 표로, 모바일에서는 주문별 카드로 표시합니다. 데이터는 고정된 예시입니다."><ConsolePreview kind="seller" /></DocsExample>
    </DocsSection>
    <DocsSection title="Pagination" description="첫 페이지와 마지막 페이지에서는 해당 방향의 버튼을 비활성화합니다.">
      <DocsExample description="PC의 보조 버튼은 36px, 모바일 버튼은 44px 이상입니다."><PaginationDemo /></DocsExample>
    </DocsSection>
    <DocsSection title="출고 확인" description="변경할 주문 수와 출고 후 상태를 확인한 뒤 처리합니다.">
      <DocsExample description="출고 확인 버튼을 누르면 Dialog가 열립니다. 실제 주문은 변경되지 않습니다."><ConfirmationDemo role="seller" /></DocsExample>
    </DocsSection>
  </>;
}
