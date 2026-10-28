import { formatTons } from '@/utils/formatting';

/** Customizer copy only; validation rules retain their original messages. */
export function formatValidationMessage(message: string): string {
  const formatted = message
    .replace(
      /\b(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*(?:tons?|t)\b/gi,
      (_, used: string, max: string) =>
        `${Number(used).toFixed(1)} / ${formatTons(Number(max))}`,
    )
    .replace(/\b(\d+(?:\.\d+)?)\s*(?:tons?|t)\b/gi, (_, tons: string) =>
      formatTons(Number(tons)),
    );
  return !/[.!?]$/.test(formatted.trim()) ? `${formatted.trim()}.` : formatted;
}
