import type { Feedback } from '../../shared/types';

/** Replace this adapter with a same-origin server client when a provider is chosen.
 * Never put a provider key in the browser or grade audio from its transcript alone.
 */
export interface SpeakingCoach {
  transcribe(audio: Blob, signal?: AbortSignal): Promise<string>;
  review(input: { question: string; transcript: string; audio?: Blob }, signal?: AbortSignal): Promise<Feedback>;
}

export class CoachNotConnectedError extends Error {
  constructor() { super('자동 음성 분석은 아직 연결하지 않았어요. 샘플과 내 녹음으로 연습할 수 있어요.'); }
}

export const coach: SpeakingCoach = {
  async transcribe() { throw new CoachNotConnectedError(); },
  async review() { throw new CoachNotConnectedError(); },
};
