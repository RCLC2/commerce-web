"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useSessionStore } from "@/lib/session-store";
import { Button } from "./ui/button";

type ProfileForm = { notification_type: string; marketing_consent: boolean; nighttime_consent: boolean; height: number; weight: number };

export function ProfileEditPage() {
  const token = useSessionStore((state) => state.accessToken) ?? "";
  const memberID = useSessionStore((state) => state.memberID);
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: queryKeys.me(memberID), queryFn: () => api.me(token), enabled: Boolean(token) });
  const [edited, setEdited] = useState<{ memberID: number | null; values: ProfileForm } | null>(null);
  const editedValues = edited?.memberID === memberID ? edited.values : null;
  const values: ProfileForm | null = editedValues ?? (profile.data ? {
    notification_type: profile.data.notification_type,
    marketing_consent: profile.data.marketing_consent,
    nighttime_consent: profile.data.nighttime_consent,
    height: profile.data.height,
    weight: profile.data.weight,
  } : null);
  const change = (next: Partial<ProfileForm>) => {
    if (values) setEdited({ memberID, values: { ...values, ...next } });
  };

  const save = useMutation({
    mutationFn: () => {
      if (!values) throw new Error("프로필을 먼저 불러와야 합니다.");
      return api.updateMe(token, values);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.me(memberID), data);
      setEdited(null);
    },
  });

  if (!token) return <main className="mx-auto max-w-3xl px-4 py-16"><h1 className="text-2xl font-black">로그인이 필요합니다</h1><Link href="/login"><Button className="mt-5">로그인하기</Button></Link></main>;
  if (profile.isLoading || (!profile.data && !profile.error)) return <main className="mx-auto max-w-2xl px-4 py-16 text-sm text-muted">프로필을 불러오는 중입니다.</main>;
  if (!profile.data || !values) return <main className="mx-auto max-w-2xl px-4 py-16"><p className="text-sm font-bold text-brand">{apiErrorMessage(profile.error)}</p><Button className="mt-3" size="sm" variant="secondary" onClick={() => void profile.refetch()}>다시 시도</Button></main>;

  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-8">
      <Link href="/mypage" className="inline-flex items-center gap-1 text-sm font-bold text-muted hover:text-foreground"><ArrowLeft size={17} /> 뒤로가기</Link>
      <h1 className="mt-5 text-2xl font-black">사용자 상세 정보 수정</h1>
      <p className="mt-2 text-sm text-muted">알림 수신 설정과 리뷰에 활용할 신체 정보를 변경합니다.</p>
      <form className="mt-6 space-y-5 rounded-2xl border border-line bg-white p-5" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
        <Field label="이메일"><input className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm disabled:bg-zinc-50" value={profile.data?.email ?? ""} disabled /></Field>
        <Field label="알림 방식">
          <select className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm" value={values.notification_type} onChange={(event) => change({ notification_type: event.target.value })}>
            <option value="PUSH">푸시</option><option value="EMAIL">이메일</option><option value="SMS">문자</option><option value="NONE">받지 않음</option>
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="키 (cm)"><input className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm" type="number" min="0" max="300" value={values.height} onChange={(event) => change({ height: Number(event.target.value) })} /></Field>
          <Field label="몸무게 (kg)"><input className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm" type="number" min="0" max="500" value={values.weight} onChange={(event) => change({ weight: Number(event.target.value) })} /></Field>
        </div>
        <label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={values.marketing_consent} onChange={(event) => change({ marketing_consent: event.target.checked })} /> 마케팅 정보 수신 동의</label>
        <label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={values.nighttime_consent} onChange={(event) => change({ nighttime_consent: event.target.checked })} /> 야간 알림 수신 동의</label>
        {profile.error || save.error ? <p className="text-sm font-bold text-brand">{apiErrorMessage(profile.error ?? save.error)}</p> : null}
        {save.isSuccess ? <p className="text-sm font-bold text-emerald-700">저장했습니다.</p> : null}
        <Button type="submit" disabled={save.isPending}>{save.isPending ? "저장 중" : "변경사항 저장"}</Button>
      </form>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-sm font-bold">{label}</span><span className="mt-2 block">{children}</span></label>;
}
