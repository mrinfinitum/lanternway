// Small seeded random number generator (mulberry32) so the generated mock
// data is identical on every load, on the server and in the browser.

export type Random = {
  /** Float in [0, 1). */
  next: () => number;
  /** Integer in [min, max], inclusive. */
  int: (min: number, max: number) => number;
  /** True with probability `p`. */
  chance: (p: number) => boolean;
  pick: <T>(items: readonly T[]) => T;
  /** Up to `count` distinct items. */
  sample: <T>(items: readonly T[], count: number) => T[];
  /** Roughly normal value around `mean` (sum of uniforms). */
  around: (mean: number, spread: number) => number;
};

export function createRandom(seed: number): Random {
  let state = seed >>> 0;

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));

  return {
    next,
    int,
    chance: (p) => next() < p,
    pick: (items) => items[int(0, items.length - 1)],
    sample: (items, count) => {
      const pool = [...items];
      const out = [];
      while (out.length < count && pool.length > 0) {
        out.push(pool.splice(int(0, pool.length - 1), 1)[0]);
      }
      return out;
    },
    around: (mean, spread) => mean + (next() + next() + next() - 1.5) * spread * (2 / 1.5),
  };
}

/** Clamp and round to a 1–5 rating. */
export function toRating(value: number): 1 | 2 | 3 | 4 | 5 {
  return Math.min(5, Math.max(1, Math.round(value))) as 1 | 2 | 3 | 4 | 5;
}
