"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { customerApi } from "@/lib/api/customer";
import { useSessionStore } from "@/lib/session-store";

type ToastNotification = { id: number; title: string; body: string; destinationPath: string };

function toastFromEvent(value: unknown): ToastNotification | null {
  if (!value || typeof value !== "object") return null;
  const notification = (value as { notification?: unknown }).notification;
  if (!notification || typeof notification !== "object") return null;
  const item = notification as { id?: unknown; message?: { title?: unknown; body?: unknown; destination_path?: unknown; toast_enabled?: unknown } };
  if (typeof item.id !== "number" || !item.message?.toast_enabled || typeof item.message.title !== "string" || typeof item.message.body !== "string") return null;
  return { id: item.id, title: item.message.title, body: item.message.body, destinationPath: typeof item.message.destination_path === "string" ? item.message.destination_path : "" };
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const token = useSessionStore((state) => state.accessToken);
  const memberID = useSessionStore((state) => state.memberID);
  const queryClient = useQueryClient();
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const acknowledged = useRef(new Set<number>());
  const acknowledging = useRef(new Set<number>());

  useEffect(() => {
    if (!token || !memberID) return;
    let disposed = false;
    let controller: AbortController | undefined;
    let retry = 500;
    const queueToast = (toast: ToastNotification) => {
      if (acknowledged.current.has(toast.id) || acknowledging.current.has(toast.id)) return;
      acknowledging.current.add(toast.id);
      setToasts((current) => current.some((item) => item.id === toast.id) ? current : [...current, toast].slice(-3));
      void customerApi.acknowledgeNotificationToasts(token, [toast.id]).then(() => {
        acknowledged.current.add(toast.id);
        acknowledging.current.delete(toast.id);
      }).catch(() => { acknowledging.current.delete(toast.id); });
    };
    const loadRecentToast = async () => {
      const page = await customerApi.getNotificationPage(token);
      for (const item of page.items) {
        if (item.toast_shown_at || !item.message.toast_enabled) continue;
        if (item.message.toast_expires_at && new Date(item.message.toast_expires_at) <= new Date()) continue;
        queueToast({ id: item.id, title: item.message.title, body: item.message.body, destinationPath: item.message.destination_path });
      }
    };
    const connect = async () => {
      controller = new AbortController();
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/v1/notifications/stream`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
        if (!response.ok || !response.body) throw new Error(`notification stream failed (${response.status})`);
        retry = 500;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!disposed) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";
          for (const frame of frames) {
            const event = frame.match(/^event:\s*(.+)$/m)?.[1];
            if (event !== "notification.created" && event !== "sync.completed" && event !== "resync.required") continue;
            void queryClient.invalidateQueries({ queryKey: ["notification-inbox"] });
            void queryClient.invalidateQueries({ queryKey: ["notification-unread-count"] });
            if (event === "notification.created") {
              const data = frame.match(/^data:\s*(.+)$/m)?.[1];
              try {
                const toast = toastFromEvent(data ? JSON.parse(data) : null);
                if (toast) queueToast(toast); else void loadRecentToast();
              } catch { void loadRecentToast(); }
            }
          }
        }
      } catch {
        // The Inbox query remains authoritative; reconnect below.
      }
      if (!disposed) { window.setTimeout(connect, retry + Math.round(Math.random() * 250)); retry = Math.min(retry * 2, 10_000); }
    };
    void connect();
    return () => { disposed = true; controller?.abort(); };
  }, [memberID, queryClient, token]);

  return <>{children}<div aria-live="polite" className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-5 z-50 flex w-[min(24rem,calc(100vw-2.5rem))] flex-col gap-3">{toasts.map((toast) => <a className="rounded-xl border border-slate-200 bg-white p-4 shadow-lg transition hover:border-slate-400" href={toast.destinationPath || "/notifications"} key={toast.id} onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}><p className="font-semibold text-slate-900">{toast.title}</p><p className="mt-1 text-sm text-slate-600">{toast.body}</p></a>)}</div></>;
}
