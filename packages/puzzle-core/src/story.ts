/**
 * 案情文学层：为每个案件生成
 * - story    案情提要（开场故事）：交代受害者、场合与嫌疑人范围，不泄露答案
 * - epilogue 结案陈词：揭晓真凶 + 引用「指向凶手的关键证据」线索原文（按编号）
 *
 * 关键证据选取：给引用真凶实体的线索打分 ——
 *   含真凶的 GROUP 线索 > 含真凶的 BIND > 引用真凶实体（含凶器/现场）的排除类；
 *   取前 3 条；若一条都没有（纯排除法推出），使用「层层排除」收尾变体。
 */

import type { Clue, EntityRef, Puzzle } from './types.js';
import type { Theme } from './theme.js';
import type { Rng } from './rng.js';
import { randInt } from './rng.js';

const join = (xs: string[]) => xs.join('、');

/** 各主题的案情提要模板（{victim} {occasion} {suspects} {locations} 占位） */
const STORY_TEMPLATES: Record<string, string[]> = {
  manor: [
    '昨夜雷雨交加，{victim}在{occasion}散场后被人发现死于非命，门窗却是从内反锁的。当时滞留庄园的{suspects}人人有嫌疑，{locations}每一处都可能藏着行凶的踪迹。',
    '{victim}一向为人刻薄，{occasion}当晚却殷勤得出奇。宴席散尽，他倒在血泊之中——{suspects}谁也没有不在场证明，{locations}在雷声里静默了整整一夜。',
  ],
  station: [
    '{occasion}的警报声划破了空间站的寂静：{victim}被发现死于舱内，氧气读数却没有异常。当时值勤的{suspects}各执一词，{locations}的监控偏偏全部离线。',
    '{victim}生前最后一次通话只说了半句「别信——」便中断了。{occasion}期间接触过他的{suspects}都有嫌疑，{locations}每一个舱门都留有刷卡记录，却拼不出完整的路线。',
  ],
  palace: [
    '{occasion}笙歌正酣，{victim}却在赐酒之后七窍流血而亡。御前当值的{suspects}跪了一地，{locations}处处挂着灯笼，照得见金碧辉煌，照不见人心。',
    '{victim}暴毙的消息被连夜封锁。{occasion}上献过艺、敬过酒的{suspects}都被留在了宫中，{locations}的每一扇门后，都藏着一句没说出口的供词。',
  ],
  festival: [
    '{occasion}进行到一半，{victim}倒在了后台，手里还攥着半张节目单。案发时留在现场的{suspects}互相指认，{locations}人来人往，却没有一个人承认自己最后见过他。',
    '{victim}本来要在{occasion}上宣布一件大事，却再也没能登台。{suspects}都有机会下手，{locations}的喧闹掩盖了所有声响，只剩彩灯还在一闪一闪。',
  ],
};

const STORY_FALLBACK =
  '{victim}在{occasion}期间遇害。当时在场的{suspects}都有嫌疑，{locations}处处留有痕迹。';

const CLOSERS: Record<string, string[]> = {
  manor: [
    '你合上卷宗，窗外的雷雨早已停歇。雾岭庄园的灯火，今夜终于可以熄了。',
    '雨停之后，庄园恢复了平静。只有书房的灯还亮着，照着一份签好字的供词。',
  ],
  station: [
    '货运舱的气闸缓缓闭合，案件档案被传回了地面。太空很安静，真相也是。',
    '轨道继续旋转，空间站的警报再也没有响起。记录仪里，多了一段结案的陈述。',
  ],
  palace: [
    '宫门落锁，旨意已下。中秋的月亮升起来了，照着一个再无人提及的名字。',
    '灯笼次第熄灭，宫道尽头传来更鼓声。这一夜之后，宫里少了一位王爷，多了一桩结案。',
  ],
  festival: [
    '校园祭照常闭幕，烟花如期升空。孩子们在礼堂里欢呼，没有人知道后台发生过什么。',
    '闭幕式的最后一声掌声落下，你悄悄收起证件。彩灯熄灭，校园重归宁静。',
  ],
};

