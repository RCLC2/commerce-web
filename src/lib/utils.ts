import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value) + "원";
}

export function discountRate(basePrice: number, discountPrice?: number) {
  if (!discountPrice || discountPrice >= basePrice) {
    return 0;
  }

  return Math.round(((basePrice - discountPrice) / basePrice) * 100);
}
