/**
 * 对局 HUD：案件编号、计时、心数、提示、提交指控。
 */
import { Heart, Lightbulb, Fingerprint } from 'lucide-react';
import { MAX_HEARTS, useGameStore } from '../stores/gameStore';
import { formatMs } from '../lib/derive';

export default function Hud({ caseNo, title }: { caseNo: string; title: string }) {
  const hearts = useGameStore((s) => s.hearts);
  const hintsUsed = useGameStore((s) => s.hintsUsed);
  const elapsedMs = useGameStore((s) => s.elapsedMs);
  const requestHint = useGameStore((s) => s.requestHint);
  const openAccuse = useGameStore((s) => s.openAccuse);
  const phase = useGameStore((s) => s.phase);

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-2 border-ink bg-sheet px-4 py-2.5 shadow-[3px_4px_0_rgba(23,23,15,0.28)]">
      <div className="min-w-0">
        <div className="font-case text-[10px] tracking-case text-ink-soft uppercase">{caseNo}</div>
        <div className="truncate font-hand text-base leading-tight sm:text-lg">{title}</div>
      </div>

      <div className="ml-auto flex items-center gap-4 sm:gap-5">
        <span className="font-case text-lg tabular-nums sm:text-xl" aria-label="用时">
          {formatMs(elapsedMs)}
        </span>

        <span className="flex items-center gap-1" aria-label={`剩余 ${hearts} 次机会`}>
          {Array.from({ length: MAX_HEARTS }, (_, i) => (
            <Heart
              key={i}
              className={`h-5 w-5 ${i < hearts ? 'fill-crimson text-crimson-deep' : 'text-ink/30'}`}
              strokeWidth={1.8}
            />
          ))}
        </span>

        <button
          type="button"
          onClick={requestHint}
          disabled={phase !== 'solving'}
          className="flex items-center gap-1.5 border border-ink px-2.5 py-1 text-sm transition-colors hover:bg-sheet-dim disabled:opacity-40"
        >
          <Lightbulb className="h-4 w-4" strokeWidth={1.8} />
          提示{hintsUsed > 0 ? ` ×${hintsUsed}` : ''}
        </button>

        <button
          type="button"
          onClick={openAccuse}
          disabled={phase !== 'solving'}
          className="flex items-center gap-1.5 bg-ink px-3.5 py-1.5 text-sm text-sheet transition-transform hover:-translate-y-px disabled:opacity-40"
        >
          <Fingerprint className="h-4 w-4" strokeWidth={2} />
          提交指控
        </button>
      </div>
    </div>
  );
}
