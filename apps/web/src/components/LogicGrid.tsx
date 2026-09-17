/**
 * 逻辑网格：K*(K-1)/2 个 N×N 子网格，每格循环 ✓ → ✗ → 空。
 * ✓ 用绯红墨水笔触，✗ 用黑墨；自动推论标记半透明显示；矛盾格红底。
 */
import { memo } from 'react';
import type { Mark, Puzzle } from '@murdle/puzzle-core';
import { markKey, type DerivedState } from '../lib/derive';
import { useGameStore } from '../stores/gameStore';

function InkCheck() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 rotate-[-4deg] sm:h-7 sm:w-7" fill="none">
      <path d="M4 13.5l4.5 4.5L20 6.5" stroke="var(--color-crimson)" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InkCross() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 rotate-[3deg] sm:h-6 sm:w-6" fill="none">
      <path d="M6 6l12 12M18 6L6 18" stroke="var(--color-ink)" strokeWidth={2.6} strokeLinecap="round" />
    </svg>
  );
}

interface CellProps {
  mk: string;
  manual: Mark | undefined;
  auto: Mark | undefined;
  conflict: boolean;
  dimmed: boolean;
  onToggle: () => void;
}

const Cell = memo(function Cell({ mk, manual, auto, conflict, dimmed, onToggle }: CellProps) {
  const shown = manual ?? auto;
  return (
    <button
      type="button"
      data-cell={mk}
      aria-label={mk}
      onClick={onToggle}
      onContextMenu={(e) => {
        e.preventDefault();
        if (manual !== 'no') onToggle(); // 右键快速打 ✗（循环到 no）
      }}
      className={[
        'flex aspect-square min-h-10 min-w-10 items-center justify-center border-ink-faint border-r border-b transition-colors duration-100 lg:min-h-9 lg:min-w-9',
        conflict ? 'bg-crimson/25' : shown ? 'bg-sheet' : 'bg-sheet-dim/40 hover:bg-sheet',
        dimmed ? 'opacity-30' : '',
        manual === undefined && auto !== undefined ? 'opacity-45' : '',
      ].join(' ')}
    >
      {shown === 'yes' ? <InkCheck /> : shown === 'no' ? <InkCross /> : null}
    </button>
  );
});

interface LogicGridProps {
  puzzle: Puzzle;
  derived: DerivedState;
}

export default function LogicGrid({ puzzle, derived }: LogicGridProps) {
  const toggleMark = useGameStore((s) => s.toggleMark);
  const player = useGameStore((s) => s.player);
  const K = puzzle.categoryCount;
  const N = puzzle.optionCount;

  const pairs: Array<[number, number]> = [];
  for (let c1 = 0; c1 < K; c1++) for (let c2 = c1 + 1; c2 < K; c2++) pairs.push([c1, c2]);

  return (
    <div className="flex flex-wrap justify-center gap-5">
      {pairs.map(([c1, c2]) => (
        <section key={`${c1}-${c2}`} className="border-2 border-ink bg-sheet shadow-[3px_4px_0_rgba(23,23,15,0.28)]">
          <header className="border-ink border-b px-3 py-1.5 text-center font-case text-[11px] tracking-case uppercase">
            {puzzle.categories[c1]!.name} × {puzzle.categories[c2]!.name}
          </header>
          <div className="grid" style={{ gridTemplateColumns: `auto repeat(${N}, minmax(2.5rem, 1fr))` }}>
            {/* 表头行 */}
            <div className="border-ink-faint border-r border-b" />
            {Array.from({ length: N }, (_, j) => (
              <div
                key={j}
                className="vertical-cjk border-ink-faint flex items-center justify-center border-r border-b px-1 py-2 font-hand text-[13px] sm:text-sm"
              >
                {puzzle.options[c2]![j]}
              </div>
            ))}
            {/* 数据行 */}
            {Array.from({ length: N }, (_, i) => (
              <GridRow
                key={i}
                puzzle={puzzle}
                c1={c1}
                c2={c2}
                i={i}
                derived={derived}
                player={player}
                onToggle={toggleMark}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

interface GridRowProps {
  puzzle: Puzzle;
  c1: number;
  c2: number;
  i: number;
  derived: DerivedState;
  player: Record<string, Mark>;
  onToggle: (e1: { cat: number; opt: number }, e2: { cat: number; opt: number }) => void;
}

function GridRow({ puzzle, c1, c2, i, derived, player, onToggle }: GridRowProps) {
  const N = puzzle.optionCount;
  const lastHint = useGameStore((s) => s.lastHint);
  return (
    <>
      <div className="border-ink-faint flex items-center border-r border-b pr-2 pl-2 font-hand text-[13px] whitespace-nowrap sm:text-sm">
        {puzzle.options[c1]![i]}
      </div>
      {Array.from({ length: N }, (_, j) => {
        const e1 = { cat: c1, opt: i };
        const e2 = { cat: c2, opt: j };
        const mk = markKey(e1, e2);
        return (
          <Cell
            key={mk}
            mk={mk}
            manual={player[mk]}
            auto={derived.derived[mk]}
            conflict={derived.conflicts.has(mk)}
            dimmed={lastHint?.key === mk}
            onToggle={() => onToggle(e1, e2)}
          />
        );
      })}
    </>
  );
}
