/**
 * 对局页：装载谜题（关卡/每日）→ HUD + 网格 + 线索簿 + 弹层。
 */
import { useEffect, useMemo, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { generatePuzzle, THEMES, type Puzzle } from '@yianbu/puzzle-core';
import { ArrowLeft } from 'lucide-react';
import { deriveState } from '../lib/derive';
import { useGameStore } from '../stores/gameStore';
import Hud from '../components/Hud';
import LogicGrid from '../components/LogicGrid';
import ClueList from '../components/ClueList';
import AccuseModal from '../components/AccuseModal';
import ResultOverlay from '../components/ResultOverlay';

function themeName(id: string): string {
  return THEMES.find((t) => t.id === id)?.name ?? id;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function GamePage({ mode }: { mode: 'campaign' | 'daily' }) {
  const params = useParams();
  const loadPuzzle = useGameStore((s) => s.loadPuzzle);
  const tick = useGameStore((s) => s.tick);
  const phase = useGameStore((s) => s.phase);
  const player = useGameStore((s) => s.player);
  const puzzle = useGameStore((s) => s.puzzle);
  const modeKey = useGameStore((s) => s.modeKey);

  const level = Number(params.level ?? 1);
  const difficulty = (params.difficulty ?? 'easy') as 'easy' | 'medium' | 'hard' | 'four';
  const date = todayISO();

  const { puzzle: generated, modeKey: key, caseNo, title, nextTo } = useMemo(() => {
    if (mode === 'daily') {
      const p: Puzzle = generatePuzzle({ seed: `daily:${date}`, difficulty: 'medium' });
      return {
        puzzle: p,
        modeKey: `daily:${date}`,
        caseNo: `DAILY · ${date}`,
        title: '今日谜题',
        nextTo: undefined as string | undefined,
      };
    }
    const p: Puzzle = generatePuzzle({ seed: `campaign:${difficulty}:${level}`, difficulty });
    return {
      puzzle: p,
      modeKey: `campaign:${difficulty}:${level}`,
      caseNo: `CASE ${String(level).padStart(3, '0')} · ${difficulty.toUpperCase()}`,
      title: `第 ${level} 号案件`,
      nextTo: `/game/campaign/${difficulty}/${level + 1}`,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, difficulty, level, date]);

  const loadedRef = useRef<string>('');
  useEffect(() => {
    if (loadedRef.current !== key) {
      loadedRef.current = key;
      loadPuzzle(generated, key);
    }
  }, [generated, key, loadPuzzle]);

  // 计时
  useEffect(() => {
    if (phase !== 'solving') return;
    const t = setInterval(() => tick(1000), 1000);
    return () => clearInterval(t);
  }, [phase, tick]);

  const derived = useMemo(
    () => (puzzle ? deriveState(puzzle, player) : null),
    [puzzle, player],
  );

  if (!puzzle || !derived || modeKey !== key) {
    return (
      <main className="flex min-h-dvh items-center justify-center font-case text-sm tracking-case text-ink-soft uppercase">
        正在整理案卷…
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-6xl px-4 py-5 sm:px-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link to={mode === 'daily' ? '/' : '/campaign'} className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          {mode === 'daily' ? '返回封面' : '返回卷宗'}
        </Link>
        <span className="font-case text-[10px] tracking-case text-ink-soft uppercase">
          {themeName(puzzle.themeId)} · {puzzle.optionCount} 选项 × {puzzle.categoryCount} 类
        </span>
      </div>

      <Hud caseNo={caseNo} title={title} />

      <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <LogicGrid puzzle={puzzle} derived={derived} />
          <p className="mt-4 text-center text-xs text-ink-soft">
            点按格子循环 ✓ → ✗ → 清空；右键直接打 ✗；半透明墨迹为自动推论。
            <br />
            案发现场（与作案时段）见右侧「案情提要」——当时身处现场的人与物，即真凶与凶器。
          </p>
        </div>
        <div className="w-full shrink-0 lg:w-80">
          <aside className="relative mb-4 border-2 border-ink bg-sheet px-4 pt-4 pb-3 shadow-[3px_4px_0_rgba(23,23,15,0.28)]">
            <h2 className="mb-1.5 font-case text-[11px] tracking-case uppercase">案情提要 · Brief</h2>
            <p className="font-hand text-[15px] leading-relaxed">{puzzle.story}</p>
          </aside>
          <ClueList puzzle={puzzle} />
        </div>
      </div>

      <AccuseModal puzzle={puzzle} onAccuse={(sel) => useGameStore.getState().accuse(sel)} />
      <ResultOverlay puzzle={puzzle} modeKey={modeKey} caseTitle={caseNo} nextTo={nextTo} />
    </main>
  );
}
