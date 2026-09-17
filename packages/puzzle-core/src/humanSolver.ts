/**
 * 类人推理求解器（humanSolver）—— 提示引擎与「无猜测可解」验收门。
 *
 * 只用人类玩家可理解的推理规则，在 ✓/✗ 网格标记上迭代推进：
 * - R1 绑定排除：A✓B ⇒ A 与 B 同类其余项全部 ✗
 * - R2 唯一候选：某行/列只剩一个非 ✗ 格 ⇒ 该格 ✓
 * - R3 传递绑定：A✓B 且 B✓C ⇒ A✓C（A、C 不同类别）
 * - R4 传递排除：A✓B 且 B✗C ⇒ A✗C
 *
 * 若从线索出发能推出完整解，说明该题「不需要猜」。
 */

import type { Clue, EntityRef, Mark } from './types.js';
import { directMarksOf } from './clues.js';

export type Marks = Map<string, Mark>;

/** 规范化键：类别小的在前 */
function key(e1: EntityRef, e2: EntityRef): string {
  const [a, b] = e1.cat <= e2.cat ? [e1, e2] : [e2, e1];
  return `${a.cat}:${a.opt}|${b.cat}:${b.opt}`;
}

export function getMark(marks: Marks, e1: EntityRef, e2: EntityRef): Mark | undefined {
  if (e1.cat === e2.cat) return undefined;
  return marks.get(key(e1, e2));
}

export class ContradictionError extends Error {}

function setMark(marks: Marks, e1: EntityRef, e2: EntityRef, mark: Mark): boolean {
  if (e1.cat === e2.cat) return false;
  const k = key(e1, e2);
  const prev = marks.get(k);
  if (prev === mark) return false;
  if (prev !== undefined) throw new ContradictionError(`标记冲突: ${k} ${prev} vs ${mark}`);
  marks.set(k, mark);
  return true;
}

/** 把线索直接译为初始标记 */
export function applyClues(clues: readonly Clue[]): Marks {
  const marks: Marks = new Map();
  for (const clue of clues) {
    for (const [a, b, mark] of directMarksOf(clue)) {
      setMark(marks, a, b, mark);
    }
  }
  return marks;
}

export interface ApplyRecord {
  pair: [EntityRef, EntityRef];
  mark: Mark;
  rule: string;
}

export interface PropagateOptions {
  /** 每次应用新标记时回调（用于提示引擎解释推理步骤） */
  onApply?: (rec: ApplyRecord) => void;
}

/**
 * 迭代应用全部推理规则直到不动点。
 * 返回是否有新标记产生。
 */
