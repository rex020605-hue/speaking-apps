import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { topics, sampleFeedback } from '../../shared/catalog';
import { feedbackSchema } from '../../shared/types';
import { coach, CoachNotConnectedError } from '../../src/services/coach';

describe('offline lesson content', () => {
  it('ships every question and answer with a nonempty local audio asset', () => {
    const ids = topics.flatMap((topic) => topic.questions.map((question) => question.id));
    expect(ids).toHaveLength(15);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      for (const kind of ['question', 'answer']) {
        const audio = readFileSync(`public/audio/${id}-${kind}.mp3`);
        expect(audio.byteLength).toBeGreaterThan(1000);
        expect(audio.subarray(0, 3).toString()).toBe('ID3');
      }
    }
  });

  it('never presents example text as an assessed recording', () => {
    for (const question of topics.flatMap((topic) => topic.questions)) {
      const feedback = feedbackSchema.parse(sampleFeedback(question));
      expect(feedback.pronunciation.status).toBe('not_assessed');
      expect(feedback.pronunciation.observation).toContain('샘플');
      expect(feedback.grammar.corrected).not.toBe(question.sample.answer);
    }
  });

  it('fails explicitly without making a request when an AI adapter is not connected', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    try {
      await expect(coach.transcribe(new Blob())).rejects.toBeInstanceOf(CoachNotConnectedError);
      await expect(coach.review({ question: 'Hello?', transcript: 'Hello.' })).rejects.toBeInstanceOf(CoachNotConnectedError);
      expect(fetch).not.toHaveBeenCalled();
    } finally { vi.unstubAllGlobals(); }
  });
});
