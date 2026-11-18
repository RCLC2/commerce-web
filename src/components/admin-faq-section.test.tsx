import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { ApiHttpError } from "@/lib/api-client";
import { AdminFAQSection } from "./admin-faq-section";

vi.mock("@/lib/api", () => ({
  api: { adminFAQs: vi.fn(), createFAQ: vi.fn(), updateFAQ: vi.fn(), deleteFAQ: vi.fn(), reorderFAQs: vi.fn() },
}));

const first = { id: 1, question: "배송 문의", answer: "주문 내역을 확인해 주세요.", sequence: 0 };
const second = { id: 2, question: "반품 문의", answer: "주문 상세를 확인해 주세요.", sequence: 1 };

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

function mountAdminFAQs() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AdminFAQSection token="admin-token" />
    </QueryClientProvider>,
  );
}

it("creates, edits, and deletes a FAQ using the refreshed list", async () => {
  const updated = { ...first, answer: "배송 조회 메뉴를 확인해 주세요." };
  vi.mocked(api.adminFAQs).mockResolvedValueOnce([]).mockResolvedValueOnce([first]).mockResolvedValueOnce([updated]).mockResolvedValue([]);
  vi.mocked(api.createFAQ).mockResolvedValue(first);
  vi.mocked(api.updateFAQ).mockResolvedValue(updated);
  vi.spyOn(window, "confirm").mockReturnValue(true);
  mountAdminFAQs();

  await screen.findByText("등록된 FAQ가 없습니다.");
  fireEvent.change(screen.getByLabelText("질문"), { target: { value: first.question } });
  fireEvent.change(screen.getByLabelText("답변"), { target: { value: first.answer } });
  fireEvent.click(screen.getByRole("button", { name: "FAQ 등록" }));
  await screen.findByText(first.question);
  await waitFor(() => expect(screen.getByLabelText("질문")).toHaveValue(""));
  expect(screen.queryByText("FAQ를 저장했습니다.")).not.toBeInTheDocument();
  expect(api.createFAQ).toHaveBeenCalledWith("admin-token", { question: first.question, answer: first.answer });

  fireEvent.click(screen.getByRole("button", { name: "배송 문의 수정" }));
  fireEvent.change(screen.getByLabelText("답변"), { target: { value: updated.answer } });
  fireEvent.click(screen.getByRole("button", { name: "FAQ 수정 저장" }));
  await screen.findByText(updated.answer);
  expect(api.updateFAQ).toHaveBeenCalledWith("admin-token", first.id, { question: first.question, answer: updated.answer });

  fireEvent.click(screen.getByRole("button", { name: "배송 문의 삭제" }));
  await screen.findByText("등록된 FAQ가 없습니다.");
  expect(api.deleteFAQ).toHaveBeenCalledWith("admin-token", first.id);
});

it("submits the full order only on save and loads new entries on conflict", async () => {
  const third = { id: 3, question: "추가된 문의", answer: "새 문항입니다.", sequence: 2 };
  vi.mocked(api.adminFAQs).mockResolvedValueOnce([first, second]).mockResolvedValue([first, second, third]);
  vi.mocked(api.reorderFAQs).mockRejectedValue(new ApiHttpError("conflict", 409));
  mountAdminFAQs();

  const handle = await screen.findByRole("button", { name: "반품 문의 순서 변경" });
  fireEvent.keyDown(handle, { key: "ArrowUp" });
  expect(screen.getByRole("button", { name: "순서 저장" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "되돌리기" }));
  expect(screen.getAllByRole("listitem")[0]).toHaveTextContent(first.question);
  expect(screen.queryByRole("button", { name: "순서 저장" })).not.toBeInTheDocument();
  fireEvent.keyDown(handle, { key: "ArrowUp" });
  fireEvent.keyDown(handle, { key: "ArrowDown" });
  expect(screen.queryByRole("button", { name: "순서 저장" })).not.toBeInTheDocument();
  fireEvent.keyDown(handle, { key: "ArrowUp" });
  expect(api.reorderFAQs).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "순서 저장" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("FAQ 목록이 변경되었습니다.");
  expect(screen.getByText(third.question)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "순서 저장" })).not.toBeInTheDocument();
  expect(api.reorderFAQs).toHaveBeenCalledWith("admin-token", [2, 1]);
});

it("moves the FAQ from its left handle on pointer drop and saves the draft order", async () => {
  vi.mocked(api.adminFAQs).mockResolvedValueOnce([first, second]).mockResolvedValue([second, first]);
  vi.mocked(api.reorderFAQs).mockResolvedValue(undefined);
  mountAdminFAQs();

  const handle = await screen.findByRole("button", { name: "반품 문의 순서 변경" });
  const firstRow = screen.getByText(first.question).closest("li")!;
  Object.defineProperty(handle, "setPointerCapture", { value: vi.fn() });
  const elementFromPoint = vi.fn(() => firstRow);
  Object.defineProperty(document, "elementFromPoint", { configurable: true, value: elementFromPoint });
  const dragPointer = (type: string) => {
    const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: 90, clientY: 125 });
    fireEvent(handle, Object.assign(event, { pointerId: 7 }));
  };
  try {
    dragPointer("pointerdown");
    dragPointer("pointermove");
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent(first.question);

    dragPointer("pointercancel");
    expect(screen.queryByRole("button", { name: "순서 저장" })).not.toBeInTheDocument();
    dragPointer("pointerdown");
    dragPointer("pointermove");
    dragPointer("pointerup");
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent(second.question);
    expect(api.reorderFAQs).not.toHaveBeenCalled();
    expect(screen.queryByText(/번째로 이동했습니다/)).not.toBeInTheDocument();
    const header = within(screen.getByRole("heading", { name: "고객센터 FAQ" }).closest("header")!);
    fireEvent.click(header.getByRole("button", { name: "순서 저장" }));
    await waitFor(() => expect(header.queryByRole("button", { name: "순서 저장" })).not.toBeInTheDocument());
    expect(screen.queryByText("FAQ 순서를 저장했습니다.")).not.toBeInTheDocument();
    expect(api.reorderFAQs).toHaveBeenCalledWith("admin-token", [2, 1]);
  } finally {
    Reflect.deleteProperty(document, "elementFromPoint");
  }
});
