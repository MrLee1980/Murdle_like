/**
 * 结算：盖章动效（「已结案」印章旋转落定）、星级、完整作案组合。
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Star, Share2 } from 'lucide-react';
import type { Puzzle } from '@yianbu/puzzle-core';
import { formatMs } from '../lib/derive';
import { starsFor, useGameStore } from '../stores/gameStore';
import { useProgressStore } from '../stores/progressStore';

export default function ResultOverlay({ puzzle, modeKey, caseTitle, nextTo }: { puzzle: Puzzle; modeKey: string; caseTitle: string; nextTo?: string }) {
  const phase = useGameStore((s) => s.phase);
  const hearts = useGameStore((s) => s.hearts);
  const hintsUsed = useGameStore((s) => s.hintsUsed);
  const wrongCount = useGameStore((s) => s.wrongCount);
  const elapsedMs = useGameStore((s) => s.elapsedMs);
  const saveRecord = useProgressStore((s) => s.saveRecord);
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const won = phase === 'won';
  const stars = won ? starsFor(puzzle, { wrongCount, hintsUsed, elapsedMs }) : 0;

  useEffect(() => {
    if (won) saveRecord(modeKey, stars, elapsedMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won]);

  const share = async () => {
    const starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    const text = `疑案簿 ${caseTitle}\n${starStr} 用时 ${formatMs(elapsedMs)} · 误指 ${wrongCount} 次 · 提示 ${hintsUsed} 次\n${puzzle.optionCount} 组作案组合全部破解，你也来试试：`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const groups = Array.from({ length: puzzle.optionCount }, (_, s) =>
    puzzle.categories.map((_, c) => {
      const opt = puzzle.solution[c]!.findIndex((sl) => sl === s);
      return puzzle.options[c]![opt]!;
    }),
  );

  return (
    <AnimatePresence>
      {(phase === 'won' || phase === 'lost') && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-ink/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={won ? '结案' : '调查失败'}
            className="relative w-full max-w-md border-2 border-ink bg-sheet px-6 pt-8 pb-6 shadow-[6px_8px_0_rgba(23,23,15,0.4)]"
            initial={{ y: 30 }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            {/* 印章 */}
            <motion.div
              aria-hidden
              className={`absolute -top-7 right-5 border-4 px-4 py-1.5 text-2xl font-bold tracking-[0.3em] ${
                won ? 'border-crimson text-crimson' : 'border-ink text-ink'
              }`}
              initial={{ scale: 2.4, rotate: -20, opacity: 0 }}
              animate={{ scale: 1, rotate: -8, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.15 }}
            >
              {won ? '已结案' : '悬案'}
            </motion.div>

            {won ? (
              <>
                <div className="mb-1 flex items-center gap-1.5" aria-label={`${stars} 星`}>
                  {Array.from({ length: 3 }, (_, i) => (
                    <Star
                      key={i}
                      className={`h-6 w-6 ${i < stars ? 'fill-crimson text-crimson-deep' : 'text-ink/25'}`}
                      strokeWidth={1.6}
                    />
                  ))}
                </div>
                <h2 className="mb-4 font-hand text-2xl">真相大白</h2>

                <div className="mb-3 space-y-1 border-ink/60 border-t border-b py-3">
                  {groups.map((g, i) => (
                    <p
                      key={i}
                      className={`font-hand text-[15px] ${i === puzzle.culpritSlot ? 'text-crimson' : ''}`}
                    >
                      <span className="mr-2 font-case text-[10px] text-ink-soft">{String(i + 1).padStart(2, '0')}</span>
                      {g.join(' · ')}
                      {i === puzzle.culpritSlot && (
                        <span className="ml-2 border border-crimson px-1 py-px font-case text-[9px] tracking-widest text-crimson">
                          真凶
                        </span>
                      )}
                    </p>
                  ))}
                </div>

                <div className="mb-4 max-h-36 space-y-1.5 overflow-y-auto border-ink/40 border-t pt-2.5">
                  {puzzle.epilogue.map((p, i) => (
                    <p key={i} className="font-hand text-[13px] leading-relaxed text-ink/85">
                      {p}
                    </p>
                  ))}
                </div>

                <dl className="mb-5 flex gap-6 font-case text-xs text-ink-soft">
                  <div>
                    <dt className="tracking-case uppercase">用时</dt>
                    <dd className="text-base text-ink tabular-nums">{formatMs(elapsedMs)}</dd>
                  </div>
                  <div>
                    <dt className="tracking-case uppercase">误指</dt>
                    <dd className="text-base text-ink">{wrongCount} 次</dd>
                  </div>
                  <div>
                    <dt className="tracking-case uppercase">提示</dt>
                    <dd className="text-base text-ink">{hintsUsed} 次</dd>
                  </div>
                </dl>
              </>
            ) : (
              <>
                <h2 className="mb-2 mt-2 font-hand text-2xl">线索中断</h2>
                <p className="mb-3 text-sm text-ink-soft">
                  三次指控全部落空，嫌疑人已逃之夭夭。整理思路，再开一案。
                </p>
                <p className="mb-5 border-ink/40 border-t pt-2.5 font-hand text-[13px] leading-relaxed text-ink/80">
                  {puzzle.epilogue[0]}
                </p>
              </>
            )}

            <div className="flex justify-end gap-2.5">
              {won && (
                <button
                  type="button"
                  onClick={share}
                  className="mr-auto flex items-center gap-1.5 border border-ink px-3 py-1.5 text-sm hover:bg-sheet-dim"
                >
                  <Share2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                  {copied ? '已复制到剪贴板' : '分享结果'}
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate('/campaign')}
                className="border border-ink px-4 py-1.5 text-sm hover:bg-sheet-dim"
              >
                返回档案室
              </button>
              {won && nextTo ? (
                <button
                  type="button"
                  onClick={() => navigate(nextTo)}
                  className="bg-ink px-4 py-1.5 text-sm text-sheet hover:-translate-y-px"
                >
                  下一案
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="bg-ink px-4 py-1.5 text-sm text-sheet hover:-translate-y-px"
                >
                  重新调查
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
