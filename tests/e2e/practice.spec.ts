import { test, expect, type Page } from '@playwright/test';

async function sample(page: Page) {
  await page.getByRole('button', { name: '샘플로 먼저 해보기', exact: true }).click();
  await page.getByRole('button', { name: '샘플 피드백 보기' }).click();
}

test('topics, translation, hints and listening work with no external requests', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (request) => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).hostname !== '127.0.0.1') external.push(request.url());
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'What do you like to do after school?' })).toBeVisible();
  await page.getByRole('button', { name: '해석 보기' }).click();
  await expect(page.getByText('학교가 끝나면 무엇을 하는 걸 좋아하나요?')).toBeVisible();
  await page.getByRole('button', { name: '도움이 되는 표현 보기' }).click();
  await expect(page.getByText('play basketball', { exact: true })).toBeVisible();
  const audio = page.waitForResponse((response) => response.url().includes('/audio/hobbies-1-question.mp3'));
  await page.getByRole('button', { name: '질문 듣기', exact: true }).click();
  expect((await audio).ok()).toBe(true);
  await page.getByRole('button', { name: '학교생활', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What is your favorite subject?' })).toBeVisible();
  await expect(page.getByRole('button', { name: '학교생활', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: '질문 듣기', exact: true })).toBeEnabled();
  expect(external).toEqual([]);
});

test('sample feedback is labeled, bookmarks persist, sample does not advance daily goal', async ({ page }) => {
  await page.goto('/');
  await sample(page);
  await expect(page.getByText('실제 녹음 분석 결과가 아니에요.', { exact: false })).toBeVisible();
  await expect(page.getByText('I like playing basketball with my friends.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '표현 노트에 저장' }).click();
  await page.getByRole('button', { name: '연습 완료하기' }).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  await page.getByRole('button', { name: '표현 노트', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'After school, I like to play basketball with my friends.' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: '연습 기록', exact: true }).click();
  await expect(page.getByText('샘플', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /취미와 일상.*What do you like/ }).click();
  await expect(page.getByRole('dialog')).toContainText('샘플 교정 예시');
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.getByRole('button', { name: '기록 관리' }).click();
  await page.getByRole('button', { name: '연습 기록 지우기' }).click();
  await expect(page.getByRole('heading', { name: '첫 번째 이야기를 기다리고 있어요' })).toBeVisible();
  await page.getByRole('button', { name: '표현 노트', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'After school, I like to play basketball with my friends.' })).toBeVisible();
  await page.getByRole('button', { name: '노트 비우기' }).click();
  await page.getByRole('button', { name: '표현 노트 비우기' }).click();
  await expect(page.getByRole('heading', { name: '마음에 드는 첫 문장을 담아볼까요?' })).toBeVisible();
});

test('a typed answer is preserved and counted separately from speaking practice', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '직접 입력하기' }).click();
  await page.getByRole('button', { name: '예시와 비교하기' }).click();
  await expect(page.getByRole('alert')).toContainText('한 문장만');
  await page.getByLabel('영어로 한 문장 적어보세요').fill('I love drawing cats.');
  await page.getByRole('button', { name: '예시와 비교하기' }).click();
  await expect(page.getByText('I love drawing cats.', { exact: true })).toBeVisible();
  await expect(page.getByText('내 답변을 자동으로 분석하지 않았어요.', { exact: false })).toBeVisible();
  await expect(page.getByText('딱 하나만 다듬어 볼까?')).toHaveCount(0);
  await page.getByLabel('질문에 맞는 내 이야기를 했어요.').check();
  await page.getByRole('button', { name: '연습 완료하기' }).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  await expect(page.getByText('음성 0회 · 입력 1회')).toBeVisible();
  await page.getByRole('button', { name: '다음 질문으로' }).click();
  await expect(page.getByRole('heading', { name: 'What kind of music do you like?' })).toBeVisible();
  const records = await page.evaluate(() => JSON.parse(localStorage.getItem('mallo.practice.v1')!).records);
  expect(records).toHaveLength(1);
  expect(records[0].feedback).toBeNull();
  expect(records[0].transcript).toBe('I love drawing cats.');
});

test('microphone denial explains recovery and leaves text practice available', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => { throw new DOMException('denied', 'NotAllowedError'); } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: '눌러서 말하기' }).click();
  await expect(page.getByRole('alert')).toContainText('마이크 권한이 꺼져 있어요.');
  await page.getByRole('button', { name: '직접 입력하기' }).click();
  await expect(page.getByLabel('영어로 한 문장 적어보세요')).toBeEditable();
});

