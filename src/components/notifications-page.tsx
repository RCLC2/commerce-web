"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell as PageIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-client";
import { useSessionStore } from "@/lib/session-store";
import { PageLayout } from "./page-layout";
import { Button } from "./ui/button";
import { EmptyState, InlineLoadingState, LoginRequiredState } from "./ui/feedback";
import { PageHeading } from "./ui/page-heading";

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
        <PageHeading icon={<PageIcon />} title="알림함" description="새로운 소식과 쇼핑 관련 알림을 한곳에서 확인하세요." />
        <LoginRequiredState
          className="mt-6"
          icon={<PageIcon className="size-7" />}
          description="새로운 알림을 확인하려면 로그인해주세요."
          loginHref="/login?next=/notifications"
        />
      </PageLayout>
    );
  }
  if (page.isLoading) return <PageLayout className="max-w-3xl"><PageHeading icon={<PageIcon />} title="알림함" description="새로운 소식과 쇼핑 관련 알림을 한곳에서 확인하세요." /><InlineLoadingState className="mt-6" label="알림함을 불러오는 중입니다." /></PageLayout>;
  if (page.error) return <PageLayout className="max-w-3xl"><PageHeading icon={<PageIcon />} title="알림함" description="새로운 소식과 쇼핑 관련 알림을 한곳에서 확인하세요." /><div className="mt-6 rounded-control border border-status-negative-border bg-status-negative-subtle p-5 text-sm" role="alert"><p className="font-bold text-status-negative">{apiErrorMessage(page.error)}</p><Button className="mt-3" size="sm" variant="secondary" onClick={() => void page.refetch()}>다시 시도</Button></div></PageLayout>;

  return <PageLayout className="max-w-3xl">
    <PageHeading icon={<PageIcon />} title="알림함" description="열람한 시점까지의 알림은 읽음으로 표시됩니다." />
    <div className="mt-6 space-y-3">
      {page.data?.items.map((item) => (
        <article key={item.id} className={`rounded-surface border p-4 shadow-card ${item.read_at ? "border-border-subtle bg-surface-raised" : "border-action-primary/30 bg-action-secondary/45"}`}>
          <div className="flex items-center justify-between gap-3"><p className="font-bold text-content-primary">{item.message.title}</p><time className="shrink-0 text-xs text-content-secondary">{new Date(item.created_at).toLocaleString("ko-KR")}</time></div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-content-secondary">{item.message.body}</p>
          {item.message.destination_path ? <Link className="mt-3 inline-block text-sm font-bold text-action-primary hover:underline" href={item.message.destination_path}>자세히 보기</Link> : null}
        </article>
      ))}
      {!page.data?.items.length ? <EmptyState icon={<PageIcon className="size-7" />} title="새 알림이 없습니다" description="새로운 소식이 도착하면 이곳에서 확인할 수 있어요." /> : null}
    </div>
  </PageLayout>;
}
