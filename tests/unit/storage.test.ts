import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readStore, writeStore, todayCount, todayCounts, STORAGE_KEY, type Store } from '../../src/lib/storage';
import type { PracticeRecord } from '../../shared/types';

const entry: PracticeRecord = {
  id: 'record-1', completedAt: new Date().toISOString(), topicId: 'hobbies',
  question: 'What do you like to do after school?', transcript: 'I like reading.', source: 'recording', feedback: null,
};
let memory: Map<string, string>;
beforeEach(() => {
  memory = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => { memory.set(key, value); },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('private practice history', () => {
  it('round-trips a real exercise without retaining audio or an object URL', () => {
    const input = { records: [{ ...entry, audioBlob: 'private', audioUrl: 'blob:private' }], expressions: [] };
    expect(writeStore(input)).toBeNull();
    expect(readStore().data.records[0]).toEqual(entry);
    expect(memory.get(STORAGE_KEY)).not.toContain('private');
    expect(memory.get(STORAGE_KEY)).not.toContain('audio');
  });

  it('does not destroy corrupted or incompatible existing data while loading', () => {
    for (const invalid of ['{broken', JSON.stringify({ records: [{ id: 'old-format' }], expressions: [] })]) {
      memory.set(STORAGE_KEY, invalid);
      const result = readStore();
      expect(result.error).toBeTruthy();
      expect(result.data.records).toHaveLength(0);
      expect(memory.get(STORAGE_KEY)).toBe(invalid);
    }
  });

  it('reports unavailable browser storage', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('quota'); } });
    expect(readStore().error).toBeTruthy();
    expect(writeStore({ records: [entry], expressions: [] })).toBeTruthy();
  });

  it('refuses invalid records instead of saving them', () => {
    const invalid = { records: [{ ...entry, transcript: 'x'.repeat(601) }], expressions: [] };
    expect(writeStore(invalid as Store)).toBeTruthy();
    expect(memory.has(STORAGE_KEY)).toBe(false);
  });

  it('counts only recordings toward speaking and tracks text and samples separately', () => {
    const now = new Date(2026, 9, 29, 12, 0);
    const today = new Date(2026, 9, 29, 0, 1).toISOString();
    const yesterday = new Date(2026, 9, 28, 23, 59).toISOString();
    const records: PracticeRecord[] = [
      { ...entry, completedAt: today },
      { ...entry, completedAt: today, source: 'text' },
      { ...entry, completedAt: today, source: 'sample' },
      { ...entry, completedAt: yesterday },
    ];
    expect(todayCount(records, now)).toBe(1);
    expect(todayCounts(records, now)).toEqual({ recording: 1, text: 1, sample: 1 });
  });
});
