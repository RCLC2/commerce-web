import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ConsoleLayout } from "./console-layout";
import { OrderReturnManagement } from "./order-return-management";

vi.mock("next/navigation", () => ({ usePathname: () => "/seller/orders" }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function mount(status: number, code: string) {
  vi.stubGlobal("fetch", vi.fn(async (input: string) => {
    const address = String(input).includes("/return-address");
    return new Response(JSON.stringify(address
      ? { success: false, error: { code, message: "반품지 조회 응답", request_id: "test-request" } }
      : { success: true, data: [] }), {
      status: address ? status : 200, headers: { "Content-Type": "application/json" },
    });
  }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ConsoleLayout title="판매자" links={[]}>
        <OrderReturnManagement token="seller" orderCode="ORD-3" role="SELLER"
          markets={[{ id: 7, name: "마켓", items: [] }]} />
      </ConsoleLayout>
    </QueryClientProvider>,
  );
  return client;
}

it("treats an unregistered return address as an empty state throughout the console", async () => {
  const client = mount(404, "RESOURCE_NOT_FOUND");
  const summary = await screen.findByText("마켓 기본 반품 도착지 등록 필요");
  fireEvent.click(summary.closest("summary")!);
  expect(screen.getByRole("button", { name: "기본 반품 도착지 저장" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "탐색 열기" }));

  expect(screen.queryByText("데이터를 불러오지 못했습니다.")).not.toBeInTheDocument();
  expect(client.getQueryState(["return-address", "seller", 7])).toMatchObject({ status: "success", data: null });
  client.clear();
});

it("explains blocked saves and associates field errors until the address is valid", async () => {
  const client = mount(404, "RESOURCE_NOT_FOUND");
  const summary = await screen.findByText("마켓 기본 반품 도착지 등록 필요");
  fireEvent.click(summary.closest("summary")!);
  const fields = screen.getByRole("group", { name: "기본 반품 도착지" });
  const save = screen.getByRole("button", { name: "기본 반품 도착지 저장" });
  const actions = screen.getByRole("group", { name: "반품 도착지 저장" });
  expect(save).toBeDisabled();
  expect(save).toHaveAccessibleDescription("수령인을 입력해주세요.");
  const postal = within(fields).getByRole("textbox", { name: "우편번호" });
  expect(postal).toHaveAccessibleDescription("숫자 5자리로 입력해주세요.");
  for (const [label, value] of [["수령인", "반품 담당"], ["연락처", "01012345678"], ["주소", "서울시 반품로 1"], ["우편번호", "1234"]]) {
    fireEvent.change(within(fields).getByRole("textbox", { name: label }), { target: { value } });
  }
  fireEvent.blur(postal);
  expect(postal).toHaveAttribute("aria-invalid", "true");
  expect(postal).toHaveAccessibleDescription("우편번호는 숫자 5자리로 입력해주세요.");
  expect(within(actions).getByText("우편번호는 숫자 5자리로 입력해주세요.")).toBeVisible();
  expect(save).toBeDisabled();
  fireEvent.submit(save.closest("form")!);
  expect(fetch).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ method: "PUT" }));

  fireEvent.change(postal, { target: { value: "12345" } });
  expect(postal).not.toHaveAttribute("aria-invalid");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(save).toBeEnabled();
  expect(save).toHaveAccessibleDescription("입력 내용을 확인한 후 저장해주세요.");

  const recipient = within(fields).getByRole("textbox", { name: "수령인" });
  fireEvent.change(recipient, { target: { value: "   " } });
  fireEvent.blur(recipient);
  expect(recipient).toHaveAccessibleDescription("수령인을 입력해주세요.");
  expect(save).toBeDisabled();
  client.clear();
});

it.each([[500, "INTERNAL_ERROR"], [403, "ACCESS_FORBIDDEN"], [404, "HTTP_REQUEST_FAILED"]])(
  "keeps genuine return address errors visible: %s %s", async (status, code) => {
    const client = mount(status, code);
    const summary = await screen.findByText("마켓 기본 반품 도착지 설정");
    fireEvent.click(summary.closest("summary")!);
    expect(await screen.findByRole("button", { name: "반품 도착지 다시 확인" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "탐색 열기" }));

    expect(screen.getByText("데이터를 불러오지 못했습니다.")).toBeVisible();
    expect(client.getQueryState(["return-address", "seller", 7])?.status).toBe("error");
    client.clear();
  },
);