export function buildStory(
  theme: Theme,
  K: number,
  N: number,
  options: string[][],
  rng: Rng,
): string {
  const templates = STORY_TEMPLATES[theme.id] ?? [STORY_FALLBACK];
  const tpl = templates[randInt(rng, templates.length)] ?? STORY_FALLBACK;
  const suspects = join(options[0]!.slice(0, N));
  const locations = join(options[2]!.slice(0, N));
  const body = tpl
    .replaceAll('{victim}', theme.victim)
    .replaceAll('{occasion}', theme.occasion)
    .replaceAll('{suspects}', suspects)
    .replaceAll('{locations}', locations);
  const goal =
    K === 4
      ? '作为负责此案的侦探，你必须找出真凶、凶器、案发现场与作案时段。'
      : '作为负责此案的侦探，你必须找出真凶、凶器与案发现场。';
  return `${body}${goal}`;
}

/** 线索引用的全部实体 */
function refsOf(clue: Clue): EntityRef[] {
  switch (clue.type) {
    case 'EXCLUDE':
    case 'BIND':
      return [clue.a!, clue.b!];
    case 'GROUP':
      return clue.members!;
    case 'NOT_IN':
      return [clue.a!, ...clue.others!];
  }
}

/** 给线索打分：指向真凶的力度 */
function evidenceScore(clue: Clue, culprit: EntityRef, weapon: EntityRef, location: EntityRef, extra?: EntityRef): number {
  const refs = refsOf(clue);
  const has = (e: EntityRef) => refs.some((r) => r.cat === e.cat && r.opt === e.opt);
  let score = 0;
  const hitC = has(culprit);
  const hitW = has(weapon);
  const hitL = has(location);
  const hitX = extra ? has(extra) : false;
  if (clue.type === 'GROUP' && hitC) {
    score = 100;
    if (hitW) score += 40;
    if (hitL) score += 40;
    if (hitX) score += 20;
  } else if (clue.type === 'BIND') {
    if (hitC) score = 60;
    if (hitW || hitL || hitX) score = Math.max(score, 40);
    if (hitC && (hitW || hitL)) score += 30;
  } else {
    // 排除类：只在对真凶实体做排除时有指向性
    if (hitC || hitW || hitL || hitX) score = 15;
  }
  return score;
}

export function buildEpilogue(puzzle: Puzzle): string[] {
  const { culpritSlot, optionCount: N, categoryCount: K } = puzzle;
  const name = (cat: number, opt: number) => puzzle.options[cat]![opt]!;
  const optAt = (cat: number) => puzzle.solution[cat]!.findIndex((s) => s === culpritSlot);

  const culprit: EntityRef = { cat: 0, opt: optAt(0) };
  const weapon: EntityRef = { cat: 1, opt: optAt(1) };
  const location: EntityRef = { cat: 2, opt: optAt(2) };
  const time: EntityRef | undefined = K === 4 ? { cat: 3, opt: optAt(3) } : undefined;

  const truth =
    K === 4
      ? `真相只有一个：真凶是${name(0, culprit.opt)}，用的是${name(1, weapon.opt)}，案发现场在${name(2, location.opt)}，作案时段是${name(3, time!.opt)}。`
      : `真相只有一个：真凶是${name(0, culprit.opt)}，用的是${name(1, weapon.opt)}，案发现场在${name(2, location.opt)}。`;

  // 关键证据：按指向力度取前 3 条
  const scored = puzzle.clues
    .map((clue, idx) => ({ clue, idx, score: evidenceScore(clue, culprit, weapon, location, time) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.idx - b.idx)
    .slice(0, 3);

  let evidence: string;
  if (scored.length > 0) {
    const quotes = scored.map((s) => `第 ${s.idx + 1} 条（${s.clue.text.replace(/。$/, '')}）`);
    evidence =
      scored.length === 1
        ? `指向凶手的关键证据只有一条：${quotes[0]}。它像一根针，挑开了整桩案件的线头。`
        : `指向凶手的关键证据有 ${scored.length} 条：${quotes.join('；')}。它们彼此咬合，把真凶逼到了无可辩驳的角落。`;
  } else {
    evidence =
      '没有任何一条线索单独点名真凶——但每一条排除都像抽掉一块积木，当所有不可能的选项全部倒下，剩下的名字便再也无法回避。';
  }

  const closers = CLOSERS[puzzle.themeId] ?? ['案子结了。'];
  const closer = closers[culpritSlot % closers.length]!;

  return [truth, evidence, closer];
}
