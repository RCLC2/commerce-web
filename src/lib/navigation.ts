export function safeInternalPath(
  value: string | null | undefined,
  fallback = "/mypage",
  origin = "https://commerce.local",
): string {
  if (
    !value
    || value !== value.trim()
    || !value.startsWith("/")
    || value.startsWith("//")
    || value.includes("\\")
  ) {
    return fallback;
  }

  try {
    const base = new URL(origin);
    const target = new URL(value, base);
    if (target.origin !== base.origin || target.pathname.startsWith("//")) return fallback;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}
