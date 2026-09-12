"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-client";
import { useSessionStore } from "@/lib/session-store";
import { Button } from "./ui/button";
import { LoginRequiredState } from "./ui/feedback";
import { PageLayout } from "./page-layout";

export function NotificationsPage() {
  const token = useSessionStore((state) => state.accessToken) ?? "";
  const queryClient = useQueryClient();
  const openedBoundary = useRef<string | undefined>(undefined);
  const page = useQuery({ queryKey: ["notification-inbox"], queryFn: () => api.getNotificationPage(token), enabled: Boolean(token) });
  const markAll = useMutation({
    mutationFn: (readThrough: string) => api.markAllNotificationsRead(token, readThrough),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["notification-inbox"] }); void queryClient.invalidateQueries({ queryKey: ["notification-unread-count"] }); },
  });

  useEffect(() => {
    const boundary = page.data?.read_through;
    if (!token || !boundary || openedBoundary.current === boundary || markAll.isPending) return;
    openedBoundary.current = boundary;
    markAll.mutate(boundary);
  }, [page.data?.read_through, markAll, token]);

  if (!token) {
    return (
      <PageLayout className="max-w-3xl">
        <LoginRequiredState
          icon={<Bell className="size-7" />}
          description="새로운 알림을 확인하려면 로그인해주세요."
          loginHref="/login?next=/notifications"
        />
      </PageLayout>
    );
  }
  if (page.isLoading) return <main className="mx-auto max-w-3xl px-4 py-12 text-sm text-muted">알림함을 불러오는 중입니다.</main>;
  if (page.error) return <main className="mx-auto max-w-3xl px-4 py-12"><p className="text-sm font-bold text-brand">{apiErrorMessage(page.error)}</p><Button className="mt-3" size="sm" onClick={() => void page.refetch()}>다시 시도</Button></main>;

  return <main className="mx-auto max-w-3xl px-4 pb-28 pt-7"><h1 className="text-2xl font-black">알림함</h1><p className="mt-1 text-sm text-muted">열람한 시점까지의 알림은 읽음으로 표시됩니다.</p><div className="mt-5 space-y-3">{page.data?.items.map((item) => <article key={item.id} className={`rounded-xl border p-4 ${item.read_at ? "border-line bg-white" : "border-brand/30 bg-brand/5"}`}><div className="flex items-center justify-between gap-3"><p className="font-black">{item.message.title}</p><time className="shrink-0 text-xs text-muted">{new Date(item.created_at).toLocaleString("ko-KR")}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">{item.message.body}</p>{item.message.destination_path ? <Link className="mt-3 inline-block text-sm font-bold text-brand" href={item.message.destination_path}>자세히 보기</Link> : null}</article>)}{!page.data?.items.length ? <p className="rounded-xl border border-line bg-white p-8 text-center text-sm text-muted">알림이 없습니다.</p> : null}</div></main>;
}
