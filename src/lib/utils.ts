import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value) + "원";
}

export function formatFollowerCount(value: number) {
  const count = Math.max(0, Math.trunc(value));
  if (count < 10_000) {
    return new Intl.NumberFormat("ko-KR").format(count);
  }

  return `${Math.floor(count / 1_000) / 10}만`;
}

export function discountRate(basePrice: number, discountPrice?: number) {
  if (!discountPrice || discountPrice >= basePrice) {
    return 0;
  }

  return Math.round(((basePrice - discountPrice) / basePrice) * 100);
}
