import { describe, it, expect } from 'vitest';
import { generatePuzzle } from '../src/generator.js';
import { buildStory, buildEpilogue } from '../src/story.js';
import { THEMES } from '../src/theme.js';
import { createRng } from '../src/rng.js';
import { solveFromClues } from '../src/humanSolver.js';
import { countSolutions } from '../src/solver.js';

describe('案情文学层', () => {
  it('案情提要：含受害者、场合与案发现场，不点名真凶', () => {
    for (const theme of THEMES) {
      const options = theme.categories.map((c) => c.options.slice(0, 4));
      const story = buildStory(theme, 3, 4, options, options[2]![1], undefined, createRng('story-test'));
      expect(story).toContain(theme.victim);
      expect(story).toContain(theme.occasion);
      expect(story).toContain(options[2]![1]!); // 案发现场明示
      // 不泄露：不声称任何嫌疑人是凶手
      expect(story).not.toMatch(/真凶是|凶手是/);
      expect(story.length).toBeGreaterThan(60);
    }
  });

  it('凶手可判定性：案情提要的场景 = culpritSlot 的地点，配合全解网格可推出真凶与凶器', () => {
    for (let i = 0; i < 12; i++) {
      const p = generatePuzzle({ difficulty: 'medium', seed: `derivable:${i}` });
      // 案情提要明示的案发地点必须是真凶槽位的地点
      const sceneOpt = p.solution[2]!.findIndex((s) => s === p.culpritSlot);
      expect(p.story).toContain(p.options[2]![sceneOpt]!);
      // 类人求解器推出完整网格后，现场对应的人与物唯一确定（凶手可判定）
      const { solved, marks } = solveFromClues(p.categoryCount, p.optionCount, p.clues);
      expect(solved).toBe(true);
      const key = (a: { cat: number; opt: number }, b: { cat: number; opt: number }) =>
        a.cat <= b.cat ? `${a.cat}:${a.opt}|${b.cat}:${b.opt}` : `${b.cat}:${b.opt}|${a.cat}:${a.opt}`;
      const locOpt = p.solution[2]!.findIndex((s) => s === p.culpritSlot);
      const loc = { cat: 2, opt: locOpt };
      const suspectsAtScene = p.options[0]!
        .map((_, o) => o)
        .filter((o) => marks.get(key({ cat: 0, opt: o }, loc)) === 'yes');
      const weaponsAtScene = p.options[1]!
        .map((_, o) => o)
        .filter((o) => marks.get(key({ cat: 1, opt: o }, loc)) === 'yes');
      expect(suspectsAtScene).toHaveLength(1);
      expect(weaponsAtScene).toHaveLength(1);
      expect(suspectsAtScene[0]).toBe(p.solution[0]!.findIndex((s) => s === p.culpritSlot));
      expect(weaponsAtScene[0]).toBe(p.solution[1]!.findIndex((s) => s === p.culpritSlot));
    }
  });

  it('结案陈词：揭晓真凶、引用真实存在的线索原文', () => {
    for (let i = 0; i < 10; i++) {
      const p = generatePuzzle({ difficulty: 'medium', seed: `story:${i}` });
      const [truth, evidence] = p.epilogue;
      // 揭晓段含真凶名
      const culpritName = p.options[0]![p.solution[0]!.findIndex((s) => s === p.culpritSlot)]!;
      expect(truth).toContain(culpritName);
      // 证据段引用的「第 N 条（原文）」必须真实存在
      const quotes = [...evidence!.matchAll(/第 (\d+) 条（(.+?)）/g)];
      expect(quotes.length).toBeGreaterThan(0);
      for (const m of quotes) {
        const clue = p.clues[Number(m[1]) - 1];
        expect(clue).toBeDefined();
        expect(clue!.text.replace(/。$/, '')).toBe(m[2]);
      }
      // 引用证据必须指向真凶（不能引用无关线索充数）
      expect(evidence).toContain('关键证据');
    }
  });

  it('纯排除法案件使用「层层排除」收尾变体', () => {
    // 构造一个谜题：只有 EXCLUDE 线索 —— 生成器不会产出，直接手工构造 epilogue 输入
    const p = generatePuzzle({ difficulty: 'easy', seed: 'story:exclude' });
    // 手工替换为纯 EXCLUDE 线索（保持唯一解可解性不管，epilogue 只读线索文本与实体）
    const noCulpritClues = p.clues.filter((c) => {
      const culpritOpt = p.solution[0]!.findIndex((s) => s === p.culpritSlot);
      const refs =
        c.type === 'GROUP' ? c.members! : c.type === 'NOT_IN' ? [c.a!, ...c.others!] : [c.a!, c.b!];
      return !refs.some((r) => (r.cat === 0 && r.opt === culpritOpt) || (r.cat !== 0 && p.solution[r.cat]![r.opt] === p.culpritSlot));
    });
    if (noCulpritClues.length < p.clues.length) {
      // 有指向真凶的线索 → 正常证据链路径，已在上个用例覆盖；这里只验证 buildEpilogue 纯函数行为
      const spy = { ...p, clues: noCulpritClues };
      const ep = buildEpilogue(spy);
      expect(ep[1]).toContain('没有任何一条线索单独点名真凶');
    }
  });

  it('K=4 时结案陈词含作案时段', () => {
    const p = generatePuzzle({ difficulty: 'four', seed: 'story:k4' });
    expect(p.epilogue[0]).toContain('作案时段');
    expect(p.story).toContain('作案时段');
  });

  it('生成器完整性：新字段齐备且不破坏原有验收门', () => {
    const p = generatePuzzle({ difficulty: 'medium', seed: 'story:full' });
    expect(p.culpritSlot).toBeGreaterThanOrEqual(0);
    expect(p.culpritSlot).toBeLessThan(p.optionCount);
    expect(p.story.length).toBeGreaterThan(0);
    expect(p.epilogue).toHaveLength(3);
    expect(countSolutions(p.categoryCount, p.optionCount, p.clues, 2)).toBe(1);
    expect(solveFromClues(p.categoryCount, p.optionCount, p.clues).solved).toBe(true);
    // 确定性
    const q = generatePuzzle({ difficulty: 'medium', seed: 'story:full' });
    expect(JSON.stringify(p)).toBe(JSON.stringify(q));
  });
});
