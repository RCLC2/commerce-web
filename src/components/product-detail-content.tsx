"use client";

import type { ComponentPropsWithRef } from "react";
import { useRouter } from "next/navigation";

/** Keeps authored internal links in the same app navigation context. */
export function ProductDetailContent({ html, ...props }: { html: string } & Omit<ComponentPropsWithRef<"div">, "children" | "dangerouslySetInnerHTML" | "onClick">) {
  const router = useRouter();
  return <div {...props} dangerouslySetInnerHTML={{ __html: html }} onClick={(event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!(anchor instanceof HTMLAnchorElement) || !event.currentTarget.contains(anchor) || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    event.preventDefault();
    router.push(`${url.pathname}${url.search}${url.hash}`);
  }} />;
}
