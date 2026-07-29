import { firstOrderItem } from "./order-utils";
import type { OrderResponse } from "./types";

export function createInvoiceTemplateCsv(orders: OrderResponse[]) {
  const headers = ["order_code", "product_name", "invoice_number"];
  const rows = orders.map((order) => {
    const item = firstOrderItem(order);
    return [order.order_code, item?.product?.name ?? "주문 상품", ""];
  });

  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function parseInvoiceCsv(text: string) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const result: Record<string, string> = {};
  const [, ...rows] = lines;

  rows.forEach((line) => {
    const cells = parseCsvLine(line);
    const orderCode = cells[0]?.trim();
    const invoiceNumber = cells[2]?.trim();
    if (orderCode && invoiceNumber) {
      result[orderCode] = invoiceNumber;
    }
  });

  return result;
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}
