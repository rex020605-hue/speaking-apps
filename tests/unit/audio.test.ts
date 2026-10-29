import { describe, expect, it } from 'vitest';
import { encodeWav } from '../../src/lib/audio';

describe('recorded audio format', () => {
  it('produces playable mono PCM with correct duration, clipping, and sample polarity', async () => {
    const samples = new Float32Array([-2, -0.5, 0, 0.5, 2]);
    const blob = encodeWav(samples, 48000);
    const buffer = await blob.arrayBuffer();
    const view = new DataView(buffer);
    const label = (offset: number, count: number) => new TextDecoder().decode(buffer.slice(offset, offset + count));
    expect(blob.type).toBe('audio/wav');
    expect(label(0, 4)).toBe('RIFF');
    expect(label(8, 4)).toBe('WAVE');
    expect(label(36, 4)).toBe('data');
    expect(view.getUint32(4, true)).toBe(buffer.byteLength - 8);
    expect(view.getUint16(20, true)).toBe(1);
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(48000);
    expect(view.getUint32(28, true)).toBe(96000);
    expect(view.getUint32(40, true)).toBe(10);
    expect([0, 1, 2, 3, 4].map((i) => view.getInt16(44 + i * 2, true))).toEqual([-32768, -16384, 0, 16383, 32767]);
  });
});
