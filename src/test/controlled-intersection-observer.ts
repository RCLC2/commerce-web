export class ControlledIntersectionObserver implements IntersectionObserver {
  static instances: ControlledIntersectionObserver[] = [];
  readonly root = null;
  readonly rootMargin: string;
  readonly thresholds = [0];
  target: Element | null = null;

  constructor(private readonly callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.rootMargin = options?.rootMargin ?? "0px";
    ControlledIntersectionObserver.instances.push(this);
  }

  observe(target: Element) { this.target = target; }
  unobserve(target: Element) { if (this.target === target) this.target = null; }
  disconnect() { this.target = null; }
  takeRecords() { return []; }

  intersect() {
    if (!this.target) return;
    this.callback([{ isIntersecting: true, target: this.target } as IntersectionObserverEntry], this);
  }

  static forLabel(label: string) {
    return ControlledIntersectionObserver.instances.filter((observer) => observer.target?.getAttribute("aria-label") === `${label} 이어 불러오기`).at(-1);
  }
}
