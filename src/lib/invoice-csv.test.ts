import { describe, expect, it } from "vitest";
import { createInvoiceTemplateCsv, parseInvoiceCsv } from "./invoice-csv";
import type { OrderResponse } from "./types";

const order: OrderResponse = {
  id: 1,
  order_code: "ORDER-1",
  total_order_price: 10000,
  total_discount_price: 0,
  used_point: 0,
  status: "PAID",
};

describe("seller invoice CSV", () => {
  it("reads invoice numbers from its own three-column template", () => {
    const template = createInvoiceTemplateCsv([order]);
    const completed = template.replace(/""$/, "\"1234567890\"");

    expect(parseInvoiceCsv(completed)).toEqual({ "ORDER-1": "1234567890" });
  });
});
