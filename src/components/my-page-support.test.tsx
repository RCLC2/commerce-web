import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MyPageSupport } from "./my-page-support";

vi.mock("@/lib/api", () => ({ api: { listFAQs: vi.fn() } }));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

function mountSupport(onLogout = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><MyPageSupport token="member-token" onLogout={onLogout} /></QueryClientProvider>);
}

describe("my page support", () => {
  it("opens customer service separately and restores focus on Escape", async () => {
    vi.mocked(api.listFAQs).mockResolvedValue([
      { id: 2, question: "반품은 어떻게 신청하나요?", answer: "주문 상세에서 신청하세요.", sequence: 0 },
      { id: 1, question: "배송 상태는 어디에서 확인하나요?", answer: "주문 내역에서 확인하세요.", sequence: 1 },
    ]);
    mountSupport();
    expect(api.listFAQs).not.toHaveBeenCalled();
    const trigger = screen.getByRole("button", { name: "고객센터" });
    trigger.focus();
    fireEvent.click(trigger);
    const sheet = screen.getByRole("dialog", { name: "고객센터" });
    await within(sheet).findByText("배송 상태는 어디에서 확인하나요?", { selector: "summary" });
    expect(Array.from(sheet.querySelectorAll("summary"), (item) => item.textContent)).toEqual([
      "반품은 어떻게 신청하나요?", "배송 상태는 어디에서 확인하나요?",
    ]);
    expect(api.listFAQs).toHaveBeenCalledWith("member-token", expect.any(AbortSignal));
    expect(within(sheet).queryByText("쿠폰과 포인트는 어떻게 사용하나요?")).not.toBeInTheDocument();
    expect(within(sheet).queryByRole("link", { name: "리뷰 관리" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "이용안내" })).toHaveAttribute("aria-expanded", "false");
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("closes the open FAQ when another question is selected", async () => {
    vi.mocked(api.listFAQs).mockResolvedValue([
      { id: 1, question: "첫 번째 질문", answer: "첫 번째 답변", sequence: 0 },
      { id: 2, question: "두 번째 질문", answer: "두 번째 답변", sequence: 1 },
    ]);
    mountSupport();
    fireEvent.click(screen.getByRole("button", { name: "고객센터" }));
    const sheet = screen.getByRole("dialog", { name: "고객센터" });
    const first = await within(sheet).findByText("첫 번째 질문", { selector: "summary" });
    const second = within(sheet).getByText("두 번째 질문", { selector: "summary" });

    fireEvent.click(first);
    expect(first.closest("details")).toHaveAttribute("open");
    fireEvent.click(second);
    expect(first.closest("details")).not.toHaveAttribute("open");
    expect(second.closest("details")).toHaveAttribute("open");
    fireEvent.click(second);
    expect(second.closest("details")).not.toHaveAttribute("open");
  });

  it("opens usage guidance with shopping and account management", () => {
    const onLogout = vi.fn();
    mountSupport(onLogout);
    fireEvent.click(screen.getByRole("button", { name: "이용안내" }));
    const sheet = screen.getByRole("dialog", { name: "이용안내" });
    expect(within(sheet).getByText("쿠폰과 포인트는 어떻게 사용하나요?", { selector: "summary" })).toBeInTheDocument();
    expect(within(sheet).queryByText("배송 상태는 어디에서 확인하나요?")).not.toBeInTheDocument();
    expect(within(sheet).getByRole("link", { name: "리뷰 관리" })).toHaveAttribute("href", "/mypage/reviews");
    expect(within(sheet).getByRole("link", { name: "회원정보 수정" })).toHaveAttribute("href", "/mypage/profile");
    expect(within(sheet).queryByRole("button", { name: "로그아웃" })).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    const support = screen.getByRole("region", { name: "고객 지원" });
    const logout = within(support).getByRole("button", { name: "로그아웃" });
    expect(within(support).getByRole("button", { name: "이용안내" }).compareDocumentPosition(logout) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(logout);
    expect(onLogout).toHaveBeenCalledOnce();
    expect(api.listFAQs).not.toHaveBeenCalled();
  });

  it("retries a failed FAQ load and shows the empty state", async () => {
    vi.mocked(api.listFAQs).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce([]);
    mountSupport();
    fireEvent.click(screen.getByRole("button", { name: "고객센터" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("FAQ를 불러오지 못했습니다.");
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("등록된 FAQ가 없습니다.")).toBeInTheDocument();
  });
});
