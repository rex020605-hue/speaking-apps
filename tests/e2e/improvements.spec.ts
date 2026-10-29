import { test, expect, type Page } from '@playwright/test';

async function record(page: Page) {
  await page.getByRole('button', { name: '눌러서 말하기' }).click();
  await expect(page.getByRole('button', { name: '녹음 끝내기' })).toBeVisible();
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: '녹음 끝내기' }).click();
  await expect(page.getByRole('button', { name: '예시와 비교하기' })).toBeVisible();
}

test('two attempts can be compared, played one at a time, then released without storing audio', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await record(page);
  await page.getByLabel('내가 말한 문장 (선택)').fill('I like basketball.');
  const originalUrl = await page.getByLabel('내 녹음', { exact: true }).getAttribute('src');
  await page.getByRole('button', { name: '예시와 비교하기' }).click();
  await page.getByRole('button', { name: '한 번 더 말하기' }).click();
  await record(page);
  await expect(page.getByLabel('첫 번째 녹음', { exact: true })).toBeVisible();
  await expect(page.getByLabel('두 번째 녹음', { exact: true })).toBeVisible();
  const sources = await page.locator('.audio-comparison audio').evaluateAll((elements) => elements.map((audio) => (audio as HTMLAudioElement).src));
  expect(sources[0]).not.toBe(sources[1]);
  const first = await page.evaluate(async (src) => (await fetch(src)).arrayBuffer().then((buffer) => buffer.byteLength), sources[0]);
  expect(first).toBeGreaterThan(1000);
  await page.getByLabel('첫 번째 녹음', { exact: true }).evaluate((audio: HTMLAudioElement) => audio.play());
  await page.getByLabel('두 번째 녹음', { exact: true }).evaluate((audio: HTMLAudioElement) => audio.play());
  expect(await page.getByLabel('첫 번째 녹음', { exact: true }).evaluate((audio: HTMLAudioElement) => audio.paused)).toBe(true);
  await page.getByRole('button', { name: '예시와 비교하기' }).click();
  await expect(page.getByLabel('첫 번째와 두 번째 녹음 비교')).toBeVisible();
  await page.getByRole('button', { name: '연습 완료하기' }).click();
  await expect(page.locator('audio')).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  const saved = await page.evaluate(() => localStorage.getItem('mallo.practice.v1')!);
  expect(JSON.parse(saved).records).toHaveLength(1);
  expect(saved).not.toContain('blob:');
  const revoked = await page.evaluate(async (urls) => Promise.all(urls.map(async (url) => { try { await fetch(url!); return false; } catch { return true; } })), [...sources, originalUrl]);
  expect(revoked).toEqual([true, true, true]);
  expect(errors).toEqual([]);
});

test('unfinished feedback offers keep, complete-and-move, and discard', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '직접 입력하기' }).click();
  await page.getByLabel('영어로 한 문장 적어보세요').fill('I enjoy drawing.');
  await page.getByRole('button', { name: '예시와 비교하기' }).click();
  await page.getByRole('button', { name: '학교생활', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('아직 완료하지 않은 연습');
  await page.getByRole('button', { name: '계속 연습하기' }).click();
  await expect(page.getByText('I enjoy drawing.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '학교생활', exact: true }).click();
  await page.getByRole('button', { name: '완료하고 이동' }).click();
  await expect(page.getByRole('heading', { name: 'What is your favorite subject?' })).toBeVisible();
  const records = await page.evaluate(() => JSON.parse(localStorage.getItem('mallo.practice.v1')!).records);
  expect(records).toHaveLength(1);
  expect(records[0].transcript).toBe('I enjoy drawing.');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
});

test('refreshing an unfinished answer warns without silently losing it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '직접 입력하기' }).click();
  await page.getByLabel('영어로 한 문장 적어보세요').fill('I like books.');
  const dialogPromise = page.waitForEvent('dialog');
  const navigation = page.reload({ timeout: 1500 }).catch((error) => error);
  const dialog = await dialogPromise;
  expect(dialog.type()).toBe('beforeunload');
  await dialog.dismiss();
  await expect(page.getByLabel('영어로 한 문장 적어보세요')).toHaveValue('I like books.');
  await navigation;
});

test('clearing expressions retains completed practice records', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '샘플로 먼저 해보기', exact: true }).click();
  await page.getByRole('button', { name: '샘플 피드백 보기' }).click();
  await page.getByRole('button', { name: '표현 노트에 저장' }).click();
  await page.getByRole('button', { name: '연습 완료하기' }).click();
  await page.getByRole('button', { name: '표현 노트', exact: true }).click();
  await page.getByRole('button', { name: '노트 비우기' }).click();
  await expect(page.getByRole('dialog')).toContainText('완료한 연습 기록은 그대로');
  await page.getByRole('button', { name: '표현 노트 비우기' }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mallo.practice.v1')!));
  expect(saved.records).toHaveLength(1);
  expect(saved.expressions).toHaveLength(0);
});

test('retrying a typed answer retains its draft without counting it as speech', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '직접 입력하기' }).click();
  await page.getByLabel('영어로 한 문장 적어보세요').fill('I like cats.');
  await page.getByRole('button', { name: '예시와 비교하기' }).click();
  await page.getByRole('button', { name: '한 번 더 말하기' }).click();
  await page.getByRole('button', { name: '학교생활', exact: true }).click();
  await page.getByRole('button', { name: '완료하고 이동' }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mallo.practice.v1')!));
  expect(saved.records[0].source).toBe('text');
  expect(saved.records[0].transcript).toBe('I like cats.');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
});
