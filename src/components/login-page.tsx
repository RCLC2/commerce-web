"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api } from "@/lib/api";
import { useSessionStore } from "@/lib/session-store";
import { Button } from "./ui/button";

const schema = z.object({
  email: z.string().email("이메일을 확인해주세요."),
  password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다."),
});

type LoginForm = z.infer<typeof schema>;

export function LoginPage() {
  const router = useRouter();
  const setSession = useSessionStore((state) => state.setSession);
  const form = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "customer@commerce.test",
      password: "password",
    },
  });

  const login = useMutation({
    mutationFn: api.login,
    onSuccess: (data) => {
      setSession({ accessToken: data.accessToken, memberID: data.memberID, role: data.role });
      router.push("/mypage");
    },
  });

  return (
    <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-md items-center px-4 pb-24">
      <form className="w-full rounded-md border border-line bg-white p-5" onSubmit={form.handleSubmit((values) => login.mutate(values))}>
        <h1 className="text-2xl font-black">로그인</h1>
        <p className="mt-2 text-sm text-muted">MSW 모드에서는 기본 계정으로 바로 로그인됩니다.</p>
        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-bold">이메일</span>
            <input className="mt-2 h-12 w-full rounded-md border border-line px-3 outline-none focus:border-foreground" {...form.register("email")} />
            <span className="mt-1 block text-xs text-brand">{form.formState.errors.email?.message}</span>
          </label>
          <label className="block">
            <span className="text-sm font-bold">비밀번호</span>
            <input
              type="password"
              className="mt-2 h-12 w-full rounded-md border border-line px-3 outline-none focus:border-foreground"
              {...form.register("password")}
            />
            <span className="mt-1 block text-xs text-brand">{form.formState.errors.password?.message}</span>
          </label>
        </div>
        {login.error ? <p className="mt-4 text-sm text-brand">{login.error.message}</p> : null}
        <Button className="mt-6 w-full" size="lg" disabled={login.isPending}>
          로그인
        </Button>
        <Link href="/register" className="mt-4 block text-center text-sm font-bold text-muted">
          계정 만들기
        </Link>
      </form>
    </main>
  );
}