export function propagate(K: number, N: number, marks: Marks, opts?: PropagateOptions): void {
  const opts_ = opts;
  const apply = (e1: EntityRef, e2: EntityRef, mark: Mark, rule: string): boolean => {
    if (e1.cat === e2.cat) return false;
    const changed = setMark(marks, e1, e2, mark);
    if (changed) opts_?.onApply?.({ pair: [e1, e2], mark, rule });
    return changed;
  };

  // 同类其余选项（不含自身）
  const siblings = (e: EntityRef): EntityRef[] => {
    const out: EntityRef[] = [];
    for (let o = 0; o < N; o++) if (o !== e.opt) out.push({ cat: e.cat, opt: o });
    return out;
  };

  let changed = true;
  while (changed) {
    changed = false;

    // 收集当前全部 ✓（R1/R3/R4 的触发源）
    const yesPairs: Array<[EntityRef, EntityRef]> = [];
    for (const [k, m] of marks) {
      if (m !== 'yes') continue;
      const [l, r] = k.split('|');
      const [c1, o1] = l!.split(':').map(Number);
      const [c2, o2] = r!.split(':').map(Number);
      yesPairs.push([{ cat: c1!, opt: o1! }, { cat: c2!, opt: o2! }]);
    }

    // R1 绑定排除
    for (const [a, b] of yesPairs) {
      for (const s of siblings(b)) changed = apply(a, s, 'no', 'R1') || changed;
      for (const s of siblings(a)) changed = apply(s, b, 'no', 'R1') || changed;
    }

    // R2 唯一候选（行/列两个方向）
    for (let c1 = 0; c1 < K; c1++) {
      for (let c2 = c1 + 1; c2 < K; c2++) {
        // 方向一：c1 的每个选项在 c2 中找唯一非 ✗
        for (let i = 0; i < N; i++) {
          const a: EntityRef = { cat: c1, opt: i };
          let candidate = -1;
          let count = 0;
          for (let j = 0; j < N; j++) {
            if (getMark(marks, a, { cat: c2, opt: j }) !== 'no') {
              candidate = j;
              count++;
            }
          }
          if (count === 1 && getMark(marks, a, { cat: c2, opt: candidate! }) !== 'yes') {
            changed = apply(a, { cat: c2, opt: candidate! }, 'yes', 'R2') || changed;
          }
        }
        // 方向二：c2 的每个选项在 c1 中找唯一非 ✗
        for (let j = 0; j < N; j++) {
          const b: EntityRef = { cat: c2, opt: j };
          let candidate = -1;
          let count = 0;
          for (let i = 0; i < N; i++) {
            if (getMark(marks, { cat: c1, opt: i }, b) !== 'no') {
              candidate = i;
              count++;
            }
          }
          if (count === 1 && getMark(marks, { cat: c1, opt: candidate! }, b) !== 'yes') {
            changed = apply({ cat: c1, opt: candidate! }, b, 'yes', 'R2') || changed;
          }
        }
      }
    }

    // R3 传递绑定 / R4 传递排除：沿 ✓ 边走两步（两个方向都试）
    const allEntities: EntityRef[] = [];
    for (let c = 0; c < K; c++) for (let o = 0; o < N; o++) allEntities.push({ cat: c, opt: o });

    for (const [a, b] of yesPairs) {
      for (const c of allEntities) {
        if (c.cat === a.cat || c.cat === b.cat) continue;
        // 以 b 为枢轴：a✓b 且 b?c
        const m1 = getMark(marks, b, c);
        if (m1 === 'yes') changed = apply(a, c, 'yes', 'R3') || changed;
        else if (m1 === 'no') changed = apply(a, c, 'no', 'R4') || changed;
        // 以 a 为枢轴：a✓b 且 a?c
        const m2 = getMark(marks, a, c);
        if (m2 === 'yes') changed = apply(b, c, 'yes', 'R3') || changed;
        else if (m2 === 'no') changed = apply(b, c, 'no', 'R4') || changed;
      }
    }
  }
}

/** 是否已完全解出：每个类别对的 ✓ 构成完美匹配 */
export function isSolved(K: number, N: number, marks: Marks): boolean {
  for (let c1 = 0; c1 < K; c1++) {
    for (let c2 = c1 + 1; c2 < K; c2++) {
      let yesCount = 0;
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
          if (marks.get(key({ cat: c1, opt: i }, { cat: c2, opt: j })) === 'yes') yesCount++;
        }
      }
      if (yesCount !== N) return false;
    }
  }
  return true;
}

export interface SolveResult {
  solved: boolean;
  marks: Marks;
}

/** 从线索出发推理（「无猜测可解」验收门的实现） */
export function solveFromClues(K: number, N: number, clues: readonly Clue[]): SolveResult {
  const marks = applyClues(clues);
  propagate(K, N, marks);
  return { solved: isSolved(K, N, marks), marks };
}

export interface Hint {
  pair: [EntityRef, EntityRef];
  mark: Mark;
  rule: string;
}

const RULE_EXPLANATION: Record<string, string> = {
  R1: '两者已确定绑定，因此与其中一方同类冲突的选项都可排除。',
  R2: '该行/列其余选项均已排除，唯一剩下的格子必定成立。',
  R3: '两者分别与同一对象绑定，因此它们彼此绑定。',
  R4: '一方与某对象绑定，而该对象已排除另一方，因此这两者也可排除。',
};

/**
 * 提示引擎：结合线索与玩家当前标记，找出下一个可逻辑推导的格子。
 * 返回 null 表示当前局面下没有可推导的新格子（可能已解出或需要猜测）。
 */
export function getHint(
  K: number,
  N: number,
  clues: readonly Clue[],
  playerMarks: Marks,
): (Hint & { explanation: string }) | null {
  const marks = applyClues(clues);
  // 合并玩家标记（与线索矛盾时以不报错为先：忽略冲突的玩家标记）
  for (const [k, m] of playerMarks) {
    if (!marks.has(k)) marks.set(k, m);
  }
  const derived: ApplyRecord[] = [];
  try {
    propagate(K, N, marks, { onApply: (rec) => derived.push(rec) });
  } catch {
    return null;
  }
  const playerKeys = new Set(playerMarks.keys());
  for (const rec of derived) {
    const k = key(rec.pair[0], rec.pair[1]);
    if (!playerKeys.has(k)) {
      return { ...rec, explanation: RULE_EXPLANATION[rec.rule] ?? rec.rule };
    }
  }
  return null;
}
