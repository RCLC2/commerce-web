"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { useSessionStore } from "@/lib/session-store";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const token = useSessionStore((state) => state.accessToken);
  const memberID = useSessionStore((state) => state.memberID);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token || !memberID) return;
    let disposed = false;
    let controller: AbortController | undefined;
    let retry = 500;
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
            if (event === "notification.created" || event === "sync.completed" || event === "resync.required") {
              void queryClient.invalidateQueries({ queryKey: ["notification-inbox"] });
              void queryClient.invalidateQueries({ queryKey: ["notification-unread-count"] });
            }
          }
        }
      } catch {
        // Reconnect below; the server remains authoritative through query invalidation.
      }
      if (!disposed) { window.setTimeout(connect, retry + Math.round(Math.random() * 250)); retry = Math.min(retry * 2, 10_000); }
    };
    void connect();
    return () => { disposed = true; controller?.abort(); };
  }, [memberID, queryClient, token]);
  return children;
}
