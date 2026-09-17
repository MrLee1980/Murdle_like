/**
 * 种子随机数：xmur3 字符串哈希 + mulberry32 PRNG。
 * 保证「同一种子 → 同一道题」（每日谜题的基础）。
 */

export type Rng = () => number;

/** xmur3 字符串哈希，返回可多次调用的哈希函数 */
export function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/** mulberry32：小巧快速的种子 PRNG，返回 [0, 1) */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 由任意字符串种子创建 RNG */
export function createRng(seed: string): Rng {
  return mulberry32(xmur3(seed)());
}

/** 返回 [0, n) 的整数 */
export function randInt(rng: Rng, n: number): number {
  return Math.floor(rng() * n);
}

/** Fisher–Yates 原地打乱（使用传入的 rng，保持确定性） */
export function shuffled<T>(arr: readonly T[], rng: Rng): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

/** 均匀选取一个元素 */
export function pick<T>(arr: readonly T[], rng: Rng): T {
  return arr[randInt(rng, arr.length)]!;
}
