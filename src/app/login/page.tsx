import { Suspense } from "react";
import { PageLayout } from "@/components/page-layout";
import { LoginPage } from "@/components/login-page";
import { LoadingState } from "@/components/ui/feedback";

export default function Login() {
  return <Suspense fallback={<PageLayout variant="auth" className="text-sm text-content-secondary"><LoadingState label="로그인 화면을 불러오는 중입니다." /></PageLayout>}><LoginPage /></Suspense>;
}
