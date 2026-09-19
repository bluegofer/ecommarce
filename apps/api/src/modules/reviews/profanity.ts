// apps/api/src/modules/reviews/profanity.ts
// Minimal profanity filter — sufficient for MVP. Extend list or swap for
// a library later without touching callers.
const BLOCKED = [
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'bastard',
  'damn',
  'cunt',
  'dick',
];

export function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase();
  return BLOCKED.some((w) => lower.includes(w));
}