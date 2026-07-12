export function estimateTokens(value: string): number {
  if (!value) return 0;
  // Conservative fallback for code, JSON, and prose when no model tokenizer is installed.
  return Math.ceil(value.length / 3.5);
}

export function budgetAfterSafetyMargin(budget: number, margin: number): number {
  return Math.max(0, Math.floor(budget * (1 - margin)));
}
