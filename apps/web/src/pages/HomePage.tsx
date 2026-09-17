/**
 * 首页：案件档案封面 —— 大标题、日期、三个入口标签。
 */
import { Link } from 'react-router-dom';
import { CalendarDays, FolderOpen, Map } from 'lucide-react';
import { useProgressStore } from '../stores/progressStore';

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function HomePage() {
  const records = useProgressStore((s) => s.records);
  const done = Object.keys(records).length;
  const todayDone = records[`daily:${todayISO()}`];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col items-center justify-center px-5 py-10">
      <div className="relative w-full border-2 border-ink bg-sheet p-8 shadow-[6px_8px_0_rgba(23,23,15,0.3)] sm:p-12">
        {/* 装订孔 */}
        <div aria-hidden className="absolute top-6 bottom-6 left-2 flex flex-col justify-between">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="block h-3 w-3 rounded-full border border-ink/50 bg-paper" />
          ))}
        </div>

        <div className="pl-6 sm:pl-8">
          <p className="mb-2 font-case text-[11px] tracking-case text-ink-soft uppercase">
            Case File · Logic Deduction
          </p>
          <h1 className="mb-1 font-hand text-5xl font-bold tracking-wide sm:text-6xl">疑案簿</h1>
          <p className="mb-8 max-w-md text-sm leading-relaxed text-ink-soft">
            每一桩案子，凶手、凶器与现场都藏在寥寥几条线索里。
            在网格上勾勾画画，排除一切不可能——剩下的，无论多不可思议，都是真相。
          </p>

          <nav className="space-y-3">
            <Entry
              to="/game/daily"
              icon={<CalendarDays className="h-4 w-4" strokeWidth={1.8} />}
              title="今日谜题"
              desc={todayDone ? `今日已结案 · ${todayDone.stars} 星` : '今天的案子，人人同题'}
            />
            <Entry
              to="/campaign"
              icon={<FolderOpen className="h-4 w-4" strokeWidth={1.8} />}
              title="案件卷宗"
              desc={`关卡模式 · 已结案 ${done} 宗`}
            />
            <Entry
              to="/campaign"
              icon={<Map className="h-4 w-4" strokeWidth={1.8} />}
              title="办案手法"
              desc="点格子循环 ✓ / ✗；右键直接排除；点线索可划线"
            />
          </nav>
        </div>
      </div>

      <p className="mt-6 font-case text-[10px] tracking-case text-ink-soft uppercase">
        所有案件由推理引擎程序生成 · 保证唯一解且无需猜测
      </p>
    </main>
  );
}

function Entry({ to, icon, title, desc }: { to: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 border-2 border-ink bg-sheet px-4 py-3 shadow-[3px_4px_0_rgba(23,23,15,0.25)] transition-transform hover:-translate-y-0.5"
    >
      <span className="flex h-9 w-9 items-center justify-center border border-ink/60 text-ink">{icon}</span>
      <span>
        <span className="block font-hand text-lg leading-tight">{title}</span>
        <span className="block text-xs text-ink-soft">{desc}</span>
      </span>
      <span className="ml-auto font-case text-ink/40 transition-transform group-hover:translate-x-1">→</span>
    </Link>
  );
}
