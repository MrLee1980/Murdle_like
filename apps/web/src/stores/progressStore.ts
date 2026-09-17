/**
 * 长期进度（localStorage 持久化）：关卡星级、最佳用时、每日题记录。
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CaseRecord {
  stars: number;
  bestMs: number;
}

interface ProgressStore {
  records: Record<string, CaseRecord>;
  saveRecord(key: string, stars: number, ms: number): void;
  recordOf(key: string): CaseRecord | undefined;
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      records: {},
      saveRecord: (key, stars, ms) => {
        const prev = get().records[key];
        const best: CaseRecord = {
          stars: Math.max(stars, prev?.stars ?? 0),
          bestMs: Math.min(ms, prev?.bestMs ?? Number.POSITIVE_INFINITY),
        };
        set({ records: { ...get().records, [key]: best } });
      },
      recordOf: (key) => get().records[key],
    }),
    { name: 'casefile-progress-v1' },
  ),
);
