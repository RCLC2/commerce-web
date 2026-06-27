"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { api } from "@/lib/api";
import { useSessionStore } from "@/lib/session-store";
import { Button } from "./ui/button";

type ProfileForm = {
  notification_type: string;
  marketing_consent: boolean;
  nighttime_consent: boolean;
};

export function ProfileEditPage() {
  const queryClient = useQueryClient();
  const token = useSessionStore((state) => state.accessToken);
  const effectiveToken = token ?? "";
  const { data: profile } = useQuery({
    queryKey: ["me", effectiveToken],
    queryFn: () => api.me(effectiveToken),
    enabled: Boolean(effectiveToken),
  });
  const form = useForm<ProfileForm>({
    defaultValues: {
      notification_type: "PUSH",
      marketing_consent: true,
      nighttime_consent: false,
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        notification_type: profile.notification_type,
        marketing_consent: profile.marketing_consent,
        nighttime_consent: profile.nighttime_consent,
      });
    }
  }, [form, profile]);

  const update = useMutation({
    mutationFn: (values: ProfileForm) => api.updateMe(effectiveToken, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["me", effectiveToken] });
    },
  });

  if (!token) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-black">로그인이 필요합니다</h1>
        <Link href="/login">
          <Button className="mt-5">로그인하기</Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-8">
      <h1 className="text-2xl font-black">내 정보 변경</h1>
      <p className="mt-1 text-sm text-muted">저장된 회원 정보를 수정합니다.</p>
      <form className="mt-6 rounded-md border border-line bg-white p-5" onSubmit={form.handleSubmit((values) => update.mutate(values))}>
        <label className="block">
          <span className="text-sm font-bold">알림 방식</span>
          <select className="mt-2 h-11 w-full rounded-md border border-line px-3 outline-none" {...form.register("notification_type")}>
            <option value="PUSH">앱 푸시</option>
            <option value="EMAIL">이메일</option>
            <option value="SMS">문자</option>
          </select>
        </label>
        <label className="mt-5 flex items-center gap-2 text-sm">
          <input type="checkbox" {...form.register("marketing_consent")} />
          마케팅 정보 수신 동의
        </label>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" {...form.register("nighttime_consent")} />
          야간 알림 수신 동의
        </label>
        {update.isSuccess ? <p className="mt-4 text-sm font-bold text-brand">변경사항을 저장했습니다.</p> : null}
        {update.error ? <p className="mt-4 text-sm font-bold text-brand">{update.error.message}</p> : null}
        <Button className="mt-6 w-full" size="lg" disabled={update.isPending}>
          {update.isPending ? "저장 중" : "저장하기"}
        </Button>
      </form>
    </main>
  );
}
