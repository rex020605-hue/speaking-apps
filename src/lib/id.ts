let sequence = 0;

/** Local record identifiers, never authentication tokens. randomUUID is absent
 * in some file previews and sandboxed viewers, so it must not be required.
 */
export function newLocalId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `mallo-${Date.now().toString(36)}-${(++sequence).toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
