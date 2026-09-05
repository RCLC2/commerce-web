import { ConfirmationDemo } from "../components/docs-interactions";
import { ConsolePreview } from "../components/docs-previews";
import { DocsExample, DocsHero, DocsSection } from "../components/docs-content";

export default function AdminPage() {
  return <>
    <DocsHero eyebrow="ADMIN" title="검토와 승인" description="검토 대상, 처리 상태와 변경 대상을 표시하는 기준입니다." />
    <DocsSection title="검토 목록" description="대상, 이름, 상태와 영향을 받는 건수를 함께 표시합니다.">
      <DocsExample padded={false} description="PC에서는 표로, 모바일에서는 항목별 카드로 표시합니다. 데이터는 고정된 예시입니다."><ConsolePreview kind="admin" /></DocsExample>
    </DocsSection>
    <DocsSection title="권한 승인" description="권한이 변경될 대상과 변경 내용을 확인한 뒤 승인합니다.">
      <DocsExample description="권한 승인 버튼을 누르면 Dialog가 열립니다. 실제 권한은 변경되지 않습니다."><ConfirmationDemo role="admin" /></DocsExample>
    </DocsSection>
  </>;
}
