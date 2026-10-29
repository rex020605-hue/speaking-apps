import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { setTimeout as pause } from 'node:timers/promises';

const origin = 'http://127.0.0.1:4175';
const base = '/speaking-apps/';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4175', '--strictPort', '--base', base], { stdio: ['ignore', 'pipe', 'pipe'] });
let serverLog = '';
let serverError = '';
server.on('error', (error) => { serverError = error.message; });
server.stdout.on('data', (chunk) => { serverLog += chunk; });
server.stderr.on('data', (chunk) => { serverLog += chunk; });
let browser;
try {
  let ready = false;
  let lastResponse = '';
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null || server.signalCode || serverError) throw new Error(serverError || serverLog || `Preview server exited: ${server.signalCode}`);
    try { const response = await fetch(origin + base); ready = response.ok; lastResponse = `HTTP ${response.status}`; }
    catch (error) { lastResponse = `${error.message}: ${error.cause?.message || ''}`; }
    if (ready) break;
    await pause(200);
  }
  if (!ready) throw new Error(`Project-path preview server did not become ready. ${lastResponse}\n${serverLog}`);
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
    args: ['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Seoul', locale: 'ko-KR' });
  const failures = [];
  page.on('pageerror', (error) => failures.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
  await page.goto(origin + base);
  await page.getByRole('heading', { name: 'What do you like to do after school?' }).waitFor();
  const questionAudio = page.waitForResponse((response) => response.url().endsWith(base + 'audio/hobbies-1-question.mp3'));
  await page.getByRole('button', { name: '질문 듣기', exact: true }).click();
  if (!(await questionAudio).ok()) throw new Error('Project-path question audio failed.');
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.getByRole('button', { name: '눌러서 말하기' }).click();
    await page.getByRole('button', { name: '녹음 끝내기' }).waitFor();
    await page.waitForTimeout(700);
    await page.getByRole('button', { name: '녹음 끝내기' }).click();
    if (attempt === 0) {
      await page.getByLabel('내 녹음', { exact: true }).waitFor();
      await page.getByRole('button', { name: '예시와 비교하기' }).click();
      await page.getByRole('button', { name: '한 번 더 말하기' }).click();
    }
  }
  await page.getByLabel('첫 번째 녹음', { exact: true }).waitFor();
  await page.getByLabel('두 번째 녹음', { exact: true }).waitFor();
  await page.screenshot({ path: '/tmp/mallo-comparison.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Recording comparison overflows the phone screen.');
  await page.screenshot({ path: '/tmp/mallo-comparison-mobile.png', fullPage: true });
  await page.getByRole('button', { name: '예시와 비교하기' }).click();
  await page.getByRole('button', { name: '연습 완료하기' }).click();
  if (await page.getByRole('progressbar').getAttribute('aria-valuenow') !== '1') throw new Error('Speaking completion count failed.');
  if (failures.length) throw new Error(failures.join('\n'));
  console.log('Pages path verified: application, embedded fonts, question audio, worklet, two recordings, phone layout, and completion count.');
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
