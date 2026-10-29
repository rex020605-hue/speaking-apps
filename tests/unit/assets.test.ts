import { afterEach, expect, it, vi } from 'vitest';
import { assetUrl } from '../../src/lib/assets';

afterEach(() => vi.unstubAllEnvs());

it('resolves audio and worklet files under a hosted project subdirectory', () => {
  vi.stubEnv('BASE_URL', '/speaking-apps/');
  expect(assetUrl('/audio/hobbies-1-question.mp3')).toBe('/speaking-apps/audio/hobbies-1-question.mp3');
  expect(assetUrl('/pcm-recorder.js')).toBe('/speaking-apps/pcm-recorder.js');
  vi.stubEnv('BASE_URL', '/');
  expect(assetUrl('/pcm-recorder.js')).toBe('/pcm-recorder.js');
});
