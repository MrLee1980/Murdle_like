/**
 * 线索簿：竖栏笔记本，卡片如散落在案头的便签 —— 微倾 ≤3°、细黑边框、
 * 绯红图钉。点击划线表示「已用过这条线索」。
 */
import { useState } from 'react';
import type { Puzzle } from '@yianbu/puzzle-core';

/** 由线索索引确定性地分配微小倾角（±1.6° 内） */
function tiltOf(i: number): number {
  const v = Math.sin(i * 12.9898) * 43758.5453;
  return ((v - Math.floor(v)) - 0.5) * 3.2;
}

export default function ClueList({ puzzle }: { puzzle: Puzzle }) {
  const [struck, setStruck] = useState<Set<number>>(new Set());

  const toggle = (i: number) => {
    setStruck((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <aside className="relative border-2 border-ink bg-sheet px-4 pt-5 pb-4 shadow-[3px_4px_0_rgba(23,23,15,0.28)]">
      {/* 装订孔 */}
      <div aria-hidden className="absolute top-3 bottom-3 left-1.5 flex flex-col justify-between">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="block h-2.5 w-2.5 rounded-full border border-ink/50 bg-paper" />
        ))}
      </div>

      <h2 className="mb-3 pl-4 font-case text-[11px] tracking-case uppercase">
        线索 · Clues {struck.size > 0 && <span className="text-ink-soft">（已排除 {struck.size} 条）</span>}
      </h2>

      <ol className="space-y-3 pl-4">
        {puzzle.clues.map((clue, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => toggle(i)}
              className="relative block w-full border border-ink/70 bg-sheet px-3 py-2 text-left shadow-[2px_2px_0_rgba(23,23,15,0.18)] transition-transform duration-150 hover:-translate-y-px"
              style={{ transform: `rotate(${tiltOf(i)}deg)` }}
            >
              <span aria-hidden className="pin-dot absolute -top-1.5 left-3 h-2.5 w-2.5 rounded-full bg-crimson" />
              <span className="mr-1.5 font-case text-[10px] text-ink-soft">{String(i + 1).padStart(2, '0')}</span>
              <span className={`font-hand text-[15px] leading-snug ${struck.has(i) ? 'struck' : ''}`}>
                {clue.text}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </aside>
  );
}
