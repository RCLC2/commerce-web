import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { outfitProductAnchorID } from "@/lib/today-outfit";
import { createOutfitLook } from "@/test/outfit-fixture";
import { OutfitProductList } from "./outfit-product-list";

afterEach(cleanup);

describe("OutfitProductList", () => {
  it("renders all actual products and highlights the selected body part", () => {
    const look = createOutfitLook();
    const selectedProduct = look.items[6].product;
    render(<OutfitProductList look={look} selectedProductID={selectedProduct.id} />);

    expect(screen.getByRole("heading", { name: "이 코디의 실제 상품" })).toBeVisible();
    expect(screen.getByText("7개 상품")).toBeVisible();
    expect(screen.getByLabelText(`신발 상품 ${selectedProduct.name}`)).toHaveAttribute("data-selected", "true");
    expect(screen.getByLabelText(`신발 상품 ${selectedProduct.name}`)).toHaveAttribute(
      "id",
      outfitProductAnchorID(look.id, selectedProduct.id),
    );
  });
});
