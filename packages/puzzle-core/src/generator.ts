/**
 * 谜题生成器。
 *
 * 流程（对应设计文档 4.1）：
 * 1. 采样一个合法完整解（种子 RNG，确定性）。
 * 2. 枚举该解下为真的原子线索候选池。
 * 3. 贪心选线索：在剩余解集合的随机子样上评估每个候选的「消去量」，
 *    从消去量 top 中随机选取（带抖动，避免题型单一），直到回溯验证唯一解。
 * 4. 用冗余真线索填充到难度下限（保持唯一性），超出上限则整题重试。
 * 5. 验收门：countSolutions == 1 且 humanSolver 无猜测可解；不过则换种子重试。
 * 6. 渲染中文文案并打乱顺序。
 */

import type { Clue, EntityRef, GeneratorConfig, Puzzle, SlotAssignment } from './types.js';
import { enumerateCandidateClues, clueKey, directMarksOf, renderClue } from './clues.js';
import {
  allSolutionCodes,
  countSolutions,
  decodeSolution,
  factorial,
  getPermTable,
  randomSolutionCode,
} from './solver.js';
import { solveFromClues } from './humanSolver.js';
import { createRng, shuffled, randInt } from './rng.js';
import { THEMES, getTheme } from './theme.js';
import { buildStory, buildEpilogue } from './story.js';

interface DifficultyPreset {
  n: number;
  categories: 3 | 4;
  clueMin: number;
  clueMax: number;
}

const PRESETS: Record<string, DifficultyPreset> = {
  easy: { n: 4, categories: 3, clueMin: 5, clueMax: 7 },
  medium: { n: 5, categories: 3, clueMin: 7, clueMax: 9 },
  hard: { n: 6, categories: 3, clueMin: 9, clueMax: 12 },
  four: { n: 4, categories: 4, clueMin: 6, clueMax: 9 },
};

const SCORE_SAMPLE = 6_000;
const MAX_SCORED = 200;

