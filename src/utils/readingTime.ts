const WORDS_PER_MINUTE = 200;

export function getReadingTimeMinutes(text: string): number {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}

export function formatReadingTime(text: string): string {
  const minutes = getReadingTimeMinutes(text);
  return `${minutes} min read`;
}
