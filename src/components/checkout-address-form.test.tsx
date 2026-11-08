import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CheckoutAddressForm } from "./checkout-address-form";

vi.mock("next/script", () => ({ default: ({ onReady, onError }: { onReady: () => void; onError: () => void }) => <><button type="button" onClick={onReady}>검색 스크립트 로드</button><button type="button" onClick={onError}>검색 스크립트 실패</button></> }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("fills the selected postcode and address, clears the previous detail and saves the selected address", async () => {
  let complete: ((result: { zonecode: string; address: string }) => void) | undefined;
  const embed = vi.fn();
  vi.stubGlobal("kakao", { Postcode: class {
    constructor(options: { oncomplete: typeof complete }) { complete = options.oncomplete; }
    embed = embed;
  } });
  const save = vi.fn();
  render(<CheckoutAddressForm onSave={save} pending={false} firstAddress />);
  fireEvent.change(screen.getByLabelText(/^받는 분/), { target: { value: "홍길동" } });
  fireEvent.change(screen.getByLabelText(/^연락처/), { target: { value: "01012345678" } });
  fireEvent.change(screen.getByLabelText("상세 주소"), { target: { value: "이전 주소 201호" } });
  fireEvent.click(screen.getByRole("button", { name: "주소 검색" }));
  fireEvent.click(screen.getByRole("button", { name: "검색 스크립트 로드" }));
  expect(embed).toHaveBeenCalled();
  // Simulate the provider selecting a real address result.
  const { act } = await import("@testing-library/react");
  act(() => complete?.({ zonecode: "06236", address: "서울 강남구 테헤란로 1" }));
  expect(screen.getByLabelText(/^우편번호/)).toHaveValue("06236");
  expect(screen.getByLabelText(/^기본 주소/)).toHaveValue("서울 강남구 테헤란로 1");
  expect(screen.getByLabelText("상세 주소")).toHaveValue("");
  await waitFor(() => expect(screen.getByLabelText("상세 주소")).toHaveFocus());
  fireEvent.change(screen.getByLabelText("상세 주소"), { target: { value: "101호" } });
  fireEvent.click(screen.getByRole("button", { name: "배송지 저장하고 사용" }));
  expect(save).toHaveBeenCalledWith({ receiver: "홍길동", phone: "01012345678", zip_code: "06236", line1: "서울 강남구 테헤란로 1", line2: "101호", is_default: true });
});

it("keeps manual address entry available when the search service fails", () => {
  render(<CheckoutAddressForm onSave={vi.fn()} pending={false} firstAddress />);
  fireEvent.click(screen.getByRole("button", { name: "주소 검색" }));
  fireEvent.click(screen.getByRole("button", { name: "검색 스크립트 실패" }));
  expect(screen.getByRole("alert")).toHaveTextContent("주소를 직접 입력");
  expect(screen.getByLabelText(/^기본 주소/)).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "닫기" }));
  expect(screen.queryByRole("region", { name: "주소 검색" })).not.toBeInTheDocument();
});
