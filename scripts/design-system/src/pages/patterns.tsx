import { DocsExample, DocsHero, DocsSection } from "../components/docs-content";
import { AlertPreview, StateFlowPreview } from "../components/docs-previews";
import { Toast } from "@/components/ui/feedback";
import styles from "../components/docs.module.css";

const patterns = [
  ["Loading", "불러오는 중", "목록은 Skeleton으로, 작업 진행은 LoadingState로 표시합니다."],
  ["Empty", "빈 결과", "결과가 없는 이유와 다음 행동을 안내합니다."],
  ["Error", "오류", "오류가 발생한 위치에 원인과 해결 방법을 표시합니다."],
  ["Complete", "완료", "작업 결과를 Toast로 알리고 변경된 내용을 반영합니다."],
];

export default function PatternsPage() {
  return <>
    <DocsHero eyebrow="PATTERNS" title="상태 패턴" description="데이터를 불러오거나 변경할 때 사용하는 상태와 피드백입니다." />
    <DocsSection title="상태별 처리">
      <dl className={styles.definitionList}>{patterns.map(([name, label, description]) => <div key={name}><dt>{name}<span>{label}</span></dt><dd>{description}</dd></div>)}</dl>
    </DocsSection>
    <DocsSection title="작업 순서"><StateFlowPreview /></DocsSection>
    <DocsSection title="피드백 예시">
      <div className="grid gap-6 xl:grid-cols-2">
        <DocsExample label="Notice · 경고" description="확인이 필요한 이유와 다음 행동을 표시합니다."><AlertPreview /></DocsExample>
        <DocsExample label="Toast · 완료" description="완료한 작업을 짧게 알립니다."><Toast>변경사항을 저장했어요.</Toast></DocsExample>
      </div>
    </DocsSection>
    <DocsSection title="적용 기준">
      <ul className={styles.ruleList}>
        <li>로딩·빈 결과·오류·완료 상태를 모두 처리합니다.</li>
        <li>작업 중에는 중복 실행을 막습니다.</li>
        <li>오류에는 원인과 해결 방법을 함께 표시합니다.</li>
        <li>상태는 색상 외에 텍스트나 아이콘으로도 구분합니다.</li>
      </ul>
    </DocsSection>
  </>;
}
