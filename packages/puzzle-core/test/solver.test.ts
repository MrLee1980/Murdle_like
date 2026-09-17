import { describe, it, expect } from 'vitest';
import {
  factorial,
  getPermTable,
  encodeSolution,
  decodeSolution,
  countSolutions,
  solutionSpaceSize,
  randomSolutionCode,
  filterConsistent,
  allSolutionCodes,
} from '../src/solver.js';
import type { Clue } from '../src/types.js';

const K = 3;
const N = 3;

describe('solver 基础', () => {
  it('阶乘与排列表', () => {
    expect(factorial(4)).toBe(24);
    const table = getPermTable(3);
    expect(table).toHaveLength(6);
    expect(table[0]).toEqual([0, 1, 2]);
    expect(new Set(table.map((p) => p.join(','))).size).toBe(6);
  });

  it('编码/解码往返一致', () => {
    for (let code = 0; code < solutionSpaceSize(K, N); code++) {
      const slots = decodeSolution(code, K, N);
      expect(encodeSolution(slots, K, N)).toBe(code);
    }
  });

  it('解空间大小正确', () => {
    expect(solutionSpaceSize(3, 4)).toBe(576); // (4!)²
    expect(solutionSpaceSize(3, 6)).toBe(518400); // (6!)²
    expect(solutionSpaceSize(4, 5)).toBe(1728000); // (5!)³
  });

  it('无线索时解数 = 全空间', () => {
    // limit 大于空间，直接返回总数
    expect(countSolutions(K, N, [], solutionSpaceSize(K, N))).toBe(solutionSpaceSize(K, N));
  });

  it('BIND 线索缩小解空间', () => {
    const bind: Clue = { type: 'BIND', a: { cat: 0, opt: 0 }, b: { cat: 1, opt: 1 }, text: '' };
    // 类别0恒等：slot(0,0)=0；要求 slot(1,1)=0 → 类别1排列中位置1为0：2! = 2 种；
    // 类别2 自由：3! = 6 种 → 共 12
    // 注意：countSolutions 默认 limit=2 提前截断，这里显式放宽
    expect(countSolutions(K, N, [bind], 100)).toBe(12);
  });

  it('矛盾线索组合无解', () => {
    const yes: Clue = { type: 'BIND', a: { cat: 0, opt: 0 }, b: { cat: 1, opt: 1 }, text: '' };
    const no: Clue = { type: 'EXCLUDE', a: { cat: 0, opt: 0 }, b: { cat: 1, opt: 1 }, text: '' };
    expect(countSolutions(K, N, [yes, no])).toBe(0);
  });

  it('filterConsistent 与 countSolutions 一致', () => {
    const bind: Clue = { type: 'BIND', a: { cat: 0, opt: 0 }, b: { cat: 1, opt: 1 }, text: '' };
    const all = allSolutionCodes(K, N);
    const kept = filterConsistent(all, K, N, [bind]);
    expect(kept.length).toBe(12);
  });

  it('randomSolutionCode 产生合法编码', () => {
    let seed = 42;
    const rng = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let i = 0; i < 20; i++) {
      const code = randomSolutionCode(K, N, rng);
      expect(code).toBeGreaterThanOrEqual(0);
      expect(code).toBeLessThan(solutionSpaceSize(K, N));
    }
  });
});
