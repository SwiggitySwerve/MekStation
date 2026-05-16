/**
 * Aerospace / conventional-fighter family — canonical template selection.
 *
 * Pure function mapping an `IAerospaceRecordSheetData` to a Wave-1
 * `templateKey`, mirroring MegaMekLab `PrintAero.getSVGFileName()`:
 * a `ConvFighter` selects `fighter_conventional`, every other aero
 * fighter selects `fighter_aerospace`.
 *
 * @spec openspec/changes/add-templated-vehicle-aero-proto-record-sheets/specs/record-sheet-export/spec.md
 *   (Requirement: Per-Family Record Sheet Adapters — aerospace keys)
 */

import type { IAerospaceRecordSheetData } from '@/types/printing';

/** The two Wave-1 aerospace template keys. */
export type AerospaceTemplateKey = 'fighter_aerospace' | 'fighter_conventional';

/**
 * Select the canonical Wave-1 template key for an aerospace unit.
 *
 * Branches on the unit's `isConventional` flag, which the aerospace
 * extractor sets from the construction unit's `ConvFighter` type —
 * mirroring `PrintAero`'s `aero instanceof ConvFighter` check.
 */
export function selectAerospaceTemplate(
  data: IAerospaceRecordSheetData,
): AerospaceTemplateKey {
  return data.isConventional ? 'fighter_conventional' : 'fighter_aerospace';
}
