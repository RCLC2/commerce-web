"use client";

import { create } from "zustand";

type SessionState = {
  accessToken: string | null;
  memberID: number | null;
  setSession: (session: { accessToken: string; memberID: number }) => void;
  logout: () => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  accessToken: typeof window === "undefined" ? null : window.localStorage.getItem("commerce.accessToken"),
  memberID:
    typeof window === "undefined"
      ? null
      : Number(window.localStorage.getItem("commerce.memberID")) || null,
  setSession: ({ accessToken, memberID }) => {
    window.localStorage.setItem("commerce.accessToken", accessToken);
    window.localStorage.setItem("commerce.memberID", String(memberID));
    set({ accessToken, memberID });
  },
  logout: () => {
    window.localStorage.removeItem("commerce.accessToken");
    window.localStorage.removeItem("commerce.memberID");
    set({ accessToken: null, memberID: null });
  },
}));
