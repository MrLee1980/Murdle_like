/**
 * Demo：打印一道生成的谜题（运行 npm run demo 查看）。
 * 用 vitest 承载仅为免去额外脚本运行器依赖。
 */
import { it } from 'vitest';
import { generatePuzzle } from '../src/generator.js';
import { solveFromClues } from '../src/humanSolver.js';

it('打印样例谜题', () => {
  const p = generatePuzzle({ difficulty: 'medium', seed: 'demo:001', themeId: 'manor' });

  console.log('\n╔══════════════════════════════════════╗');
  console.log(`║  ${p.themeId} · ${p.difficulty} · seed=${p.seed}`);
  console.log('╚══════════════════════════════════════╝');
  p.categories.forEach((c, i) => {
    console.log(`${c.name}: ${p.options[i]!.join('、')}`);
  });
  console.log('\n线索：');
  p.clues.forEach((c, i) => console.log(`  ${i + 1}. ${c.text}`));

  const { solved, marks } = solveFromClues(p.categoryCount, p.optionCount, p.clues);
  console.log(`\n类人求解器（无猜测）: ${solved ? '✅ 可纯逻辑解出' : '❌ 需要猜测'}`);
  console.log(`推导出的标记数: ${marks.size}`);

  console.log('\n完整解（槽位绑定）：');
  for (let s = 0; s < p.optionCount; s++) {
    const row = p.categories.map((c, ci) => {
      const opt = p.solution[ci]!.findIndex((sl) => sl === s);
      return p.options[ci]![opt];
    });
    console.log(`  第 ${s + 1} 组: ${row.join(' + ')}`);
  }
});