export function generatePuzzle(config: GeneratorConfig = {}): Puzzle {
  const difficulty = config.difficulty ?? 'easy';
  const preset = PRESETS[difficulty]!;
  const K = config.categories ?? preset.categories;
  const N = config.n ?? preset.n;
  const maxAttempts = config.maxAttempts ?? 60;
  const baseSeed = config.seed ?? `auto:${Date.now()}`;

  // 枚举空间 guard（K=4 时 N 必须 ≤5）
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const seed = `${baseSeed}#${attempt}`;
    const rng = createRng(seed);
    const theme = config.themeId ? getTheme(config.themeId) : THEMES[randInt(rng, THEMES.length)]!;

    // 1. 采样解
    const code = randomSolutionCode(K, N, rng);
    const solution = decodeSolution(code, K, N);

    // 2. 候选线索池（打乱以配合抖动选取）
    const pool = shuffled(enumerateCandidateClues(solution, K, N), rng);

    // 3. 贪心选取至唯一解
    //    remaining 是「满足已选线索的全部解」的精确集合（从全空间逐条过滤而来），
    //    因此 remaining.length === 1 即唯一解，无需回溯计数。
    const selected: Clue[] = [];
    let remaining = allSolutionCodes(K, N);
    let overshoot = false;
    const permTable = getPermTable(N);
    const fN = factorial(N);
    /** 零分配地把 code 解码到复用的 scratch 缓冲区（含类别 0 恒等） */
    const scratch = new Int8Array(K * N);
    const decodeInto = (code: number): Int8Array => {
      for (let i = 0; i < N; i++) scratch[i] = i;
      let rest = code;
      for (let c = 1; c < K; c++) {
        const idx = rest % fN;
        rest = Math.floor(rest / fN);
        const perm = permTable[idx]!;
        for (let i = 0; i < N; i++) scratch[c * N + i] = perm[i]!;
      }
      return scratch;
    };

    while (remaining.length > 1) {
      // 在子样上评估消去量（子样每轮只解码一次）
      const sample = subsample(remaining, SCORE_SAMPLE, rng);
      const sampleArrs = new Int8Array(sample.length * K * N);
      for (let i = 0; i < sample.length; i++) {
        decodeInto(sample[i]!);
        sampleArrs.set(scratch, i * K * N);
      }
      const selectedKeys = new Set(selected.map(clueKey));
      const unused = pool.filter((c) => !selectedKeys.has(clueKey(c)));
      // 每轮最多评估 MAX_SCORED 个候选，控制耗时
      const toScore = unused.length > MAX_SCORED ? shuffled(unused, rng).slice(0, MAX_SCORED) : unused;
      const scored = toScore
        .map((c) => ({ clue: c, keep: countSatisfiedFlat(c, sampleArrs, sample.length, K, N) }))
        .filter((s) => s.keep < sample.length && s.keep > 0);
      if (scored.length === 0) {
        overshoot = true;
        break;
      }
      scored.sort((x, y) => x.keep - y.keep); // keep 越少消去越多
      const top = scored.slice(0, Math.min(5, scored.length));
      const chosen = top[randInt(rng, top.length)]!.clue;
      selected.push(chosen);
      // 过滤剩余解（零分配快路径）
      const kept: number[] = [];
      for (let i = 0; i < remaining.length; i++) {
        if (clueSatisfiedFlat(chosen, decodeInto(remaining[i]!), K, N)) kept.push(remaining[i]!);
      }
      remaining = Uint32Array.from(kept);
      if (selected.length > preset.clueMax + 4) {
        overshoot = true;
        break;
      }
    }
    if (overshoot || remaining.length !== 1) continue;

    // 4. 填充冗余真线索到下限（同时让题目更丰富）
    const directKeys = new Set<string>();
    const refreshDirectKeys = () => {
      directKeys.clear();
      for (const clue of selected) {
        for (const [a, b] of directMarksOf(clue).map(([x, y]) => [x, y] as const)) {
          directKeys.add(`${a.cat}:${a.opt}|${b.cat}:${b.opt}`);
          directKeys.add(`${b.cat}:${b.opt}|${a.cat}:${a.opt}`);
        }
      }
    };
    refreshDirectKeys();

    const selectedKeysForFill = new Set(selected.map(clueKey));
    const fillers = shuffled(pool.filter((c) => !selectedKeysForFill.has(clueKey(c))), rng);
    for (const f of fillers) {
      if (selected.length >= preset.clueMin) break;
      // 只加「直接标记尚未被已有线索覆盖」的冗余线索，避免纯废话。
      // 候选池线索全部在唯一解下为真，加入后解必然仍是该唯一解，无需重新验证。
      const fresh = directMarksOf(f).some(
        ([a, b]) =>
          !directKeys.has(`${a.cat}:${a.opt}|${b.cat}:${b.opt}`) &&
          !directKeys.has(`${b.cat}:${b.opt}|${a.cat}:${a.opt}`),
      );
      if (!fresh) continue;
      selected.push(f);
      refreshDirectKeys();
    }
    if (selected.length < preset.clueMin || selected.length > preset.clueMax) continue;

    // 5. 验收门：无猜测可解
    const { solved } = solveFromClues(K, N, selected);
    if (!solved) continue;

    // 6. 渲染 + 打乱顺序
    const clues = shuffled(selected, rng).map((c) => ({ ...c, text: renderClue(c, theme, K, rng) }));

    // 7. 文学层：案情提要（不泄露答案）+ 结案陈词（指向凶手的关键证据）
    const culpritSlot = randInt(rng, N);
    const options = theme.categories.slice(0, K).map((c) => c.options.slice(0, N));
    const story = buildStory(theme, K, N, options, rng);
    const puzzle: Puzzle = {
      categoryCount: K,
      optionCount: N,
      categories: theme.categories.slice(0, K).map((c) => ({ id: c.id, name: c.name })),
      options,
      solution,
      clues,
      difficulty,
      seed,
      themeId: theme.id,
      culpritSlot,
      story,
      epilogue: [],
    };
    puzzle.epilogue = buildEpilogue(puzzle);
    return puzzle;
  }

  throw new Error(
    `生成失败：${maxAttempts} 次尝试均未通过验收门（difficulty=${difficulty}, K=${K}, N=${N}）`,
  );
}

function subsample(codes: Uint32Array, max: number, rng: () => number): Uint32Array {
  if (codes.length <= max) return codes;
  const out = new Uint32Array(max);
  for (let i = 0; i < max; i++) out[i] = codes[Math.floor(rng() * codes.length)]!;
  return out;
}

/** 快路径：完整解（扁平槽位数组，长度 K*N，含类别 0）上的线索判定 */
function clueSatisfiedFlat(clue: Clue, slots: Int8Array, K: number, N: number): boolean {
  const s = (e: EntityRef) => slots[e.cat * N + e.opt]!;
  switch (clue.type) {
    case 'EXCLUDE':
      return s(clue.a!) !== s(clue.b!);
    case 'BIND':
      return s(clue.a!) === s(clue.b!);
    case 'GROUP': {
      const v = s(clue.members![0]!);
      return clue.members!.every((m) => s(m) === v);
    }
    case 'NOT_IN': {
      const sa = s(clue.a!);
      return clue.others!.every((o) => s(o) !== sa);
    }
  }
}

/** 统计样本（每行一个扁平解）中满足线索的数量 */
function countSatisfiedFlat(clue: Clue, sampleArrs: Int8Array, rows: number, K: number, N: number): number {
  const rowSize = K * N;
  let n = 0;
  for (let i = 0; i < rows; i++) {
    if (clueSatisfiedFlat(clue, sampleArrs.subarray(i * rowSize, (i + 1) * rowSize), K, N)) n++;
  }
  return n;
}

/** 每日谜题：种子 = 日期字符串，同一天所有玩家同题 */
export function dailyPuzzle(dateISO: string, difficulty: GeneratorConfig['difficulty'] = 'medium'): Puzzle {
  return generatePuzzle({ seed: `daily:${dateISO}`, difficulty });
}
