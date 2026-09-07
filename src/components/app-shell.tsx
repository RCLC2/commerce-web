"use client";

import { ButtonLink } from "@/components/ui/button-link";

import { useQuery } from "@tanstack/react-query";
import { Grid2X2, Heart, Home, Menu, Search, ShieldCheck, Shirt, ShoppingBag, Star, Store, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useSessionStore } from "@/lib/session-store";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Drawer } from "./ui/overlay";

const nav = [
  { href: "/categories", label: "카테고리", icon: Grid2X2 },
  { href: "/markets", label: "마켓", icon: Store },
  { href: "/today-outfit", label: "오늘의 코디", icon: Shirt },
  { href: "/", label: "홈", icon: Home, primary: true },
  { href: "/likes", label: "좋아요", icon: Heart },
  { href: "/cart", label: "장바구니", icon: ShoppingBag },
  { href: "/mypage", label: "마이페이지", icon: User },
];

const primaryMenuItems = [
  { href: "/popular-products", label: "인기 상품" },
  { href: "/markets", label: "마켓" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const role = useSessionStore((state) => state.role);
  const token = useSessionStore((state) => state.accessToken);
  const logout = useSessionStore((state) => state.logout);
  const hydrateSession = useSessionStore((state) => state.hydrate);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const { data: suggestions = [] } = useQuery({
    queryKey: ["global-search-suggestions", search.trim()],
    queryFn: () => api.searchSuggestions(search),
    enabled: search.trim().length > 0,
  });
  const { data: categories = [] } = useQuery({
    queryKey: queryKeys.categories,
    queryFn: api.listCategories,
  });

  const isActive = (href: string) => (href === "/" ? pathname === href : pathname.startsWith(href));
  const showSuggestions = searchFocused && suggestions.length > 0;
  const searchPage = pathname.startsWith("/search");
  const onboardingPage = pathname.startsWith("/onboarding/");
  const rootCategories = categories.filter((category) => !category.parent_id && category.level === 1);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
      const next = window.location.pathname + window.location.search;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    };
    window.addEventListener("commerce:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("commerce:unauthorized", handleUnauthorized);
  }, [logout, router]);

  useEffect(() => {
    if (pathname === "/search") {
      searchInputRef.current?.focus();
    }
  }, [pathname]);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
    setSearchFocused(false);
  }

  if (onboardingPage) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-canvas">
      {!searchPage ? <header className="sticky top-0 z-30 border-b border-border-subtle bg-surface-raised/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-1 px-3 sm:gap-3 sm:px-4">
          <Button variant="ghost" size="icon" aria-label="메뉴" aria-expanded={menuOpen} aria-controls="shopping-menu" onClick={() => setMenuOpen((value) => !value)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
          <Link href="/" className="shrink-0 whitespace-nowrap text-lg font-bold tracking-normal sm:text-xl">
            commerce
          </Link>
          <ButtonLink href="/search" aria-label="통합 검색" variant="ghost" size="icon" className="ml-auto sm:hidden">
            <Search size={20} />
          </ButtonLink>
          <form
            className="relative hidden h-11 min-w-0 flex-1 items-center gap-2 rounded-control border border-border-interactive bg-surface-subtle px-3 transition hover:border-action-primary focus-within:border-action-primary focus-within:bg-surface-raised focus-within:ring-4 focus-within:ring-action-primary/10 sm:flex"
            onSubmit={submitSearch}
          >
            <Search size={18} className="shrink-0 text-content-secondary" />
            <input
              ref={searchInputRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onFocus={() => {
                if (!pathname.startsWith("/search")) {
                  router.push(search.trim() ? `/search?q=${encodeURIComponent(search.trim())}` : "/search");
                  return;
                }
                setSearchFocused(true);
              }}
              onBlur={() => window.setTimeout(() => setSearchFocused(false), 120)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-content-tertiary"
              placeholder="상품, 마켓, 키워드 검색"
              aria-label="통합 검색"
            />
            {showSuggestions ? (
              <div className="absolute left-0 right-0 top-12 z-40 overflow-hidden rounded-surface border border-border-subtle bg-surface-raised shadow-float">
                {suggestions.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-surface-subtle"
                    onClick={() => {
                      setSearch(item.label);
                      setSearchFocused(false);
                    }}
                  >
                    <span className="font-bold">{item.label}</span>
                    <span className="text-xs text-content-secondary">
                      {item.type === "PRODUCT" ? "상품" : item.type === "MARKET" ? "마켓" : "키워드"}
                    </span>
                  </Link>
                ))}
              </div>
            ) : null}
          </form>
          {role === "SELLER" ? (
            <ButtonLink href="/seller" aria-label="판매자 관리" variant="ghost" size="icon" title="판매자 관리" className="hidden sm:inline-flex">
                <Store size={20} />
              </ButtonLink>
          ) : null}
          {role === "ADMIN" ? (
            <ButtonLink href="/admin" aria-label="관리자 도구" variant="ghost" size="icon" title="관리자 도구" className="hidden sm:inline-flex">
                <ShieldCheck size={20} />
              </ButtonLink>
          ) : null}
          <ButtonLink href="/cart" aria-label="장바구니" variant="ghost" size="icon" title="장바구니">
              <ShoppingBag size={20} />
            </ButtonLink>
          <ButtonLink href="/mypage" aria-label="마이페이지" variant="ghost" size="icon">
              <User size={20} />
            </ButtonLink>
        </div>
      </header> : null}
      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} title="메뉴" id="shopping-menu">
            <div className="mt-4 grid gap-2">
              {role === "SELLER" || role === "ADMIN" ? (
                <ButtonLink href={role === "SELLER" ? "/seller" : "/admin"} variant="secondary" onClick={() => setMenuOpen(false)}>
                  {role === "SELLER" ? <Store size={18} /> : <ShieldCheck size={18} />}
                  {role === "SELLER" ? "판매자 관리" : "관리자 도구"}
                </ButtonLink>
              ) : null}
              {primaryMenuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-md border border-border-subtle px-4 py-3 text-sm font-bold hover:bg-surface-subtle"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="my-4 border-t border-border-subtle" />
            <div className="rounded-md border border-border-subtle bg-surface-subtle p-3">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Star size={16} className="text-action-primary" />
                상품 카테고리
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {rootCategories.slice(0, 6).map((category) => (
                  <Link
                    key={category.id}
                    href={category.href}
                    onClick={() => setMenuOpen(false)}
                    className="min-w-0 rounded-md bg-surface-raised px-3 py-2 text-sm font-bold hover:bg-surface-subtle"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </div>
      </Drawer>
      {children}
      <footer className={cn("border-t border-border-subtle bg-surface-raised", /^\/products\/\d+\/?$/.test(pathname) ? "pb-[calc(10rem+env(safe-area-inset-bottom))]" : "pb-[calc(5rem+env(safe-area-inset-bottom))]")}>
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-5 gap-y-5 px-4 py-6 text-sm text-content-secondary md:grid-cols-[1.2fr_1fr_1fr] md:gap-6">
          <div className="col-span-2 md:col-span-1">
            <p className="text-lg font-bold text-content-primary">commerce</p>
            <p className="mt-1 text-xs leading-5">
              좋아하는 스타일과 마켓을 한곳에서.
            </p>
          </div>
          <div>
            <p className="font-bold text-content-primary">쇼핑</p>
            <div className="mt-2 grid [&>a]:flex [&>a]:min-h-11 [&>a]:items-center">
              <Link href="/categories" className="hover:text-content-primary hover:underline">카테고리별 상품</Link>
              <Link href="/markets" className="hover:text-content-primary hover:underline">마켓</Link>
            </div>
          </div>
          <div>
            <p className="font-bold text-content-primary">내 쇼핑</p>
            <div className="mt-2 grid [&>a]:flex [&>a]:min-h-11 [&>a]:items-center">
              {token ? (
                <>
                  <Link href="/mypage" className="hover:text-content-primary hover:underline">주문 조회</Link>
                  <Link href="/cart" className="hover:text-content-primary hover:underline">장바구니</Link>
                  <Link href="/likes" className="hover:text-content-primary hover:underline">좋아요</Link>
                  <Button variant="ghost" type="button" className="w-fit min-h-11 px-0 text-left hover:text-action-primary hover:underline" onClick={() => { logout(); router.push("/"); }}>로그아웃</Button>
                </>
              ) : <Link href="/login" className="hover:text-content-primary hover:underline">로그인</Link>}
            </div>
          </div>
        </div>
      </footer>
      <nav className="fixed inset-x-0 bottom-0 z-50 isolate border-t border-border-subtle bg-surface-raised/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgb(23_23_27_/_6%)] backdrop-blur" aria-label="하단 주요 메뉴">
        <div className="mx-auto grid h-16 max-w-6xl grid-cols-7 px-1" data-session-role={role ?? "guest"}>
          {nav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "min-w-0 flex flex-col items-center justify-start gap-1 rounded-md pt-2 text-xs font-medium leading-4 text-content-secondary transition hover:text-content-primary",
                  item.primary && "mx-auto -mt-4 h-14 w-14 justify-center pt-0 rounded-full border border-border-subtle bg-surface-raised text-content-secondary shadow-lg sm:h-16 sm:w-16",
                  active && !item.primary && "text-action-primary",
                  active && item.primary && "border-action-primary bg-action-primary text-content-on-brand hover:bg-button-primary-hover hover:text-content-on-brand",
                )}
              >
                <Icon size={20} aria-hidden="true" strokeWidth={active ? 2.5 : 2} />
                <span className="w-full text-center break-keep">{item.href === "/mypage" ? <>마이<wbr className="sm:hidden" />페이지</> : item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
