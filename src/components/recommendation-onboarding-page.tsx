"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-client";
import type { RecommendationChoice, RecommendationInputMethod } from "@/lib/api/recommendation-onboarding";
import { queryKeys } from "@/lib/query-keys";
import { SerialTaskQueue } from "@/lib/serial-task-queue";
import { useSessionStore } from "@/lib/session-store";
import { Button } from "./ui/button";
import { RecommendationSwipeCard } from "./recommendation-swipe-card";

type FailedResponse = {
  productID: number;
  choice: RecommendationChoice;
  inputMethod: RecommendationInputMethod;
};

export function RecommendationOnboardingPage() {
  const router = useRouter();
  const token = useSessionStore((state) => state.accessToken);
  const memberID = useSessionStore((state) => state.memberID);
  const hydrate = useSessionStore((state) => state.hydrate);
  const sessionReady = useSessionStore((state) => state.hydrated);
  const [answers, setAnswers] = useState<Record<number, RecommendationChoice>>({});
  const [history, setHistory] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [failedCount, setFailedCount] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const initializedSession = useRef<number | null>(null);
  const viewedSession = useRef<number | null>(null);
  const queue = useRef(new SerialTaskQueue());
  const failedResponses = useRef(new Map<number, FailedResponse>());

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (sessionReady && !token) router.replace("/login?next=%2Fonboarding%2Fpreferences");
  }, [router, sessionReady, token]);

  const onboarding = useQuery({
    queryKey: queryKeys.recommendationOnboarding(memberID),
    queryFn: () => api.getRecommendationOnboarding(token ?? ""),
    enabled: sessionReady && Boolean(token),
    retry: 1,
  });

  const data = onboarding.data;
  const items = data?.items ?? [];

  useEffect(() => {
    if (!data) return;
    if (["NOT_ELIGIBLE", "COMPLETED", "SKIPPED", "UNAVAILABLE"].includes(data.status)) {
      router.replace("/");
      return;
    }
    if (!data.session_id || initializedSession.current === data.session_id) return;
    initializedSession.current = data.session_id;
    const initialAnswers: Record<number, RecommendationChoice> = {};
    const initialHistory: number[] = [];
    data.items.forEach((item) => {
      if (item.choice) {
        initialAnswers[item.product.id] = item.choice;
        initialHistory.push(item.product.id);
      }
    });
    setAnswers(initialAnswers);
    setHistory(initialHistory);
    const firstUnanswered = data.items.findIndex((item) => !item.choice);
    setCurrentIndex(firstUnanswered === -1 ? data.items.length : firstUnanswered);
  }, [data, router]);

  useEffect(() => {
    if (!token || !data?.session_id || viewedSession.current === data.session_id) return;
    viewedSession.current = data.session_id;
    void api.recordRecommendationOnboardingEvent(token, { event: "recommendation_onboarding_viewed" }).catch(() => undefined);
  }, [data?.session_id, token]);

  const currentItem = items[currentIndex];

  useEffect(() => {
    if (!token || !currentItem) return;
    void api.recordRecommendationOnboardingEvent(token, {
      event: "recommendation_onboarding_product_impression",
      product_id: currentItem.product.id,
      position: currentItem.position,
    }).catch(() => undefined);
  }, [currentItem, token]);

  function updateFailures(next: Map<number, FailedResponse>) {
    failedResponses.current = next;
    setFailedCount(next.size);
  }

  function enqueueResponse(response: FailedResponse) {
    if (!token) return;
    const nextFailures = new Map(failedResponses.current);
    nextFailures.delete(response.productID);
    updateFailures(nextFailures);
    void queue.current.enqueue(async () => {
      try {
        await api.saveRecommendationOnboardingResponse(token, response.productID, response.choice, response.inputMethod);
        const cleared = new Map(failedResponses.current);
        cleared.delete(response.productID);
        updateFailures(cleared);
      } catch (error) {
        const failed = new Map(failedResponses.current);
        failed.set(response.productID, response);
        updateFailures(failed);
        setSyncError(apiErrorMessage(error));
        void api.recordRecommendationOnboardingEvent(token, {
          event: "recommendation_onboarding_save_failed",
          product_id: response.productID,
          position: items.find((item) => item.product.id === response.productID)?.position,
        }).catch(() => undefined);
        throw error;
      }
    }).catch(() => undefined);
  }

  function choose(choice: RecommendationChoice, inputMethod: RecommendationInputMethod) {
    if (!currentItem) return;
    const productID = currentItem.product.id;
    setAnswers((previous) => ({ ...previous, [productID]: choice }));
    setHistory((previous) => [...previous.filter((id) => id !== productID), productID]);
    enqueueResponse({ productID, choice, inputMethod });

    const nextIndex = items.findIndex((item, index) => index > currentIndex && !answers[item.product.id]);
    if (nextIndex !== -1) {
      setCurrentIndex(nextIndex);
      return;
    }
    const remainingIndex = items.findIndex((item) => item.product.id !== productID && !answers[item.product.id]);
    setCurrentIndex(remainingIndex === -1 ? items.length : remainingIndex);
  }

  function undoLast() {
    const productID = history.at(-1);
    if (!productID || !token) return;
    setAnswers((previous) => {
      const next = { ...previous };
      delete next[productID];
      return next;
    });
    setHistory((previous) => previous.slice(0, -1));
    const itemIndex = items.findIndex((item) => item.product.id === productID);
    if (itemIndex >= 0) setCurrentIndex(itemIndex);
    const failures = new Map(failedResponses.current);
    failures.delete(productID);
    updateFailures(failures);
    void queue.current.enqueue(() => api.undoRecommendationOnboardingResponse(token, productID)).catch((error: unknown) => {
      setSyncError(apiErrorMessage(error));
    });
  }

  async function retryFailedResponses() {
    const pending = [...failedResponses.current.values()];
    setSyncError(null);
    await Promise.all(pending.map(async (response) => {
      if (!token) return;
      try {
        await queue.current.enqueue(() => api.saveRecommendationOnboardingResponse(
          token,
          response.productID,
          response.choice,
          response.inputMethod,
        ));
        const failures = new Map(failedResponses.current);
        failures.delete(response.productID);
        updateFailures(failures);
      } catch (error) {
        setSyncError(apiErrorMessage(error));
      }
    }));
  }

  async function finish(status: "COMPLETED" | "SKIPPED") {
    if (!token || finishing) return;
    setFinishing(true);
    setSyncError(null);
    try {
      await queue.current.flush();
      if (status === "COMPLETED" && failedResponses.current.size > 0) {
        setSyncError("저장하지 못한 선택이 있습니다. 다시 저장한 뒤 완료해주세요.");
        return;
      }
      await api.finishRecommendationOnboarding(token, status);
      if (status === "COMPLETED") {
        setCompleted(true);
      } else {
        router.replace("/");
      }
    } catch (error) {
      setSyncError(apiErrorMessage(error));
    } finally {
      setFinishing(false);
    }
  }

  if (!sessionReady || onboarding.isLoading || (!data && !onboarding.error)) {
    return <OnboardingMessage>취향 카드를 준비하고 있어요…</OnboardingMessage>;
  }
  if (onboarding.error || !data) {
    return (
      <OnboardingMessage>
        <p className="font-bold text-rose-600">{apiErrorMessage(onboarding.error)}</p>
        <Button className="mt-5" onClick={() => void onboarding.refetch()}>다시 시도</Button>
        <Link className="mt-4 block text-sm font-bold text-muted" href="/">나중에 할게요</Link>
      </OnboardingMessage>
    );
  }
  if (completed) {
    return (
      <OnboardingMessage>
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Sparkles size={30} /></span>
        <h1 className="mt-5 text-3xl font-black">취향 반영 완료!</h1>
        <p className="mt-3 text-sm leading-6 text-muted">고른 취향을 바탕으로 나에게 맞는 상품을 준비했어요.</p>
        <Button className="mt-7 w-full" size="lg" onClick={() => router.replace("/recommendations")}>내 추천 보러가기</Button>
      </OnboardingMessage>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const allAnswered = items.length > 0 && answeredCount === items.length;

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#fff1f4_0,#fafafa_42%)] px-4 pb-10 pt-[max(20px,env(safe-area-inset-top))]">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            className="inline-flex h-10 items-center gap-1 rounded-full px-3 text-sm font-bold text-muted hover:bg-white"
            onClick={undoLast}
            disabled={history.length === 0 || finishing}
          >
            <ArrowLeft size={17} /> 이전 선택
          </button>
          <button type="button" className="h-10 rounded-full px-3 text-sm font-bold text-muted hover:bg-white" onClick={() => void finish("SKIPPED")} disabled={finishing}>
            나중에 할게요
          </button>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200">
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${items.length ? (answeredCount / items.length) * 100 : 0}%` }} />
          </div>
          <span className="min-w-10 text-right text-sm font-black">{answeredCount}/{items.length}</span>
        </div>

        <div className="mb-5 mt-5 text-center">
          <h1 className="text-2xl font-black">이 상품, 내 취향인가요?</h1>
          <p className="mt-2 text-sm text-muted">카드를 넘기거나 O·X 버튼을 눌러주세요.</p>
        </div>

        {allAnswered ? (
          <section className="rounded-[28px] border border-line bg-white p-8 text-center shadow-[0_24px_70px_rgba(0,0,0,0.10)]">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-brand"><Check size={32} strokeWidth={3} /></span>
            <h2 className="mt-5 text-2xl font-black">10개 모두 골랐어요</h2>
            <p className="mt-3 text-sm leading-6 text-muted">선택을 저장한 뒤 바로 맞춤 추천을 만들어드릴게요.</p>
            {failedCount > 0 ? (
              <Button className="mt-6 w-full" variant="secondary" size="lg" onClick={() => void retryFailedResponses()} disabled={finishing}>
                저장 실패 {failedCount}개 다시 시도
              </Button>
            ) : (
              <Button className="mt-6 w-full" size="lg" onClick={() => void finish("COMPLETED")} disabled={finishing}>
                {finishing ? "추천 만드는 중…" : "내 추천 만들기"}
              </Button>
            )}
            <button type="button" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-muted" onClick={undoLast} disabled={finishing}>
              <RotateCcw size={15} /> 마지막 선택 다시 하기
            </button>
          </section>
        ) : currentItem ? (
          <RecommendationSwipeCard key={currentItem.product.id} item={currentItem} onChoose={choose} />
        ) : (
          <OnboardingMessage>추천 상품을 충분히 준비하지 못했어요.</OnboardingMessage>
        )}

        {syncError ? <p role="alert" className="mx-auto mt-5 max-w-sm rounded-xl bg-rose-50 px-4 py-3 text-center text-sm font-bold text-rose-600">{syncError}</p> : null}
        <p className="mt-5 text-center text-xs leading-5 text-muted">키보드에서는 ← X · → O로 선택할 수 있어요.</p>
      </div>
    </main>
  );
}

function OnboardingMessage({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center text-sm text-muted">{children}</main>;
}
