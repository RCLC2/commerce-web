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
import { Field } from "./ui/field";
import { Input } from "./ui/input";
import { Notice } from "./ui/notice";
import { Surface } from "./ui/surface";

const schema = z.object({
  email: z.string().email("이메일을 확인해주세요."),
  password: z.string().refine((value) => {
    const bytes = new TextEncoder().encode(value).byteLength;
    return bytes >= 8 && bytes <= 72;
  }, "비밀번호는 UTF-8 기준 8~72바이트여야 합니다."),
  marketingConsent: z.boolean(),
  nighttimeConsent: z.boolean(),
});

type RegisterForm = z.infer<typeof schema>;

export function RegisterPage() {
  const router = useRouter();
  const setSession = useSessionStore((state) => state.setSession);
  const form = useForm<RegisterForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
      marketingConsent: true,
      nighttimeConsent: false,
    },
  });
  const register = useMutation({
    mutationFn: api.signup,
    onSuccess: (data) => {
      if (!data.accessToken) {
        router.push("/login");
        return;
      }
      setSession({ accessToken: data.accessToken, memberID: data.id, role: data.role });
      if (["NOT_STARTED", "IN_PROGRESS"].includes(data.onboardingStatus)) {
        router.replace("/onboarding/preferences");
        return;
      }
      router.replace("/");
    },
  });

  return (
    <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-md items-center px-4 pb-24">
      <Surface className="w-full" padding="lg">
      <form onSubmit={form.handleSubmit((values) => register.mutate(values))}>
        <h1 className="text-2xl font-black">회원가입</h1>
        <p className="mt-2 text-sm text-muted">고객 계정으로 쇼핑과 주문 내역 조회를 시작합니다.</p>
        <div className="mt-6 space-y-4">
          <Field label="이메일" htmlFor="register-email" error={form.formState.errors.email?.message} required>
            <Input id="register-email" autoComplete="email" state={form.formState.errors.email ? "error" : "default"} {...form.register("email")} />
          </Field>
          <Field label="비밀번호" htmlFor="register-password" error={form.formState.errors.password?.message} hint="UTF-8 기준 8~72바이트" required>
            <Input
              id="register-password"
              type="password"
              autoComplete="new-password"
              state={form.formState.errors.password ? "error" : "default"}
              {...form.register("password")}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register("marketingConsent")} />
            마케팅 정보 수신 동의
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register("nighttimeConsent")} />
            야간 알림 수신 동의
          </label>
        </div>
        {register.error ? <Notice className="mt-4" tone="error" title="회원가입하지 못했습니다.">{register.error.message}</Notice> : null}
        <Button className="mt-6 w-full" size="lg" disabled={register.isPending}>
          가입하기
        </Button>
        <Link href="/login" className="mt-4 block text-center text-sm font-bold text-muted">
          이미 계정이 있어요
        </Link>
      </form>
      </Surface>
    </main>
  );
}
