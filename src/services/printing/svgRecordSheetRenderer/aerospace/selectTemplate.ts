/**
 * Aerospace / conventional-fighter family — canonical template selection.
 *
 * Pure function mapping an `IAerospaceRecordSheetData` to a Wave-1
 * `templateKey`, mirroring MegaMekLab `PrintAero.getSVGFileName()`:
 * small craft select their hull-specific sheet, a `ConvFighter` selects
 * `fighter_conventional`, and aerospace fighters select `fighter_aerospace`.
 *
 * @spec openspec/changes/add-templated-vehicle-aero-proto-record-sheets/specs/record-sheet-export/spec.md
 *   (Requirement: Per-Family Record Sheet Adapters — aerospace keys)
 */

import type { IAerospaceRecordSheetData } from '@/types/printing';

import { AerospaceMotionType } from '@/types/unit/BaseUnitInterfaces';

/** Fighter and small-craft template keys from the pinned PrintAero selector. */
export type AerospaceTemplateKey =
  | 'fighter_aerospace'
  | 'fighter_conventional'
  | 'smallcraft_aerodyne_default'
  | 'smallcraft_spheroid_default';

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
  if (data.smallCraftMotionType)
    return data.smallCraftMotionType === AerospaceMotionType.SPHEROID
      ? 'smallcraft_spheroid_default'
      : 'smallcraft_aerodyne_default';
  return data.isConventional ? 'fighter_conventional' : 'fighter_aerospace';
}
