import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MyPageSupport } from "./my-page-support";

afterEach(cleanup);

describe("my page support", () => {
  it("opens customer service separately and restores focus on Escape", async () => {
    render(<MyPageSupport onLogout={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: "고객센터" });
    trigger.focus();
    fireEvent.click(trigger);
    const sheet = screen.getByRole("dialog", { name: "고객센터" });
    expect(within(sheet).getByText("배송 상태는 어디에서 확인하나요?", { selector: "summary" })).toBeInTheDocument();
    expect(within(sheet).queryByText("쿠폰과 포인트는 어떻게 사용하나요?")).not.toBeInTheDocument();
    expect(within(sheet).queryByRole("link", { name: "리뷰 관리" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "이용안내" })).toHaveAttribute("aria-expanded", "false");
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("opens usage guidance with shopping and account management", () => {
    const onLogout = vi.fn();
    render(<MyPageSupport onLogout={onLogout} />);
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
  });
});
