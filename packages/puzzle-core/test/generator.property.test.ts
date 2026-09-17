import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { generatePuzzle, dailyPuzzle } from '../src/generator.js';
import { countSolutions } from '../src/solver.js';
import { solveFromClues } from '../src/humanSolver.js';
import { evalClueFull } from '../src/clues.js';
import type { Puzzle } from '../src/types.js';

const CLUE_RANGES: Record<string, [number, number]> = {
  easy: [5, 7],
  medium: [7, 9],
  hard: [9, 12],
  four: [6, 9],
};

function assertValidPuzzle(p: Puzzle) {
  // 1. 唯一解
  expect(countSolutions(p.categoryCount, p.optionCount, p.clues, 2)).toBe(1);
  // 2. 无猜测可解
  expect(solveFromClues(p.categoryCount, p.optionCount, p.clues).solved).toBe(true);
  // 3. 每条线索在该解下为真
  const lookup = (cat: number, opt: number) => p.solution[cat]![opt]!;
  for (const clue of p.clues) {
    expect(evalClueFull(clue, lookup)).toBe(true);
  }
  // 4. 线索数落在难度区间
  const [min, max] = CLUE_RANGES[p.difficulty]!;
  expect(p.clues.length).toBeGreaterThanOrEqual(min);
  expect(p.clues.length).toBeLessThanOrEqual(max);
  // 5. 文案非空且为字符串
  for (const clue of p.clues) {
    expect(clue.text.length).toBeGreaterThan(0);
  }
  // 6. 选项数正确
  expect(p.options).toHaveLength(p.categoryCount);
  for (const opts of p.options) expect(opts).toHaveLength(p.optionCount);
}

describe('生成器 · 属性测试（fast-check）', () => {
  const difficulties = ['easy', 'medium', 'hard', 'four'] as const;

  for (const d of difficulties) {
    it(`${d}: 随机种子生成 → 唯一解 ∧ 无猜测可解 ∧ 线索为真`, () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 1_000_000 }), (seedNum) => {
          const p = generatePuzzle({ difficulty: d, seed: `fc:${d}:${seedNum}`, maxAttempts: 80 });
          assertValidPuzzle(p);
        }),
        { numRuns: 8 },
      );
    }, 120_000);
  }

  it('确定性：同一种子生成完全相同的谜题', () => {
    const a = generatePuzzle({ difficulty: 'medium', seed: 'fixed-seed' });
    const b = generatePuzzle({ difficulty: 'medium', seed: 'fixed-seed' });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('每日谜题：同一日期同题，不同日期不同题（大概率）', () => {
    const d1a = dailyPuzzle('2026-09-16');
    const d1b = dailyPuzzle('2026-09-16');
    const d2 = dailyPuzzle('2026-09-17');
    expect(JSON.stringify(d1a)).toBe(JSON.stringify(d1b));
    expect(JSON.stringify(d1a)).not.toBe(JSON.stringify(d2));
  });
});
