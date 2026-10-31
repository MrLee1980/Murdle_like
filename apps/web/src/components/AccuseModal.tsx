/**
 * 提交指控：每类选一个选项，构成完整作案组合。
 */
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Puzzle } from '@yianbu/puzzle-core';
import { useGameStore } from '../stores/gameStore';

export default function AccuseModal({
  puzzle,
  onAccuse,
}: {
  puzzle: Puzzle;
  onAccuse: (selection: number[]) => { outcome: 'correct' | 'wrong'; wrongPair?: [number, number]; innocent?: boolean };
}) {
  const closeAccuse = useGameStore((s) => s.closeAccuse);
  const phase = useGameStore((s) => s.phase);
  const [selection, setSelection] = useState<number[]>(() => Array(puzzle.categoryCount).fill(-1));
  const [feedback, setFeedback] = useState<string | null>(null);

  const ready = selection.every((s) => s >= 0);

  const toggle = (cat: number, opt: number) => {
    setFeedback(null);
    setSelection((prev) => {
      const next = prev.slice();
      next[cat] = next[cat] === opt ? -1 : opt;
      return next;
    });
  };

  const submit = () => {
    const r = onAccuse(selection);
    if (r.outcome === 'wrong') {
      if (r.innocent) {
        setFeedback('这套组合本身说得通——但你抓错了人。真凶另有其人，再读一遍线索。');
      } else {
        const [ca, cb] = r.wrongPair ?? [0, 1];
        setFeedback(
          `指控不成立：「${puzzle.categories[ca]!.name}」与「${puzzle.categories[cb]!.name}」的组合对不上号。`,
        );
      }
    }
  };

  return (
    <AnimatePresence>
      {phase === 'accusing' && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-ink/45 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeAccuse}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="提交指控"
            className="w-full max-w-lg border-2 border-ink bg-sheet shadow-[6px_8px_0_rgba(23,23,15,0.4)]"
            initial={{ y: 24, rotate: -1 }}
            animate={{ y: 0, rotate: 0 }}
            exit={{ y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-baseline justify-between border-ink border-b px-5 py-3">
              <h2 className="font-hand text-xl">正式指控</h2>
              <span className="font-case text-[10px] tracking-case text-ink-soft uppercase">Accusation</span>
            </header>

            <div className="space-y-4 px-5 py-4">
              <p className="border-ink/40 bg-sheet-dim border px-3 py-2 font-hand text-sm text-ink-soft">
                案发地点与作案时段已写在「案情提要」里——推理出那时身处现场的人，与现场绑定之物，就是你的指控目标。
              </p>
              {puzzle.categories.map((cat, c) => (
                <fieldset key={cat.id}>
                  <legend className="mb-1.5 font-case text-[11px] tracking-case uppercase">{cat.name}</legend>
                  <div className="flex flex-wrap gap-1.5">
                    {puzzle.options[c]!.map((name, o) => (
                      <button
                        key={o}
                        type="button"
                        onClick={() => toggle(c, o)}
                        aria-pressed={selection[c] === o}
                        className={`border px-2.5 py-1 font-hand text-sm transition-colors ${
                          selection[c] === o
                            ? 'border-ink bg-ink text-sheet'
                            : 'border-ink/60 bg-sheet hover:bg-sheet-dim'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ))}

              {feedback && (
                <p className="border-crimson/60 bg-crimson/10 border px-3 py-2 font-hand text-sm text-crimson-deep">
                  {feedback}
                </p>
              )}
            </div>

            <footer className="flex justify-end gap-2.5 border-ink border-t px-5 py-3">
              <button
                type="button"
                onClick={closeAccuse}
                className="border border-ink px-4 py-1.5 text-sm hover:bg-sheet-dim"
              >
                再想想
              </button>
              <button
                type="button"
                disabled={!ready}
                onClick={submit}
                className="bg-crimson px-4 py-1.5 text-sm text-sheet transition-transform hover:-translate-y-px disabled:opacity-40"
              >
                定罪
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
