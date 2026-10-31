/**
 * 标记推导：把 puzzle-core 的推理器接到 React 状态上。
 *
 * - base:    仅靠线索可推出的标记（玩家不可改）
 * - merged:  base + 玩家标记 + 全量传播后的结果
 * - derived: merged 中「非玩家手打、非线索直接给出」的幽灵标记（自动推论，半透明显示）
 * - conflicts: 玩家标记与线索矛盾（或玩家自相矛盾）的格子，红色高亮
 */
import { applyClues, propagate, ContradictionError, type Mark } from '@yianbu/puzzle-core';
import type { EntityRef, Puzzle } from '@yianbu/puzzle-core';

export function markKey(e1: EntityRef, e2: EntityRef): string {
  const [a, b] = e1.cat <= e2.cat ? [e1, e2] : [e2, e1];
  return `${a.cat}:${a.opt}|${b.cat}:${b.opt}`;
}

export interface DerivedState {
  base: Record<string, Mark>;
  merged: Record<string, Mark>;
  derived: Record<string, Mark>;
  conflicts: Set<string>;
}

export function deriveState(puzzle: Puzzle, player: Record<string, Mark>): DerivedState {
  const K = puzzle.categoryCount;
  const N = puzzle.optionCount;

  const baseMap = applyClues(puzzle.clues);
  propagate(K, N, baseMap);
  const base = Object.fromEntries(baseMap) as Record<string, Mark>;

  const conflicts = new Set<string>();
  const mergedMap = new Map(baseMap);
  for (const [k, m] of Object.entries(player)) {
    if (mergedMap.has(k)) {
      if (mergedMap.get(k) !== m) conflicts.add(k);
    } else {
      mergedMap.set(k, m);
    }
  }

  const propagated = new Map(mergedMap);
  let selfConflict = false;
  try {
    propagate(K, N, propagated);
  } catch (e) {
    if (e instanceof ContradictionError) selfConflict = true;
    else throw e;
  }

  // 玩家自相矛盾：逐个回放找出肇事的标记（保持其余可用）
  if (selfConflict) {
    const keys = Object.keys(player);
    const good = new Map(baseMap);
    for (const k of keys) {
      const trial = new Map(good);
      trial.set(k, player[k]!);
      try {
        propagate(K, N, trial);
        good.set(k, player[k]!);
      } catch {
        conflicts.add(k);
      }
    }
    propagated.clear();
    for (const [k, v] of good) propagated.set(k, v);
  }

  const merged = Object.fromEntries(propagated) as Record<string, Mark>;
  const derived: Record<string, Mark> = {};
  for (const [k, v] of propagated) {
    if (!(k in base) && !(k in player)) derived[k] = v;
  }
  return { base, merged, derived, conflicts };
}

export function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function cellRefsFromKey(key: string): [EntityRef, EntityRef] {
  const [l, r] = key.split('|');
  const [c1, o1] = l!.split(':').map(Number);
  const [c2, o2] = r!.split(':').map(Number);
  return [
    { cat: c1!, opt: o1! },
    { cat: c2!, opt: o2! },
  ];
}
