"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api } from "@/lib/api";
import { safeInternalPath } from "@/lib/navigation";
import { useSessionStore } from "@/lib/session-store";
import { Button } from "./ui/button";
import { Field } from "./ui/field";
import { Input } from "./ui/input";
import { Notice } from "./ui/notice";
import { Surface } from "./ui/surface";

const schema = z.object({
  email: z.string().email("이메일을 확인해주세요."),
  password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다."),
});

type LoginForm = z.infer<typeof schema>;

export function LoginPage() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/mypage";
  const setSession = useSessionStore((state) => state.setSession);
  const form = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const login = useMutation({
    mutationFn: api.signin,
    onSuccess: async (data) => {
      setSession({ accessToken: data.accessToken, memberID: data.memberID, role: data.role });
      if (data.role === "MEMBER") {
        try {
          const onboarding = await api.getOnboarding(data.accessToken);
          if (["NOT_STARTED", "IN_PROGRESS"].includes(onboarding.status)) {
            router.replace("/onboarding/preferences");
            return;
          }
        } catch {
          // Login must remain available when the optional onboarding endpoint is unavailable.
        }
      }
      router.push(safeInternalPath(next));
    },
  });

  return (
    <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-md items-center px-4 pb-24">
      <Surface className="w-full" padding="lg">
      <form onSubmit={form.handleSubmit((values) => login.mutate(values))}>
        <h1 className="text-2xl font-black">로그인</h1>
        <p className="mt-2 text-sm text-muted">등록된 계정으로 로그인합니다.</p>
        <div className="mt-6 space-y-4">
          <Field label="이메일" htmlFor="login-email" error={form.formState.errors.email?.message} required>
            <Input id="login-email" autoComplete="email" state={form.formState.errors.email ? "error" : "default"} {...form.register("email")} />
          </Field>
          <Field label="비밀번호" htmlFor="login-password" error={form.formState.errors.password?.message} required>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              state={form.formState.errors.password ? "error" : "default"}
              {...form.register("password")}
            />
          </Field>
        </div>
        {login.error ? <Notice className="mt-4" tone="error" title="로그인하지 못했습니다.">{login.error.message}</Notice> : null}
        <Button className="mt-6 w-full" size="lg" disabled={login.isPending}>
          로그인
        </Button>
        <Link href="/register" className="mt-4 block text-center text-sm font-bold text-muted">
          계정 만들기
        </Link>
      </form>
      </Surface>
    </main>
  );
}
