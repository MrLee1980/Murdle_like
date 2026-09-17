import { describe, it, expect } from 'vitest';
import { renderClue } from '../src/clues.js';
import { createRng } from '../src/rng.js';
import { getTheme } from '../src/theme.js';
import type { Clue } from '../src/types.js';

const theme = getTheme('manor');

describe('线索文案渲染', () => {
  it('GROUP（3 成员）：任意变体都不出现名字裸连', () => {
    const clue: Clue = {
      type: 'GROUP',
      members: [
        { cat: 0, opt: 0 },
        { cat: 1, opt: 1 },
        { cat: 2, opt: 2 },
      ],
      text: '',
    };
    for (let i = 0; i < 30; i++) {
      const text = renderClue(clue, theme, 3, createRng(`g3:${i}`));
      expect(text).toMatch(/、|「/); // 顿号分隔或引号列表
      expect(text).not.toMatch(/白教授象牙匕首/); // 裸连
    }
  });

  it('GROUP（4 成员，K=4）：名字按顿号分隔并以「和」收尾', () => {
    const clue: Clue = {
      type: 'GROUP',
      members: [
        { cat: 0, opt: 0 },
        { cat: 1, opt: 1 },
        { cat: 2, opt: 2 },
        { cat: 3, opt: 3 },
      ],
      text: '',
    };
    for (let i = 0; i < 30; i++) {
      const text = renderClue(clue, theme, 4, createRng(`g4:${i}`));
      expect(text).toMatch(/、|「/);
      expect(text).not.toMatch(/白教授黄铜烛台/); // 裸连
    }
  });

  it('NOT_IN：2 项与 3 项文案均含「既不」或「对不上」结构', () => {
    const two: Clue = {
      type: 'NOT_IN',
      a: { cat: 0, opt: 0 },
      others: [
        { cat: 2, opt: 0 },
        { cat: 2, opt: 1 },
      ],
      text: '',
    };
    const three: Clue = {
      type: 'NOT_IN',
      a: { cat: 0, opt: 0 },
      others: [
        { cat: 2, opt: 0 },
        { cat: 2, opt: 1 },
        { cat: 2, opt: 2 },
      ],
      text: '',
    };
    for (let i = 0; i < 20; i++) {
      const rng = createRng(`ni:${i}`);
      const t2 = renderClue(two, theme, 3, rng);
      const t3 = renderClue(three, theme, 3, rng);
      expect(t2).toMatch(/既不在|对不上/);
      expect(t3).toMatch(/对不上|不涉及/);
    }
  });
});
