/** Native decimal equipment size token; callers retain trimming and errors. */
export function parseEquipmentSizeNumber(token: string): number | undefined {
  const decimal = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?[df]?$/i;
  const value = Number(token.replace(/[df]$/i, ''));
  return decimal.test(token) && Number.isFinite(value) ? value : undefined;
}
