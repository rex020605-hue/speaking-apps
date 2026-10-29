import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const audioFiles = await readdir(resolve(root, 'public/audio'));
const assets = {};
for (const file of audioFiles.filter((file) => file.endsWith('.mp3'))) {
  const bytes = await readFile(resolve(root, 'public/audio', file));
  assets[`/audio/${file}`] = `data:audio/mpeg;base64,${bytes.toString('base64')}`;
}
const worklet = await readFile(resolve(root, 'public/pcm-recorder.js'));
assets['/pcm-recorder.js'] = `data:text/javascript;base64,${worklet.toString('base64')}`;
const favicon = await readFile(resolve(root, 'public/favicon.svg'));

// An IIFE with inline CSS/media works when opened as a local file or in an
// opaque-origin iframe. A normal Vite module build needs an HTTP asset server.
const result = await build({
  configFile: false,
  root,
  publicDir: false,
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    __MALLO_PREVIEW_ASSETS__: JSON.stringify(assets),
  },
  build: {
    write: false,
    cssCodeSplit: false,
    minify: true,
    reportCompressedSize: false,
    lib: { entry: resolve(root, 'src/preview.tsx'), name: 'MalloPreview', formats: ['iife'] },
  },
});
const outputs = (Array.isArray(result) ? result : [result]).flatMap((bundle) => bundle.output);
const javascript = outputs.filter((item) => item.type === 'chunk').map((item) => item.code).join('\n');
const css = outputs.filter((item) => item.type === 'asset' && item.fileName.endsWith('.css')).map((item) => String(item.source)).join('\n');
if (!javascript || !css) throw new Error('Preview bundle is missing JavaScript or CSS.');
const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#faf9f6">
<meta name="referrer" content="no-referrer">
<title>말로 Mallo — API 없는 앱 미리보기</title>
<link rel="icon" href="data:image/svg+xml;base64,${favicon.toString('base64')}">
<style>${css.replace(/<\/style/gi, '<\\/style')}</style>
</head>
<body>
<noscript>앱 미리보기에는 JavaScript가 필요해요. 이 HTML 파일을 내려받아 Chrome 또는 Edge에서 직접 열어 주세요.</noscript>
<div id="root"></div>
<script>${javascript.replace(/<\/script/gi, '<\\/script')}</script>
</body>
</html>`;
const directory = resolve(root, 'preview');
await mkdir(directory, { recursive: true });
await writeFile(resolve(directory, 'mallo.html'), html);
console.log(`Portable preview: preview/mallo.html (${Math.ceil(Buffer.byteLength(html) / 1024)} KiB). No server, imports, or external media needed.`);
