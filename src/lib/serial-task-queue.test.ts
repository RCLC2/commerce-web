import { describe, expect, it } from "vitest";
import { SerialTaskQueue } from "./serial-task-queue";

describe("SerialTaskQueue", () => {
  it("keeps response writes ordered and continues after a failed write", async () => {
    const queue = new SerialTaskQueue();
    const calls: number[] = [];
    const first = queue.enqueue(async () => { calls.push(1); throw new Error("offline"); });
    const second = queue.enqueue(async () => { calls.push(2); return "saved"; });

    await expect(first).rejects.toThrow("offline");
    await expect(second).resolves.toBe("saved");
    await queue.flush();
    expect(calls).toEqual([1, 2]);
  });
});
