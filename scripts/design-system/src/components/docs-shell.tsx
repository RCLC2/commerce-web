"use client";

import { BookOpen, Boxes, BriefcaseBusiness, ChevronDown, Layers3, Menu, Palette, ShieldCheck, ShoppingBag } from "lucide-react";
import { useRef } from "react";
import styles from "./docs.module.css";

const navigation = [
  { href: "index.html", label: "Overview", description: "문서 안내", icon: BookOpen, section: "overview" },
  { href: "foundations.html", label: "Foundations", description: "색상 · 글자 · 간격", icon: Palette, section: "foundations" },
  { href: "components.html", label: "Components", description: "사용법과 동작 예시", icon: Boxes, section: "components" },
  { href: "commerce.html", label: "Commerce", description: "고객의 탐색과 구매", icon: ShoppingBag, section: "commerce" },
  { href: "seller.html", label: "Seller", description: "주문과 판매 운영", icon: BriefcaseBusiness, section: "seller" },
  { href: "admin.html", label: "Admin", description: "권한과 운영 검토", icon: ShieldCheck, section: "admin" },
  { href: "patterns.html", label: "Patterns", description: "화면 조합과 상태", icon: Layers3, section: "patterns" },
] as const;

function Wordmark() {
  return <a href="index.html" className={styles.wordmark} aria-label="Commerce UI 문서 홈"><span className={styles.brandMark}>c<span>.</span></span><span>commerce<span className={styles.wordmarkSuffix}> / ui</span></span></a>;
}

export function DocsShell({ children, page }: { children: React.ReactNode; page: string }) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const current = navigation.find((item) => item.section === page) ?? navigation[0];

  function closeMenu() {
    if (menuRef.current) menuRef.current.open = false;
  }

  function renderNavigation() {
    return navigation.map((item, index) => {
      const Icon = item.icon;
      const active = item.section === current.section;
      return <div key={item.href}>
        {index === 0 || index === 3 || index === 6 ? <p className={styles.navGroup}>{index === 0 ? "시작하기" : index === 3 ? "서비스별 가이드" : "화면 구성"}</p> : null}
        <a href={item.href} aria-current={active ? "page" : undefined} className={styles.navLink} data-section={item.section} onClick={closeMenu}>
          <Icon size={18} strokeWidth={1.7} aria-hidden="true" />
          <span><span className={styles.navLabel}>{item.label}</span><span className={styles.navDescription}>{item.description}</span></span>
          {active ? <span className={styles.activeDot} aria-hidden="true" /> : null}
        </a>
      </div>;
    });
  }

  return (
    <div className={styles.shell} data-section={current.section}>
      <a href="#docs-main" className={styles.skipLink}>본문으로 건너뛰기</a>
      <aside className={styles.sidebar}>
        <Wordmark />
        <p className={styles.sidebarCaption}>DESIGN SYSTEM <span>v1.0</span></p>
        <nav className={styles.desktopNav} aria-label="디자인 시스템 문서">{renderNavigation()}</nav>
        <div className={styles.sidebarFooter}><span className={styles.release}><span />Light · v1.0</span></div>
      </aside>
      <div className={styles.content}>
        <header className={styles.topbar}>
          <div className={styles.mobileBrand}><Wordmark /></div>
          <p className={styles.breadcrumb}><span>Design system</span><span aria-hidden="true">/</span>{current.label}</p>
          <span className={styles.topbarNote}>Commerce UI <span>1.0</span></span>
        </header>
        <details key={page} ref={menuRef} className={styles.mobileMenu} onKeyDown={(event) => {
          if (event.key === "Escape" && menuRef.current?.open) {
            event.preventDefault();
            closeMenu();
            menuRef.current.querySelector("summary")?.focus();
          }
        }}>
          <summary><Menu size={18} aria-hidden="true" /><span>{current.label}</span><span className={styles.menuHint}>문서 메뉴</span><ChevronDown size={16} className={styles.menuChevron} aria-hidden="true" /></summary>
          <nav aria-label="디자인 시스템 문서">{renderNavigation()}</nav>
        </details>
        <main id="docs-main" tabIndex={-1} className={styles.main}>{children}</main>
        <footer className={styles.pageFooter}><span>Commerce UI / Design system</span><span>예시는 고정 데이터로 동작합니다.</span></footer>
      </div>
    </div>
  );
}