test('real browser capture produces playable PCM and releases the microphone', async ({ page }) => {
  await page.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await original(constraints);
      (window as unknown as { testTracks: MediaStreamTrack[] }).testTracks = stream.getTracks();
      return stream;
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: '눌러서 말하기' }).click();
  await expect(page.getByRole('button', { name: '녹음 끝내기' })).toBeVisible();
  await page.waitForTimeout(1100);
  await page.getByRole('button', { name: '녹음 끝내기' }).click();
  await expect(page.getByLabel('내 녹음', { exact: true })).toBeVisible();
  const result = await page.evaluate(async () => {
    const audio = document.querySelector('audio')!;
    const buffer = await (await fetch(audio.src)).arrayBuffer();
    const view = new DataView(buffer);
    return {
      label: new TextDecoder().decode(buffer.slice(0, 4)),
      sampleRate: view.getUint32(24, true),
      dataLength: view.getUint32(40, true),
      byteLength: buffer.byteLength,
      stopped: (window as unknown as { testTracks: MediaStreamTrack[] }).testTracks.every((track) => track.readyState === 'ended'),
    };
  });
  expect(result.label).toBe('RIFF');
  expect(result.dataLength).toBeGreaterThan(1000);
  expect(result.byteLength).toBe(result.dataLength + 44);
  expect(result.stopped).toBe(true);
  await page.getByRole('button', { name: '예시와 비교하기' }).click();
  await page.getByRole('button', { name: '연습 완료하기' }).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  const saved = await page.evaluate(() => localStorage.getItem('mallo.practice.v1'));
  expect(saved).not.toContain('blob:');
  expect(saved).not.toContain('audioBlob');
  await expect(page.locator('audio')).toHaveCount(0);
});

test('recording ends automatically at the 30 second limit', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: '눌러서 말하기' }).click();
  await expect(page.getByRole('button', { name: '녹음 끝내기' })).toBeVisible();
  await page.waitForTimeout(500);
  await page.clock.fastForward(31_000);
  await expect(page.getByLabel('내 녹음', { exact: true })).toBeVisible();
});

test('unfinished answers require confirmation before changing topics', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '직접 입력하기' }).click();
  await page.getByLabel('영어로 한 문장 적어보세요').fill('I like drawing.');
  await page.getByRole('button', { name: '학교생활', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: '계속 연습하기' }).click();
  await expect(page.getByLabel('영어로 한 문장 적어보세요')).toHaveValue('I like drawing.');
  await page.getByRole('button', { name: '학교생활', exact: true }).click();
  await page.getByRole('button', { name: '저장하지 않고 이동', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What is your favorite subject?' })).toBeVisible();
});

test('mobile layout fits the screen and navigation works', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: '메뉴 열기' }).click();
  await page.getByRole('button', { name: '연습 기록', exact: true }).click();
  await expect(page.getByRole('heading', { name: '차곡차곡, 연습 기록' })).toBeVisible();
  await page.getByRole('button', { name: '첫 연습 시작하기' }).click();
  await sample(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/mallo-mobile.png', fullPage: true });
});

test('desktop layout and help dialog have no browser errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: '/tmp/mallo-desktop.png', fullPage: true });
  await page.getByRole('button', { name: '이용 안내' }).click();
  await expect(page.getByRole('dialog')).toContainText('녹음은 외부로 전송하지 않고');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await sample(page);
  await page.screenshot({ path: '/tmp/mallo-feedback.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('cancelling capture releases all microphone tracks and permits retry', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await original(constraints);
      (window as unknown as { testTracks: MediaStreamTrack[] }).testTracks = stream.getTracks();
      return stream;
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: '눌러서 말하기' }).click();
  await expect(page.getByRole('button', { name: '녹음 취소', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '녹음 취소', exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { testTracks: MediaStreamTrack[] }).testTracks.every((track) => track.readyState === 'ended'))).toBe(true);
  await expect(page.getByRole('button', { name: '눌러서 말하기' })).toBeEnabled();
  await expect(page.locator('audio')).toHaveCount(0);
  await page.waitForTimeout(200);
  expect(errors).toEqual([]);
});

test('incompatible saved data is preserved until an explicit reset', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('mallo.practice.v1', '{old-data'));
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('기존 데이터는 덮어쓰지 않으며');
  await sample(page);
  await page.getByRole('button', { name: '연습 완료하기' }).click();
  expect(await page.evaluate(() => localStorage.getItem('mallo.practice.v1'))).toBe('{old-data');
  await page.getByRole('button', { name: '기록 초기화' }).click();
  await page.getByRole('button', { name: '모두 지우기' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('mallo.practice.v1')!).records)).toHaveLength(0);
});

test('the minimum supported phone width has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await sample(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
