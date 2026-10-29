import { z } from 'zod';
import { feedbackSchema, type PracticeRecord, type SavedExpression } from '../../shared/types';

const recordSchema = z.object({
  id: z.string().max(80), completedAt: z.iso.datetime(), topicId: z.string().max(60),
  question: z.string().max(300), transcript: z.string().max(600),
  source: z.enum(['recording', 'text', 'sample']), feedback: feedbackSchema.nullable(),
});
const expressionSchema = z.object({
  id: z.string().max(100), sentence: z.string().max(400), translation: z.string().max(400), savedAt: z.iso.datetime(), isSample: z.boolean(),
});
const storeSchema = z.object({ records: z.array(recordSchema).max(200), expressions: z.array(expressionSchema).max(200) });
export type Store = { records: PracticeRecord[]; expressions: SavedExpression[] };
export const STORAGE_KEY = 'mallo.practice.v1';
export const emptyStore: Store = { records: [], expressions: [] };

export function readStore(): { data: Store; error?: string } {
  let raw: string | null;
  try { raw = localStorage.getItem(STORAGE_KEY); }
  catch { return { data: emptyStore, error: '이 브라우저에서 기록 저장소를 사용할 수 없어요. 새 연습은 이 화면에서만 유지돼요.' }; }
  if (!raw) return { data: emptyStore };
  try {
    const parsed = storeSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return { data: parsed.data };
  } catch { /* Invalid JSON is preserved just like an incompatible schema. */ }
  return { data: emptyStore, error: '저장된 기록을 읽지 못했어요. 기존 데이터는 덮어쓰지 않으며, 새 연습은 이 화면에서만 유지돼요.' };
}
export function writeStore(data: Store): string | null {
  try {
    const validated = storeSchema.parse(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
    return null;
  } catch { return '기록을 기기에 저장하지 못했어요. 현재 화면에서는 계속 연습할 수 있어요.'; }
}
export function todayCounts(records: PracticeRecord[], now = new Date()): Record<PracticeRecord['source'], number> {
  const day = now.toLocaleDateString('en-CA');
  const counts = { recording: 0, text: 0, sample: 0 };
  for (const record of records) {
    if (new Date(record.completedAt).toLocaleDateString('en-CA') === day) counts[record.source]++;
  }
  return counts;
}
export function todayCount(records: PracticeRecord[], now = new Date()): number {
  return todayCounts(records, now).recording;
}
