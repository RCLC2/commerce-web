import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { previewInquiries } from "@/lib/inquiry-preview";
import { MyInquirySummary } from "./my-inquiry-summary";

afterEach(cleanup);

describe("my inquiry summary", () => {
  it("counts open inquiries, shows content and responses, and filters by answer status", async () => {
    render(<MyInquirySummary inquiries={previewInquiries} isPreview />);
    const trigger = screen.getByRole("button", { name: "진행 중인 문의 2건" });
    trigger.focus();
    fireEvent.click(trigger);
    const sheet = screen.getByRole("dialog", { name: "진행 중인 문의" });
    expect(within(sheet).getByText("진행 중 2건 · 답변 완료 1건")).toBeInTheDocument();
    expect(within(sheet).getByText("임시 데이터")).toBeInTheDocument();
    expect(within(sheet).getAllByRole("listitem")).toHaveLength(3);
    for (const inquiry of previewInquiries) {
      expect(within(sheet).getByRole("heading", { name: inquiry.title })).toBeInTheDocument();
      expect(within(sheet).getByText(inquiry.content)).toBeInTheDocument();
    }
    expect(within(sheet).getByText("답변 대기")).toBeInTheDocument();
    expect(within(sheet).getByText("확인 중")).toBeInTheDocument();
    const tabs = within(sheet).getByRole("tablist", { name: "문의 상태" });
    const all = within(tabs).getByRole("tab", { name: "전체 3" });
    all.focus();
    fireEvent.keyDown(all, { key: "End" });
    expect(within(tabs).getByRole("tab", { name: "답변 완료 1" })).toHaveAttribute("aria-selected", "true");
    expect(within(sheet).getAllByRole("listitem")).toHaveLength(1);
    expect(within(sheet).getByText("고객센터 답변")).toBeInTheDocument();
    expect(within(sheet).getByText(/네, 쿠폰의 사용 조건을 충족하면/)).toBeInTheDocument();
    fireEvent.click(within(tabs).getByRole("tab", { name: "진행 중 2" }));
    expect(within(sheet).getAllByRole("listitem")).toHaveLength(2);
    expect(within(sheet).queryByText("고객센터 답변")).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    fireEvent.click(trigger);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("shows a genuine empty list as zero without adding preview data", () => {
    render(<MyInquirySummary inquiries={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "진행 중인 문의 0건" }));
    const sheet = screen.getByRole("dialog", { name: "진행 중인 문의" });
    expect(within(sheet).getByText("문의 내역이 없습니다")).toBeInTheDocument();
    expect(within(sheet).queryByText("임시 데이터")).not.toBeInTheDocument();
    expect(within(sheet).queryByRole("listitem")).not.toBeInTheDocument();
    fireEvent.click(within(sheet).getByRole("tab", { name: "진행 중 0" }));
    expect(within(sheet).getByText("진행 중인 문의가 없습니다")).toBeInTheDocument();
  });

  it("keeps the unavailable state when no inquiry source is supplied", async () => {
    render(<MyInquirySummary />);
    const trigger = screen.getByRole("button", { name: "진행 중인 문의 준비 중" });
    expect(screen.queryByText("0건")).not.toBeInTheDocument();
    trigger.focus();
    fireEvent.click(trigger);
    const sheet = screen.getByRole("dialog", { name: "진행 중인 문의" });
    expect(within(sheet).getByText("문의 내역은 준비 중이에요")).toBeInTheDocument();
    expect(within(sheet).queryByText("임시 데이터")).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
