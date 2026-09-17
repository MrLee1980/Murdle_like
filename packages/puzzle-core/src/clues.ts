/**
 * 线索的谓词求值、候选线索枚举与中文文案渲染。
 *
 * 求值约定：lookup(cat, opt) 返回槽位（0..N-1），未知返回 -1。
 * - evalCluePartial: 与部分赋值矛盾 → false；已可判定为真 → true；信息不足 → undefined。
 * - evalClueFull:    完整赋值下必须为 true 或 false（生成器只保留为真的候选）。
 */

import type { Clue, ClueType, EntityRef, SlotAssignment } from './types.js';
import type { Theme } from './theme.js';
import type { Rng } from './rng.js';
import { randInt } from './rng.js';

export type SlotLookup = (cat: number, opt: number) => number;

export function evalCluePartial(clue: Clue, lookup: SlotLookup): boolean | undefined {
  switch (clue.type) {
    case 'EXCLUDE':
    case 'BIND': {
      const sa = lookup(clue.a!.cat, clue.a!.opt);
      const sb = lookup(clue.b!.cat, clue.b!.opt);
      if (sa < 0 || sb < 0) return undefined;
      return clue.type === 'EXCLUDE' ? sa !== sb : sa === sb;
    }
    case 'GROUP': {
      let val = -1;
      for (const m of clue.members!) {
        const s = lookup(m.cat, m.opt);
        if (s < 0) return undefined;
        if (val < 0) val = s;
        else if (s !== val) return false;
      }
      return true;
    }
    case 'NOT_IN': {
      const sa = lookup(clue.a!.cat, clue.a!.opt);
      if (sa < 0) return undefined;
      for (const o of clue.others!) {
        const so = lookup(o.cat, o.opt);
        if (so < 0) return undefined;
        if (so === sa) return false;
      }
      return true;
    }
  }
}

export function evalClueFull(clue: Clue, lookup: SlotLookup): boolean {
  return evalCluePartial(clue, lookup) === true;
}

/** 从完整解出发，枚举所有「在该解下为真」的原子线索候选（不带文案） */
export function enumerateCandidateClues(
  solution: SlotAssignment,
  K: number,
  N: number,
): Clue[] {
  const slotOf = (cat: number, opt: number) => solution[cat]![opt]!;
  const out: Clue[] = [];
  const seen = new Set<string>();

  const push = (clue: Clue) => {
    const k = clueKey(clue);
    if (seen.has(k)) return;
    seen.add(k);
    out.push(clue);
  };

  // 跨类别两两：同槽 → BIND，异槽 → EXCLUDE
  for (let c1 = 0; c1 < K; c1++) {
    for (let c2 = c1 + 1; c2 < K; c2++) {
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
          const a: EntityRef = { cat: c1, opt: i };
          const b: EntityRef = { cat: c2, opt: j };
          if (slotOf(c1, i) === slotOf(c2, j)) {
            push({ type: 'BIND', a, b, text: '' });
          } else {
            push({ type: 'EXCLUDE', a, b, text: '' });
          }
        }
      }
    }
  }

  // GROUP：类别子集大小 ≥3，取同一槽位上的实体
  const catSubsets: number[][] = [];
  const combos = (start: number, acc: number[], want: number) => {
    if (acc.length === want) {
      catSubsets.push(acc.slice());
      return;
    }
    for (let c = start; c < K; c++) {
      acc.push(c);
      combos(c + 1, acc, want);
      acc.pop();
    }
  };
  for (let size = 3; size <= K; size++) combos(0, [], size);

  for (const subset of catSubsets) {
    for (let s = 0; s < N; s++) {
      const members: EntityRef[] = [];
      let ok = true;
      for (const c of subset) {
        const opt = solution[c]!.findIndex((sl) => sl === s);
        if (opt < 0) {
          ok = false;
          break;
        }
        members.push({ cat: c, opt });
      }
      if (ok) push({ type: 'GROUP', members, text: '' });
    }
  }

  // NOT_IN：主体 a + 另一类别中 2..3 个「与 a 异槽」的实体
  for (let ca = 0; ca < K; ca++) {
    for (let i = 0; i < N; i++) {
      const a: EntityRef = { cat: ca, opt: i };
      const sa = slotOf(ca, i);
      for (let cb = 0; cb < K; cb++) {
        if (cb === ca) continue;
        const diffOpts: EntityRef[] = [];
        for (let j = 0; j < N; j++) {
          if (slotOf(cb, j) !== sa) diffOpts.push({ cat: cb, opt: j });
        }
        // 枚举大小 2 和 3 的组合
        const maxSize = Math.min(3, diffOpts.length);
        for (const o of choose(diffOpts, 2)) push({ type: 'NOT_IN', a, others: o, text: '' });
        if (maxSize >= 3) {
          for (const o of choose(diffOpts, 3)) push({ type: 'NOT_IN', a, others: o, text: '' });
        }
      }
    }
  }

  return out;
}

