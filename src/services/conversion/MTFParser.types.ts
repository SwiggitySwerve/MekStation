/**
 * MTF Parser - Shared Leaf Module
 *
 * Leaf module that hosts the low-level `parseField` primitive consumed by
 * both `MTFParser.components.ts` and `MTFParserHelpers.ts`. Previously
 * `MTFParser.components.ts` imported `parseField` from
 * `MTFParserHelpers.ts`, which re-exported the components from
 * `MTFParser.components.ts` — a 2-way cycle.
 *
 * This file must not import from `./MTFParser.components` or
 * `./MTFParserHelpers` — it is a leaf.
 */

/**
 * Parse a field by its case-insensitive name from a list of MTF lines.
 *
 * Matches the `^<fieldName>:(.*)$` pattern and returns the trimmed value,
 * or `undefined` if the field is absent.
 */
export function parseField(
  lines: string[],
  fieldName: string,
): string | undefined {
  const pattern = new RegExp(`^${fieldName}:(.*)$`, 'i');
  for (const line of lines) {
    const match = line.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  return undefined;
}
