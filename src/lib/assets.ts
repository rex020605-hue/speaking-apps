/** The downloadable preview supplies embedded assets at build time. Normal web
 * builds keep the same-origin paths, without including a second copy of audio.
 */
declare const __MALLO_PREVIEW_ASSETS__: Record<string, string> | undefined;
const embedded = typeof __MALLO_PREVIEW_ASSETS__ === 'undefined' ? {} : __MALLO_PREVIEW_ASSETS__;

export function assetUrl(path: string): string {
  if (embedded?.[path]) return embedded[path];
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}
