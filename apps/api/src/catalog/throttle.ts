/**
 * Runs tasks one at a time, at least `intervalMs` apart.
 * Used to keep within Scryfall's rate limits.
 */
export class Throttle {
  private last = Number.NEGATIVE_INFINITY;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly intervalMs: number,
    private readonly sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
  ) {}

  run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(async () => {
      const wait = this.last + this.intervalMs - Date.now();
      if (wait > 0) await this.sleep(wait);
      this.last = Date.now();
      return task();
    });
    // A failed task mustn't block the ones queued behind it
    this.queue = result.catch(() => undefined);
    return result;
  }
}
