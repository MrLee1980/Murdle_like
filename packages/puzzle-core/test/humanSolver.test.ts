import { describe, it, expect } from 'vitest';
import {
  applyClues,
  propagate,
  isSolved,
  solveFromClues,
  getMark,
  type Marks,
} from '../src/humanSolver.js';
import type { Clue } from '../src/types.js';

const K = 3;
const N = 4;

describe('humanSolver 推理规则', () => {
  it('R1 绑定排除：✓ 触发同行列 ✗', () => {
    const clues: Clue[] = [{ type: 'BIND', a: { cat: 0, opt: 0 }, b: { cat: 1, opt: 0 }, text: '' }];
    const marks = applyClues(clues);
    propagate(K, N, marks);
    // (0,0)✓(1,0) → (0,0) 与 (1,1..3) ✗，(0,1..3) 与 (1,0) ✗
    expect(getMark(marks, { cat: 0, opt: 0 }, { cat: 1, opt: 1 })).toBe('no');
    expect(getMark(marks, { cat: 0, opt: 3 }, { cat: 1, opt: 0 })).toBe('no');
    expect(getMark(marks, { cat: 0, opt: 0 }, { cat: 1, opt: 0 })).toBe('yes');
  });

  it('R2 唯一候选：只剩一格时推出 ✓', () => {
    // 手动构造：嫌疑人0 与 凶器0..2 全部 ✗
    const marks: Marks = new Map();
    const mk = (a: [number, number], b: [number, number], m: 'yes' | 'no') =>
      marks.set(`${a[0]}:${a[1]}|${b[0]}:${b[1]}`, m);
    for (let j = 0; j < 3; j++) mk([0, 0], [1, j], 'no');
    propagate(K, N, marks);
    // → 嫌疑人0 ✓ 凶器3
    expect(getMark(marks, { cat: 0, opt: 0 }, { cat: 1, opt: 3 })).toBe('yes');
  });

  it('R3 传递绑定：A✓B 且 B✓C ⇒ A✓C（跨子网格）', () => {
    const clues: Clue[] = [
      { type: 'BIND', a: { cat: 0, opt: 0 }, b: { cat: 1, opt: 0 }, text: '' },
      { type: 'BIND', a: { cat: 1, opt: 0 }, b: { cat: 2, opt: 0 }, text: '' },
    ];
    const marks = applyClues(clues);
    propagate(K, N, marks);
    expect(getMark(marks, { cat: 0, opt: 0 }, { cat: 2, opt: 0 })).toBe('yes');
  });

  it('R4 传递排除：A✓B 且 B✗C ⇒ A✗C', () => {
    const clues: Clue[] = [
      { type: 'BIND', a: { cat: 0, opt: 0 }, b: { cat: 1, opt: 0 }, text: '' },
      { type: 'EXCLUDE', a: { cat: 1, opt: 0 }, b: { cat: 2, opt: 0 }, text: '' },
    ];
    const marks = applyClues(clues);
    propagate(K, N, marks);
    expect(getMark(marks, { cat: 0, opt: 0 }, { cat: 2, opt: 0 })).toBe('no');
  });

  it('矛盾标记抛异常', () => {
    const clues: Clue[] = [
      { type: 'BIND', a: { cat: 0, opt: 0 }, b: { cat: 1, opt: 0 }, text: '' },
      { type: 'EXCLUDE', a: { cat: 0, opt: 0 }, b: { cat: 1, opt: 0 }, text: '' },
    ];
    expect(() => solveFromClues(K, N, clues)).toThrow();
  });

  it('isSolved 判定完整匹配', () => {
    // 构造完整解：slot = opt（恒等绑定）
    const clues: Clue[] = [];
    for (let i = 0; i < N; i++) {
      clues.push({ type: 'BIND', a: { cat: 0, opt: i }, b: { cat: 1, opt: i }, text: '' });
      clues.push({ type: 'BIND', a: { cat: 0, opt: i }, b: { cat: 2, opt: i }, text: '' });
    }
    const { solved, marks } = solveFromClues(K, N, clues);
    expect(solved).toBe(true);
    expect(isSolved(K, N, marks)).toBe(true);
  });

  it('GROUP 线索展开为两两 ✓', () => {
    const clues: Clue[] = [
      {
        type: 'GROUP',
        members: [
          { cat: 0, opt: 0 },
          { cat: 1, opt: 1 },
          { cat: 2, opt: 2 },
        ],
        text: '',
      },
    ];
    const marks = applyClues(clues);
    expect(getMark(marks, { cat: 0, opt: 0 }, { cat: 1, opt: 1 })).toBe('yes');
    expect(getMark(marks, { cat: 0, opt: 0 }, { cat: 2, opt: 2 })).toBe('yes');
    expect(getMark(marks, { cat: 1, opt: 1 }, { cat: 2, opt: 2 })).toBe('yes');
  });
});
