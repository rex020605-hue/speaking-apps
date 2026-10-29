import { afterEach, expect, it, vi } from 'vitest';
import { newLocalId } from '../../src/lib/id';

afterEach(() => vi.unstubAllGlobals());

it('allows expression saving without secure-context crypto APIs', () => {
  vi.stubGlobal('crypto', undefined);
  const ids = Array.from({ length: 100 }, () => newLocalId());
  expect(new Set(ids).size).toBe(100);
  expect(ids.every((id) => id.length > 0 && id.length < 80)).toBe(true);
});
