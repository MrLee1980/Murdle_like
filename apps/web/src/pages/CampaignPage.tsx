/**
 * 案件卷宗：按难度分章，每章 10 个案号。
 */
import { Link } from 'react-router-dom';
import { Star, ArrowLeft } from 'lucide-react';
import { useProgressStore } from '../stores/progressStore';

const CHAPTERS = [
  { id: 'easy', name: '第一章 · 初出茅庐', desc: '4 名嫌疑人 · 5–7 条线索', levels: 10 },
  { id: 'medium', name: '第二章 · 渐入佳境', desc: '5 名嫌疑人 · 7–9 条线索', levels: 10 },
  { id: 'hard', name: '第三章 · 名侦探', desc: '6 名嫌疑人 · 9–12 条线索', levels: 10 },
  { id: 'four', name: '特别篇 · 雾中时序', desc: '四类推理 · 含作案时段 · 6 个子网格 · 6–9 条线索', levels: 10 },
] as const;

export default function CampaignPage() {
  const records = useProgressStore((s) => s.records);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-4xl px-5 py-8">
      <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.8} /> 返回封面
      </Link>

      <h1 className="mb-1 font-hand text-4xl font-bold">案件卷宗</h1>
      <p className="mb-8 font-case text-[11px] tracking-case text-ink-soft uppercase">
        Campaign · {Object.keys(records).filter((k) => k.startsWith('campaign:')).length} 宗已结案
      </p>

      <div className="space-y-10">
        {CHAPTERS.map((ch) => (
          <section key={ch.id}>
            <h2 className="mb-1 font-hand text-xl">{ch.name}</h2>
            <p className="mb-3 text-xs text-ink-soft">{ch.desc}</p>
            <div className="grid grid-cols-5 gap-2.5 sm:grid-cols-10">
              {Array.from({ length: ch.levels }, (_, i) => {
                const key = `campaign:${ch.id}:${i + 1}`;
                const rec = records[key];
                return (
                  <Link
                    key={key}
                    to={`/game/campaign/${ch.id}/${i + 1}`}
                    className="flex aspect-square flex-col items-center justify-center border-2 border-ink bg-sheet shadow-[2px_3px_0_rgba(23,23,15,0.22)] transition-transform hover:-translate-y-0.5"
                  >
                    <span className="font-case text-lg tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                    {rec ? (
                      <span className="mt-0.5 flex gap-0.5">
                        {Array.from({ length: 3 }, (_, s) => (
                          <Star
                            key={s}
                            className={`h-2.5 w-2.5 ${s < rec.stars ? 'fill-crimson text-crimson' : 'text-ink/25'}`}
                          />
                        ))}
                      </span>
                    ) : (
                      <span className="mt-0.5 h-2.5" />
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
