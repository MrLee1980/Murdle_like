/**
 * 回溯求解器与枚举工具。
 *
 * 解的对称性归约：类别 0 恒等排列（slot 0.opt = opt），只需枚举其余 K-1 个
 * 类别的排列。每个解用 Lehmer 码编码为单个整数：code = Σ code_c · (N!)^c，
 * 其中 code_c 是类别 c+1 排列的 Lehmer 码。N=6, K=3 → 解空间 518,400；
 * N=5, K=4 → 1,728,000，均可完全枚举。
 */

import type { Clue, SlotAssignment } from './types.js';
import { evalCluePartial } from './clues.js';
import type { Rng } from './rng.js';
import { randInt } from './rng.js';

/** 解的紧凑编码整数 */
export type SolutionCode = number;

const permTableCache = new Map<number, number[][]>();
const factCache = new Map<number, number>();

export function factorial(n: number): number {
  let f = factCache.get(n);
  if (f === undefined) {
    f = 1;
    for (let i = 2; i <= n; i++) f *= i;
    factCache.set(n, f);
  }
  return f;
}

/** Lehmer 码 → 排列查找表：table[code] = 长度为 n 的排列 */
export function getPermTable(n: number): number[][] {
  let table = permTableCache.get(n);
  if (table) return table;
  const total = factorial(n);
  table = new Array(total);
  // 从恒等排列逐次求下一个排列，第 i 个字典序排列的 Lehmer 码 = i
  let perm: number[] = Array.from({ length: n }, (_, i) => i);
  for (let code = 0; code < total; code++) {
    table[code] = perm.slice();
    // next permutation
    let i = n - 2;
    while (i >= 0 && perm[i]! >= perm[i + 1]!) i--;
    if (i < 0) break;
    let j = n - 1;
    while (perm[j]! <= perm[i]!) j--;
    [perm[i], perm[j]] = [perm[j]!, perm[i]!];
    let lo = i + 1;
    let hi = n - 1;
    while (lo < hi) {
      [perm[lo], perm[hi]] = [perm[hi]!, perm[lo]!];
      lo++;
      hi--;
    }
  }
  permTableCache.set(n, table);
  return table;
}

/** 完整解空间大小：(N!)^(K-1)（类别 0 已归约） */
export function solutionSpaceSize(K: number, N: number): number {
  return Math.pow(factorial(N), K - 1);
}

/** 由槽位赋值构造 Lehmer 编码 */
export function encodeSolution(slots: SlotAssignment, K: number, N: number): SolutionCode {
  const table = getPermTable(N);
  const indexOf = new Map<string, number>();
  table.forEach((p, i) => indexOf.set(p.join(','), i));
  let code = 0;
  let mul = 1;
  const fN = factorial(N);
  for (let c = 1; c < K; c++) {
    const idx = indexOf.get(slots[c]!.join(','));
    if (idx === undefined) throw new Error('非法排列');
    code += idx * mul;
    mul *= fN;
  }
  return code;
}

/** 解码：返回各类别（含类别 0）的槽位赋值 */
export function decodeSolution(code: SolutionCode, K: number, N: number): SlotAssignment {
  const table = getPermTable(N);
  const fN = factorial(N);
  const slots: SlotAssignment = [Array.from({ length: N }, (_, i) => i)];
  let rest = code;
  for (let c = 1; c < K; c++) {
    const idx = rest % fN;
    rest = Math.floor(rest / fN);
    slots[c] = table[idx]!.slice();
  }
  return slots;
}

/** 完整枚举全部解编码（调用方需先用 solutionSpaceSize 评估规模） */
export function allSolutionCodes(K: number, N: number): Uint32Array {
  const total = solutionSpaceSize(K, N);
  if (total > 2_000_000) {
    throw new Error(`解空间过大 (${total})，请使用采样或缩小 N/K`);
  }
  const arr = new Uint32Array(total);
  for (let i = 0; i < total; i++) arr[i] = i;
  return arr;
}

/** 从编码构造谓词查找表 */
function makeLookup(code: SolutionCode, K: number, N: number): (cat: number, opt: number) => number {
  const slots = decodeSolution(code, K, N);
  return (cat, opt) => slots[cat]![opt]!;
}

/**
 * 统计满足线索集合的解数量（回溯，达到 limit 提前停止）。
 * limit=2 即可判定「是否唯一解」。
 */
export function countSolutions(K: number, N: number, clues: readonly Clue[], limit = 2): number {
  const table = getPermTable(N);
  const fN = factorial(N);
  const total = solutionSpaceSize(K, N);
  let count = 0;

  const slots = new Int8Array(K * N).fill(-1);
  for (let i = 0; i < N; i++) slots[i] = i;

  // 预解析线索，避免循环内反复解引用
  const checks = clues.map((clue) => {
    const refs: Array<[number, number]> = [];
    const collect = (e?: { cat: number; opt: number }, arr?: Array<{ cat: number; opt: number }>) => {
      if (e) refs.push([e.cat, e.opt]);
      if (arr) for (const x of arr) refs.push([x.cat, x.opt]);
    };
    collect(clue.a, clue.others ?? clue.members);
    if (clue.b) collect(clue.b);
    return { clue, refs };
  });

  const rec = (c: number) => {
    if (count >= limit) return;
    if (c === K) {
      count++;
      return;
    }
    for (let idx = 0; idx < fN; idx++) {
      const perm = table[idx]!;
      for (let i = 0; i < N; i++) slots[c * N + i] = perm[i]!;
      let ok = true;
      for (const { clue, refs } of checks) {
        // 快速跳过：该线索引用的类别都还没赋值到
        let anyUnknown = false;
        let satisfied = true;
        for (const [rc] of refs) {
          if (rc >= c + 1) {
            anyUnknown = true;
            break;
          }
        }
        if (anyUnknown) continue;
        satisfied = evalCluePartial(clue, (cat, opt) => slots[cat * N + opt]!) !== false;
        if (!satisfied) {
          ok = false;
          break;
        }
      }
      if (ok) rec(c + 1);
      if (count >= limit) return;
    }
  };

  rec(1);
  return count;
}

/** 随机采样一个解编码 */
export function randomSolutionCode(K: number, N: number, rng: Rng): SolutionCode {
  const fN = factorial(N);
  let code = 0;
  let mul = 1;
  for (let c = 1; c < K; c++) {
    code += randInt(rng, fN) * mul;
    mul *= fN;
  }
  return code;
}

/** 过滤：保留满足全部线索的解编码 */
export function filterConsistent(
  codes: Uint32Array,
  K: number,
  N: number,
  clues: readonly Clue[],
): Uint32Array {
  const out: number[] = [];
  for (let i = 0; i < codes.length; i++) {
    const code = codes[i]!;
    const lookup = makeLookup(code, K, N);
    let ok = true;
    for (const clue of clues) {
      if (evalCluePartial(clue, lookup) === false) {
        ok = false;
        break;
      }
    }
    if (ok) out.push(code);
  }
  return Uint32Array.from(out);
}
