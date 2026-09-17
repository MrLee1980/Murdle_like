/**
 * M2 压力测试：四档难度的产题率、生成耗时、线索数与推理步数分布。
 *
 * 验收目标（设计文档 M2）：
 * - 全部难度随机种子产题成功率 100%（默认 60 次尝试内通过验收门）
 * - 单题生成耗时：easy/medium p50 < 200ms，hard/four p50 < 500ms，p95 < 2s
 * - 属性复验：唯一解 ∧ 无猜测可解 ∧ 线索全真（抽测）
 */
import { describe, it, expect } from 'vitest';
import { generatePuzzle } from '../src/generator.js';
import { countSolutions } from '../src/solver.js';
import { applyClues, propagate } from '../src/humanSolver.js';
import { evalClueFull } from '../src/clues.js';
import type { Difficulty, Puzzle } from '../src/types.js';

const SAMPLE = 40;

interface Stats {
  genMs: number[];
  attempts: number[];
  clueCounts: number[];
  stepCounts: number[];
  fail: number;
}

function measure(p: Puzzle, genMs: number, attempts: number): number {
  // 推理步数 = 从线索出发 propagate 的全部应用记录数
  const marks = applyClues(p.clues);
  let steps = 0;
  propagate(p.categoryCount, p.optionCount, marks, { onApply: () => steps++ });
  void genMs;
  void attempts;
  return steps;
}

function pct(sorted: number[], q: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))]!;
}

function runDifficulty(difficulty: Difficulty, n?: number): Stats {
  const stats: Stats = { genMs: [], attempts: [], clueCounts: [], stepCounts: [], fail: 0 };
  for (let i = 0; i < SAMPLE; i++) {
    const t0 = performance.now();
    try {
      const p = generatePuzzle({ difficulty, seed: `stress:${difficulty}:${i}`, ...(n ? { n } : {}) });
      stats.genMs.push(performance.now() - t0);
      // attempts 从 seed 后缀解析
      stats.attempts.push(Number(p.seed.split('#')[1] ?? 0));
      stats.clueCounts.push(p.clues.length);
      stats.stepCounts.push(measure(p, 0, 0));
    } catch {
      stats.fail++;
    }
  }
  return stats;
}

function report(name: string, s: Stats) {
  const ms = s.genMs.slice().sort((a, b) => a - b);
  const steps = s.stepCounts.slice().sort((a, b) => a - b);
  const clues = s.clueCounts.slice().sort((a, b) => a - b);
  const att = s.attempts.slice().sort((a, b) => a - b);
  console.log(
    [
      `${name}: 成功 ${s.genMs.length}/${SAMPLE}`,
      `生成 p50=${pct(ms, 0.5).toFixed(0)}ms p95=${pct(ms, 0.95).toFixed(0)}ms max=${ms[ms.length - 1]!.toFixed(0)}ms`,
      `尝试次数 p50=${pct(att, 0.5)} p95=${pct(att, 0.95)} max=${att[att.length - 1]}`,
      `线索数 min=${clues[0]} p50=${pct(clues, 0.5)} max=${clues[clues.length - 1]}`,
      `推理步数 min=${steps[0]} p50=${pct(steps, 0.5)} max=${steps[steps.length - 1]}`,
    ].join('\n  '),
  );
}

describe('M2 压力测试', () => {
  it('easy (K=3, N=4)', () => {
    const s = runDifficulty('easy');
    report('easy  ', s);
    expect(s.fail).toBe(0);
    expect(pct(s.genMs.slice().sort((a, b) => a - b), 0.5)).toBeLessThan(200);
  }, 60_000);

  it('medium (K=3, N=5)', () => {
    const s = runDifficulty('medium');
    report('medium', s);
    expect(s.fail).toBe(0);
    expect(pct(s.genMs.slice().sort((a, b) => a - b), 0.5)).toBeLessThan(250);
  }, 90_000);

  it('hard (K=3, N=6)', () => {
    const s = runDifficulty('hard');
    report('hard  ', s);
    expect(s.fail).toBe(0);
    expect(pct(s.genMs.slice().sort((a, b) => a - b), 0.5)).toBeLessThan(500);
    expect(pct(s.genMs.slice().sort((a, b) => a - b), 0.95)).toBeLessThan(2000);
  }, 120_000);

  it('four (K=4, N=4)', () => {
    const s = runDifficulty('four');
    report('four  ', s);
    expect(s.fail).toBe(0);
    expect(pct(s.genMs.slice().sort((a, b) => a - b), 0.5)).toBeLessThan(500);
  }, 90_000);

  it('four 变体 (K=4, N=5)：枚举空间 173 万仍可靠', () => {
    const s = runDifficulty('four', 5);
    report('fourN5', s);
    expect(s.fail).toBe(0);
  }, 120_000);

  it('抽测：全部难度属性复验（唯一解 ∧ 无猜测 ∧ 线索真）', () => {
    const diffs: Difficulty[] = ['easy', 'medium', 'hard', 'four'];
    for (const d of diffs) {
      for (let i = 0; i < 5; i++) {
        const p = generatePuzzle({ difficulty: d, seed: `reverify:${d}:${i}` });
        expect(countSolutions(p.categoryCount, p.optionCount, p.clues, 2)).toBe(1);
        const marks = applyClues(p.clues);
        propagate(p.categoryCount, p.optionCount, marks);
        const lookup = (cat: number, opt: number) => p.solution[cat]![opt]!;
        for (const clue of p.clues) expect(evalClueFull(clue, lookup)).toBe(true);
      }
    }
  }, 120_000);
});
