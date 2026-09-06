import { Monitor, Smartphone } from "lucide-react";
import { DocsHero, DocsSection, TokenCard } from "../components/docs-content";
import styles from "../components/docs.module.css";

const colorGroups = [
  { title: "01 / 중립색", colors: [
    ["--commerce-canvas", "#F7F7F8", "페이지 배경.", "var(--commerce-canvas)"],
    ["--commerce-surface", "#FFFFFF", "카드와 입력 영역.", "var(--commerce-surface)"],
    ["--commerce-surface-subtle", "#F3F4F6", "표의 헤더, 보조 영역과 비활성 배경.", "var(--commerce-surface-subtle)"],
    ["--commerce-content-primary", "#17171B", "제목과 가격 등 중요한 정보.", "var(--commerce-content-primary)"],
    ["--commerce-content-secondary", "#5C5E66", "설명과 보조 정보. 흰 표면에서 6:1 이상.", "var(--commerce-content-secondary)"],
    ["--commerce-border-subtle", "#E8E9ED", "영역 구분선. 입력 테두리는 border-interactive를 사용합니다.", "var(--commerce-border-subtle)"],
  ] },
  { title: "02 / 브랜드와 행동", colors: [
    ["--commerce-brand", "#FF0077", "브랜드 표시.", "var(--commerce-brand)"],
    ["--commerce-action-primary", "#D90065", "구매·결제 버튼과 작은 링크에 사용하는 대비 안전 색.", "var(--commerce-action-primary)"],
    ["--commerce-action-secondary", "#FFF1F4", "선택된 필터와 보조 행동의 배경.", "var(--commerce-action-secondary)"],
  ] },
  { title: "03 / 상태와 피드백", colors: [
    ["--commerce-status-positive", "#087F5B", "작업 성공과 완료.", "var(--commerce-status-positive)"],
    ["--commerce-status-warning", "#9A5B00", "주의와 확인이 필요한 상태.", "var(--commerce-status-warning)"],
    ["--commerce-status-negative", "#CA2A43", "오류와 위험 상태.", "var(--commerce-status-negative)"],
  ] },
] as const;

export default function FoundationsPage() {
  return <>
    <DocsHero eyebrow="FOUNDATIONS" title="기본 규격" description="색상, 글자 크기, 간격과 화면 크기별 배치 기준입니다." />
    <DocsSection title="Color" description="기본 색상은 핑크와 중립색입니다. 성공·경고·오류에만 상태 색상을 사용합니다.">
      {colorGroups.map((group) => <div key={group.title} className={styles.colorGroup}><h3>{group.title}</h3><div className={styles.tokenGrid}>{group.colors.map(([name, value, description, swatch]) => <TokenCard key={name} name={name} value={value} description={description} swatch={swatch} />)}</div></div>)}
    </DocsSection>
    <DocsSection title="Scale" description="간격은 4px 단위로 조절합니다. 글자와 버튼 크기는 아래 규격을 사용합니다.">
      <div className={styles.scaleGrid}>
        <div className={styles.scaleCard}><h3>Spacing</h3><div className={styles.spacingScale}>{[4, 8, 12, 16, 24, 32, 48, 64].map((size) => <div key={size}><i style={{ height: size }} aria-hidden="true" /><span>{size}</span></div>)}</div><p>--commerce-space-1 … 16<br />4px 기반 · 영역에 따라 조합</p></div>
        <div className={styles.scaleCard}><h3>Typography</h3><div className={styles.typeScale}>{[["Display", "48 / 1.15"], ["Heading", "24 / 1.3"], ["Body", "14 / 1.5"], ["Label / Caption", "12 / 11"]].map(([label, value]) => <div key={label}><strong>{label}</strong><span>{value}</span></div>)}</div><p>문서의 긴 본문은 16px, 설명은 14px.<br />제목은 모바일 30px부터 유연하게 조절합니다.</p></div>
        <div className={styles.scaleCard}><h3>Density</h3><div className={styles.densityScale}><div style={{ minHeight: 44 }}><span>핵심 행동 · 터치</span><strong>44px</strong></div><div style={{ minHeight: 36 }}><span>PC 보조 조작</span><strong>36px</strong></div></div><p>구매·주요 확인·모바일 행동은 44px 이상.<br />작은 화면에서는 정보 묶음을 세로로 배치합니다.</p></div>
      </div>
    </DocsSection>
    <DocsSection title="PC와 모바일" description="1024px부터 사이드바를 표시하고, 640px 미만에서는 운영 표를 카드로 전환합니다.">
      <div className={styles.responsiveGuide}>
        <article><Monitor size={27} strokeWidth={1.5} aria-hidden="true" /><h3>PC · 1024px 이상</h3><p>사이드바와 경로를 표시합니다. 본문 폭을 제한하고 예시를 여러 열로 배치합니다.</p></article>
        <article><Smartphone size={27} strokeWidth={1.5} aria-hidden="true" /><h3>모바일 · 좁은 화면</h3><p>접이식 메뉴와 세로 배치를 사용합니다. 버튼의 터치 영역은 44px 이상입니다.</p></article>
      </div>
    </DocsSection>
    <DocsSection title="Shape & elevation" description="버튼·카드·대화상자에 아래 반경과 그림자를 사용합니다.">
      <div className="grid gap-4 sm:grid-cols-2"><div className={styles.scaleCard}><div className="flex items-end gap-3"><span className="size-10 rounded-control bg-surface-subtle" /><span className="size-12 rounded-surface bg-surface-subtle" /><span className="size-14 rounded-feature bg-surface-subtle" /></div><p>control 12px · surface 16px · feature 24px</p></div><div className={styles.scaleCard}><div className="rounded-control bg-surface-raised p-3 shadow-float"><p className="text-sm font-bold">Floating layer</p><p className="mt-1 text-xs text-content-secondary">modal · dropdown · detached CTA</p></div><p>--commerce-shadow-card · --commerce-shadow-float</p></div></div>
    </DocsSection>
    <DocsSection title="Motion & layer" description="움직임은 상태 변화를 설명할 때만 사용하고, reduced motion 설정을 따릅니다.">
      <div className="grid gap-4 sm:grid-cols-2"><div className={styles.scaleCard}><h3>120 / 160 / 240ms</h3><p>fast · normal · slow<br />하나의 ease-out 곡선으로 통일합니다.</p></div><div className={styles.scaleCard}><h3>레이어 순서</h3><p>base 0 · sticky 20 · CTA 30<br />dropdown 40 · modal 70</p></div></div>
    </DocsSection>
    <DocsSection title="Accessibility" description="색과 함께 라벨·아이콘·키보드 포커스로 의미를 전달합니다."><div className="grid gap-4 sm:grid-cols-3"><div className={styles.scaleCard}><h3>4.5:1</h3><p>일반 텍스트의 최소 명암 대비</p></div><div className={styles.scaleCard}><h3>24px / 44px</h3><p>일반 조작 / 핵심 터치 영역</p></div><div className={styles.scaleCard}><h3>Keyboard</h3><p>보이는 포커스, Escape 닫기와 상태 안내</p></div></div></DocsSection>
  </>;
}
