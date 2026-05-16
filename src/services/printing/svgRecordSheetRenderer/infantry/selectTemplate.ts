/**
 * Conventional Infantry family — canonical template selection.
 *
 * Pure function mapping an `IInfantryRecordSheetData` to its Wave-2
 * `templateKey`. For the single-unit MVP this is always the per-unit
 * block template `conventional_infantry_platoon` — mirroring MegaMekLab
 * `PrintInfantry.getSVGFileName()`, which returns
 * `conventional_infantry_platoon.svg`.
 *
 * The multi-slot outer sheet `conventional_infantry_default`
 * (MegaMekLab's `PrintSmallUnitSheet` composite, up to 3 platoons per
 * page) is registered as an asset but is NOT selected here — the
 * multi-unit composite is a deferred follow-up. See the change's
 * Non-Goals.
 *
 * @spec openspec/changes/add-templated-infantry-battlearmor-record-sheets/specs/record-sheet-export/spec.md
 *   (Requirement: Infantry and Battle Armor Record Sheet Adapters)
 */

import type { IInfantryRecordSheetData } from '@/types/printing';

/** The Wave-2 conventional-infantry per-unit block template key. */
export type InfantryTemplateKey = 'conventional_infantry_platoon';

/**
 * Select the canonical Wave-2 template key for a conventional infantry
 * platoon.
 *
 * Always returns the per-unit block `conventional_infantry_platoon` —
 * the atomic, self-contained record sheet — NOT the multi-slot
 * `conventional_infantry_default` outer sheet. The `data` parameter is
 * accepted for signature parity with the other per-family
 * `selectTemplate` adapters and for forward-compatibility with the
 * deferred composite.
 */
export function selectInfantryTemplate(
  _data: IInfantryRecordSheetData,
): InfantryTemplateKey {
  return 'conventional_infantry_platoon';
}
