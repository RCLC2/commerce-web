export function scrollCarouselByCard(container: HTMLElement | null, direction: -1 | 1) {
  if (!container) return;

  const firstCard = container.firstElementChild;
  const gap = Number.parseFloat(window.getComputedStyle(container).columnGap || "0") || 0;
  const cardWidth = firstCard instanceof HTMLElement ? firstCard.getBoundingClientRect().width : 0;
  const step = cardWidth + gap || container.clientWidth * 0.8;
  const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
  const nextScrollLeft = Math.max(0, Math.min(maxScrollLeft, container.scrollLeft + direction * step));

  container.scrollTo({ left: nextScrollLeft, behavior: "smooth" });
}
