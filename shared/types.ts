import { z } from 'zod';

export const feedbackSchema = z.object({
  praise: z.string().min(1).max(400),
  grammar: z.object({
    needsCorrection: z.boolean(),
    corrected: z.string().min(1).max(600),
    explanation: z.string().min(1).max(500),
  }),
  expression: z.object({
    sentence: z.string().min(1).max(400),
    translation: z.string().min(1).max(400),
    explanation: z.string().min(1).max(400),
  }),
  followUp: z.object({
    question: z.string().min(1).max(200),
    translation: z.string().min(1).max(200),
  }),
  pronunciation: z.object({
    status: z.enum(['audio_review', 'not_assessed']),
    observation: z.string().min(1).max(500),
    practiceWord: z.string().max(60),
    tip: z.string().max(400),
  }),
});

export type Feedback = z.infer<typeof feedbackSchema>;
export type AnswerSource = 'recording' | 'text' | 'sample';
export interface ServiceStatus {
  aiAvailable: boolean;
  mode: 'sample' | 'adult_preview';
  reason: 'missing_key' | 'adult_preview_disabled' | null;
  maxSeconds: number;
}
export interface PracticeRecord {
  id: string;
  completedAt: string;
  topicId: string;
  question: string;
  transcript: string;
  source: AnswerSource;
  feedback: Feedback | null;
}
export interface SavedExpression {
  id: string;
  sentence: string;
  translation: string;
  savedAt: string;
  isSample: boolean;
}
