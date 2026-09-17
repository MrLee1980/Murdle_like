/**
 * 进行中的对局状态（Zustand，不持久化 —— 刷新即重开一局）。
 */
import { create } from 'zustand';
import { getHint, type Hint, type Mark, type Puzzle } from '@murdle/puzzle-core';
import { markKey } from '../lib/derive';

export type GamePhase = 'solving' | 'accusing' | 'won' | 'lost';

interface AccuseResult {
  outcome: 'correct' | 'wrong';
  wrongPair?: [number, number];
  /** 组合本身逻辑自洽，但指认的不是真凶 */
  innocent?: boolean;
}

interface GameStore {
  puzzle: Puzzle | null;
  modeKey: string;
  player: Record<string, Mark>;
  phase: GamePhase;
  hearts: number;
  hintsUsed: number;
  wrongCount: number;
  elapsedMs: number;
  lastHint: (Hint & { key: string }) | null;

  loadPuzzle(puzzle: Puzzle, modeKey: string): void;
  toggleMark(e1: { cat: number; opt: number }, e2: { cat: number; opt: number }): void;
  cycleMark(key: string, current: Mark | undefined): void;
  requestHint(): void;
  openAccuse(): void;
  closeAccuse(): void;
  accuse(selection: number[]): AccuseResult;
  tick(ms: number): void;
}

export const MAX_HEARTS = 3;

/** 难度对应的标准用时（毫秒），超过扣星 */
function parTime(p: Puzzle): number {
  return (60 + p.optionCount * p.optionCount * 8) * 1000 * (p.categoryCount / 3);
}

export function starsFor(p: Puzzle, s: { wrongCount: number; hintsUsed: number; elapsedMs: number }): number {
  let stars = 3;
  if (s.wrongCount > 0) stars--;
  if (s.hintsUsed > 0) stars--;
  if (s.elapsedMs > parTime(p)) stars--;
  return Math.max(1, stars);
}

export const useGameStore = create<GameStore>((set, get) => ({
  puzzle: null,
  modeKey: '',
  player: {},
  phase: 'solving',
  hearts: MAX_HEARTS,
  hintsUsed: 0,
  wrongCount: 0,
  elapsedMs: 0,
  lastHint: null,

  loadPuzzle: (puzzle, modeKey) =>
    set({
      puzzle,
      modeKey,
      player: {},
      phase: 'solving',
      hearts: MAX_HEARTS,
      hintsUsed: 0,
      wrongCount: 0,
      elapsedMs: 0,
      lastHint: null,
    }),

  toggleMark: (e1, e2) => {
    const key = markKey(e1, e2);
    const cur = get().player[key];
    const next: Mark | undefined = cur === undefined ? 'yes' : cur === 'yes' ? 'no' : undefined;
    const player = { ...get().player };
    if (next === undefined) delete player[key];
    else player[key] = next;
    set({ player, lastHint: null });
  },

  cycleMark: (key, current) => {
    const next: Mark | undefined = current === undefined ? 'yes' : current === 'yes' ? 'no' : undefined;
    const player = { ...get().player };
    if (next === undefined) delete player[key];
    else player[key] = next;
    set({ player, lastHint: null });
  },

  requestHint: () => {
    const { puzzle, player, hintsUsed } = get();
    if (!puzzle || get().phase !== 'solving') return;
    const hint = getHint(puzzle.categoryCount, puzzle.optionCount, puzzle.clues, new Map(Object.entries(player)));
    if (!hint) return;
    const key = markKey(hint.pair[0], hint.pair[1]);
    set({ player: { ...player, [key]: hint.mark }, hintsUsed: hintsUsed + 1, lastHint: { ...hint, key } });
  },

  openAccuse: () => set({ phase: 'accusing' }),
  closeAccuse: () => set({ phase: 'solving' }),

  accuse: (selection) => {
    const { puzzle, hearts } = get();
    if (!puzzle) return { outcome: 'wrong' };
    const sol = puzzle.solution;
    // 自洽：所选选项在网格匹配中两两同槽（逻辑上说得通）
    const consistent = selection.every((sel, c) =>
      selection.every((other, c2) => c === c2 || sol[c]![sel]! === sol[c2]![other]!),
    );
    // 真凶：全部命中 culpritSlot 的组合
    const isCulprit = selection.every((sel, c) => sol[c]![sel]! === puzzle.culpritSlot);
    if (consistent && isCulprit) {
      set({ phase: 'won' });
      return { outcome: 'correct' };
    }
    // 找出指控中第一对矛盾的类别，用于提示
    let wrongPair: [number, number] | undefined;
    for (let c = 0; c < selection.length && !wrongPair; c++) {
      for (let c2 = c + 1; c2 < selection.length; c2++) {
        if (sol[c]![selection[c]!]! !== sol[c2]![selection[c2]!]!) {
          wrongPair = [c, c2];
          break;
        }
      }
    }
    const left = hearts - 1;
    set({ hearts: left, wrongCount: get().wrongCount + 1, phase: left <= 0 ? 'lost' : 'accusing' });
    return { outcome: 'wrong', wrongPair, innocent: consistent };
  },

  tick: (ms) => {
    if (get().phase === 'solving') set({ elapsedMs: get().elapsedMs + ms });
  },
}));
