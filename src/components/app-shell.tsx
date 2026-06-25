"use client";

import { useQuery } from "@tanstack/react-query";
import { Camera, Grid2X2, Heart, Home, Menu, Search, ShieldCheck, Star, Store, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useSessionStore } from "@/lib/session-store";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

const nav = [
  { href: "/categories", label: "카테고리", icon: Grid2X2 },
  { href: "/snapshot", label: "스냅샷", icon: Camera },
  { href: "/", label: "홈", icon: Home, primary: true },
  { href: "/likes", label: "좋아요", icon: Heart },
  { href: "/mypage", label: "마이페이지", icon: User },
];

const primaryMenuItems = [
  { href: "/popular-products", label: "인기 상품" },
  { href: "/popular-markets", label: "인기 마켓" },
  { href: "/recommendations", label: "추천 상품" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const role = useSessionStore((state) => state.role);
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

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

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

  return (
    <div className="min-h-screen bg-background">
      {!searchPage ? <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Button variant="ghost" size="icon" aria-label="메뉴" onClick={() => setMenuOpen((value) => !value)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
          <Link href="/" className="text-xl font-black tracking-normal">
            commerce
          </Link>
          <form
            className="relative flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-zinc-50 px-3"
            onSubmit={submitSearch}
          >
            <Search size={18} className="shrink-0 text-muted" />
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
              className="w-full bg-transparent text-sm outline-none"
              placeholder="상품, 마켓, 키워드 검색"
              aria-label="통합 검색"
            />
            {showSuggestions ? (
              <div className="absolute left-0 right-0 top-12 z-40 overflow-hidden rounded-md border border-line bg-white shadow-xl">
                {suggestions.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-zinc-50"
                    onClick={() => {
                      setSearch(item.label);
                      setSearchFocused(false);
                    }}
                  >
                    <span className="font-bold">{item.label}</span>
                    <span className="text-xs text-muted">
                      {item.type === "PRODUCT" ? "상품" : item.type === "MARKET" ? "마켓" : "키워드"}
                    </span>
                  </Link>
                ))}
              </div>
            ) : null}
          </form>
          {role === "SELLER" ? (
            <Link href="/seller" aria-label="셀러 콘솔">
              <Button variant="ghost" size="icon" title="셀러 콘솔">
                <Store size={20} />
              </Button>
            </Link>
          ) : null}
          {role === "ADMIN" ? (
            <Link href="/admin" aria-label="어드민 콘솔">
              <Button variant="ghost" size="icon" title="어드민 콘솔">
                <ShieldCheck size={20} />
              </Button>
            </Link>
          ) : null}
          <Link href="/mypage" aria-label="마이페이지">
            <Button variant="ghost" size="icon">
              <User size={20} />
            </Button>
          </Link>
        </div>
      </header> : null}
      {menuOpen ? (
        <div className="fixed inset-0 z-50">
          <button className="absolute inset-0 bg-black/25" aria-label="메뉴 닫기" onClick={() => setMenuOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-[min(360px,88vw)] min-w-0 flex-col overflow-y-auto border-r border-line bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <p className="text-lg font-black">메뉴</p>
              <Button variant="ghost" size="icon" aria-label="메뉴 닫기" onClick={() => setMenuOpen(false)}>
                <X size={20} />
              </Button>
            </div>
            <div className="mt-4 grid gap-2">
              {primaryMenuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-md border border-line px-4 py-3 text-sm font-bold hover:bg-zinc-50"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="my-4 border-t border-line" />
            <div className="rounded-md border border-line bg-zinc-50 p-3">
              <div className="flex items-center gap-2 text-sm font-black">
                <Star size={16} className="text-brand" />
                상품 카테고리
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {categories.slice(0, 6).map((category) => (
                  <Link
                    key={category.id}
                    href={category.href}
                    onClick={() => setMenuOpen(false)}
                    className="min-w-0 rounded-md bg-white px-3 py-2 text-sm font-bold hover:bg-zinc-100"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      ) : null}
      {children}
      <footer className="border-t border-line bg-white pb-20">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm text-muted md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <p className="text-lg font-black text-foreground">commerce</p>
            <p className="mt-2 leading-6">
              지금 사고 싶은 스타일과 좋아하는 마켓을 빠르게 탐색하는 패션 커머스 서비스입니다.
            </p>
          </div>
          <div>
            <p className="font-black text-foreground">서비스</p>
            <div className="mt-3 grid gap-2">
              <Link href="/popular-products" className="hover:text-foreground">인기 상품</Link>
              <Link href="/popular-markets" className="hover:text-foreground">인기 마켓</Link>
              <Link href="/recommendations" className="hover:text-foreground">추천 상품</Link>
            </div>
          </div>
          <div>
            <p className="font-black text-foreground">고객 지원</p>
            <div className="mt-3 grid gap-2">
              <Link href="/mypage" className="hover:text-foreground">마이페이지</Link>
              <Link href="/cart" className="hover:text-foreground">장바구니</Link>
              <Link href="/login" className="hover:text-foreground">로그인</Link>
            </div>
          </div>
        </div>
      </footer>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur">
        <div className="mx-auto grid h-16 max-w-6xl grid-cols-5 px-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-md text-xs font-bold text-muted transition hover:text-foreground",
                  item.primary && "mx-auto -mt-4 h-16 w-16 rounded-full border border-line bg-white text-muted shadow-lg",
                  active && !item.primary && "text-brand",
                  active && item.primary && "bg-brand text-white",
                )}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
