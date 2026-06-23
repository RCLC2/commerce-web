"use client";

import { create } from "zustand";

type SessionState = {
  accessToken: string | null;
  memberID: number | null;
  role: string | null;
  sellerContext: { marketID: number; marketName: string; token: string; expiresAt?: string } | null;
  hydrate: () => void;
  setSession: (session: { accessToken: string; memberID: number; role: string }) => void;
  setSellerContext: (context: { marketID: number; marketName: string; token: string; expiresAt?: string }) => void;
  clearSellerContext: () => void;
  logout: () => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  accessToken: null,
  memberID: null,
  role: null,
  sellerContext: null,
  hydrate: () => {
    if (typeof window === "undefined") {
      return;
    }
    set({
      accessToken: window.localStorage.getItem("commerce.accessToken"),
      memberID: Number(window.localStorage.getItem("commerce.memberID")) || null,
      role: window.localStorage.getItem("commerce.role"),
      sellerContext: parseSellerContext(window.localStorage.getItem("commerce.sellerContext")),
    });
  },
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

function parseSellerContext(value: string | null) {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value) as { marketID: number; marketName: string; token: string; expiresAt?: string };
  } catch {
    return null;
  }
}