function choose<T>(arr: T[], k: number): T[][] {
  const out: T[][] = [];
  const rec = (start: number, acc: T[]) => {
    if (acc.length === k) {
      out.push(acc.slice());
      return;
    }
    for (let i = start; i < arr.length; i++) {
      acc.push(arr[i]!);
      rec(i + 1, acc);
      acc.pop();
    }
  };
  rec(0, []);
  return out;
}

/** 线索规范化键（用于去重） */
export function clueKey(clue: Clue): string {
  const ref = (e: EntityRef) => `${e.cat}.${e.opt}`;
  switch (clue.type) {
    case 'EXCLUDE':
    case 'BIND':
      // 无向：a、b 按类别序排序
      return [clue.a!, clue.b!].sort((x, y) => x.cat - y.cat || x.opt - y.opt).map(ref).join('|') + `:${clue.type}`;
    case 'GROUP':
      return clue.members!.slice().sort((x, y) => x.cat - y.cat || x.opt - y.opt).map(ref).join('|') + ':GROUP';
    case 'NOT_IN':
      return ref(clue.a!) + '<!' + clue.others!.slice().sort((x, y) => x.cat - y.cat || x.opt - y.opt).map(ref).join('|') + ':NOT_IN';
  }
}

/** 线索直接施加到网格的标记（用于生成器去重：已被蕴含的候选跳过） */
export function directMarksOf(clue: Clue): Array<[EntityRef, EntityRef, 'yes' | 'no']> {
  const out: Array<[EntityRef, EntityRef, 'yes' | 'no']> = [];
  const pair = (xs: EntityRef[], mark: 'yes' | 'no') => {
    for (let i = 0; i < xs.length; i++) {
      for (let j = i + 1; j < xs.length; j++) {
        if (xs[i]!.cat !== xs[j]!.cat) out.push([xs[i]!, xs[j]!, mark]);
      }
    }
  };
  switch (clue.type) {
    case 'EXCLUDE':
      out.push([clue.a!, clue.b!, 'no']);
      break;
    case 'BIND':
      out.push([clue.a!, clue.b!, 'yes']);
      break;
    case 'GROUP':
      pair(clue.members!, 'yes');
      break;
    case 'NOT_IN':
      for (const o of clue.others!) out.push([clue.a!, o, 'no']);
      break;
  }
  return out;
}

const list = (names: string[]) => names.map((s) => `「${s}」`).join('、');

/** 渲染线索为中文文案（每个类型多个句式变体，生成时按 rng 选取） */
export function renderClue(clue: Clue, theme: Theme, K: number, rng: Rng): string {
  const name = (e: EntityRef) => theme.categories[e.cat]!.options[e.opt]!;
  const variant = (templates: string[]) => templates[randInt(rng, templates.length)]!;

  switch (clue.type) {
    case 'EXCLUDE':
      return variant([
        `${name(clue.a!)}与${name(clue.b!)}毫无瓜葛。`,
        `可以排除：${name(clue.a!)}没有碰过${name(clue.b!)}。`,
        `线索表明，${name(clue.a!)}和${name(clue.b!)}对不上号。`,
      ]);
    case 'BIND':
      return variant([
        `${name(clue.a!)}正是与${name(clue.b!)}有关。`,
        `证据显示，${name(clue.a!)}对上了${name(clue.b!)}。`,
        `有人看见${name(clue.a!)}拿着${name(clue.b!)}。`,
      ]);
    case 'GROUP': {
      const names = clue.members!.map(name);
      const joined = names.slice(0, -1).join('、') + ' 和 ' + names[names.length - 1];
      return variant([
        `${joined}案发时都在同一处。`,
        `有人同时看见${joined}在一起。`,
        `${list(names)}属于同一组。`,
      ]);
    }
    case 'NOT_IN': {
      const names = clue.others!.map(name);
      if (names.length === 2) {
        return variant([
          `${name(clue.a!)}既不在${names[0]}，也不在${names[1]}。`,
          `排查确认，${name(clue.a!)}与${names[0]}、${names[1]}都对不上。`,
        ]);
      }
      return variant([
        `${name(clue.a!)}与${list(names)}都对不上号。`,
        `已排除：${name(clue.a!)}不涉及${names.join('、')}中的任何一项。`,
      ]);
    }
  }
}
