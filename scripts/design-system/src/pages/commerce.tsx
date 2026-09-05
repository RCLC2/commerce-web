import {
  DocsExample,
  DocsHero,
  DocsLink,
  DocsSection,
} from "../components/docs-content";
import { DemoSource } from "../components/docs-source";
import { PurchaseDemo } from "../components/examples/purchase-demo";
import styles from "../components/docs.module.css";

export default function CommercePage() {
  return (
    <>
      <DocsHero
        eyebrow="COMMERCE"
        title="상품 구매 구성"
        description="상품 정보, 수량, 합계와 구매 버튼을 연결한 예시입니다."
      />
      <DocsSection title="수량과 구매">
        <DocsExample
          padded={false}
          description="수량에 따라 합계와 장바구니에 담는 개수가 바뀝니다. 모바일에서는 예시 안을 스크롤해도 구매 영역이 하단에 유지됩니다. 실제 주문은 생성되지 않습니다."
        >
          <PurchaseDemo />
        </DocsExample>
        <div className={styles.referenceDetails}>
          <DemoSource name="purchase" />
        </div>
      </DocsSection>
      <DocsSection title="구성 기준">
        <ul className={styles.ruleList}>
          <li>
            수량은 하나의 상태로 관리하고 합계·구매·장바구니에서 공유합니다.
          </li>
          <li>주문 가능 수량을 max에 전달합니다.</li>
          <li>
            모바일은 하단 구매 바, PC는 상품 정보 아래의 구매 영역을 사용합니다.
          </li>
        </ul>
        <div className={styles.heroActions}>
          <DocsLink href="components.html#quantity-stepper">
            QuantityStepper
          </DocsLink>
          <DocsLink href="components.html#bottom-action-bar">
            BottomActionBar
          </DocsLink>
        </div>
      </DocsSection>
    </>
  );
}
