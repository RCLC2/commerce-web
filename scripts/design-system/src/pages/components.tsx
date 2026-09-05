import { DocsHero } from "../components/docs-content";
import { ComponentReference } from "../components/component-reference";
import { ButtonDemo } from "../components/examples/button-demo";
import { FieldDemo } from "../components/examples/field-demo";
import { TabsDemo } from "../components/examples/tabs-demo";
import { FilterChipDemo } from "../components/examples/filter-chip-demo";
import { QuantityStepperDemo } from "../components/examples/quantity-stepper-demo";
import { DialogDemo } from "../components/examples/dialog-demo";
import { SelectDemo } from "../components/examples/select-demo";
import { BottomActionBarDemo } from "../components/examples/bottom-action-bar-demo";
import styles from "../components/docs.module.css";

const links = [
  ["button", "Button"],
  ["field", "Field & Input"],
  ["select", "Select"],
  ["tabs", "Tabs"],
  ["filter-chip", "FilterChip"],
  ["quantity-stepper", "QuantityStepper"],
  ["dialog", "Dialog"],
  ["bottom-action-bar", "BottomActionBar"],
];

export default function ComponentsPage() {
  return (
    <>
      <DocsHero
        eyebrow="COMPONENTS"
        title="공통 컴포넌트"
        description="컴포넌트별 예시, 주요 속성과 실행 코드를 확인합니다."
      />
      <nav className={styles.componentIndex} aria-label="컴포넌트 바로가기">
        {links.map(([id, label]) => (
          <a key={id} href={`#${id}`}>
            {label}
          </a>
        ))}
      </nav>
      <ComponentReference
        id="button"
        title="Button"
        description="저장·취소처럼 사용자의 행동을 실행합니다."
        usage="저장을 누르면 결과를 표시하고, 초기화로 결과를 지웁니다. 비활성 버튼은 동작하지 않습니다."
        properties={[
          [
            "variant",
            "primary · secondary · ghost · danger. 기본값은 primary입니다.",
          ],
          [
            "size",
            "sm · md · lg · icon. 모바일 주요 행동은 44px 이상을 유지합니다.",
          ],
          ["disabled / onClick", "사용 가능 여부와 실행 함수를 전달합니다."],
        ]}
      >
        <ButtonDemo />
      </ComponentReference>
      <ComponentReference
        id="field"
        title="Field & Input"
        description="입력값에 라벨, 도움말과 오류를 연결합니다."
        usage="이메일을 입력한 뒤 다른 곳으로 포커스를 옮기면 형식을 검사합니다."
        properties={[
          ["htmlFor / id", "Field 라벨과 Input을 같은 ID로 연결합니다."],
          ["value / onChange", "입력값을 부모 상태에 저장합니다."],
          [
            "error / state / aria-invalid",
            "오류 문구, 입력 스타일과 접근성 상태를 함께 설정합니다.",
          ],
        ]}
      >
        <FieldDemo />
      </ComponentReference>
      <ComponentReference
        id="select"
        title="Select"
        description="드롭다운 목록에서 하나의 값을 선택합니다."
        usage="배송 요청을 선택하면 바로 반영됩니다. 선택한 값은 셀렉트 박스에 표시됩니다."
        properties={[
          ["htmlFor / id", "Field 라벨과 Select를 같은 ID로 연결합니다."],
          ["value / onChange", "현재 선택값과 변경 함수를 연결합니다."],
          ["children", "option으로 선택 항목을 구성합니다."],
        ]}
      >
        <SelectDemo />
      </ComponentReference>
      <ComponentReference
        id="tabs"
        title="Tabs"
        description="선택한 탭에 해당하는 콘텐츠를 표시합니다."
        usage="클릭 또는 좌우 화살표로 전환합니다. 비활성 탭은 건너뜁니다."
        properties={[
          [
            "items",
            "각 탭의 value, label, content와 선택적인 disabled를 정의합니다.",
          ],
          ["value / onValueChange", "현재 선택값과 변경 함수를 전달합니다."],
          ["ariaLabel", "탭 목록의 목적을 설명합니다."],
        ]}
      >
        <TabsDemo />
      </ComponentReference>
      <ComponentReference
        id="filter-chip"
        title="FilterChip"
        description="조건을 켜거나 끄고 목록을 필터링합니다."
        usage="무료배송을 누르면 조건에 맞는 상품만 남고, 다시 누르면 전체 목록으로 돌아옵니다."
        properties={[
          ["selected", "선택 상태를 표시하고 aria-pressed에 반영합니다."],
          [
            "onClick",
            "선택값을 변경합니다. 목록 필터링은 부모에서 처리합니다.",
          ],
        ]}
      >
        <FilterChipDemo />
      </ComponentReference>
      <ComponentReference
        id="quantity-stepper"
        title="QuantityStepper"
        description="최소·최대 범위 안에서 수량을 변경합니다."
        usage="1개에서는 감소, 5개에서는 증가 버튼이 비활성화됩니다. 각 버튼의 터치 영역은 44px입니다."
        properties={[
          [
            "value / onValueChange",
            "수량과 변경 함수를 연결합니다. 내부에 별도 수량 상태를 두지 않습니다.",
          ],
          [
            "min / max",
            "최소값은 기본 1입니다. max를 생략하면 상한이 없습니다.",
          ],
          ["label", "여러 수량 선택기를 사용할 때 대상을 구분합니다."],
        ]}
      >
        <QuantityStepperDemo />
      </ComponentReference>
      <ComponentReference
        id="dialog"
        title="Dialog"
        description="삭제 등 실행 전에 확인이 필요한 작업에 사용합니다."
        usage="취소·Escape는 변경 없이 닫습니다. 삭제를 누르면 결과를 표시하고 실행 버튼으로 포커스를 돌려줍니다."
        properties={[
          ["open / onClose", "열림 상태와 닫기 동작을 제어합니다."],
          ["title / description", "확인할 작업과 변경 대상을 표시합니다."],
          ["children", "확인·취소 버튼을 구성합니다."],
        ]}
      >
        <DialogDemo />
      </ComponentReference>
      <ComponentReference
        id="bottom-action-bar"
        title="BottomActionBar"
        description="스크롤 영역 하단에 주요 행동을 유지합니다."
        usage="예시 안을 스크롤해 하단 고정을 확인하세요. 문서 페이지 전체가 아닌 이 예시 영역에만 고정됩니다."
        properties={[
          [
            "children",
            "금액과 버튼을 구성합니다. 실행 상태는 부모에서 관리합니다.",
          ],
          [
            "className",
            "데스크톱에서는 static 등으로 배치를 변경할 수 있습니다.",
          ],
          [
            "배치",
            "스크롤 컨테이너의 마지막 요소로 배치합니다. 하단 safe area는 컴포넌트가 처리합니다.",
          ],
        ]}
      >
        <BottomActionBarDemo />
      </ComponentReference>
    </>
  );
}
