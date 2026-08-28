import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { outfitLooksByGender } from "@/lib/today-outfit-fixtures";
import { EquipmentSlider } from "./equipment-slider";

vi.mock("./equipment-look", () => ({
  EquipmentLook: ({ position }: { position: number }) => <div>코디 화면 {position}</div>,
}));

afterEach(cleanup);

describe("EquipmentSlider", () => {
  it("moves the whole equipment look with arrows, dots, and wrap-around", () => {
    render(<EquipmentSlider looks={outfitLooksByGender.female} />);

    expect(screen.getByText("01 / 10")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "다음 코디" }));
    expect(screen.getByText("02 / 10")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "5번째 코디 보기" }));
    expect(screen.getByText("05 / 10")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "첫 번째 코디 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "이전 코디" }));
    expect(screen.getByText("10 / 10")).toBeVisible();
  });

  it("supports keyboard arrows from the slider region", () => {
    render(<EquipmentSlider looks={outfitLooksByGender.male} />);
    const slider = screen.getByRole("region", { name: "오늘의 코디 10개" });
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(screen.getByText("02 / 10")).toBeVisible();
    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    expect(screen.getByText("01 / 10")).toBeVisible();
  });
});
