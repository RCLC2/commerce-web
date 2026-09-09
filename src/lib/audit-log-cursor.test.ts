import { describe, expect, it } from "vitest";
import {
  advanceAuditCursor,
  initialAuditCursor,
  previousAuditCursor,
} from "./audit-log-cursor";

describe("audit log cursor history", () => {
  it("moves forward and restores the exact previous cursor", () => {
    const secondPage = advanceAuditCursor(initialAuditCursor(), "cursor-2");
    const thirdPage = advanceAuditCursor(secondPage, "cursor-3");

    expect(secondPage).toEqual({ current: "cursor-2", previous: [undefined] });
    expect(thirdPage).toEqual({ current: "cursor-3", previous: [undefined, "cursor-2"] });
    expect(previousAuditCursor(thirdPage)).toEqual(secondPage);
    expect(previousAuditCursor(secondPage)).toEqual(initialAuditCursor());
  });

  it("does not advance without a next cursor or move before page one", () => {
    const firstPage = initialAuditCursor();
    expect(advanceAuditCursor(firstPage, null)).toBe(firstPage);
    expect(previousAuditCursor(firstPage)).toBe(firstPage);
  });
});
