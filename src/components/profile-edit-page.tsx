"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useSessionStore } from "@/lib/session-store";
import { Button } from "./ui/button";

export function ProfileEditPage() {
  const token = useSessionStore((state) => state.accessToken);
  const effectiveToken = token ?? "";
  const profile = useQuery({
    queryKey: queryKeys.me(effectiveToken),
    queryFn: () => api.me(effectiveToken),
    enabled: Boolean(effectiveToken),
  });

  if (!token) {
    return <main className="mx-auto max-w-3xl px-4 py-16"><h1 className="text-2xl font-black">로그인이 필요합니다</h1><Link href="/login"><Button className="mt-5">로그인하기</Button></Link></main>;
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-8">
      <h1 className="text-2xl font-black">프로필</h1>
      <p className="mt-2 text-sm text-muted">현재 서버는 프로필 변경 내용을 저장하지 않아 조회 전용으로 제공합니다.</p>
      {profile.isError ? (
        <div className="mt-5 rounded-md border border-brand/30 bg-red-50 p-4 text-sm">
          <p className="font-bold text-brand">{apiErrorMessage(profile.error)}</p>
          <Button className="mt-3" size="sm" variant="secondary" onClick={() => void profile.refetch()}>다시 시도</Button>
        </div>
      ) : null}
      <section className="mt-6 space-y-4 rounded-md border border-line bg-white p-5">
        <ReadOnlyField label="이메일" value={profile.data?.email ?? "-"} />
        <ReadOnlyField label="알림 방식" value={profile.data?.notification_type ?? "-"} />
        <ReadOnlyField label="마케팅 정보 수신" value={profile.data?.marketing_consent ? "동의" : "미동의"} />
        <ReadOnlyField label="야간 알림 수신" value={profile.data?.nighttime_consent ? "동의" : "미동의"} />
        <div className="rounded-md bg-amber-50 p-3 text-sm font-bold text-amber-800">프로필 수정 API가 구현되면 편집 기능을 제공할 예정입니다.</div>
      </section>
    </main>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return <div><p className="text-sm font-bold">{label}</p><p className="mt-2 min-h-11 rounded-md border border-line bg-zinc-50 px-3 py-3 text-sm text-muted">{value}</p></div>;
}
