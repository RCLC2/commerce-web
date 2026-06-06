"use client";

import { create } from "zustand";

type SessionState = {
  accessToken: string | null;
  memberID: number | null;
  role: string | null;
  sellerContext: { marketID: number; marketName: string; token: string } | null;
  setSession: (session: { accessToken: string; memberID: number; role: string }) => void;
  setSellerContext: (context: { marketID: number; marketName: string; token: string }) => void;
  clearSellerContext: () => void;
  logout: () => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  accessToken: typeof window === "undefined" ? null : window.localStorage.getItem("commerce.accessToken"),
  memberID:
    typeof window === "undefined"
      ? null
      : Number(window.localStorage.getItem("commerce.memberID")) || null,
  role: typeof window === "undefined" ? null : window.localStorage.getItem("commerce.role"),
  sellerContext:
    typeof window === "undefined"
      ? null
      : JSON.parse(window.localStorage.getItem("commerce.sellerContext") ?? "null"),
  setSession: ({ accessToken, memberID, role }) => {
    window.localStorage.setItem("commerce.accessToken", accessToken);
    window.localStorage.setItem("commerce.memberID", String(memberID));
    window.localStorage.setItem("commerce.role", role);
    set({ accessToken, memberID, role });
  },
  setSellerContext: (context) => {
    window.localStorage.setItem("commerce.sellerContext", JSON.stringify(context));
    set({ sellerContext: context });
  },
  clearSellerContext: () => {
    window.localStorage.removeItem("commerce.sellerContext");
    set({ sellerContext: null });
  },
  logout: () => {
    window.localStorage.removeItem("commerce.accessToken");
    window.localStorage.removeItem("commerce.memberID");
    window.localStorage.removeItem("commerce.role");
    window.localStorage.removeItem("commerce.sellerContext");
    set({ accessToken: null, memberID: null, role: null, sellerContext: null });
  },
}));
