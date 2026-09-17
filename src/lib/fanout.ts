/* ── Bounded fan-out ───────────────────────────────────────────────────────
   Several stat routes turn one inbound request into many upstream ones.
   `Promise.all` over 40 of those opens 40 sockets at once and walks into
   TMDB's rate limit; this walks the list a few at a time instead.

   Failures are per-item, not fatal: a chart missing one bar out of twenty is
   a chart, while a chart that 500s because one title 404'd is nothing. */

export const FANOUT_CONCURRENCY = 8;

export async function mapLimit<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  limit = FANOUT_CONCURRENCY,
): Promise<(R | null)[]> {
  const out: (R | null)[] = new Array(items.length).fill(null);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      try {
        out[index] = await fn(items[index]);
      } catch {
        out[index] = null;
      }
    }
  });

  await Promise.all(workers);
  return out;
}
