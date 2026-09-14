import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createOutfitLook } from "@/test/outfit-fixture";
import { EquipmentLook } from "./equipment-look";

afterEach(cleanup);

describe("EquipmentLook", () => {
  it("connects each body-part callout to an actual product", () => {
    const look = createOutfitLook();
    const onProductSelect = vi.fn();
    render(<EquipmentLook look={look} position={1} active onProductSelect={onProductSelect} />);

    fireEvent.click(screen.getByRole("button", { name: /신발 상품 1, 상품 목록에서 보기/ }));

    expect(onProductSelect).toHaveBeenCalledWith(look.items[6].product.id);
    expect(screen.getAllByRole("button", { name: /상품 목록에서 보기/ })).toHaveLength(7);
    expect(screen.getByAltText("오늘의 AI 코디 연출 이미지")).toBeVisible();
  });

  it("does not render generated copy around the image", () => {
    render(<EquipmentLook look={createOutfitLook()} position={1} active onProductSelect={vi.fn()} />);

    expect(screen.queryByText("오늘의 코디 포인트")).not.toBeInTheDocument();
    expect(screen.getByTestId("outfit-image-stage").parentElement).toHaveTextContent("코디 01 · 날씨에 맞는 스타일");
  });
});
