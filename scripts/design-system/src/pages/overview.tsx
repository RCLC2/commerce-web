import { ArrowUpRight, Boxes, BriefcaseBusiness, Layers3, Palette, ShieldCheck, ShoppingBag } from "lucide-react";
import { DocsHero, DocsSection } from "../components/docs-content";
import styles from "../components/docs.module.css";

const sections = [
  { href: "foundations.html", title: "Foundations", description: "색상, 글자, 간격, 반경과 접근성 기준", icon: Palette },
  { href: "components.html", title: "Components", description: "공통 컴포넌트의 사용법과 동작 예시", icon: Boxes },
  { href: "commerce.html", title: "Commerce", description: "상품 정보, 배송 안내와 구매 버튼", icon: ShoppingBag },
  { href: "seller.html", title: "Seller", description: "주문 목록, 필터와 출고 확인", icon: BriefcaseBusiness },
  { href: "admin.html", title: "Admin", description: "검토 목록과 권한 승인", icon: ShieldCheck },
  { href: "patterns.html", title: "Patterns", description: "로딩, 빈 결과, 오류와 완료 상태", icon: Layers3 },
];

export default function DesignSystemPage() {
  return <>
    <DocsHero eyebrow="COMMERCE UI / v1.0" title="디자인 시스템" description="Commerce의 UI 규격과 컴포넌트 사용법입니다." />
    <DocsSection title="문서">
      <div className={styles.directoryGrid}>{sections.map((section) => {
        const Icon = section.icon;
        return <a href={section.href} key={section.href} className={styles.directoryLink}>
          <Icon size={22} strokeWidth={1.6} aria-hidden="true" />
          <div><h3>{section.title}</h3><p>{section.description}</p></div>
          <ArrowUpRight size={17} aria-hidden="true" />
        </a>;
      })}</div>
    </DocsSection>
    <DocsSection title="사용 기준">
      <ul className={styles.ruleList}>
        <li>색상과 간격은 Foundations의 토큰을 사용합니다.</li>
        <li>버튼·입력·탭은 공통 컴포넌트로 구현합니다.</li>
        <li>규격을 변경하면 코드와 문서를 함께 수정합니다.</li>
      </ul>
    </DocsSection>
  </>;
}
