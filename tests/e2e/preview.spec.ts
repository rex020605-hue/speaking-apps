import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const previewFile = resolve('preview/mallo.html');

test('the portable HTML needs no separate script, style, font or audio resources', async ({ page }) => {
  const errors: string[] = [];
  const webRequests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => { if (/^https?:/.test(request.url())) webRequests.push(request.url()); });
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      (window as unknown as { lastAudio: string }).lastAudio = this.src;
      return play.call(this);
    };
  });
  // Managed Chromium blocks file:// by policy. Serve the identical document
  // from an intercepted local URL; no module or media asset server is used.
  const documentUrl = 'http://127.0.0.1:4180/portable-review.html';
  await page.route(documentUrl, (route) => route.fulfill({ contentType: 'text/html', body: readFileSync(previewFile, 'utf8') }));
  await page.goto(documentUrl);
  await expect(page.getByRole('heading', { name: 'What do you like to do after school?' })).toBeVisible();
  await page.getByRole('button', { name: '질문 듣기', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { lastAudio: string }).lastAudio)).toMatch(/^data:audio\/mpeg;base64,/);
  await page.getByRole('button', { name: '샘플로 먼저 해보기', exact: true }).click();
  await page.getByRole('button', { name: '샘플 피드백 보기' }).click();
  await expect(page.getByText('I like playing basketball with my friends.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '표현 노트에 저장' }).click();
  await page.getByRole('button', { name: '표현 노트', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'After school, I like to play basketball with my friends.' })).toBeVisible();
  expect(errors).toEqual([]);
  expect(webRequests).toEqual([documentUrl]);
});

test('a restricted visualization frame still supports sample, notes and help', async ({ page }) => {
  const errors: string[] = [];
  const webRequests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => { if (/^https?:/.test(request.url())) webRequests.push(request.url()); });
  await page.setContent('<iframe id="preview" sandbox="allow-scripts" style="width:100%;height:950px;border:0"></iframe>');
  await page.evaluate((html) => { (document.getElementById('preview') as HTMLIFrameElement).srcdoc = html; }, readFileSync(previewFile, 'utf8'));
  const frame = page.frameLocator('#preview');
  await expect(frame.getByRole('heading', { name: 'What do you like to do after school?' })).toBeVisible();
  await expect(frame.getByRole('alert')).toContainText('이 화면에서만 유지돼요.');
  await frame.getByRole('button', { name: '샘플로 먼저 해보기', exact: true }).click();
  await frame.getByRole('button', { name: '샘플 피드백 보기' }).click();
  await frame.getByRole('button', { name: '표현 노트에 저장' }).click();
  await frame.getByRole('button', { name: '연습 완료하기' }).click();
  await frame.getByRole('button', { name: '이용 안내' }).click();
  await expect(frame.getByRole('dialog')).toBeVisible();
  await frame.getByRole('button', { name: '닫기', exact: true }).click();
  await frame.getByRole('button', { name: '표현 노트', exact: true }).click();
  await expect(frame.getByRole('heading', { name: 'After school, I like to play basketball with my friends.' })).toBeVisible();
  expect(errors).toEqual([]);
  expect(webRequests).toEqual([]);
});

test('portable recording uses the embedded worklet instead of a separate root path', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const documentUrl = 'http://127.0.0.1:4180/portable-review.html';
  await page.route(documentUrl, (route) => route.fulfill({ contentType: 'text/html', body: readFileSync(previewFile, 'utf8') }));
  await page.goto(documentUrl);
  await page.getByRole('button', { name: '눌러서 말하기' }).click();
  await expect(page.getByRole('button', { name: '녹음 끝내기' })).toBeVisible();
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: '녹음 끝내기' }).click();
  await expect(page.getByLabel('내 녹음', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '예시와 비교하기' }).click();
  await expect(page.getByText('내 답변을 자동으로 분석하지 않았어요.', { exact: false })).toBeVisible();
  expect(errors).toEqual([]);
});
