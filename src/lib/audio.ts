import { assetUrl } from './assets';

export const MAX_SECONDS = 30;

export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => [...value].forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true);
  text(8, 'WAVE'); text(12, 'fmt '); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  text(36, 'data'); view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const value = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, value < 0 ? value * 32768 : value * 32767, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

export class VoiceRecorder {
  private stream?: MediaStream;
  private context?: AudioContext;
  private processor?: AudioWorkletNode;
  private source?: MediaStreamAudioSourceNode;
  private chunks: Float32Array[] = [];
  private stopped = false;
  private timeout?: ReturnType<typeof setTimeout>;
  private pendingStop?: (blob: Blob) => void;
  private sampleCount = 0;

  async start(onLevel: (level: number) => void, onLimit: () => void) {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('이 브라우저에서는 마이크를 사용할 수 없어요. HTTPS 또는 localhost에서 열거나 직접 입력해 주세요.');
    }
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }, video: false });
    if (this.stopped) { this.stream.getTracks().forEach((track) => track.stop()); return; }
    try {
      this.context = new AudioContext();
      await this.context.audioWorklet.addModule(assetUrl('/pcm-recorder.js'));
      if (this.stopped) { this.release(); return; }
      this.processor = new AudioWorkletNode(this.context, 'mallo-pcm');
      this.processor.port.onmessage = (event: MessageEvent<Float32Array | { stopped: true }>) => {
        // Messages already queued when the user cancels may outlive the context.
        const context = this.context;
        if (!context) return;
        if (!(event.data instanceof Float32Array)) {
          if (this.pendingStop) {
            const rate = context.sampleRate;
            const samples = new Float32Array(this.sampleCount);
            let offset = 0;
            for (const chunk of this.chunks) { samples.set(chunk, offset); offset += chunk.length; }
            const blob = encodeWav(samples, rate);
            this.pendingStop(blob); this.pendingStop = undefined;
            this.release();
          }
          return;
        }
        const remaining = Math.max(0, context.sampleRate * MAX_SECONDS - this.sampleCount);
        const chunk = event.data.slice(0, remaining);
        if (!chunk.length) return;
        this.chunks.push(chunk); this.sampleCount += chunk.length;
        let sum = 0;
        for (const value of chunk) sum += value * value;
        onLevel(Math.min(1, Math.sqrt(sum / chunk.length) * 8));
      };
      this.source = this.context.createMediaStreamSource(this.stream);
      this.source.connect(this.processor); this.processor.connect(this.context.destination);
      await this.context.resume();
      this.timeout = setTimeout(onLimit, MAX_SECONDS * 1000);
    } catch (error) { this.release(); throw error; }
  }

  async stop(): Promise<Blob> {
    if (this.timeout) clearTimeout(this.timeout);
    if (!this.processor || !this.context || this.stopped) throw new Error('진행 중인 녹음이 없어요.');
    this.stopped = true;
    return new Promise<Blob>((resolve, reject) => {
      const watchdog = setTimeout(() => { this.release(); reject(new Error('녹음을 마무리하지 못했어요. 다시 시도해 주세요.')); }, 2000);
      this.pendingStop = (blob) => { clearTimeout(watchdog); resolve(blob); };
      this.processor!.port.postMessage('stop');
    });
  }

  cancel() { this.stopped = true; if (this.timeout) clearTimeout(this.timeout); this.release(); }
  private release() {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.source?.disconnect();
    if (this.processor) {
      this.processor.port.onmessage = null;
      this.processor.port.close();
      this.processor.disconnect();
    }
    const context = this.context;
    this.context = undefined;
    if (context && context.state !== 'closed') void context.close().catch(() => {});
    this.chunks = []; this.sampleCount = 0;
  }
}

export function microphoneError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') return '마이크 권한이 꺼져 있어요. 주소창의 사이트 설정에서 허용하거나 직접 입력해 주세요.';
    if (error.name === 'NotFoundError') return '마이크를 찾지 못했어요. 기기를 연결하거나 직접 입력해 주세요.';
    if (error.name === 'NotReadableError') return '다른 앱에서 마이크를 사용 중일 수 있어요. 잠시 후 다시 시도해 주세요.';
  }
  return error instanceof Error ? error.message : '녹음을 시작하지 못했어요. 직접 입력으로도 연습할 수 있어요.';
}

let currentAudio: HTMLAudioElement | null = null;
let finishPlayback: (() => void) | null = null;
let playbackGeneration = 0;
export function stopSpeaking() {
  playbackGeneration++;
  const finish = finishPlayback; finishPlayback = null;
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  finish?.();
}

export function stopAllPlayback(except?: HTMLMediaElement) {
  stopSpeaking();
  document.querySelectorAll('audio').forEach((audio) => { if (audio !== except) audio.pause(); });
}

export async function speak(text: string, fallbackPath?: string, slow = false): Promise<void> {
  stopAllPlayback();
  const generation = playbackGeneration;
  const synth = window.speechSynthesis;
  if (synth) {
    if (!synth.getVoices().length) await new Promise<void>((resolve) => {
      const ready = () => { clearTimeout(timer); synth.removeEventListener('voiceschanged', ready); resolve(); };
      const timer = setTimeout(ready, 400);
      synth.addEventListener('voiceschanged', ready, { once: true });
    });
    if (generation !== playbackGeneration) return;
    // Stay offline: do not send student-entered text to a remote speech voice.
    const voice = synth.getVoices().find((voice) => voice.localService && /^en[-_]/i.test(voice.lang));
    if (voice) {
      return new Promise((resolve, reject) => {
        const finish = (error?: Error) => {
          if (finishPlayback === cancel) finishPlayback = null;
          if (error) reject(error); else resolve();
        };
        const cancel = () => finish(); finishPlayback = cancel;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = voice; utterance.lang = voice.lang; utterance.rate = slow ? 0.72 : 0.88;
        utterance.onend = () => finish();
        utterance.onerror = (event) => event.error === 'canceled' || event.error === 'interrupted' ? finish() : finish(new Error('음성을 재생하지 못했어요. 다시 눌러 주세요.'));
        synth.speak(utterance);
      });
    }
  }
  if (fallbackPath) {
    const audio = new Audio(assetUrl(fallbackPath)); currentAudio = audio; audio.playbackRate = slow ? 0.8 : 1;
    return new Promise((resolve, reject) => {
      const finish = (error?: Error) => {
        if (currentAudio === audio) currentAudio = null;
        if (finishPlayback === cancel) finishPlayback = null;
        if (error) reject(error); else resolve();
      };
      const cancel = () => finish(); finishPlayback = cancel;
      audio.onended = () => finish();
      audio.onerror = () => finish(new Error('음성을 재생하지 못했어요. 다시 눌러 주세요.'));
      void audio.play().catch(() => finish(new Error('음성 재생을 허용한 뒤 다시 눌러 주세요.')));
    });
  }
  throw new Error('이 기기에 영어 읽기 음성이 없어요. 화면의 문장을 보며 연습해 주세요.');
}
