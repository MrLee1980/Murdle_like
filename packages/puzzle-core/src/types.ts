/**
 * 核心类型定义。
 *
 * 谜题由 K 个类别（category）构成，每个类别有 N 个选项（option）。
 * 一个「解」是把 N 个「槽位」（slot 0..N-1）分配给每个选项，使得
 * 每个类别内部的选项与槽位构成双射；跨类别同槽位 = 同一组（作案组合）。
 *
 * 例：K=3（嫌疑人/凶器/地点），N=5 → 找出 5 组 (嫌疑人, 凶器, 地点) 的完整绑定。
 */

/** 指向某类别下的某个选项 */
export interface EntityRef {
  /** 类别索引 0..K-1 */
  cat: number;
  /** 选项索引 0..N-1 */
  opt: number;
}

export type ClueType = 'EXCLUDE' | 'BIND' | 'GROUP' | 'NOT_IN';

/**
 * 原子线索（v1 均为「可直接译为网格标记」的类型）：
 * - EXCLUDE:  a 与 b 不同槽位（✗）
 * - BIND:     a 与 b 同槽位（✓）
 * - GROUP:    members（≥3 个实体，来自 ≥3 个类别）两两同槽位
 * - NOT_IN:   a 与 others（来自同一类别的 2..3 个实体）都不同槽位
 */
export interface Clue {
  type: ClueType;
  /** EXCLUDE / NOT_IN 的主体 */
  a?: EntityRef;
  /** EXCLUDE / BIND 的客体 */
  b?: EntityRef;
  /** GROUP 成员 */
  members?: EntityRef[];
  /** NOT_IN 的排除集（同一类别，2..3 个） */
  others?: EntityRef[];
  /** 渲染后的中文文案（生成时填充） */
  text: string;
}

/** 完整解：slots[cat][opt] = 槽位 0..N-1；每个 slots[cat] 是 0..N-1 的排列 */
export type SlotAssignment = number[][];

export type Difficulty = 'easy' | 'medium' | 'hard' | 'four';

export interface PuzzleCategory {
  id: string;
  name: string;
}

export interface Puzzle {
  /** 类别数 K（3 或 4） */
  categoryCount: number;
  /** 每类选项数 N */
  optionCount: number;
  categories: PuzzleCategory[];
  /** 选项显示名：options[cat][opt] */
  options: string[][];
  solution: SlotAssignment;
  clues: Clue[];
  difficulty: Difficulty;
  seed: string;
  themeId: string;
  /** 真凶所在的槽位：指控必须命中该槽位的完整组合（其余自洽组合是干扰项） */
  culpritSlot: number;
  /** 案情提要（开场故事，不泄露答案） */
  story: string;
  /** 结案陈词：揭晓真相 + 指向凶手的关键证据（引用线索编号） */
  epilogue: string[];
}

/** 网格标记 */
export type Mark = 'yes' | 'no';

export interface GeneratorConfig {
  difficulty?: Difficulty;
  /** 覆盖难度的 N（需与 categories 匹配枚举空间 guard） */
  n?: number;
  /** 类别数 K，默认 3；4 = 含「作案时段」 */
  categories?: 3 | 4;
  /** 种子：相同种子必然生成相同谜题 */
  seed?: string;
  themeId?: string;
  /** 生成失败重试上限 */
  maxAttempts?: number;
}
