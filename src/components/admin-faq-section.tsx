"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GripVertical } from "lucide-react";
import { useState, type PointerEvent } from "react";
import { api } from "@/lib/api";
import { ApiError, apiErrorMessage } from "@/lib/api-client";
import type { FAQ, FAQContent } from "@/lib/api/faqs";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { ConsoleSection } from "./console-layout";
import { Button } from "./ui/button";
import { Input, Textarea } from "./ui/input";

const emptyContent = { question: "", answer: "" };

type FAQChange =
  | { type: "save"; id: number | null; content: FAQContent }
  | { type: "delete"; id: number }
  | { type: "reorder"; ids: number[] };

type FAQDrag = {
  pointerID: number;
  sourceID: number;
  targetID: number | null;
};

function isOrderConflict(error: unknown) {
  return error instanceof ApiError && error.status === 409;
}

function dropTarget(event: PointerEvent<HTMLButtonElement>) {
  const row = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-faq-id]");
  if (row && event.currentTarget.closest("ol")?.contains(row)) {
    return Number(row.dataset.faqId);
  }
  return null;
}

export function AdminFAQSection({ token }: { token: string }) {
  const client = useQueryClient();
  const [editingID, setEditingID] = useState<number | null>(null);
  const [content, setContent] = useState<FAQContent>(emptyContent);
  const [draftOrder, setDraftOrder] = useState<FAQ[] | null>(null);
  const [drag, setDrag] = useState<FAQDrag | null>(null);

  const list = useQuery({
    queryKey: queryKeys.adminFAQs,
    queryFn: ({ signal }) => api.adminFAQs(token, signal),
  });
  const faqs = draftOrder ?? list.data ?? [];

  const change = useMutation({
    mutationFn: async (command: FAQChange) => {
      switch (command.type) {
        case "save":
          if (command.id === null) {
            await api.createFAQ(token, command.content);
          } else {
            await api.updateFAQ(token, command.id, command.content);
          }
          break;
        case "delete":
          await api.deleteFAQ(token, command.id);
          break;
        case "reorder":
          await api.reorderFAQs(token, command.ids);
          break;
      }
    },
    onSuccess: async (_, command) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.adminFAQs }),
        client.invalidateQueries({ queryKey: queryKeys.faqs }),
      ]);
      if (command.type === "save" || (command.type === "delete" && command.id === editingID)) {
        resetForm();
      }
      if (command.type === "reorder") {
        setDraftOrder(null);
      }
    },
    onError: async (error, command) => {
      if (command.type === "reorder" && isOrderConflict(error)) {
        await list.refetch();
        setDraftOrder(null);
      }
    },
  });

  function resetForm() {
    setEditingID(null);
    setContent(emptyContent);
  }

  function move(from: number, to: number) {
    if (from < 0 || to < 0 || to >= faqs.length || from === to) {
      return false;
    }
    const next = [...faqs];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    const saved = list.data;
    const matchesSavedOrder = saved?.length === next.length && next.every((faq, index) => faq.id === saved[index].id);
    setDraftOrder(matchesSavedOrder ? null : next);
    change.reset();
    return true;
  }

  function finishDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!drag || drag.pointerID !== event.pointerId) {
      return;
    }
    const targetID = dropTarget(event);
    setDrag(null);
    if (!change.isPending && targetID !== null) {
      move(faqs.findIndex((faq) => faq.id === drag.sourceID), faqs.findIndex((faq) => faq.id === targetID));
    }
  }

  function cancelDrag(event: PointerEvent<HTMLButtonElement>) {
    if (drag?.pointerID === event.pointerId) {
      setDrag(null);
    }
  }

  const editingOrder = draftOrder !== null;
  const contentActionsDisabled = change.isPending || editingOrder || drag !== null;
  const sourceIndex = drag ? faqs.findIndex((faq) => faq.id === drag.sourceID) : -1;

  const orderActions = draftOrder ? (
    <div className="flex shrink-0 gap-2">
      <Button size="sm" disabled={change.isPending || drag !== null} onClick={() => change.mutate({ type: "reorder", ids: draftOrder.map((faq) => faq.id) })}>
        순서 저장
      </Button>
      <Button
        size="sm"
        variant="secondary"
        disabled={change.isPending || drag !== null}
        onClick={() => {
          setDraftOrder(null);
          change.reset();
        }}
      >
        되돌리기
      </Button>
    </div>
  ) : null;
  const errorMessage = change.error && (
    change.variables?.type === "reorder" && isOrderConflict(change.error)
      ? "FAQ 목록이 변경되었습니다. 최신 목록에서 순서를 다시 정해 주세요."
      : apiErrorMessage(change.error)
  );

  return (
    <ConsoleSection className="mt-5">
      <header className="mb-4 flex min-h-9 items-center justify-between gap-2">
        <h3 className="font-bold">고객센터 FAQ</h3>
        {orderActions}
      </header>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const question = content.question.trim();
          const answer = content.answer.trim();
          if (question && answer && !contentActionsDisabled) {
            change.mutate({ type: "save", id: editingID, content: { question, answer } });
          }
        }}
      >
        <label className="grid gap-1 text-sm font-bold">
          질문
          <Input value={content.question} required maxLength={255} disabled={contentActionsDisabled} onChange={(event) => setContent({ ...content, question: event.target.value })} />
        </label>
        <label className="grid gap-1 text-sm font-bold">
          답변
          <Textarea value={content.answer} required maxLength={4000} rows={3} disabled={contentActionsDisabled} onChange={(event) => setContent({ ...content, answer: event.target.value })} />
        </label>
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={contentActionsDisabled || !content.question.trim() || !content.answer.trim()}>
            {editingID === null ? "FAQ 등록" : "FAQ 수정 저장"}
          </Button>
          {editingID !== null ? <Button size="sm" variant="secondary" onClick={resetForm} disabled={contentActionsDisabled}>수정 취소</Button> : null}
        </div>
      </form>

      {errorMessage ? <p role="alert" className="mt-3 text-sm text-status-negative">{errorMessage}</p> : null}
      {list.isPending ? <p role="status" className="mt-4 text-sm">FAQ 목록을 불러오는 중입니다.</p> : null}
      {list.isError ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <p role="alert" className="text-sm">FAQ 목록을 불러오지 못했습니다.</p>
          <Button size="sm" variant="secondary" onClick={() => void list.refetch()}>다시 불러오기</Button>
        </div>
      ) : null}
      {list.isSuccess && faqs.length === 0 ? <p className="mt-4 text-sm text-content-secondary">등록된 FAQ가 없습니다.</p> : null}
      <ol className="mt-4 divide-y divide-border-subtle">
        {faqs.map((faq, index) => (
          <li
            key={faq.id}
            data-faq-id={faq.id}
            className={cn(
              "relative grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2 py-3 lg:grid-cols-[auto_minmax(0,1fr)_auto]",
              drag?.sourceID === faq.id && "opacity-55",
              drag?.targetID === faq.id && sourceIndex !== index && [
                "after:pointer-events-none after:absolute after:inset-x-0 after:h-0.5 after:rounded-full after:bg-action-primary",
                sourceIndex > index ? "after:top-0" : "after:bottom-0",
              ],
            )}
          >
            <button
              type="button"
              aria-label={`${faq.question} 순서 변경`}
              aria-keyshortcuts="ArrowUp ArrowDown"
              className="row-span-2 inline-flex size-11 touch-none select-none items-center justify-center rounded-control text-content-secondary hover:text-content-primary enabled:cursor-grab enabled:active:cursor-grabbing focus-visible:outline-action-primary disabled:opacity-40 lg:row-span-1"
              disabled={faqs.length < 2 || change.isPending}
              onPointerDown={(event) => {
                if (event.button !== 0 || drag) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                setDrag({ pointerID: event.pointerId, sourceID: faq.id, targetID: null });
              }}
              onPointerMove={(event) => {
                if (!drag || drag.pointerID !== event.pointerId) return;
                const targetID = dropTarget(event);
                if (targetID !== drag.targetID) setDrag({ ...drag, targetID });
              }}
              onPointerUp={finishDrag}
              onPointerCancel={cancelDrag}
              onLostPointerCapture={cancelDrag}
              onKeyDown={(event) => {
                if (drag || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
                event.preventDefault();
                const handle = event.currentTarget;
                if (move(index, index + (event.key === "ArrowUp" ? -1 : 1))) {
                  requestAnimationFrame(() => handle.focus());
                }
              }}
            >
              <GripVertical size={18} aria-hidden="true" />
            </button>
            <div className="min-w-0 break-words">
              <p className="text-sm font-bold">{faq.question}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-content-secondary">{faq.answer}</p>
            </div>
            <div className="col-start-2 flex flex-wrap gap-2 lg:col-start-auto">
              <Button size="sm" variant="secondary" aria-label={`${faq.question} 수정`} disabled={contentActionsDisabled} onClick={() => {
                setEditingID(faq.id);
                setContent({ question: faq.question, answer: faq.answer });
                change.reset();
              }}>수정</Button>
              <Button size="sm" variant="danger" aria-label={`${faq.question} 삭제`} disabled={contentActionsDisabled} onClick={() => {
                if (window.confirm(`“${faq.question}” FAQ를 삭제할까요?`)) {
                  change.mutate({ type: "delete", id: faq.id });
                }
              }}>삭제</Button>
            </div>
          </li>
        ))}
      </ol>
    </ConsoleSection>
  );
}
