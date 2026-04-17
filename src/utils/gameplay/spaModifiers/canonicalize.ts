/**
 * Canonicalization bridge between pilot ability ids and the unified SPA
 * catalog. The combat modifier files used to hardcode kebab-case ids
 * (`'weapon-specialist'`, `'iron-man'`) matching System B's original
 * catalog. With the unified catalog landing snake_case canonical ids
 * (matching MegaMek's OptionsConstants), we normalize both forms at the
 * modifier boundary so a pilot record works regardless of whether its
 * `abilities` field uses the legacy or canonical form.
 *
 * Every modifier function should call `hasSPA(abilities, 'canonical_id')`
 * rather than `abilities.includes('some-legacy-id')`. The helper below
 * handles the snake→kebab mapping automatically via the unified catalog's
 * legacy-alias table.
 */

import { canonicalizeSPAIds } from '@/lib/spa';

/**
 * True iff `abilities` (either canonical or legacy ids) contains the
 * canonical ability id after legacy-alias resolution.
 */
export function hasSPA(
  abilities: readonly string[],
  canonicalId: string,
): boolean {
  if (abilities.includes(canonicalId)) return true;
  const canonicalized = canonicalizeSPAIds(abilities);
  return canonicalized.includes(canonicalId);
}
