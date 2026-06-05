"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api } from "@/lib/api";
import { Button } from "./ui/button";

const schema = z.object({
  email: z.string().email("이메일을 확인해주세요."),
  password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다."),
  role: z.enum(["CUSTOMER", "SELLER"]),
  marketingConsent: z.boolean(),
  nighttimeConsent: z.boolean(),
});

type RegisterForm = z.infer<typeof schema>;

export function RegisterPage() {
  const router = useRouter();
  const form = useForm<RegisterForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
      role: "CUSTOMER",
      marketingConsent: true,
      nighttimeConsent: false,
    },
  });
  const register = useMutation({
    mutationFn: api.register,
    onSuccess: () => router.push("/login"),
  });

  return (
    <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-md items-center px-4 pb-24">
      <form className="w-full rounded-md border border-line bg-white p-5" onSubmit={form.handleSubmit((values) => register.mutate(values))}>
        <h1 className="text-2xl font-black">회원가입</h1>
        <p className="mt-2 text-sm text-muted">고객 계정으로 쇼핑과 주문 내역 조회를 시작합니다.</p>
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
          <label className="block">
            <span className="text-sm font-bold">가입 유형</span>
            <select className="mt-2 h-12 w-full rounded-md border border-line px-3 outline-none focus:border-foreground" {...form.register("role")}>
              <option value="CUSTOMER">고객</option>
              <option value="SELLER">셀러</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register("marketingConsent")} />
            마케팅 정보 수신 동의
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register("nighttimeConsent")} />
            야간 알림 수신 동의
          </label>
        </div>
        {register.error ? <p className="mt-4 text-sm text-brand">{register.error.message}</p> : null}
        <Button className="mt-6 w-full" size="lg" disabled={register.isPending}>
          가입하기
        </Button>
        <Link href="/login" className="mt-4 block text-center text-sm font-bold text-muted">
          이미 계정이 있어요
        </Link>
      </form>
    </main>
  );
}
