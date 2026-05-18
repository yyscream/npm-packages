export function formatTokens(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
  if (count < 1000000) return `${Math.round(count / 1000)}k`;
  if (count < 10000000) return `${(count / 1000000).toFixed(1)}M`;
  return `${Math.round(count / 1000000)}M`;
}

export function estimateTokensFromCharCount(charCount: number): number {
  return Math.max(0, Math.round(charCount / 4));
}

export function estimatePromptInjectionTokens(systemPrompt: string): number {
  return estimateTokensFromCharCount(systemPrompt.length);
}
