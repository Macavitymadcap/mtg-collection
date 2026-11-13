import { describe, expect, it } from "vitest";
import { Throttle } from "./throttle.js";

describe("Throttle", () => {
  it("runs tasks in order, waiting the interval between them", async () => {
    const waits: number[] = [];
    const throttle = new Throttle(100, async (ms) => {
      waits.push(ms);
    });
    const order: number[] = [];

    await Promise.all([1, 2, 3].map((n) => throttle.run(async () => order.push(n))));

    expect(order).toEqual([1, 2, 3]);
    // The first runs immediately; the others wait (close to) the full interval
    expect(waits).toHaveLength(2);
    for (const ms of waits) expect(ms).toBeGreaterThan(90);
  });

  it("keeps going after a task fails", async () => {
    const throttle = new Throttle(0);
    const failed = throttle.run(() => Promise.reject(new Error("boom")));
    const next = throttle.run(async () => "ok");

    await expect(failed).rejects.toThrow("boom");
    await expect(next).resolves.toBe("ok");
  });

  it("really sleeps by default", async () => {
    const throttle = new Throttle(30);
    const started = Date.now();
    await throttle.run(async () => undefined);
    await throttle.run(async () => undefined);
    expect(Date.now() - started).toBeGreaterThanOrEqual(25);
  });
});
